import { Modal, Pressable, Text, View } from "react-native";
import type { ThemeColors } from "@/theme/colors";
import { exportProgressStyles as styles } from "@/theme/styles/transfer.styles";

type Props = {
  /** Files written so far out of the total, or null when nothing is exporting. */
  progress: { done: number; total: number } | null;
  colors: ThemeColors;
  onCancel: () => void;
};

// Shown while a .noteit file is being written. A folder of videos can take a
// few seconds, and the share sheet only appears once the file is whole, so
// this says the tap was heard and lets it be called off. Presentational only:
// useExportTransfer owns the work.
export default function ExportProgress({ progress, colors, onCancel }: Props) {
  const fraction = progress != null && progress.total > 0 ? progress.done / progress.total : 0;

  return (
    <Modal visible={progress != null} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: colors.bg, borderColor: colors.line }]}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Preparing export…</Text>

          <View style={[styles.track, { backgroundColor: colors.surfaceHi }]}>
            <View style={[styles.fill, { width: `${Math.round(fraction * 100)}%`, backgroundColor: colors.accent }]} />
          </View>
          <Text style={[styles.detail, { color: colors.stone }]}>
            {progress != null && progress.total > 0
              ? `Packing ${progress.done} of ${progress.total} files`
              : "Getting the files ready"}
          </Text>

          <Pressable
            onPress={onCancel}
            accessibilityRole="button"
            style={({ pressed }) => [styles.button, { backgroundColor: colors.surface, opacity: pressed ? 0.7 : 1 }]}
          >
            <Text style={[styles.buttonLabel, { color: colors.textPrimary }]}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
