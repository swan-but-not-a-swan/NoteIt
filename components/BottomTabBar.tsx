import { useEffect, useRef, useState, type ReactNode } from "react";
import { Text, View, type LayoutRectangle } from "react-native";
import { Image } from "expo-image";
import { Feather, type FeatherIconName } from "@react-native-vector-icons/feather/static";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { hexToRgba, type ThemeColors } from "@/theme/colors";
import { flatSurface } from "@/theme/glass";
import GlassSurface from "./GlassSurface";
import PressableScale from "./PressableScale";
import type { FolderModel } from "@/models/FolderModel";
import { bottomTabBarStyles as styles } from "@/theme/styles/app.styles";

export type MainTab = "folders" | "gallery";

type Props = {
  activeTab: MainTab;
  onSelectTab: (tab: MainTab) => void;
  onAdd: () => void;
  colors: ThemeColors;
  /** The folder the gallery tab is scoped to, or null for the plain gallery.
   *  While set, the tab stands for that folder: its name and cover replace
   *  "Gallery" and the image icon, until the user goes back to the folders. */
  galleryFolder?: FolderModel | null;
};

// How far up the bar needs to be swiped before releasing counts as
// "swiped up" rather than "dragged and gave up".
const SWIPE_TRIGGER_DISTANCE = 44;

/** The dock's gap to the screen's bottom edge where there's no safe-area inset
 *  to sit on. The side gaps are in the stylesheet. */
const DOCK_EDGE_GAP = 12;

/** The lens's footprint — the same as a dock button's (dockButton). */
const LENS_W = 64;
const LENS_H = 46;
//* a touch of overshoot, so the lens lands the way iOS 26's tab bar glass does
const LENS_SPRING = { damping: 17, stiffness: 190, mass: 0.8 };

// Fully controlled, same as NewFolder/TopBar — this component only renders
// what it's given and reports taps back up; the screen (or router) owns
// which tab is actually active and what "add" does.
export default function BottomTabBar({ activeTab, onSelectTab, onAdd, colors, galleryFolder = null }: Props) {
  const insets = useSafeAreaInsets();
  const [readyToRelease, setReadyToRelease] = useState(false);

  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const progress = useSharedValue(0); // 0 → 1 as the bar is dragged toward the trigger distance

  // The swipe lives on the whole bar, not just the add button, but
  // activeOffsetY still holds it pending until there's real upward
  // movement — otherwise it would win the gesture arena against the
  // Folders/Gallery tab Pressables on every plain tap.
  const swipeUpGesture = Gesture.Pan()
    .activeOffsetY(-10)
    .onUpdate((e) => {
      const dy = Math.min(0, e.translationY); // ignore downward drag entirely
      translateY.value = dy;
      const p = Math.min(1, -dy / SWIPE_TRIGGER_DISTANCE);
      progress.value = p;
      scale.value = 1 + p * 0.12;
      scheduleOnRN(setReadyToRelease, p >= 1);
    })
    .onEnd((e) => {
      const draggedUp = -Math.min(0, e.translationY);
      if (draggedUp >= SWIPE_TRIGGER_DISTANCE) {
        scheduleOnRN(onAdd);
      }
      translateY.value = withSpring(0);
      scale.value = withSpring(1);
      progress.value = withSpring(0);
      scheduleOnRN(setReadyToRelease, false);
    });

  const addButtonStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
  }));

  const hintStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: -progress.value * 8 }],
  }));

  // The lens that marks the tab you're on. One lens that travels between the
  // two tabs, rather than one per tab fading in and out, so moving between
  // Folders and Gallery reads as the glass sliding across — stretching as it
  // goes and settling where it lands, the way iOS 26's tab bars move theirs.
  const [slots, setSlots] = useState<Partial<Record<MainTab, LayoutRectangle>>>({});
  const lensX = useSharedValue(0);
  const lensStretch = useSharedValue(1);
  const lensPlaced = useRef(false);
  const target = slots[activeTab];
  useEffect(() => {
    if (target == null) return;
    const x = target.x + (target.width - LENS_W) / 2;
    //* the first placement just appears; only a change of tab travels
    if (!lensPlaced.current) {
      lensPlaced.current = true;
      lensX.set(x);
      return;
    }
    lensX.set(withSpring(x, LENS_SPRING));
    lensStretch.set(withSequence(withTiming(1.35, { duration: 140 }), withSpring(1, LENS_SPRING)));
  }, [target?.x, target?.width, activeTab, lensX, lensStretch, target]);
  const lensStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: lensX.get() }, { scaleX: lensStretch.get() }],
  }));
  const placeSlot = (tab: MainTab) => (layout: LayoutRectangle) =>
    setSlots((current) => ({ ...current, [tab]: layout }));

  return (
    <GestureDetector gesture={swipeUpGesture}>
      {/* the full-width strip only holds the dock off the screen's edges; the
          pages show through everything around it */}
      <View style={[styles.dockWrap, { paddingBottom: insets.bottom > 0 ? insets.bottom : DOCK_EDGE_GAP }]}>
        {/* real Liquid Glass where iOS has it, the painted one everywhere
            else — the dock is the app's most-seen chrome, so it is the surface
            worth spending the native material on */}
        <GlassSurface colors={colors} lift="float" style={styles.dock}>
          {/* behind the buttons, so it lights the icon without covering it.
              Its colour never changes after the first draw — on Android a
              rounded view whose background colour changes loses its rounding */}
          {target != null && (
            <Animated.View
              style={[
                styles.dockLens,
                {
                  top: target.y + (target.height - LENS_H) / 2,
                  width: LENS_W,
                  height: LENS_H,
                  backgroundColor: hexToRgba(colors.accent, 0.16),
                },
                lensStyle,
              ]}
            />
          )}

          <DockButton
            icon="folder"
            label="Folders"
            active={activeTab === "folders"}
            colors={colors}
            onPress={() => onSelectTab("folders")}
            onSlotLayout={placeSlot("folders")}
          />

          <View style={styles.addSlot}>
            <Animated.View style={[styles.hint, hintStyle]}>
              <View style={[styles.hintPill, { backgroundColor: colors.bg, borderColor: colors.line }]}>
                <Text style={[styles.hintLabel, { color: colors.accent }]}>
                  {readyToRelease ? "Release to add" : "Swipe up to add note"}
                </Text>
              </View>
            </Animated.View>

            <PressableScale onPress={onAdd} hitSlop={8} accessibilityRole="button" accessibilityLabel="Add a picture-note">
              <Animated.View
                style={[
                  styles.addButton,
                  addButtonStyle,
                  //* flat even on iOS 26: it sits on the dock's glass, and glass can't
                  //* sample glass — a solid primary button on it, the way iOS draws one
                  flatSurface(colors, { tint: colors.accent, strength: "fill" }),
                ]}
              >
                <Feather name="plus" size={25} color={colors.onAccent} />
              </Animated.View>
            </PressableScale>
          </View>

          <DockButton
            icon="image"
            iconNode={
              galleryFolder != null ? (
                <FolderTabIcon folder={galleryFolder} active={activeTab === "gallery"} colors={colors} />
              ) : undefined
            }
            label={galleryFolder != null ? galleryFolder.name : "Gallery"}
            active={activeTab === "gallery"}
            colors={colors}
            onPress={() => onSelectTab("gallery")}
            onSlotLayout={placeSlot("gallery")}
          />
        </GlassSurface>
      </View>
    </GestureDetector>
  );
}

type DockButtonProps = {
  icon: FeatherIconName;
  /** Drawn instead of `icon` when given — the scoped folder's cover. */
  iconNode?: ReactNode;
  /** Not shown — the dock is icons only — but still what a screen reader says. */
  label: string;
  active: boolean;
  colors: ThemeColors;
  onPress: () => void;
  /** Where this button's slot sits in the dock, for the sliding lens. */
  onSlotLayout: (layout: LayoutRectangle) => void;
};

//* icon only, like the dock it's modelled on. With no label to colour, the
//* tab you're on is marked by the dock's sliding lens behind its icon
function DockButton({ icon, iconNode, label, active, colors, onPress, onSlotLayout }: DockButtonProps) {
  return (
    <PressableScale
      onPress={onPress}
      hitSlop={8}
      style={styles.dockSlot}
      onLayout={(e) => onSlotLayout(e.nativeEvent.layout)}
      accessibilityRole="tab"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
    >
      <View style={styles.dockButton}>
        {iconNode ?? <Feather name={icon} size={24} color={active ? colors.accent : colors.stone} />}
      </View>
    </PressableScale>
  );
}

// The scoped gallery tab's icon, drawn the way the folder list draws a folder:
// its accent behind, the cover on top, or the folder glyph when it has none.
function FolderTabIcon({ folder, active, colors }: { folder: FolderModel; active: boolean; colors: ThemeColors }) {
  return (
    <View
      style={[
        styles.folderThumb,
        { backgroundColor: folder.accent, borderColor: active ? colors.accent : colors.line },
      ]}
    >
      {folder.coverUri != null ? (
        <Image
          source={{ uri: folder.coverUri }}
          style={styles.folderThumbImage}
          contentFit="cover"
          cachePolicy="memory-disk"
        />
      ) : (
        <Feather name="folder" size={12} color="rgba(255,255,255,0.85)" />
      )}
    </View>
  );
}
