import { useState } from "react";
import { Platform } from "react-native";
import { Gesture } from "react-native-gesture-handler";
import { useSharedValue, withTiming } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import * as Haptics from "expo-haptics";

// How long the press must be held before the swipe half arms.
const HOLD_MS = 350;
// How far up the finger travels after that before releasing counts as "add".
const SWIPE_DISTANCE = 90;

/**
 * Hold, then swipe up, to start a picture-note.
 *
 * A single Pan with `activateAfterLongPress` rather than a LongPress plus a
 * separate Pan: the hold and the drag are one continuous recognition, so the
 * finger never lifts between them and there's no handoff between two
 * handlers to get wrong. The gesture simply doesn't activate until the hold
 * has been satisfied, which is also what stops a plain tap or a scroll from
 * ever reaching it.
 *
 * `progress` runs 0 -> 1 as the swipe approaches the trigger distance, and is
 * a shared value so the overlay can grow on the UI thread while the finger is
 * still down.
 */
export function useHoldToAdd(onTrigger: () => void) {
  const [holding, setHolding] = useState(false);
  const [readyToRelease, setReadyToRelease] = useState(false);
  const progress = useSharedValue(0);

  const beginHold = () => {
    // The haptic fires on activation, not on touch-down, so it confirms the
    // hold registered rather than just acknowledging a finger.
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {
        // no taptic engine — the visual half still does its job
      });
    }
    setHolding(true);
  };

  const endHold = () => {
    setHolding(false);
    setReadyToRelease(false);
  };

  const gesture = Gesture.Pan()
    .activateAfterLongPress(HOLD_MS)
    .onStart(() => {
      progress.set(0);
      scheduleOnRN(beginHold);
    })
    .onUpdate((e) => {
      // Downward drag is ignored rather than clamped negative, so pulling back
      // past the start just parks the overlay at its resting size.
      const up = Math.max(0, -e.translationY);
      const p = Math.min(1, up / SWIPE_DISTANCE);
      progress.set(p);
      scheduleOnRN(setReadyToRelease, p >= 1);
    })
    .onEnd((e) => {
      if (-e.translationY >= SWIPE_DISTANCE) {
        scheduleOnRN(onTrigger);
      }
    })
    // Runs whether the gesture succeeded, failed, or was taken over by
    // another one, so the overlay can never be left stranded on screen.
    .onFinalize(() => {
      progress.set(withTiming(0, { duration: 160 }));
      scheduleOnRN(endHold);
    });

  return { gesture, holding, readyToRelease, progress };
}
