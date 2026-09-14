//! Manually Reviewed since 14/09/2026
import { StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import { Feather } from "@react-native-vector-icons/feather/static";
import { NoteModel } from "../models/NoteModel";

type Props = {
  note: NoteModel;
  borderRadius?: number;
  showPlayBadge?: boolean;
  preferFullMedia?: boolean;
};

export default function MediaThumb({
  note,
  borderRadius = 0,
  showPlayBadge = true,
  preferFullMedia = false,
}: Props) {
  const isVideo = note.mediaType === "video";
  const previewUri = preferFullMedia && !isVideo ? note.mediaUri : note.thumbnailUri;

  return (
    <View style={[styles.wrap, { borderRadius }]}>
      <Image source={{ uri: previewUri }} style={styles.media} />
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
    backgroundColor: "#1A1714",
  },
  media: {
    width: "100%",
    height: "100%",
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
    marginLeft: 2,
  },
});
