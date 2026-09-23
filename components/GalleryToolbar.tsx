import { Pressable, ScrollView, Text, View } from "react-native";
import { Feather } from "@react-native-vector-icons/feather/static";
import { hexToRgba, type ThemeColors } from "@/theme/colors";
import { describeQuery, EMPTY_QUERY, isEmptyQuery } from "@/lib/noteHelper";
import { DATE_PRESETS, withPreset } from "@/lib/dateHelper";
import type { FolderModel } from "@/models/FolderModel";
import type { NoteQuery, QueryCombine } from "@/models/NoteQueryModel";
import { TagModel } from "../models/NoteModel";
import { galleryToolbarStyles as styles } from "@/theme/styles/gallery.styles";

type Props = {
  colors: ThemeColors;
  query: NoteQuery;
  onQueryChange: (query: NoteQuery) => void;
  /** Every tag in storage — needed only to name the ones in the summary line. */
  tags: TagModel[];
  /** Every folder — likewise only to name picked folders in the summary line. */
  folders: FolderModel[];
  /** How the filters combine, so the summary line can say "or" when it means it. */
  combine: QueryCombine;
  /** How many notes the current query matches, shown once a filter is active. */
  resultCount: number;
  onOpenSearch: () => void;
  /** Picking notes — to compare, delete or move them — rather than opening them. */
  selectMode: boolean;
  onToggleSelectMode: () => void;
};


// Search + filter strip above the gallery grid, ported from the web
// reference's GalleryView toolbar.
//
// The search control is a button, not a field: the real filters (tags, an
// explicit date range) live in a sheet, and a text box sitting here would
// imply typing is all there is. The date presets stay inline because they are
// one tap each and the summary line below reads back what's active.
export default function GalleryToolbar({
  colors,
  query,
  onQueryChange,
  tags,
  folders,
  combine,
  resultCount,
  onOpenSearch,
  selectMode,
  onToggleSelectMode,
}: Props) {
  const filtering = !isEmptyQuery(query);
  const summary = describeQuery(query, tags, folders, combine);

  return (
    <View style={styles.wrap}>
      <View style={styles.searchRow}>
        <Pressable
          onPress={onOpenSearch}
          style={[
            styles.searchButton,
            {
              backgroundColor: filtering ? hexToRgba(colors.accent, 0.12) : colors.surface,
              borderColor: filtering ? colors.accent : colors.line,
            },
          ]}
        >
          <Feather name="search" size={15} color={filtering ? colors.accent : colors.stoneDim} />
          <Text
            numberOfLines={1}
            style={[styles.searchLabel, { color: filtering ? colors.accent : colors.stone }]}
          >
            {filtering
              ? `${resultCount} result${resultCount === 1 ? "" : "s"}  ·  ${summary}`
              : "Search notes by tag or date"}
          </Text>
        </Pressable>

        {/* the same button leaves the mode it entered: a cross reads as "stop
            picking" where the columns icon would read as "compare now" */}
        <Pressable
          onPress={onToggleSelectMode}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel={selectMode ? "Cancel" : "Select picture-notes"}
          style={[
            styles.selectButton,
            {
              backgroundColor: selectMode ? hexToRgba(colors.accent, 0.12) : colors.surface,
              borderColor: selectMode ? colors.accent : colors.line,
            },
          ]}
        >
          <Feather
            name={selectMode ? "x" : "columns"}
            size={16}
            color={selectMode ? colors.accent : colors.stoneDim}
          />
        </Pressable>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
        // Never squeezed by the grid below it — a half-height chip row reads
        // as broken rather than tight.
        style={styles.chipScroll}
      >
        {DATE_PRESETS.map((preset) => {
          const active = query.preset === preset.id;
          return (
            <Pressable
              key={preset.id}
              onPress={() => onQueryChange(withPreset(query, preset.id))}
              style={[
                styles.chip,
                {
                  backgroundColor: active ? hexToRgba(colors.accent, 0.18) : colors.surface,
                  borderColor: active ? colors.accent : colors.line,
                },
              ]}
            >
              <Text style={[styles.chipLabel, { color: active ? colors.accent : colors.stone }]}>
                {preset.label}
              </Text>
            </Pressable>
          );
        })}

        {query.preset === "custom" && (
          <View
            style={[
              styles.chip,
              { backgroundColor: hexToRgba(colors.accent, 0.18), borderColor: colors.accent },
            ]}
          >
            <Text style={[styles.chipLabel, { color: colors.accent }]}>Custom range</Text>
          </View>
        )}
      </ScrollView>

      {selectMode ? (
        <Text style={[styles.hint, { color: colors.stone }]}>
          Tap picture-notes to select up to 4 to compare side by side.
        </Text>
      ) : (
        filtering && (
          <View style={styles.summary}>
            <Text style={[styles.summaryLabel, { color: colors.stoneDim }]}>
              {resultCount} {resultCount === 1 ? "match" : "matches"}
            </Text>
            <Pressable
              onPress={() => onQueryChange(EMPTY_QUERY)}
              hitSlop={8}
            >
              <Text style={[styles.clearLabel, { color: colors.accent }]}>Clear</Text>
            </Pressable>
          </View>
        )
      )}
    </View>
  );
}
