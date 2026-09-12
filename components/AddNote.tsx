import { useEffect, useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Feather } from "@react-native-vector-icons/feather/static";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useVideoPlayer, VideoView } from "expo-video";
import DateTimePicker from "@react-native-community/datetimepicker";
import { LIGHT_THEME, type ThemeColors } from "@/theme/colors";
import { fonts } from "@/theme/fonts";
import { hexToRgba } from "@/lib/color";
import { formatDayDate } from "@/lib/date";
import { FolderModel } from "../models/FolderModel";
import { NoteMediaType, TagModel } from "../models/NoteModel";
import { SnippetModel } from "../models/SnippetModel";

type Props = {
  visible: boolean;
  colors: ThemeColors;

  /** The freshly-picked photo/video. Its presence — not a separate boolean —
   *  is what switches the media slot from the picker button to the preview,
   *  same convention as NewFolder's thumbnail. */
  mediaUri?: string | null;
  mediaType?: NoteMediaType | null;
  onPickMedia: () => void;
  onRemoveMedia: () => void;

  note: string;
  onNoteChange: (text: string) => void;

  /** Saved reusable phrases from Settings. Omit or pass an empty array to
   *  hide the row entirely. */
  snippets?: SnippetModel[];
  /** Receives the snippet's `text`, not its name — the name is only a label
   *  for the chip, what goes into the note is the body. */
  onInsertSnippet?: (text: string) => void;

  /** ISO "yyyy-mm-dd". */
  date: string;
  /** Called when the date row is tapped — Android and web only. Android is
   *  expected to fire the imperative DateTimePickerAndroid.open() (a true
   *  native dialog, not a rendered component); web has no picker at all.
   *  iOS never calls this: UIDatePicker's compact mode owns both its
   *  trigger and its popover, so there's nothing here to open. */
  onPressDate: () => void;
  onDateChange: (date: string) => void;

  tags: string[];
  tagInput: string;
  onTagInputChange: (text: string) => void;
  onCommitTag: () => void;
  onRemoveTag: (tag: string) => void;

  /** Previously-used tags to quick-pick from — same idea as the folder pills
   *  below. Omit or pass an empty array to hide the row entirely. */
  storedTags?: TagModel[];
  /** Adds the tag if it's not already on this note, removes it if it is. */
  onToggleStoredTag?: (tag: TagModel) => void;

  folders: FolderModel[];
  /** null = "No folder (Gallery only)". */
  folderId: string | null;
  onFolderChange: (folderId: string | null) => void;

  error?: string;
  onCancel: () => void;
  onSave: () => void;
};

// Deliberately its own modal, not folded into NewFolder — a picture-note
// carries a lot more (media, note text, date, tags, folder) than a folder
// ever will, and NewFolder was already crowded on its own.
export default function AddNote({
  visible,
  colors,
  mediaUri,
  mediaType,
  onPickMedia,
  onRemoveMedia,
  note,
  onNoteChange,
  snippets,
  onInsertSnippet,
  date,
  onPressDate,
  onDateChange,
  tags,
  tagInput,
  onTagInputChange,
  onCommitTag,
  onRemoveTag,
  storedTags,
  onToggleStoredTag,
  folders,
  folderId,
  onFolderChange,
  error,
  onCancel,
  onSave,
}: Props) {
  const insets = useSafeAreaInsets();
  // Hooks can't be called conditionally, so this always runs — passing null
  // just gives an idle player when there's no video (or the media is a
  // photo), which VideoSource explicitly supports.
  const videoPlayer = useVideoPlayer(mediaType === "video" ? mediaUri ?? null : null);

  // The bottom safe-area inset is only needed to clear the home indicator
  // when the keyboard is closed — once the keyboard is up it already covers
  // that area, so keeping `insets.bottom` in the padding on top of it just
  // leaves a block of empty sheet background sitting above the keyboard.
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const showSub = Keyboard.addListener(showEvent, () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardVisible(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* The backdrop is a *sibling* of the sheet, not its parent. Wrapping
            a ScrollView in a Pressable makes the two fight over the touch:
            Pressable claims the responder on touch-start, and the ScrollView
            has to steal it back once the finger moves, which eats the first
            few pixels of every drag and reads as scrolling that catches
            before it goes. A plain View has no such claim. SearchNotesModal
            already lays out this way. */}
        <View style={styles.root}>
          <Pressable
            style={styles.backdrop}
            onPress={onCancel}
            accessibilityLabel="Close without saving"
          />

          <View
            style={[
              styles.sheet,
              {
                backgroundColor: colors.bg,
                borderColor: colors.line,
                paddingBottom: keyboardVisible ? 20 : insets.bottom + 20,
              },
            ]}
          >
            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              //* dragging the sheet is the natural way to put the keyboard
              //* away once the note field has been typed into
              keyboardDismissMode="on-drag"
            >
              <View style={styles.header}>
                <Text style={[styles.title, { color: colors.textPrimary }]}>New picture-note</Text>
                <Pressable
                  onPress={onCancel}
                  hitSlop={8}
                  style={[styles.closeButton, { backgroundColor: colors.surface }]}
                >
                  <Feather name="x" size={15} color={colors.textPrimary} />
                </Pressable>
              </View>

              {mediaUri == null ? (
                <Pressable
                  onPress={onPickMedia}
                  style={[styles.pickButton, { backgroundColor: colors.surface, borderColor: colors.line }]}
                >
                  <Feather name="image" size={22} color={colors.accent} />
                  <Text style={[styles.pickButtonLabel, { color: colors.textPrimary }]}>
                    Add photo or video
                  </Text>
                </Pressable>
              ) : (
                <View style={styles.mediaWrap}>
                  <View style={styles.mediaPreview}>
                    {mediaType === "video" ? (
                      <VideoView
                        style={styles.mediaImage}
                        player={videoPlayer}
                        nativeControls
                        contentFit="cover"
                      />
                    ) : (
                      <Image source={{ uri: mediaUri }} style={styles.mediaImage} />
                    )}
                  </View>
                  <Pressable
                    onPress={onRemoveMedia}
                    hitSlop={6}
                    style={styles.removeMediaButton}
                  >
                    <Feather name="x" size={15} color="#fff" />
                  </Pressable>
                </View>
              )}

              <Text style={[styles.label, { color: colors.stoneDim }]}>Note</Text>
              <TextInput
                value={note}
                onChangeText={onNoteChange}
                placeholder="What's happening in this one?"
                placeholderTextColor={colors.stoneDim}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                style={[
                  styles.noteInput,
                  { backgroundColor: colors.surface, borderColor: colors.line, color: colors.textPrimary },
                ]}
              />

              {snippets != null && snippets.length > 0 && (
                <View style={styles.snippets}>
                  {snippets.map((s) => (
                    <Pressable
                      key={s.id}
                      onPress={() => onInsertSnippet?.(s.text)}
                      //* the body can run to a paragraph, so the chip shows
                      //* the name — that is what naming them is for
                      accessibilityRole="button"
                      accessibilityLabel={`Insert snippet ${s.name}`}
                      style={[styles.snippetChip, { backgroundColor: colors.surface, borderColor: colors.line }]}
                    >
                      <Feather name="star" size={11} color={colors.accent} />
                      <Text style={[styles.snippetLabel, { color: colors.stone }]} numberOfLines={1}>
                        {s.name}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}

              <Text style={[styles.label, { color: colors.stoneDim }]}>Day and date</Text>
              {Platform.OS === "ios" ? (
                // `visible &&` is the mount boundary: the sheet closing and
                // reopening for a different note has to re-read `date`, and
                // CompactDatePicker only does that on mount.
                visible && (
                  <View
                    style={[styles.dateRow, { backgroundColor: colors.surface, borderColor: colors.line }]}
                  >
                    <Feather name="calendar" size={15} color={colors.stone} />
                    <CompactDatePicker date={date} colors={colors} onChange={onDateChange} />
                  </View>
                )
              ) : (
                // Android fires a real native dialog imperatively from
                // onPressDate, and web has no picker at all, so both keep a
                // plain trigger row showing the current selection.
                <Pressable
                  onPress={onPressDate}
                  style={[styles.dateRow, { backgroundColor: colors.surface, borderColor: colors.line }]}
                >
                  <Feather name="calendar" size={15} color={colors.stone} />
                  <Text style={[styles.dateLabel, { color: colors.textPrimary }]}>
                    {formatDayDate(date) || "Pick a date"}
                  </Text>
                </Pressable>
              )}

              <Text style={[styles.label, { color: colors.stoneDim }]}>Tags</Text>
              <View style={[styles.tagsBox, { backgroundColor: colors.surface, borderColor: colors.line }]}>
                {tags.map((t) => (
                  <View
                    key={t}
                    style={[styles.tagPill, { backgroundColor: hexToRgba(colors.teal, 0.16) }]}
                  >
                    <Text style={[styles.tagLabel, { color: colors.teal }]}>#{t}</Text>
                    <Pressable onPress={() => onRemoveTag(t)} hitSlop={6}>
                      <Feather name="x" size={11} color={colors.teal} />
                    </Pressable>
                  </View>
                ))}
                <TextInput
                  value={tagInput}
                  onChangeText={onTagInputChange}
                  onSubmitEditing={onCommitTag}
                  onBlur={onCommitTag}
                  placeholder={tags.length === 0 ? "Add a tag, press enter" : ""}
                  placeholderTextColor={colors.stoneDim}
                  style={[styles.tagInput, { color: colors.textPrimary }]}
                />
              </View>

              {storedTags != null && storedTags.length > 0 && (
                <View style={styles.storedTagPills}>
                  {storedTags.map((tag) => {
                    const selected = tags.includes(tag.title);
                    return (
                      <Pressable
                        key={tag.id}
                        onPress={() => onToggleStoredTag?.(tag)}
                        style={[
                          styles.storedTagPill,
                          {
                            borderColor: selected ? colors.teal : colors.line,
                            backgroundColor: selected ? hexToRgba(colors.teal, 0.16) : colors.surface,
                          },
                        ]}
                      >
                        <Text style={{ color: selected ? colors.teal : colors.stone, fontFamily: fonts.interSemiBold, fontSize: 12.5 }}>
                          #{tag.title}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}

              <Text style={[styles.label, { color: colors.stoneDim }]}>Folder</Text>
              <View style={styles.folderPills}>
                <Pressable
                  onPress={() => onFolderChange(null)}
                  style={[
                    styles.folderPill,
                    folderId === null
                      ? { borderColor: colors.accent, backgroundColor: hexToRgba(colors.accent, 0.12) }
                      : { borderColor: colors.line, borderStyle: "dashed", backgroundColor: colors.surface },
                  ]}
                >
                  <Text style={{ color: folderId === null ? colors.accent : colors.stone, fontFamily: fonts.interSemiBold, fontSize: 12.5 }}>
                    No folder (Gallery only)
                  </Text>
                </Pressable>
                {folders.map((folder) => {
                  const selected = folderId === folder.id;
                  return (
                    <Pressable
                      key={folder.id}
                      onPress={() => onFolderChange(folder.id)}
                      style={[
                        styles.folderPill,
                        {
                          borderColor: selected ? colors.accent : colors.line,
                          backgroundColor: selected ? hexToRgba(colors.accent, 0.12) : colors.surface,
                        },
                      ]}
                    >
                      <Text style={{ color: selected ? colors.accent : colors.stone, fontFamily: fonts.interSemiBold, fontSize: 12.5 }}>
                        {folder.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {error != null && <Text style={[styles.error, { color: colors.error }]}>{error}</Text>}

              <Pressable onPress={onSave} style={[styles.saveButton, { backgroundColor: colors.accent }]}>
                <Feather name="check" size={16} color={colors.onAccent} />
                <Text style={[styles.saveButtonLabel, { color: colors.onAccent }]}>Save picture-note</Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

type CompactDatePickerProps = {
  /** ISO "yyyy-mm-dd". Read once, at mount — see below. */
  date: string;
  colors: ThemeColors;
  onChange: (date: string) => void;
};

// iOS only. UIDatePicker's "compact" mode is a self-contained control: it
// draws the current date as a tappable field and presents the system
// calendar popover itself. That's what removed the open/close state, the
// trigger Pressable, the wrapper and its close button — all of it was
// reimplementing behaviour the native control already has.
function CompactDatePicker({ date, colors, onChange }: CompactDatePickerProps) {
  // `value` is local rather than driven straight off the `date` prop. Every
  // selection pushes up through onChange, which re-renders the parent with a
  // new `date` — feeding that back in would hand the control a fresh setDate
  // while its popover is mid-animation, which is what used to make the
  // selection feel like it "sticks". The parent only mounts this while the
  // sheet is open, so a new session re-reads `date` via the initializer
  // below instead of needing an effect to re-sync it.
  const [value, setValue] = useState(() => new Date(`${date}T00:00:00`));

  return (
    <DateTimePicker
      value={value}
      mode="date"
      display="compact"
      // Derived rather than hardcoded "dark": the app pins DARK_THEME
      // everywhere today, but the moment themeFor() gets wired to real theme
      // state this picker would otherwise stay dark on a light screen.
      // themeFor() returns these module-level singletons, so an identity
      // check is enough.
      themeVariant={colors === LIGHT_THEME ? "light" : "dark"}
      accentColor={colors.accent}
      onChange={(event, selectedDate) => {
        if (event.type === "set" && selectedDate != null) {
          setValue(selectedDate);
          onChange(selectedDate.toISOString().slice(0, 10));
        }
      }}
    />
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  root: {
    flex: 1,
    justifyContent: "flex-end",
  },
  //* absolute rather than flex:1 so it sits *behind* the sheet instead of
  //* containing it — that is what keeps it off the ScrollView's ancestor chain
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  sheet: {
    maxHeight: "88%",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingHorizontal: 20,
    paddingTop: 18,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  title: {
    fontFamily: fonts.frauncesSemiBold,
    fontSize: 19,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  pickButton: {
    width: "100%",
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderRadius: 14,
    paddingVertical: 20,
    alignItems: "center",
    gap: 8,
    marginBottom: 18,
  },
  pickButtonLabel: {
    fontFamily: fonts.interSemiBold,
    fontSize: 12.5,
  },
  mediaWrap: {
    marginBottom: 18,
  },
  mediaPreview: {
    width: "100%",
    height: 200,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "#000",
  },
  mediaImage: {
    width: "100%",
    height: "100%",
  },
  removeMediaButton: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontFamily: fonts.interSemiBold,
    fontSize: 11.5,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  noteInput: {
    marginTop: 8,
    marginBottom: 18,
    minHeight: 76,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: fonts.interRegular,
    fontSize: 14,
  },
  snippets: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: -10,
    marginBottom: 18,
  },
  snippetChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 5,
    paddingHorizontal: 11,
    maxWidth: 220,
  },
  snippetLabel: {
    fontFamily: fonts.interSemiBold,
    fontSize: 12,
    flexShrink: 1,
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 8,
    marginBottom: 18,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  dateLabel: {
    fontFamily: fonts.interRegular,
    fontSize: 14,
  },
  tagsBox: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
    marginBottom: 18,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  tagPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 999,
    paddingVertical: 5,
    paddingLeft: 10,
    paddingRight: 6,
  },
  tagLabel: {
    fontFamily: fonts.interSemiBold,
    fontSize: 12.5,
  },
  tagInput: {
    flex: 1,
    minWidth: 90,
    fontFamily: fonts.interRegular,
    fontSize: 13,
    paddingVertical: 5,
    paddingHorizontal: 4,
  },
  storedTagPills: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: -10,
    marginBottom: 18,
  },
  storedTagPill: {
    borderWidth: 1.5,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  folderPills: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
    marginBottom: 20,
  },
  folderPill: {
    borderWidth: 1.5,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  error: {
    fontFamily: fonts.interRegular,
    fontSize: 12.5,
    marginBottom: 14,
  },
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 12,
    paddingVertical: 13,
  },
  saveButtonLabel: {
    fontFamily: fonts.interSemiBold,
    fontSize: 14,
    fontWeight: "700",
  },
});
