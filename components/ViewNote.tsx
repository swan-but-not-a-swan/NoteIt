import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { useVideoPlayer, VideoView } from "expo-video";
import type { ThemeColors } from "@/theme/colors";
import { fonts } from "@/theme/fonts";
import { hexToRgba } from "@/lib/color";
import { formatDayDate, formatShortDate } from "@/lib/date";
import { NoteModel, TagModel } from "../models/NoteModel";
import MarkdownText from "./MarkdownText";

/** Height of the card. Exported because the screen's layout has to reserve
 *  exactly this much, and the flip animation is expressed in multiples of it. */
export const CARD_H = 400;
const DRAG_THRESHOLD = 55;

type Props = {
  note: NoteModel;
  tags: TagModel[];
  colors: ThemeColors;
  noteOpen: boolean;
  onToggleNote: (open: boolean) => void;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  enterDir: "next" | "prev" | null;
  /** This card's position in the list, and how many there are. The pan handler
   *  needs both to work out which tile the strip should land on without
   *  running off either end. */
  index: number;
  count: number;
  /** Filmstrip position in tile units, driven live from the pan gesture. */
  stripPos: SharedValue<number>;
};

// One picture-note: the photo (or video) with its note on a paper panel
// directly beneath, both inside a window that only shows one at a time.
// Swipe up/down to flip between them, sideways to move through the list.
//
// Purely the card — the screen around it (header, filmstrip, controls, ad)
// belongs to the route that renders this. Read-only: editing and deleting a
// note is business logic Swan wires up himself.
export default function ViewNote({
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
}: Props) {
  const videoPlayer = useVideoPlayer(note.mediaType === "video" ? note.mediaUri : null);

  // Measured rather than derived from the window minus the screen's padding.
  // Dragging one card-width advances the filmstrip exactly one tile, so this
  // number has to be the card's real width — computing it from a padding
  // constant means the two silently disagree the moment that padding changes,
  // which is the same way the filmstrip's centring drifted off.
  const cardWidth = useSharedValue(1);

  // Every shared value below is read and written through .get()/.set() rather
  // than .value. React Compiler treats a shared value as an external mutable
  // store, so assigning to .value reads to it as mutating something it isn't
  // allowed to; Reanimated added get/set as the sanctioned accessors for
  // exactly this. Identical behaviour — still the same mutable boxes.

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
        stripPos.set(index - e.translationX / cardWidth.get());
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
        // Resolve where the strip lands here rather than letting the screen
        // clamp it afterwards: at the first or last note the strip would
        // otherwise animate to a tile that doesn't exist and snap back.
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
      <Animated.View
        style={[styles.window, windowStyle]}
        onLayout={(e) => cardWidth.set(Math.max(1, e.nativeEvent.layout.width))}
      >
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
});
