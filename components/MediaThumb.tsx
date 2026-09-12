import { StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import { Feather } from "@react-native-vector-icons/feather/static";
import { NoteModel } from "../models/NoteModel";

type Props = {
  note: NoteModel;
  borderRadius?: number;
  /** Small centered play icon over a video tile. Default true. */
  showPlayBadge?: boolean;
  /** Show the original photo rather than its thumbnail. For anything larger
   *  than a grid tile — the 400px-wide thumbnail is visibly soft once it has
   *  to fill a comparison card. Videos are unaffected: their thumbnail is the
   *  only still that exists. */
  preferFullMedia?: boolean;
};

// Renders note.thumbnailUri — a still image written once when the note is
// saved, so a grid never touches a video player.
//
// Two earlier attempts to preview video here failed on device and should not
// be retried:
//   1. A paused <VideoView> per tile — paints nothing on iOS/Android (a
//      player only draws once playback starts); it only looked right on web.
//   2. player.generateThumbnailsAsync() per tile — crashed the app natively,
//      and a JS try/catch can't catch that.
// Both also spun up one native player per video tile, which a scrolling grid
// should never do.
//
// Fallbacks cover notes saved before thumbnailUri existed: a photo can still
// show its full-size media, a video gets the placeholder tile.
export default function MediaThumb({
  note,
  borderRadius = 0,
  showPlayBadge = true,
  preferFullMedia = false,
}: Props) {
  const isVideo = note.mediaType === "video";
  const previewUri =
    preferFullMedia && !isVideo
      ? note.mediaUri
      : note.thumbnailUri ?? (isVideo ? null : note.mediaUri);

  return (
    <View style={[styles.wrap, { borderRadius }]}>
      {previewUri != null ? (
        <Image source={{ uri: previewUri }} style={styles.media} />
      ) : (
        <View style={styles.videoTile} />
      )}
      {isVideo && showPlayBadge && (
        <View style={styles.badge}>
          <View style={styles.playCircle}>
            <Feather name="play" size={11} color="#fff" style={styles.playIcon} />
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
    height: "100%",
    overflow: "hidden",
  },
  media: {
    width: "100%",
    height: "100%",
  },
  videoTile: {
    width: "100%",
    height: "100%",
    backgroundColor: "#1A1714",
  },
  badge: {
    pointerEvents: "none",
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  playCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  playIcon: {
    // nudge the glyph's optical center — Feather's "play" triangle sits
    // slightly left of its box, this re-centers it inside the round badge
    marginLeft: 2,
  },
});
