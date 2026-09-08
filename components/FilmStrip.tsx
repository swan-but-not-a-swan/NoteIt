import { Pressable, StyleSheet, useWindowDimensions } from "react-native";
import Animated, {
  scrollTo,
  useAnimatedReaction,
  useAnimatedRef,
  type SharedValue,
} from "react-native-reanimated";
import type { ThemeColors } from "@/theme/colors";
import { NoteModel } from "../models/NoteModel";
import MediaThumb from "./MediaThumb";

type Props = {
  notes: NoteModel[];
  currentIndex: number;
  colors: ThemeColors;
  onSelect: (index: number) => void;
  /** Where the strip should sit, in tile units. Equals `currentIndex` at
   *  rest and goes fractional mid-swipe, so the strip tracks the drag rather
   *  than jumping once the swipe resolves. */
  position: SharedValue<number>;
};

const INACTIVE_SIZE = 44;
const ACTIVE_SIZE = 52;
const GAP = 6;
// Left edge of one tile to the left edge of the next. Only inactive tiles
// ever sit to the left of the active one, so this stride is constant and
// the strip's scroll offset can be computed rather than measured.
const STRIDE = INACTIVE_SIZE + GAP;

// Horizontal "contact sheet" below the main photo, iPhone-Photos style.
//
// Centering: the content is padded by half a screen minus half a tile on
// each side, so scrolling to `position * STRIDE` lands the tile at that
// position dead center — the padding and the half-tile offset cancel out
// exactly. (The previous formula subtracted that padding instead of
// relying on it, which put the active tile half a screen left of center,
// then clamped at 0 — so for the first few notes the strip never moved.)
//
// The scroll is driven from the UI thread with Reanimated's scrollTo
// worklet instead of a useEffect calling ref.scrollTo. That's what lets it
// follow a live drag at frame rate: a JS-side effect can only react after
// the swipe has already resolved, which is why it used to snap.
export default function FilmStrip({ notes, currentIndex, colors, onSelect, position }: Props) {
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const { width: windowWidth } = useWindowDimensions();

  useAnimatedReaction(
    () => position.get(),
    (pos) => {
      scrollTo(scrollRef, Math.max(0, pos * STRIDE), 0, false);
    },
  );

  if (notes.length <= 1) return null;

  return (
    <Animated.ScrollView
      ref={scrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[
        styles.content,
        { paddingHorizontal: windowWidth / 2 - ACTIVE_SIZE / 2 },
      ]}
    >
      {notes.map((note, i) => {
        const active = i === currentIndex;
        const size = active ? ACTIVE_SIZE : INACTIVE_SIZE;
        return (
          <Pressable
            key={note.id}
            onPress={() => onSelect(i)}
            style={[
              styles.tile,
              {
                width: size,
                height: size,
                borderColor: active ? colors.accent : "transparent",
                opacity: active ? 1 : 0.55,
              },
            ]}
          >
            <MediaThumb note={note} showPlayBadge={false} />
          </Pressable>
        );
      })}
    </Animated.ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: GAP,
    paddingTop: 14,
    paddingBottom: 2,
  },
  tile: {
    flexShrink: 0,
    borderRadius: 8,
    borderWidth: 2,
    overflow: "hidden",
  },
});
