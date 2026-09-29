import { StyleSheet, View } from "react-native";
import { GlassView } from "expo-glass-effect";
import { LIGHT_THEME, type ThemeColors } from "@/theme/colors";
import { flatSurface, glassSelectedLens, glassTintColor, NATIVE_GLASS, NATIVE_GLASS_BASE, type GlassOptions } from "@/theme/glass";
import PressableScale, { type PressableScaleProps } from "./PressableScale";

type Props = PressableScaleProps & GlassOptions & { colors: ThemeColors };

// A button on glass: real Liquid Glass behind it where the OS has it, the flat
// surface everywhere else, and the app's grow-on-press either way.
//
// The glass is a layer behind the button's content rather than the button
// itself, so the caller's style — size, padding, layout, a focus border — stays
// on the Pressable exactly as it was written.
export default function GlassPressable({ colors, tint, strength = "wash", lift = "control", style, children, ...rest }: Props) {
  //* the corners and border the glass has to follow, read from the resting
  //* style; nothing that changes on press moves either of them
  const shape = StyleSheet.flatten(typeof style === "function" ? style({ pressed: false, hovered: false }) : style) ?? {};
  //* an absolute child is placed inside the border, so it's pushed back out
  //* over it to cover the whole button
  const inset = -(typeof shape.borderWidth === "number" ? shape.borderWidth : 1);
  const layer = {
    position: "absolute" as const,
    pointerEvents: "none" as const,
    top: inset,
    left: inset,
    right: inset,
    bottom: inset,
    borderRadius: shape.borderRadius,
  };
  //* a switched-on control is lit, not coloured (theme/glass.ts)
  const lens = NATIVE_GLASS ? glassSelectedLens(colors, { tint, strength }) : null;

  return (
    <PressableScale
      {...rest}
      style={(state) => [
        NATIVE_GLASS ? NATIVE_GLASS_BASE : flatSurface(colors, { tint, strength, lift }),
        typeof style === "function" ? style(state) : style,
      ]}
    >
      {(state) => (
        <>
          {NATIVE_GLASS && (
            <GlassView
              glassEffectStyle="regular"
              tintColor={glassTintColor(tint, strength)}
              colorScheme={colors === LIGHT_THEME ? "light" : "dark"}
              style={layer}
            />
          )}
          {lens != null && <View style={[layer, { backgroundColor: lens }]} />}
          {typeof children === "function" ? children(state) : children}
        </>
      )}
    </PressableScale>
  );
}
