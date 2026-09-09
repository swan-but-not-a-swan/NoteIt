import { useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Feather } from "@react-native-vector-icons/feather";
import Animated, { SlideInUp } from "react-native-reanimated";
import DateTimePicker, { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import { LIGHT_THEME, type ThemeColors } from "@/theme/colors";
import { fonts } from "@/theme/fonts";
import { hexToRgba } from "@/lib/color";
import { formatDayDate, todayISO } from "@/lib/date";
import { isEmptyQuery, withRange, type NoteQuery } from "@/lib/noteFilter";
import { TagModel } from "../models/NoteModel";

type Props = {
  visible: boolean;
  colors: ThemeColors;
  query: NoteQuery;
  onQueryChange: (query: NoteQuery) => void;
  /** Every tag in storage — what the user can filter by. */
  tags: TagModel[];
  /** How many notes the query currently matches, shown on the confirm button. */
  resultCount: number;
  onClose: () => void;
};

// The search sheet: free text, every available tag, and an explicit from/to
// date range. Ported from the web reference's SearchOverlay.
//
// A sheet rather than an always-visible field because the filters are a set,
// not a single control — picking three tags and a fortnight is one decision,
// and doing it inline would push the grid off the screen. The toolbar keeps
// only the preset pills, which are one tap each.
export default function SearchNotesModal({
  visible,
  colors,
  query,
  onQueryChange,
  tags,
  resultCount,
  onClose,
}: Props) {
  //* web has no native date control; say so once here rather than silently
  //* doing nothing when a date field is tapped
  const [dateHint, setDateHint] = useState<string | null>(null);

  const filtering = !isEmptyQuery(query);

  const toggleTag = (tagId: string) => {
    const next = query.tagIds.includes(tagId)
      ? query.tagIds.filter((id) => id !== tagId)
      : [...query.tagIds, tagId];
    onQueryChange({ ...query, tagIds: next });
  };

  const setFrom = (iso: string) => onQueryChange(withRange(query, iso, query.to));
  const setTo = (iso: string) => onQueryChange(withRange(query, query.from, iso));

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.root}>
        {/* Tapping away closes — the sheet hangs from the top, so the backdrop
            is everything below it rather than a ring around it. */}
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close search" />

        <Animated.View
          entering={SlideInUp.duration(260)}
          style={[styles.sheet, { backgroundColor: colors.bg, borderBottomColor: colors.line }]}
        >
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>Search picture-notes</Text>
            <Pressable
              onPress={onClose}
              hitSlop={8}
              accessibilityLabel="Close search"
              style={[styles.closeButton, { backgroundColor: colors.surface }]}
            >
              <Feather name="x" size={15} color={colors.textPrimary} />
            </Pressable>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={[styles.label, { color: colors.stoneDim }]}>Text</Text>
            <View style={[styles.field, { backgroundColor: colors.surface, borderColor: colors.line }]}>
              <Feather name="search" size={15} color={colors.stoneDim} />
              <TextInput
                value={query.text}
                onChangeText={(text) => onQueryChange({ ...query, text })}
                placeholder="Words in a note or tag"
                placeholderTextColor={colors.stoneDim}
                returnKeyType="search"
                autoCorrect={false}
                style={[styles.input, { color: colors.textPrimary }]}
              />
              {query.text.length > 0 && (
                <Pressable onPress={() => onQueryChange({ ...query, text: "" })} hitSlop={8}>
                  <Feather name="x" size={14} color={colors.stoneDim} />
                </Pressable>
              )}
            </View>

            <Text style={[styles.label, { color: colors.stoneDim }]}>Tags</Text>
            {tags.length > 0 ? (
              <View style={styles.tagWrap}>
                {tags.map((tag) => {
                  const active = query.tagIds.includes(tag.id);
                  return (
                    <Pressable
                      key={tag.id}
                      onPress={() => toggleTag(tag.id)}
                      style={[
                        styles.tagChip,
                        {
                          backgroundColor: active ? hexToRgba(colors.teal, 0.18) : colors.surface,
                          borderColor: active ? colors.teal : colors.line,
                        },
                      ]}
                    >
                      <Feather name="tag" size={12} color={active ? colors.teal : colors.stone} />
                      <Text style={[styles.tagLabel, { color: active ? colors.teal : colors.stone }]}>
                        #{tag.title}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : (
              <Text style={[styles.emptyNote, { color: colors.stoneDim }]}>No tags added yet.</Text>
            )}

            <Text style={[styles.label, { color: colors.stoneDim }]}>Date range</Text>
            <View style={styles.dateRow}>
              <DateField
                caption="From"
                value={query.from}
                colors={colors}
                onChange={setFrom}
                onUnsupported={setDateHint}
              />
              <DateField
                caption="To"
                value={query.to}
                colors={colors}
                onChange={setTo}
                onUnsupported={setDateHint}
              />
            </View>
            {dateHint != null && (
              <Text style={[styles.emptyNote, { color: colors.accent }]}>{dateHint}</Text>
            )}
          </ScrollView>

          <View style={styles.footer}>
            <Pressable
              onPress={() => onQueryChange({ text: "", tagIds: [], from: "", to: "", preset: "any" })}
              disabled={!filtering}
              hitSlop={8}
            >
              <Text style={[styles.clearLabel, { color: filtering ? colors.accent : colors.stoneDim }]}>
                Clear all
              </Text>
            </Pressable>
            <Pressable onPress={onClose} style={[styles.confirm, { backgroundColor: colors.accent }]}>
              <Text style={[styles.confirmLabel, { color: colors.onAccent }]}>
                Show {resultCount} {resultCount === 1 ? "result" : "results"}
              </Text>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

type DateFieldProps = {
  caption: string;
  /** ISO "yyyy-mm-dd", or "" for an open end of the range. */
  value: string;
  colors: ThemeColors;
  onChange: (iso: string) => void;
  onUnsupported: (message: string) => void;
};

// One end of the range. An unset bound has no date to show, which none of the
// native controls can represent — so "Any" is a plain button that seeds today,
// and only once a bound exists does the real picker appear. Clearing it back
// to Any is the small x beside it.
function DateField({ caption, value, colors, onChange, onUnsupported }: DateFieldProps) {
  const set = value.length > 0;

  const openAndroid = () => {
    if (Platform.OS === "web") {
      onUnsupported(
        "Date picker isn't supported in the web preview — test this on a device or simulator.",
      );
      return;
    }
    DateTimePickerAndroid.open({
      value: new Date(`${value}T00:00:00`),
      mode: "date",
      onChange: (event, selected) => {
        if (event.type === "set" && selected != null) onChange(isoOf(selected));
      },
    });
  };

  return (
    <View style={styles.dateCol}>
      <Text style={[styles.dateCaption, { color: colors.stone }]}>{caption}</Text>
      <View style={[styles.dateBox, { backgroundColor: colors.surface, borderColor: colors.line }]}>
        <Feather name="calendar" size={14} color={colors.stone} />

        {!set ? (
          <Pressable style={styles.dateFill} onPress={() => onChange(todayISO())}>
            <Text style={[styles.dateValue, { color: colors.stoneDim }]}>Any</Text>
          </Pressable>
        ) : Platform.OS === "ios" ? (
          <View style={styles.dateFill}>
            <DateTimePicker
              value={new Date(`${value}T00:00:00`)}
              mode="date"
              display="compact"
              //* derived, not hardcoded "dark" — the app pins DARK_THEME today,
              //* but themeFor() returns these module-level singletons, so an
              //* identity check keeps this correct once theming is wired
              themeVariant={colors === LIGHT_THEME ? "light" : "dark"}
              accentColor={colors.accent}
              onChange={(event, selected) => {
                if (event.type === "set" && selected != null) onChange(isoOf(selected));
              }}
            />
          </View>
        ) : (
          <Pressable style={styles.dateFill} onPress={openAndroid}>
            <Text style={[styles.dateValue, { color: colors.textPrimary }]} numberOfLines={1}>
              {formatDayDate(value)}
            </Text>
          </Pressable>
        )}

        {set && (
          <Pressable
            onPress={() => onChange("")}
            hitSlop={8}
            accessibilityLabel={`Clear ${caption} date`}
          >
            <Feather name="x" size={13} color={colors.stoneDim} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

/** Local-time ISO "yyyy-mm-dd". toISOString() would convert to UTC first,
 *  which shifts the calendar day either side of Greenwich. */
function isoOf(date: Date): string {
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  sheet: {
    //* hangs from the top edge, and is capped so a long tag list scrolls
    //* inside the sheet instead of pushing the footer off the screen
    maxHeight: "82%",
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
    borderBottomWidth: 1,
    paddingTop: 54,
    paddingHorizontal: 18,
    paddingBottom: 18,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  title: { fontFamily: fonts.frauncesSemiBold, fontSize: 18 },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: { flexGrow: 0 },
  scrollContent: { paddingBottom: 4 },
  label: {
    fontFamily: fonts.interBold,
    fontSize: 10.5,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  field: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
    marginBottom: 18,
  },
  input: {
    flex: 1,
    minWidth: 0,
    fontFamily: fonts.interRegular,
    fontSize: 14,
    //* RN gives TextInput a default vertical padding that shifts the caret off
    //* the row's centre; zeroing it lets the fixed height do the centring
    paddingVertical: 0,
  },
  tagWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 18,
  },
  tagChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  tagLabel: { fontFamily: fonts.interSemiBold, fontSize: 12.5 },
  emptyNote: {
    fontFamily: fonts.interRegular,
    fontSize: 12.5,
    marginBottom: 18,
  },
  dateRow: { flexDirection: "row", gap: 10 },
  dateCol: { flex: 1, minWidth: 0 },
  dateCaption: { fontFamily: fonts.interRegular, fontSize: 11.5, marginBottom: 5 },
  dateBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 42,
  },
  dateFill: { flex: 1, minWidth: 0, justifyContent: "center" },
  dateValue: { fontFamily: fonts.interRegular, fontSize: 13 },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 18,
  },
  clearLabel: { fontFamily: fonts.interSemiBold, fontSize: 12.5 },
  confirm: {
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  confirmLabel: { fontFamily: fonts.interBold, fontSize: 13.5 },
});
