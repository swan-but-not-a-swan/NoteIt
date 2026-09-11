import { useState } from "react";
import { Alert, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTheme } from "@/theme/ThemeContext";
import TopBar from "@/components/TopBar";
import GalleryGrid from "@/components/GalleryGrid";
import OverflowMenu from "@/components/OverflowMenu";
import { useNavigateOnce } from "@/lib/useNavigateOnce";
import { useLibrary } from "@/lib/LibraryContext";
import {
    buildExportPayload,
    shareExportFileAsync,
    TransferError,
    writeExportFileAsync,
} from "@/lib/noteTransfer";
import { folderScreenStyles as styles } from "@/theme/styles/folders.styles";

// A folder's own picture-notes — same grid/viewer as Gallery, just filtered
// down to this folder's id instead of showing everything.
export default function FolderNotes() {
    const { colors } = useTheme();
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();

    //* tags come along so the export carries their titles, not just ids
    const { folders, notes, tags } = useLibrary();

    const folder = folders.find((f) => f.id === id) ?? null; //* get the folder
    const folderNotes = notes.filter((note) => note.folderId === id); //* get notes from the folder

    const navigateOnce = useNavigateOnce();

    //* new notes default into the folder being viewed
    const openAddNoteHere = () =>
        navigateOnce(() => router.push({ pathname: "/(tabs)/enter-note", params: { folderId: id } }));

    //* guards a second tap while the container is still being written
    const [exporting, setExporting] = useState(false);

    const exportFolderAsync = async () => {
        if (folder == null || exporting) return;
        setExporting(true);
        try {
            //* the folder travels with its notes, so they land inside a folder
            //* of the same name on the other side rather than loose in a gallery
            const { payload, mediaUris } = buildExportPayload(folderNotes, tags, folder);
            const fileUri = await writeExportFileAsync(payload, mediaUris);
            await shareExportFileAsync(fileUri, `${folder.name}.noteit`);
        } catch (error) {
            Alert.alert(
                "Couldn't export",
                error instanceof TransferError
                    ? error.message
                    : "That folder didn't export. Try again.",
            );
        } finally {
            setExporting(false);
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.bg }]}>
            <TopBar
                title={folder?.name ?? "Folder"}
                colors={colors}
                onBack={() => router.back()}
                right={
                    <OverflowMenu
                        colors={colors}
                        items={[
                            {
                                key: "add",
                                label: "Add picture-note",
                                icon: "plus",
                                onPress: openAddNoteHere,
                            },
                            {
                                key: "export",
                                label: "Export folder",
                                icon: "upload",
                                onPress: exportFolderAsync,
                            },
                        ]}
                    />
                }
            />
            <View style={styles.container}>
                <GalleryGrid
                    notes={folderNotes}
                    colors={colors}
                    onOpenNote={(note) =>
                        navigateOnce(() =>
                            router.push({
                                pathname: "/(tabs)/note/[id]",
                                params: { id: note.id, folderId: id },
                            })
                        )
                    }
                />
            </View>
        </View>
    );
}
