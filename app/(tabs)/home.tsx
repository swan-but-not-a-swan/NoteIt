import { Platform, StyleSheet, View } from "react-native";
import { DARK_THEME, FOLDER_SWATCHES } from "@/theme/colors";
import TopBar, { SettingsButton } from "../components/TopBar";
import PoweredByFooter from "../components/PoweredByFooter";
import FoldersList from "../components/FoldersList";
import NewFolder from "../components/NewFolder";
import { getFoldersFromStorage, loadFoldersWithCounts, saveFoldersToStorage } from "../persistence/FileStorage";
import { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native"
import { FolderListItemModel } from "../models/FolderListItemModel";
import * as Crypto from "expo-crypto";
import { Directory, File, Paths } from "expo-file-system";
import * as ImagePicker from "expo-image-picker";

// expo-file-system's newer API (v19+) is class-based and mostly synchronous
// — no more FileSystem.documentDirectory / copyAsync / deleteAsync strings
// and Promises. Paths.document is the persistent, backed-up directory
// (equivalent to the old documentDirectory, not cacheDirectory).
//
// Built lazily, not as a module-level constant: `Paths.document` isn't
// backed by a real native filesystem on web, and constructing a Directory
// eagerly at import time crashed the entire screen the instant this file
// was imported — before anything even tried to use it.
function getThumbnailDir() {
    return new Directory(Paths.document, "folder-thumbnails");
}

function deleteThumbnailFile(uri: string) {
    const file = new File(uri);
    if (file.exists) {
        file.delete(); // throws if missing, hence the exists check — this makes it idempotent
    }
}

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
    const [cropSourceUri, setCropSourceUri] = useState<string | null>(null);

    const [folders, setFolders] = useState<FolderListItemModel[]>([]);
    const getFolders = async () => {
        const data = await loadFoldersWithCounts();
        setFolders(data);
    };

    useFocusEffect(
        useCallback(() => {
            getFolders();
        }, []),
    );

    const openNewFolder = () => {
        setNewFolderName("");
        setNewFolderColor(FOLDER_SWATCHES[0]);
        setNewFolderError(undefined);
        setNewFolderThumbnailUri(null);
        setCropSourceUri(null);
        setShowNewFolder(true);
    };

    const cancelNewFolder = () => {
        // The folder was never saved, so a picked-but-unused thumbnail would
        // otherwise leak as an orphaned file — same "no dangling references,
        // no wasted files" discipline as everywhere else.
        if (newFolderThumbnailUri != null) {
            deleteThumbnailFile(newFolderThumbnailUri);
        }
        setShowNewFolder(false);
    };

    const pickThumbnail = async () => {
        if (Platform.OS === "web") {
            // expo-file-system's persistent Directory/File API (used a few
            // steps later, in confirmCroppedThumbnail) has no real native
            // filesystem to back it on web — it throws there every time.
            // Failing fast here means you don't walk through the whole crop
            // UI just to hit a wall at the very end.
            setNewFolderError("Photo thumbnails aren't supported in the web preview — test this on a device or simulator.");
            return;
        }

        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
            setNewFolderError("Allow photo library access to set a thumbnail.");
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ["images"],
        });
        if (result.canceled) return;

        // NewFolder's own modal stays open throughout — setting this just
        // switches what it renders inside that same modal, to the cropper.
        setCropSourceUri(result.assets[0].uri);
    };

    const confirmCroppedThumbnail = (croppedUri: string) => {
        // A previous pick-then-crop this session (before ever saving) would
        // otherwise be orphaned the moment it's replaced.
        if (newFolderThumbnailUri != null) {
            deleteThumbnailFile(newFolderThumbnailUri);
        }

        const thumbnailDir = getThumbnailDir();
        thumbnailDir.create({ intermediates: true, idempotent: true });
        const dest = new File(thumbnailDir, `${Crypto.randomUUID()}.jpg`);
        new File(croppedUri).copy(dest); // file written before...
        setNewFolderThumbnailUri(dest.uri); // ...the reference is kept
        setCropSourceUri(null); // back to the form, still the same modal
    };

    const removeNewFolderThumbnail = () => {
        if (newFolderThumbnailUri != null) {
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
        
        const isDuplicate = existing.some(
            (folder) => folder.name.trim().toLowerCase() === trimmed.toLowerCase()
        );
        if (isDuplicate) {
            setNewFolderError("A folder with that name already exists.");
            return;
        }

        const newFolder = {
            id: Crypto.randomUUID(),
            name: trimmed,
            accent: newFolderColor,
            Visible: true,
            coverUri: newFolderThumbnailUri,
        };
        
        await saveFoldersToStorage([...existing, newFolder]);
        await getFolders();
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
                onEditFolder={() => {
                    // TODO (business logic): edit mode — prefill name/color from
                    // the tapped folder and save by updating in place rather
                    // than appending. Not part of this pass.
                }}
                onNewFolder={openNewFolder}
            />

            <PoweredByFooter colors={colors} />

            <NewFolder
                visible={showNewFolder}
                mode="create"
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
