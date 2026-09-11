import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@react-native-vector-icons/feather";
import type { ThemeColors } from "@/theme/colors";
import { fonts } from "@/theme/fonts";
import { hexToRgba } from "@/lib/color";
import { formatDayDate } from "@/lib/date";
import type { ExportPayload } from "@/models/ExportModel";

type Props = {
  visible: boolean;
  /** Null while the picked file is still being read. */
  payload: ExportPayload | null;
  /** Set once reading or importing failed; shown instead of the summary. */
  error?: string;
  /** True while the import is actually writing. */
  busy: boolean;
  colors: ThemeColors;
  onCancel: () => void;
  onConfirm: () => void;
};

// Confirms what a picked .noteit file will add before any of it is written.
//
// Import is the one action here that drops a pile of data into the app in one
// go, and undoing it means deleting each note by hand — so it gets a step that
// says exactly what is about to happen. Presentational only: the screen owns
// the file, the reading and the writing.
export default function ImportSummary({
  visible,
  payload,
  error,
  busy,
  colors,
  onCancel,
  onConfirm,
}: Props) {
  const noteCount = payload?.notes.length ?? 0;
  const folderName = payload?.folder?.name;

  //* the file says what it is; a folder export with no notes is still a
  //* folder worth creating, so the two counts are reported separately
  const summary =
    noteCount === 1 ? "1 picture-note" : `${noteCount} picture-notes`;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.backdrop} onPress={busy ? undefined : onCancel}>
        <Pressable
          onPress={() => {}}
          style={[styles.card, { backgroundColor: colors.bg, borderColor: colors.line }]}
        >
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {error != null ? "Couldn't read that file" : "Import"}
          </Text>

          {error != null ? (
            <View style={[styles.errorRow, { backgroundColor: hexToRgba(colors.error, 0.12) }]}>
              <Feather name="alert-triangle" size={16} color={colors.error} />
              <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
            </View>
          ) : payload == null ? (
            // Reading the manifest touches the filesystem, so this is a real
            // wait on a large file rather than a flash of nothing.
            <View style={styles.loadingRow}>
              <ActivityIndicator color={colors.accent} />
              <Text style={[styles.loadingText, { color: colors.stone }]}>Reading the file…</Text>
            </View>
          ) : (
            <>
              <View style={[styles.summaryRow, { backgroundColor: colors.surface, borderColor: colors.line }]}>
                <View style={[styles.iconTile, { backgroundColor: hexToRgba(colors.accent, 0.14) }]}>
                  <Feather
                    name={payload.kind === "folder" ? "folder" : "image"}
                    size={18}
                    color={colors.accent}
                  />
                </View>
                <View style={styles.summaryBody}>
                  <Text style={[styles.summaryTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                    {folderName ?? summary}
                  </Text>
                  <Text style={[styles.summaryMeta, { color: colors.stone }]} numberOfLines={1}>
                    {folderName != null ? `${summary} · ` : ""}
                    exported {formatDayDate(payload.exportedAt.slice(0, 10))}
                  </Text>
                </View>
              </View>

              {/* Says plainly that this adds rather than replaces — the note
                  ids are minted fresh on import, so re-importing the same file
                  gives you a second copy instead of overwriting the first. */}
              <Text style={[styles.note, { color: colors.stoneDim }]}>
                {payload.kind === "folder"
                  ? "A new folder is created. Nothing already in the app is changed or replaced."
                  : "Added to your gallery. Nothing already in the app is changed or replaced."}
              </Text>
            </>
          )}

          <View style={styles.buttons}>
            <Pressable
              onPress={onCancel}
              disabled={busy}
              style={({ pressed }) => [
                styles.button,
                { backgroundColor: colors.surface, opacity: busy ? 0.5 : pressed ? 0.7 : 1 },
              ]}
            >
              <Text style={[styles.buttonLabel, { color: colors.textPrimary }]}>
                {error != null ? "Close" : "Cancel"}
              </Text>
            </Pressable>

            {error == null && (
              <Pressable
                onPress={onConfirm}
                //* nothing to confirm until the manifest has been read, and a
                //* second tap mid-write would import the same file twice
                disabled={payload == null || busy}
                style={({ pressed }) => [
                  styles.button,
                  {
                    backgroundColor: colors.accent,
                    opacity: payload == null || busy ? 0.5 : pressed ? 0.75 : 1,
                  },
                ]}
              >
                {busy ? (
                  <ActivityIndicator color={colors.onAccent} />
                ) : (
                  <Text style={[styles.buttonLabel, { color: colors.onAccent }]}>Import</Text>
                )}
              </Pressable>
            )}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
  title: {
    fontFamily: fonts.frauncesSemiBold,
    fontSize: 18,
    marginBottom: 16,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 14,
    marginBottom: 18,
  },
  loadingText: {
    fontFamily: fonts.interRegular,
    fontSize: 13,
  },
  errorRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    borderRadius: 12,
    padding: 12,
    marginBottom: 18,
  },
  errorText: {
    flex: 1,
    fontFamily: fonts.interRegular,
    fontSize: 12.5,
    lineHeight: 18,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
  },
  iconTile: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryBody: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  summaryTitle: {
    fontFamily: fonts.interSemiBold,
    fontSize: 14,
  },
  summaryMeta: {
    fontFamily: fonts.interRegular,
    fontSize: 12,
  },
  note: {
    fontFamily: fonts.interRegular,
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 18,
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
    justifyContent: "center",
    minHeight: 42,
  },
  buttonLabel: {
    fontFamily: fonts.interSemiBold,
    fontSize: 13.5,
  },
});
