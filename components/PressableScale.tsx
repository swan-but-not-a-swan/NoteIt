import { useState, type Ref } from "react";
import {
  Pressable,
  type GestureResponderEvent,
  type PressableProps,
  type PressableStateCallbackType,
  type StyleProp,
  type View,
  type ViewStyle,
} from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** How much a button grows while it's held: enough to feel under the finger,
 *  not so much that it knocks into its neighbours. */
const PRESSED_SCALE = 1.06;
//* quick and barely springy — a button answering a touch, not bouncing
const SPRING = { damping: 18, stiffness: 420, mass: 0.6 };

export type PressableScaleProps = Omit<PressableProps, "style"> & {
  /** Reaches the Pressable itself, for a caller that measures where it sits. */
  ref?: Ref<View>;
  style?: StyleProp<ViewStyle> | ((state: PressableStateCallbackType) => StyleProp<ViewStyle>);
};

// Pressable, plus the app's press feedback: the button grows slightly while a
// finger is on it and settles back when it lifts. Every button uses this rather
// than Pressable, so they all answer a touch the same way.
//
// The style callback is resolved here rather than by Pressable. The animated
// scale has to sit in the same style array, and Reanimated can only find it
// there when the array is handed over as a value, not produced by a callback
// Pressable runs later.
export default function PressableScale({ style, onPressIn, onPressOut, ...rest }: PressableScaleProps) {
  const [pressed, setPressed] = useState(false);
  const scale = useSharedValue(1);
  const grow = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));

  const handlePressIn = (e: GestureResponderEvent) => {
    setPressed(true);
    scale.set(withSpring(PRESSED_SCALE, SPRING));
    onPressIn?.(e);
  };

  const handlePressOut = (e: GestureResponderEvent) => {
    setPressed(false);
    scale.set(withSpring(1, SPRING));
    onPressOut?.(e);
  };

  const own = typeof style === "function" ? style({ pressed, hovered: false }) : style;

  return <AnimatedPressable {...rest} onPressIn={handlePressIn} onPressOut={handlePressOut} style={[own, grow]} />;
}
