//! Manually reviewed since 16/09/2026

import { memo, useCallback, useMemo } from "react";
import { FlatList, type ListRenderItemInfo, Pressable, Text, useWindowDimensions, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
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

//* Pressable doesn't animate on its own, and the swell has to run on the UI
//* thread to keep up with a finger that is already down
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

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
    ({ item: note }: ListRenderItemInfo<NoteModel>) => (
      <GalleryTile
        note={note}
        colors={colors}
        tileSize={tileSize}
        selectionMode={selectionMode}
        selected={selectionMode && selectedIds.includes(note.id)}
        onToggleSelect={onToggleSelect}
        onOpenNote={onOpenNote}
        onLongPressNote={onLongPressNote}
      />
    ),
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

type TileProps = {
  note: NoteModel;
  colors: ThemeColors;
  tileSize: number;
  selectionMode: boolean;
  selected: boolean;
  onToggleSelect?: (note: NoteModel) => void;
  onOpenNote: (note: NoteModel) => void;
  onLongPressNote?: (note: NoteModel, point: { x: number; y: number }) => void;
};

//* how far the tile swells while it is being held, and over how long. Photos
//* grows the picture under the finger for about as long as the press has to
//* last, so the swell *is* the progress bar for the hold
const HELD_SCALE = 1.1;
const SWELL_MS = 420;

// One tile. A component of its own rather than markup inside renderItem,
// because it needs animation state per tile and hooks can't live in a render
// callback.
//
// Memoised: renderItem is rebuilt whenever the selection changes, and without
// this every visible tile re-rendered on each pick rather than just the one
// whose checkmark changed.
//
// Holding it grows it by a tenth, in place, over the length of the press —
// then the menu takes over and the enlarged picture goes on rising into the
// preview. Letting go early shrinks it straight back, so an abandoned press
// costs nothing and says so.
const GalleryTile = memo(function GalleryTile({
  note,
  colors,
  tileSize,
  selectionMode,
  selected,
  onToggleSelect,
  onOpenNote,
  onLongPressNote,
}: TileProps) {
  const swell = useSharedValue(0);
  const animated = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + swell.get() * (HELD_SCALE - 1) }],
  }));

  const shortDate = formatShortDate(note.date);
  const kind = note.mediaType === "video" ? "Video" : "Photo";
  //* no swell while selecting: a held tile there means selection, not a menu
  const canHold = !selectionMode && onLongPressNote != null;

  return (
    <View style={[styles.cell, { width: tileSize }]}>
      <AnimatedPressable
        onPress={() => (selectionMode ? onToggleSelect?.(note) : onOpenNote(note))}
        onPressIn={() => {
          if (canHold) swell.set(withTiming(1, { duration: SWELL_MS }));
        }}
        //* covers both the finger lifting and the press being cancelled by a
        //* scroll, so a tile can never be left standing proud of the grid
        onPressOut={() => swell.set(withTiming(0, { duration: 140 }))}
        onLongPress={
          canHold
            ? (e) => onLongPressNote(note, { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY })
            : undefined
        }
        accessibilityRole={selectionMode ? "checkbox" : "button"}
        accessibilityState={selectionMode ? { checked: selected } : undefined}
        accessibilityLabel={shortDate.length > 0 ? `${kind} note, ${shortDate}` : `${kind} note`}
        accessibilityHint={selectionMode ? undefined : "Opens the note"}
        //* flat on the canvas: the pictures are the content here, and a shadow
        //* under every one of them turned the grid into a field of floating
        //* cards competing with what they hold
        style={[styles.tile, { width: tileSize, height: tileSize }, animated]}
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
      </AnimatedPressable>
    </View>
  );
});
