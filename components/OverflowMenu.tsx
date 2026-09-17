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
};

export default function OverflowMenu({ colors, items, accessibilityLabel = "More options" }: Props) {
  const trigger = useRef<View>(null);
  const { width: screenW } = useWindowDimensions();
  const [anchor, setAnchor] = useState<{ top: number; right: number } | null>(null);

  const open = () => {
    trigger.current?.measureInWindow((x, y, w, h) => {
      setAnchor({ top: y + h + 6, right: Math.max(8, screenW - (x + w)) });
    });
  };

  const runItem = (item: OverflowMenuItem) => {
    setAnchor(null);
    //* the menu's own modal is still dismissing this frame, and iOS drops a
    //* present() issued during a dismiss — hand off once it's gone
    requestAnimationFrame(() => item.onPress());
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
