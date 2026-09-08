import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Feather } from "@react-native-vector-icons/feather";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import type { ThemeColors } from "@/theme/colors";
import { fonts } from "@/theme/fonts";
import { hexToRgba } from "@/lib/color";

type Props = {
  /** True from the moment the long-press is recognised until the finger lifts. */
  visible: boolean;
  colors: ThemeColors;
  label?: string;
};

// Confirmation scrim for the hold-to-add gesture: once the press registers,
// the screen dims and says what releasing will do, so the hold reads as a
// deliberate action with a way out (slide off / keep holding and it just
// fades) rather than something that fired by accident.
//
// Stays mounted at opacity 0 rather than unmounting, so the fade-out plays
// on release instead of vanishing. It never takes touches — the gesture that
// drives it lives on the content underneath, and a scrim that swallowed the
// release would break the very gesture it's describing.
export default function HoldToAddOverlay({ visible, colors, label = "Release to add note" }: Props) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.set(withTiming(visible ? 1 : 0, { duration: 160 }));
  }, [visible]);

  const scrimStyle = useAnimatedStyle(() => ({
    opacity: progress.get(),
  }));

  const cardStyle = useAnimatedStyle(() => ({
    opacity: progress.get(),
    // A slight settle rather than a pop — this appears under the user's
    // finger mid-gesture, so it should feel like it was already there.
    transform: [{ scale: 0.96 + progress.get() * 0.04 }],
  }));

  return (
    <Animated.View style={[styles.scrim, scrimStyle]}>
      <Animated.View
        style={[
          styles.card,
          cardStyle,
          { backgroundColor: colors.surface, borderColor: colors.line },
        ]}
      >
        <View style={[styles.iconRing, { backgroundColor: hexToRgba(colors.accent, 0.16) }]}>
          <Feather name="plus" size={20} color={colors.accent} />
        </View>
        <Text style={[styles.label, { color: colors.textPrimary }]}>{label}</Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  scrim: {
    pointerEvents: "none",
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderRadius: 18,
    paddingVertical: 22,
    paddingHorizontal: 28,
  },
  iconRing: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontFamily: fonts.interSemiBold,
    fontSize: 14.5,
    letterSpacing: 0.2,
  },
});
