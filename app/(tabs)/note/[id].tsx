import { useEffect, useState } from "react";
import { Alert, Platform, Pressable, Share, Text, View } from "react-native";
import { Feather } from "@react-native-vector-icons/feather/static";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTheme } from "@/theme/ThemeContext";
import { glass } from "@/theme/glass";
import { formatDayDate } from "@/lib/date";
import TopBar from "@/components/TopBar";
import ViewNote from "@/components/ViewNote";
import AdBannerStrip from "@/components/AdBannerStrip";
import OverflowMenu from "@/components/OverflowMenu";
import { useEndAd } from "@/components/EndAd";
import { useEntitlements } from "@/lib/EntitlementsContext";
import { useLibrary } from "@/lib/LibraryContext";
import { NoteModel, TagModel } from "@/models/NoteModel";
import {
    buildExportPayload,
    shareExportFileAsync,
    TransferError,
    writeExportFileAsync,
} from "@/lib/noteTransfer";
import { noteScreenStyles as styles } from "@/theme/styles/note.styles";

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
// the note composer over itself without closing first and waiting out the
// dismissal. As a route the back gesture works natively, and starting a new
// note is an ordinary push onto the same stack.

export default function ViewNotes() {
    const { colors } = useTheme();
    const router = useRouter();
    //* `id` is the note to open on; `folderId` scopes the list you can swipe
    //* through, so the same screen serves a folder and the whole gallery
    const { id, folderId } = useLocalSearchParams<{
        id: string;
        folderId?: string;
    }>();

    const {
        folders,
        notes,
        tags,
        ready,
        deleteNotesAsync,
    } = useLibrary();

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

    //* free users get an ad as one more page after the last note. `hasPlus` is
    //* null until entitlements load, and null must not mean "show ads"
    const { hasPlus } = useEntitlements();
    const endAd = useEndAd(hasPlus === false, index >= 0 && index >= scopedNotes.length - 2);
    const [adShowing, setAdShowing] = useState(false);
    //* if the ad goes away while its page is up (Plus kicking in), fall back to
    //* the last note rather than jumping onto the next ad when one loads
    if (adShowing && endAd == null) setAdShowing(false);

    //* the note was deleted, or the folder emptied, while this screen was open
    useEffect(() => {
        if (ready && note == null) router.back();
    }, [ready, note, router]);


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

    //* editing happens on the same screen a note is written on, with this
    //* note loaded into it — the viewer's job is showing, not writing
    const openEditor = () => {
        if (note == null) return;
        router.push({ pathname: "/(tabs)/enter-note", params: { id: note.id } });
    };

    // --- exporting ---------------------------------------------------------

    //* guards a second tap while the container is still being written — the
    //* same reason saveEditAsync has one
    const [exporting, setExporting] = useState(false);

    const exportNoteAsync = async () => {
        if (note == null || exporting) return;
        setExporting(true);
        try {
            //* a single note travels without its folder: on the way back in it
            //* has nowhere to belong, so it lands in the gallery
            const { payload, mediaUris } = buildExportPayload([note], tags, null);
            const fileUri = await writeExportFileAsync(payload, mediaUris);
            await shareExportFileAsync(fileUri, "picture-note.noteit");
        } catch (error) {
            Alert.alert(
                "Couldn't export",
                error instanceof TransferError ? error.message : "That note didn't export. Try again.",
            );
        } finally {
            setExporting(false);
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
        //* note, `note` goes null once it is deleted, and the effect above
        //* backs out of the viewer on its own.
        const nextId = scopedNotes[index + 1]?.id ?? scopedNotes[index - 1]?.id ?? null;
        //* moved *before* the delete, and that order is load-bearing: the
        //* store drops the note the moment the write lands, and if currentId
        //* still pointed at it for that one render, `note` would read null and
        //* the effect above would back out of a viewer that still has notes
        if (nextId != null) setCurrentId(nextId);
        await deleteNotesAsync([target]);
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
                //* Modal presentation only insets the card on iOS, where it genuinely
                //* starts below the status bar. Android renders a "modal" route
                //* full-screen, so nothing clears the status bar there and the
                //* header lands on the clock — hence a platform split, not a flat
                //* false. Only visible on a real Android surface, which is why it
                //* survived until the first emulator run.
                insetTop={Platform.OS !== "ios"}
                onBack={() => router.back()}
                right={
                    //* an ad page has no note to count, open, share, edit or delete
                    adShowing ? null : (
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
                                glass(colors, noteOpen ? { tint: colors.accent, strength: "fill" } : undefined),
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
                            //* "as text" since the overflow now also exports the
                            //* note as a file, and the two need telling apart
                            accessibilityLabel="Share this picture-note as text"
                            style={[styles.headerButton, glass(colors)]}
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
                                    onPress: () =>
                                        router.push({
                                            pathname: "/(tabs)/enter-note",
                                            params: folderId != null ? { folderId } : undefined,
                                        }),
                                },
                                {
                                    key: "edit",
                                    label: "Edit note",
                                    icon: "edit-2",
                                    onPress: openEditor,
                                },
                                {
                                    key: "export",
                                    label: "Export note",
                                    icon: "upload",
                                    onPress: exportNoteAsync,
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
                    endAd={endAd}
                    adShowing={adShowing}
                    onAdShowingChange={setAdShowing}
                />
            </View>

            {/* Outside the body, so it is the screen's own bottom edge it sits
                on — full width, no radius, nothing under it. The bar pads the
                safe-area inset inside itself; with no bar (Plus, or
                entitlements still loading) the spacer does that job instead.
                The banner comes down on the end-of-list ad page: a page that
                is already an ad shouldn't carry a second one. */}
            {hasPlus === false ? (
                <AdBannerStrip
                    variant="bar"
                    colors={colors}
                    bottomInset={insets.bottom}
                    suppressed={adShowing}
                />
            ) : (
                <View style={{ height: insets.bottom }} />
            )}

        </View>
    );
}
