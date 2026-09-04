import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
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
  const glowScale = useRef(new Animated.Value(1)).current;
  const glowOpacity = useRef(new Animated.Value(0.55)).current;
  const lockupOpacity = useRef(new Animated.Value(0)).current;
  const lockupY = useRef(new Animated.Value(14)).current;

  useEffect(() => {
    const breathe = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(glowScale, {
            toValue: 1.08,
            duration: 2250,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(glowOpacity, {
            toValue: 0.85,
            duration: 2250,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(glowScale, {
            toValue: 1,
            duration: 2250,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(glowOpacity, {
            toValue: 0.55,
            duration: 2250,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      ])
    );
    breathe.start();

    Animated.sequence([
      Animated.parallel([
        Animated.timing(lockupOpacity, {
          toValue: 1,
          duration: 700,
          delay: 150,
          useNativeDriver: true,
        }),
        Animated.spring(lockupY, {
          toValue: 0,
          delay: 150,
          useNativeDriver: true,
          damping: 14,
          stiffness: 120,
        }),
      ]),
      Animated.delay(1300),
      Animated.timing(lockupOpacity, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start(() => {
      breathe.stop();
      onFinish();
    });

    return () => breathe.stop();
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.glow,
          { opacity: glowOpacity, transform: [{ scale: glowScale }] },
        ]}
      >
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

      <Animated.View
        style={[
          styles.lockup,
          { opacity: lockupOpacity, transform: [{ translateY: lockupY }] },
        ]}
      >
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

        <Animated.Text style={styles.label}>Powered by</Animated.Text>
        <View style={styles.rule} />
        <Animated.Text style={styles.wordmark}>SMKTechnologies</Animated.Text>
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
