import { useCallback, useEffect, useState } from "react";
import { Platform, Pressable, Share, StyleSheet, Text, View } from "react-native";
import { Feather } from "@react-native-vector-icons/feather";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router/react-navigation";
import { useLocalSearchParams, useRouter } from "expo-router";
import { DARK_THEME } from "@/theme/colors";
import { fonts } from "@/theme/fonts";
import { formatDayDate } from "@/lib/date";
import TopBar from "@/components/TopBar";
import ViewNote from "@/components/ViewNote";
import FilmStrip from "@/components/FilmStrip";
import AddNote from "@/components/AddNote";
import { useAddNote } from "@/lib/useAddNote";
import { useHoldToAdd } from "@/lib/useHoldToAdd";
import HoldToAddOverlay from "@/components/HoldToAddOverlay";
import { getFoldersFromStorageAsync, getNotesFromStorageAsync, getTagsFromStorageAsync } from "@/persistence/FileStorage";
import { FolderModel } from "@/models/FolderModel";
import { NoteModel, TagModel } from "@/models/NoteModel";

// The picture-note viewer screen: header, the card itself, the filmstrip, the
// prev/show-note/next controls and the ad slot.
//
// A route rather than a <Modal> rendered by whichever screen owned the list.
// That version had to be duplicated in home and the folder screen, carried a
// `viewingNote` state in each, and — because it was a modal — couldn't present
// AddNote over itself without closing first and waiting out the dismissal. As
// a route the back gesture works natively and AddNote is just another modal
// from an ordinary screen.
export default function ViewNotes() {
    const colors = DARK_THEME;
    const router = useRouter();
    //* `id` is the note to open on; `folderId` scopes the list you can swipe
    //* through, so the same screen serves a folder and the whole gallery
    const { id, folderId } = useLocalSearchParams<{ id: string; folderId?: string }>();

    const [folders, setFolders] = useState<FolderModel[]>([]);
    const [notes, setNotes] = useState<NoteModel[]>([]);
    const [tags, setTags] = useState<TagModel[]>([]);
    const [loaded, setLoaded] = useState(false);

    const loadAsync = useCallback(async () => {
        setFolders(await getFoldersFromStorageAsync());
        setNotes(await getNotesFromStorageAsync());
        setTags(await getTagsFromStorageAsync());
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
    const [enterDir, setEnterDir] = useState<"next" | "prev" | null>(null);

    // Where the filmstrip sits, in tile units. It lives here rather than inside
    // FilmStrip because the pan gesture that drives it mid-swipe is down in the
    // card, and this is their nearest common parent.
    const stripPos = useSharedValue(0);

    // Realigns the strip when the index changes from something that isn't a
    // swipe — a filmstrip tap or the prev/next buttons. A swipe already drove
    // stripPos to this target from inside the gesture, so this just retargets
    // an animation already heading there.
    useEffect(() => {
        if (index >= 0) stripPos.set(withTiming(index, { duration: 280 }));
    }, [index]);

    //* the note was deleted, or the folder emptied, while this screen was open
    useEffect(() => {
        if (loaded && note == null) router.back();
    }, [loaded, note, router]);

    const addNote = useAddNote({ storedTags: tags, onSaved: loadAsync });

    const go = (dir: number) => {
        const next = index + dir;
        if (next < 0 || next >= scopedNotes.length) return;
        setEnterDir(dir > 0 ? "next" : "prev");
        setNoteOpen(false);
        setCurrentId(scopedNotes[next].id);
    };

    const jumpTo = (i: number) => {
        if (i === index || i < 0 || i >= scopedNotes.length) return;
        setEnterDir(i > index ? "next" : "prev");
        setNoteOpen(false);
        setCurrentId(scopedNotes[i].id);
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

    //* same hold-then-swipe-up as the grids, so the button behaves like every
    //* other "add a note" entry point instead of inventing a third rule
    const holdToAdd = useHoldToAdd(() => addNote.open(folderId ?? null));

    //* pulled out before the worklet, and this is load-bearing: writing
    //* holdToAdd.active.get() inside one captures `holdToAdd` itself, and the
    //* object carries the PanGesture. Reanimated serialises everything a
    //* worklet closes over, and a gesture isn't serialisable — "cannot copy
    //* value of type 'PanGesture'". Capturing the two shared values directly
    //* keeps the gesture out of the closure.
    const { active: holdActive, progress: holdProgress } = holdToAdd;

    //* the button grows under the finger: `active` springs to 1 when the hold
    //* registers, then `progress` keeps growing it as the swipe travels
    const toggleStyle = useAnimatedStyle(() => ({
        transform: [{ scale: 1 + holdActive.get() * 0.1 + holdProgress.get() * 0.14 }],
    }));

    const toggleTap = Gesture.Tap().onEnd((_e, success) => {
        if (success) scheduleOnRN(setNoteOpen, !noteOpen);
    });

    //* Exclusive gives the hold priority: released before HOLD_MS the pan never
    //* activates and the tap takes over, so a plain tap still toggles
    const toggleGesture = Gesture.Exclusive(holdToAdd.gesture, toggleTap);

    const insets = useSafeAreaInsets();

    if (note == null) return <View style={[styles.screen, { backgroundColor: colors.bg }]} />;

    return (
        <View style={[styles.screen, { backgroundColor: colors.bg }]}>
            <TopBar
                title={title}
                colors={colors}
                //* presented modally — the card already clears the status bar
                insetTop={false}
                onBack={() => router.back()}
                right={
                    <View style={styles.headerRight}>
                        <Text style={[styles.counter, { color: colors.stoneDim }]}>
                            {index + 1} / {scopedNotes.length}
                        </Text>
                        <Pressable
                            onPress={handleShareAsync}
                            hitSlop={8}
                            accessibilityLabel="Share this picture-note"
                            style={[styles.shareButton, { backgroundColor: colors.surface }]}
                        >
                            <Feather name="share" size={16} color={colors.textPrimary} />
                        </Pressable>
                    </View>
                }
            />

            <View style={[styles.body, { paddingBottom: insets.bottom }]}>
                <ViewNote
                    key={note.id}
                    note={note}
                    tags={tags}
                    colors={colors}
                    noteOpen={noteOpen}
                    onToggleNote={setNoteOpen}
                    onSwipeLeft={() => go(1)}
                    onSwipeRight={() => go(-1)}
                    enterDir={enterDir}
                    index={index}
                    count={scopedNotes.length}
                    stripPos={stripPos}
                />

                <FilmStrip
                    notes={scopedNotes}
                    currentIndex={index}
                    colors={colors}
                    onSelect={jumpTo}
                    position={stripPos}
                />

                <View style={styles.navRow}>
                    <Pressable
                        onPress={() => go(-1)}
                        disabled={index === 0}
                        style={[styles.navBtn, { backgroundColor: colors.surface, opacity: index === 0 ? 0.4 : 1 }]}
                    >
                        <Feather name="chevron-left" size={18} color={index === 0 ? colors.stoneDim : colors.textPrimary} />
                    </Pressable>

                    <GestureDetector gesture={toggleGesture}>
                        <Animated.View
                            accessibilityRole="button"
                            accessibilityHint="Press and hold, then release, to start a new picture-note"
                            style={[
                                styles.toggleBtn,
                                toggleStyle,
                                { backgroundColor: noteOpen ? colors.accent : colors.surface },
                            ]}
                        >
                            <Feather name="file-text" size={16} color={colors.textPrimary} />
                            <Text style={[styles.toggleLabel, { color: colors.textPrimary }]}>
                                {noteOpen ? "Show photo" : "Show note"}
                            </Text>
                        </Animated.View>
                    </GestureDetector>

                    <Pressable
                        onPress={() => go(1)}
                        disabled={index === scopedNotes.length - 1}
                        style={[styles.navBtn, { backgroundColor: colors.surface, opacity: index === scopedNotes.length - 1 ? 0.4 : 1 }]}
                    >
                        <Feather
                            name="chevron-right"
                            size={18}
                            color={index === scopedNotes.length - 1 ? colors.stoneDim : colors.textPrimary}
                        />
                    </Pressable>
                </View>

                {/* TODO (business logic): a real ad renders here once RevenueCat
                    is wired up — this just reserves its footprint so the layout
                    doesn't shift when that lands. */}
                <View style={[styles.adSlot, { backgroundColor: colors.surfaceHi, borderColor: colors.line }]} />
            </View>

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
    screen: {
        flex: 1,
    },
    headerRight: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },
    counter: {
        fontFamily: fonts.interRegular,
        fontSize: 12,
    },
    shareButton: {
        width: 38,
        height: 38,
        borderRadius: 10,
        alignItems: "center",
        justifyContent: "center",
    },
    body: {
        flex: 1,
        justifyContent: "flex-start",
        paddingHorizontal: 22,
        paddingTop: 18,
    },
    navRow: {
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        gap: 16,
        marginTop: 22,
        // Guarantees clearance from the ad below. The ad's own `marginTop: "auto"`
        // is what pins it to the bottom, but "auto" is whatever space happens to
        // be left — on a screen where the column already fills, that collapses to
        // nothing and the two controls end up touching. Yoga doesn't collapse
        // adjacent margins, so this one always applies on top of it.
        marginBottom: 20,
    },
    navBtn: {
        width: 42,
        height: 42,
        borderRadius: 21,
        alignItems: "center",
        justifyContent: "center",
    },
    toggleBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        height: 42,
        borderRadius: 21,
        paddingHorizontal: 18,
    },
    toggleLabel: {
        fontFamily: fonts.interSemiBold,
        fontSize: 12.5,
    },
    adSlot: {
        // Anchored-banner height. AdMob's adaptive anchored banners top out at
        // 90, so this reserves the full footprint the real ad can claim rather
        // than something it would later grow past and shift the layout.
        height: 90,
        borderRadius: 14,
        borderWidth: 1,
        marginTop: "auto",
        marginBottom: 18,
    },
});
