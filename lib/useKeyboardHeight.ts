import { useEffect, useState } from "react";
import { Keyboard, Platform, type KeyboardEvent } from "react-native";
import { Easing, useSharedValue, withTiming, type SharedValue } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * How much of the screen the keyboard covers: a number for layout (padding a
 * scroll view clear of it) and a shared value that moves with the keyboard, for
 * something riding on top of it.
 *
 * iOS announces the keyboard before it moves, with how long it will take, so the
 * shared value runs alongside it. Android only reports once it has arrived, so
 * there it catches up with a short slide.
 *
 * Measured from the very bottom of the screen on both platforms. iOS reports it
 * that way already; Android reports the keyboard without the navigation bar
 * under it, and the app draws edge to edge down to the screen's bottom edge, so
 * the bar's inset is added back — without it, whatever rides on the keyboard
 * sat a navigation bar's height too low, half behind the keys.
 *
 * Reanimated's useAnimatedKeyboard would do this, but it is deprecated in favour
 * of react-native-keyboard-controller, a native module the app doesn't have.
 */
export function useKeyboardHeight(): { height: number; animated: SharedValue<number> } {
  const [height, setHeight] = useState(0);
  const animated = useSharedValue(0);
  const { bottom: bottomInset } = useSafeAreaInsets();

  useEffect(() => {
    const ios = Platform.OS === "ios";

    const show = (e: KeyboardEvent) => {
      const next = e.endCoordinates.height + (ios ? 0 : bottomInset);
      setHeight(next);
      animated.set(
        withTiming(next, { duration: ios ? e.duration || 250 : 180, easing: Easing.out(Easing.cubic) }),
      );
    };
    const hide = (e: KeyboardEvent) => {
      setHeight(0);
      animated.set(withTiming(0, { duration: ios ? e.duration || 250 : 160, easing: Easing.out(Easing.cubic) }));
    };

    const subs = [
      Keyboard.addListener(ios ? "keyboardWillShow" : "keyboardDidShow", show),
      Keyboard.addListener(ios ? "keyboardWillHide" : "keyboardDidHide", hide),
    ];
    return () => subs.forEach((s) => s.remove());
  }, [animated, bottomInset]);

  return { height, animated };
}
