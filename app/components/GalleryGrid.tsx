import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import type { ThemeColors } from "@/theme/colors";
import { fonts } from "@/theme/fonts";
import { NoteModel } from "../models/NoteModel";
import MediaThumb from "./MediaThumb";

type Props = {
  notes: NoteModel[];
  colors: ThemeColors;
  onOpenNote: (note: NoteModel) => void;
};

// 3-across grid of real photo/video thumbnails — ported from the web
// reference's GalleryView grid (MediaThumb tiles), minus its search/compare
// toolbar, which is business logic left for Swan to wire up.
export default function GalleryGrid({ notes, colors, onOpenNote }: Props) {
  if (notes.length === 0) {
    return (
      <View style={styles.empty}>
        <Feather name="image" size={30} color={colors.stoneDim} />
        <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>Nothing here yet</Text>
        <Text style={[styles.emptySubtitle, { color: colors.stone }]}>
          Tap the plus button to add your first picture-note.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.grid}>
        {notes.map((note) => (
          <Pressable key={note.id} onPress={() => onOpenNote(note)} style={styles.tile}>
            <MediaThumb note={note} borderRadius={8} />
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 18,
    paddingBottom: 18,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  tile: {
    width: "32%",
    aspectRatio: 1,
    borderRadius: 8,
    overflow: "hidden",
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingHorizontal: 40,
    paddingBottom: 60,
  },
  emptyTitle: {
    fontFamily: fonts.frauncesSemiBold,
    fontSize: 17,
    marginTop: 10,
  },
  emptySubtitle: {
    fontFamily: fonts.interRegular,
    fontSize: 13,
    textAlign: "center",
  },
});
