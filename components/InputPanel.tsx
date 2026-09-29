import type { ReactNode } from "react";
import { Text, View } from "react-native";
import Animated, { SlideInDown, SlideOutDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { ThemeColors } from "@/theme/colors";
import PressableScale from "./PressableScale";
import {
  INPUT_PANEL_BAR_HEIGHT,
  INPUT_PANEL_BODY_HEIGHT,
  inputPanelStyles as styles,
} from "@/theme/styles/note.styles";

/** The panel's full height at a given bottom inset, so the screen behind it
 *  can leave room to scroll its fields clear. */
export function inputPanelHeight(bottomInset: number) {
  return INPUT_PANEL_BAR_HEIGHT + INPUT_PANEL_BODY_HEIGHT + bottomInset;
}

type Props = {
  title: string;
  colors: ThemeColors;
  onDone: () => void;
  /** An optional action on the left of the bar, like the date's "Today". */
  leading?: { label: string; onPress: () => void };
  children: ReactNode;
};

// A picker in the keyboard's place: it rises from the bottom the way the
// keyboard does and sits where the keyboard would, with a bar on top that
// closes it. The folder wheel and the date picker both live in one, so
// choosing a folder or a day feels like typing into the other fields does.
export default function InputPanel({ title, colors, onDone, leading, children }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <Animated.View
      entering={SlideInDown.duration(240)}
      exiting={SlideOutDown.duration(200)}
      style={[
        styles.panel,
        { backgroundColor: colors.surface, borderTopColor: colors.line, paddingBottom: insets.bottom },
      ]}
    >
      <View style={[styles.bar, { borderBottomColor: colors.line }]}>
        <View style={styles.barSide}>
          {leading != null && (
            <PressableScale onPress={leading.onPress} hitSlop={8} accessibilityRole="button">
              <Text style={[styles.barAction, { color: colors.accent }]}>{leading.label}</Text>
            </PressableScale>
          )}
        </View>
        <Text style={[styles.barTitle, { color: colors.textPrimary }]}>{title}</Text>
        <View style={styles.barSide}>
          <PressableScale onPress={onDone} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Done choosing ${title.toLowerCase()}`}>
            <Text style={[styles.barAction, styles.barActionEnd, { color: colors.accent }]}>Done</Text>
          </PressableScale>
        </View>
      </View>
      <View style={styles.body}>{children}</View>
    </Animated.View>
  );
}
