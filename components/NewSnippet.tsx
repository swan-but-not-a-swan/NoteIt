import {
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Feather } from "@react-native-vector-icons/feather/static";
import type { ThemeColors } from "@/theme/colors";
import { fonts } from "@/theme/fonts";
import { hexToRgba } from "@/lib/color";

type Props = {
  visible: boolean;
  /** "create" writes a new snippet's body; "edit" reworks an existing one. */
  mode?: "create" | "edit";
  name: string;
  /** Pass to make the name editable — that is what edit mode wants. Omit and
   *  the name renders as a read-only pill, which is right on the way in: it
   *  was just typed into the field behind this modal. */
  onNameChange?: (name: string) => void;
  text: string;
  onTextChange: (text: string) => void;
  /** Omit to hide the delete action entirely (i.e. while creating). */
  onDelete?: () => void;
  error?: string;
  colors: ThemeColors;
  onCancel: () => void;
  onSave: () => void;
};

// Collects a snippet's body, once the name has been given in Settings.
//
// A modal rather than a second inline field because the body is multi-line and
// can be formatted — it needs room the settings list doesn't have, and putting
// a growing text box in that row would push the list around as you type.
//
// Presentational only — same shape as NewFolder: owns no state, takes the text
// and the error as props, hands back onCancel/onSave.
export default function NewSnippet({
  visible,
  mode = "create",
  name,
  onNameChange,
  text,
  onTextChange,
  onDelete,
  error,
  colors,
  onCancel,
  onSave,
}: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      {/* The body field is multi-line, so Return inserts a newline instead of
          committing — which leaves an iOS keyboard covering the bottom of a
          vertically-centred card, Cancel and Save included. This lifts the
          card clear of it. Android resizes the window itself
          (windowSoftInputMode=adjustResize, Expo's default), and passing a
          behavior there fights that. */}
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* Backdrop dismisses the modal. The inner Pressable swallows taps so
            pressing the card doesn't close it — and, since a multi-line field
            has no return key to close the keyboard with, tapping the card
            around the field is what puts the keyboard away. */}
        <Pressable style={styles.backdrop} onPress={onCancel}>
          <Pressable
            onPress={() => Keyboard.dismiss()}
            accessibilityLabel="Dismiss the keyboard"
            style={[styles.card, { backgroundColor: colors.bg, borderColor: colors.line }]}
          >
          <View style={styles.titleRow}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              {mode === "edit" ? "Edit snippet" : "Write the snippet"}
            </Text>
            {onDelete != null && (
              <Pressable
                onPress={onDelete}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Delete snippet"
                style={({ pressed }) => [
                  styles.deleteButton,
                  { backgroundColor: hexToRgba(colors.error, 0.15), opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <Feather name="trash-2" size={16} color={colors.error} />
              </Pressable>
            )}
          </View>

          {onNameChange != null ? (
            <>
              <Text style={[styles.label, { color: colors.stoneDim }]}>Name</Text>
              <TextInput
                value={name}
                onChangeText={onNameChange}
                placeholder="Snippet name"
                placeholderTextColor={colors.stoneDim}
                style={[
                  styles.nameInput,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.line,
                    color: colors.textPrimary,
                  },
                ]}
              />
            </>
          ) : (
            // On the way in the name is context, not a field — it says which
            // snippet you are writing without re-asking for what was just typed.
            <View style={[styles.namePill, { backgroundColor: colors.surface, borderColor: colors.line }]}>
              <Feather name="star" size={13} color={colors.accent} />
              <Text style={[styles.nameLabel, { color: colors.textPrimary }]} numberOfLines={1}>
                {name}
              </Text>
            </View>
          )}

          <Text style={[styles.label, { color: colors.stoneDim }]}>Snippet</Text>
          <TextInput
            value={text}
            onChangeText={onTextChange}
            multiline
            //* the modal exists to collect this, so it should be ready to type
            //* into the moment it appears
            autoFocus
            placeholder="What do you want to be able to drop into a note?"
            placeholderTextColor={colors.stoneDim}
            style={[
              styles.input,
              {
                backgroundColor: colors.surface,
                borderColor: colors.line,
                color: colors.textPrimary,
              },
            ]}
          />
          {/* Worth saying out loud: nothing else in the app advertises that
              the note text takes markdown, and a snippet is the one place you
              write formatting once and reuse it. */}
          <Text style={[styles.hint, { color: colors.stoneDim }]}>
            **bold** and *italic* work here.
          </Text>

          {error != null && <Text style={[styles.error, { color: colors.error }]}>{error}</Text>}

          <View style={styles.buttons}>
            <Pressable
              onPress={onCancel}
              style={({ pressed }) => [
                styles.button,
                { backgroundColor: colors.surface, opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Text style={[styles.buttonLabel, { color: colors.textPrimary }]}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={onSave}
              style={({ pressed }) => [
                styles.button,
                { backgroundColor: colors.accent, opacity: pressed ? 0.75 : 1 },
              ]}
            >
              <Text style={[styles.buttonLabel, { color: colors.onAccent }]}>
                {mode === "edit" ? "Save changes" : "Save snippet"}
              </Text>
            </Pressable>
          </View>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  title: {
    fontFamily: fonts.frauncesSemiBold,
    fontSize: 18,
    flexShrink: 1,
  },
  deleteButton: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  nameInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 11,
    paddingHorizontal: 14,
    fontFamily: fonts.interRegular,
    fontSize: 14,
    marginBottom: 18,
  },
  namePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "flex-start",
    maxWidth: "100%",
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginBottom: 18,
  },
  nameLabel: {
    fontFamily: fonts.interSemiBold,
    fontSize: 13,
    flexShrink: 1,
  },
  label: {
    fontFamily: fonts.interSemiBold,
    fontSize: 11.5,
    letterSpacing: 0.4,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 11,
    paddingHorizontal: 14,
    fontFamily: fonts.interRegular,
    fontSize: 14,
    lineHeight: 20,
    minHeight: 108,
    //* Android centres multiline text vertically by default, which strands a
    //* one-line snippet in the middle of the box
    textAlignVertical: "top",
  },
  hint: {
    fontFamily: fonts.interRegular,
    fontSize: 11.5,
    marginTop: 7,
    marginBottom: 18,
  },
  error: {
    fontFamily: fonts.interRegular,
    fontSize: 12.5,
    //* pulls up against the hint's margin so the message sits with the field
    //* it belongs to rather than floating between the two
    marginTop: -8,
    marginBottom: 14,
  },
  buttons: {
    flexDirection: "row",
    gap: 10,
  },
  button: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: "center",
  },
  buttonLabel: {
    fontFamily: fonts.interSemiBold,
    fontSize: 13.5,
  },
});
