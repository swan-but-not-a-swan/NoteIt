
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Alert, Text, useWindowDimensions, View } from "react-native";
import { Feather } from "@react-native-vector-icons/feather/static";
import type { ThemeColors } from "@/theme/colors";
import GlassPressable from "./GlassPressable";
import { useEntitlements } from "@/lib/EntitlementsContext";
import { FREE_COMPARE_LIMIT, PLUS_ON_SALE } from "@/lib/entitlements";
import { EMPTY_QUERY, filterNotes, isEmptyQuery } from "@/lib/noteHelper";
import { NoteModel, TagModel } from "../models/NoteModel";
import type { FolderModel } from "@/models/FolderModel";
import type { NoteQuery, QueryCombine } from "@/models/NoteQueryModel";
import GalleryGrid from "./GalleryGrid";
import GalleryToolbar from "./GalleryToolbar";
import type { ImageRef } from "expo-image";
import HeldNotePreview, { HeldImageLoader } from "./HeldNotePreview";
import OverflowMenu, { anchorFor, OverflowMenuCard, type MenuAnchor } from "./OverflowMenu";
import * as Haptics from "expo-haptics";
import GlassPill from "./GlassPill";
import SearchNotesModal from "./SearchNotesModal";
import { BottomBarInsetContext, useBottomBarInset } from "@/lib/BottomBarInset";
import { galleryViewStyles as styles, SELECT_BAR_GAP, SHOW_ALL_DOCK_LIFT } from "@/theme/styles/gallery.styles";

type Props = {
  notes: NoteModel[];
  tags: TagModel[];
  /** Every folder, for the search sheet's folder chips and the summary line. */
  folders: FolderModel[];
  /** The folder this gallery was opened for, or null for the gallery tab.
   *  `notes` arrives already scoped to it; this only switches the mode. */
  scopeFolderId: string | null;
  colors: ThemeColors;
  onOpenNote: (note: NoteModel) => void;
  onCompare: (ids: string[]) => void;
  /** Leaves the folder for the whole gallery. Only shown while scoped. */
  onShowAll?: () => void;
  /** Deletes the picked notes, from the More menu while selecting. */
  onDeleteNotes?: (notes: NoteModel[]) => void;
  /** Opens one note straight into editing — the held tile's menu. */
  onEditNote?: (note: NoteModel) => void;
  /** Moves the picked notes into another folder. Called with a callback to
   *  run once they have actually moved — picking a folder can be cancelled,
   *  and a cancelled move should leave the selection as it was. */
  onMoveNotes?: (notes: NoteModel[], onMoved: () => void) => void;
  /** Exports the picked notes as one .noteit file, from the More menu. */
  onExportNotes?: (notes: NoteModel[]) => void;
};

export default function GalleryView({
  notes,
  tags,
  folders,
  scopeFolderId,
  colors,
  onOpenNote,
  onCompare,
  onShowAll,
  onDeleteNotes,
  onMoveNotes,
  onExportNotes,
  onEditNote,
}: Props) {
  const { hasPlus, openPaywall } = useEntitlements();
  const { width: screenW, height: screenH } = useWindowDimensions();
  const bottomBarInset = useBottomBarInset();

  const [query, setQuery] = useState<NoteQuery>(EMPTY_QUERY);
  const [searchOpen, setSearchOpen] = useState(false);

  //* inside a folder every filter narrows; on the gallery tab any one matching
  //* is enough, and only there can the user pick folders to search
  const combine: QueryCombine = scopeFolderId != null ? "and" : "or";

  const visibleNotes = useMemo(
    () => filterNotes(notes, query, tags, combine),
    [notes, query, tags, combine],
  );

  //* picks survive a filter change, notes can be picked after filtering
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const canCompare = selectedIds.length >= 2; //* two is the minimum that is a comparison at all

  //* the handlers below are memoised so the grid, which is wrapped in memo(),
  //* only re-renders when the selection it draws actually changes
  const leaveSelectMode = useCallback(() => {
    setSelectMode(false);
    setSelectedIds([]);
  }, []);

  const toggleSelectMode = useCallback(() => {
    if (selectMode) leaveSelectMode();
    else setSelectMode(true);
  }, [selectMode, leaveSelectMode]);

  const addSelectedId = useCallback((id: string) => {
    setSelectedIds((ids) => (ids.includes(id) ? ids : [...ids, id]));
  }, []);

  //* the selection as of the last render, read by the toggle below. Reading
  //* it through a ref keeps the toggle the same function across picks, so the
  //* grid's memoised tiles don't all re-render every time one is picked
  const selectedIdsRef = useRef(selectedIds);
  useLayoutEffect(() => {
    selectedIdsRef.current = selectedIds;
  });

  const toggleNoteSelected = useCallback(
    (note: NoteModel) => {
      const selectedIds = selectedIdsRef.current;
      if (selectedIds.includes(note.id)) 
      { //* removes the note to compare if pressed again
        setSelectedIds((ids) => ids.filter((id) => id !== note.id));
        return;
      }
      if (hasPlus !== true && selectedIds.length >= FREE_COMPARE_LIMIT) 
      {
        if (!PLUS_ON_SALE) 
        {
          Alert.alert(
            `Up to ${FREE_COMPARE_LIMIT} notes`,
            "Take a note out of your selection to add this one.",
          );
          return;
        }
        openPaywall().then((outcome) => {
          if (outcome === "granted") addSelectedId(note.id);
          else if (outcome === "unavailable") 
          {
            Alert.alert(
              "NoteIt Plus isn't available right now",
              `Free accounts can compare up to ${FREE_COMPARE_LIMIT} notes. Check your connection and try again.`,
            );
          }
        });
        return;
      }
      addSelectedId(note.id);
    },
    [hasPlus, openPaywall, addSelectedId],
  );

  const startCompare = useCallback(() => {
    const ids = selectedIds;
    leaveSelectMode();
    onCompare(ids);
  }, [selectedIds, leaveSelectMode, onCompare]);

  //* the picked notes themselves, for the actions that work on them
  const selectedNotes = useMemo(
    () => notes.filter((note) => selectedIds.includes(note.id)),
    [notes, selectedIds],
  );

  //* adjusted during render rather than in an effect: every picked note has
  //* left this list — deleted, or moved to a folder this gallery isn't showing
  //* — so there is nothing left to act on and the mode has served its purpose
  if (selectMode && selectedIds.length > 0 && selectedNotes.length === 0) {
    setSelectMode(false);
    setSelectedIds([]);
  }

  //* the note whose tile is being held, and where to put its menu
  const [held, setHeld] = useState<{ note: NoteModel; anchor: MenuAnchor } | null>(null);
  //* the held note's thumbnail once its shape is known (null: it couldn't be
  //* loaded). The menu waits for it, so the picture and the card rise together
  //* instead of the picture landing late and shoving the card down
  const [heldImage, setHeldImage] = useState<{ noteId: string; image: ImageRef | null } | null>(null);
  const heldReady = held != null && heldImage?.noteId === held.note.id;

  const onLongPressNote = useCallback(
    (note: NoteModel, point: { x: number; y: number }) => {
      //* the press is held, not tapped, so the phone says so before anything
      //* appears — the menu is the answer to a question already felt
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      //* a point, not a tile: the menu belongs where the finger is
      setHeld({ note, anchor: anchorFor(point.x, point.y, 0, 0, screenW, screenH) });
    },
    [screenW, screenH],
  );

  const openSearch = useCallback(() => setSearchOpen(true), []);
  const closeSearch = useCallback(() => setSearchOpen(false), []);

  return (
    <View style={styles.container}>
      <GalleryToolbar
        colors={colors}
        query={query}
        onQueryChange={setQuery}
        tags={tags}
        folders={folders}
        combine={combine}
        resultCount={visibleNotes.length}
        onOpenSearch={openSearch}
        selectMode={selectMode}
        onToggleSelectMode={toggleSelectMode}
      />
      {/* the select sheet stands on the tab bar, so while it's up the grid
          ends above both and has nothing extra to clear */}
      <BottomBarInsetContext.Provider value={selectMode ? 0 : bottomBarInset}>
        <GalleryGrid
          notes={visibleNotes}
          colors={colors}
          filtered={!isEmptyQuery(query)}
          selectionMode={selectMode}
          selectedIds={selectedIds}
          onToggleSelect={toggleNoteSelected}
          onOpenNote={onOpenNote}
          onLongPressNote={onLongPressNote}
        />
      </BottomBarInsetContext.Provider>

      {/* hidden while comparing: the compare bar owns the bottom edge then */}
      {scopeFolderId != null && onShowAll != null && !selectMode && (
        <View style={[styles.showAllDock, { bottom: SHOW_ALL_DOCK_LIFT + bottomBarInset }]}>
          <GlassPill
            label="Gallery"
            trailingIcon="arrow-right"
            accessibilityLabel="Show every note in the gallery"
            onPress={onShowAll}
            colors={colors}
          />
        </View>
      )}

      {selectMode && (
        <View
          style={[
            styles.compareBar,
            {
              //* a panel lifted off the grid, one layer below the dock
              backgroundColor: colors.surface,
              borderColor: colors.line,
              boxShadow: [{ offsetX: 0, offsetY: 8, blurRadius: 24, color: colors.shadow }],
              //* stacked on the floating dock rather than hidden under it
              marginBottom: bottomBarInset + SELECT_BAR_GAP,
            },
          ]}
        >
          {/* what to do with the notes just picked. Leaving the mode is the
              cross in the toolbar, so this row is only about acting on them */}
          <OverflowMenu
            colors={colors}
            label="More"
            accessibilityLabel="More"
            items={[
              {
                key: "move",
                label: "Move",
                icon: "folder",
                //* the picked notes have been dealt with, so the mode ends —
                //* even where they stay on screen, as in the whole gallery
                onPress: () => onMoveNotes?.(selectedNotes, leaveSelectMode),
              },
              {
                key: "export",
                label: "Export",
                icon: "upload",
                //* the selection stays: exporting copies the notes out and
                //* changes nothing here, so there is nothing to have dealt with
                onPress: () => onExportNotes?.(selectedNotes),
              },
              {
                key: "delete",
                label: "Delete",
                icon: "trash-2",
                onPress: () => onDeleteNotes?.(selectedNotes),
                destructive: true,
              },
            ]}
          />
          <GlassPressable
            colors={colors}
            tint={canCompare ? colors.accent : undefined}
            strength="fill"
            onPress={startCompare}
            disabled={!canCompare}
            accessibilityRole="button"
            accessibilityLabel={`Compare ${selectedIds.length} notes`}
            accessibilityState={{ disabled: !canCompare }}
            accessibilityHint={canCompare ? undefined : "Pick at least two notes"}
            style={styles.compareGo}
          >
            <Feather name="columns" size={15} color={canCompare ? colors.onAccent : colors.stoneDim} />
            <Text style={[styles.compareGoLabel, { color: canCompare ? colors.onAccent : colors.stoneDim }]}>
              Compare{selectedIds.length > 0 ? ` (${selectedIds.length})` : ""}
            </Text>
          </GlassPressable>
        </View>
      )}

      {/* the held tile's own menu: one note, and the four things worth doing
          to it without opening it first */}
      {held != null && (
        <HeldImageLoader
          key={held.note.id}
          uri={held.note.thumbnailUri}
          onReady={(image) => setHeldImage({ noteId: held.note.id, image })}
        />
      )}
      <OverflowMenuCard
        colors={colors}
        anchor={heldReady ? held.anchor : null}
        onClose={() => setHeld(null)}
        //* the note itself, popped up over the dimmed grid — a menu of four
        //* verbs says nothing about which note they would act on
        preview={
          heldReady && heldImage?.image != null ? <HeldNotePreview note={held.note} image={heldImage.image} /> : null
        }
        items={[
          {
            key: "edit",
            label: "Edit note",
            icon: "edit-2",
            onPress: () => {
              if (held != null) onEditNote?.(held.note);
            },
          },
          {
            key: "move",
            label: "Move",
            icon: "folder",
            onPress: () => {
              if (held != null) onMoveNotes?.([held.note], () => {});
            },
          },
          {
            key: "export",
            label: "Export",
            icon: "upload",
            onPress: () => {
              if (held != null) onExportNotes?.([held.note]);
            },
          },
          {
            key: "delete",
            label: "Delete",
            icon: "trash-2",
            onPress: () => {
              if (held != null) onDeleteNotes?.([held.note]);
            },
            destructive: true,
          },
        ]}
      />

      <SearchNotesModal
        visible={searchOpen}
        colors={colors}
        query={query}
        onQueryChange={setQuery}
        tags={tags}
        folders={folders}
        showFolders={scopeFolderId == null}
        resultCount={visibleNotes.length}
        onClose={closeSearch}
      />
    </View>
  );
}
