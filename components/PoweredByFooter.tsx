import { StyleSheet, Text } from "react-native";
import type { ThemeColors } from "@/theme/colors";
import { fonts } from "@/theme/fonts";

type Props = {
  colors: ThemeColors;
};

// Drop this at the bottom of every screen. Same footer text/style used on
// the splash screen (in-app-splash.tsx) and the reference app's Settings
// footer — keep those three in sync if the brand name ever changes.
export default function PoweredByFooter({ colors }: Props) {
  return (
    <Text style={[styles.text, { color: colors.stoneDim }]}>
      Powered by SMKTechnologies
    </Text>
  );
}

const styles = StyleSheet.create({
  text: {
    fontFamily: fonts.interRegular,
    fontSize: 11,
    textAlign: "center",
    paddingVertical: 10,
  },
});
