import type { BoxShadowValue, ViewStyle } from "react-native";
import { hexToRgba, LIGHT_THEME, type ThemeColors } from "./colors";

// iOS 26's Liquid Glass, as close as this app can draw it. There is no blur
// module compiled in (expo-glass-effect isn't a direct dependency, and would
// fall back to a plain view on Android anyway), so the glass is a tint the page
// shows through, a bright rim, a sheen fading down from the top edge, and a
// shadow under it. Defined once so every button, search bar and floating bar is
// the same material, with the colours still coming from the theme.
//
// Each style sets a border. That is load-bearing on Android: a rounded view
// with no border drops its rounding when its background colour changes after
// the first draw (the tab bar's lens did), and toggles here change it all the
// time.

const SHEEN = "linear-gradient(180deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0) 55%)";
//* a filled button is bright enough to need a stronger highlight to read as glass
const SHEEN_STRONG = "linear-gradient(180deg, rgba(255, 255, 255, 0.22) 0%, rgba(255, 255, 255, 0) 60%)";
//* a second, fainter line just inside the rim: the glass's thickness
const INNER_RIM: BoxShadowValue = {
  offsetX: 0,
  offsetY: 1,
  blurRadius: 0,
  color: "rgba(255, 255, 255, 0.08)",
  inset: true,
};

export type GlassOptions = {
  /** Colours the glass: a control that's switched on, or a primary action. */
  tint?: string;
  /** "wash" (the default) lays the tint thinly, for a selected control whose
   *  label takes the tint colour. "fill" lays it thick, for a primary button
   *  whose label is onAccent. */
  strength?: "wash" | "fill";
  /** "control" for a button sitting on the page; "float" for something
   *  hovering over content, like the tab bar's dock or the Gallery pill. */
  lift?: "control" | "float";
};

export function glass(
  colors: ThemeColors,
  { tint, strength = "wash", lift = "control" }: GlassOptions = {},
): ViewStyle {
  const dark = colors !== LIGHT_THEME;
  const drop: BoxShadowValue =
    lift === "float"
      ? { offsetX: 0, offsetY: 10, blurRadius: 28, color: colors.shadow }
      : { offsetX: 0, offsetY: 3, blurRadius: 10, color: colors.shadow };

  if (tint != null && strength === "fill") {
    return {
      borderWidth: 1,
      backgroundColor: hexToRgba(tint, 0.92),
      borderColor: "rgba(255, 255, 255, 0.28)",
      experimental_backgroundImage: SHEEN_STRONG,
      //* a filled button casts its own colour, the way the add button always has
      boxShadow: [{ ...drop, color: hexToRgba(tint, 0.35) }, INNER_RIM],
    };
  }

  if (tint != null) {
    return {
      borderWidth: 1,
      backgroundColor: hexToRgba(tint, 0.16),
      borderColor: hexToRgba(tint, 0.6),
      experimental_backgroundImage: SHEEN,
      boxShadow: [drop, INNER_RIM],
    };
  }

  return {
    borderWidth: 1,
    backgroundColor: dark ? hexToRgba(colors.surfaceHi, 0.72) : hexToRgba(colors.surface, 0.8),
    borderColor: dark ? hexToRgba(colors.textPrimary, 0.18) : hexToRgba(colors.surface, 0.95),
    experimental_backgroundImage: SHEEN,
    boxShadow: [drop, INNER_RIM],
  };
}
