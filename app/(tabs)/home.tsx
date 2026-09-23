

import { Alert, BackHandler, StyleSheet, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { FOLDER_SWATCHES } from "@/theme/colors";
import { useTheme } from "@/theme/ThemeContext";
import TopBar, { SettingsButton, TopBarActions, TopBarIconButton } from "@/components/TopBar";
import BottomTabBar, { MainTab } from "@/components/BottomTabBar";
import FoldersList from "@/components/FoldersList";
import GalleryView from "@/components/GalleryView";
import NewFolder from "@/components/NewFolder";
import MoveNotesModal from "@/components/MoveNotesModal";
import AddNote from "@/components/AddNote";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { useFocusEffect } from "expo-router/react-navigation";
import { FolderListItemModel } from "@/models/FolderListItemModel";
import { FolderModel } from "@/models/FolderModel";
import * as Crypto from "expo-crypto";
import { useNavigateOnce } from "@/lib/useNavigateOnce";
import { useEntitlements } from "@/lib/EntitlementsContext";
import { useLibrary } from "@/lib/LibraryContext";
import { useAddNote } from "@/lib/useAddNote";
import { Directory, Paths } from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import { deleteFileIfExists, moveAndGetImageUri, thumbnailFileValidatorAsync } from "@/lib/mediaHelper";
import { NoteModel } from "@/models/NoteModel";

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

    //* read from the shared store rather than re-read from storage whenever
    //* this screen regains focus — see lib/LibraryContext.tsx
    const {
        folders,
        notes,
        tags: storedTags,
        snippets,
        saveFoldersAsync,
        deleteFolderAsync,
        deleteNotesAsync,
        moveNotesToFolderAsync,
        refreshNotesAndTagsAsync,
        reloadAsync,
    } = useLibrary();

    const [activeTab, setActiveTab] = useState<MainTab>("folders");
    const [tabDir, setTabDir] = useState<"forward" | "backward" | null>(null);

    //* the folder the gallery tab is scoped to, set by pressing a folder in the
    //* list. null is the plain gallery: every note, and filters combine with OR
    const [galleryFolderId, setGalleryFolderId] = useState<string | null>(null);
    const galleryFolder = galleryFolderId != null ? folders.find((f) => f.id === galleryFolderId) ?? null : null;
    //* derived rather than cleared in an effect: a folder deleted while its
    //* gallery is open reads as no scope at all, not a nameless empty folder
    const scopeFolderId = galleryFolder != null ? galleryFolder.id : null;
    const galleryNotes = scopeFolderId != null ? notes.filter((note) => note.folderId === scopeFolderId) : notes;

    //* Navigation codes

    const switchTab = (tab: MainTab) => {
        //* checks state directly rather than inside a setActiveTab updater, which
        //* must stay pure. Leaving the gallery unmounts GalleryView, and that
        //* clears its search and compare state on its own
        if (tab === activeTab) return;
        setGalleryFolderId(null); //* a folder scope never outlives the gallery tab
        setTabDir(tab === "gallery" ? "forward" : "backward");
        setActiveTab(tab);
    };

    //* not through navigateOnce: nothing navigates here, and that latch only
    //* resets when the screen regains focus — it would swallow the next real push
    const openFolderInGallery = (folderId: string) => {
        switchTab("gallery");
        setGalleryFolderId(folderId); //* after switchTab, which clears it
    };

    //* Android's back button leaves a scoped gallery for the folder list rather
    //* than leaving the app. Subscribed on focus, not on mount: with the viewer
    //* pushed on top, home stays mounted, and a listener here would beat the
    //* stack's own back handler and switch tabs instead of closing the viewer
    useFocusEffect(
        useCallback(() => {
            if (scopeFolderId == null) return;
            const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
                //* switchTab("folders") spelled out — scoped always means the gallery
                //* tab — so this doesn't re-subscribe every time switchTab is rebuilt
                setGalleryFolderId(null);
                setTabDir("backward");
                setActiveTab("folders");
                return true;
            });
            return () => subscription.remove();
        }, [scopeFolderId]),
    );

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
            await deleteFolderAsync(folderId); //* removes the folder and its notes from memory too
            deleteUnsavedThumbnail(); //* storage only knew about the saved cover
            setEditingFolderId(null);
            setShowNewFolder(false);
        } catch {
            //* the modal stays open so the message is seen.
            setNewFolderError("Couldn't delete that folder. Try again.");
            //* deleting a folder is several writes, so a failure part-way can leave
            //* storage changed while memory isn't — resync from what storage holds
            reloadAsync()
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
            presentationStyle: ImagePicker.UIImagePickerPresentationStyle.FULL_SCREEN,
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

        const existing = folders; //* the store is the latest state; every folder write goes through it
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

        await saveFoldersAsync(updatedExisting); //* writes storage, then updates the store
        //* delete the original thumbnail if it was replaced with a new one, and the folder is being edited
        if (editingFolderId != null && originalFolderThumbnailUri != null && originalFolderThumbnailUri !== newFolderThumbnailUri)
            deleteFileIfExists(originalFolderThumbnailUri);
        setShowNewFolder(false);
    };

    //* AddNote's composition state lives in a hook so it can be presented anywhere without navigating to home.tsx
    const addNote = useAddNote({
        storedTags,
        snippets,
        //* AddNote writes through noteHelper rather than the store, so the store
        //* re-reads the two things a save can change
        onSaved: refreshNotesAndTagsAsync,
    });

    //* the notes waiting for a folder to be picked, with what to run once they
    //* have moved — null when the picker is closed
    const [pendingMove, setPendingMove] = useState<{
        notes: NoteModel[];
        onMoved: () => void;
    } | null>(null);

    const confirmDeleteNotes = (toDelete: NoteModel[]) => {
        if (toDelete.length === 0) return;
        Alert.alert(
            toDelete.length === 1
                ? "Delete this picture-note?"
                : `Delete ${toDelete.length} picture-notes?`,
            toDelete.length === 1
                ? "Its photo or video goes too. This can't be undone."
                : "Their photos and videos go too. This can't be undone.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    //* the store drops them from memory as the write lands; a
                    //* failure part-way leaves the two out of step, so resync
                    onPress: () => {
                        deleteNotesAsync(toDelete).catch(() => reloadAsync().catch(() => {}));
                    },
                },
            ],
        );
    };

    const moveNotesAsync = async (folderId: string | null) => {
        const pending = pendingMove;
        setPendingMove(null); //* the picker's work is done either way
        if (pending == null) return;
        try {
            await moveNotesToFolderAsync(pending.notes, folderId);
            pending.onMoved(); //* only once the move actually landed
        } catch {
            reloadAsync().catch(() => {});
        }
    };

    //* inside a folder's gallery, a new note defaults into that folder
    const openAddNote = () => addNote.open(scopeFolderId);

    const topBarTitle =
        activeTab === "folders" ? "Your folders" : galleryFolder != null ? galleryFolder.name : "Gallery";

    return (
        <View style={[styles.container, { backgroundColor: colors.bg }]}>
            <TopBar
                title={topBarTitle}
                colors={colors}
                right={
                    <TopBarActions>
                        {/* the way to the tab you're not on, pointing the way the
                            pages move: the gallery lies right of the folders */}
                        <TopBarIconButton
                            icon={activeTab === "folders" ? "arrow-right" : "arrow-left"}
                            accessibilityLabel={activeTab === "folders" ? "Gallery" : "Folders"}
                            colors={colors}
                            onPress={() => switchTab(activeTab === "folders" ? "gallery" : "folders")}
                        />
                        <SettingsButton
                            colors={colors}
                            onPress={() => navigateOnce(() => router.push("/(tabs)/settings"))}
                        />
                    </TopBarActions>
                }
            />

            <GestureDetector gesture={tabSwipeGesture}>
                <View style={styles.pager}>
                    {activeTab === "folders" ? (
                        <SlideInPage key="folders" dir={tabDir}>
                            <FoldersList
                                items={groupFoldersWithNotes(folders, notes)}
                                colors={colors}
                                onOpenFolder={openFolderInGallery}
                                onEditFolder={onEditFolder}
                                onNewFolder={openNewFolder}
                                showAdBanner={hasPlus === false}
                            />
                        </SlideInPage>
                    ) : (
                        //* keyed by scope, so changing it remounts the page: search and
                        //* compare picks start clean for each folder instead of carrying
                        //* over, and leaving a folder for the gallery replays the slide
                        <SlideInPage key={`gallery:${scopeFolderId ?? "all"}`} dir={tabDir}>
                            <GalleryView
                                notes={galleryNotes}
                                tags={storedTags}
                                folders={folders}
                                scopeFolderId={scopeFolderId}
                                colors={colors}
                                onOpenNote={(note) =>
                                    navigateOnce(() =>
                                        router.push({
                                            pathname: "/(tabs)/note/[id]",
                                            //* the viewer pages within the folder, matching the grid
                                            params: scopeFolderId != null
                                                ? { id: note.id, folderId: scopeFolderId }
                                                : { id: note.id },
                                        })
                                    )
                                }
                                onCompare={(ids) =>
                                    navigateOnce(() =>
                                        router.push({ pathname: "/(tabs)/compare", params: { ids: ids.join(",") } })
                                    )
                                }
                                onDeleteNotes={confirmDeleteNotes}
                                onMoveNotes={(notes, onMoved) => setPendingMove({ notes, onMoved })}
                                onShowAll={() => {
                                    //* forward, like the pill's arrow: the folder opens out into everything
                                    setTabDir("forward");
                                    setGalleryFolderId(null);
                                }}
                            />
                        </SlideInPage>
                    )}
                </View>
            </GestureDetector>

            <BottomTabBar
                activeTab={activeTab}
                onSelectTab={switchTab}
                //* while scoped, the gallery tab shows the folder; it goes back to
                //* "Gallery" only by returning to the folders, where switchTab clears
                //* the scope — so a folder deleted there can't leave a ghost tab
                galleryFolder={galleryFolder}
                onAdd={openAddNote}
                colors={colors}
            />

            <AddNote
                colors={colors}
                folders={folders}
                {...addNote.props}
            />

            <MoveNotesModal
                visible={pendingMove != null}
                colors={colors}
                folders={folders}
                count={pendingMove?.notes.length ?? 0}
                onCancel={() => setPendingMove(null)}
                onSelectFolder={moveNotesAsync}
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
