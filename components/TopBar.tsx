//! Manually reviewed since 16/09/2026

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
  /** A forward arrow in the same left slot, for a screen whose neighbour lies
   *  ahead rather than behind — the folder list's way into the gallery.
   *  Ignored when onBack is set. */
  onForward?: () => void;
  right?: ReactNode; //* right hand side slot for a button or menu
  insetTop?: boolean;
};

export default function TopBar({ title, colors, onBack, onForward, right, insetTop = true }: Props) {
  const insets = useSafeAreaInsets();
  //* one slot, one arrow: back wins if a screen somehow passes both
  const onNav = onBack ?? onForward;

  return (
    <View style={[styles.row, { paddingTop: (insetTop ? insets.top : 0) + 10 }]}>
      <View style={styles.left}>
        {onNav != null && (
          <Pressable
            onPress={onNav}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={onBack != null ? "Back" : "Forward"}
            style={[styles.iconButton, { backgroundColor: colors.surface }]}
          >
            <Feather
              name={onBack != null ? "arrow-left" : "arrow-right"}
              size={17}
              color={colors.textPrimary}
            />
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
