import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@react-native-vector-icons/feather/static";
import type { ThemeColors } from "@/theme/colors";
import { fonts } from "@/theme/fonts";
import { NoteModel } from "../models/NoteModel";
import MediaThumb from "./MediaThumb";

type Props = {
  notes: NoteModel[];
  colors: ThemeColors;
  onOpenNote: (note: NoteModel) => void;
  /** Tapping a tile picks it for comparison instead of opening it. */
  selectionMode?: boolean;
  selectedIds?: string[];
  onToggleSelect?: (note: NoteModel) => void;
  /** Extra bottom padding so a floating bar can't cover the last row. */
  contentBottomInset?: number;
  /** Shown instead of "Nothing here yet" when a filter is hiding everything —
   *  an empty result and an empty gallery need different advice. */
  filtered?: boolean;
};

// 3-across grid of real photo/video thumbnails — ported from the web
// reference's GalleryView grid, including its compare-mode selection state.
//
// A FlatList rather than a ScrollView over notes.map: a ScrollView mounts
// every tile up front, so opening a gallery of 300 notes started 300 image
// loads before the first row was even on screen. FlatList only mounts the
// rows near the viewport and adds more as you scroll.
export default function GalleryGrid({
  notes,
  colors,
  onOpenNote,
  selectionMode = false,
  selectedIds = [],
  onToggleSelect,
  contentBottomInset = 0,
  filtered = false,
}: Props) {
  if (notes.length === 0) {
    return (
      <View style={styles.empty}>
        <Feather name="image" size={30} color={colors.stoneDim} />
        <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
          {filtered ? "No notes match" : "Nothing here yet"}
        </Text>
        <Text style={[styles.emptySubtitle, { color: colors.stone }]}>
          {filtered
            ? "Try different tags or dates."
            : "Tap the plus button to add your first picture-note."}
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.scroll}
      data={notes}
      keyExtractor={(note) => note.id}
      numColumns={3}
      columnWrapperStyle={styles.row}
      ItemSeparatorComponent={RowGap}
      contentContainerStyle={[styles.content, { paddingBottom: 18 + contentBottomInset }]}
      showsVerticalScrollIndicator={false}
      //* the default window keeps ten screens of rows mounted either side, which
      //* on a large gallery ends up mounting (and loading) nearly every tile
      //* anyway, just later. Two screens either side is enough to scroll into
      //* without blank tiles at a normal pace.
      windowSize={5}
      //* selection lives outside `data`, so FlatList has to be handed it —
      //* otherwise it can skip re-rendering tiles when only the selection changed
      extraData={{ selectionMode, selectedIds }}
      renderItem={({ item: note }) => {
        const selected = selectedIds.includes(note.id);
        return (
          <Pressable
            onPress={() => (selectionMode ? onToggleSelect?.(note) : onOpenNote(note))}
            style={[
              styles.tile,
              selectionMode && selected && { borderWidth: 2.5, borderColor: colors.accent },
            ]}
          >
            {/* Unpicked tiles recede while choosing, so the selection is
                readable at a glance rather than only by its checkmark. */}
            <View style={{ flex: 1, opacity: selectionMode && !selected ? 0.55 : 1 }}>
              <MediaThumb note={note} borderRadius={8} />
            </View>

            {selectionMode && (
              <View style={styles.checkSlot}>
                <Feather
                  name={selected ? "check-circle" : "circle"}
                  size={19}
                  color={selected ? colors.accent : "rgba(255,255,255,0.85)"}
                />
              </View>
            )}
          </Pressable>
        );
      }}
    />
  );
}

//* FlatList renders separators between rows only, so this is the vertical gap
//* the old flex-wrap grid got from `gap` — never above the first row or below
//* the last
function RowGap() {
  return <View style={styles.rowGap} />;
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 18,
  },
  row: {
    gap: 6,
  },
  rowGap: {
    height: 6,
  },
  tile: {
    width: "32%",
    aspectRatio: 1,
    borderRadius: 8,
    overflow: "hidden",
  },
  checkSlot: {
    position: "absolute",
    top: 5,
    right: 5,
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
