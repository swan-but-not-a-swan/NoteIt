import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Feather } from "@react-native-vector-icons/feather";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import type { ThemeColors } from "@/theme/colors";
import { fonts } from "@/theme/fonts";
import { hexToRgba } from "@/lib/color";

type Props = {
  /** True from the moment the hold registers until the finger lifts. */
  visible: boolean;
  /** 0 -> 1 as the swipe approaches the trigger distance. */
  progress: SharedValue<number>;
  /** Past the trigger distance — releasing now will actually add. */
  readyToRelease: boolean;
  colors: ThemeColors;
};

// Confirmation surface for the hold-and-swipe-up gesture. The card appears
// when the hold registers and keeps growing as the finger travels up, so the
// swipe has continuous feedback rather than a single state that flips at a
// threshold you can't see.
//
// Two separate drivers on purpose: `appear` is JS-driven (it follows the
// `visible` prop) and handles the fade in/out, while `progress` is written
// straight from the gesture on the UI thread. Multiplying them means the
// growth tracks the finger at frame rate even though the mount is React's
// call.
//
// It never takes touches — the gesture lives on the content underneath, and a
// scrim that accepted them would swallow the very release it's describing.
export default function HoldToAddOverlay({ visible, progress, readyToRelease, colors }: Props) {
  const appear = useSharedValue(0);

  useEffect(() => {
    appear.set(withTiming(visible ? 1 : 0, { duration: 160 }));
  }, [visible]);

  const scrimStyle = useAnimatedStyle(() => ({
    // Deepens as the swipe goes up, so the screen dims further the closer the
    // gesture gets to firing.
    opacity: appear.get() * (0.55 + progress.get() * 0.35),
  }));

  const cardStyle = useAnimatedStyle(() => ({
    opacity: appear.get(),
    transform: [
      { scale: appear.get() * (0.92 + progress.get() * 0.26) },
      { translateY: -progress.get() * 28 },
    ],
  }));

  const arrowStyle = useAnimatedStyle(() => ({
    opacity: 0.45 + progress.get() * 0.55,
    transform: [{ translateY: -progress.get() * 6 }],
  }));

  return (
    <Animated.View style={[styles.scrim, scrimStyle]}>
      <Animated.View
        style={[
          styles.card,
          cardStyle,
          {
            backgroundColor: colors.surface,
            borderColor: readyToRelease ? colors.accent : colors.line,
          },
        ]}
      >
        <Animated.View style={arrowStyle}>
          <View style={[styles.iconRing, { backgroundColor: hexToRgba(colors.accent, 0.16) }]}>
            <Feather name={readyToRelease ? "plus" : "arrow-up"} size={20} color={colors.accent} />
          </View>
        </Animated.View>
        <Text style={[styles.label, { color: colors.textPrimary }]}>
          {readyToRelease ? "Release to add note" : "Swipe up to add note"}
        </Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  scrim: {
    pointerEvents: "none",
    ...StyleSheet.absoluteFill,
    backgroundColor: "#000",
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
