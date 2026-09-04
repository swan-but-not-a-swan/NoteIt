import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { ThemeColors } from "@/theme/colors";
import { fonts } from "@/theme/fonts";

type Props = {
  title: string;
  colors: ThemeColors;
  onBack?: () => void;
  /** Arbitrary right-side content — e.g. a settings button, a share button. */
  right?: ReactNode;
};

// Shared across every screen so title/back/right-action placement stays
// consistent — mirrors the reference's TopBar (title + optional back +
// optional right slot), same shape used for Folders, Gallery, Viewer, etc.
export default function TopBar({ title, colors, onBack, right }: Props) {
  // The status bar / notch height varies by device (and rotates a Dynamic
  // Island in and out) — a flat paddingTop collides with it on real hardware
  // even though it looks fine in a plain simulator. This is the real inset.
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.row, { paddingTop: insets.top + 10 }]}>
      <View style={styles.left}>
        {onBack && (
          <Pressable
            onPress={onBack}
            hitSlop={8}
            style={[styles.iconButton, { backgroundColor: colors.surface }]}
          >
            <Feather name="arrow-left" size={17} color={colors.textPrimary} />
          </Pressable>
        )}
        <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1}>
          {title}
        </Text>
      </View>
      {right}
    </View>
  );
}

type SettingsButtonProps = {
  colors: ThemeColors;
  onPress: () => void;
};

// Reusable icon-button in the TopBar's own visual style — named for its
// current use (the Folders tab's settings entry point), but any screen
// needing a single-icon action in the `right` slot can reuse it.
export function SettingsButton({ colors, onPress }: SettingsButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      style={[styles.iconButton, { backgroundColor: colors.surface }]}
    >
      <Feather name="settings" size={17} color={colors.textPrimary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    // paddingTop is set inline from useSafeAreaInsets() above.
    paddingBottom: 10,
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minWidth: 0,
    flexShrink: 1,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontFamily: fonts.frauncesSemiBold,
    fontSize: 30,
    fontWeight: "600",
    flexShrink: 1,
  },
});
