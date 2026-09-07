import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import type { ThemeColors } from "@/theme/colors";
import { fonts } from "@/theme/fonts";
import { hexToRgba } from "@/lib/color";
import { FolderModel } from "../models/FolderModel";


type Props = {
  folder: FolderModel;
  count: number;
  colors: ThemeColors;
  onOpen: () => void;
  onEdit: () => void;
};

export default function Folder({ folder, count, colors, onOpen, onEdit }: Props) {
  return (
    <View
      style={[
        styles.row,
        {
          backgroundColor: colors.surface,
          borderColor: hexToRgba(folder.accent, 0.5),
        },
      ]}
    >
      {/* accent tint, layered under the content so the row reads as
          "tinted surface" rather than a flat accent block */}
      <View
        pointerEvents="none"
        style={[styles.tint, { backgroundColor: hexToRgba(folder.accent, 0.22) }]}
      />

      <Pressable
        onPress={onOpen}
        style={[styles.thumb, { backgroundColor: folder.accent }]}
      >
        {folder.coverUri != null ? (
          <Image source={{ uri: folder.coverUri }} style={styles.thumbImage} />
        ) : (
          <Feather name="folder" size={22} color="rgba(255,255,255,0.85)" />
        )}
      </Pressable>

      <Pressable onPress={onOpen} style={styles.info}>
        <Text style={[styles.name, { color: colors.textPrimary }]} numberOfLines={1}>
          {folder.name}
        </Text>
        <Text style={[styles.count, { color: colors.stone }]}>
          {count} picture-note{count === 1 ? "" : "s"}
        </Text>
      </Pressable>

      <Pressable
        onPress={onEdit}
        hitSlop={8}
        style={[styles.editButton, { backgroundColor: hexToRgba(folder.accent, 0.3) }]}
      >
        <Feather name="edit-2" size={14.5} color={colors.textPrimary} />
      </Pressable>

      <Pressable onPress={onOpen} hitSlop={8} style={styles.chevron}>
        <Feather name="chevron-right" size={18} color={colors.stoneDim} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    overflow: "hidden",
  },
  tint: {
    ...StyleSheet.absoluteFill,
  },
  thumb: {
    width: 58,
    height: 58,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  thumbImage: {
    width: "100%",
    height: "100%",
  },
  info: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontFamily: fonts.frauncesSemiBold,
    fontSize: 16.5,
  },
  count: {
    fontFamily: fonts.interRegular,
    fontSize: 12.5,
    marginTop: 3,
  },
  editButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  chevron: {
    padding: 8,
  },
});
