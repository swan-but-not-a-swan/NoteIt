import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Feather, type FeatherIconName } from "@react-native-vector-icons/feather/static";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import type { ThemeColors } from "@/theme/colors";
import { hexToRgba } from "@/lib/color";
import { bottomTabBarStyles as styles } from "@/theme/styles/app.styles";

export type MainTab = "folders" | "gallery";

type Props = {
  activeTab: MainTab;
  onSelectTab: (tab: MainTab) => void;
  onAdd: () => void;
  colors: ThemeColors;
};

// How far up the bar needs to be swiped before releasing counts as
// "swiped up" rather than "dragged and gave up".
const SWIPE_TRIGGER_DISTANCE = 44;

// Fully controlled, same as NewFolder/TopBar — this component only renders
// what it's given and reports taps back up; the screen (or router) owns
// which tab is actually active and what "add" does.
export default function BottomTabBar({ activeTab, onSelectTab, onAdd, colors }: Props) {
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

  return (
    <GestureDetector gesture={swipeUpGesture}>
      <View
        style={[
          styles.row,
          {
            backgroundColor: colors.surface,
            borderTopColor: colors.line,
            paddingBottom: insets.bottom + 10,
          },
        ]}
      >
        <TabButton
          icon="folder"
          label="Folders"
          active={activeTab === "folders"}
          colors={colors}
          onPress={() => onSelectTab("folders")}
        />

        <View style={styles.addSlot}>
          <Animated.View style={[styles.hint, hintStyle]}>
            <View style={[styles.hintPill, { backgroundColor: colors.bg, borderColor: colors.line }]}>
              <Text style={[styles.hintLabel, { color: colors.accent }]}>
                {readyToRelease ? "Release to add" : "Swipe up to add note"}
              </Text>
            </View>
          </Animated.View>

          <Pressable onPress={onAdd} hitSlop={8} accessibilityRole="button" accessibilityLabel="Add a picture-note">
            <Animated.View
              style={[
                styles.addButton,
                addButtonStyle,
                {
                  backgroundColor: colors.accent,
                  // boxShadow folds shadowColor/Opacity/Radius/Offset and
                  // Android's elevation into one cross-platform prop, so the
                  // tint and its alpha combine into a single colour here.
                  boxShadow: [
                    { offsetX: 0, offsetY: 5, blurRadius: 10, color: hexToRgba(colors.accent, 0.35) },
                  ],
                },
              ]}
            >
              <Feather name="plus" size={27} color={colors.onAccent} />
            </Animated.View>
          </Pressable>
        </View>

        <TabButton
          icon="image"
          label="Gallery"
          active={activeTab === "gallery"}
          colors={colors}
          onPress={() => onSelectTab("gallery")}
        />
      </View>
    </GestureDetector>
  );
}

type TabButtonProps = {
  icon: FeatherIconName;
  label: string;
  active: boolean;
  colors: ThemeColors;
  onPress: () => void;
};

function TabButton({ icon, label, active, colors, onPress }: TabButtonProps) {
  const tint = active ? colors.accent : colors.stoneDim;
  return (
    <Pressable onPress={onPress} hitSlop={8} style={styles.tab}>
      <Feather name={icon} size={20} color={tint} />
      <Text style={[styles.tabLabel, { color: tint }]}>{label}</Text>
    </Pressable>
  );
}
