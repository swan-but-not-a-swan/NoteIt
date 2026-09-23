
import { useCallback, useMemo, useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";
import { Feather } from "@react-native-vector-icons/feather/static";
import type { ThemeColors } from "@/theme/colors";
import { useEntitlements } from "@/lib/EntitlementsContext";
import { FREE_COMPARE_LIMIT, PLUS_ON_SALE } from "@/lib/entitlements";
import { EMPTY_QUERY, filterNotes, isEmptyQuery } from "@/lib/noteHelper";
import { NoteModel, TagModel } from "../models/NoteModel";
import type { FolderModel } from "@/models/FolderModel";
import type { NoteQuery, QueryCombine } from "@/models/NoteQueryModel";
import GalleryGrid from "./GalleryGrid";
import GalleryToolbar from "./GalleryToolbar";
import OverflowMenu from "./OverflowMenu";
import GlassPill from "./GlassPill";
import SearchNotesModal from "./SearchNotesModal";
import { galleryViewStyles as styles } from "@/theme/styles/gallery.styles";

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
  /** Moves the picked notes into another folder. Called with a callback to
   *  run once they have actually moved — picking a folder can be cancelled,
   *  and a cancelled move should leave the selection as it was. */
  onMoveNotes?: (notes: NoteModel[], onMoved: () => void) => void;
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
}: Props) {
  const { hasPlus, openPaywall } = useEntitlements();

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

  const toggleNoteSelected = useCallback(
    (note: NoteModel) => {
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
    [selectedIds, hasPlus, openPaywall, addSelectedId],
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
      <GalleryGrid
        notes={visibleNotes}
        colors={colors}
        filtered={!isEmptyQuery(query)}
        selectionMode={selectMode}
        selectedIds={selectedIds}
        onToggleSelect={toggleNoteSelected}
        onOpenNote={onOpenNote}
      />

      {/* hidden while comparing: the compare bar owns the bottom edge then */}
      {scopeFolderId != null && onShowAll != null && !selectMode && (
        <View style={styles.showAllDock}>
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
        <View style={[styles.compareBar, { backgroundColor: colors.bg, borderTopColor: colors.line }]}>
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
                key: "delete",
                label: "Delete",
                icon: "trash-2",
                onPress: () => onDeleteNotes?.(selectedNotes),
                destructive: true,
              },
            ]}
          />
          <Pressable
            onPress={startCompare}
            disabled={!canCompare}
            accessibilityRole="button"
            accessibilityLabel={`Compare ${selectedIds.length} notes`}
            accessibilityState={{ disabled: !canCompare }}
            accessibilityHint={canCompare ? undefined : "Pick at least two notes"}
            style={[styles.compareGo, { backgroundColor: canCompare ? colors.accent : colors.surfaceHi }]}
          >
            <Feather name="columns" size={15} color={canCompare ? colors.onAccent : colors.stoneDim} />
            <Text style={[styles.compareGoLabel, { color: canCompare ? colors.onAccent : colors.stoneDim }]}>
              Compare{selectedIds.length > 0 ? ` (${selectedIds.length})` : ""}
            </Text>
          </Pressable>
        </View>
      )}

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
