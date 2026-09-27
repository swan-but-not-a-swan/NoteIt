import { useState } from "react";
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
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
import DateTimePicker, { DateTimePickerAndroid, type DateTimePickerChangeEvent } from "@react-native-community/datetimepicker";
import * as ImagePicker from "expo-image-picker";
import { useTheme } from "@/theme/ThemeContext";
import { hexToRgba, LIGHT_THEME, type ThemeColors } from "@/theme/colors";
import { glass } from "@/theme/glass";
import { exifCaptureDate, formatDayDate, toLocalISODate, todayISO } from "@/lib/date";
import { appendSnippet, saveNoteDraftAsync, saveTagsAsync } from "@/lib/noteHelper";
import { useLibrary } from "@/lib/LibraryContext";
import type { NoteMediaType, TagModel } from "@/models/NoteModel";
import DraftNoteCard from "@/components/DraftNoteCard";
import OverflowMenu from "@/components/OverflowMenu";
import TopBar, { TopBarActions, TopBarIconButton } from "@/components/TopBar";
import { useFieldFocus } from "@/theme/focus";
import { addNoteScreenStyles as styles } from "@/theme/styles/note.styles";

type Panel = "date" | "tags" | "folder";
type MediaSource = "camera" | "library";

/** The titles behind a saved note's tag ids, in the order it stored them. The
 *  editor works in titles, the note stores ids, and this is the seam. */
function tagTitlesOf(tagIds: string[], storedTags: TagModel[]): string[] {
  return tagIds
    .map((tagId) => storedTags.find((tag) => tag.id === tagId)?.title)
    .filter((title): title is string => title != null);
}

const sameTags = (a: string[], b: string[]) => a.length === b.length && a.every((tag, i) => tag === b[i]);

// Writing a picture-note, and reworking one: the same screen, because a note
// is the same thing before and after it is saved, and two screens drawing it
// meant two places to fix whenever it changed.
//
// `id` is what picks the mode. Without one this is a new note; with one, that
// note is loaded into the same fields and saving replaces it. The only thing
// editing can't do is swap the media — the picture is the note's identity, and
// replacing it means copying a new file, rebuilding the thumbnail and clearing
// up the old one, which is a job of its own.
//
// The state lives here rather than in a hook of its own. It was a hook while
// this was a modal that several screens opened; now that it is a route, the
// hook's `visible`/`open`/`cancel` were three ways of saying "navigate", and
// the wiring read as indirection with nothing on the other side of it.
export default function AddNoteScreen() {
  const { colors } = useTheme();
  const captionFocus = useFieldFocus(colors);
  const tagFocus = useFieldFocus(colors);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id, folderId: folderParam } = useLocalSearchParams<{ id?: string; folderId?: string }>();

  const { notes, folders, tags: storedTags, snippets, saveNoteAsync, refreshNotesAndTagsAsync } = useLibrary();

  //* the note being reworked, or null when this is a new one
  const editing = id != null ? notes.find((n) => n.id === id) ?? null : null;

  const [note, setNote] = useState("");
  const [mediaUri, setMediaUri] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<NoteMediaType | null>(null);
  const [mediaMimeType, setMediaMimeType] = useState<string | null>(null);
  const [date, setDate] = useState(todayISO());
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [folderId, setFolderId] = useState<string | null>(null);
  const [error, setError] = useState<string | undefined>(undefined);
  //* every await below is a chance for a second tap to start a duplicate write
  const [saving, setSaving] = useState(false);

  const [panel, setPanel] = useState<Panel | null>(null);
  const [noteOpen, setNoteOpen] = useState(true); //* the viewer's two modes, note = true, photo = false

  //* the folder pill reflects the folder this was opened from on the first
  //* render, rather than a frame later
  const [folderApplied, setFolderApplied] = useState(false);
  if (folderApplied === false) {
    setFolderApplied(true);
    //* only a new note takes its folder from the route — an existing one
    //* brings its own, filled in below
    if (id == null && folderParam != null) setFolderId(folderParam);
  }

  // The note arrives from the store a render or two after the route param
  // does, so this waits for it rather than reading once and finding nothing.
  // Adjusted during render, like the folder above: through an effect the
  // screen would paint one empty frame before filling in.
  const [prefilled, setPrefilled] = useState(false);
  if (prefilled === false && editing != null) {
    setPrefilled(true);
    setNote(editing.note);
    setMediaUri(editing.mediaUri);
    setMediaType(editing.mediaType);
    setMediaMimeType(null); //* already in app storage; nothing left to copy
    setDate(editing.date);
    setFolderId(editing.folderId);
    setTags(tagTitlesOf(editing.tagIds, storedTags));
  }

  const folder = folders.find((f) => f.id === folderId) ?? null;
  const canSave = mediaUri != null && !saving;

  //* what a cancel would throw away: everything for a new note, and whatever
  //* differs from what was stored for one being reworked
  const dirty =
    editing != null
      ? note !== editing.note ||
        date !== editing.date ||
        folderId !== editing.folderId ||
        !sameTags(tags, tagTitlesOf(editing.tagIds, storedTags))
      : mediaUri != null || note.trim().length > 0 || tags.length > 0;

  const commitTag = () => {
    const clean = tagInput.trim().replace(/^#/, "").toLowerCase();
    if (clean.length > 0) {
      setTags((current) => (current.some((t) => t.toLowerCase() === clean) ? current : [...current, clean]));
    }
    setTagInput("");
  };

  const removeTag = (tag: string) => {
    setTags((current) => current.filter((t) => t !== tag));
  };

  const toggleStoredTag = (tag: TagModel) => {
    const title = tag.title.toLowerCase();
    setTags((current) =>
      current.some((t) => t.toLowerCase() === title) //* adds or removes the tag from the note's list of tags
        ? current.filter((t) => t.toLowerCase() !== title)
        : [...current, tag.title],
    );
  };

  const insertSnippet = (text: string) => {
    setNote((current) => appendSnippet(current, text));
  };

  //* asks where the media comes from before opening anything: iOS's action
  //* sheet, and Android's dialog, since Android has no action sheet of its own
  const chooseMediaSource = () => {
    if (Platform.OS === "web") {
      setError("Photo/video preview isn't supported in the web preview — test this on a device or simulator.");
      return;
    }

    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ["Cancel", "Take Photo", "Choose from Library"], cancelButtonIndex: 0 },
        (buttonIndex) => {
          if (buttonIndex === 1) pickMediaAsync("camera");
          else if (buttonIndex === 2) pickMediaAsync("library");
        },
      );
      return;
    }

    Alert.alert(
      "Add photo or video",
      undefined,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Take photo", onPress: () => pickMediaAsync("camera") },
        { text: "Choose from library", onPress: () => pickMediaAsync("library") },
      ],
      { cancelable: true },
    );
  };

  const pickMediaAsync = async (source: MediaSource) => {
    const permission =
      source === "camera"
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError(
        source === "camera"
          ? "Allow camera access to take a photo."
          : "Allow photo library access to add a photo or video.",
      );
      return;
    }

    //* full screen, not iOS's default page sheet: a page-sheet picker opening
    //* over a presented screen can resolve as cancelled — or never resolve at
    //* all — so the pick is silently lost. Only shows on a device.
    const presentationStyle = ImagePicker.UIImagePickerPresentationStyle.FULL_SCREEN;
    //* the camera takes photos only: recording video would also need the
    //* microphone permission, which the app doesn't ask for. exif carries the
    //* day the photo was taken, which the date below is preselected from — it
    //* is read for images only, a video comes back without any of it
    const result =
      source === "camera"
        ? await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], presentationStyle, exif: true })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images", "videos"], presentationStyle, exif: true });
    if (result.canceled) return;

    const asset = result.assets[0];
    setMediaUri(asset.uri);
    //* checks whether the media is image or video
    setMediaType(asset.type === "video" || asset.mimeType?.startsWith("video/") === true ? "video" : "image");
    setMediaMimeType(asset.mimeType ?? null);
    setError(undefined);

    //* the photo's own day, offered as the default — the date stays a free
    //* choice and this only fills it in. Nothing is written when the file has
    //* no date to read, so a day already chosen is never overwritten by a
    //* guess. Videos carry no exif and keep whatever date is set.
    const captured = exifCaptureDate(asset.exif);
    if (captured != null) setDate(captured);
  };

  const onChangeDate = (_event: DateTimePickerChangeEvent, selectedDate: Date) => {
    setDate(toLocalISODate(selectedDate));
  };

  const pressDate = () => {
    if (Platform.OS === "web") {
      setError("Date picker isn't supported in the web preview — test this on a device or simulator.");
      return;
    }

    //* android has a native dialog, so we open it imperatively and don't render the component at all
    DateTimePickerAndroid.open({
      value: new Date(`${date}T00:00:00`),
      mode: "date",
      onValueChange: onChangeDate,
    });
  };

  const saveAsync = async () => {
    if (saving) return;
    if (mediaUri == null) {
      setError("Add a photo or video first.");
      return;
    }

    //* an untouched note would still cost a write, so treat saving one as the
    //* cancel it effectively is
    if (editing != null && !dirty) {
      router.back();
      return;
    }

    setSaving(true);
    if (editing != null) {
      //* the media stays as it is; only what is written about it changes.
      //* saveNoteAsync replaces by id, so this updates rather than adding
      const tagIds = await saveTagsAsync(tags, storedTags);
      await saveNoteAsync({ ...editing, note, date, tagIds, folderId });
    } else {
      const failure = await saveNoteDraftAsync(
        {
          mediaUri,
          mediaType: mediaType ?? "image",
          mimeType: mediaMimeType,
          text: note,
          date,
          tags,
          folderId,
        },
        storedTags,
      );
      if (failure != null) {
        setError(failure);
        setSaving(false);
        return;
      }
    }
    setSaving(false);

    await refreshNotesAndTagsAsync(); //* refreshes the store before navigating back
    router.back();
  };

  const confirmCancel = () => {
    //* nothing written, nothing to lose — don't make anyone dismiss a dialog
    //* they didn't earn
    if (!dirty) {
      router.back();
      return;
    }
    Alert.alert(
      editing != null ? "Discard changes?" : "Discard this note?",
      editing != null
        ? "Your changes to this note will not be saved."
        : "The media and the note will be discarded.",
      [
        { text: "Keep writing", style: "cancel" },
        { text: "Discard", style: "destructive", onPress: () => router.back() },
      ],
    );
  };

  const togglePanel = (next: Panel) => {
    if (next === "date" && Platform.OS === "android") //* Andrioid has native date picker so the pill opens it instead of a panel
    {
      setPanel(null);
      pressDate();
      return;
    }
    setPanel((current) => (current === next ? null : next)); //* iOS gets the inline calendar, where the note stays visible
  };

  const toggleNote = (next: boolean) => {
    if (next === false) Keyboard.dismiss(); //* dismiss the keyboard when switching to the photo view
    setNoteOpen(next);
  };

  const removeMedia = () => {
    setMediaUri(null);
    setMediaType(null);
    setMediaMimeType(null);
    //* the next picture lands on the note again, like the first one did
    setNoteOpen(true);
  };

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { backgroundColor: colors.bg }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <TopBar
        title={editing != null ? "Edit note" : "New note"}
        colors={colors}
        right={
          <TopBarActions>
            {mediaUri != null && (
              <>
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

                {/* the picture is fixed once a note exists, so the menu that
                    swaps it belongs only to a new one */}
                {editing == null && (
                  <OverflowMenu
                    colors={colors}
                    items={[
                      {
                        key: "change",
                        label: mediaType === "video" ? "Change video" : "Change photo",
                        icon: "image",
                        onPress: chooseMediaSource,
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
                )}
              </>
            )}
            <TopBarIconButton
              icon="x"
              accessibilityLabel="Close without saving"
              colors={colors}
              onPress={confirmCancel}
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
            onPress={chooseMediaSource}
            accessibilityRole="button"
            style={[styles.pickButton, glass(colors)]}
          >
            <Feather name="image" size={30} color={colors.accent} />
            <Text style={[styles.pickLabel, { color: colors.accent }]}>Add photo or video</Text>
            <Text style={[styles.pickHint, { color: colors.stoneDim }]}>A note needs a picture</Text>
          </Pressable>

          <Text style={[styles.dateLine, { color: colors.stoneDim }]}>{formatDayDate(date)}</Text>

          <View style={[styles.captionBox, { borderBottomColor: captionFocus.border }]}>
            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder="What's happening…"
              placeholderTextColor={captionFocus.placeholder}
              multiline
              textAlignVertical="top"
              accessibilityLabel="Note"
              style={[styles.caption, { color: colors.textPrimary }]}
              {...captionFocus.handlers}
            />
          </View>

          {snippets.length > 0 && (
            <View style={styles.snippets}>
              {snippets.map((snippet) => (
                <Pressable
                  key={snippet.id}
                  onPress={() => insertSnippet(snippet.text)}
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
                    onPress={() => removeTag(tag)}
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
          onNoteChange={setNote}
          snippets={snippets}
          onInsertSnippet={insertSnippet}
          tags={tags}
          onRemoveTag={removeTag}
          noteOpen={noteOpen}
          onToggleNote={toggleNote}
        />
      )}

      {panel === "date" && Platform.OS === "ios" && (
        <View style={[styles.panel, { backgroundColor: colors.surface, borderColor: colors.line }]}>
          <Text style={[styles.panelLabel, { color: colors.stoneDim }]}>The day it happened</Text>
          <View style={styles.dateRow}>
            <Feather name="calendar" size={15} color={colors.stone} />
            <CompactDatePicker date={date} colors={colors} onChange={setDate} />
          </View>
        </View>
      )}

      {panel === "tags" && (
        <View style={[styles.panel, { backgroundColor: colors.surface, borderColor: colors.line }]}>
          <Text style={[styles.panelLabel, { color: colors.stoneDim }]}>Tag it</Text>
          <View style={[styles.tagInputRow, glass(colors), { borderColor: tagFocus.border }]}>
            <Feather name="hash" size={13} color={tagFocus.focused ? colors.stone : colors.stoneDim} />
            <TextInput
              value={tagInput}
              onChangeText={setTagInput}
              onSubmitEditing={commitTag}
              placeholder="Add a tag, press enter"
              placeholderTextColor={tagFocus.placeholder}
              autoCapitalize="none"
              style={[styles.tagInput, { color: colors.textPrimary }]}
              onFocus={tagFocus.handlers.onFocus}
              //* composed by hand: this field already commits the tag on blur,
              //* and spreading the focus handlers over it would drop that
              onBlur={() => {
                tagFocus.handlers.onBlur();
                commitTag();
              }}
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
                    onPress={() => toggleStoredTag(tag)}
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
          <View style={styles.panelChips} accessibilityRole="radiogroup" accessibilityLabel="Folder">
            <Pressable
              onPress={() => setFolderId(null)}
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
                  onPress={() => setFolderId(f.id)}
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
          onPress={saveAsync}
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
            {saving ? "Saving…" : editing != null ? "Save changes" : "Save note"}
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

//* iOS only
function CompactDatePicker({ date, colors, onChange }: CompactDatePickerProps) {
  const [value, setValue] = useState(() => new Date(`${date}T00:00:00`));

  //* default date for the picker is the day the picture was taken
  const [shownDate, setShownDate] = useState(date);
  if (shownDate !== date) //* adjusts during render to match the external date prop
  {
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
