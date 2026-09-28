import { View, type ViewProps } from "react-native";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import { LIGHT_THEME, type ThemeColors } from "@/theme/colors";
import { glass, type GlassOptions } from "@/theme/glass";

// Real Liquid Glass where the OS has it, the painted imitation everywhere else.
//
// `theme/glass.ts` draws glass out of a tint, a rim, a sheen and a shadow,
// which is as close as CSS-ish styling gets. iOS 26 has the actual material —
// it refracts and reacts to what scrolls under it, which no background colour
// can fake. This picks whichever is available behind one component, so call
// sites don't carry the branch.
//
// Off iOS, GlassView renders a plain View and `isLiquidGlassAvailable()` is
// false, so the fallback is what Android and the web preview always get. The
// check is read once: it answers for the OS, and the OS doesn't change while
// the app is running.
const NATIVE_GLASS = isLiquidGlassAvailable();

type Props = ViewProps & GlassOptions & { colors: ThemeColors };

export default function GlassSurface({
  colors,
  tint,
  strength = "wash",
  lift = "control",
  style,
  children,
  ...rest
}: Props) {
  if (!NATIVE_GLASS) {
    //* the painted version carries its own border, sheen and shadow, so the
    //* caller's style goes on top of it rather than under
    return (
      <View style={[glass(colors, { tint, strength, lift }), style]} {...rest}>
        {children}
      </View>
    );
  }

  return (
    <GlassView
      //* the tint is what separates a primary action from a plain control, so
      //* the material itself stays "regular" and the colour does the talking
      glassEffectStyle="regular"
      tintColor={tint}
      //* the app has its own light/dark toggle, so the glass follows the theme
      //* rather than the system's setting
      colorScheme={colors === LIGHT_THEME ? "light" : "dark"}
      //* nothing from glass() here: the real material draws its own rim and
      //* shadow, and layering the painted ones over it reads as a double edge
      style={style}
      {...rest}
    >
      {children}
    </GlassView>
  );
}
