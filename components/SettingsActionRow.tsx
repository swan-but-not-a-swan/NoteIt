import { Pressable, StyleSheet, Text, View } from "react-native";
import { Feather, type FeatherIconName } from "@react-native-vector-icons/feather";
import type { ThemeColors } from "@/theme/colors";
import { fonts } from "@/theme/fonts";
import { hexToRgba } from "@/lib/color";

type Props = {
  icon: FeatherIconName;
  title: string;
  subtitle: string;
  colors: ThemeColors;
  onPress: () => void;
  disabled?: boolean;
};

// An action row on the Settings screen: tinted icon tile, title, one line of
// explanation, chevron. Ported from the reference's "Add photo to Gallery"
// row, which is the shape every settings action there uses.
export default function SettingsActionRow({
  icon,
  title,
  subtitle,
  colors,
  onPress,
  disabled = false,
}: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: colors.surface,
          borderColor: colors.line,
          opacity: disabled ? 0.5 : pressed ? 0.7 : 1,
        },
      ]}
    >
      <View style={[styles.iconTile, { backgroundColor: hexToRgba(colors.accent, 0.14) }]}>
        <Feather name={icon} size={18} color={colors.accent} />
      </View>
      <View style={styles.body}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
        <Text style={[styles.subtitle, { color: colors.stone }]}>{subtitle}</Text>
      </View>
      <Feather name="chevron-right" size={16} color={colors.stoneDim} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
  },
  iconTile: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  body: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  title: {
    fontFamily: fonts.interSemiBold,
    fontSize: 14,
  },
  subtitle: {
    fontFamily: fonts.interRegular,
    fontSize: 12,
    lineHeight: 17,
  },
});
