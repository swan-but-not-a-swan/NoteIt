//! Manually reviewed since 15/09/2026

import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
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
import { hexToRgba } from "@/lib/color";
import { formatDayDate, toLocalISODate } from "@/lib/date";
import { FolderModel } from "../models/FolderModel";
import { NoteMediaType, TagModel } from "../models/NoteModel";
import { SnippetModel } from "../models/SnippetModel";
import { addNoteStyles as styles } from "@/theme/styles/note.styles";

type Props = {
  visible: boolean;
  colors: ThemeColors;
  mediaUri?: string | null;
  mediaType?: NoteMediaType | null;
  onPickMedia: () => void;
  onRemoveMedia: () => void;
  note: string;
  onNoteChange: (text: string) => void;
  snippets?: SnippetModel[];
  onInsertSnippet?: (text: string) => void;
  date: string;
  onPressDate: () => void;
  onDateChange: (date: string) => void;
  tags: string[];
  tagInput: string;
  onTagInputChange: (text: string) => void;
  onCommitTag: () => void;
  onRemoveTag: (tag: string) => void;
  storedTags?: TagModel[];
  onToggleStoredTag?: (tag: TagModel) => void;
  folders: FolderModel[];
  folderId: string | null;
  onFolderChange: (folderId: string | null) => void;
  error?: string;
  onCancel: () => void;
  onSave: () => void;
  saving?: boolean;
};

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
  saving = false,
}: Props) {
  const insets = useSafeAreaInsets();
  const videoPlayer = useVideoPlayer(mediaType === "video" ? mediaUri ?? null : null);

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

  useEffect(() => {
    if (!visible) videoPlayer.pause();
  }, [visible, videoPlayer]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.root}>
          <Pressable
            style={styles.backdrop}
            onPress={onCancel}
            accessibilityRole="button"
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
              keyboardDismissMode="on-drag"
            >
              <View style={styles.header}>
                <Text style={[styles.title, { color: colors.textPrimary }]}>New picture-note</Text>
                <Pressable
                  onPress={onCancel}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="Close without saving"
                  style={[styles.closeButton, { backgroundColor: colors.surface }]}
                >
                  <Feather name="x" size={15} color={colors.textPrimary} />
                </Pressable>
              </View>

              {mediaUri == null ? (
                <Pressable
                  onPress={onPickMedia}
                  accessibilityRole="button"
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
                    accessibilityRole="button"
                    accessibilityLabel={mediaType === "video" ? "Remove video" : "Remove photo"}
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
                visible && (
                  <View
                    style={[styles.dateRow, { backgroundColor: colors.surface, borderColor: colors.line }]}
                  >
                    <Feather name="calendar" size={15} color={colors.stone} />
                    <CompactDatePicker date={date} colors={colors} onChange={onDateChange} />
                  </View>
                )
              ) : (
                <Pressable
                  onPress={onPressDate}
                  accessibilityRole="button"
                  accessibilityHint="Opens the date picker"
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
                    <Pressable
                      onPress={() => onRemoveTag(t)}
                      hitSlop={6}
                      accessibilityRole="button"
                      accessibilityLabel={`Remove tag ${t}`}
                    >
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
                    const title = tag.title.toLowerCase();
                    const selected = tags.some((t) => t.toLowerCase() === title);
                    return (
                      <Pressable
                        key={tag.id}
                        onPress={() => onToggleStoredTag?.(tag)}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: selected }}
                        accessibilityLabel={`Tag ${tag.title}`}
                        style={[
                          styles.storedTagPill,
                          {
                            borderColor: selected ? colors.teal : colors.line,
                            backgroundColor: selected ? hexToRgba(colors.teal, 0.16) : colors.surface,
                          },
                        ]}
                      >
                        <Text style={[styles.pillLabel, { color: selected ? colors.teal : colors.stone }]}>
                          #{tag.title}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}

              <Text style={[styles.label, { color: colors.stoneDim }]}>Folder</Text>
              {/* exactly one folder (or none) at a time, so the pills are a radio group */}
              <View style={styles.folderPills} accessibilityRole="radiogroup" accessibilityLabel="Folder">
                <Pressable
                  onPress={() => onFolderChange(null)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: folderId === null }}
                  style={[
                    styles.folderPill,
                    folderId === null
                      ? { borderColor: colors.accent, backgroundColor: hexToRgba(colors.accent, 0.12) }
                      : { borderColor: colors.line, borderStyle: "dashed", backgroundColor: colors.surface },
                  ]}
                >
                  <Text style={[styles.pillLabel, { color: folderId === null ? colors.accent : colors.stone }]}>
                    No folder (Gallery only)
                  </Text>
                </Pressable>
                {folders.map((folder) => {
                  const selected = folderId === folder.id;
                  return (
                    <Pressable
                      key={folder.id}
                      onPress={() => onFolderChange(folder.id)}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: selected }}
                      style={[
                        styles.folderPill,
                        {
                          borderColor: selected ? colors.accent : colors.line,
                          backgroundColor: selected ? hexToRgba(colors.accent, 0.12) : colors.surface,
                        },
                      ]}
                    >
                      <Text style={[styles.pillLabel, { color: selected ? colors.accent : colors.stone }]}>
                        {folder.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {error != null && <Text style={[styles.error, { color: colors.error }]}>{error}</Text>}

              <Pressable
                onPress={onSave}
                disabled={saving}
                accessibilityRole="button"
                accessibilityState={{ disabled: saving, busy: saving }}
                style={[styles.saveButton, { backgroundColor: colors.accent }, saving && styles.saveButtonBusy]}
              >
                {saving ? (
                  <ActivityIndicator size="small" color={colors.onAccent} />
                ) : (
                  <Feather name="check" size={16} color={colors.onAccent} />
                )}
                <Text style={[styles.saveButtonLabel, { color: colors.onAccent }]}>
                  {saving ? "Saving…" : "Save picture-note"}
                </Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
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
