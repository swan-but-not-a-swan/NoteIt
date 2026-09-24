import { useEffect } from "react";
import { Modal, Pressable } from "react-native";
import { Image } from "expo-image";
import { Feather } from "@react-native-vector-icons/feather/static";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDecay,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { fullscreenPhotoStyles as styles } from "@/theme/styles/note.styles";

type Props = {
  /** The photo to show, or null when closed. */
  uri: string | null;
  onClose: () => void;
};

const FADE_MS = 180;
//* how far, or how fast, a downward drag has to go to count as "put it away"
const DISMISS_DISTANCE = 120;
const DISMISS_VELOCITY = 900;
const MAX_SCALE = 5;
const DOUBLE_TAP_SCALE = 2.5;
//* a pinch may overshoot either limit a little, then springs back to it
const PINCH_OVERSHOOT_MIN = 0.8;
const PINCH_OVERSHOOT_MAX = MAX_SCALE * 1.3;
//* dragging past an edge moves the photo at this fraction of the finger
const EDGE_RESISTANCE = 0.35;
const ZOOM_MS = 240;
const SETTLE = { damping: 20, stiffness: 220, mass: 0.6 };

function clamp(v: number, lo: number, hi: number) {
  "worklet";
  return Math.min(hi, Math.max(lo, v));
}

// A picture-note's photo on its own, uncropped, over everything. Opened by
// tapping the photo in the viewer.
//
// Pinch or double-tap zooms and a drag pans while zoomed. Closing is a single
// tap, a downward swipe at 1x, the close button, or Android's back button —
// the tap lands a moment late, since it waits to see whether a second one is
// coming and would mean zoom instead.
//
// The modal lives inside the viewer and never animates itself: the viewer
// fades in on mount and out before calling onClose, and back goes through
// the same fade, so every way of closing ends the same way.
export default function FullscreenPhoto({ uri, onClose }: Props) {
  return uri != null ? <PhotoViewer uri={uri} onClose={onClose} /> : null;
}

function PhotoViewer({ uri, onClose }: { uri: string; onClose: () => void }) {
  const insets = useSafeAreaInsets();

  //* 0 → 1 on open, back to 0 on the way out
  const fade = useSharedValue(0);
  //* how far the photo has been pulled down to dismiss (only at 1x)
  const dragY = useSharedValue(0);

  // Zoom state. The photo's transform is translate-then-scale about its
  // centre, so a point p (from the screen centre) is drawn at t + s * p.
  const scale = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);

  //* the box the gestures live in, and the photo's own pixel size — together
  //* they say how big the contained photo is, and so how far it can pan
  const boxW = useSharedValue(1);
  const boxH = useSharedValue(1);
  const imgW = useSharedValue(1);
  const imgH = useSharedValue(1);

  //* pinch bookkeeping, captured when the second finger lands
  const pinching = useSharedValue(false);
  const startScale = useSharedValue(1);
  const startTx = useSharedValue(0);
  const startTy = useSharedValue(0);
  const originX = useSharedValue(0);
  const originY = useSharedValue(0);
  //* whether this drag is panning a zoomed photo or pulling a 1x one away
  const panZoomed = useSharedValue(false);
  //* a pinch took part in this touch. Pinch and pan run together, so when the
  //* fingers lift the pan ends too — and without this it would re-aim the
  //* photo using bounds for the overshot scale while settle() is springing
  //* back to the real one, leaving an edge pulled away from the screen's
  const pinchedThisTouch = useSharedValue(false);

  useEffect(() => {
    fade.set(withTiming(1, { duration: FADE_MS }));
  }, [fade]);

  //* a worklet, so the gestures can call it on the UI thread and the close
  //* button can call it from JS; either way the fade finishes before onClose
  const fadeOutThenClose = () => {
    "worklet";
    fade.set(
      withTiming(0, { duration: FADE_MS }, (finished) => {
        "worklet";
        if (finished === true) scheduleOnRN(onClose);
      }),
    );
  };

  //* how far the photo may move from centre at scale s before an edge would
  //* come away from the screen's edge
  const maxOffset = (s: number) => {
    "worklet";
    const fit = Math.min(boxW.get() / imgW.get(), boxH.get() / imgH.get());
    const w = imgW.get() * fit * s;
    const h = imgH.get() * fit * s;
    return { x: Math.max(0, (w - boxW.get()) / 2), y: Math.max(0, (h - boxH.get()) / 2) };
  };

  //* after a pinch: back inside the zoom limits, and back inside the edges
  //* for whatever scale that leaves
  const settle = () => {
    "worklet";
    const s = clamp(scale.get(), 1, MAX_SCALE);
    const m = maxOffset(s);
    scale.set(withSpring(s, SETTLE));
    tx.set(withSpring(s === 1 ? 0 : clamp(tx.get(), -m.x, m.x), SETTLE));
    ty.set(withSpring(s === 1 ? 0 : clamp(ty.get(), -m.y, m.y), SETTLE));
  };

  const pinch = Gesture.Pinch()
    .onStart((e) => {
      pinching.set(true);
      pinchedThisTouch.set(true);
      startScale.set(scale.get());
      startTx.set(tx.get());
      startTy.set(ty.get());
      originX.set(e.focalX - boxW.get() / 2);
      originY.set(e.focalY - boxH.get() / 2);
    })
    .onUpdate((e) => {
      const s = clamp(startScale.get() * e.scale, PINCH_OVERSHOOT_MIN, PINCH_OVERSHOOT_MAX);
      const k = s / startScale.get();
      //* the part of the photo that was under the fingers stays under them,
      //* wherever they have moved to since
      tx.set(e.focalX - boxW.get() / 2 - k * (originX.get() - startTx.get()));
      ty.set(e.focalY - boxH.get() / 2 - k * (originY.get() - startTy.get()));
      scale.set(s);
    })
    .onEnd(() => {
      settle();
    })
    .onFinalize(() => {
      pinching.set(false);
    });

  const pan = Gesture.Pan()
    .minDistance(10)
    .onStart(() => {
      panZoomed.set(scale.get() > 1.01);
    })
    .onChange((e) => {
      //* two fingers down: the pinch is placing the photo
      if (pinching.get()) return;

      if (panZoomed.get()) {
        const m = maxOffset(scale.get());
        const nx = tx.get() + e.changeX;
        const ny = ty.get() + e.changeY;
        tx.set(Math.abs(nx) > m.x ? tx.get() + e.changeX * EDGE_RESISTANCE : nx);
        ty.set(Math.abs(ny) > m.y ? ty.get() + e.changeY * EDGE_RESISTANCE : ny);
        return;
      }

      dragY.set(e.translationY);
    })
    .onEnd((e) => {
      //* the pinch's settle() owns where the photo comes to rest
      if (pinching.get() || pinchedThisTouch.get()) return;

      if (panZoomed.get()) {
        const m = maxOffset(scale.get());
        //* past an edge: spring back to it; otherwise coast to a stop inside
        if (Math.abs(tx.get()) > m.x) tx.set(withSpring(clamp(tx.get(), -m.x, m.x), SETTLE));
        else tx.set(withDecay({ velocity: e.velocityX, clamp: [-m.x, m.x] }));
        if (Math.abs(ty.get()) > m.y) ty.set(withSpring(clamp(ty.get(), -m.y, m.y), SETTLE));
        else ty.set(withDecay({ velocity: e.velocityY, clamp: [-m.y, m.y] }));
        return;
      }

      if (e.translationY > DISMISS_DISTANCE || e.velocityY > DISMISS_VELOCITY) {
        //* carries on the way it was thrown while it fades
        dragY.set(withTiming(dragY.get() + 300, { duration: FADE_MS }));
        fadeOutThenClose();
      } else {
        dragY.set(withSpring(0));
      }
    })
    .onFinalize(() => {
      //* the pan begins on the first finger down and finalizes on the last
      //* finger up, so this spans the whole touch, pinch or not
      pinchedThisTouch.set(false);
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd((e, success) => {
      if (success !== true) return;
      if (scale.get() > 1.01) {
        scale.set(withTiming(1, { duration: ZOOM_MS }));
        tx.set(withTiming(0, { duration: ZOOM_MS }));
        ty.set(withTiming(0, { duration: ZOOM_MS }));
        return;
      }
      //* zoom in on the tapped spot: at 1x the point under the finger is p,
      //* and keeping it there at scale S means a translation of p * (1 - S)
      const px = e.x - boxW.get() / 2;
      const py = e.y - boxH.get() / 2;
      const m = maxOffset(DOUBLE_TAP_SCALE);
      scale.set(withTiming(DOUBLE_TAP_SCALE, { duration: ZOOM_MS }));
      tx.set(withTiming(clamp(px * (1 - DOUBLE_TAP_SCALE), -m.x, m.x), { duration: ZOOM_MS }));
      ty.set(withTiming(clamp(py * (1 - DOUBLE_TAP_SCALE), -m.y, m.y), { duration: ZOOM_MS }));
    });

  const singleTap = Gesture.Tap().onEnd((_e, success) => {
    if (success === true) fadeOutThenClose();
  });

  //* the double tap gets the first say, so a single tap only lands once the
  //* second tap has had its chance not to come
  const taps = Gesture.Exclusive(doubleTap, singleTap);
  //* pinch and pan share the fingers; any real movement fails the taps
  const gesture = Gesture.Race(Gesture.Simultaneous(pinch, pan), taps);

  const backdropStyle = useAnimatedStyle(() => ({
    //* thins as the photo is pulled away, the way the Photos app hints that
    //* letting go will put it back
    opacity:
      fade.get() * interpolate(Math.abs(dragY.get()), [0, 400], [1, 0.35], Extrapolation.CLAMP),
  }));

  const photoStyle = useAnimatedStyle(() => ({
    opacity: fade.get(),
    transform: [
      { translateX: tx.get() },
      { translateY: ty.get() + dragY.get() },
      {
        scale:
          scale.get() *
          interpolate(Math.abs(dragY.get()), [0, 400], [1, 0.88], Extrapolation.CLAMP),
      },
    ],
  }));

  const chromeStyle = useAnimatedStyle(() => ({ opacity: fade.get() }));

  return (
    <Modal
      visible
      transparent
      animationType="none"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={fadeOutThenClose}
    >
      {/* gestures inside an Android Modal need a root of their own: the modal
          is a separate window the app's root handler never sees */}
      <GestureHandlerRootView style={styles.root}>
        <Animated.View style={[styles.backdrop, backdropStyle]} />

        {/* The gestures sit on a box that never moves, so pinch and tap
            coordinates are screen coordinates; only the photo inside moves. */}
        <GestureDetector gesture={gesture}>
          <Animated.View
            style={styles.photo}
            onLayout={(e) => {
              boxW.set(e.nativeEvent.layout.width);
              boxH.set(e.nativeEvent.layout.height);
            }}
          >
            <Animated.View style={[styles.photo, photoStyle]}>
              <Image
                source={{ uri }}
                style={styles.image}
                contentFit="contain"
                accessibilityLabel="Photo, full screen"
                onLoad={(e) => {
                  imgW.set(e.source.width);
                  imgH.set(e.source.height);
                }}
              />
            </Animated.View>
          </Animated.View>
        </GestureDetector>

        <Animated.View style={[styles.closeWrap, { top: insets.top + 10 }, chromeStyle]}>
          <Pressable
            onPress={fadeOutThenClose}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Close photo"
            style={styles.closeButton}
          >
            <Feather name="x" size={18} color="#FFFFFF" />
          </Pressable>
        </Animated.View>
      </GestureHandlerRootView>
    </Modal>
  );
}
