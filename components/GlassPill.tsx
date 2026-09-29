import { Text } from "react-native";
import { Feather, type FeatherIconName } from "@react-native-vector-icons/feather/static";
import type { ThemeColors } from "@/theme/colors";
import { glassPillStyles as styles } from "@/theme/styles/app.styles";
import GlassPressable from "./GlassPressable";

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
// scrolling content rather than inside a bar. Real glass on iOS 26, the flat
// floating surface everywhere else (see GlassPressable).
export default function GlassPill({ label, trailingIcon, onPress, colors, accessibilityLabel }: Props) {
  return (
    <GlassPressable
      colors={colors}
      //* floating over the grid, like the tab bar's dock
      lift="float"
      onPress={onPress}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      style={styles.pill}
    >
      <Text style={[styles.label, { color: colors.textPrimary }]}>{label}</Text>
      {trailingIcon != null && <Feather name={trailingIcon} size={15} color={colors.textPrimary} />}
    </GlassPressable>
  );
}
