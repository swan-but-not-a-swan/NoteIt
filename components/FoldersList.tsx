import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Feather } from "@react-native-vector-icons/feather/static";
import type { ThemeColors } from "@/theme/colors";
import { fonts } from "@/theme/fonts";
import Folder from "./Folder";
import AdBannerStrip from "./AdBannerStrip";
import { FolderModel } from "../models/FolderModel";
import { FolderListItemModel } from "../models/FolderListItemModel";

type Props = {
  items: FolderListItemModel[];
  colors: ThemeColors;
  onOpenFolder: (id: string) => void;
  onEditFolder: (folder: FolderModel) => void;
  onNewFolder: () => void;
  /** Set false to hide the sponsored strip (e.g. no ads for now). Default true. */
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
  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {items.map(({ folder, count }, i) => (
        <View key={folder.id} style={styles.item}>
          <Folder
            folder={folder}
            count={count}
            colors={colors}
            onOpen={() => onOpenFolder(folder.id)}
            onEdit={() => onEditFolder(folder)}
          />
          {showAdBanner && i === 1 && <AdBannerStrip colors={colors} />}
        </View>
      ))}

      <Pressable
        onPress={onNewFolder}
        style={[styles.newFolder, { borderColor: colors.line }]}
      >
        <Feather name="folder-plus" size={17} color={colors.stone} />
        <Text style={[styles.newFolderLabel, { color: colors.stone }]}>New folder</Text>
      </Pressable>

      {/*
        TODO (business logic): pull-up-past-the-bottom-of-the-list also
        triggers onNewFolder in the web reference (usePullUpToAdd). That's a
        gesture-handler + reanimated interaction, not a styling concern, so
        it's left out of this pass — the "New folder" button above covers
        the same action in the meantime.
      */}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 18,
    paddingBottom: 18,
    gap: 10,
  },
  item: {
    gap: 10,
  },
  newFolder: {
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 4,
  },
  newFolderLabel: {
    fontFamily: fonts.interSemiBold,
    fontSize: 13.5,
  },
});
