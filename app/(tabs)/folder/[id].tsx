import { useCallback, useState } from "react";
import { StyleSheet, View } from "react-native";
import { GestureDetector } from "react-native-gesture-handler";
import { useFocusEffect } from "expo-router/react-navigation";
import { useLocalSearchParams, useRouter } from "expo-router";
import { DARK_THEME } from "@/theme/colors";
import TopBar from "@/components/TopBar";
import GalleryGrid from "@/components/GalleryGrid";
import HoldToAddOverlay from "@/components/HoldToAddOverlay";
import AddNote from "@/components/AddNote";
import { useHoldToAdd } from "@/lib/useHoldToAdd";
import { useNavigateOnce } from "@/lib/useNavigateOnce";
import { useAddNote } from "@/lib/useAddNote";
import { getFoldersFromStorageAsync, getNotesFromStorageAsync, getTagsFromStorageAsync } from "@/persistence/FileStorage";
import { FolderModel } from "@/models/FolderModel";
import { NoteModel, TagModel } from "@/models/NoteModel";

// A folder's own picture-notes — same grid/viewer as Gallery, just filtered
// down to this folder's id instead of showing everything.
export default function FolderNotes() {
    const colors = DARK_THEME;
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();

    const [folders, setFolders] = useState<FolderModel[]>([]);
    const [notes, setNotes] = useState<NoteModel[]>([]);
    const [tags, setTags] = useState<TagModel[]>([]);

    const loadAsync = useCallback(async () => {
        setFolders(await getFoldersFromStorageAsync());
        setNotes(await getNotesFromStorageAsync());
        setTags(await getTagsFromStorageAsync());
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
    const addNote = useAddNote({ storedTags: tags, onSaved: loadAsync });

    //* new notes default into the folder being viewed
    const openAddNoteHere = () => addNote.open(id);

    //* hold-and-swipe on the grid
    const holdToAdd = useHoldToAdd(openAddNoteHere);

    return (
        <View style={[styles.container, { backgroundColor: colors.bg }]}>
            <TopBar title={folder?.name ?? "Folder"} colors={colors} onBack={() => router.back()} />
            <GestureDetector gesture={holdToAdd.gesture}>
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
            </GestureDetector>
            <HoldToAddOverlay
                visible={holdToAdd.holding}
                progress={holdToAdd.progress}
                readyToRelease={holdToAdd.readyToRelease}
                colors={colors}
            />
            <AddNote colors={colors} folders={folders} {...addNote.props} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
});
