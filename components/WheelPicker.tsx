import { useRef } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from "react-native-reanimated";
import { hexToRgba, type ThemeColors } from "@/theme/colors";
import { WHEEL_ROW_HEIGHT as ROW_H, wheelPickerStyles as styles } from "@/theme/styles/note.styles";

export type WheelItem = {
  key: string;
  label: string;
  /** A small colour square before the label — a folder's accent. */
  swatch?: string;
};

type Props = {
  items: WheelItem[];
  selectedIndex: number;
  /** Called as soon as the wheel settles on a row, not only when the panel is
   *  closed — the field above shows the choice while you're still turning. */
  onChange: (index: number) => void;
  colors: ThemeColors;
};

// A spinning list in the style of iOS's picker wheel, drawn in JS so it looks
// and behaves the same on Android and needs no native module.
//
// Rows snap into the band in the middle; the ones above and below fade and
// tilt away with their distance from it. Tapping a row turns the wheel to it.
export default function WheelPicker({ items, selectedIndex, onChange, colors }: Props) {
  const ref = useRef<Animated.ScrollView>(null);
  const offset = useSharedValue(selectedIndex * ROW_H);

  const onScroll = useAnimatedScrollHandler((e) => {
    offset.set(e.contentOffset.y);
  });

  const settle = (y: number) => {
    const index = Math.min(items.length - 1, Math.max(0, Math.round(y / ROW_H)));
    if (index !== selectedIndex) onChange(index);
  };

  const turnTo = (index: number, animated: boolean) => {
    ref.current?.scrollTo({ y: index * ROW_H, animated });
    if (index !== selectedIndex) onChange(index);
  };

  return (
    <View style={styles.wheel}>
      <View style={[styles.band, { backgroundColor: hexToRgba(colors.textPrimary, 0.08) }]} />
      <Animated.ScrollView
        ref={ref}
        onScroll={onScroll}
        scrollEventThrottle={16}
        snapToInterval={ROW_H}
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        //* starts on the current choice; contentOffset alone isn't honoured on
        //* every Android version, so layout puts it there too
        contentOffset={{ x: 0, y: selectedIndex * ROW_H }}
        onLayout={() => turnTo(selectedIndex, false)}
        onMomentumScrollEnd={(e) => settle(e.nativeEvent.contentOffset.y)}
        //* a slow drag that stops without a fling never starts momentum
        onScrollEndDrag={(e) => {
          if (Math.abs(e.nativeEvent.velocity?.y ?? 0) < 0.05) settle(e.nativeEvent.contentOffset.y);
        }}
      >
        {items.map((item, i) => (
          <WheelRow
            key={item.key}
            item={item}
            index={i}
            offset={offset}
            colors={colors}
            onPress={() => turnTo(i, true)}
          />
        ))}
      </Animated.ScrollView>
    </View>
  );
}

type RowProps = {
  item: WheelItem;
  index: number;
  offset: SharedValue<number>;
  colors: ThemeColors;
  onPress: () => void;
};

//* a plain Pressable, not PressableScale: a row is part of the wheel, and the
//* wheel's own turn is the feedback
function WheelRow({ item, index, offset, colors, onPress }: RowProps) {
  const style = useAnimatedStyle(() => {
    //* rows away from the band, signed: negative above it, positive below
    const rows = (index * ROW_H - offset.get()) / ROW_H;
    const distance = Math.abs(rows);
    return {
      opacity: interpolate(distance, [0, 1, 2, 3], [1, 0.5, 0.22, 0], Extrapolation.CLAMP),
      transform: [
        { perspective: 500 },
        { rotateX: `${interpolate(rows, [-3, 0, 3], [55, 0, -55], Extrapolation.CLAMP)}deg` },
        { scale: interpolate(distance, [0, 2], [1, 0.9], Extrapolation.CLAMP) },
      ],
    };
  });

  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={item.label}>
      <Animated.View style={[styles.row, style]}>
        {item.swatch != null && <View style={[styles.swatch, { backgroundColor: item.swatch }]} />}
        <Text style={[styles.rowLabel, { color: colors.textPrimary }]} numberOfLines={1}>
          {item.label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}
