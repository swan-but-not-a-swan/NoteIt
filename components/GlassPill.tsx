import { Pressable, Text } from "react-native";
import { Feather, type FeatherIconName } from "@react-native-vector-icons/feather/static";
import type { ThemeColors } from "@/theme/colors";
import { glass } from "@/theme/glass";
import { glassPillStyles as styles } from "@/theme/styles/app.styles";

type Props = {
  label: string;
  /** Drawn after the label, e.g. an arrow for "go there". */
  trailingIcon?: FeatherIconName;
  onPress: () => void;
  colors: ThemeColors;
  /** Defaults to the label; pass one when the label alone is too terse. */
  accessibilityLabel?: string;
};

// A floating pill in the Liquid Glass style, for a control that sits over
// scrolling content rather than inside a bar.
//
// The material is the app's shared glass (theme/glass.ts), which explains why
// it is drawn rather than real.
export default function GlassPill({ label, trailingIcon, onPress, colors, accessibilityLabel }: Props) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      style={({ pressed }) => [
        styles.pill,
        //* floating over the grid, like the tab bar's dock
        glass(colors, { lift: "float" }),
        pressed && { opacity: 0.8 },
      ]}
    >
      <Text style={[styles.label, { color: colors.textPrimary }]}>{label}</Text>
      {trailingIcon != null && <Feather name={trailingIcon} size={15} color={colors.textPrimary} />}
    </Pressable>
  );
}
