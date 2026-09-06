import { StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import type { ThemeColors } from "@/theme/colors";
import { fonts } from "@/theme/fonts";

// The "strip" ad placement — shared wherever the web reference reuses its
// AdBanner variant="strip" (FoldersList, the picture-note Viewer).
export default function AdBannerStrip({ colors }: { colors: ThemeColors }) {
  return (
    <View style={[styles.ad, { backgroundColor: colors.surfaceHi, borderColor: colors.line }]}>
      <View style={styles.adIcon}>
        <Feather name="camera" size={18} color="#EAF2EE" />
      </View>
      <View style={styles.adText}>
        <Text style={[styles.adTitle, { color: colors.textPrimary }]}>Print your favorites</Text>
        <Text style={[styles.adSubtitle, { color: colors.stone }]}>FrameWorks · ships in 3 days</Text>
      </View>
      <View style={[styles.adBadge, { borderColor: colors.line }]}>
        <Text style={[styles.adBadgeLabel, { color: colors.stoneDim }]}>Ad</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
