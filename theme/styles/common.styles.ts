//* styles used by more than one component, referenced from the feature files
//* as `common.<name>`. Text styles are named by weight and size.

import { StyleSheet } from "react-native";
import { fonts } from "@/theme/fonts";

export const common = StyleSheet.create({
  //* layout
  fill: {
    flex: 1,
  },
  fillShrinkable: {
    flex: 1,
    minWidth: 0,
  },
  fullSize: {
    width: "100%",
    height: "100%",
  },
  fixedSize: {
    flexGrow: 0,
    flexShrink: 0,
  },
  gap10: {
    gap: 10,
  },
  row10: {
    flexDirection: "row",
    gap: 10,
  },
  wrapRow6: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  spacedRow14: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  spacedRow16: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },

  //* buttons
  iconButton30: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  iconButton36: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  iconButton38: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },

  //* dialogs (NewFolder, NewSnippet)
  dialogBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  dialogCard: {
    width: "100%",
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
  },
  dialogButton: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: "center",
  },

  //* pills and chips
  pill: {
    borderWidth: 1.5,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  chip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  snippetChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 5,
    paddingHorizontal: 11,
    maxWidth: 220,
  },
  snippetLabel: {
    fontFamily: fonts.interSemiBold,
    fontSize: 12,
    flexShrink: 1,
  },

  //* text
  dialogTitle: {
    fontFamily: fonts.frauncesSemiBold,
    fontSize: 18,
  },
  sectionLabel: {
    fontFamily: fonts.interSemiBold,
    fontSize: 11.5,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  errorText: {
    fontFamily: fonts.interRegular,
    fontSize: 12.5,
    marginBottom: 14,
  },
  regular12: {
    fontFamily: fonts.interRegular,
    fontSize: 12,
  },
  regular12_5: {
    fontFamily: fonts.interRegular,
    fontSize: 12.5,
  },
  regular13: {
    fontFamily: fonts.interRegular,
    fontSize: 13,
  },
  semiBold11_5: {
    fontFamily: fonts.interSemiBold,
    fontSize: 11.5,
  },
  semiBold12: {
    fontFamily: fonts.interSemiBold,
    fontSize: 12,
  },
  semiBold12_5: {
    fontFamily: fonts.interSemiBold,
    fontSize: 12.5,
  },
  semiBold13: {
    fontFamily: fonts.interSemiBold,
    fontSize: 13,
  },
  semiBold13_5: {
    fontFamily: fonts.interSemiBold,
    fontSize: 13.5,
  },
  bold13_5: {
    fontFamily: fonts.interBold,
    fontSize: 13.5,
  },
});
