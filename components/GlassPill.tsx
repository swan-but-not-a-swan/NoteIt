import { Pressable, Text } from "react-native";
import { Feather, type FeatherIconName } from "@react-native-vector-icons/feather/static";
import { hexToRgba, type ThemeColors } from "@/theme/colors";
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
// Drawn with translucency and a light rim rather than real glass:
// expo-glass-effect isn't a direct dependency, so it isn't compiled into the
// app, and on Android it would fall back to a plain view anyway. Once it is
// added, GlassView takes the place of the Pressable's background here and no
// caller has to change.
export default function GlassPill({ label, trailingIcon, onPress, colors, accessibilityLabel }: Props) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      style={({ pressed }) => [
        styles.pill,
        {
          //* see-through enough for the tiles to show beneath, dense enough to
          //* keep the label readable over a bright photo
          backgroundColor: hexToRgba(colors.surfaceHi, pressed ? 0.92 : 0.74),
          borderColor: hexToRgba(colors.textPrimary, 0.16),
          boxShadow: [{ offsetX: 0, offsetY: 6, blurRadius: 18, color: "rgba(0,0,0,0.35)" }],
        },
      ]}
    >
      <Text style={[styles.label, { color: colors.textPrimary }]}>{label}</Text>
      {trailingIcon != null && <Feather name={trailingIcon} size={15} color={colors.textPrimary} />}
    </Pressable>
  );
}
