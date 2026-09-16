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
  right?: ReactNode; //* right hand side slot for a button or menu
  insetTop?: boolean;
};

export default function TopBar({ title, colors, onBack, right, insetTop = true }: Props) {
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
