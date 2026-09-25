

import { View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTheme } from "@/theme/ThemeContext";
import TopBar from "@/components/TopBar";
import GalleryGrid from "@/components/GalleryGrid";
import OverflowMenu from "@/components/OverflowMenu";
import { useNavigateOnce } from "@/lib/useNavigateOnce";
import { useLibrary } from "@/lib/LibraryContext";
import { folderScreenStyles as styles } from "@/theme/styles/folders.styles";

// A folder's own picture-notes — same grid/viewer as Gallery, just filtered
// down to this folder's id instead of showing everything.
export default function FolderNotes() {
    const { colors } = useTheme();
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();

    const { folders, notes } = useLibrary();

    const folder = folders.find((f) => f.id === id) ?? null; //* get the folder
    const folderNotes = notes.filter((note) => note.folderId === id); //* get notes from the folder

    const navigateOnce = useNavigateOnce();

    //* new notes default into the folder being viewed
    const openAddNoteHere = () =>
        navigateOnce(() => router.push({ pathname: "/(tabs)/add-note", params: { folderId: id } }));

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
        </View>
    );
}
