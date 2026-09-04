import { Alert, StyleSheet, View } from "react-native";
import { DARK_THEME, FOLDER_SWATCHES } from "@/theme/colors";
import TopBar, { SettingsButton } from "../components/TopBar";
import PoweredByFooter from "../components/PoweredByFooter";
import FoldersList from "../components/FoldersList";
import NewFolder from "../components/NewFolder";
import { getFoldersFromStorage, loadFoldersWithCounts, saveFoldersToStorage } from "../persistence/FileStorage";
import { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native"
import { FolderListItemModel } from "../models/FolderListItemModel";
import { FolderModel } from "../models/FolderModel";
import * as Crypto from "expo-crypto";
import { Directory, Paths } from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import { deleteThumbnailFile, getThumbnailFileUri, thumbnailFileValidator } from "@/lib/ThumbnailHelper";

const getThumbnailDir = () => new Directory(Paths.document, "folder-thumbnails");

export default function Home() {
    // TODO (business logic): swap DARK_THEME for real theme-mode state once
    // that exists, and replace the FoldersList placeholder props below with
    // real folders/notes state + handlers.
    const colors = DARK_THEME;
    const [showNewFolder, setShowNewFolder] = useState(false);
    const [newFolderName, setNewFolderName] = useState("");
    const [newFolderColor, setNewFolderColor] = useState(FOLDER_SWATCHES[0]);
    const [newFolderError, setNewFolderError] = useState<string | undefined>(undefined);
    const [newFolderThumbnailUri, setNewFolderThumbnailUri] = useState<string | null>(null);
    const [originalFolderThumbnailUri, setOriginalFolderThumbnailUri] = useState<string | null>(null);
    const [cropSourceUri, setCropSourceUri] = useState<string | null>(null);
    const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
    const [folders, setFolders] = useState<FolderListItemModel[]>([]);

    const getFoldersWithCounts = async () => {
        const data = await loadFoldersWithCounts();
        setFolders(data);
    };

    useFocusEffect(
        useCallback(() => {
            getFoldersWithCounts();
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
                { text: "Delete", style: "destructive", onPress: () => performDeleteFolder(folderId) },
            ],
        );
    };

    const performDeleteFolder = async (folderId: string) => {
        // TODO (business logic): remove this folder from storage and reassign
        // its notes so they aren't orphaned — see groupNotesByFolder's
        // `note.folderId ?? "gallery"` fallback in FileStorage.ts, which already
        // expects notes with no folder. Roughly:
        //   1. getFoldersFromStorage() + getNotesFromStorage()
        //   2. delete the folder's thumbnail file if coverUri != null (deleteThumbnailFile)
        //   3. set folderId: null on any note whose folderId matches this folder,
        //      persist via a new saveNotesToStorage (FileStorage.ts has no such
        //      helper yet — saveFoldersToStorage is the pattern to mirror)
        //   4. saveFoldersToStorage with this folder removed
        // Finish with the same close-and-refresh calls as saveNewFolder below:
        //   setEditingFolderId(null); setShowNewFolder(false); await getFoldersWithCounts();
    };

    const pickThumbnail = async () => {
        const validationError = await thumbnailFileValidator();
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

    const saveNewFolder = async () => {
        const trimmed = newFolderName.trim();
        if (trimmed.length === 0) {
            setNewFolderError("Give the folder a name.");
            return;
        }

        const existing = await getFoldersFromStorage();
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
            const newFolder = {
                id: Crypto.randomUUID(),
                name: trimmed,
                accent: newFolderColor,
                Visible: true,
                coverUri: newFolderThumbnailUri,
            };
            updatedExisting = [...existing, newFolder];
        }
        
        await saveFoldersToStorage(updatedExisting);
        if (editingFolderId != null && originalFolderThumbnailUri != null && originalFolderThumbnailUri !== newFolderThumbnailUri) {
            deleteThumbnailFile(originalFolderThumbnailUri);
        }
        await getFoldersWithCounts();
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
                        onPress={() => {
                            // TODO (business logic): navigate to the Settings screen
                            // once it exists.
                        }}
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

            <PoweredByFooter colors={colors} />

            <NewFolder
                visible={showNewFolder}
                mode={editingFolderId != null ? "edit" : "create"}
                name={newFolderName}
                onNameChange={setNewFolderName}
                color={newFolderColor}
                onColorChange={setNewFolderColor}
                swatches={FOLDER_SWATCHES}
                thumbnailUri={newFolderThumbnailUri}
                onPickThumbnail={pickThumbnail}
                onRemoveThumbnail={removeNewFolderThumbnail}
                cropSourceUri={cropSourceUri}
                onCropCancel={() => setCropSourceUri(null)}
                onCropConfirm={confirmCroppedThumbnail}
                onDelete={editingFolderId != null ? confirmDeleteFolder : undefined}
                error={newFolderError}
                colors={colors}
                onCancel={cancelNewFolder}
                onSave={saveNewFolder}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
});
