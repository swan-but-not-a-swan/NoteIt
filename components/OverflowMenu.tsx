import { useRef, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { Feather, type FeatherIconName } from "@react-native-vector-icons/feather/static";
import type { ThemeColors } from "@/theme/colors";
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
      <Pressable
        ref={trigger}
        onPress={open}
        hitSlop={8}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button"
        style={[label != null ? styles.labelledTrigger : styles.trigger, { backgroundColor: colors.surface }]}
      >
        <Feather name="more-horizontal" size={17} color={colors.textPrimary} />
        {label != null && (
          <Text style={[styles.triggerLabel, { color: colors.textPrimary }]}>{label}</Text>
        )}
      </Pressable>

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
};

// The menu on its own, placed at an anchor rather than under a button of its
// own — what a long press opens, where the thing pressed is the trigger.
export function OverflowMenuCard({ colors, items, anchor, onClose }: CardProps) {
  const runItem = (item: OverflowMenuItem) => {
    onClose();
    //* the menu's own modal is still dismissing this frame, and iOS drops a
    //* present() issued during a dismiss — hand off once it's gone
    requestAnimationFrame(() => item.onPress());
  };

  return (
    <Modal visible={anchor != null} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close menu" />

      {anchor != null && (
        <View
          style={[
            styles.card,
            {
              top: anchor.top,
              bottom: anchor.bottom,
              left: anchor.left,
              right: anchor.right,
              backgroundColor: colors.surface,
              borderColor: colors.line,
            },
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
      )}
    </Modal>
  );
}
