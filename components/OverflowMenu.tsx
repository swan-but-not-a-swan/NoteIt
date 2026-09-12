import { useRef, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { Feather, type FeatherIconName } from "@react-native-vector-icons/feather/static";
import type { ThemeColors } from "@/theme/colors";
import { fonts } from "@/theme/fonts";

export type OverflowMenuItem = {
  key: string;
  label: string;
  icon: FeatherIconName;
  onPress: () => void;
  /** Tints the row red. For anything that destroys data. */
  destructive?: boolean;
};

type Props = {
  colors: ThemeColors;
  items: OverflowMenuItem[];
  accessibilityLabel?: string;
};

// The header's "…" button and the menu it drops.
//
// Self-contained: it owns the trigger, the open state and the popover, so a
// screen adding one writes a list of items and nothing else. That matters
// because two screens need the same menu — the viewer and a folder's grid —
// and the alternative was each of them carrying its own visible/anchor state.
export default function OverflowMenu({ colors, items, accessibilityLabel = "More options" }: Props) {
  const trigger = useRef<View>(null);
  const { width: screenW } = useWindowDimensions();
  //* non-null means open; it also carries where to draw
  const [anchor, setAnchor] = useState<{ top: number; right: number } | null>(null);

  const open = () => {
    // Measured at press time rather than remembered from layout: the header's
    // height moves with the safe-area inset, so a menu anchored once lands in
    // the wrong place after a rotation or on a different device.
    trigger.current?.measureInWindow((x, y, w, h) => {
      setAnchor({ top: y + h + 6, right: Math.max(8, screenW - (x + w)) });
    });
  };

  const runItem = (item: OverflowMenuItem) => {
    //* closed before the action runs: every item here opens a modal of its
    //* own, and iOS refuses to present one while another is still dismissing
    setAnchor(null);
    item.onPress();
  };

  return (
    <>
      <Pressable
        ref={trigger}
        onPress={open}
        hitSlop={8}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button"
        style={[styles.trigger, { backgroundColor: colors.surface }]}
      >
        <Feather name="more-horizontal" size={17} color={colors.textPrimary} />
      </Pressable>

      <Modal
        visible={anchor != null}
        transparent
        animationType="fade"
        onRequestClose={() => setAnchor(null)}
      >
        <Pressable
          style={styles.backdrop}
          onPress={() => setAnchor(null)}
          accessibilityLabel="Close menu"
        />

        {anchor != null && (
          <View
            style={[
              styles.card,
              {
                top: anchor.top,
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
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  card: {
    position: "absolute",
    minWidth: 184,
    borderWidth: 1,
    borderRadius: 12,
    overflow: "hidden",
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 13,
    paddingHorizontal: 14,
  },
  label: {
    fontFamily: fonts.interSemiBold,
    fontSize: 13.5,
  },
});
