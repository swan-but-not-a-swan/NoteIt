import { StyleSheet, View, type ViewProps } from "react-native";
import { GlassView } from "expo-glass-effect";
import { LIGHT_THEME, type ThemeColors } from "@/theme/colors";
import {
  flatSurface,
  glassSelectedLens,
  glassTintColor,
  NATIVE_GLASS,
  NATIVE_GLASS_BASE,
  type GlassOptions,
} from "@/theme/glass";

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

  //* a switched-on surface is lit, not coloured (theme/glass.ts)
  const lens = glassSelectedLens(colors, { tint, strength });
  const radius = StyleSheet.flatten(style)?.borderRadius;

  return (
    <GlassView
      //* clear glass; only a primary action keeps its colour as a tint
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
      {lens != null && (
        <View
          style={{
            position: "absolute",
            pointerEvents: "none",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            borderRadius: radius,
            backgroundColor: lens,
          }}
        />
      )}
      {children}
    </GlassView>
  );
}
