import { useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { Feather } from "@react-native-vector-icons/feather/static";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useTheme } from "@/theme/ThemeContext";
import { hexToRgba, LIGHT_THEME, type ThemeColors } from "@/theme/colors";
import { glass } from "@/theme/glass";
import { formatDayDate, toLocalISODate } from "@/lib/date";
import { useAddNote } from "@/lib/useAddNote";
import { useLibrary } from "@/lib/LibraryContext";
import DraftNoteCard from "@/components/DraftNoteCard";
import OverflowMenu from "@/components/OverflowMenu";
import TopBar, { TopBarActions, TopBarIconButton } from "@/components/TopBar";
import { addNoteScreenStyles as styles } from "@/theme/styles/note.styles";

// Composing a new picture-note. This was a <Modal> mounted on every screen
// that could start a note; it is a route now, so there is exactly one of it,
// the back gesture works, and the media picker no longer has to present from
// inside a modal of ours.
//
// Before there is a picture, the picture's space is the screen: a large drop
// zone, the date, and the note on a ruled line. Once there is one, the draft is
// laid out the way the viewer will show it (DraftNoteCard) — the photo as the
// viewer's centred tile, the date and note under it, and a pull down to open
// the photo back out. Day, tags and folder are folded into three pills at the
// foot that open a panel only when you ask for them.
type Panel = "date" | "tags" | "folder";

export default function AddNoteScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { folderId: folderParam } = useLocalSearchParams<{ folderId?: string }>();

  const { folders, tags: storedTags, snippets, refreshNotesAndTagsAsync } = useLibrary();

  const addNote = useAddNote({
    storedTags,
    snippets,
    //* the note is written through noteHelper rather than the store, so the
    //* store is told to re-read before this screen goes away
    onSaved: async () => {
      await refreshNotesAndTagsAsync();
      router.back();
    },
  });

  const {
    mediaUri,
    mediaType,
    onPickMedia,
    onRemoveMedia,
    note,
    onNoteChange,
    onInsertSnippet,
    date,
    onPressDate,
    onDateChange,
    tags,
    tagInput,
    onTagInputChange,
    onCommitTag,
    onRemoveTag,
    onToggleStoredTag,
    folderId,
    onFolderChange,
    error,
    onSave,
    saving,
  } = addNote.props;

  //* the hook's own open() resets every field, which a freshly mounted screen
  //* has already done for it — the folder is the only thing it can't know.
  //* Applied during render so the folder pill is right on the first frame.
  const [folderApplied, setFolderApplied] = useState(false);
  if (!folderApplied) {
    setFolderApplied(true);
    if (folderParam != null) onFolderChange(folderParam);
  }

  const [panel, setPanel] = useState<Panel | null>(null);
  //* the viewer's two modes, starting on the note since that's what you're here
  //* to write; the header toggle and the pull both flip it
  const [noteOpen, setNoteOpen] = useState(true);

  const folder = folders.find((f) => f.id === folderId) ?? null;
  const canSave = mediaUri != null && !saving;

  const togglePanel = (next: Panel) => {
    //* Android has a native date dialog, so that pill opens it instead of a
    //* panel; iOS gets the calendar inline, where the note stays visible
    if (next === "date" && Platform.OS === "android") {
      setPanel(null);
      onPressDate();
      return;
    }
    setPanel((current) => (current === next ? null : next));
  };

  const toggleNote = (next: boolean) => {
    //* the field goes away with the note, and the keyboard would otherwise sit
    //* over the photo you just asked to see
    if (!next) Keyboard.dismiss();
    setNoteOpen(next);
  };

  const removeMedia = () => {
    onRemoveMedia();
    //* the next picture lands on the note again, like the first one did
    setNoteOpen(true);
  };

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { backgroundColor: colors.bg }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* the viewer's own bar, so the photo below starts on the same line */}
      <TopBar
        title="New note"
        colors={colors}
        right={
          <TopBarActions>
            {mediaUri != null && (
              <>
                {/* the viewer's toggle: lit while the note is showing */}
                <Pressable
                  onPress={() => toggleNote(!noteOpen)}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityState={{ selected: noteOpen }}
                  accessibilityLabel={noteOpen ? "Show the photo" : "Show the note"}
                  style={[
                    styles.headerButton,
                    glass(colors, noteOpen ? { tint: colors.accent, strength: "fill" } : undefined),
                  ]}
                >
                  <Feather name="file-text" size={16} color={noteOpen ? colors.onAccent : colors.textPrimary} />
                </Pressable>

                <OverflowMenu
                  colors={colors}
                  items={[
                    {
                      key: "change",
                      label: mediaType === "video" ? "Change video" : "Change photo",
                      icon: "image",
                      onPress: onPickMedia,
                    },
                    {
                      key: "remove",
                      label: mediaType === "video" ? "Remove video" : "Remove photo",
                      icon: "trash-2",
                      onPress: removeMedia,
                      destructive: true,
                    },
                  ]}
                />
              </>
            )}
            <TopBarIconButton
              icon="x"
              accessibilityLabel="Close without saving"
              colors={colors}
              onPress={() => router.back()}
            />
          </TopBarActions>
        }
      />

      {mediaUri == null ? (
        <ScrollView
          contentContainerStyle={styles.body}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <Pressable
            onPress={onPickMedia}
            accessibilityRole="button"
            style={[styles.pickButton, glass(colors)]}
          >
            <Feather name="image" size={30} color={colors.accent} />
            <Text style={[styles.pickLabel, { color: colors.accent }]}>Add photo or video</Text>
            <Text style={[styles.pickHint, { color: colors.stoneDim }]}>A note needs a picture</Text>
          </Pressable>

          {/* the viewer's date line, above the note, as it is once there's a photo */}
          <Text style={[styles.dateLine, { color: colors.stoneDim }]}>{formatDayDate(date)}</Text>

          <View style={[styles.captionBox, { borderBottomColor: colors.line }]}>
            <TextInput
              value={note}
              onChangeText={onNoteChange}
              placeholder="What's happening…"
              placeholderTextColor={colors.stoneDim}
              multiline
              textAlignVertical="top"
              accessibilityLabel="Note"
              style={[styles.caption, { color: colors.textPrimary }]}
            />
          </View>

          {snippets.length > 0 && (
            <View style={styles.snippets}>
              {snippets.map((snippet) => (
                <Pressable
                  key={snippet.id}
                  onPress={() => onInsertSnippet(snippet.text)}
                  accessibilityRole="button"
                  accessibilityLabel={`Insert snippet ${snippet.name}`}
                  style={[styles.snippetChip, glass(colors)]}
                >
                  <Feather name="star" size={11} color={colors.accent} />
                  <Text style={[styles.snippetLabel, { color: colors.stone }]} numberOfLines={1}>
                    {snippet.name}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}

          {tags.length > 0 && (
            <View style={styles.tagRow}>
              {tags.map((tag) => (
                <View key={tag} style={[styles.tagPill, { backgroundColor: hexToRgba(colors.teal, 0.16) }]}>
                  <Text style={[styles.tagLabel, { color: colors.teal }]}>#{tag}</Text>
                  <Pressable
                    onPress={() => onRemoveTag(tag)}
                    hitSlop={6}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove tag ${tag}`}
                  >
                    <Feather name="x" size={11} color={colors.teal} />
                  </Pressable>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      ) : (
        <DraftNoteCard
          colors={colors}
          mediaUri={mediaUri}
          mediaType={mediaType}
          date={date}
          note={note}
          onNoteChange={onNoteChange}
          snippets={snippets}
          onInsertSnippet={onInsertSnippet}
          tags={tags}
          onRemoveTag={onRemoveTag}
          noteOpen={noteOpen}
          onToggleNote={toggleNote}
        />
      )}

      {panel === "date" && Platform.OS === "ios" && (
        <View style={[styles.panel, { backgroundColor: colors.surface, borderColor: colors.line }]}>
          <Text style={[styles.panelLabel, { color: colors.stoneDim }]}>The day it happened</Text>
          <View style={styles.dateRow}>
            <Feather name="calendar" size={15} color={colors.stone} />
            <CompactDatePicker date={date} colors={colors} onChange={onDateChange} />
          </View>
        </View>
      )}

      {panel === "tags" && (
        <View style={[styles.panel, { backgroundColor: colors.surface, borderColor: colors.line }]}>
          <Text style={[styles.panelLabel, { color: colors.stoneDim }]}>Tag it</Text>
          <View style={[styles.tagInputRow, glass(colors)]}>
            <Feather name="hash" size={13} color={colors.stoneDim} />
            <TextInput
              value={tagInput}
              onChangeText={onTagInputChange}
              onSubmitEditing={onCommitTag}
              onBlur={onCommitTag}
              placeholder="Add a tag, press enter"
              placeholderTextColor={colors.stoneDim}
              autoCapitalize="none"
              style={[styles.tagInput, { color: colors.textPrimary }]}
            />
          </View>
          {storedTags.length > 0 && (
            <View style={styles.panelChips}>
              {storedTags.map((tag) => {
                const title = tag.title.toLowerCase();
                const selected = tags.some((t) => t.toLowerCase() === title);
                return (
                  <Pressable
                    key={tag.id}
                    onPress={() => onToggleStoredTag(tag)}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: selected }}
                    accessibilityLabel={`Tag ${tag.title}`}
                    style={[
                      styles.panelChip,
                      glass(colors, selected ? { tint: colors.teal } : undefined),
                    ]}
                  >
                    <Text style={[styles.panelChipLabel, { color: selected ? colors.teal : colors.stone }]}>
                      #{tag.title}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>
      )}

      {panel === "folder" && (
        <View style={[styles.panel, { backgroundColor: colors.surface, borderColor: colors.line }]}>
          <Text style={[styles.panelLabel, { color: colors.stoneDim }]}>Put it in</Text>
          {/* exactly one folder (or none) at a time, so the chips are a radio group */}
          <View style={styles.panelChips} accessibilityRole="radiogroup" accessibilityLabel="Folder">
            <Pressable
              onPress={() => onFolderChange(null)}
              accessibilityRole="radio"
              accessibilityState={{ checked: folderId === null }}
              style={[
                styles.panelChip,
                glass(colors, folderId === null ? { tint: colors.accent } : undefined),
                folderId !== null && { borderStyle: "dashed" },
              ]}
            >
              <Text style={[styles.panelChipLabel, { color: folderId === null ? colors.accent : colors.stone }]}>
                No folder
              </Text>
            </Pressable>
            {folders.map((f) => {
              const selected = folderId === f.id;
              return (
                <Pressable
                  key={f.id}
                  onPress={() => onFolderChange(f.id)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                  style={[
                    styles.panelChip,
                    glass(colors, selected ? { tint: colors.accent } : undefined),
                  ]}
                >
                  <Text style={[styles.panelChipLabel, { color: selected ? colors.accent : colors.stone }]}>
                    {f.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}

      <View style={styles.footPills}>
        <FootPill
          icon="calendar"
          label="Day & date"
          active={panel === "date"}
          tint={colors.accent}
          colors={colors}
          onPress={() => togglePanel("date")}
        />
        <FootPill
          icon="tag"
          label={tags.length === 0 ? "Tags" : `${tags.length} tag${tags.length === 1 ? "" : "s"}`}
          active={panel === "tags" || tags.length > 0}
          tint={colors.teal}
          colors={colors}
          onPress={() => togglePanel("tags")}
        />
        <FootPill
          icon="folder"
          label={folder?.name ?? "Folder"}
          active={panel === "folder" || folder != null}
          tint={colors.accent}
          colors={colors}
          onPress={() => togglePanel("folder")}
        />
      </View>

      {error != null && <Text style={[styles.error, { color: colors.error }]}>{error}</Text>}

      <View style={[styles.footer, { paddingBottom: insets.bottom + 18 }]}>
        <Pressable
          onPress={onSave}
          disabled={!canSave}
          accessibilityRole="button"
          accessibilityState={{ disabled: !canSave, busy: saving }}
          accessibilityHint={mediaUri == null ? "Add a photo or video first" : undefined}
          style={[
            styles.saveButton,
            glass(colors, mediaUri == null ? undefined : { tint: colors.accent, strength: "fill" }),
            saving && { opacity: 0.7 },
          ]}
        >
          {saving ? (
            <ActivityIndicator size="small" color={colors.onAccent} />
          ) : (
            <Feather name="check" size={17} color={mediaUri == null ? colors.stoneDim : colors.onAccent} />
          )}
          <Text
            style={[styles.saveLabel, { color: mediaUri == null ? colors.stoneDim : colors.onAccent }]}
          >
            {saving ? "Saving…" : "Save note"}
          </Text>
        </Pressable>
        <Text style={[styles.footnote, { color: colors.stoneDim }]}>
          Saving takes you back to your notes. Ads keep NoteIt free.
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

type FootPillProps = {
  icon: "calendar" | "tag" | "folder";
  label: string;
  active: boolean;
  tint: string;
  colors: ThemeColors;
  onPress: () => void;
};

//* the three pills at the foot. Each carries its current value as its label —
//* "2 tags", "Trips" — so the panels stay closed most of the time
function FootPill({ icon, label, active, tint, colors, onPress }: FootPillProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ expanded: active }}
      style={[
        styles.footPill,
        glass(colors, active ? { tint } : undefined),
      ]}
    >
      <Feather name={icon} size={14} color={active ? tint : colors.stone} />
      <Text style={[styles.footPillLabel, { color: active ? tint : colors.stone }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

type CompactDatePickerProps = {
  date: string;
  colors: ThemeColors;
  onChange: (date: string) => void;
};

//* iOS only. UIDatePicker's "compact" mode is a self-contained control: it
//* draws the current date as a tappable field and presents the system
//* calendar popover itself.
function CompactDatePicker({ date, colors, onChange }: CompactDatePickerProps) {
  const [value, setValue] = useState(() => new Date(`${date}T00:00:00`));

  //* the date can arrive from outside — picking a photo fills in the day it
  //* was taken — and this control keeps its own copy, so it would otherwise
  //* go on showing the one it mounted with while the note saved another.
  //* Adjusted during render rather than in an effect, so the field never lags
  //* a frame behind the photo it belongs to.
  const [shownDate, setShownDate] = useState(date);
  if (shownDate !== date) {
    setShownDate(date);
    setValue(new Date(`${date}T00:00:00`));
  }

  return (
    <DateTimePicker
      value={value}
      mode="date"
      display="compact"
      themeVariant={colors === LIGHT_THEME ? "light" : "dark"}
      accentColor={colors.accent}
      onValueChange={(_event, selectedDate) => {
        setValue(selectedDate);
        onChange(toLocalISODate(selectedDate));
      }}
    />
  );
}
