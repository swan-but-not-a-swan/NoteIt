import { useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { Feather } from "@react-native-vector-icons/feather/static";
import Animated, { SlideInUp } from "react-native-reanimated";
import DateTimePicker, { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import { hexToRgba, LIGHT_THEME, type ThemeColors } from "@/theme/colors";
import { formatDayDate, todayISO } from "@/lib/date";
import { EMPTY_QUERY, isEmptyQuery } from "@/lib/noteHelper";
import { withRange } from "@/lib/dateHelper";
import { TagModel } from "../models/NoteModel";
import type { FolderModel } from "@/models/FolderModel";
import { UNFILED, type NoteQuery } from "@/models/NoteQueryModel";
import { searchNotesModalStyles as styles } from "@/theme/styles/gallery.styles";

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
  /** Every folder — what the user can filter by in gallery mode. */
  folders?: FolderModel[];
  /** Gallery mode: shows the folder chips, and filters combine with OR.
   *  False inside a folder, where the folder is already the scope and the
   *  filters combine with AND. One switch, because the spec ties them. */
  showFolders?: boolean;
};

// The search sheet: free text, every available tag, an explicit from/to
// date range and, in gallery mode, folders. Ported from the web reference's
// SearchOverlay.
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
  folders = [],
  showFolders = false,
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

  const toggleFolder = (folderId: string) => {
    const next = query.folderIds.includes(folderId)
      ? query.folderIds.filter((id) => id !== folderId)
      : [...query.folderIds, folderId];
    onQueryChange({ ...query, folderIds: next });
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
          {/* The same controls mean different things in the two modes, so
              the sheet says which one is in force. */}
          <Text style={[styles.hint, { color: colors.stoneDim }]}>
            {showFolders ? "Showing notes that match any of these" : "Showing notes that match all of these"}
          </Text>

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

            {showFolders && (
              <>
                <Text style={[styles.label, { color: colors.stoneDim }]}>Folders</Text>
                <View style={styles.tagWrap}>
                  {folders.map((folder) => (
                    <FolderChip
                      key={folder.id}
                      label={folder.name}
                      icon="folder"
                      tint={folder.accent}
                      active={query.folderIds.includes(folder.id)}
                      colors={colors}
                      onPress={() => toggleFolder(folder.id)}
                    />
                  ))}
                  {/* notes saved as "No folder (Gallery only)" have no folder
                      id to pick, so they get a chip of their own */}
                  <FolderChip
                    label="No folder"
                    icon="inbox"
                    tint={colors.accent}
                    active={query.folderIds.includes(UNFILED)}
                    colors={colors}
                    onPress={() => toggleFolder(UNFILED)}
                  />
                </View>
              </>
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
              //* EMPTY_QUERY rather than a literal, so a field added to the
              //* query later is cleared here without anyone remembering to
              onPress={() => onQueryChange(EMPTY_QUERY)}
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

type FolderChipProps = {
  label: string;
  icon: "folder" | "inbox";
  /** The folder's own accent, so a chip reads as the folder it stands for
   *  and can't be mistaken for a (teal) tag. */
  tint: string;
  active: boolean;
  colors: ThemeColors;
  onPress: () => void;
};

function FolderChip({ label, icon, tint, active, colors, onPress }: FolderChipProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={`Folder ${label}`}
      style={[
        styles.tagChip,
        {
          backgroundColor: active ? hexToRgba(tint, 0.18) : colors.surface,
          borderColor: active ? tint : colors.line,
        },
      ]}
    >
      <Feather name={icon} size={12} color={active ? tint : colors.stone} />
      <Text
        style={[styles.tagLabel, styles.folderLabel, { color: active ? tint : colors.stone }]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
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
      //* onValueChange only fires when a date is picked (not on dismiss)
      onValueChange: (_event, selected) => onChange(isoOf(selected)),
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
              onValueChange={(_event, selected) => onChange(isoOf(selected))}
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
