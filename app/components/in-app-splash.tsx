import { useEffect, useRef } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import Svg, { Circle, Defs, Path, RadialGradient, Stop } from "react-native-svg";
import { DARK_THEME } from "@/theme/colors";
import { fonts } from "@/theme/fonts";

type Props = {
  onFinish: () => void;
};

const colors = DARK_THEME;

// Matches the "Note It Splash" concept: icon mark + "POWERED BY" caption +
// glowing "SMKTechnologies" wordmark, same structure as the Unity "Powered
// by" reference, translated into this app's own ember-charcoal/amber
// identity rather than a literal reskin.
export default function InAppSplash({ onFinish }: Props) {
  const glowScale = useSharedValue(1);
  const glowOpacity = useSharedValue(0.55);
  const lockupOpacity = useSharedValue(0);
  const lockupY = useSharedValue(14);
  // A mutable flag, only ever touched inside the effect — never read during
  // render, which is exactly what a ref is for.
  const finished = useRef(false);

  useEffect(() => {
    // Guards against calling onFinish (which navigates away) twice, and lets
    // the safety-net timeout below and the animation's own completion race
    // each other without double-firing.
    const finish = () => {
      if (finished.current) return;
      finished.current = true;
      onFinish();
    };

    // The breathing glow, looping forever. There's no "parallel" wrapper to
    // build here the way Animated.parallel needed one — each shared value
    // just runs its own animation, and they happen to share a duration.
    const breathe = (to: number, back: number) =>
      withRepeat(
        withSequence(
          withTiming(to, { duration: 2250, easing: Easing.inOut(Easing.ease) }),
          withTiming(back, { duration: 2250, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
      );
    glowScale.value = breathe(1.08, 1);
    glowOpacity.value = breathe(0.85, 0.55);

    // A timing animation with a back-out easing reads almost identically to
    // the settle of a spring, but (unlike withSpring) always finishes in a
    // fixed, predictable duration. Keeping it as timing also keeps the
    // sequence below on a known ~2.55s budget, which is what the safety
    // timeout is sized against.
    lockupY.value = withDelay(
      150,
      withTiming(0, { duration: 700, easing: Easing.out(Easing.back(1.4)) }),
    );

    // Fade in, hold, fade out — and the final animation's own completion
    // callback ends the splash. It runs on the UI thread, so hopping back to
    // JS is what scheduleOnRN is for. `completed` is false if the animation was
    // cancelled (i.e. we unmounted), in which case there's nothing to finish.
    lockupOpacity.value = withDelay(
      150,
      withSequence(
        withTiming(1, { duration: 700 }),
        withDelay(
          1300,
          withTiming(0, { duration: 400 }, (completed) => {
            if (completed) scheduleOnRN(finish);
          }),
        ),
      ),
    );

    // Belt-and-suspenders: whatever the cause, the splash must never be able
    // to block navigation forever. The animation above totals ~2.55s: if
    // finish() hasn't already fired by 4s, something's wrong with the
    // animation itself rather than the app, so move on anyway.
    const safetyTimeout = setTimeout(finish, 4000);

    return () => {
      cancelAnimation(glowScale);
      cancelAnimation(glowOpacity);
      cancelAnimation(lockupOpacity);
      cancelAnimation(lockupY);
      clearTimeout(safetyTimeout);
    };
  }, []);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
    transform: [{ scale: glowScale.value }],
  }));

  const lockupStyle = useAnimatedStyle(() => ({
    opacity: lockupOpacity.value,
    transform: [{ translateY: lockupY.value }],
  }));

  return (
    <View style={styles.container}>
      <Animated.View pointerEvents="none" style={[styles.glow, glowStyle]}>
        {/* Plain Views can't do a soft blur/gradient fade — this needed an
            actual radial gradient (SVG) to read as a glow instead of a
            hard-edged circle. */}
        <Svg width={320} height={320} viewBox="0 0 320 320">
          <Defs>
            <RadialGradient id="splashGlow" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor={colors.accent} stopOpacity={0.9} />
              <Stop offset="65%" stopColor={colors.accent} stopOpacity={0.25} />
              <Stop offset="100%" stopColor={colors.accent} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={160} cy={160} r={160} fill="url(#splashGlow)" />
        </Svg>
      </Animated.View>

      <Animated.View style={[styles.lockup, lockupStyle]}>
        <View style={styles.mark}>
          <Svg width={34} height={34} viewBox="0 0 24 24" fill="none">
            <Path
              d="M5 3.5C5 2.67 5.67 2 6.5 2H14L19 7V20.5C19 21.33 18.33 22 17.5 22H6.5C5.67 22 5 21.33 5 20.5V3.5Z"
              fill={colors.onAccent}
              opacity={0.92}
            />
            <Path d="M14 2L19 7H15C14.45 7 14 6.55 14 6V2Z" fill={colors.paper} opacity={0.55} />
          </Svg>
        </View>

        <Text style={styles.label}>Powered by</Text>
        <View style={styles.rule} />
        <Text style={styles.wordmark}>SMKTechnologies</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
  },

  glow: {
    position: "absolute",
    width: 320,
    height: 320,
  },

  lockup: {
    alignItems: "center",
    gap: 20,
    paddingHorizontal: 32,
  },

  mark: {
    width: 76,
    height: 76,
    borderRadius: 20,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    // A soft colored glow via shadow props (iOS renders this natively;
    // Android's shadow doesn't tint color, so the .glow blob above carries
    // the effect there — this adds a tighter halo on top where it can).
    shadowColor: colors.accent,
    shadowOpacity: 0.6,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },

  label: {
    fontFamily: fonts.interSemiBold,
    fontSize: 11.5,
    letterSpacing: 3,
    textTransform: "uppercase",
    color: colors.stoneDim,
  },

  rule: {
    width: 140,
    height: 1,
    backgroundColor: colors.accent,
    opacity: 0.8,
  },

  wordmark: {
    fontFamily: fonts.frauncesSemiBold,
    fontSize: 30,
    lineHeight: 36,
    textAlign: "center",
    color: colors.textPrimary,
    // Native shadow rendering (especially Android) doesn't blur nearly as
    // smoothly as a browser's CSS text-shadow — the same values that read
    // as a soft glow on web looked like a solid highlighted block on a real
    // device. Toned down: much lower opacity, smaller radius.
    textShadowColor: "rgba(184,127,66,0.35)",
    textShadowRadius: 8,
    textShadowOffset: { width: 0, height: 0 },
  },
});
