//* static styles for the gallery tab, search, and the compare screen
//* each component imports its export as `styles`; theme colours stay inline there

import { StyleSheet } from "react-native";
import { fonts } from "@/theme/fonts";
import { common } from "@/theme/styles/common.styles";
import { BAR_BUTTON_HEIGHT } from "@/theme/styles/app.styles";

//* components/GalleryView.tsx
export const galleryViewStyles = StyleSheet.create({
  container: common.fill,
  compareBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  compareGo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: BAR_BUTTON_HEIGHT, //* the same height as the More button beside it
    borderRadius: 10,
    paddingHorizontal: 16,
  },
  compareGoLabel: common.bold13_5,
  //* floats the folder view's "Gallery" pill over the bottom of the grid, high
  //* enough to clear the tab bar's add button, which rises 24pt above the bar.
  //* Full width but touch-transparent, so the tiles either side stay pressable
  showAllDock: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 40,
    alignItems: "center",
    pointerEvents: "box-none",
  },
});

//* components/GalleryToolbar.tsx
export const galleryToolbarStyles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 18,
    paddingTop: 6,
    // Separates the chip row from the first row of tiles. Without it the grid
    // starts immediately under the pills and the two read as one overlapping
    // block — the chips have no background of their own to sit the grid off.
    paddingBottom: 12,
    gap: 10,
    // The grid scrolls; this does not. Yoga defaults a flex child to
    // flexShrink: 0, but the horizontal ScrollView inside still reports a
    // content-driven height, so pin the whole strip rather than trusting that.
    flexGrow: 0,
    flexShrink: 0,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  searchButton: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
  },
  searchLabel: {
    flex: 1,
    minWidth: 0,
    fontFamily: fonts.interSemiBold,
    fontSize: 13.5,
  },
  selectButton: {
    width: 42,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  chipScroll: common.fixedSize,
  chips: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingRight: 18,
  },
  chip: common.chip,
  chipLabel: common.semiBold12,
  hint: common.regular12_5,
  summary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  summaryLabel: common.regular12,
  clearLabel: common.semiBold12,
});

//* components/GalleryGrid.tsx
export const GALLERY_GRID_PADDING = 18;
export const GALLERY_GRID_GAP = 6;

export const galleryGridStyles = StyleSheet.create({
  scroll: common.fill,
  content: {
    paddingHorizontal: GALLERY_GRID_PADDING,
    paddingBottom: 18,
  },
  //* lets the empty state centre itself in the space the list fills
  contentEmpty: {
    flexGrow: 1,
  },
  row: {
    gap: GALLERY_GRID_GAP,
  },
  rowGap: {
    height: GALLERY_GRID_GAP,
  },
  //* width and height are set from the window in the component
  tile: {
    borderRadius: 8,
    overflow: "hidden",
  },
  tilePressed: {
    opacity: 0.8,
  },
  thumb: common.fill,
  //* unpicked tiles recede while choosing notes to compare
  thumbDimmed: {
    opacity: 0.55,
  },
  selectedRing: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: 2.5,
    borderRadius: 8,
  },
  checkSlot: {
    position: "absolute",
    top: 5,
    right: 5,
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingHorizontal: 40,
    paddingBottom: 60,
  },
  emptyTitle: {
    fontFamily: fonts.frauncesSemiBold,
    fontSize: 17,
    marginTop: 10,
  },
  emptySubtitle: {
    fontFamily: fonts.interRegular,
    fontSize: 13,
    textAlign: "center",
  },
});

//* components/SearchNotesModal.tsx
export const searchNotesModalStyles = StyleSheet.create({
  root: common.fill,
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  sheet: {
    //* hangs from the top edge, and is capped so a long tag list scrolls
    //* inside the sheet instead of pushing the footer off the screen
    maxHeight: "82%",
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
    borderBottomWidth: 1,
    paddingTop: 54,
    paddingHorizontal: 18,
    paddingBottom: 18,
  },
  header: common.spacedRow14,
  title: common.dialogTitle,
  //* sits between the title and the first field; the header row already
  //* carries its own bottom margin, so this only pulls the gap back up
  hint: {
    fontFamily: fonts.interRegular,
    fontSize: 12,
    marginTop: -6,
    marginBottom: 16,
  },
  closeButton: common.iconButton36,
  scroll: { flexGrow: 0 },
  scrollContent: { paddingBottom: 4 },
  label: {
    fontFamily: fonts.interBold,
    fontSize: 10.5,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  field: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
    marginBottom: 18,
  },
  input: {
    flex: 1,
    minWidth: 0,
    fontFamily: fonts.interRegular,
    fontSize: 14,
    //* RN gives TextInput a default vertical padding that shifts the caret off
    //* the row's centre; zeroing it lets the fixed height do the centring
    paddingVertical: 0,
  },
  tagWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 18,
  },
  tagChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  tagLabel: common.semiBold12_5,
  //* folder names are user-typed and can run long; capped so one chip can't
  //* take a whole row and push the rest into a column
  folderLabel: { maxWidth: 160 },
  emptyNote: {
    fontFamily: fonts.interRegular,
    fontSize: 12.5,
    marginBottom: 18,
  },
  dateRow: common.row10,
  dateCol: common.fillShrinkable,
  dateCaption: { fontFamily: fonts.interRegular, fontSize: 11.5, marginBottom: 5 },
  dateBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 42,
  },
  dateFill: { flex: 1, minWidth: 0, justifyContent: "center" },
  dateValue: common.regular13,
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 18,
  },
  clearLabel: common.semiBold12_5,
  confirm: {
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  confirmLabel: common.bold13_5,
});

//* app/(tabs)/compare.tsx
export const COMPARE_H_PADDING = 18;
export const COMPARE_GAP = 12;

export const compareScreenStyles = StyleSheet.create({
  screen: common.fill,
  row: {
    flexDirection: "row",
    gap: COMPARE_GAP,
    paddingHorizontal: COMPARE_H_PADDING,
    paddingTop: 6,
    paddingBottom: 18,
  },
  card: {
    flexShrink: 0,
    borderWidth: 1,
    borderRadius: 14,
    overflow: "hidden",
  },
  cardMedia: {
    width: "100%",
    height: 190,
  },
  removeButton: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  datePill: {
    pointerEvents: "none",
    position: "absolute",
    bottom: 8,
    left: 8,
    backgroundColor: "rgba(0,0,0,0.45)",
    borderRadius: 999,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  datePillLabel: {
    fontFamily: fonts.interSemiBold,
    fontSize: 10.5,
    color: "#fff",
  },
  cardBody: common.fill,
  cardBodyContent: { padding: 14, paddingBottom: 16 },
  noteText: {
    fontFamily: fonts.frauncesMedium,
    fontSize: 14.5,
    lineHeight: 22,
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
    marginTop: 12,
  },
  tagPill: { borderRadius: 999, paddingVertical: 3, paddingHorizontal: 8 },
  tagLabel: { fontFamily: fonts.interSemiBold, fontSize: 10.5 },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  emptyLabel: common.regular13,
});
