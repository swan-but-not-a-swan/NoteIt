import { useCallback, useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { useFocusEffect } from "expo-router/react-navigation";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTheme } from "@/theme/ThemeContext";
import TopBar from "@/components/TopBar";
import GalleryGrid from "@/components/GalleryGrid";
import AddNote from "@/components/AddNote";
import OverflowMenu from "@/components/OverflowMenu";
import { useNavigateOnce } from "@/lib/useNavigateOnce";
import { useAddNote } from "@/lib/useAddNote";
import { getFoldersFromStorageAsync, getNotesFromStorageAsync, getSnippetsFromStorageAsync, getTagsFromStorageAsync } from "@/persistence/FileStorage";
import { FolderModel } from "@/models/FolderModel";
import { NoteModel, TagModel } from "@/models/NoteModel";
import { SnippetModel } from "@/models/SnippetModel";
import {
    buildExportPayload,
    shareExportFileAsync,
    TransferError,
    writeExportFileAsync,
} from "@/lib/noteTransfer";

// A folder's own picture-notes — same grid/viewer as Gallery, just filtered
// down to this folder's id instead of showing everything.
export default function FolderNotes() {
    const { colors } = useTheme();
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();

    const [folders, setFolders] = useState<FolderModel[]>([]);
    const [notes, setNotes] = useState<NoteModel[]>([]);
    const [tags, setTags] = useState<TagModel[]>([]);
    const [snippets, setSnippets] = useState<SnippetModel[]>([]);

    const loadAsync = useCallback(async () => {
        setFolders(await getFoldersFromStorageAsync());
        setNotes(await getNotesFromStorageAsync());
        setTags(await getTagsFromStorageAsync());
        //* re-read on focus, so a snippet added in Settings is offered here
        //* the moment you come back
        setSnippets(await getSnippetsFromStorageAsync());
    }, []);

    useFocusEffect(
        useCallback(() => {
            loadAsync();
        }, [loadAsync]),
    );

    const folder = folders.find((f) => f.id === id) ?? null;
    const folderNotes = notes.filter((note) => note.folderId === id);

    const navigateOnce = useNavigateOnce();

    //* the same modal home uses, presented here over this folder's own grid.
    //* the composition state lives in the hook precisely so this screen can do
    //* that without owning (or duplicating) the save pipeline
    const addNote = useAddNote({ storedTags: tags, snippets, onSaved: loadAsync });

    //* new notes default into the folder being viewed
    const openAddNoteHere = () => addNote.open(id);

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
                //* this screen has no tab bar and so no add button of its own —
                //* the menu is the only way in, now that hold-and-swipe is gone
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
            <AddNote colors={colors} folders={folders} {...addNote.props} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
});
