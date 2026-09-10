import { useCallback, useEffect, useState } from "react";
import { Alert, Keyboard, Platform, Pressable, Share, StyleSheet, Text, View } from "react-native";
import { Feather } from "@react-native-vector-icons/feather";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router/react-navigation";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTheme } from "@/theme/ThemeContext";
import { fonts } from "@/theme/fonts";
import { formatDayDate } from "@/lib/date";
import TopBar from "@/components/TopBar";
import ViewNote from "@/components/ViewNote";
import AddNote from "@/components/AddNote";
import OverflowMenu from "@/components/OverflowMenu";
import { useAddNote } from "@/lib/useAddNote";
import { deleteNotesFromStorageAsync, getFoldersFromStorageAsync, getNotesFromStorageAsync, getSnippetsFromStorageAsync, getTagsFromStorageAsync, saveNoteToStorageAsync } from "@/persistence/FileStorage";
import { FolderModel } from "@/models/FolderModel";
import { NoteModel, TagModel } from "@/models/NoteModel";
import { SnippetModel } from "@/models/SnippetModel";

// The picture-note viewer screen: header, the card itself, the filmstrip and
// the ad slot.
//
// Every control lives in the header now. The prev/next buttons went because
// they were a third way to do what the swipe and the filmstrip already do, and
// "Show note" went with them — condensed into an icon that lights up while the
// note is showing.
//
// A route rather than a <Modal> rendered by whichever screen owned the list.
// That version had to be duplicated in home and the folder screen, carried a
// `viewingNote` state in each, and — because it was a modal — couldn't present
// AddNote over itself without closing first and waiting out the dismissal. As
// a route the back gesture works natively and AddNote is just another modal
// from an ordinary screen.
/** Anchored-banner height. AdMob's adaptive anchored banners top out at 90,
 *  so this reserves the full footprint the real ad can claim rather than
 *  something it would later grow past and shift the layout. */
const AD_H = 60;

export default function ViewNotes() {
    const { colors } = useTheme();
    const router = useRouter();
    //* `id` is the note to open on; `folderId` scopes the list you can swipe
    //* through, so the same screen serves a folder and the whole gallery
    const { id, folderId } = useLocalSearchParams<{ id: string; folderId?: string }>();

    const [folders, setFolders] = useState<FolderModel[]>([]);
    const [notes, setNotes] = useState<NoteModel[]>([]);
    const [tags, setTags] = useState<TagModel[]>([]);
    const [snippets, setSnippets] = useState<SnippetModel[]>([]);
    const [loaded, setLoaded] = useState(false);

    const loadAsync = useCallback(async () => {
        setFolders(await getFoldersFromStorageAsync());
        setNotes(await getNotesFromStorageAsync());
        setTags(await getTagsFromStorageAsync());
        //* re-read on focus, so a snippet added in Settings is offered here
        //* the moment you come back
        setSnippets(await getSnippetsFromStorageAsync());
        setLoaded(true);
    }, []);

    useFocusEffect(
        useCallback(() => {
            loadAsync();
        }, [loadAsync]),
    );

    const scopedNotes = folderId != null ? notes.filter((n) => n.folderId === folderId) : notes;
    const folder = folderId != null ? folders.find((f) => f.id === folderId) ?? null : null;
    const title = folderId != null ? folder?.name ?? "Folder" : "Gallery";

    //* tracked by id rather than by index: the list arrives asynchronously, and
    //* an index captured before it loads would point at the wrong note (or
    //* nothing). Deriving the index keeps the two in step however late the
    //* data turns up.
    const [currentId, setCurrentId] = useState(id);
    const index = scopedNotes.findIndex((n) => n.id === currentId);
    const note = index >= 0 ? scopedNotes[index] : null;

    const [noteOpen, setNoteOpen] = useState(false);

    //* the draft lives here rather than in ViewNote because the buttons that
    //* commit and discard it are in this screen's header, not in the card
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState("");
    //* same guard as useAddNote's `saving`: every await below is a chance for
    //* a second tap to start a duplicate write (GitHub issue #4)
    const [savingEdit, setSavingEdit] = useState(false);

    //* the note was deleted, or the folder emptied, while this screen was open
    useEffect(() => {
        if (loaded && note == null) router.back();
    }, [loaded, note, router]);

    const addNote = useAddNote({ storedTags: tags, snippets, onSaved: loadAsync });

    // Both routes to a different note land here — the pager's own swipe and a
    // filmstrip tap — so "showing a different note" means the same thing
    // however it was asked for.
    //
    // Deliberately does not close the note. The strip is reachable *while* the
    // note is open now, and tapping a tile there means "read that one", not
    // "take me back to the photos" — closing on every index change made the
    // open strip unusable for the one thing it is there for.
    const showIndex = (i: number) => {
        if (i === index || i < 0 || i >= scopedNotes.length) return;
        setCurrentId(scopedNotes[i].id);
    };

    // --- editing -----------------------------------------------------------

    const beginEdit = () => {
        if (note == null) return;
        setDraft(note.note);
        //* you cannot edit what isn't on screen, so opening the note is part
        //* of entering edit mode rather than something to ask the user for
        setNoteOpen(true);
        setEditing(true);
    };

    const endEdit = () => {
        //* same reason as the snippet form: unmounting a focused TextInput can
        //* leave the iOS keyboard up, here over a note that is no longer
        //* editable. Both commit and discard come through here.
        Keyboard.dismiss();
        setEditing(false);
        setDraft("");
    };

    const cancelEdit = () => {
        //* nothing typed, nothing to lose — don't make them confirm away a
        //* dialog they didn't earn
        if (note == null || draft === note.note) {
            endEdit();
            return;
        }
        Alert.alert("Discard changes?", "Your edits to this note won't be saved.", [
            { text: "Keep editing", style: "cancel" },
            { text: "Discard", style: "destructive", onPress: endEdit },
        ]);
    };

    const saveEditAsync = async () => {
        if (note == null || savingEdit) return;
        //* unchanged text still costs a write and a full reload, so treat it
        //* as the cancel it effectively is
        if (draft === note.note) {
            endEdit();
            return;
        }
        setSavingEdit(true);
        try {
            //* saveNoteToStorageAsync overwrites by id and only appends to the
            //* id list when it's new, so this is an update, not a second note
            await saveNoteToStorageAsync({ ...note, note: draft });
            endEdit();
            await loadAsync();
        } catch {
            //* the write failed and the draft is still the only copy of it —
            //* staying in edit mode is what keeps it from being thrown away
            Alert.alert("Couldn't save", "That edit didn't save. Try again.");
        } finally {
            setSavingEdit(false);
        }
    };

    // --- deleting ----------------------------------------------------------

    const confirmDelete = () => {
        if (note == null) return;
        Alert.alert(
            "Delete this picture-note?",
            "The note and its photo or video will be deleted. This can't be undone.",
            [
                { text: "Cancel", style: "cancel" },
                { text: "Delete", style: "destructive", onPress: () => performDeleteAsync(note) },
            ],
        );
    };

    const performDeleteAsync = async (target: NoteModel) => {
        //* chosen before the list changes underneath us: prefer the next note,
        //* fall back to the previous one. If neither exists this was the last
        //* note, `note` goes null after the reload, and the effect above backs
        //* out of the viewer on its own.
        const nextId = scopedNotes[index + 1]?.id ?? scopedNotes[index - 1]?.id ?? null;
        await deleteNotesFromStorageAsync([target]);
        if (nextId != null) setCurrentId(nextId);
        await loadAsync();
    };

    const handleShareAsync = async () => {
        if (note == null || Platform.OS === "web") return;
        const noteTags = note.tagIds
            .map((tagId) => tags.find((t) => t.id === tagId))
            .filter((t): t is TagModel => t != null);
        const shareText = [
            note.note,
            noteTags.length > 0 ? noteTags.map((t) => `#${t.title}`).join(" ") : null,
            note.date.length > 0 ? formatDayDate(note.date) : null,
        ]
            .filter((s): s is string => s != null && s.length > 0)
            .join("\n\n");

        try {
            await Share.share({ title, message: shareText });
        } catch {
            // user dismissed the share sheet — no-op
        }
    };

    const insets = useSafeAreaInsets();

    if (note == null) return <View style={[styles.screen, { backgroundColor: colors.bg }]} />;

    return (
        <View style={[styles.screen, { backgroundColor: colors.bg }]}>
            <TopBar
                title={title}
                colors={colors}
                //* presented modally — the card already clears the status bar
                insetTop={false}
                //* while editing the arrow means "get me out of this edit",
                //* not "leave the viewer" — leaving with the draft still in
                //* hand would discard it with no warning at all
                onBack={editing ? cancelEdit : () => router.back()}
                right={
                    editing ? (
                        <View style={styles.headerRight}>
                            {/* Discard sits left of commit and stays plain;
                                only the check is filled, so the primary action
                                is the one that reads as a button. */}
                            <Pressable
                                onPress={cancelEdit}
                                hitSlop={8}
                                accessibilityRole="button"
                                accessibilityLabel="Cancel editing"
                                style={({ pressed }) => [
                                    styles.headerButton,
                                    { backgroundColor: colors.surface, opacity: pressed ? 0.6 : 1 },
                                ]}
                            >
                                <Feather name="x" size={16} color={colors.textPrimary} />
                            </Pressable>

                            <Pressable
                                onPress={saveEditAsync}
                                //* disabled rather than merely guarded, so the
                                //* button also *looks* spent while it writes
                                disabled={savingEdit}
                                hitSlop={8}
                                accessibilityRole="button"
                                accessibilityLabel="Save the note"
                                accessibilityState={{ disabled: savingEdit }}
                                style={({ pressed }) => [
                                    styles.headerButton,
                                    {
                                        backgroundColor: colors.accent,
                                        opacity: savingEdit ? 0.5 : pressed ? 0.75 : 1,
                                    },
                                ]}
                            >
                                <Feather name="check" size={16} color={colors.onAccent} />
                            </Pressable>
                        </View>
                    ) : (
                    <View style={styles.headerRight}>
                        <Text style={[styles.counter, { color: colors.stoneDim }]}>
                            {index + 1} / {scopedNotes.length}
                        </Text>

                        {/* Lit while the note is showing, so the header says
                            which of the two you are looking at without a label
                            that has to flip its wording to do it. */}
                        <Pressable
                            onPress={() => setNoteOpen(!noteOpen)}
                            hitSlop={8}
                            accessibilityRole="button"
                            accessibilityState={{ selected: noteOpen }}
                            accessibilityLabel={noteOpen ? "Hide the note" : "Show the note"}
                            style={[
                                styles.headerButton,
                                { backgroundColor: noteOpen ? colors.accent : colors.surface },
                            ]}
                        >
                            <Feather
                                name="file-text"
                                size={16}
                                color={noteOpen ? colors.onAccent : colors.textPrimary}
                            />
                        </Pressable>

                        <Pressable
                            onPress={handleShareAsync}
                            hitSlop={8}
                            accessibilityLabel="Share this picture-note"
                            style={[styles.headerButton, { backgroundColor: colors.surface }]}
                        >
                            <Feather name="share" size={16} color={colors.textPrimary} />
                        </Pressable>

                        <OverflowMenu
                            colors={colors}
                            items={[
                                {
                                    key: "add",
                                    label: "Add picture-note",
                                    icon: "plus",
                                    //* defaults into the folder being viewed, so
                                    //* adding from inside a folder stays in it
                                    onPress: () => addNote.open(folderId ?? null),
                                },
                                {
                                    key: "edit",
                                    label: "Edit note",
                                    icon: "edit-2",
                                    onPress: beginEdit,
                                },
                                {
                                    key: "delete",
                                    label: "Delete note",
                                    icon: "trash-2",
                                    onPress: confirmDelete,
                                    destructive: true,
                                },
                            ]}
                        />
                    </View>
                    )
                }
            />

            <View style={styles.body}>
                <ViewNote
                    notes={scopedNotes}
                    index={index}
                    onIndexChange={showIndex}
                    tags={tags}
                    colors={colors}
                    noteOpen={noteOpen}
                    onToggleNote={setNoteOpen}
                    editing={editing}
                    draft={draft}
                    onDraftChange={setDraft}
                    snippets={snippets}
                />
            </View>

            {/* Outside the body, so it is the screen's own bottom edge it sits
                on — full width, no radius, nothing under it. The safe-area
                inset is padding *inside* it rather than a gap beneath, so the
                banner clears the home indicator while the bar still reaches
                the bottom of the glass.
                TODO (business logic): a real ad renders here once RevenueCat is
                wired up — this just reserves its footprint. */}
            <View
                style={[
                    styles.adSlot,
                    {
                        backgroundColor: colors.surfaceHi,
                        borderTopColor: colors.line,
                        height: AD_H + insets.bottom,
                        paddingBottom: insets.bottom,
                    },
                ]}
            />

            <AddNote colors={colors} folders={folders} {...addNote.props} />
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
    },
    headerRight: {
        flexDirection: "row",
        alignItems: "center",
        //* three buttons and a counter now share this row, so the gap is
        //* tighter than the 10 a lone share button could afford
        gap: 8,
    },
    counter: {
        fontFamily: fonts.interRegular,
        fontSize: 12,
    },
    headerButton: {
        width: 38,
        height: 38,
        borderRadius: 10,
        alignItems: "center",
        justifyContent: "center",
    },
    body: {
        flex: 1,
        //* no horizontal padding: the photo is full-bleed, and anything that
        //* does want an inset (the note text, the filmstrip) applies its own
        paddingHorizontal: 0,
    },
    adSlot: {
        borderTopWidth: 1,
    },
});
