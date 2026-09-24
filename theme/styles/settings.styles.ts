//* static styles for settings and the snippet dialog
//* each component imports its export as `styles`; theme colours stay inline there

import { StyleSheet } from "react-native";
import { fonts } from "@/theme/fonts";
import { common } from "@/theme/styles/common.styles";

//* app/(tabs)/settings.tsx
export const settingsScreenStyles = StyleSheet.create({
  container: common.fill,
  content: {
    paddingHorizontal: 18,
    paddingBottom: 24,
    gap: 24,
  },
  section: common.gap10,
  plusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  plusBadge: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  plusText: {
    flex: 1,
    gap: 2,
  },
  plusTitle: {
    fontFamily: fonts.frauncesSemiBold,
    fontSize: 16,
  },
  plusSubtitle: {
    fontFamily: fonts.interRegular,
    fontSize: 12.5,
    lineHeight: 17,
  },
  sectionLabel: {
    fontFamily: fonts.interBold,
    fontSize: 10.5,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  sectionHint: {
    fontFamily: fonts.interRegular,
    fontSize: 12.5,
    lineHeight: 18,
    marginTop: -4,
  },
  segment: {
    flexDirection: "row",
    borderWidth: 1,
    borderRadius: 14,
    padding: 5,
    gap: 5,
  },
  segmentItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    borderRadius: 10,
    paddingVertical: 10,
  },
  segmentLabel: common.semiBold13,
  snippetList: {
    gap: 8,
  },
  snippetRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  snippetBody: {
    flex: 1,
    minWidth: 0,
    gap: 1,
  },
  snippetName: common.semiBold13,
  snippetText: common.regular12,
  emptyLabel: common.regular12_5,
  addRow: {
    flexDirection: "row",
    gap: 8,
  },
  addInput: {
    flex: 1,
    minWidth: 0,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontFamily: fonts.interRegular,
    fontSize: 13,
  },
  addButton: {
    justifyContent: "center",
    borderRadius: 10,
    paddingHorizontal: 16,
  },
  addButtonLabel: {
    fontFamily: fonts.interBold,
    fontSize: 13,
  },
});

//* components/NewSnippet.tsx
export const newSnippetStyles = StyleSheet.create({
  flex: common.fill,
  backdrop: common.dialogBackdrop,
  card: common.dialogCard,
  titleRow: common.spacedRow14,
  title: {
    fontFamily: fonts.frauncesSemiBold,
    fontSize: 18,
    flexShrink: 1,
  },
  deleteButton: common.iconButton30,
  nameInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 11,
    paddingHorizontal: 14,
    fontFamily: fonts.interRegular,
    fontSize: 14,
    marginBottom: 18,
  },
  namePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "flex-start",
    maxWidth: "100%",
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginBottom: 18,
  },
  nameLabel: {
    fontFamily: fonts.interSemiBold,
    fontSize: 13,
    flexShrink: 1,
  },
  label: {
    fontFamily: fonts.interSemiBold,
    fontSize: 11.5,
    letterSpacing: 0.4,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 11,
    paddingHorizontal: 14,
    fontFamily: fonts.interRegular,
    fontSize: 14,
    lineHeight: 20,
    minHeight: 108,
    //* Android centres multiline text vertically by default, which strands a
    //* one-line snippet in the middle of the box
    textAlignVertical: "top",
  },
  hint: {
    fontFamily: fonts.interRegular,
    fontSize: 11.5,
    marginTop: 7,
    marginBottom: 18,
  },
  error: {
    fontFamily: fonts.interRegular,
    fontSize: 12.5,
    //* pulls up against the hint's margin so the message sits with the field
    //* it belongs to rather than floating between the two
    marginTop: -8,
    marginBottom: 14,
  },
  buttons: common.row10,
  button: common.dialogButton,
  buttonLabel: common.semiBold13_5,
});

//* components/SendFeedback.tsx
export const sendFeedbackStyles = StyleSheet.create({
  backdrop: common.dialogBackdrop,
  card: common.dialogCard,
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  title: {
    fontFamily: fonts.frauncesSemiBold,
    fontSize: 18,
    flexShrink: 1,
  },
  body: {
    fontFamily: fonts.interRegular,
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 14,
  },
  //* the address itself, set apart so it reads as the thing being offered
  addressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 11,
    paddingHorizontal: 12,
    marginBottom: 18,
  },
  address: {
    fontFamily: fonts.interSemiBold,
    fontSize: 13,
    flexShrink: 1,
  },
  buttons: common.row10,
  button: common.dialogButton,
  buttonLabel: common.semiBold13_5,
  //* the primary button carries an icon, so it needs a row of its own
  buttonRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
});
