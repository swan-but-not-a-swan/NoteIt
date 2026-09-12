import { Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Image } from "expo-image";
import { Feather } from "@react-native-vector-icons/feather/static";
import type { ThemeColors } from "@/theme/colors";
import { fonts } from "@/theme/fonts";
import { hexToRgba } from "@/lib/color";
import { CropperContent } from "./ThumbnailCropper";

type Props = {
  visible: boolean;
  mode: "create" | "edit";
  name: string;
  onNameChange: (name: string) => void;
  color: string;
  onColorChange: (color: string) => void;
  swatches: string[];
  /** Custom cover photo URI (already persisted — see the folder-thumbnails
   *  storage pattern), or null/undefined to fall back to the folder icon. */
  thumbnailUri?: string | null;
  /** Launch the image picker; this component doesn't touch
   *  expo-image-picker itself, only what happens after a photo comes back. */
  onPickThumbnail: () => void;
  /** Omit to hide the "Remove photo" action entirely (e.g. while nothing's picked). */
  onRemoveThumbnail?: () => void;
  cropSourceUri?: string | null;
  onCropCancel: () => void;
  onCropConfirm: (croppedUri: string) => void;
  onDelete?: () => void;
  error?: string;
  colors: ThemeColors;
  onCancel: () => void;
  onSave: () => void;
};


export default function NewFolder({
  visible,
  mode,
  name,
  onNameChange,
  color,
  onColorChange,
  swatches,
  thumbnailUri,
  onPickThumbnail,
  onRemoveThumbnail,
  cropSourceUri,
  onCropCancel,
  onCropConfirm,
  onDelete,
  error,
  colors,
  onCancel,
  onSave,
}: Props) {
  if (cropSourceUri != null) {
    return (
      <Modal visible={visible} transparent animationType="fade" onRequestClose={onCropCancel}>
        <CropperContent
          key={cropSourceUri}
          sourceUri={cropSourceUri}
          colors={colors}
          onCancel={onCropCancel}
          onConfirm={onCropConfirm}
        />
      </Modal>
    );
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.backdrop} onPress={onCancel}>
        <Pressable
          onPress={() => {}}
          style={[styles.card, { backgroundColor: colors.bg, borderColor: colors.line }]}
        >
          <View style={styles.titleRow}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              {mode === "edit" ? "Edit folder" : "New folder"}
            </Text>
            {mode === "edit" && onDelete != null && (
              <Pressable
                onPress={onDelete}
                hitSlop={8}
                style={[styles.deleteButton, { backgroundColor: hexToRgba(colors.error, 0.15) }]}
              >
                <Feather name="trash-2" size={16} color={colors.error} />
              </Pressable>
            )}
          </View>

          <View
            style={[
              styles.nameRow,
              { marginBottom: thumbnailUri != null && onRemoveThumbnail != null ? 6 : 18 },
            ]}
          >
            <Pressable
              onPress={onPickThumbnail}
              style={[styles.preview, { backgroundColor: thumbnailUri != null ? colors.surfaceHi : color }]}
            >
              {thumbnailUri != null ? (
                <Image source={{ uri: thumbnailUri }} style={styles.previewImage} />
              ) : (
                <Feather name="folder" size={20} color="rgba(255,255,255,0.85)" />
              )}
              <View
                style={[
                  styles.previewBadge,
                  { backgroundColor: colors.accent, borderColor: colors.bg },
                ]}
              >
                <Feather name="camera" size={11} color={colors.onAccent} />
              </View>
            </Pressable>
            <TextInput
              value={name}
              onChangeText={onNameChange}
              placeholder="Folder name"
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
          </View>

          {thumbnailUri != null && onRemoveThumbnail != null && (
            <Pressable onPress={onRemoveThumbnail} style={styles.removeThumbnail} hitSlop={6}>
              <Feather name="x" size={11} color={colors.stoneDim} />
              <Text style={[styles.removeThumbnailLabel, { color: colors.stoneDim }]}>
                Remove photo
              </Text>
            </Pressable>
          )}

          <Text style={[styles.label, { color: colors.stoneDim }]}>Colour</Text>
          <View style={styles.swatches}>
            {swatches.map((sw) => {
              const selected = sw === color;
              return (
                <Pressable
                  key={sw}
                  onPress={() => onColorChange(sw)}
                  style={[
                    styles.swatch,
                    {
                      backgroundColor: sw,
                      borderColor: selected ? colors.textPrimary : "transparent",
                    },
                  ]}
                />
              );
            })}
          </View>

          {error != null && <Text style={[styles.error, { color: colors.error }]}>{error}</Text>}

          <View style={styles.buttons}>
            <Pressable
              onPress={onCancel}
              style={[styles.button, { backgroundColor: colors.surface }]}
            >
              <Text style={[styles.buttonLabel, { color: colors.textPrimary }]}>Cancel</Text>
            </Pressable>
            <Pressable onPress={onSave} style={[styles.button, { backgroundColor: colors.accent }]}>
              <Text style={[styles.buttonLabel, { color: colors.onAccent }]}>
                {mode === "edit" ? "Save changes" : "Create"}
              </Text>
            </Pressable>
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
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  title: {
    fontFamily: fonts.frauncesSemiBold,
    fontSize: 18,
  },
  deleteButton: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    // marginBottom is set inline — depends on whether the "Remove photo" row is showing.
  },
  preview: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  previewImage: {
    width: "100%",
    height: "100%",
  },
  previewBadge: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  removeThumbnail: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    alignSelf: "flex-start",
    marginBottom: 18,
  },
  removeThumbnailLabel: {
    fontFamily: fonts.interRegular,
    fontSize: 12,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 11,
    paddingHorizontal: 14,
    fontFamily: fonts.interRegular,
    fontSize: 14,
  },
  label: {
    fontFamily: fonts.interSemiBold,
    fontSize: 11.5,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  swatches: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 10,
    marginBottom: 20,
  },
  swatch: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 2.5,
  },
  error: {
    fontFamily: fonts.interRegular,
    fontSize: 12.5,
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
