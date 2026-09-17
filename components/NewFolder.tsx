//! Manually reviewed since 15/09/2026

import { Modal, Pressable, Text, TextInput, View } from "react-native";
import { Image } from "expo-image";
import { Feather } from "@react-native-vector-icons/feather/static";
import { hexToRgba, type ThemeColors } from "@/theme/colors";
import { CropperContent } from "./ThumbnailCropper";
import { newFolderStyles as styles } from "@/theme/styles/folders.styles";

type Props = {
  visible: boolean;
  mode: "create" | "edit";
  name: string;
  onNameChange: (name: string) => void;
  color: string;
  onColorChange: (color: string) => void;
  swatches: string[];
  thumbnailUri?: string | null;
  onPickThumbnail: () => void;
  onRemoveThumbnail?: () => void;
  cropSourceUri?: string | null;
  onCropCancel: () => void;
  onCropConfirm: (croppedUri: string) => Promise<void>;
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
