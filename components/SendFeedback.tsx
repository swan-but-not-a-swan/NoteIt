import { Linking, Modal, Pressable, Text, View } from "react-native";
import { Feather } from "@react-native-vector-icons/feather/static";
import type { ThemeColors } from "@/theme/colors";
import { sendFeedbackStyles as styles } from "@/theme/styles/settings.styles";

/** Where feedback goes. Shown in the sheet as well as used for the mail link,
 *  so someone who has no mail app set up can still write it down. */
export const FEEDBACK_EMAIL = "Swansett@outlook.com";

type Props = {
  visible: boolean;
  colors: ThemeColors;
  onClose: () => void;
};

// A small sheet pointing at the developer's inbox. There is no in-app form
// behind it on purpose: a form needs a server, a spam story and a privacy
// disclosure, where a mail link needs none of those and reaches the same place.
export default function SendFeedback({ visible, colors, onClose }: Props) {
  const openMail = () => {
    //* the subject is prefilled so replies are sortable; whatever the person
    //* writes in the body is theirs
    Linking.openURL(`mailto:${FEEDBACK_EMAIL}?subject=NoteIt feedback`);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      {/* the backdrop dismisses, the card swallows the tap that lands on it */}
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          onPress={() => {}}
          style={[styles.card, { backgroundColor: colors.bg, borderColor: colors.line }]}
        >
          <View style={styles.titleRow}>
            <Feather name="bell" size={17} color={colors.accent} />
            <Text style={[styles.title, { color: colors.textPrimary }]}>Send feedback</Text>
          </View>

          <Text style={[styles.body, { color: colors.stone }]}>
            If you have any feedback regarding new features and bugs, email the developer directly.
          </Text>

          <View style={[styles.addressRow, { backgroundColor: colors.surface, borderColor: colors.line }]}>
            <Feather name="mail" size={14} color={colors.stoneDim} />
            <Text style={[styles.address, { color: colors.textPrimary }]} numberOfLines={1}>
              {FEEDBACK_EMAIL}
            </Text>
          </View>

          <View style={styles.buttons}>
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.button,
                { backgroundColor: colors.surface, opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Text style={[styles.buttonLabel, { color: colors.textPrimary }]}>Close</Text>
            </Pressable>
            <Pressable
              onPress={openMail}
              accessibilityRole="button"
              accessibilityLabel={`Email ${FEEDBACK_EMAIL}`}
              style={({ pressed }) => [
                styles.button,
                { backgroundColor: colors.accent, opacity: pressed ? 0.75 : 1 },
              ]}
            >
              <View style={styles.buttonRow}>
                <Feather name="mail" size={14} color={colors.onAccent} />
                <Text style={[styles.buttonLabel, { color: colors.onAccent }]}>Email</Text>
              </View>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
