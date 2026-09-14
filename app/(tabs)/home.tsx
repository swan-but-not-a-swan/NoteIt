//! Manually reviewed since 14/09/2026

import { Alert, StyleSheet, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { FOLDER_SWATCHES } from "@/theme/colors";
import { useTheme } from "@/theme/ThemeContext";
import TopBar, { SettingsButton } from "@/components/TopBar";
import BottomTabBar, { MainTab } from "@/components/BottomTabBar";
import FoldersList from "@/components/FoldersList";
import GalleryView from "@/components/GalleryView";
import NewFolder from "@/components/NewFolder";
import AddNote from "@/components/AddNote";
import { deleteFolderFromStorageAsync, getFoldersFromStorageAsync, getNotesFromStorageAsync, getSnippetsFromStorageAsync, getTagsFromStorageAsync, saveFoldersToStorageAsync } from "@/persistence/FileStorage";
import { useCallback, useEffect, useState } from "react";
import { useFocusEffect } from "expo-router/react-navigation"
import { useRouter } from "expo-router";
import { FolderListItemModel } from "@/models/FolderListItemModel";
import { FolderModel } from "@/models/FolderModel";
import * as Crypto from "expo-crypto";
import { useNavigateOnce } from "@/lib/useNavigateOnce";
import { useEntitlements } from "@/lib/EntitlementsContext";
import { useAddNote } from "@/lib/useAddNote";
import { Directory, Paths } from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import { deleteFileIfExists, moveAndGetImageUri, thumbnailFileValidatorAsync } from "@/lib/mediaHelper";
import { NoteModel, TagModel } from "@/models/NoteModel";
import { SnippetModel } from "@/models/SnippetModel";

const getThumbnailDir = () => new Directory(Paths.document, "folder-thumbnails");

//* dir: 'forward' (folders -> gallery), 'backward' (gallery -> folders), null (first render, no animation)
//* Give it a `key` that changes whenever the active tab changes so the animation replays on each switch.

function SlideInPage({ dir, children }: { dir: "forward" | "backward" | null; children: React.ReactNode }) {
    const translateX = useSharedValue(dir === "forward" ? 70 : dir === "backward" ? -70 : 0);
    const opacity = useSharedValue(dir != null ? 0 : 1);


    useEffect(() => {
        translateX.set(withTiming(0, { duration: 200 })); //* shared values are stable objects, so listing them never re-runs this —
        opacity.set(withTiming(1, { duration: 200 })); //* it still fires once, on mount, which is what replays the slide
    }, [translateX, opacity]);

    const style = useAnimatedStyle(() => ({
        transform: [{ translateX: translateX.get() }],
        opacity: opacity.get(),
    }));

    return <Animated.View style={[styles.page, style]}>{children}</Animated.View>;
}

//* pairs each folder with its note count.
function groupFoldersWithNotes(folders: FolderModel[], notes: NoteModel[]): FolderListItemModel[] {
    const notesByFolder: Record<string, NoteModel[]> = {};
    for (const note of notes) {
        const key = note.folderId ?? "gallery";
        (notesByFolder[key] ??= []).push(note);
    }

    const data = folders.map((folder) => {
        const folderNotes = notesByFolder[folder.id] ?? [];
        return { folder, count: folderNotes.length };
    });

    return data;
}

export default function Home() {
    const { colors } = useTheme();
    const router = useRouter();

    //* hasPlus: null while the first entitlement read is in flight, true if the user has Plus, false if they don't. 
    //* Plus is on during the free trial as well as once paid: the store treats the trial as a subscription period like any other.
    const { hasPlus } = useEntitlements();

    const [showNewFolder, setShowNewFolder] = useState(false);
    const [newFolderName, setNewFolderName] = useState("");
    const [newFolderColor, setNewFolderColor] = useState(FOLDER_SWATCHES[0]);
    const [newFolderError, setNewFolderError] = useState<string | undefined>(undefined);
    const [newFolderThumbnailUri, setNewFolderThumbnailUri] = useState<string | null>(null);
    const [originalFolderThumbnailUri, setOriginalFolderThumbnailUri] = useState<string | null>(null);
    const [cropSourceUri, setCropSourceUri] = useState<string | null>(null);
    const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
    const [folders, setFolders] = useState<FolderModel[]>([]);

    const [notes, setNotes] = useState<NoteModel[]>([]);
    const [storedTags, setStoredTags] = useState<TagModel[]>([]);
    const [snippets, setSnippets] = useState<SnippetModel[]>([]);

    const [activeTab, setActiveTab] = useState<MainTab>("folders");
    const [tabDir, setTabDir] = useState<"forward" | "backward" | null>(null);

    useFocusEffect(
        useCallback(() => {
            //Claude to review this code
            Promise.all([
                getFoldersFromStorageAsync(),
                getNotesFromStorageAsync(),
                getTagsFromStorageAsync(),
                getSnippetsFromStorageAsync(),
            ]).then(([loadedFolders, loadedNotes, loadedTags, loadedSnippets]) => {
                setFolders(loadedFolders);
                setNotes(loadedNotes);
                setStoredTags(loadedTags);
                setSnippets(loadedSnippets);
            });

        }, []), //! Might have to remove snippets to improve performance
    );

    //* Navigation codes

    const switchTab = (tab: MainTab) => {
        //* checks state directly rather than inside a setActiveTab updater, which
        //* must stay pure. Leaving the gallery unmounts GalleryView, and that
        //* clears its search and compare state on its own
        if (tab === activeTab) return;
        setTabDir(tab === "gallery" ? "forward" : "backward");
        setActiveTab(tab);
    };

    const tabSwipeAxis = useSharedValue<"x" | "y" | null>(null);
    const tabSwipeGesture = Gesture.Pan()
        .onStart(() => {
            tabSwipeAxis.set(null);
        })
        .onUpdate((e) => {
            if (tabSwipeAxis.get() === null) {
                if (Math.abs(e.translationX) > 10 || Math.abs(e.translationY) > 10) {
                    tabSwipeAxis.set(Math.abs(e.translationX) > Math.abs(e.translationY) ? "x" : "y");
                }
            }
        })
        .onEnd((e) => {
            if (tabSwipeAxis.get() === "x" && Math.abs(e.translationX) > 70) {
                scheduleOnRN(switchTab, e.translationX < 0 ? "gallery" : "folders");
            }
            tabSwipeAxis.set(null);
        });

    const navigateOnce = useNavigateOnce(); //* protects against double taps on folders or notes

    const openNewFolder = () => {
        setEditingFolderId(null);
        setNewFolderName("");
        setNewFolderColor(FOLDER_SWATCHES[0]);
        setNewFolderError(undefined);
        setNewFolderThumbnailUri(null);
        setOriginalFolderThumbnailUri(null);
        setCropSourceUri(null);
        setShowNewFolder(true);
    };

    const onEditFolder = (folder: FolderModel) => {
        setEditingFolderId(folder.id);
        setNewFolderName(folder.name);
        setNewFolderColor(folder.accent);
        setNewFolderError(undefined);
        setNewFolderThumbnailUri(folder.coverUri ?? null);
        setOriginalFolderThumbnailUri(folder.coverUri ?? null);
        setCropSourceUri(null);
        setShowNewFolder(true);
    };

    const cancelNewFolder = () => {
        // *The folder was never saved, so orphaned files are deleted when the operation is canceled.
        if (newFolderThumbnailUri !== originalFolderThumbnailUri) {
            if (newFolderThumbnailUri != null)
                deleteFileIfExists(newFolderThumbnailUri);
            else
                setNewFolderThumbnailUri(originalFolderThumbnailUri);
        }
        setEditingFolderId(null);
        setShowNewFolder(false);
    };

    //* a crop made in this session is a file nothing else owns yet. The saved
    //* cover (originalFolderThumbnailUri) is left alone until Save replaces it
    const deleteUnsavedThumbnail = () => {
        if (newFolderThumbnailUri != null && newFolderThumbnailUri !== originalFolderThumbnailUri)
            deleteFileIfExists(newFolderThumbnailUri);
    };

    const confirmDeleteFolder = () => {
        if (editingFolderId == null) return;
        const entry = folders.find((f) => f.id === editingFolderId);
        if (entry == null) return;
        const count = notes.filter((note) => note.folderId === entry.id).length;

        Alert.alert(
            `Delete "${entry.name}"?`,
            count === 0
                ? "This can't be undone."
                : `Its ${count} picture-note${count === 1 ? "" : "s"} will be deleted too, along with their photos and videos. This can't be undone.`,
            [
                { text: "Cancel", style: "cancel" },
                { text: "Delete", style: "destructive", onPress: () => performDeleteFolderAsync(editingFolderId) },
            ],
        );
    };

    const performDeleteFolderAsync = async (folderId: string) => {
        try {
            await deleteFolderFromStorageAsync(folderId);
            deleteUnsavedThumbnail(); //* storage only knew about the saved cover
            setFolders((current) => current.filter((f) => f.id !== folderId)); //* mirrors what was deleted
            setNotes((current) => current.filter((note) => note.folderId !== folderId));
            setEditingFolderId(null);
            setShowNewFolder(false);
        } catch {
            //* the modal stays open so the message is seen.
            setNewFolderError("Couldn't delete that folder. Try again.");
            Promise.all([getFoldersFromStorageAsync(), getNotesFromStorageAsync()])
                .then(([loadedFolders, loadedNotes]) => {
                    setFolders(loadedFolders);
                    setNotes(loadedNotes);
                })
                .catch(() => {
                    //* storage is failing outright; the message above is already showing
                });
        }
    };

    const pickThumbnailAsync = async () => {
        const validationError = await thumbnailFileValidatorAsync();
        if (validationError !== undefined) {
            setNewFolderError(validationError);
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ["images"],
        });
        if (result.canceled) return;

        // *NewFolder's own modal stays open throughout — setting this just
        // *switches what it renders inside that same modal, to the cropper.
        setCropSourceUri(result.assets[0].uri);
    }

    const confirmCroppedThumbnail = async (croppedUri: string) => {
        const destUri = await moveAndGetImageUri(getThumbnailDir(), croppedUri);
        //* the previous crop is only deleted once the new copy exists, so a failed
        //* copy can't leave the preview pointing at a file that's gone
        deleteUnsavedThumbnail();
        setNewFolderThumbnailUri(destUri);
        setCropSourceUri(null);
    };

    const removeNewFolderThumbnail = () => {
        deleteUnsavedThumbnail();
        setNewFolderThumbnailUri(null);
    };

    const saveNewFolderAsync = async () => {
        const trimmed = newFolderName.trim();
        if (trimmed.length === 0) {
            setNewFolderError("Give the folder a name.");
            return;
        }

        const existing = await getFoldersFromStorageAsync(); //* reloads to ensure the latest state
        //*checks duplicate, rejects if the name is same as any other folder except the one being edited
        const isDuplicate = existing.some(
            (folder) => folder.id !== editingFolderId &&
                folder.name.trim().toLowerCase() === trimmed.toLowerCase()
        );

        if (isDuplicate) {
            setNewFolderError("A folder with that name already exists.");
            return;
        }

        let updatedExisting: FolderModel[];

        //* if editing, update the existing folder; else creating, add a new folder to the list
        if (editingFolderId != null) {
            updatedExisting = existing.map((folder) =>
                folder.id === editingFolderId
                    ? { ...folder, name: trimmed, accent: newFolderColor, coverUri: newFolderThumbnailUri }
                    : folder
            );
        }
        else {
            const newFolder: FolderModel = {
                id: Crypto.randomUUID(),
                name: trimmed,
                accent: newFolderColor,
                Visible: true,
                coverUri: newFolderThumbnailUri,
            };
            updatedExisting = [...existing, newFolder];
        }

        await saveFoldersToStorageAsync(updatedExisting);
        //* delete the original thumbnail if it was replaced with a new one, and the folder is being edited
        if (editingFolderId != null && originalFolderThumbnailUri != null && originalFolderThumbnailUri !== newFolderThumbnailUri)
            deleteFileIfExists(originalFolderThumbnailUri);
        setFolders(updatedExisting); //* the exact array just saved, so there's nothing to read back
        setShowNewFolder(false);
    };

    //* AddNote's composition state lives in a hook so it can be presented anywhere without navigating to home.tsx
    const addNote = useAddNote({
        storedTags,
        snippets,
        onSaved: async () => {
            const [loadedTags, loadedNotes] = await Promise.all([
                getTagsFromStorageAsync(),
                getNotesFromStorageAsync(),
            ]);
            setStoredTags(loadedTags);
            setNotes(loadedNotes);
        },
    });

    const openAddNote = () => addNote.open();

    return (
        <View style={[styles.container, { backgroundColor: colors.bg }]}>
            <TopBar
                title={activeTab === "folders" ? "Your folders" : "Gallery"}
                colors={colors}
                right={
                    <SettingsButton
                        colors={colors}
                        onPress={() => navigateOnce(() => router.push("/(tabs)/settings"))}
                    />
                }
            />

            <GestureDetector gesture={tabSwipeGesture}>
                <View style={styles.pager}>
                    {activeTab === "folders" ? (
                        <SlideInPage key="folders" dir={tabDir}>
                            <FoldersList
                                items={groupFoldersWithNotes(folders, notes)}
                                colors={colors}
                                onOpenFolder={(id) =>
                                    navigateOnce(() =>
                                        router.push({ pathname: "/(tabs)/folder/[id]", params: { id } })
                                    )
                                }
                                onEditFolder={onEditFolder}
                                onNewFolder={openNewFolder}
                                showAdBanner={hasPlus === false}
                            />
                        </SlideInPage>
                    ) : (
                        <SlideInPage key="gallery" dir={tabDir}>
                            <GalleryView
                                notes={notes}
                                tags={storedTags}
                                colors={colors}
                                onOpenNote={(note) =>
                                    navigateOnce(() =>
                                        router.push({ pathname: "/(tabs)/note/[id]", params: { id: note.id } })
                                    )
                                }
                                onCompare={(ids) =>
                                    navigateOnce(() =>
                                        router.push({ pathname: "/(tabs)/compare", params: { ids: ids.join(",") } })
                                    )
                                }
                            />
                        </SlideInPage>
                    )}
                </View>
            </GestureDetector>

            <BottomTabBar
                activeTab={activeTab}
                onSelectTab={switchTab}
                onAdd={openAddNote}
                colors={colors}
            />

            <AddNote
                colors={colors}
                folders={folders}
                {...addNote.props}
            />

            <NewFolder
                visible={showNewFolder}
                mode={editingFolderId != null ? "edit" : "create"}
                name={newFolderName}
                onNameChange={setNewFolderName}
                color={newFolderColor}
                onColorChange={setNewFolderColor}
                swatches={FOLDER_SWATCHES}
                thumbnailUri={newFolderThumbnailUri}
                onPickThumbnail={pickThumbnailAsync}
                onRemoveThumbnail={removeNewFolderThumbnail}
                cropSourceUri={cropSourceUri}
                onCropCancel={() => setCropSourceUri(null)}
                onCropConfirm={confirmCroppedThumbnail}
                onDelete={editingFolderId != null ? confirmDeleteFolder : undefined}
                error={newFolderError}
                colors={colors}
                onCancel={cancelNewFolder}
                onSave={saveNewFolderAsync}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    pager: {
        flex: 1,
    },
    page: {
        flex: 1,
    },
});
