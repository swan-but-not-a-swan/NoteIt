//! Manually reviewed since 16/09/2026

import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { Feather, type FeatherIconName } from "@react-native-vector-icons/feather/static";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { ThemeColors } from "@/theme/colors";
import { topBarStyles as styles } from "@/theme/styles/app.styles";

type Props = {
  title: string;
  colors: ThemeColors;
  onBack?: () => void;
  right?: ReactNode; //* right hand side slot for a button or menu
  insetTop?: boolean;
};

export default function TopBar({ title, colors, onBack, right, insetTop = true }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.row, { paddingTop: (insetTop ? insets.top : 0) + 10 }]}>
      <View style={styles.left}>
        {onBack != null && (
          <TopBarIconButton
            icon="arrow-left"
            accessibilityLabel="Back"
            colors={colors}
            onPress={onBack}
          />
        )}
        <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1}>
          {title}
        </Text>
      </View>
      {right}
    </View>
  );
}

type TopBarIconButtonProps = {
  icon: FeatherIconName;
  /** What the button does, for screen readers — "Back", "Gallery", … */
  accessibilityLabel: string;
  colors: ThemeColors;
  onPress: () => void;
};

// The header's round icon button. Shared so a screen putting its own arrow in
// the right-hand slot gets the same size and tint as the back arrow.
export function TopBarIconButton({ icon, accessibilityLabel, colors, onPress }: TopBarIconButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={[styles.iconButton, { backgroundColor: colors.surface }]}
    >
      <Feather name={icon} size={17} color={colors.textPrimary} />
    </Pressable>
  );
}

//* a row for the right-hand slot, for a screen with more than one button there
export function TopBarActions({ children }: { children: ReactNode }) {
  return <View style={styles.actions}>{children}</View>;
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
      accessibilityRole="button"
      accessibilityLabel="Settings"
      style={[styles.iconButton, { backgroundColor: colors.surface }]}
    >
      <Feather name="settings" size={17} color={colors.textPrimary} />
    </Pressable>
  );
}
