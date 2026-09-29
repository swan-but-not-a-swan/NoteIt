import type { BoxShadowValue, ViewStyle } from "react-native";
import { isGlassEffectAPIAvailable, isLiquidGlassAvailable } from "expo-glass-effect";
import { hexToRgba, LIGHT_THEME, type ThemeColors } from "./colors";

// Glass where the device has it, and a plain surface where it doesn't.
//
// iOS 26's Liquid Glass comes from expo-glass-effect's GlassView, which the
// GlassSurface and GlassPressable components put behind a control. Everywhere
// else — Android, iOS before 26, the web preview — there's no real material to
// draw, so those components fall back to `flatSurface()` below instead of an
// imitation: a solid fill and a hairline, the way the app looked before glass.
//
// Read once: the answer is fixed by the OS and by the SDK the app was built
// with, and neither changes while it runs.
//
// Both checks, not just the first: some iOS 26 betas report Liquid Glass as
// available but lack the API behind it (expo/expo#40911). GlassView then skips
// the effect, and a button whose own fill was cleared for the glass would draw
// as nothing at all. On those, the flat surface is the safe answer.
export const NATIVE_GLASS = isLiquidGlassAvailable() && isGlassEffectAPIAvailable();

export type GlassOptions = {
  /** Colours the surface: a control that's switched on, or a primary action. */
  tint?: string;
  /** "wash" (the default) lays the tint thinly, for a selected control whose
   *  label takes the tint colour. "fill" lays it thick, for a primary button
   *  whose label is onAccent. */
  strength?: "wash" | "fill";
  /** "control" for a button sitting on the page; "float" for something
   *  hovering over content, like the tab bar's dock or the Gallery pill. */
  lift?: "control" | "float";
};

/**
 * The non-glass look: what a glass control draws as on a device without Liquid
 * Glass, and what a control that should never be glass (the add-note screen's
 * media picker and chips) always draws as.
 *
 * Each style sets a border. That is load-bearing on Android: a rounded view
 * with no border drops its rounding when its background colour changes after
 * the first draw (the tab bar's lens did), and toggles here change it all the
 * time.
 */
export function flatSurface(
  colors: ThemeColors,
  { tint, strength = "wash", lift = "control" }: GlassOptions = {},
): ViewStyle {
  const dark = colors !== LIGHT_THEME;
  //* only something floating over content needs a shadow to part it from what
  //* scrolls underneath; a control on the page sits on it
  const drop: BoxShadowValue[] =
    lift === "float" ? [{ offsetX: 0, offsetY: 8, blurRadius: 22, color: colors.shadow }] : [];

  if (tint != null && strength === "fill") {
    return {
      borderWidth: 1,
      backgroundColor: tint,
      borderColor: tint,
      //* a filled button casts its own colour, the way the add button always has
      boxShadow: [{ offsetX: 0, offsetY: 3, blurRadius: 10, color: hexToRgba(tint, 0.35) }],
    };
  }

  if (tint != null) {
    return {
      borderWidth: 1,
      backgroundColor: hexToRgba(tint, 0.14),
      borderColor: hexToRgba(tint, 0.55),
      boxShadow: drop,
    };
  }

  return {
    borderWidth: 1,
    //* surfaceHi on dark: the dark surface sits too close to the page to read
    //* as something you can press
    backgroundColor: dark ? colors.surfaceHi : colors.surface,
    borderColor: colors.line,
    boxShadow: drop,
  };
}

/**
 * What a glass control's own view carries while real glass is drawn behind it:
 * the same 1pt border the flat surface has, so a control measures the same on
 * every platform, but nothing painted over the material.
 */
export const NATIVE_GLASS_BASE: ViewStyle = {
  borderWidth: 1,
  borderColor: "transparent",
  backgroundColor: "transparent",
};

/** The tint handed to GlassView: the colour itself for a primary action, a
 *  thinner layer of it for a control that's switched on. */
export function glassTintColor(tint: string | undefined, strength: GlassOptions["strength"] = "wash") {
  if (tint == null) return undefined;
  return strength === "fill" ? tint : hexToRgba(tint, 0.3);
}

/**
 * What a label or icon sitting *on* glass should be coloured.
 *
 * The material is brighter and busier than a flat surface, with whatever shows
 * through from behind, so the muted greys that read well on `colors.surface` go
 * soft on it. These pull back towards the primary text colour, which keeps
 * something secondary legible without promoting it to the same weight as the
 * thing that is switched on.
 */
export function onGlass(colors: ThemeColors, muted = false): string {
  if (!muted) return colors.textPrimary;
  const dark = colors !== LIGHT_THEME;
  return hexToRgba(colors.textPrimary, dark ? 0.78 : 0.68);
}
