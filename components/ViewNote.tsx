import { useEffect, useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  Share,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { Feather } from "@react-native-vector-icons/feather";
import { Image } from "expo-image";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import * as Haptics from "expo-haptics";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useVideoPlayer, VideoView } from "expo-video";
import type { ThemeColors } from "@/theme/colors";
import { fonts } from "@/theme/fonts";
import { hexToRgba } from "@/lib/color";
import { formatDayDate, formatShortDate } from "@/lib/date";
import { NoteModel, TagModel } from "../models/NoteModel";
import MarkdownText from "./MarkdownText";
import TopBar from "./TopBar";
import FilmStrip from "./FilmStrip";

const CARD_H = 400;
const DRAG_THRESHOLD = 55;
// Horizontal padding on the body — the card fills what's left, so this is
// also what a full-width swipe measures. Kept as a constant because the pan
// handler needs the same number the stylesheet uses.
const BODY_PADDING_H = 22;

type Props = {
  visible: boolean;
  colors: ThemeColors;
  /** Folder name, or "Gallery" — whatever scope `notes` was drawn from. */
  title: string;
  /** The scoped list to swipe/navigate within (a folder's notes, or all of them). */
  notes: NoteModel[];
  /** Which note to open on. */
  startId: string | null;
  /** All stored tags, to resolve a note's tagIds into display titles. */
  tags: TagModel[];
  onClose: () => void;
  /** Long-pressing "Show note" starts a brand new picture-note. Optional:
   *  the folder screen has no AddNote modal of its own, so it omits this
   *  and the long-press is simply inert there. */
  onAddNote?: () => void;
};

// Full-screen swipeable viewer — ported from the web reference's Viewer +
// PhotoCard: swipe up/down to flip between the photo and its note (styled
// like a paper journal page), swipe left/right to move between notes, plus
// a filmstrip and prev/next/toggle controls for the same actions without a
// gesture. Read-only — editing/deleting a note is business logic Swan wires
// up himself, same boundary as everywhere else in this app.
export default function ViewNote({
  visible,
  colors,
  title,
  notes,
  startId,
  tags,
  onClose,
  onAddNote,
}: Props) {
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(0);
  const [noteOpen, setNoteOpen] = useState(false);
  const [enterDir, setEnterDir] = useState<"next" | "prev" | null>(null);

  // Where the filmstrip sits, in tile units. It lives up here rather than
  // inside FilmStrip because the pan gesture that drives it mid-swipe is
  // down in NoteCard, and this is their nearest common parent.
  const stripPos = useSharedValue(0);

  // Reset per viewing session, without an effect. Both parents keep this
  // component mounted whether or not it's visible, so there's no mount
  // boundary to hang a fresh useState initializer off the way AddNote's date
  // picker has. Doing it in an effect meant React committed one frame still
  // showing the previously-viewed note before correcting itself. Adjusting
  // state during render is React's sanctioned escape hatch for exactly this:
  // it re-runs the component immediately, before anything is painted, so the
  // stale frame never reaches the screen.
  const session = visible ? startId : null;
  const [prevSession, setPrevSession] = useState(session);
  if (session !== prevSession) {
    setPrevSession(session);
    if (visible) {
      const i = notes.findIndex((n) => n.id === startId);
      setIndex(i >= 0 ? i : 0);
      setNoteOpen(false);
      setEnterDir(null);
    }
  }

  useEffect(() => {
    if (visible && notes.length === 0) {
      onClose();
    }
  }, [visible, notes.length]);

  // Realigns the strip when the index changes from something that isn't a
  // swipe — a filmstrip tap or the prev/next buttons. A swipe already drove
  // stripPos to this same target from inside the gesture, so re-running it
  // here just retargets an animation that's already heading there.
  useEffect(() => {
    stripPos.set(withTiming(index, { duration: 280 }));
  }, [index]);

  const startNewNote = () => {
    if (onAddNote == null) return;
    // Web has no haptics engine — expo-haptics warns rather than no-ops
    // there, so don't call it at all.
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {
        // a device with no taptic engine — the modal still opens
      });
    }
    onAddNote();
  };

  const go = (dir: number) => {
    setIndex((i) => {
      const next = i + dir;
      if (next < 0 || next >= notes.length) return i;
      setNoteOpen(false);
      setEnterDir(dir > 0 ? "next" : "prev");
      return next;
    });
  };

  const jumpTo = (i: number) => {
    if (i === index) return;
    setEnterDir(i > index ? "next" : "prev");
    setNoteOpen(false);
    setIndex(i);
  };

  const note = notes[index];

  const handleShare = async () => {
    if (note == null || Platform.OS === "web") return;
    const noteTags = note.tagIds
      .map((id) => tags.find((t) => t.id === id))
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

  return (
    <Modal visible={visible && note != null} animationType="slide" onRequestClose={onClose}>
      {note != null && (
        <View style={[styles.screen, { backgroundColor: colors.bg }]}>
          <TopBar
            title={title}
            colors={colors}
            onBack={onClose}
            right={
              <View style={styles.headerRight}>
                <Text style={[styles.counter, { color: colors.stoneDim }]}>
                  {index + 1} / {notes.length}
                </Text>
                <Pressable
                  onPress={handleShare}
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
            <NoteCard
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
              count={notes.length}
              stripPos={stripPos}
            />

            <FilmStrip
              notes={notes}
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

              <Pressable
                onPress={() => setNoteOpen((v) => !v)}
                onLongPress={startNewNote}
                accessibilityHint={
                  onAddNote != null ? "Press and hold to start a new picture-note" : undefined
                }
                style={[styles.toggleBtn, { backgroundColor: noteOpen ? colors.accent : colors.surface }]}
              >
                <Feather name="file-text" size={16} color={colors.textPrimary} />
                <Text style={[styles.toggleLabel, { color: colors.textPrimary }]}>
                  {noteOpen ? "Show photo" : "Show note"}
                </Text>
              </Pressable>

              <Pressable
                onPress={() => go(1)}
                disabled={index === notes.length - 1}
                style={[styles.navBtn, { backgroundColor: colors.surface, opacity: index === notes.length - 1 ? 0.4 : 1 }]}
              >
                <Feather
                  name="chevron-right"
                  size={18}
                  color={index === notes.length - 1 ? colors.stoneDim : colors.textPrimary}
                />
              </Pressable>
            </View>

            {/* TODO (business logic): a real ad renders here once RevenueCat
                is wired up — this just reserves its footprint so the layout
                doesn't shift when that lands. */}
            <View style={[styles.adSlot, { backgroundColor: colors.surfaceHi, borderColor: colors.line }]} />
          </View>
        </View>
      )}
    </Modal>
  );
}

type NoteCardProps = {
  note: NoteModel;
  tags: TagModel[];
  colors: ThemeColors;
  noteOpen: boolean;
  onToggleNote: (open: boolean) => void;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  enterDir: "next" | "prev" | null;
  /** This card's position in the list, and how many there are. The pan
   *  handler needs both to work out which tile the strip should land on
   *  without running off either end. */
  index: number;
  count: number;
  /** Filmstrip position in tile units, driven live from the pan gesture. */
  stripPos: SharedValue<number>;
};

function NoteCard({
  note,
  tags,
  colors,
  noteOpen,
  onToggleNote,
  onSwipeLeft,
  onSwipeRight,
  enterDir,
  index,
  count,
  stripPos,
}: NoteCardProps) {
  const videoPlayer = useVideoPlayer(note.mediaType === "video" ? note.mediaUri : null);
  // The card fills the body minus its padding. Dragging one card-width moves
  // the filmstrip exactly one tile, which is what makes the two feel locked
  // together rather than merely correlated.
  const { width: windowWidth } = useWindowDimensions();
  const cardWidth = windowWidth - BODY_PADDING_H * 2;

  // Every shared value below is read and written through .get()/.set()
  // rather than .value. React Compiler treats a shared value as an external
  // mutable store, so assigning to .value reads to it as mutating something
  // it isn't allowed to — strictly it rejects only the ones an effect has
  // already touched (here that was just stackY, written in the noteOpen sync
  // and again in the pan handlers), but Reanimated added get/set as the
  // sanctioned accessors for exactly this, and applying them everywhere
  // keeps the file consistent instead of leaving one odd one out. Identical
  // behaviour either way; these are still the same mutable boxes.

  // vertical: 0 = photo panel showing, -CARD_H = note panel showing
  const stackY = useSharedValue(noteOpen ? -CARD_H : 0);
  // horizontal: live drag-to-navigate offset, always springs back to 0
  const cardX = useSharedValue(0);
  const noteOpenSV = useSharedValue(noteOpen);
  const axis = useSharedValue<"x" | "y" | null>(null);

  // slide-in-from-the-side entrance when this card first mounts for a
  // newly-navigated-to note (mirrors the reference's per-card `key`-driven
  // remount + CSS entrance animation).
  const enterX = useSharedValue(enterDir === "next" ? 70 : enterDir === "prev" ? -70 : 0);
  const enterOpacity = useSharedValue(enterDir != null ? 0 : 1);
  useEffect(() => {
    enterX.set(withTiming(0, { duration: 340 }));
    enterOpacity.set(withTiming(1, { duration: 340 }));
  }, []);

  useEffect(() => {
    noteOpenSV.set(noteOpen);
    stackY.set(withTiming(noteOpen ? -CARD_H : 0, { duration: 280 }));
  }, [noteOpen]);

  const panGesture = Gesture.Pan()
    .onStart(() => {
      axis.set(null);
    })
    .onUpdate((e) => {
      if (axis.get() === null) {
        if (Math.abs(e.translationX) > 8 || Math.abs(e.translationY) > 8) {
          axis.set(Math.abs(e.translationX) > Math.abs(e.translationY) ? "x" : "y");
        }
      }
      if (axis.get() === "y") {
        const base = noteOpenSV.get() ? -CARD_H : 0;
        stackY.set(Math.min(40, Math.max(-CARD_H, base + e.translationY)));
      } else if (axis.get() === "x" && !noteOpenSV.get()) {
        cardX.set(e.translationX);
        stripPos.set(index - e.translationX / cardWidth);
      }
    })
    .onEnd((e) => {
      if (axis.get() === "y") {
        let shouldOpen = noteOpenSV.get();
        if (e.translationY < -DRAG_THRESHOLD) shouldOpen = true;
        else if (e.translationY > DRAG_THRESHOLD) shouldOpen = false;
        stackY.set(withTiming(shouldOpen ? -CARD_H : 0, { duration: 280 }));
        scheduleOnRN(onToggleNote, shouldOpen);
      } else if (axis.get() === "x") {
        // Resolve where the strip lands here rather than letting go() clamp
        // it afterwards: at the first or last note the strip would otherwise
        // animate to a tile that doesn't exist and snap back.
        let target = index;
        if (Math.abs(e.translationX) > DRAG_THRESHOLD) {
          if (e.translationX < 0 && index < count - 1) target = index + 1;
          else if (e.translationX > 0 && index > 0) target = index - 1;
        }
        if (target !== index) {
          scheduleOnRN(target > index ? onSwipeLeft : onSwipeRight);
        }
        stripPos.set(withTiming(target, { duration: 280 }));
        cardX.set(withSpring(0));
      }
      axis.set(null);
    });

  const windowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: cardX.get() + enterX.get() }, { rotate: `${cardX.get() / 45}deg` }],
    opacity: enterOpacity.get() * (1 - Math.min(0.45, Math.abs(cardX.get()) / 420)),
  }));

  const stackStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: stackY.get() }],
  }));

  const noteTags = note.tagIds
    .map((id) => tags.find((t) => t.id === id))
    .filter((t): t is TagModel => t != null);

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={[styles.window, windowStyle]}>
        <Animated.View style={[styles.stack, stackStyle]}>
          <View style={[styles.panel, { height: CARD_H }]}>
            {note.mediaType === "video" ? (
              <VideoView style={styles.media} player={videoPlayer} nativeControls contentFit="cover" />
            ) : (
              <Image source={{ uri: note.mediaUri }} style={styles.media} />
            )}
            {note.date.length > 0 && (
              <View style={styles.datePill}>
                <Text style={styles.datePillLabel}>{formatShortDate(note.date)}</Text>
              </View>
            )}
            <View style={styles.hintOverlay}>
              <Text style={styles.hintLabel}>Swipe up to read the note · swipe sideways for more</Text>
            </View>
          </View>

          <View style={[styles.panel, styles.notePanel, { height: CARD_H, backgroundColor: colors.paper }]}>
            <View style={styles.noteHeader}>
              <Text style={styles.noteLabel}>Note</Text>
              {note.date.length > 0 && (
                <Text style={[styles.noteDate, { color: colors.stoneDim }]}>{formatDayDate(note.date)}</Text>
              )}
            </View>
            {note.note.trim().length > 0 ? (
              <MarkdownText text={note.note} style={[styles.noteText, { color: colors.ink }]} />
            ) : (
              <Text style={[styles.noteText, { color: colors.ink }]}>No note yet.</Text>
            )}
            {noteTags.length > 0 && (
              <View style={styles.tagsRow}>
                {noteTags.map((tag) => (
                  <View
                    key={tag.id}
                    style={[styles.tagPill, { backgroundColor: hexToRgba(colors.teal, 0.14) }]}
                  >
                    <Text style={[styles.tagLabel, { color: colors.tealOnPaper }]}>#{tag.title}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </Animated.View>
      </Animated.View>
    </GestureDetector>
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
  window: {
    width: "100%",
    height: CARD_H,
    borderRadius: 16,
    overflow: "hidden",
  },
  stack: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: CARD_H * 2,
  },
  panel: {
    width: "100%",
    overflow: "hidden",
  },
  media: {
    width: "100%",
    height: "100%",
  },
  datePill: {
    pointerEvents: "none",
    position: "absolute",
    top: 12,
    left: 12,
    backgroundColor: "rgba(0,0,0,0.4)",
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  datePillLabel: {
    fontFamily: fonts.interSemiBold,
    fontSize: 11,
    color: "#fff",
  },
  hintOverlay: {
    pointerEvents: "none",
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 26,
    paddingBottom: 14,
    paddingHorizontal: 16,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  hintLabel: {
    fontFamily: fonts.interRegular,
    fontSize: 11.5,
    color: "rgba(255,255,255,0.85)",
  },
  notePanel: {
    padding: 22,
  },
  noteHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  noteLabel: {
    fontFamily: fonts.interBold,
    fontSize: 10.5,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: "#998E7B",
  },
  noteDate: {
    fontFamily: fonts.interRegular,
    fontSize: 12,
  },
  noteText: {
    fontFamily: fonts.frauncesMedium,
    fontSize: 19,
    lineHeight: 29,
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 16,
  },
  tagPill: {
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  tagLabel: {
    fontFamily: fonts.interSemiBold,
    fontSize: 11.5,
  },
  navRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
    marginTop: 22,
  },
  adSlot: {
    height: 64,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: "auto",
    marginBottom: 18,
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
});
