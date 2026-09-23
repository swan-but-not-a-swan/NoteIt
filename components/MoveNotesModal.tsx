import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { Image } from "expo-image";
import { Feather, type FeatherIconName } from "@react-native-vector-icons/feather/static";
import type { ThemeColors } from "@/theme/colors";
import type { FolderModel } from "@/models/FolderModel";
import { moveNotesModalStyles as styles } from "@/theme/styles/folders.styles";

type Props = {
  visible: boolean;
  colors: ThemeColors;
  folders: FolderModel[];
  /** How many picture-notes are being moved, for the title. */
  count: number;
  onCancel: () => void;
  /** null means "no folder" — the gallery-only notes. */
  onSelectFolder: (folderId: string | null) => void;
};

// Where to put the picture-notes just picked. Every folder, plus the
// gallery-only option, drawn the way the folder list draws them so a row is
// recognisable as the folder it stands for.
export default function MoveNotesModal({
  visible,
  colors,
  folders,
  count,
  onCancel,
  onSelectFolder,
}: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: colors.bg, borderColor: colors.line }]}>
          <View style={styles.titleRow}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              {count === 1 ? "Move 1 picture-note" : `Move ${count} picture-notes`}
            </Text>
            <Pressable
              onPress={onCancel}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Cancel moving"
              style={[styles.closeButton, { backgroundColor: colors.surface }]}
            >
              <Feather name="x" size={14} color={colors.textPrimary} />
            </Pressable>
          </View>

          {/* capped, so a long folder list scrolls inside the dialog rather
              than pushing it off the screen */}
          <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
            <FolderRow
              name="No folder (Gallery only)"
              icon="inbox"
              tint={colors.accent}
              colors={colors}
              onPress={() => onSelectFolder(null)}
            />
            {folders.map((folder) => (
              <FolderRow
                key={folder.id}
                name={folder.name}
                icon="folder"
                tint={folder.accent}
                coverUri={folder.coverUri ?? null}
                colors={colors}
                onPress={() => onSelectFolder(folder.id)}
              />
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

type FolderRowProps = {
  name: string;
  icon: FeatherIconName;
  /** The folder's own accent, behind its cover. */
  tint: string;
  coverUri?: string | null;
  colors: ThemeColors;
  onPress: () => void;
};

function FolderRow({ name, icon, tint, coverUri = null, colors, onPress }: FolderRowProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Move to ${name}`}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: pressed ? colors.surfaceHi : colors.surface, borderColor: colors.line },
      ]}
    >
      <View style={[styles.thumb, { backgroundColor: tint }]}>
        {coverUri != null ? (
          <Image source={{ uri: coverUri }} style={styles.thumbImage} contentFit="cover" />
        ) : (
          <Feather name={icon} size={16} color="rgba(255,255,255,0.85)" />
        )}
      </View>
      <Text style={[styles.rowLabel, { color: colors.textPrimary }]} numberOfLines={1}>
        {name}
      </Text>
      <Feather name="chevron-right" size={16} color={colors.stoneDim} />
    </Pressable>
  );
}
