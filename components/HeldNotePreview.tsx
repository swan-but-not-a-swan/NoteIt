import { useEffect } from "react";
import { View, useWindowDimensions } from "react-native";
import { useImage, type ImageRef } from "expo-image";
import type { NoteModel } from "@/models/NoteModel";
import MediaThumb from "./MediaThumb";
import { heldNotePreviewStyles as styles } from "@/theme/styles/gallery.styles";

/** How much of the window the popped note may take. Photos gives its preview
 *  most of the width and about half the height, and stops there — the rest
 *  belongs to the menu under it. */
const WIDTH_FRACTION = 0.76;
const HEIGHT_FRACTION = 0.52;

/**
 * Loads the held note's thumbnail and reports when its shape is known — or
 * that it can't be (null), so the menu opens anyway, just without a picture.
 *
 * The menu waits for this before it rises. The picture sits above the card in
 * one centred column, so a picture arriving after the card would shove the
 * card down mid-rise. Renders nothing; key it by the note so each hold starts
 * fresh.
 */
export function HeldImageLoader({ uri, onReady }: { uri: string; onReady: (image: ImageRef | null) => void }) {
  const image = useImage(uri, { maxWidth: 512, onError: () => onReady(null) });
  useEffect(() => {
    if (image != null) onReady(image);
    // onReady is a fresh closure each render; the image arriving is the event
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [image]);
  return null;
}

// The note being held, shown as itself while its menu is open.
//
// A held tile can't lift on its own: the menu is a Modal with a backdrop over
// the whole grid, and nothing in the grid can paint above that. So the note
// re-appears inside the modal, over the dimmed gallery — which also lets it be
// far bigger than the tile it came from.
//
// Shown at the picture's own shape rather than in a card: the grid already
// crops every note into a square, and the one moment worth breaking that is
// when someone holds a note to look at it. The shape comes from the thumbnail
// HeldImageLoader already loaded — the tile-sized copy, which carries the
// aspect at a fraction of the full photo's memory.
//
// No animation of its own — the menu owns the pop, so this and the card under
// it rise as one object rather than two things that start at the same moment.
export default function HeldNotePreview({ note, image }: { note: NoteModel; image: ImageRef }) {
  const { width: windowW, height: windowH } = useWindowDimensions();

  const aspect = image.width / image.height;
  const maxW = windowW * WIDTH_FRACTION;
  const maxH = windowH * HEIGHT_FRACTION;
  //* whichever limit bites first decides, and the other follows the aspect, so
  //* a panorama and a portrait both fit without either being cropped
  const width = Math.min(maxW, maxH * aspect);
  const height = width / aspect;

  return (
    <View pointerEvents="none" style={[styles.preview, { width, height }]}>
      <MediaThumb note={note} borderRadius={styles.preview.borderRadius} />
    </View>
  );
}
