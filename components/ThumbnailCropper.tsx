//! Manually reviewed since 14/09/2026

import { useEffect, useState } from "react";
import { Image as RNImage, Pressable, StyleSheet, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
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
  const [natural, setNatural] = useState<{ width: number; height: number } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    RNImage.getSize(
      sourceUri,
      (width, height) => {
        if (!cancelled) setNatural({ width, height });
      },
      () => {
        //* without the real size the crop can't be mapped onto the photo, so confirming stays disabled
        if (!cancelled) setError("Couldn't read that photo. Try a different one.");
      }
    );
    return () => {
      cancelled = true;
    };
  }, [sourceUri]);

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

  const handleConfirmAsync = async () => {
    if (natural == null || saving) return;
    setSaving(true);
    setError(null);
    try {
      const k = natural.width / baseWidth; //* natural pixels per base point (uniform on both axes)
      const pixelsPerPoint = k / scale.get();
      const effectiveWidth = baseWidth * scale.get();
      const effectiveHeight = baseHeight * scale.get();
      const windowLeftRelativeToImage = effectiveWidth / 2 - CROP_SIZE / 2 - translateX.get();
      const windowTopRelativeToImage = effectiveHeight / 2 - CROP_SIZE / 2 - translateY.get();

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
      setError("Couldn't save that crop. Try again.");
    } finally {
      setSaving(false);
    }
  };

  const canConfirm = natural != null && !saving;

  return (
    <View style={styles.screen}>
      <View style={[styles.topBar, { paddingTop: insets.top + 12 }]}>
        <Pressable onPress={onCancel} hitSlop={8}>
          <Text style={[styles.topBarAction, { color: colors.textPrimary }]}>Cancel</Text>
        </Pressable>
        <Text style={[styles.topBarTitle, { color: colors.textPrimary }]}>Crop thumbnail</Text>
        <Pressable onPress={handleConfirmAsync} hitSlop={8} disabled={!canConfirm}>
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
              {natural != null && <AnimatedImage source={{ uri: sourceUri }} style={imageAnimatedStyle} />}
            </View>
            <View style={styles.dim} />

            <View
              style={[
                styles.peephole,
                { width: CROP_SIZE, height: CROP_SIZE, borderRadius: CROP_RADIUS },
              ]}
            >
              {natural != null && <AnimatedImage source={{ uri: sourceUri }} style={peepholeImageStyle} />}
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
    </View>
  );
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
