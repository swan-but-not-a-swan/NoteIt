//! Manually reviewed since 14/09/2026

import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, { useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image, useImage } from "expo-image";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { Feather } from "@react-native-vector-icons/feather/static";
import { DARK_THEME } from "@/theme/colors";
import { fonts } from "@/theme/fonts";

const AnimatedImage = Animated.createAnimatedComponent(Image);

const CROP_SIZE = 280;
const CROP_RADIUS = 32;
const MIN_SCALE = 1;
const MAX_SCALE = 4;

const COVER_MAX_SIZE = 400;

const colors = DARK_THEME;

export type CropperContentProps = {
  sourceUri: string;
  onCancel: () => void;
  onConfirm: (croppedUri: string) => Promise<void>;
};

export function CropperContent({ sourceUri, onCancel, onConfirm }: CropperContentProps) {
  const insets = useSafeAreaInsets();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // One decode for the whole screen. The reference carries the photo's size,
  // and both images below render from it rather than from the uri, so the file
  // is never read twice. This used to take three passes over a camera-sized
  // photo — Image.getSize purely for the dimensions, then a load per image —
  // and the pass that held everything up produced no pixels at all.
  const image = useImage(sourceUri, {
    //* without the real size the crop can't be mapped onto the photo, so confirming stays disabled
    onError: () => setError("Couldn't read that photo. Try a different one."),
  });

  //* width and height are logical units; the file's own pixels — which is what
  //* the crop below is measured in — are those multiplied by the scale
  const natural =
    image != null
      ? { width: image.width * image.scale, height: image.height * image.scale }
      : null;

  const aspect = natural != null ? natural.width / natural.height : 1;
  const baseWidth = aspect >= 1 ? CROP_SIZE * aspect : CROP_SIZE;
  const baseHeight = aspect >= 1 ? CROP_SIZE : CROP_SIZE / aspect;

  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const stageWidth = useSharedValue(0);
  const stageHeight = useSharedValue(0);

  function clampTranslate(value: number, effectiveSize: number) {
    "worklet";
    const max = Math.max(0, (effectiveSize - CROP_SIZE) / 2);
    return Math.min(max, Math.max(-max, value));
  }

  const panGesture = Gesture.Pan().onChange((e) => {
    translateX.set(clampTranslate(translateX.get() + e.changeX, baseWidth * scale.get()));
    translateY.set(clampTranslate(translateY.get() + e.changeY, baseHeight * scale.get()));
  });

  const pinchGesture = Gesture.Pinch()
    .onStart(() => {
      savedScale.set(scale.get());
    })
    .onUpdate((e) => {
      const next = Math.min(MAX_SCALE, Math.max(MIN_SCALE, savedScale.get() * e.scale));
      const ratio = next / scale.get();
      //* zoom around the point between the fingers, measured from the stage centre like translate
      const focalX = e.focalX - stageWidth.get() / 2;
      const focalY = e.focalY - stageHeight.get() / 2;
      scale.set(next);
      // Clamped against the new scale so zooming out never leaves a gap
      // between the image edge and the crop window.
      translateX.set(clampTranslate(focalX - (focalX - translateX.get()) * ratio, baseWidth * next));
      translateY.set(clampTranslate(focalY - (focalY - translateY.get()) * ratio, baseHeight * next));
    });

  const composedGesture = Gesture.Simultaneous(panGesture, pinchGesture);

  const imageAnimatedStyle = useAnimatedStyle(() => ({
    width: baseWidth,
    height: baseHeight,
    transform: [
      { translateX: translateX.get() },
      { translateY: translateY.get() },
      { scale: scale.get() },
    ],
  }));

  const peepholeImageStyle = useAnimatedStyle(() => ({
    width: baseWidth,
    height: baseHeight,
    position: "absolute",
    left: CROP_SIZE / 2 - baseWidth / 2,
    top: CROP_SIZE / 2 - baseHeight / 2,
    transform: [
      { translateX: translateX.get() },
      { translateY: translateY.get() },
      { scale: scale.get() },
    ],
  }));

  const handleConfirm = () => {
    if (natural == null || saving) return;
    setSaving(true);
    setError(null);
    //* the shared values are read here, on the JS thread, so the crop below is
    //* a plain function of numbers and knows nothing about this screen
    confirmCropAsync({
      sourceUri,
      natural,
      baseWidth,
      baseHeight,
      scale: scale.get(),
      translateX: translateX.get(),
      translateY: translateY.get(),
      onConfirm,
      onError: () => setError("Couldn't save that crop. Try again."),
      onDone: () => setSaving(false),
    });
  };

  const canConfirm = natural != null && !saving;

  // A root of its own, not just the app's. This screen renders inside a
  // <Modal>, which on Android is a separate native window — the
  // GestureHandlerRootView at the app root doesn't reach into it, so the pan
  // and pinch below never received a single touch and the photo couldn't be
  // repositioned at all.
  return (
    <GestureHandlerRootView style={styles.screen}>
      <View style={[styles.topBar, { paddingTop: insets.top + 12 }]}>
        <Pressable onPress={onCancel} hitSlop={8}>
          <Text style={[styles.topBarAction, { color: colors.textPrimary }]}>Cancel</Text>
        </Pressable>
        <Text style={[styles.topBarTitle, { color: colors.textPrimary }]}>Crop thumbnail</Text>
        <Pressable onPress={handleConfirm} hitSlop={8} disabled={!canConfirm}>
          <Text style={[styles.topBarAction, { color: colors.accent, opacity: canConfirm ? 1 : 0.5 }]}>
            {saving ? "Saving…" : "Use Photo"}
          </Text>
        </Pressable>
      </View>

      <View style={styles.stage}>
        <GestureDetector gesture={composedGesture}>
          <View
            style={StyleSheet.absoluteFill}
            onLayout={(e) => {
              stageWidth.set(e.nativeEvent.layout.width);
              stageHeight.set(e.nativeEvent.layout.height);
            }}
          >
            <View style={styles.centeredLayer}>
              {image != null && <AnimatedImage source={image} style={imageAnimatedStyle} />}
            </View>
            <View style={styles.dim} />

            <View
              style={[
                styles.peephole,
                { width: CROP_SIZE, height: CROP_SIZE, borderRadius: CROP_RADIUS },
              ]}
            >
              {image != null && <AnimatedImage source={image} style={peepholeImageStyle} />}
            </View>
            <View
              style={[
                styles.peepholeBorder,
                { width: CROP_SIZE, height: CROP_SIZE, borderRadius: CROP_RADIUS },
              ]}
            />
          </View>
        </GestureDetector>
      </View>

      <View style={[styles.hintRow, { paddingBottom: 18 + insets.bottom }]}>
        {error != null ? (
          <Text style={[styles.hint, { color: colors.error }]}>{error}</Text>
        ) : (
          <>
            <Feather name="move" size={13} color={colors.stoneDim} />
            <Text style={[styles.hint, { color: colors.stoneDim }]}>Drag to reposition · pinch to zoom</Text>
          </>
        )}
      </View>
    </GestureHandlerRootView>
  );
}

/** What the crop needs from the screen. The shared values are already numbers
 *  by the time they arrive, so nothing in here touches Reanimated. */
type ConfirmCropParams = {
  sourceUri: string;
  natural: { width: number; height: number };
  baseWidth: number;
  baseHeight: number;
  scale: number;
  translateX: number;
  translateY: number;
  onConfirm: (croppedUri: string) => Promise<void>;
  onError: () => void;
  onDone: () => void;
};

// Outside the component deliberately. React Compiler can't lower a `try` that
// has a `finally`, and one anywhere in a component's body makes it skip that
// whole component — so CropperContent was going unoptimised for the sake of
// these six lines. Out here it is ordinary module code the compiler doesn't
// look at, and the error handling is unchanged.
async function confirmCropAsync({
  sourceUri,
  natural,
  baseWidth,
  baseHeight,
  scale,
  translateX,
  translateY,
  onConfirm,
  onError,
  onDone,
}: ConfirmCropParams) {
  try {
    const k = natural.width / baseWidth; //* natural pixels per base point (uniform on both axes)
    const pixelsPerPoint = k / scale;
    const effectiveWidth = baseWidth * scale;
    const effectiveHeight = baseHeight * scale;
    const windowLeftRelativeToImage = effectiveWidth / 2 - CROP_SIZE / 2 - translateX;
    const windowTopRelativeToImage = effectiveHeight / 2 - CROP_SIZE / 2 - translateY;

    //* round the size first and clamp the origin against it, so origin + size
    //* never lands a pixel past the edge (Android throws, iOS trims the square)
    const size = Math.max(1, Math.min(Math.floor(CROP_SIZE * pixelsPerPoint), natural.width, natural.height));
    const originX = Math.round(clamp(windowLeftRelativeToImage * pixelsPerPoint, 0, natural.width - size));
    const originY = Math.round(clamp(windowTopRelativeToImage * pixelsPerPoint, 0, natural.height - size));

    const rendered = await ImageManipulator.manipulate(sourceUri)
      .crop({ originX, originY, width: size, height: size })
      .resize({ width: Math.min(size, COVER_MAX_SIZE) })
      .renderAsync();
    const result = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 0.7 });
    await onConfirm(result.uri);
  } catch {
    onError();
  } finally {
    onDone();
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#000",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingBottom: 14,
  },
  topBarAction: {
    fontFamily: fonts.interSemiBold,
    fontSize: 14.5,
  },
  topBarTitle: {
    fontFamily: fonts.frauncesSemiBold,
    fontSize: 16,
  },
  stage: {
    flex: 1,
  },
  centeredLayer: {
    pointerEvents: "none",
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
  },
  dim: {
    pointerEvents: "none",
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  peephole: {
    pointerEvents: "none",
    position: "absolute",
    top: "50%",
    left: "50%",
    marginLeft: -CROP_SIZE / 2,
    marginTop: -CROP_SIZE / 2,
    overflow: "hidden",
    backgroundColor: "transparent",
  },
  peepholeBorder: {
    pointerEvents: "none",
    position: "absolute",
    top: "50%",
    left: "50%",
    marginLeft: -CROP_SIZE / 2,
    marginTop: -CROP_SIZE / 2,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.9)",
  },
  hintRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingTop: 18,
  },
  hint: {
    fontFamily: fonts.interRegular,
    fontSize: 12,
  },
});
