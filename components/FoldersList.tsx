//! Manually reviewed since 16/09/2026

import { ScrollView, Text, View } from "react-native";
import { Feather } from "@react-native-vector-icons/feather/static";
import type { ThemeColors } from "@/theme/colors";
import GlassPressable from "./GlassPressable";
import Folder from "./Folder";
import AdBannerStrip from "./AdBannerStrip";
import { FolderModel } from "../models/FolderModel";
import { FolderListItemModel } from "../models/FolderListItemModel";
import { useBottomBarInset } from "@/lib/BottomBarInset";
import { foldersListStyles as styles, FOLDERS_LIST_PADDING } from "@/theme/styles/folders.styles";

type Props = {
  items: FolderListItemModel[];
  colors: ThemeColors;
  onOpenFolder: (id: string) => void;
  onEditFolder: (folder: FolderModel) => void;
  onNewFolder: () => void;
  showAdBanner?: boolean;
};

export default function FolderList({
  items,
  colors,
  onOpenFolder,
  onEditFolder,
  onNewFolder,
  showAdBanner = true,
}: Props) {
  const bottomBarInset = useBottomBarInset();

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.content, { paddingBottom: FOLDERS_LIST_PADDING + bottomBarInset }]}
      showsVerticalScrollIndicator={false}
    >
      {items.map(({ folder, count }) => (
        <View key={folder.id} style={styles.item}>
          <Folder
            folder={folder}
            count={count}
            colors={colors}
            onOpen={() => onOpenFolder(folder.id)}
            onEdit={() => onEditFolder(folder)}
          />
        </View>
      ))}

      <GlassPressable
        colors={colors}
        onPress={onNewFolder}
        //* glass, with the dashed rim that says "an empty slot" kept
        style={styles.newFolder}
      >
        <Feather name="folder-plus" size={17} color={colors.stone} />
        <Text style={[styles.newFolderLabel, { color: colors.stone }]}>New folder</Text>
      </GlassPressable>

      {showAdBanner && <AdBannerStrip colors={colors} />}
    </ScrollView>
  );
}
