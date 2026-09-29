import { View, type ViewProps } from "react-native";
import { GlassView } from "expo-glass-effect";
import { LIGHT_THEME, type ThemeColors } from "@/theme/colors";
import { flatSurface, glassTintColor, NATIVE_GLASS, NATIVE_GLASS_BASE, type GlassOptions } from "@/theme/glass";

type Props = ViewProps & GlassOptions & { colors: ThemeColors };

// A surface that isn't pressed itself — the tab bar's dock, a floating bar, a
// search field. Real Liquid Glass where the OS has it, the flat surface
// everywhere else (theme/glass.ts has why there's no imitation in between).
// Buttons use GlassPressable, which puts the same material behind a Pressable.
//
// Glass can't sample glass, so anything placed on one of these draws flat
// (flatSurface) rather than as glass of its own.
export default function GlassSurface({ colors, tint, strength = "wash", lift = "control", style, children, ...rest }: Props) {
  if (!NATIVE_GLASS) {
    //* the flat surface carries its own border and shadow, so the caller's
    //* style goes on top of it rather than under
    return (
      <View style={[flatSurface(colors, { tint, strength, lift }), style]} {...rest}>
        {children}
      </View>
    );
  }

  return (
    <GlassView
      //* the tint is what separates a primary action from a plain control, so
      //* the material itself stays "regular" and the colour does the talking
      glassEffectStyle="regular"
      tintColor={glassTintColor(tint, strength)}
      //* the app has its own light/dark toggle, so the glass follows the theme
      //* rather than the system's setting
      colorScheme={colors === LIGHT_THEME ? "light" : "dark"}
      //* the real material draws its own rim and shadow; the base only keeps
      //* the border's 1pt so the layout matches the flat version
      style={[NATIVE_GLASS_BASE, style]}
      {...rest}
    >
      {children}
    </GlassView>
  );
}
