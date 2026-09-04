import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import type { ThemeColors } from "@/theme/colors";
import { fonts } from "@/theme/fonts";
import Folder from "./Folder";
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

function AdBannerStrip({ colors }: { colors: ThemeColors }) {
  return (
    <View
      style={[
        styles.ad,
        { backgroundColor: colors.surfaceHi, borderColor: colors.line },
      ]}
    >
      <View style={styles.adIcon}>
        <Feather name="camera" size={18} color="#EAF2EE" />
      </View>
      <View style={styles.adText}>
        <Text style={[styles.adTitle, { color: colors.textPrimary }]}>
          Print your favorites
        </Text>
        <Text style={[styles.adSubtitle, { color: colors.stone }]}>
          FrameWorks · ships in 3 days
        </Text>
      </View>
      <View style={[styles.adBadge, { borderColor: colors.line }]}>
        <Text style={[styles.adBadgeLabel, { color: colors.stoneDim }]}>Ad</Text>
      </View>
    </View>
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
  ad: {
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  adIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#2E4F44",
    alignItems: "center",
    justifyContent: "center",
  },
  adText: {
    flex: 1,
    minWidth: 0,
  },
  adTitle: {
    fontFamily: fonts.interSemiBold,
    fontSize: 13,
  },
  adSubtitle: {
    fontFamily: fonts.interRegular,
    fontSize: 12,
    marginTop: 1,
  },
  adBadge: {
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 3,
    paddingHorizontal: 6,
  },
  adBadgeLabel: {
    fontFamily: fonts.interSemiBold,
    fontSize: 10,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
});
