//* static styles for the folders tab, a folder's screen and the new/edit folder dialog
//* each component imports its export as `styles`; theme colours stay inline there

import { StyleSheet } from "react-native";
import { fonts } from "@/theme/fonts";
import { common } from "@/theme/styles/common.styles";

//* components/FoldersList.tsx
export const FOLDERS_LIST_PADDING = 18;

export const foldersListStyles = StyleSheet.create({
  scroll: common.fill,
  content: {
    paddingHorizontal: FOLDERS_LIST_PADDING,
    //* plus the floating tab bar's height, added at the call site
    paddingBottom: FOLDERS_LIST_PADDING,
    gap: 10,
  },
  item: common.gap10,
  newFolder: {
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 4,
  },
  newFolderLabel: common.semiBold12_5,
});

//* components/Folder.tsx
export const folderStyles = StyleSheet.create({
  row: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    overflow: "hidden",
  },
  tint: {
    pointerEvents: "none",
    ...StyleSheet.absoluteFill,
  },
  thumb: {
    width: 58,
    height: 58,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  thumbImage: common.fullSize,
  info: common.fillShrinkable,
  name: {
    fontFamily: fonts.frauncesSemiBold,
    fontSize: 15.5,
  },
  count: {
    fontFamily: fonts.interRegular,
    fontSize: 11.5,
    marginTop: 3,
  },
  editButton: common.iconButton36,
  chevron: {
    padding: 8,
  },
});

//* components/NewFolder.tsx
export const newFolderStyles = StyleSheet.create({
  backdrop: common.dialogBackdrop,
  card: common.dialogCard,
  titleRow: common.spacedRow16,
  title: common.dialogTitle,
  //* export and delete, side by side at the end of the title row
  titleActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  exportButton: common.iconButton30,
  deleteButton: common.iconButton30,
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    // marginBottom is set inline — depends on whether the "Remove photo" row is showing.
  },
  preview: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  previewImage: common.fullSize,
  previewBadge: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  removeThumbnail: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    alignSelf: "flex-start",
    marginBottom: 18,
  },
  removeThumbnailLabel: common.regular11,
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 11,
    paddingHorizontal: 14,
    fontFamily: fonts.interRegular,
    fontSize: 13,
  },
  label: common.sectionLabel,
  swatches: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 10,
    marginBottom: 20,
  },
  swatch: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 2.5,
  },
  error: common.errorText,
  buttons: common.row10,
  button: common.dialogButton,
  buttonLabel: common.semiBold12_5,
});

//* app/(tabs)/folder/[id].tsx
export const folderScreenStyles = StyleSheet.create({
  container: common.fill,
});

//* components/MoveNotesModal.tsx
export const moveNotesModalStyles = StyleSheet.create({
  backdrop: common.dialogBackdrop,
  card: common.dialogCard,
  titleRow: common.spacedRow16,
  title: common.dialogTitle,
  closeButton: common.iconButton30,
  //* the dialog is centred, so the list is capped rather than filling: a long
  //* folder list scrolls inside it and the title stays on screen
  list: {
    maxHeight: 360,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
  },
  thumb: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  thumbImage: common.fullSize,
  rowLabel: {
    flex: 1,
    minWidth: 0,
    fontFamily: fonts.interSemiBold,
    fontSize: 13,
  },
});
