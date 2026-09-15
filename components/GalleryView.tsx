import { useState } from "react";
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
  /** Every tag in storage — search matches tags by title. */
  tags: TagModel[];
  colors: ThemeColors;
  onOpenNote: (note: NoteModel) => void;
  /** Called with the picked note ids, in the order they were picked. */
  onCompare: (ids: string[]) => void;
};

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

  //* picks deliberately survive a filter change, so you can pick one note,
  //* search for another and pick that too — the count includes both
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

  const addCompareId = (id: string) => {
    setCompareIds((ids) => (ids.includes(id) ? ids : [...ids, id]));
  };

  const toggleCompareNote = (note: NoteModel) => {
    if (compareIds.includes(note.id)) { //* removes the note to compare if pressed again
      setCompareIds((ids) => ids.filter((id) => id !== note.id));
      return;
    }
    if (hasPlus !== true && compareIds.length >= FREE_COMPARE_LIMIT) { //* free users have a limit of notes to compare
      //* nothing to upgrade to in a build that doesn't sell Plus, so the
      //* limit is just a limit — say how to make room instead
      if (!PLUS_ON_SALE) {
        Alert.alert(
          `Up to ${FREE_COMPARE_LIMIT} notes`,
          "Take a note out of your selection to add this one.",
        );
        return;
      }
      openPaywall().then((outcome) => {
        if (outcome === "granted") addCompareId(note.id);
        //* the paywall couldn't be shown (offline, or no store configured) —
        //* say so rather than leave the tap doing nothing
        else if (outcome === "unavailable") {
          Alert.alert(
            "NoteIt Plus isn't available right now",
            `Free accounts can compare up to ${FREE_COMPARE_LIMIT} notes. Check your connection and try again.`,
          );
        }
      });
      return;
    }
    addCompareId(note.id);
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
        onClose={() => setSearchOpen(false)}
      />
    </View>
  );
}
