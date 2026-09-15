import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { Feather } from "@react-native-vector-icons/feather/static";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { ThemeColors } from "@/theme/colors";
import { topBarStyles as styles } from "@/theme/styles/app.styles";

type Props = {
  title: string;
  colors: ThemeColors;
  onBack?: () => void;
  /** Arbitrary right-side content — e.g. a settings button, a share button. */
  right?: ReactNode;
  /** Whether to clear the status bar. True for a normal full-screen route.
   *  Pass false on a modally-presented one: that card already starts below
   *  the status bar, but useSafeAreaInsets still reports the window's inset,
   *  so adding it again pads twice — a visible gap up top, and that much
   *  height stolen from everything below. */
  insetTop?: boolean;
};

// Shared across every screen so title/back/right-action placement stays
// consistent — mirrors the reference's TopBar (title + optional back +
// optional right slot), same shape used for Folders, Gallery, Viewer, etc.
export default function TopBar({ title, colors, onBack, right, insetTop = true }: Props) {
  // The status bar / notch height varies by device (and rotates a Dynamic
  // Island in and out) — a flat paddingTop collides with it on real hardware
  // even though it looks fine in a plain simulator. This is the real inset.
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.row, { paddingTop: (insetTop ? insets.top : 0) + 10 }]}>
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
