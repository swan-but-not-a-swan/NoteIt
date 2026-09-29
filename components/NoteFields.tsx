import type { ReactNode, Ref } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { Feather, type FeatherIconName } from "@react-native-vector-icons/feather/static";
import { hexToRgba, type ThemeColors } from "@/theme/colors";
import PressableScale from "./PressableScale";
import { noteFieldsStyles as styles } from "@/theme/styles/note.styles";

type Props = {
  colors: ThemeColors;

  tags: string[];
  onRemoveTag: (tag: string) => void;
  tagInput: string;
  onTagInputChange: (text: string) => void;
  /** Return in the field: adds what's typed as a tag. */
  onSubmitTag: () => void;
  onTagsFocus: () => void;
  onTagsBlur: () => void;
  tagsFocused: boolean;
  tagInputRef?: Ref<TextInput>;
  /** The saved-tag chips (a SuggestionRow), drawn under the field while it
   *  has focus. */
  tagSuggestions?: ReactNode;
  /** The Tags field and its chips as one block, so the screen can line the
   *  block up with the keyboard's top edge. */
  tagsBlockRef?: Ref<View>;
  onTagsBlockLayout?: () => void;

  folderName: string | null;
  folderAccent: string | null;
  folderOpen: boolean;
  onPressFolder: () => void;

  dateLabel: string;
  dateOpen: boolean;
  onPressDate: () => void;
};

// The three things said about a note besides the note itself, each in a field
// of its own under it. Tags is typed into, with the tags already added sitting
// in the field as teal pills, and the saved tags to pick from appear under it
// while it has focus; Folder and Date open a picker in the keyboard's place.
export default function NoteFields({
  colors,
  tags,
  onRemoveTag,
  tagInput,
  onTagInputChange,
  onSubmitTag,
  onTagsFocus,
  onTagsBlur,
  tagsFocused,
  tagInputRef,
  tagSuggestions,
  tagsBlockRef,
  onTagsBlockLayout,
  folderName,
  folderAccent,
  folderOpen,
  onPressFolder,
  dateLabel,
  dateOpen,
  onPressDate,
}: Props) {
  return (
    <View style={styles.fields}>
      <Field label="Tags" colors={colors}>
        <View ref={tagsBlockRef} onLayout={onTagsBlockLayout} style={styles.fieldBlock}>
          <View style={[styles.box, boxColors(colors, tagsFocused, colors.teal)]}>
            <Feather name="hash" size={15} color={tagsFocused ? colors.teal : colors.stone} />
            <View style={styles.tagFlow}>
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
              <TextInput
                ref={tagInputRef}
                value={tagInput}
                onChangeText={onTagInputChange}
                onSubmitEditing={onSubmitTag}
                //* Return adds the tag and keeps the keyboard up for the next one
                submitBehavior="submit"
                returnKeyType="done"
                //* a backspace into an empty field takes the last tag back off,
                //* the way a recipient field does
                onKeyPress={(e) => {
                  if (e.nativeEvent.key === "Backspace" && tagInput.length === 0 && tags.length > 0) {
                    onRemoveTag(tags[tags.length - 1]);
                  }
                }}
                placeholder={tags.length === 0 ? "Add tags" : ""}
                placeholderTextColor={colors.stoneDim}
                autoCapitalize="none"
                autoCorrect={false}
                accessibilityLabel="Add a tag"
                onFocus={onTagsFocus}
                onBlur={onTagsBlur}
                style={[styles.tagInput, { color: colors.textPrimary }]}
              />
            </View>
          </View>
          {tagsFocused && tagSuggestions}
        </View>
      </Field>

      <Field label="Folder" colors={colors}>
        <PickerField
          colors={colors}
          icon="folder"
          open={folderOpen}
          onPress={onPressFolder}
          accessibilityLabel={`Folder: ${folderName ?? "no folder"}. Change`}
        >
          {folderAccent != null && <View style={[styles.swatch, { backgroundColor: folderAccent }]} />}
          <Text style={[styles.value, { color: folderName != null ? colors.textPrimary : colors.stoneDim }]} numberOfLines={1}>
            {folderName ?? "No folder"}
          </Text>
        </PickerField>
      </Field>

      <Field label="Date" colors={colors}>
        <PickerField
          colors={colors}
          icon="calendar"
          open={dateOpen}
          onPress={onPressDate}
          accessibilityLabel={`Date: ${dateLabel}. Change`}
        >
          <Text style={[styles.value, { color: colors.textPrimary }]} numberOfLines={1}>
            {dateLabel}
          </Text>
        </PickerField>
      </Field>
    </View>
  );
}

/** A field's border and fill: its own colour while it has the input, a
 *  hairline otherwise. */
function boxColors(colors: ThemeColors, active: boolean, tint: string) {
  return {
    backgroundColor: colors.surface,
    borderColor: active ? tint : colors.line,
  };
}

function Field({ label, colors, children }: { label: string; colors: ThemeColors; children: ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: colors.stoneDim }]}>{label}</Text>
      {children}
    </View>
  );
}

type PickerFieldProps = {
  colors: ThemeColors;
  icon: FeatherIconName;
  open: boolean;
  onPress: () => void;
  accessibilityLabel: string;
  children: ReactNode;
};

//* a field that opens a picker rather than taking typing
function PickerField({ colors, icon, open, onPress, accessibilityLabel, children }: PickerFieldProps) {
  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ expanded: open }}
      accessibilityLabel={accessibilityLabel}
      style={[styles.box, boxColors(colors, open, colors.accent)]}
    >
      <Feather name={icon} size={15} color={open ? colors.accent : colors.stone} />
      {children}
      <Feather name={open ? "chevron-up" : "chevron-down"} size={15} color={colors.stoneDim} />
    </PressableScale>
  );
}
