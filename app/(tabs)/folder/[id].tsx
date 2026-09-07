import { useCallback, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useFocusEffect } from "expo-router/react-navigation";
import { useLocalSearchParams, useRouter } from "expo-router";
import { DARK_THEME } from "@/theme/colors";
import TopBar from "../../components/TopBar";
import GalleryGrid from "../../components/GalleryGrid";
import ViewNote from "../../components/ViewNote";
import { getFoldersFromStorageAsync, getNotesFromStorageAsync, getTagsFromStorageAsync } from "../../persistence/FileStorage";
import { FolderModel } from "../../models/FolderModel";
import { NoteModel, TagModel } from "../../models/NoteModel";

// A folder's own picture-notes — same grid/viewer as Gallery, just filtered
// down to this folder's id instead of showing everything.
export default function FolderNotes() {
    const colors = DARK_THEME;
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();

    const [folder, setFolder] = useState<FolderModel | null>(null);
    const [notes, setNotes] = useState<NoteModel[]>([]);
    const [tags, setTags] = useState<TagModel[]>([]);
    const [viewingNote, setViewingNote] = useState<NoteModel | null>(null);

    useFocusEffect(
        useCallback(() => {
            getFoldersFromStorageAsync().then((folders) => {
                setFolder(folders.find((f) => f.id === id) ?? null);
            });
            getNotesFromStorageAsync().then(setNotes);
            getTagsFromStorageAsync().then(setTags);
        }, [id]),
    );

    const folderNotes = notes.filter((note) => note.folderId === id);

    return (
        <View style={[styles.container, { backgroundColor: colors.bg }]}>
            <TopBar title={folder?.name ?? "Folder"} colors={colors} onBack={() => router.back()} />
            <GalleryGrid notes={folderNotes} colors={colors} onOpenNote={setViewingNote} />
            <ViewNote
                visible={viewingNote != null}
                colors={colors}
                title={folder?.name ?? "Folder"}
                notes={folderNotes}
                startId={viewingNote?.id ?? null}
                tags={tags}
                onClose={() => setViewingNote(null)}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
});
