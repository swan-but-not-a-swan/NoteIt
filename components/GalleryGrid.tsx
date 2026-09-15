//! Manually reviewed since 15/09/2026

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
  selectionMode?: boolean;
  selectedIds?: string[];
  onToggleSelect?: (note: NoteModel) => void;
  filtered?: boolean;
};

const COLUMNS = 3;

//* one shared empty list for callers that don't pass selectedIds (the folder
//* screen). A `= []` default is a new array every render, which changes
//* extraData and makes FlatList re-render every visible tile each time
const NO_IDS: string[] = []; 

export default function GalleryGrid({
  notes,
  colors,
  onOpenNote,
  selectionMode = false,
  selectedIds = NO_IDS,
  onToggleSelect,
  filtered = false,
}: Props) {

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
      ListEmptyComponent={<GalleryEmpty colors={colors} filtered={filtered} />}
      contentContainerStyle={[styles.content, notes.length === 0 && styles.contentEmpty]}
      showsVerticalScrollIndicator={false}
      windowSize={5}
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
            <View style={[styles.thumb, selectionMode && !selected && styles.thumbDimmed]}>
              <MediaThumb note={note} borderRadius={8} />
            </View>

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

function RowGap() {
  return <View style={styles.rowGap} />;
}
