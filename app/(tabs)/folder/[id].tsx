import { View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTheme } from "@/theme/ThemeContext";
import TopBar from "@/components/TopBar";
import GalleryGrid from "@/components/GalleryGrid";
import AddNote from "@/components/AddNote";
import OverflowMenu from "@/components/OverflowMenu";
import { useNavigateOnce } from "@/lib/useNavigateOnce";
import { useAddNote } from "@/lib/useAddNote";
import { useLibrary } from "@/lib/LibraryContext";
import { folderScreenStyles as styles } from "@/theme/styles/folders.styles";

// A folder's own picture-notes — same grid/viewer as Gallery, just filtered
// down to this folder's id instead of showing everything.
export default function FolderNotes() {
    const { colors } = useTheme();
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();

    //* nothing to load: the store already holds everything, and stays current
    //* when the viewer edits or deletes, so coming back here costs no reads
    const { folders, notes, tags, snippets, refreshNotesAndTagsAsync } = useLibrary();

    const folder = folders.find((f) => f.id === id) ?? null; 
    const folderNotes = notes.filter((note) => note.folderId === id);

    const navigateOnce = useNavigateOnce();

    //* the same modal home uses, presented here over this folder's own grid.
    const addNote = useAddNote({ storedTags: tags, snippets, onSaved: refreshNotesAndTagsAsync });

    //* new notes default into the folder being viewed
    const openAddNoteHere = () => addNote.open(id);

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
