//! Manually reviewed since 16/09/2026

import { useCallback, useMemo, useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";
import { Feather } from "@react-native-vector-icons/feather/static";
import type { ThemeColors } from "@/theme/colors";
import { useEntitlements } from "@/lib/EntitlementsContext";
import { FREE_COMPARE_LIMIT, PLUS_ON_SALE } from "@/lib/entitlements";
import { EMPTY_QUERY, filterNotes, isEmptyQuery, type NoteQuery } from "@/lib/noteHelper";
import { NoteModel, TagModel } from "../models/NoteModel";
import GalleryGrid from "./GalleryGrid";
import GalleryToolbar from "./GalleryToolbar";
import SearchNotesModal from "./SearchNotesModal";
import { galleryViewStyles as styles } from "@/theme/styles/gallery.styles";

type Props = {
  notes: NoteModel[];
  tags: TagModel[];
  colors: ThemeColors;
  onOpenNote: (note: NoteModel) => void;
  onCompare: (ids: string[]) => void;
};

export default function GalleryView({ notes, tags, colors, onOpenNote, onCompare }: Props) {
  const { hasPlus, openPaywall } = useEntitlements();

  const [query, setQuery] = useState<NoteQuery>(EMPTY_QUERY);
  const [searchOpen, setSearchOpen] = useState(false);

  const visibleNotes = useMemo(() => filterNotes(notes, query, tags), [notes, query, tags]);

  //* picks survive a filter change, notes can be picked after filtering
  const [compareMode, setCompareMode] = useState(false);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const canCompare = compareIds.length >= 2; //* two is the minimum that is a comparison at all

  //* the handlers below are memoised so the grid, which is wrapped in memo(),
  //* only re-renders when the selection it draws actually changes
  const leaveCompareMode = useCallback(() => {
    setCompareMode(false);
    setCompareIds([]);
  }, []);

  const toggleCompareMode = useCallback(() => {
    if (compareMode) leaveCompareMode();
    else setCompareMode(true);
  }, [compareMode, leaveCompareMode]);

  const addCompareId = useCallback((id: string) => {
    setCompareIds((ids) => (ids.includes(id) ? ids : [...ids, id]));
  }, []);

  const toggleCompareNote = useCallback(
    (note: NoteModel) => {
      if (compareIds.includes(note.id)) 
      { //* removes the note to compare if pressed again
        setCompareIds((ids) => ids.filter((id) => id !== note.id));
        return;
      }
      if (hasPlus !== true && compareIds.length >= FREE_COMPARE_LIMIT) 
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
          if (outcome === "granted") addCompareId(note.id);
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
      addCompareId(note.id);
    },
    [compareIds, hasPlus, openPaywall, addCompareId],
  );

  const startCompare = useCallback(() => {
    const ids = compareIds;
    leaveCompareMode();
    onCompare(ids);
  }, [compareIds, leaveCompareMode, onCompare]);

  const openSearch = useCallback(() => setSearchOpen(true), []);
  const closeSearch = useCallback(() => setSearchOpen(false), []);

  return (
    <View style={styles.container}>
      <GalleryToolbar
        colors={colors}
        query={query}
        onQueryChange={setQuery}
        tags={tags}
        resultCount={visibleNotes.length}
        onOpenSearch={openSearch}
        compareMode={compareMode}
        onToggleCompare={toggleCompareMode}
      />
      <GalleryGrid
        notes={visibleNotes}
        colors={colors}
        filtered={!isEmptyQuery(query)}
        selectionMode={compareMode}
        selectedIds={compareIds}
        onToggleSelect={toggleCompareNote}
        onOpenNote={onOpenNote}
      />

      {compareMode && (
        <View style={[styles.compareBar, { backgroundColor: colors.bg, borderTopColor: colors.line }]}>
          <Pressable
            onPress={leaveCompareMode}
            accessibilityRole="button"
            accessibilityLabel="Cancel comparing"
            style={[styles.compareCancel, { backgroundColor: colors.surface }]}
          >
            <Text style={[styles.compareCancelLabel, { color: colors.textPrimary }]}>Cancel</Text>
          </Pressable>
          <Pressable
            onPress={startCompare}
            disabled={!canCompare}
            accessibilityRole="button"
            accessibilityLabel={`Compare ${compareIds.length} notes`}
            accessibilityState={{ disabled: !canCompare }}
            accessibilityHint={canCompare ? undefined : "Pick at least two notes"}
            style={[styles.compareGo, { backgroundColor: canCompare ? colors.accent : colors.surfaceHi }]}
          >
            <Feather name="columns" size={15} color={canCompare ? colors.onAccent : colors.stoneDim} />
            <Text style={[styles.compareGoLabel, { color: canCompare ? colors.onAccent : colors.stoneDim }]}>
              Compare{compareIds.length > 0 ? ` (${compareIds.length})` : ""}
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
        resultCount={visibleNotes.length}
        onClose={closeSearch}
      />
    </View>
  );
}
