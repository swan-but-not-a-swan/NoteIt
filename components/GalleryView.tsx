import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@react-native-vector-icons/feather/static";
import type { ThemeColors } from "@/theme/colors";
import { fonts } from "@/theme/fonts";
import { useEntitlements } from "@/lib/EntitlementsContext";
import { EMPTY_QUERY, filterNotes, isEmptyQuery, type NoteQuery } from "@/lib/noteFilter";
import { NoteModel, TagModel } from "../models/NoteModel";
import GalleryGrid from "./GalleryGrid";
import GalleryToolbar from "./GalleryToolbar";
import SearchNotesModal from "./SearchNotesModal";

type Props = {
  notes: NoteModel[];
  /** Every tag in storage — search matches tags by title. */
  tags: TagModel[];
  colors: ThemeColors;
  onOpenNote: (note: NoteModel) => void;
  /** Called with the picked note ids, in the order they were picked. */
  onCompare: (ids: string[]) => void;
};

/** How many notes a free user can compare at once. Plus removes the cap. */
const FREE_COMPARE_LIMIT = 4;

// The Gallery tab: search and filters, the grid, and picking notes to compare.
//
// Owns the search and compare state itself, so the screen only hands it data
// and decides where navigation goes. Home unmounts this when you switch to
// Folders, which clears both — a half-made compare selection shouldn't survive
// leaving the grid it was made in.
export default function GalleryView({ notes, tags, colors, onOpenNote, onCompare }: Props) {
  const { hasPlus, openPaywall } = useEntitlements();

  //* derived rather than stored: filtering a loaded array is cheap enough to
  //* redo per keystroke, and there's no filtered copy to fall out of sync
  const [query, setQuery] = useState<NoteQuery>(EMPTY_QUERY);
  const [searchOpen, setSearchOpen] = useState(false);
  const visibleNotes = filterNotes(notes, query, tags);

  const [compareMode, setCompareMode] = useState(false);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const canCompare = compareIds.length >= 2; //* two is the minimum that is a comparison at all

  const leaveCompareMode = () => {
    setCompareMode(false);
    setCompareIds([]);
  };

  const toggleCompareMode = () => {
    if (compareMode) leaveCompareMode();
    else setCompareMode(true);
  };

  const toggleCompareNote = (note: NoteModel) => {
    if (compareIds.includes(note.id)) { //* removes the note to compare if pressed again
      setCompareIds((ids) => ids.filter((id) => id !== note.id));
      return;
    }
    if (hasPlus !== true && compareIds.length >= FREE_COMPARE_LIMIT) { //* free users have a limit of 4 notes to compare
      openPaywall().then((granted) => {
        if (granted) setCompareIds((ids) => (ids.includes(note.id) ? ids : [...ids, note.id]));
      });
      return;
    }
    setCompareIds((ids) => (ids.includes(note.id) ? ids : [...ids, note.id]));
  };

  const startCompare = () => {
    const ids = compareIds;
    leaveCompareMode();
    onCompare(ids);
  };

  return (
    <View style={styles.container}>
      <GalleryToolbar
        colors={colors}
        query={query}
        onQueryChange={setQuery}
        tags={tags}
        resultCount={visibleNotes.length}
        onOpenSearch={() => setSearchOpen(true)}
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
            style={[styles.compareCancel, { backgroundColor: colors.surface }]}
          >
            <Text style={[styles.compareCancelLabel, { color: colors.textPrimary }]}>Cancel</Text>
          </Pressable>
          <Pressable
            onPress={startCompare}
            disabled={!canCompare}
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
        onClose={() => setSearchOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  compareBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  compareCancel: {
    borderRadius: 10,
    paddingVertical: 11,
    paddingHorizontal: 16,
  },
  compareCancelLabel: { fontFamily: fonts.interSemiBold, fontSize: 13 },
  compareGo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 10,
    paddingVertical: 11,
    paddingHorizontal: 16,
  },
  compareGoLabel: { fontFamily: fonts.interBold, fontSize: 13.5 },
});
