//! Manually reviewed since 16/09/2026

import { Pressable, Text, View } from "react-native";
import { Image } from "expo-image";
import { Feather } from "@react-native-vector-icons/feather/static";
import { hexToRgba, type ThemeColors } from "@/theme/colors";
import { NATIVE_GLASS } from "@/theme/glass";
import GlassPressable from "./GlassPressable";
import { FolderModel } from "../models/FolderModel";
import { folderStyles as styles } from "@/theme/styles/folders.styles";


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
          //* lifts the card off the canvas
          boxShadow: [{ offsetX: 0, offsetY: 8, blurRadius: 20, color: colors.shadow }],
        },
      ]}
    >
      <View
        style={[styles.tint, { backgroundColor: hexToRgba(folder.accent, 0.22) }]}
      />

      <Pressable
        onPress={onOpen}
        style={[styles.thumb, { backgroundColor: folder.accent }]}
      >
        {folder.coverUri != null ? (
          <Image source={{ uri: folder.coverUri }} style={styles.thumbImage} cachePolicy="memory-disk" />
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

      <GlassPressable
        colors={colors}
        //* the folder's colour on the flat surface; clear glass on iOS 26, where
        //* a tinted control reads as switched on (theme/glass.ts)
        tint={NATIVE_GLASS ? undefined : folder.accent}
        onPress={onEdit}
        hitSlop={8}
        style={styles.editButton}
      >
        <Feather name="edit-2" size={14.5} color={colors.textPrimary} />
      </GlassPressable>

      <Pressable onPress={onOpen} hitSlop={8} style={styles.chevron}>
        <Feather name="chevron-right" size={18} color={colors.stoneDim} />
      </Pressable>
    </View>
  );
}
