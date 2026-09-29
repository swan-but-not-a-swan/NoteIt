import { Keyboard, ScrollView, Text, View } from "react-native";
import { Feather, type FeatherIconName } from "@react-native-vector-icons/feather/static";
import type { ThemeColors } from "@/theme/colors";
import { flatSurface } from "@/theme/glass";
import PressableScale from "./PressableScale";
import { suggestionRowStyles as styles } from "@/theme/styles/note.styles";

export type SuggestionChip = {
  key: string;
  label: string;
  icon?: FeatherIconName;
  /** The icon's colour; the label stays the plain chip colour. */
  iconColor?: string;
  /** A chip that makes something new ("Create #…"), drawn with a dashed rim. */
  create?: boolean;
  accessibilityLabel?: string;
  onPress: () => void;
};

type Props = {
  colors: ThemeColors;
  chips: SuggestionChip[];
  /** Shown when there are no chips to offer. */
  emptyLabel: string;
  /** What the row offers, for screen readers — "Saved tags", "Snippets". */
  accessibilityLabel: string;
};

// The chips a focused field offers, directly under that field: saved tags
// under Tags, snippets and Paste under the note. The last button hides the
// keyboard — an app can't add keys to the system keyboard itself.
//
// In the page rather than riding on the keyboard, so it shows the same whether
// the keyboard is docked, floating, or a hardware one with nothing on screen at
// all; the screen scrolls the field and this row down onto the keyboard's top
// edge when one is docked. Chips are flat, never glass: they're content to pick
// from, not chrome.
export default function SuggestionRow({ colors, chips, emptyLabel, accessibilityLabel }: Props) {
  return (
    <View style={styles.row} accessibilityLabel={accessibilityLabel}>
      <ScrollView
        horizontal
        style={styles.scroll}
        contentContainerStyle={styles.chips}
        showsHorizontalScrollIndicator={false}
        //* a tap on a chip must not take the keyboard down with it
        keyboardShouldPersistTaps="always"
      >
        {chips.length === 0 ? (
          <Text style={[styles.empty, { color: colors.stoneDim }]}>{emptyLabel}</Text>
        ) : (
          chips.map((chip) => (
            <PressableScale
              key={chip.key}
              onPress={chip.onPress}
              accessibilityRole="button"
              accessibilityLabel={chip.accessibilityLabel ?? chip.label}
              style={[styles.chip, flatSurface(colors), chip.create === true && { borderStyle: "dashed" }]}
            >
              {chip.icon != null && <Feather name={chip.icon} size={12} color={chip.iconColor ?? colors.stone} />}
              <Text style={[styles.chipLabel, { color: colors.stone }]} numberOfLines={1}>
                {chip.label}
              </Text>
            </PressableScale>
          ))
        )}
      </ScrollView>

      <PressableScale
        onPress={() => Keyboard.dismiss()}
        hitSlop={6}
        accessibilityRole="button"
        accessibilityLabel="Hide keyboard"
        style={[styles.hide, flatSurface(colors)]}
      >
        <Feather name="chevron-up" size={18} color={colors.textPrimary} />
      </PressableScale>
    </View>
  );
}
