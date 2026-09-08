import { Alert, Platform, StyleSheet, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { DARK_THEME, FOLDER_SWATCHES } from "@/theme/colors";
import TopBar, { SettingsButton } from "@/components/TopBar";
import BottomTabBar, { MainTab } from "@/components/BottomTabBar";
import FoldersList from "@/components/FoldersList";
import GalleryGrid from "@/components/GalleryGrid";
import NewFolder from "@/components/NewFolder";
import AddNote from "@/components/AddNote";
import HoldToAddOverlay from "@/components/HoldToAddOverlay";
import { deleteFolderFromStorageAsync, getFoldersFromStorageAsync, getNotesFromStorageAsync, getTagsFromStorageAsync, loadFoldersWithCountsAsync, saveFoldersToStorageAsync } from "@/persistence/FileStorage";
import { useCallback, useEffect, useState } from "react";
import { useFocusEffect } from "expo-router/react-navigation"
import { useRouter } from "expo-router";
import { FolderListItemModel } from "@/models/FolderListItemModel";
import { FolderModel } from "@/models/FolderModel";
import * as Crypto from "expo-crypto";
import { useHoldToAdd } from "@/lib/useHoldToAdd";
import { useNavigateOnce } from "@/lib/useNavigateOnce";
import { useAddNote } from "@/lib/useAddNote";
import { Directory, Paths } from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import { deleteFileIfExists, getThumbnailFileUri, thumbnailFileValidatorAsync } from "@/lib/mediaHelper";
import { NoteModel, TagModel } from "@/models/NoteModel";

const getThumbnailDir = () => new Directory(Paths.document, "folder-thumbnails");

// Slides its content in from the side matching `dir` (or renders in place
// when null, e.g. on first mount). Give it a `key` that changes whenever the
// active tab changes so it remounts and the animation replays each switch —
// same trick as the reference's `key={tab}` + CSS entrance animation.
function SlideInPage({ dir, children }: { dir: "forward" | "backward" | null; children: React.ReactNode }) {
    const translateX = useSharedValue(dir === "forward" ? 70 : dir === "backward" ? -70 : 0);
    const opacity = useSharedValue(dir != null ? 0 : 1);

    useEffect(() => {
        translateX.value = withTiming(0, { duration: 280 });
        opacity.value = withTiming(1, { duration: 280 });
    }, []);

    const style = useAnimatedStyle(() => ({
        transform: [{ translateX: translateX.value }],
        opacity: opacity.value,
    }));

    return <Animated.View style={[styles.page, style]}>{children}</Animated.View>;
}

export default function Home() {
    // TODO (business logic): swap DARK_THEME for real theme-mode state once
    const colors = DARK_THEME;
    const router = useRouter();
    const [showNewFolder, setShowNewFolder] = useState(false);
    const [newFolderName, setNewFolderName] = useState("");
    const [newFolderColor, setNewFolderColor] = useState(FOLDER_SWATCHES[0]);
    const [newFolderError, setNewFolderError] = useState<string | undefined>(undefined);
    const [newFolderThumbnailUri, setNewFolderThumbnailUri] = useState<string | null>(null);
    const [originalFolderThumbnailUri, setOriginalFolderThumbnailUri] = useState<string | null>(null);
    const [cropSourceUri, setCropSourceUri] = useState<string | null>(null);
    const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
    const [folders, setFolders] = useState<FolderListItemModel[]>([]);

    const [storedTags, setStoredTags] = useState<TagModel[]>([]);

    const [notes, setNotes] = useState<NoteModel[]>([]);
    const [activeTab, setActiveTab] = useState<MainTab>("folders");
    // 'forward' (folders -> gallery) slides the incoming screen in from the
    // right; 'backward' (gallery -> folders) from the left — same as an iOS
    // push/pop transition. Switching the tab and starting this animation
    // happen in the same call, so the header changes the instant the swipe
    // (or tab tap) resolves, instead of trying to track a live scroll
    // position — that's what made the previous drag-following pager feel
    // laggy and left the header out of sync.
    const [tabDir, setTabDir] = useState<"forward" | "backward" | null>(null);

    const getFoldersWithCountsAsync = async () => {
        const data = await loadFoldersWithCountsAsync();
        setFolders(data);
    };

    useFocusEffect(
        useCallback(() => {
            getFoldersWithCountsAsync();
            getTagsFromStorageAsync().then(setStoredTags);
            getNotesFromStorageAsync().then(setNotes);
        }, []),
    );

    const switchTab = (tab: MainTab) => {
        setActiveTab((current) => {
            if (tab === current) return current;
            setTabDir(tab === "gallery" ? "forward" : "backward");
            return tab;
        });
    };

    const tabSwipeAxis = useSharedValue<"x" | "y" | null>(null);
    const tabSwipeGesture = Gesture.Pan()
        .onStart(() => {
            tabSwipeAxis.value = null;
        })
        .onUpdate((e) => {
            if (tabSwipeAxis.value === null) {
                if (Math.abs(e.translationX) > 10 || Math.abs(e.translationY) > 10) {
                    tabSwipeAxis.value = Math.abs(e.translationX) > Math.abs(e.translationY) ? "x" : "y";
                }
            }
        })
        .onEnd((e) => {
            if (tabSwipeAxis.value === "x" && Math.abs(e.translationX) > 70) {
                scheduleOnRN(switchTab, e.translationX < 0 ? "gallery" : "folders");
            }
            tabSwipeAxis.value = null;
        });

    //* a push leaves this screen mounted underneath, so without this a
    //* double-tap opens the same folder (or note) twice
    const navigateOnce = useNavigateOnce();

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

    //* AddNote's composition state lives in a hook so the folder screen can
    //* present the same modal over its own grid, rather than navigating here
    //* to reach it. onSaved reloads what this screen shows.
    const addNote = useAddNote({
        storedTags,
        onSaved: async () => {
            await getFoldersWithCountsAsync();
            setStoredTags(await getTagsFromStorageAsync());
            setNotes(await getNotesFromStorageAsync());
        },
    });

    const openAddNote = () => addNote.open();

    //* hold anywhere on either tab, then swipe up, to start a picture-note
    const holdToAdd = useHoldToAdd(openAddNote);

    //* Race, not nesting: the tab swipe and the hold-swipe are both Pans, so
    //* only one can own the finger. Whichever activates first wins — a
    //* sideways drag activates the tab swipe straight away, while holding
    //* still for HOLD_MS arms this one instead
    const pagerGesture = Gesture.Race(tabSwipeGesture, holdToAdd.gesture);

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
        if (newFolderThumbnailUri !== originalFolderThumbnailUri) 
        {
            if(newFolderThumbnailUri != null) 
            {
                deleteFileIfExists(newFolderThumbnailUri);
            }
            else
            {
                setNewFolderThumbnailUri(originalFolderThumbnailUri);
            }
        }
        setEditingFolderId(null);
        setShowNewFolder(false);
    };

    const confirmDeleteFolder = () => {
        if (editingFolderId == null) return;
        const folderId = editingFolderId;

        const entry = folders.find((f) => f.folder.id === folderId);
        const count = entry?.count ?? 0;

        //* states what actually happens. This used to promise the notes would
        //* be "moved out of the folder" — what the abandoned reassign approach
        //* would have done — so anyone consenting to it lost every photo in
        //* the folder instead. The count is here because "4 picture-notes" is
        //* a decision you can make and "its notes" isn't.
        Alert.alert(
            `Delete "${entry?.folder.name ?? "this folder"}"?`,
            count === 0
                ? "This can't be undone."
                : `Its ${count} picture-notes${count === 1 ? "" : "s"} will be deleted too, along with their photos and videos. This can't be undone.`,
            [
                { text: "Cancel", style: "cancel" },
                { text: "Delete", style: "destructive", onPress: () => performDeleteFolderAsync(folderId) },
            ],
        );
    };

    const performDeleteFolderAsync = async (folderId: string) => {
        //* cascades: the folder, its notes, and every media and thumbnail file
        //* those notes own
        await deleteFolderFromStorageAsync(folderId);

        setEditingFolderId(null);
        setShowNewFolder(false);
        //* notes as well as folders — the gallery tab is currently rendering
        //* the ones that were just deleted, so refreshing only the folder list
        //* leaves them on screen pointing at files that no longer exist
        await getFoldersWithCountsAsync();
        setNotes(await getNotesFromStorageAsync());
    };

    const pickThumbnailAsync = async () => {
        const validationError = await thumbnailFileValidatorAsync();
        if (validationError != null) {
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
        //*delete any orphaned thumbail from previous(failed to save) crop session
        if (newFolderThumbnailUri != null && newFolderThumbnailUri !== originalFolderThumbnailUri) {
            deleteFileIfExists(newFolderThumbnailUri);
        }

        const destUri = await getThumbnailFileUri(getThumbnailDir(), croppedUri);
        setNewFolderThumbnailUri(destUri); // ...the reference is kept
        setCropSourceUri(null); // back to the form, still the same modal
    };
    
    const removeNewFolderThumbnail = () => {
        if (newFolderThumbnailUri != null && editingFolderId == null) {
            deleteFileIfExists(newFolderThumbnailUri);
        }
        setNewFolderThumbnailUri(null);
    };

    const saveNewFolderAsync = async () => {
        const trimmed = newFolderName.trim();
        if (trimmed.length === 0) {
            setNewFolderError("Give the folder a name.");
            return;
        }

        const existing = await getFoldersFromStorageAsync();
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
        if (editingFolderId != null) 
        {
            updatedExisting = existing.map((folder) =>
                folder.id === editingFolderId
                    ? { ...folder, name: trimmed, accent: newFolderColor, coverUri: newFolderThumbnailUri }
                    : folder
            );
        }
        else
        {
            const newFolder:FolderModel = {
                id: Crypto.randomUUID(),
                name: trimmed,
                accent: newFolderColor,
                Visible: true,
                coverUri: newFolderThumbnailUri,
            };
            updatedExisting = [...existing, newFolder];
        }
        
        await saveFoldersToStorageAsync(updatedExisting);
        if (editingFolderId != null && originalFolderThumbnailUri != null && originalFolderThumbnailUri !== newFolderThumbnailUri) {
            deleteFileIfExists(originalFolderThumbnailUri);
        }
        await getFoldersWithCountsAsync();
        setShowNewFolder(false);
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.bg }]}>
            <TopBar
                title={activeTab === "folders" ? "Your folders" : "Gallery"}
                colors={colors}
                right={
                    <SettingsButton
                        colors={colors}
                        onPress={() => router.push("/(tabs)/settings")}
                    />
                }
            />

            <GestureDetector gesture={pagerGesture}>
                <View style={styles.pager}>
                    {activeTab === "folders" ? (
                        <SlideInPage key="folders" dir={tabDir}>
                            <FoldersList
                                items={folders}
                                colors={colors}
                                onOpenFolder={(id) =>
                                    navigateOnce(() =>
                                        router.push({ pathname: "/(tabs)/folder/[id]", params: { id } })
                                    )
                                }
                                onEditFolder={onEditFolder}
                                onNewFolder={openNewFolder}
                            />
                        </SlideInPage>
                    ) : (
                        <SlideInPage key="gallery" dir={tabDir}>
                            <GalleryGrid
                                notes={notes}
                                colors={colors}
                                onOpenNote={(note) =>
                                    navigateOnce(() =>
                                        router.push({ pathname: "/(tabs)/note/[id]", params: { id: note.id } })
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

            {/* after the tab bar so it dims that too — the hold covers the
                whole screen, so leaving one strip lit would look like a gap */}
            <HoldToAddOverlay
                visible={holdToAdd.holding}
                progress={holdToAdd.progress}
                readyToRelease={holdToAdd.readyToRelease}
                colors={colors}
            />

            {/* TODO (business logic): pass a real `snippets` list once
                getSnippetsFromStorage exists (see settings.tsx's TODO). The
                row stays hidden while it's absent. */}
            <AddNote
                colors={colors}
                folders={folders.map((f) => f.folder)}
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
