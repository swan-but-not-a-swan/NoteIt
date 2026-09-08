import { useEffect, useState } from "react";
import { Image as RNImage, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
import { Image } from "expo-image";
import { useImageManipulator, SaveFormat } from "expo-image-manipulator";
import { Feather } from "@react-native-vector-icons/feather";
import type { ThemeColors } from "@/theme/colors";
import { fonts } from "@/theme/fonts";

// expo-image's Image is a native view like any other, so Reanimated can
// drive it once wrapped. Declared at module scope — creating it inside the
// component would produce a new component type every render and remount the
// image (and re-decode it) on each frame of a pan.
const AnimatedImage = Animated.createAnimatedComponent(Image);

const CROP_SIZE = 280;
const CROP_RADIUS = 32;
const MIN_SCALE = 1;
const MAX_SCALE = 4;

type Props = {
  visible: boolean;
  /** The freshly-picked, uncropped image. Cropping is skipped entirely
   *  while this is null — nothing renders. */
  sourceUri: string | null;
  colors: ThemeColors;
  onCancel: () => void;
  /** Called with a temp cropped-image URI. This component doesn't persist
   *  it anywhere — copying it into permanent storage is the caller's job,
   *  same as the rest of the media-saving flow. */
  onConfirm: (croppedUri: string) => void;
};

// A rounded-rectangle crop window over a pan/pinch-able photo. Renders the
// same source image twice — once full-screen and dimmed, once again inside
// a small `overflow: "hidden"` + `borderRadius` container using an
// identical transform, offset by the window's own position. Because both
// copies move together, the clipped copy reads as a "hole" cut into the
// dimmed one — RN has no native mask/composite API for an actual hole, so
// this duplicate-and-clip trick is the standard way to get a precise
// rounded-rect peephole without pulling in react-native-svg.
export default function ThumbnailCropper({ visible, sourceUri, colors, onCancel, onConfirm }: Props) {
  return (
    <Modal visible={visible && sourceUri != null} transparent animationType="fade" onRequestClose={onCancel}>
      {sourceUri != null && (
        // Keyed so a new photo (or re-opening after a cancel) always starts
        // from a fresh, centered, un-zoomed crop rather than carrying over
        // gesture state from whatever was cropped last.
        <CropperContent
          key={sourceUri}
          sourceUri={sourceUri}
          colors={colors}
          onCancel={onCancel}
          onConfirm={onConfirm}
        />
      )}
    </Modal>
  );
}

export type CropperContentProps = {
  sourceUri: string;
  colors: ThemeColors;
  onCancel: () => void;
  onConfirm: (croppedUri: string) => void;
};

// Exported so a shared modal (see home.tsx) can swap this in as its content
// directly, instead of nesting a second independent <Modal> — iOS refuses to
// present a second native modal on top of one that's already up, silently
// ignoring the attempt rather than erroring, and even sequencing close/open
// with manual delays proved fragile (see home.tsx's git history / chat log).
export function CropperContent({
  sourceUri,
  colors,
  onCancel,
  onConfirm,
}: CropperContentProps) {
  const [natural, setNatural] = useState<{ width: number; height: number } | null>(null);
  const [saving, setSaving] = useState(false);
  const context = useImageManipulator(sourceUri);

  useEffect(() => {
    let cancelled = false;
    RNImage.getSize(
      sourceUri,
      (width, height) => {
        if (!cancelled) setNatural({ width, height });
      },
      () => {
        if (!cancelled) setNatural({ width: 1, height: 1 }); // fallback: treat as square
      }
    );
    return () => {
      cancelled = true;
    };
  }, [sourceUri]);

  // "Cover" framing: at scale 1, the image's shorter natural dimension
  // exactly fills the crop window, same starting point as Instagram/iOS
  // photo crop.
  const aspect = natural != null ? natural.width / natural.height : 1;
  const baseWidth = aspect >= 1 ? CROP_SIZE * aspect : CROP_SIZE;
  const baseHeight = aspect >= 1 ? CROP_SIZE : CROP_SIZE / aspect;

  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  function clampTranslate(value: number, effectiveSize: number) {
    "worklet";
    const max = Math.max(0, (effectiveSize - CROP_SIZE) / 2);
    return Math.min(max, Math.max(-max, value));
  }

  const panGesture = Gesture.Pan()
    .onStart(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    })
    .onUpdate((e) => {
      translateX.value = clampTranslate(savedTranslateX.value + e.translationX, baseWidth * scale.value);
      translateY.value = clampTranslate(savedTranslateY.value + e.translationY, baseHeight * scale.value);
    });

  const pinchGesture = Gesture.Pinch()
    .onStart(() => {
      savedScale.value = scale.value;
    })
    .onUpdate((e) => {
      const next = Math.min(MAX_SCALE, Math.max(MIN_SCALE, savedScale.value * e.scale));
      scale.value = next;
      // Re-clamp pan against the new scale so zooming out never leaves a
      // gap between the image edge and the crop window.
      translateX.value = clampTranslate(translateX.value, baseWidth * next);
      translateY.value = clampTranslate(translateY.value, baseHeight * next);
    });

  const composedGesture = Gesture.Simultaneous(panGesture, pinchGesture);

  const imageAnimatedStyle = useAnimatedStyle(() => ({
    width: baseWidth,
    height: baseHeight,
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  // The peephole container's own top-left sits at (stageCenter - CROP_SIZE/2)
  // in stage coordinates, while the backdrop image's top-left sits at
  // (stageCenter - base{Width,Height}/2). This offset is the difference
  // between those two, i.e. what re-expresses "centered in the stage" as
  // "centered in the peephole" — it's a fixed layout constant, independent
  // of the live pan/zoom transform (which is identical on both copies and
  // composes the same way regardless).
  const peepholeImageStyle = useAnimatedStyle(() => ({
    width: baseWidth,
    height: baseHeight,
    position: "absolute",
    left: CROP_SIZE / 2 - baseWidth / 2,
    top: CROP_SIZE / 2 - baseHeight / 2,
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  const handleConfirmAsync = async () => {
    if (natural == null || saving) return;
    setSaving(true);
    try {
      const k = natural.width / baseWidth; // natural pixels per base point (uniform on both axes)
      const effectiveWidth = baseWidth * scale.value;
      const effectiveHeight = baseHeight * scale.value;
      const windowLeftRelativeToImage = effectiveWidth / 2 - CROP_SIZE / 2 - translateX.value;
      const windowTopRelativeToImage = effectiveHeight / 2 - CROP_SIZE / 2 - translateY.value;
      const cropSize = CROP_SIZE * (k / scale.value);

      const originX = clamp(windowLeftRelativeToImage * (k / scale.value), 0, natural.width - cropSize);
      const originY = clamp(windowTopRelativeToImage * (k / scale.value), 0, natural.height - cropSize);

      const rendered = await context
        .crop({ originX: Math.round(originX), originY: Math.round(originY), width: Math.round(cropSize), height: Math.round(cropSize) })
        .renderAsync();
      const result = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 0.9 });
      onConfirm(result.uri);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.screen}>
      <View style={styles.topBar}>
        <Pressable onPress={onCancel} hitSlop={8}>
          <Text style={styles.topBarAction}>Cancel</Text>
        </Pressable>
        <Text style={[styles.topBarTitle, { color: colors.textPrimary }]}>Crop thumbnail</Text>
        <Pressable onPress={handleConfirmAsync} hitSlop={8} disabled={saving || natural == null}>
          <Text style={[styles.topBarAction, { color: colors.accent, opacity: saving || natural == null ? 0.5 : 1 }]}>
            {saving ? "Saving…" : "Use Photo"}
          </Text>
        </Pressable>
      </View>

      <View style={styles.stage}>
        <GestureDetector gesture={composedGesture}>
          <View style={StyleSheet.absoluteFill}>
            {/* dimmed full image */}
            <View style={styles.centeredLayer}>
              <AnimatedImage source={{ uri: sourceUri }} style={imageAnimatedStyle} />
            </View>
            <View style={styles.dim} />

            {/* peephole: identical transform, clipped to the crop window */}
            <View
              style={[
                styles.peephole,
                { width: CROP_SIZE, height: CROP_SIZE, borderRadius: CROP_RADIUS },
              ]}
            >
              <AnimatedImage source={{ uri: sourceUri }} style={peepholeImageStyle} />
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

      <View style={styles.hintRow}>
        <Feather name="move" size={13} color={colors.stoneDim} />
        <Text style={[styles.hint, { color: colors.stoneDim }]}>Drag to reposition · pinch to zoom</Text>
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
    paddingTop: 56,
    paddingBottom: 14,
  },
  topBarAction: {
    fontFamily: fonts.interSemiBold,
    fontSize: 14.5,
    color: "#F3EAD9",
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
    paddingVertical: 18,
  },
  hint: {
    fontFamily: fonts.interRegular,
    fontSize: 12,
  },
});
