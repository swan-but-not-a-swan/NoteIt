import { useState } from "react";
import { Pressable, StyleSheet, useWindowDimensions } from "react-native";
import Animated, {
  scrollTo,
  useAnimatedReaction,
  useAnimatedRef,
  useSharedValue,
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
// ever sit to the left of the active one, so this stride is constant and the
// strip's scroll offset can be computed rather than measured.
const STRIDE = INACTIVE_SIZE + GAP;

// Half a viewport minus half an active tile, so even the first and last tiles
// can reach the middle.
//
// Marked as a worklet so the scroll reaction can call the same function the
// style does. That shared definition is the whole point: centring is one
// equation split between the padding and the scroll offset, and the moment
// those two disagree the active tile sits off-centre by exactly the amount
// they differ by.
function sidePaddingFor(viewport: number) {
  "worklet";
  return Math.max(0, (viewport - ACTIVE_SIZE) / 2);
}

// Horizontal "contact sheet" below the main photo, iPhone-Photos style.
//
// Centring measures the ScrollView instead of assuming it fills the screen.
// The strip isn't full-bleed — ViewNote's body pads it horizontally — so the
// window is wider than the real viewport, and centring against the window put
// the active tile right of centre by exactly that padding. Measuring keeps it
// correct on any screen size and under any wrapper, without the layout having
// to tell this component about itself.
//
// The scroll is driven from the UI thread with Reanimated's scrollTo worklet
// rather than a useEffect calling ref.scrollTo. That's what lets it follow a
// live drag at frame rate: a JS-side effect can only react once the swipe has
// already resolved, which is why it used to snap.
export default function FilmStrip({ notes, currentIndex, colors, onSelect, position }: Props) {
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const { width: windowWidth } = useWindowDimensions();

  // Window width is a first-frame estimate only — wrong by the wrapper's
  // padding, but close enough that the correction isn't visible — and
  // onLayout replaces it with the measured value, then again on rotation.
  // Held twice because the style is read on the JS thread and the scroll
  // reaction runs on the UI one.
  const [viewportWidth, setViewportWidth] = useState(windowWidth);
  const viewport = useSharedValue(windowWidth);

  useAnimatedReaction(
    () => position.get(),
    (pos) => {
      const width = viewport.get();
      // Tile `pos` begins at sidePadding + pos * STRIDE, and its centre is
      // half an active tile beyond that. Putting that centre in the middle of
      // the viewport means scrolling by the difference between the two.
      const tileCentre = sidePaddingFor(width) + pos * STRIDE + ACTIVE_SIZE / 2;
      scrollTo(scrollRef, Math.max(0, tileCentre - width / 2), 0, false);
    },
  );

  if (notes.length <= 1) return null;

  return (
    <Animated.ScrollView
      ref={scrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      // Never the thing that gives when the column runs out of room. A
      // ScrollView will happily be squeezed to a sliver — which is how the
      // strip ended up showing only the top half of its tiles — and a
      // half-height thumbnail row reads as a rendering bug rather than a
      // layout one.
      style={styles.strip}
      onLayout={(e) => {
        const width = e.nativeEvent.layout.width;
        setViewportWidth(width);
        viewport.set(width);
      }}
      contentContainerStyle={[
        styles.content,
        { paddingHorizontal: sidePaddingFor(viewportWidth) },
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
  strip: {
    flexGrow: 0,
    flexShrink: 0,
  },
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
