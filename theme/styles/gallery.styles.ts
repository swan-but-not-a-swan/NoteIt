//* static styles for the gallery tab, search, and the compare screen
//* each component imports its export as `styles`; theme colours stay inline there

import { StyleSheet } from "react-native";
import { fonts } from "@/theme/fonts";
import { common } from "@/theme/styles/common.styles";
import { BAR_BUTTON_HEIGHT } from "@/theme/styles/app.styles";

//* components/GalleryView.tsx
export const galleryViewStyles = StyleSheet.create({
  container: common.fill,
  //* a floating panel stacked on the tab bar's dock: the same side gaps and
  //* the same kind of corners, one layer below it. marginBottom (the dock's
  //* height plus SELECT_BAR_GAP) and the shadow are set inline
  compareBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginHorizontal: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1,
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
  compareGoLabel: common.bold12_5,
  //* floats the folder view's "Gallery" pill over the bottom of the grid, high
  //* enough to clear the tab bar's add button, which rises 24pt above the bar.
  //* Full width but touch-transparent, so the tiles either side stay pressable.
  //* `bottom` is SHOW_ALL_DOCK_LIFT plus the floating bar's height, set inline
  showAllDock: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    pointerEvents: "box-none",
  },
});

/** How far the "Gallery" pill sits above the top of the tab bar's dock. */
export const SHOW_ALL_DOCK_LIFT = 14;

/** The gap between the select bar and the tab bar's dock under it. */
export const SELECT_BAR_GAP = 10;

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
    fontSize: 12.5,
  },
  selectButton: {
    width: 42,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  //* a scroll view clips what it draws, so the row gets room around the chips
  //* for their glass shadows — edge to edge, and 6 above and below — and
  //* negative margins give the same room back so nothing else moves
  chipScroll: {
    ...common.fixedSize,
    marginHorizontal: -18,
    marginVertical: -6,
  },
  chips: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 6,
  },
  chip: common.chip,
  chipLabel: common.semiBold11,
  hint: common.regular11_5,
  summary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  summaryLabel: common.regular11,
  clearLabel: common.semiBold11,
});

//* components/GalleryGrid.tsx
export const GALLERY_GRID_PADDING = 18;
//* laid out like iOS home-screen widgets: room between them for their shadows
//* to fall into, and a caption under each
export const GALLERY_GRID_GAP = 14;
export const GALLERY_TILE_RADIUS = 20;

export const galleryGridStyles = StyleSheet.create({
  scroll: common.fill,
  content: {
    paddingHorizontal: GALLERY_GRID_PADDING,
    //* plus the floating tab bar's height, added at the call site
    paddingBottom: GALLERY_GRID_PADDING,
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
  //* the tile and its caption; the width is set from the window in the component
  cell: {
    alignItems: "center",
  },
  //* width, height and the shadow are set in the component
  tile: {
    borderRadius: GALLERY_TILE_RADIUS,
    overflow: "hidden",
  },
  //* the widget's name line: the note's short date. A fixed height, so a note
  //* with no date still keeps its row in line with the others
  caption: {
    ...common.semiBold10_5,
    alignSelf: "stretch",
    textAlign: "center",
    marginTop: 6,
    height: 14,
    lineHeight: 14,
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
    borderRadius: GALLERY_TILE_RADIUS,
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
    fontSize: 16,
    marginTop: 10,
  },
  emptySubtitle: {
    fontFamily: fonts.interRegular,
    fontSize: 12,
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
    fontSize: 11,
    marginTop: -6,
    marginBottom: 16,
  },
  closeButton: common.iconButton36,
  scroll: { flexGrow: 0 },
  scrollContent: { paddingBottom: 4 },
  label: {
    fontFamily: fonts.interBold,
    fontSize: 9.5,
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
    fontSize: 13,
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
  tagLabel: common.semiBold11_5,
  //* folder names are user-typed and can run long; capped so one chip can't
  //* take a whole row and push the rest into a column
  folderLabel: { maxWidth: 160 },
  emptyNote: {
    fontFamily: fonts.interRegular,
    fontSize: 11.5,
    marginBottom: 18,
  },
  dateRow: common.row10,
  dateCol: common.fillShrinkable,
  dateCaption: { fontFamily: fonts.interRegular, fontSize: 10.5, marginBottom: 5 },
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
  dateValue: common.regular12,
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 18,
  },
  clearLabel: common.semiBold11_5,
  confirm: {
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  confirmLabel: common.bold12_5,
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
    fontSize: 9.5,
    color: "#fff",
  },
  cardBody: common.fill,
  cardBodyContent: { padding: 14, paddingBottom: 16 },
  noteText: {
    fontFamily: fonts.frauncesMedium,
    fontSize: 13.5,
    lineHeight: 21,
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
    marginTop: 12,
  },
  tagPill: { borderRadius: 999, paddingVertical: 3, paddingHorizontal: 8 },
  tagLabel: { fontFamily: fonts.interSemiBold, fontSize: 9.5 },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  emptyLabel: common.regular12,
});

//* components/HeldNotePreview.tsx
export const heldNotePreviewStyles = StyleSheet.create({
  //* placed by OverflowMenuCard, which puts it on the opposite side of the
  //* finger from the menu itself
  //* no shadow and no rim: the dimmed grid behind is what sets the picture
  //* apart, exactly as it does in Photos. A shadow on top of that reads as a
  //* card holding a photo rather than the photo itself
  preview: {
    borderRadius: 28,
    overflow: "hidden",
  },
});
