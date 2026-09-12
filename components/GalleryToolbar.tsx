import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Feather } from "@react-native-vector-icons/feather/static";
import type { ThemeColors } from "@/theme/colors";
import { fonts } from "@/theme/fonts";
import { hexToRgba } from "@/lib/color";
import {
  DATE_PRESETS,
  describeQuery,
  isEmptyQuery,
  withPreset,
  type NoteQuery,
} from "@/lib/noteFilter";
import { TagModel } from "../models/NoteModel";

type Props = {
  colors: ThemeColors;
  query: NoteQuery;
  onQueryChange: (query: NoteQuery) => void;
  /** Every tag in storage — needed only to name the ones in the summary line. */
  tags: TagModel[];
  /** How many notes the current query matches, shown once a filter is active. */
  resultCount: number;
  onOpenSearch: () => void;
  /** Selecting notes to compare, rather than opening them. */
  compareMode: boolean;
  onToggleCompare: () => void;
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
  resultCount,
  onOpenSearch,
  compareMode,
  onToggleCompare,
}: Props) {
  const filtering = !isEmptyQuery(query);
  const summary = describeQuery(query, tags);

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

        <Pressable
          onPress={onToggleCompare}
          hitSlop={6}
          accessibilityLabel={compareMode ? "Leave compare mode" : "Compare picture-notes"}
          style={[
            styles.compareButton,
            {
              backgroundColor: compareMode ? hexToRgba(colors.accent, 0.12) : colors.surface,
              borderColor: compareMode ? colors.accent : colors.line,
            },
          ]}
        >
          <Feather name="columns" size={16} color={compareMode ? colors.accent : colors.stoneDim} />
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

      {compareMode ? (
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
              onPress={() =>
                onQueryChange({ text: "", tagIds: [], from: "", to: "", preset: "any" })
              }
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

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 18,
    paddingTop: 6,
    // Separates the chip row from the first row of tiles. Without it the grid
    // starts immediately under the pills and the two read as one overlapping
    // block — the chips have no background of their own to sit the grid off.
    paddingBottom: 12,
    gap: 10,
    // The grid scrolls; this does not. Yoga defaults a flex child to
    // flexShrink: 0, but the horizontal ScrollView inside still reports a
    // content-driven height, so pin the whole strip rather than trusting that.
    flexGrow: 0,
    flexShrink: 0,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  searchButton: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
  },
  searchLabel: {
    flex: 1,
    minWidth: 0,
    fontFamily: fonts.interSemiBold,
    fontSize: 13.5,
  },
  compareButton: {
    width: 42,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  chipScroll: {
    flexGrow: 0,
    flexShrink: 0,
  },
  chips: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingRight: 18,
  },
  chip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  chipLabel: {
    fontFamily: fonts.interSemiBold,
    fontSize: 12,
  },
  hint: {
    fontFamily: fonts.interRegular,
    fontSize: 12.5,
  },
  summary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  summaryLabel: {
    fontFamily: fonts.interRegular,
    fontSize: 12,
  },
  clearLabel: {
    fontFamily: fonts.interSemiBold,
    fontSize: 12,
  },
});
