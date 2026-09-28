//! Manually reviewed since 16/09/2026

import { memo, useCallback, useMemo } from "react";
import { FlatList, type ListRenderItemInfo, Pressable, Text, useWindowDimensions, View } from "react-native";
import { Feather } from "@react-native-vector-icons/feather/static";
import type { ThemeColors } from "@/theme/colors";
import { formatShortDate } from "@/lib/date";
import { useBottomBarInset } from "@/lib/BottomBarInset";
import { NoteModel } from "../models/NoteModel";
import MediaThumb from "./MediaThumb";
import {
  galleryGridStyles as styles,
  GALLERY_GRID_GAP,
  GALLERY_GRID_PADDING,
  GALLERY_TILE_RADIUS,
} from "@/theme/styles/gallery.styles";

type Props = {
  notes: NoteModel[];
  colors: ThemeColors;
  onOpenNote: (note: NoteModel) => void;
  selectionMode?: boolean;
  selectedIds?: string[];
  onToggleSelect?: (note: NoteModel) => void;
  filtered?: boolean;
  /** A held tile, with the point held — what a context menu opens at. */
  onLongPressNote?: (note: NoteModel, point: { x: number; y: number }) => void;
};

const COLUMNS = 3;

//* one shared empty list for callers that don't pass selectedIds (the folder
//* screen). A `= []` default is a new array every render, which changes
//* extraData and makes FlatList re-render every visible tile each time
const NO_IDS: string[] = [];

function GalleryGrid({
  notes,
  colors,
  onOpenNote,
  selectionMode = false,
  selectedIds = NO_IDS,
  onToggleSelect,
  filtered = false,
  onLongPressNote,
}: Props) {

  const { width } = useWindowDimensions();
  const bottomBarInset = useBottomBarInset();
  const tileSize = (width - GALLERY_GRID_PADDING * 2 - GALLERY_GRID_GAP * (COLUMNS - 1)) / COLUMNS;

  //* held stable for the same reason as NO_IDS above — a fresh object or
  //* function here tells FlatList the tiles changed, on every render
  const extraData = useMemo(
    () => ({ selectionMode, selectedIds, tileSize, onLongPressNote }),
    [selectionMode, selectedIds, tileSize, onLongPressNote],
  );

  const renderItem = useCallback(
    ({ item: note }: ListRenderItemInfo<NoteModel>) => {
      const selected = selectionMode && selectedIds.includes(note.id);
      const shortDate = formatShortDate(note.date);
      const kind = note.mediaType === "video" ? "Video" : "Photo";
      return (
        <View style={[styles.cell, { width: tileSize }]}>
          <Pressable
            onPress={() => (selectionMode ? onToggleSelect?.(note) : onOpenNote(note))}
            //* not while selecting: a held tile there already means the one thing
            //* selection is for, and a menu over it would fight the checkmarks
            onLongPress={
              selectionMode || onLongPressNote == null
                ? undefined
                : (e) =>
                    onLongPressNote(note, {
                      x: e.nativeEvent.pageX,
                      y: e.nativeEvent.pageY,
                    })
            }
            accessibilityRole={selectionMode ? "checkbox" : "button"}
            accessibilityState={selectionMode ? { checked: selected } : undefined}
            accessibilityLabel={shortDate.length > 0 ? `${kind} note, ${shortDate}` : `${kind} note`}
            accessibilityHint={selectionMode ? undefined : "Opens the note"}
            style={({ pressed }) => [
              styles.tile,
              {
                width: tileSize,
                height: tileSize,
                //* lifted off the canvas like a home-screen widget
                boxShadow: [{ offsetX: 0, offsetY: 6, blurRadius: 14, color: colors.shadow }],
              },
              pressed && styles.tilePressed,
            ]}
          >
            <View style={[styles.thumb, selectionMode && !selected && styles.thumbDimmed]}>
              <MediaThumb note={note} borderRadius={GALLERY_TILE_RADIUS} />
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
        </View>
      );
    },
    [selectionMode, selectedIds, tileSize, colors, onToggleSelect, onOpenNote, onLongPressNote],
  );

  return (
    <FlatList
      style={styles.scroll}
      data={notes}
      keyExtractor={(note) => note.id}
      numColumns={COLUMNS}
      columnWrapperStyle={styles.row}
      ItemSeparatorComponent={RowGap}
      ListEmptyComponent={<GalleryEmpty colors={colors} filtered={filtered} />}
      contentContainerStyle={[
        styles.content,
        //* room to scroll the last row out from under the floating tab bar
        { paddingBottom: GALLERY_GRID_PADDING + bottomBarInset },
        notes.length === 0 && styles.contentEmpty,
      ]}
      showsVerticalScrollIndicator={false}
      windowSize={5}
      extraData={extraData}
      renderItem={renderItem}
    />
  );
}

export default memo(GalleryGrid);

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
