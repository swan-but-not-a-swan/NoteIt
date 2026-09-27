//* static styles for export and import: the preview screen (app/import.tsx) and the export progress dialog
//* each component imports its export as `styles`; theme colours stay inline there

import { StyleSheet } from "react-native";
import { fonts } from "@/theme/fonts";
import { common } from "@/theme/styles/common.styles";

/** Horizontal inset shared by the summary block and the floating bar. */
const SIDE_PAD = 18;

export const importScreenStyles = StyleSheet.create({
  screen: common.fill,
  headerButton: common.iconButton38,

  //* reading the file
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 32,
  },
  loadingTitle: {
    fontFamily: fonts.frauncesSemiBold,
    fontSize: 17,
    textAlign: "center",
  },
  loadingDetail: {
    ...common.regular12,
    textAlign: "center",
  },

  //* what the file holds, above the grid
  summary: {
    paddingHorizontal: SIDE_PAD,
    paddingBottom: 12,
    gap: 12,
  },
  meta: common.regular12,
  notice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  noticeText: {
    ...common.regular11_5,
    flex: 1,
    lineHeight: 16,
  },
  tags: common.wrapRow6,
  tag: common.chip,
  tagLabel: common.semiBold11,
  grid: common.fill,

  //* Discard / Add, floating over the bottom of the grid like the tab bar's dock
  barWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 14,
  },
  bar: {
    flexDirection: "row",
    gap: 10,
    borderRadius: 28,
    padding: 10,
  },
  barButton: {
    flex: 1,
    height: 48,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  barButtonPrimary: {
    flex: 2,
  },
  barButtonLabel: common.bold12_5,

  //* one note, opened from the grid
  viewer: common.fill,
  viewerBody: {
    flex: 1,
    paddingBottom: 12,
  },

  //* the "Add to" row, for a single note's destination
  destination: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    height: 44,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  destinationHint: common.regular11_5,
  destinationDot: {
    width: 10,
    height: 10,
    borderRadius: 3,
  },
  destinationName: {
    ...common.semiBold12_5,
    flex: 1,
  },
});

//* components/ExportProgress.tsx
export const exportProgressStyles = StyleSheet.create({
  backdrop: common.dialogBackdrop,
  card: common.dialogCard,
  title: {
    ...common.dialogTitle,
    marginBottom: 16,
  },
  track: {
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 8,
  },
  fill: {
    height: 8,
    borderRadius: 4,
  },
  detail: {
    ...common.regular12,
    marginBottom: 18,
  },
  button: common.dialogButton,
  buttonLabel: common.semiBold12_5,
});
