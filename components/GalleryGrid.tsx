import { FlatList, Pressable, Text, useWindowDimensions, View } from "react-native";
import { Feather } from "@react-native-vector-icons/feather/static";
import type { ThemeColors } from "@/theme/colors";
import { formatShortDate } from "@/lib/date";
import { NoteModel } from "../models/NoteModel";
import MediaThumb from "./MediaThumb";
import {
  galleryGridStyles as styles,
  GALLERY_GRID_GAP,
  GALLERY_GRID_PADDING,
} from "@/theme/styles/gallery.styles";

type Props = {
  notes: NoteModel[];
  colors: ThemeColors;
  onOpenNote: (note: NoteModel) => void;
  /** Tapping a tile picks it for comparison instead of opening it. */
  selectionMode?: boolean;
  selectedIds?: string[];
  onToggleSelect?: (note: NoteModel) => void;
  /** Shown instead of "Nothing here yet" when a filter is hiding everything —
   *  an empty result and an empty gallery need different advice. */
  filtered?: boolean;
};

const COLUMNS = 3;

//* one shared empty list for callers that don't pass selectedIds (the folder
//* screen). A `= []` default is a new array every render, which changes
//* extraData and makes FlatList re-render every visible tile each time
const NO_IDS: string[] = [];

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
  selectedIds = NO_IDS,
  onToggleSelect,
  filtered = false,
}: Props) {
  //* sized from the window rather than a percentage: "32%" plus two fixed
  //* gaps never adds up to the row, so the right margin came out wider than
  //* the left — by about 20pt on an iPad
  const { width } = useWindowDimensions();
  const tileSize = (width - GALLERY_GRID_PADDING * 2 - GALLERY_GRID_GAP * (COLUMNS - 1)) / COLUMNS;

  return (
    <FlatList
      style={styles.scroll}
      data={notes}
      keyExtractor={(note) => note.id}
      numColumns={COLUMNS}
      columnWrapperStyle={styles.row}
      ItemSeparatorComponent={RowGap}
      //* inside the list rather than instead of it, so a filter that empties
      //* the grid doesn't tear the list down and rebuild it when cleared
      ListEmptyComponent={<GalleryEmpty colors={colors} filtered={filtered} />}
      contentContainerStyle={[styles.content, notes.length === 0 && styles.contentEmpty]}
      showsVerticalScrollIndicator={false}
      //* the default window keeps ten screens of rows mounted either side, which
      //* on a large gallery ends up mounting (and loading) nearly every tile
      //* anyway, just later. Two screens either side is enough to scroll into
      //* without blank tiles at a normal pace.
      windowSize={5}
      //* selection and tile size live outside `data`, so FlatList has to be
      //* handed them — otherwise it can skip re-rendering tiles when they change
      extraData={{ selectionMode, selectedIds, tileSize }}
      renderItem={({ item: note }) => {
        const selected = selectionMode && selectedIds.includes(note.id);
        const shortDate = formatShortDate(note.date);
        const kind = note.mediaType === "video" ? "Video" : "Photo";
        return (
          <Pressable
            onPress={() => (selectionMode ? onToggleSelect?.(note) : onOpenNote(note))}
            accessibilityRole={selectionMode ? "checkbox" : "button"}
            accessibilityState={selectionMode ? { checked: selected } : undefined}
            accessibilityLabel={shortDate.length > 0 ? `${kind} note, ${shortDate}` : `${kind} note`}
            accessibilityHint={selectionMode ? undefined : "Opens the note"}
            style={({ pressed }) => [
              styles.tile,
              { width: tileSize, height: tileSize },
              pressed && styles.tilePressed,
            ]}
          >
            {/* Unpicked tiles recede while choosing, so the selection is
                readable at a glance rather than only by its checkmark. */}
            <View style={[styles.thumb, selectionMode && !selected && styles.thumbDimmed]}>
              <MediaThumb note={note} borderRadius={8} />
            </View>

            {/* Drawn over the photo rather than as a border on the tile: a
                border takes space inside the tile, so the photo used to shrink
                by 2.5pt every time it was picked. */}
            {selected && <View style={[styles.selectedRing, { borderColor: colors.accent }]} />}

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

function GalleryEmpty({ colors, filtered }: { colors: ThemeColors; filtered: boolean }) {
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

//* FlatList renders separators between rows only, so this is the vertical gap
//* the old flex-wrap grid got from `gap` — never above the first row or below
//* the last
function RowGap() {
  return <View style={styles.rowGap} />;
}
