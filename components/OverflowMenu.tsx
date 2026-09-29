import { useEffect, useRef, useState, type ReactNode } from "react";
import { Modal, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { Feather, type FeatherIconName } from "@react-native-vector-icons/feather/static";
import type { ThemeColors } from "@/theme/colors";
import GlassPressable from "./GlassPressable";
import { overflowMenuStyles as styles } from "@/theme/styles/app.styles";

export type OverflowMenuItem = {
  key: string;
  label: string;
  icon: FeatherIconName;
  onPress: () => void;
  destructive?: boolean;
};

type Props = {
  colors: ThemeColors;
  items: OverflowMenuItem[];
  accessibilityLabel?: string;
  /** Text beside the dots. The trigger then takes the shape of a labelled
   *  button rather than the round icon one. */
  label?: string;
};

export default function OverflowMenu({
  colors,
  items,
  accessibilityLabel = "More options",
  label,
}: Props) {
  const trigger = useRef<View>(null);
  const { width: screenW, height: screenH } = useWindowDimensions();
  const [anchor, setAnchor] = useState<MenuAnchor | null>(null);

  const open = () => {
    trigger.current?.measureInWindow((x, y, w, h) => {
      setAnchor(anchorFor(x, y, w, h, screenW, screenH));
    });
  };

  return (
    <>
      <GlassPressable
        ref={trigger}
        colors={colors}
        onPress={open}
        hitSlop={8}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button"
        style={label != null ? styles.labelledTrigger : styles.trigger}
      >
        <Feather name="more-horizontal" size={17} color={colors.textPrimary} />
        {label != null && (
          <Text style={[styles.triggerLabel, { color: colors.textPrimary }]}>{label}</Text>
        )}
      </GlassPressable>

      <OverflowMenuCard
        colors={colors}
        items={items}
        anchor={anchor}
        onClose={() => setAnchor(null)}
      />
    </>
  );
}

/** Where a card hangs from, worked out from the thing it belongs to: its
 *  vertical edge (`top`/`bottom`) and its horizontal one (`left`/`right`). */
export type MenuAnchor = { top?: number; bottom?: number; left?: number; right?: number };

/** The card grows away from what opened it, towards whichever side has the
 *  room: something low on the screen opens upward, and something on the left
 *  lines its card up leftward — anchoring it right would push the card off the
 *  screen and clip its labels. */
export function anchorFor(
  x: number,
  y: number,
  w: number,
  h: number,
  screenW: number,
  screenH: number,
): MenuAnchor {
  const opensUp = y + h / 2 > screenH / 2;
  const opensLeft = x + w / 2 < screenW / 2;
  return {
    ...(opensUp ? { bottom: screenH - y + 6 } : { top: y + h + 6 }),
    ...(opensLeft ? { left: Math.max(8, x) } : { right: Math.max(8, screenW - (x + w)) }),
  };
}

type CardProps = {
  colors: ThemeColors;
  items: OverflowMenuItem[];
  /** null keeps it closed. */
  anchor: MenuAnchor | null;
  onClose: () => void;
  /** Shown over the backdrop, opposite the card — what the menu is about.
   *  Nothing in the screen behind can paint above this modal, so anything the
   *  menu needs to show has to come through here. */
  preview?: ReactNode;
};

//* the rise: picks up where the held tile's own swell left off and settles
//* with the smallest overshoot. One spring for the picture and the card
//* together, because they are one object arriving, not two
const RISE = { damping: 16, stiffness: 230, mass: 0.7 };

// The menu on its own, placed at an anchor rather than under a button of its
// own — what a long press opens, where the thing pressed is the trigger.
export function OverflowMenuCard({ colors, items, anchor, onClose, preview }: CardProps) {
  // Driven off `anchor` rather than mount: the Modal keeps this component
  // alive between openings, so a mount-time animation would only ever play
  // once. Resetting to 0 on close is what lets the next long press rise again.
  const rise = useSharedValue(0);
  useEffect(() => {
    rise.set(anchor != null ? withSpring(1, RISE) : 0);
  }, [anchor, rise]);

  const risen = useAnimatedStyle(() => ({
    opacity: rise.get(),
    //* from just under the size the tile had grown to under the finger, so the
    //* picture carries on swelling rather than restarting
    transform: [{ scale: 0.88 + rise.get() * 0.12 }],
  }));

  const runItem = (item: OverflowMenuItem) => {
    onClose();
    //* the menu's own modal is still dismissing this frame, and iOS drops a
    //* present() issued during a dismiss — hand off once it's gone
    requestAnimationFrame(() => item.onPress());
  };

  return (
    <Modal visible={anchor != null} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        style={[styles.backdrop, preview != null && styles.backdropDim]}
        onPress={onClose}
        accessibilityLabel="Close menu"
      />

      {anchor != null && (
        <Animated.View
          pointerEvents="box-none"
          //* the whole screen in both modes: the card's anchor is measured from
          //* the screen's edges, and without a size of its own this layer was
          //* a zero-height strip at the top — a menu opening upward (More, by
          //* the dock) then hung its card above the screen, out of sight
          style={[styles.cardLayer, preview != null && styles.previewLayout, preview != null && risen]}
        >
          {preview}
          <View
            style={[
              styles.card,
              preview != null
                ? styles.cardInFlow
                : { top: anchor.top, bottom: anchor.bottom, left: anchor.left, right: anchor.right },
              { backgroundColor: colors.surface, borderColor: colors.line },
            ]}
          >
          {items.map((item, i) => (
            <Pressable
              key={item.key}
              onPress={() => runItem(item)}
              accessibilityRole="button"
              accessibilityLabel={item.label}
              style={[
                styles.item,
                i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
              ]}
            >
              <Feather
                name={item.icon}
                size={15}
                color={item.destructive === true ? colors.error : colors.textPrimary}
              />
              <Text
                style={[
                  styles.label,
                  { color: item.destructive === true ? colors.error : colors.textPrimary },
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          ))}
          </View>
        </Animated.View>
      )}
    </Modal>
  );
}
