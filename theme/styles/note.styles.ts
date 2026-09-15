//* static styles for viewing and adding picture-notes
//* each component imports its export as `styles`; theme colours stay inline there

import { StyleSheet } from "react-native";
import { fonts } from "@/theme/fonts";
import { common } from "@/theme/styles/common.styles";

//* app/(tabs)/note/[id].tsx
export const noteScreenStyles = StyleSheet.create({
  screen: common.fill,
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    //* three buttons and a counter now share this row, so the gap is
    //* tighter than the 10 a lone share button could afford
    gap: 8,
  },
  counter: common.regular12,
  headerButton: common.iconButton38,
  body: {
    flex: 1,
    //* no horizontal padding: the photo is full-bleed, and anything that
    //* does want an inset (the note text, the filmstrip) applies its own
    paddingHorizontal: 0,
    //* room between the filmstrip (or the note, once it is open) and the ad
    //* bar under it — 12 plus the strip's own 2 matches the 14 above its tiles
    paddingBottom: 12,
  },
});

//* components/ViewNote.tsx
/** Horizontal inset for everything that isn't the full-bleed photo. */
const VIEW_NOTE_SIDE_PAD = 18;

export const viewNoteStyles = StyleSheet.create({
  root: common.fill,
  viewport: {
    flex: 1,
    //* the neighbours live outside this box until you drag them in
    overflow: "hidden",
  },
  track: common.fill,
  slot: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: "100%",
  },
  card: common.fill,
  photo: {
    position: "absolute",
    overflow: "hidden",
  },
  //* until onLayout lands there is no height to animate between, so the photo
  //* simply fills the card — which is what picture mode looks like anyway
  photoFill: {
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  media: common.fullSize,
  //* the end-of-list ad takes the photo's box exactly; width and height come
  //* from the same measurement the photo uses
  adPage: {
    position: "absolute",
    top: 0,
    left: 0,
    overflow: "hidden",
  },
  datePill: {
    pointerEvents: "none",
    position: "absolute",
    top: 12,
    left: 12,
    backgroundColor: "rgba(0,0,0,0.4)",
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  datePillLabel: {
    fontFamily: fonts.interSemiBold,
    fontSize: 11,
    color: "#fff",
  },
  noteArea: common.fill,
  stripLayer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    overflow: "hidden",
  },
  noteContent: {
    paddingHorizontal: VIEW_NOTE_SIDE_PAD,
    paddingTop: 12,
    paddingBottom: 18,
    gap: 10,
  },
  hintText: {
    fontFamily: fonts.frauncesMedium,
    fontSize: 20,
    lineHeight: 22,
  },
  noteText: {
    fontFamily: fonts.frauncesMedium,
    fontSize: 22,
    lineHeight: 27,
  },
  //* same pill as AddNote's row — one snippet chip should look like a snippet
  //* chip wherever you meet it
  snippets: common.wrapRow6,
  snippetChip: common.snippetChip,
  snippetLabel: common.snippetLabel,
  noteInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 120,
    //* Android centres multiline text vertically by default, which puts a
    //* one-line note in the middle of a 120pt box
    textAlignVertical: "top",
  },
  noteDate: common.semiBold11_5,
  tagsRow: common.wrapRow6,
  tagPill: {
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  tagLabel: common.semiBold11_5,
});

//* components/FilmStrip.tsx
export const FILM_STRIP_GAP = 6;
export const FILM_STRIP_PAD_TOP = 14;
export const FILM_STRIP_PAD_BOTTOM = 2;

export const filmStripStyles = StyleSheet.create({
  strip: common.fixedSize,
  content: {
    gap: FILM_STRIP_GAP,
    paddingTop: FILM_STRIP_PAD_TOP,
    paddingBottom: FILM_STRIP_PAD_BOTTOM,
  },
  tile: {
    flexShrink: 0,
    //* borderRadius is set per tile from its size
    borderWidth: 2,
    overflow: "hidden",
  },
});

//* components/EndAd.tsx
export const endAdStyles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: VIEW_NOTE_SIDE_PAD,
    paddingTop: 12,
    paddingBottom: 16,
    gap: 12,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  badge: {
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeLabel: {
    fontFamily: fonts.interBold,
    fontSize: 11,
  },
  advertiser: {
    fontFamily: fonts.interSemiBold,
    fontSize: 12,
    flexShrink: 1,
  },
  //* takes whatever height the rows leave. NativeMediaView sets an aspectRatio
  //* from the creative, which would size the view to the creative instead of
  //* the box, so it is cleared here
  media: {
    flex: 1,
    width: "100%",
    aspectRatio: undefined,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: 10,
  },
  titleText: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  headline: {
    fontFamily: fonts.frauncesSemiBold,
    fontSize: 18,
    lineHeight: 22,
  },
  body: common.regular13,
  //* padding on the Text itself rather than a Pressable around it: the SDK
  //* handles the click on the registered view, so the whole button has to be
  //* that view
  callToAction: {
    overflow: "hidden",
    borderRadius: 12,
    paddingVertical: 13,
    textAlign: "center",
    fontFamily: fonts.interBold,
    fontSize: 14,
  },
});

//* components/AddNote.tsx
export const addNoteStyles = StyleSheet.create({
  flex: common.fill,
  root: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  sheet: {
    maxHeight: "88%",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingHorizontal: 20,
    paddingTop: 18,
  },
  header: common.spacedRow16,
  title: {
    fontFamily: fonts.frauncesSemiBold,
    fontSize: 19,
  },
  closeButton: common.iconButton36,
  pickButton: {
    width: "100%",
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderRadius: 14,
    paddingVertical: 20,
    alignItems: "center",
    gap: 8,
    marginBottom: 18,
  },
  pickButtonLabel: common.semiBold12_5,
  mediaWrap: {
    marginBottom: 18,
  },
  mediaPreview: {
    width: "100%",
    height: 200,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "#000",
  },
  mediaImage: common.fullSize,
  removeMediaButton: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  label: common.sectionLabel,
  noteInput: {
    marginTop: 8,
    marginBottom: 18,
    minHeight: 76,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: fonts.interRegular,
    fontSize: 14,
  },
  snippets: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: -10,
    marginBottom: 18,
  },
  snippetChip: common.snippetChip,
  snippetLabel: common.snippetLabel,
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 8,
    marginBottom: 18,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  dateLabel: {
    fontFamily: fonts.interRegular,
    fontSize: 14,
  },
  tagsBox: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
    marginBottom: 18,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  tagPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 999,
    paddingVertical: 5,
    paddingLeft: 10,
    paddingRight: 6,
  },
  tagLabel: common.semiBold12_5,
  tagInput: {
    flex: 1,
    minWidth: 90,
    fontFamily: fonts.interRegular,
    fontSize: 13,
    paddingVertical: 5,
    paddingHorizontal: 4,
  },
  storedTagPills: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: -10,
    marginBottom: 18,
  },
  storedTagPill: common.pill,
  //* text inside the stored-tag and folder pills; colour depends on selection,
  //* so it's applied at the call site
  pillLabel: common.semiBold12_5,
  folderPills: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
    marginBottom: 20,
  },
  folderPill: common.pill,
  error: common.errorText,
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 12,
    paddingVertical: 13,
  },
  saveButtonBusy: {
    opacity: 0.7,
  },
  saveButtonLabel: {
    fontFamily: fonts.interBold,
    fontSize: 14,
  },
});
