import { useEffect } from "react";
import { useWindowDimensions } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import { useImage } from "expo-image";
import type { NoteModel } from "@/models/NoteModel";
import MediaThumb from "./MediaThumb";
import { heldNotePreviewStyles as styles } from "@/theme/styles/gallery.styles";

/** How much of the window the popped note may take. Photos gives its preview
 *  most of the width and a little over half the height, and stops there. */
const WIDTH_FRACTION = 0.78;
const HEIGHT_FRACTION = 0.56;

//* lands quickly and settles without wobble: this arrives under a finger that
//* is still down, so it has to feel like a response, not an animation
const POP = { damping: 18, stiffness: 260, mass: 0.7 };

// The note being held, shown as itself while its menu is open.
//
// A held tile can't lift on its own: the menu is a Modal with a backdrop over
// the whole grid, and nothing in the grid can paint above that. So the note
// re-appears inside the modal, over the dimmed gallery — which also lets it be
// far bigger than the tile it came from.
//
// Shown at the picture's own shape rather than in a card: the grid already
// crops every note into a square, and the one moment worth breaking that is
// when someone holds a note to look at it. The size comes from the thumbnail,
// which the grid has just drawn and is therefore in memory.
//
// Inert by design — every tap belongs to the menu or the backdrop behind it.
export default function HeldNotePreview({ note }: { note: NoteModel }) {
  const { width: windowW, height: windowH } = useWindowDimensions();
  //* the tile-sized copy, not the full photo: this needs the shape, and the
  //* thumbnail already carries it at a fraction of the memory
  const image = useImage(note.thumbnailUri, { maxWidth: 512 });

  const pop = useSharedValue(0);
  const fade = useSharedValue(0);
  useEffect(() => {
    pop.set(withSpring(1, POP));
    //* a touch faster than the spring, so it is fully there while still growing
    fade.set(withTiming(1, { duration: 120 }));
  }, [pop, fade]);

  const animated = useAnimatedStyle(() => ({
    opacity: fade.get(),
    //* from just under full size: a pop, not a zoom out of nothing
    transform: [{ scale: 0.88 + pop.get() * 0.12 }],
  }));

  //* held back until the shape is known — appearing square and then reflowing
  //* into the real one is worse than arriving a frame later
  if (image == null) return null;

  const aspect = image.width / image.height;
  const maxW = windowW * WIDTH_FRACTION;
  const maxH = windowH * HEIGHT_FRACTION;
  //* whichever limit bites first decides, and the other follows the aspect, so
  //* a panorama and a portrait both fit without either being cropped
  const width = Math.min(maxW, maxH * aspect);
  const height = width / aspect;

  return (
    <Animated.View pointerEvents="none" style={[styles.preview, { width, height }, animated]}>
      <MediaThumb note={note} borderRadius={styles.preview.borderRadius} />
    </Animated.View>
  );
}
