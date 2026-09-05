import { Alert, Platform, StyleSheet, View } from "react-native";
import { DateTimePickerAndroid, DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { DARK_THEME, FOLDER_SWATCHES } from "@/theme/colors";
import TopBar, { SettingsButton } from "../components/TopBar";
import BottomTabBar from "../components/BottomTabBar";
import FoldersList from "../components/FoldersList";
import NewFolder from "../components/NewFolder";
import AddNote, { NoteMediaType } from "../components/AddNote";
import { getFoldersFromStorageAsync, getTagsFromStorageAsync, loadFoldersWithCountsAsync, saveFoldersToStorageAsync, saveNoteToStorageAsync, saveTagsToStorageAsync } from "../persistence/FileStorage";
import { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native"
import { useRouter } from "expo-router";
import { FolderListItemModel } from "../models/FolderListItemModel";
import { FolderModel } from "../models/FolderModel";
import * as Crypto from "expo-crypto";
import { Directory, Paths } from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import { deleteThumbnailFile, getNoteMediaFileUri, getThumbnailFileUri, thumbnailFileValidatorAsync } from "@/lib/mediaHelper";
import { todayISO } from "@/lib/date";
import { NoteModel, TagModel } from "../models/NoteModel";

const getThumbnailDir = () => new Directory(Paths.document, "folder-thumbnails");
const getNoteMediaDir = () => new Directory(Paths.document, "note-media");

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

    const [showAddNote, setShowAddNote] = useState(false);
    const [noteText, setNoteText] = useState("");
    const [noteMediaUri, setNoteMediaUri] = useState<string | null>(null);
    const [noteMediaType, setNoteMediaType] = useState<NoteMediaType | null>(null);
    const [noteDate, setNoteDate] = useState(todayISO());
    const [noteTags, setNoteTags] = useState<string[]>([]);
    const [noteTagInput, setNoteTagInput] = useState("");
    const [noteTagIds, setNoteTagIds] = useState<string[]>([]);
    const [noteFolderId, setNoteFolderId] = useState<string | null>(null);
    const [noteError, setNoteError] = useState<string | undefined>(undefined);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [storedTags, setStoredTags] = useState<TagModel[]>([]);

    const getFoldersWithCountsAsync = async () => {
        const data = await loadFoldersWithCountsAsync();
        setFolders(data);
    };

    useFocusEffect(
        useCallback(() => {
            getFoldersWithCountsAsync();
            getTagsFromStorageAsync().then(setStoredTags);
        }, []),
    );

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

    const openAddNote = () => {
        setNoteText("");
        setNoteMediaUri(null);
        setNoteMediaType(null);
        setNoteDate(todayISO());
        setNoteTags([]);
        setNoteTagInput("");
        setNoteFolderId(null);
        setNoteError(undefined);
        setShowAddNote(true);
    };

    const cancelAddNote = () => {
        setShowAddNote(false);
    };

    const commitNoteTag = () => {
        const clean = noteTagInput.trim().replace(/^#/, "").toLowerCase();
        if (clean.length > 0 && !noteTags.includes(clean)) {
            setNoteTags((tags) => [...tags, clean]);
        }
        setNoteTagInput("");
    };

    const removeNoteTag = (tag: string) => {
        setNoteTags((tags) => tags.filter((t) => t !== tag));
    };

    const toggleStoredTag = (tag: TagModel) => {
        setNoteTags((tags) =>
            tags.includes(tag.title) ? tags.filter((t) => t !== tag.title) : [...tags, tag.title]
        );
    };

    const insertNoteSnippet = (text: string) => {
        setNoteText((current) => (current.trim().length > 0 ? `${current.trim()} ${text}` : text));
    };

    const pickNoteMediaAsync = async () => {
        if (Platform.OS === "web") {
            setNoteError("Photo/video preview isn't supported in the web preview — test this on a device or simulator.");
            return;
        }

        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
            setNoteError("Allow photo library access to add a photo or video.");
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ["images", "videos"],
        });
        if (result.canceled) return;

        const asset = result.assets[0];
        setNoteMediaUri(asset.uri);
        setNoteMediaType(asset.type === "video" ? "video" : "image");
        setNoteError(undefined);
    };

    const removeNoteMedia = () => {
        // Just the raw picker URI at this point, not a copy in app storage —
        // that only happens once saveNoteAsync actually persists the note — so
        // there's no file to delete here, unlike folder thumbnails.
        //TODO business logic
        setNoteMediaUri(null);
        setNoteMediaType(null);
    };

    const onChangeNoteDate = (event: DateTimePickerEvent, selectedDate?: Date) => {
        if (event.type === "set" && selectedDate != null) {
            setNoteDate(selectedDate.toISOString().slice(0, 10));
        }
    };

    const pressNoteDate = () => {
        if (Platform.OS === "web") {
            setNoteError("Date picker isn't supported in the web preview — test this on a device or simulator.");
            return;
        }

        const currentDate = new Date(`${noteDate}T00:00:00`);

        //*android has a native dialog, so we open it imperatively and don't render the component at all
        if (Platform.OS === "android") {
            DateTimePickerAndroid.open({
                value: currentDate,
                mode: "date",
                onChange: onChangeNoteDate,
            });
            return;
        }

        setShowDatePicker((current) => !current);
    };

    const saveTagsAsync = async (): Promise<string[]> => {
        //* check for new tags that don't exist in storage yet
        const newTagNames = noteTags.filter(
            (name) => !storedTags.some((tag) => tag.title.toLowerCase() === name.toLowerCase())
        );
        const newTags: TagModel[] = newTagNames.map((title) => ({ id: Crypto.randomUUID(), title }));
        const allTags = [...storedTags, ...newTags];
        if (newTags.length > 0) {
            await saveTagsToStorageAsync(allTags);
        }
        //* return tagIds for the note, matching the order of noteTags (which is what the user sees)
        const tagIds = noteTags.map(
            (name) => allTags.find((tag) => tag.title.toLowerCase() === name.toLowerCase())!.id
        );
        return tagIds;
    }

    const saveNoteAsync = async () => {
        if (noteMediaUri == null) {
            setNoteError("Add a photo or video first.");
            return;
        }
        //* Save media to app storage
        const destUri = getNoteMediaFileUri(getNoteMediaDir(), noteMediaUri, "jpg");
        setNoteMediaUri(destUri); 
        //* Save tags to storage 
        const noteTagIds = await saveTagsAsync();
        //* Connect note to folder if one is selected, else null (gallery)
        const newNote: NoteModel = {
            id: Crypto.randomUUID(),
            mediaUri: destUri,
            note: noteText,
            date: noteDate,
            tagIds: noteTagIds,
            folderId: noteFolderId,
            createdAt: new Date().toISOString(),
        };
        //* Save picture-note to storage
        await saveNoteToStorageAsync(newNote);
        console.log("Saved note:", newNote);
        setShowAddNote(false);
        await getFoldersWithCountsAsync();
        await getTagsFromStorageAsync().then(setStoredTags); //* reload folders and tags to reflect changes
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
        if (newFolderThumbnailUri !== originalFolderThumbnailUri) 
        {
            if(newFolderThumbnailUri != null) 
            {
                deleteThumbnailFile(newFolderThumbnailUri);
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

        Alert.alert(
            "Delete folder?",
            "Its notes will be moved out of the folder. This can't be undone.",
            [
                { text: "Cancel", style: "cancel" },
                { text: "Delete", style: "destructive", onPress: () => performDeleteFolderAsync(folderId) },
            ],
        );
    };

    const performDeleteFolderAsync = async (folderId: string) => {
        // TODO (business logic): remove this folder from storage and reassign
        // its notes so they aren't orphaned — see groupNotesByFolder's
        // `note.folderId ?? "gallery"` fallback in FileStorage.ts, which already
        // expects notes with no folder. Roughly:
        //   1. getFoldersFromStorageAsync() + getNotesFromStorageAsync()
        //   2. delete the folder's thumbnail file if coverUri != null (deleteThumbnailFile)
        //   3. for any note whose folderId matches this folder, set folderId: null
        //      and persist it with saveNoteToStorageAsync (one call per affected
        //      note — each note is its own storage entry now, no bulk overwrite)
        //   4. saveFoldersToStorageAsync with this folder removed
        // Finish with the same close-and-refresh calls as saveNewFolderAsync below:
        //   setEditingFolderId(null); setShowNewFolder(false); await getFoldersWithCountsAsync();
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

    const confirmCroppedThumbnail = (croppedUri: string) => {
        //*delete any orphaned thumbail from previous(failed to save) crop session
        if (newFolderThumbnailUri != null && newFolderThumbnailUri !== originalFolderThumbnailUri) {
            deleteThumbnailFile(newFolderThumbnailUri);
        }

        const destUri = getThumbnailFileUri(getThumbnailDir(), croppedUri);
        setNewFolderThumbnailUri(destUri); // ...the reference is kept
        setCropSourceUri(null); // back to the form, still the same modal
    };
    
    const removeNewFolderThumbnail = () => {
        if (newFolderThumbnailUri != null && editingFolderId == null) {
            deleteThumbnailFile(newFolderThumbnailUri);
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
            deleteThumbnailFile(originalFolderThumbnailUri);
        }
        await getFoldersWithCountsAsync();
        setShowNewFolder(false);
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.bg }]}>
            <TopBar
                title="Your folders"
                colors={colors}
                right={
                    <SettingsButton
                        colors={colors}
                        onPress={() => router.push("/(tabs)/settings")}
                    />
                }
            />

            <FoldersList
                items={folders}
                colors={colors}
                onOpenFolder={() => {}}
                onEditFolder={onEditFolder}
                onNewFolder={openNewFolder}
            />

            <BottomTabBar
                activeTab="folders"
                onSelectTab={() => {
                    // TODO (business logic): navigate to the Gallery screen
                    // once it exists.
                }}
                onAdd={openAddNote}
                colors={colors}
            />

            <AddNote
                visible={showAddNote}
                colors={colors}
                mediaUri={noteMediaUri}
                mediaType={noteMediaType}
                onPickMedia={pickNoteMediaAsync}
                onRemoveMedia={removeNoteMedia}
                note={noteText}
                onNoteChange={setNoteText}
                // TODO (business logic): pass the real snippets list once
                // getSnippetsFromStorage exists (see settings.tsx's TODO) —
                // e.g. load it in openAddNote the same way getFoldersWithCountsAsync
                // refreshes folders. Omitted for now, so the row stays hidden.
                onInsertSnippet={insertNoteSnippet}
                date={noteDate}
                onPressDate={pressNoteDate}
                showDatePicker={showDatePicker}
                onDateChange={setNoteDate}
                tags={noteTags}
                tagInput={noteTagInput}
                onTagInputChange={setNoteTagInput}
                onCommitTag={commitNoteTag}
                onRemoveTag={removeNoteTag}
                storedTags={storedTags}
                onToggleStoredTag={toggleStoredTag}
                folders={folders.map((f) => f.folder)}
                folderId={noteFolderId}
                onFolderChange={setNoteFolderId}
                error={noteError}
                onCancel={cancelAddNote}
                onSave={saveNoteAsync}
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
});
