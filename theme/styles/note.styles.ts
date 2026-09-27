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
  counter: common.regular11,
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
    fontSize: 10,
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
    fontSize: 19,
    lineHeight: 21,
  },
  noteText: {
    fontFamily: fonts.frauncesMedium,
    fontSize: 21,
    lineHeight: 26,
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
  noteDate: common.semiBold10_5,
  tagsRow: common.wrapRow6,
  tagPill: {
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  tagLabel: common.semiBold10_5,
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
    fontSize: 10,
  },
  advertiser: {
    fontFamily: fonts.interSemiBold,
    fontSize: 11,
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
    fontSize: 17,
    lineHeight: 21,
  },
  body: common.regular12,
  //* padding on the Text itself rather than a Pressable around it: the SDK
  //* handles the click on the registered view, so the whole button has to be
  //* that view
  callToAction: {
    overflow: "hidden",
    borderRadius: 12,
    paddingVertical: 13,
    textAlign: "center",
    fontFamily: fonts.interBold,
    fontSize: 13,
  },
});

//* app/(tabs)/enter-note.tsx
/** Horizontal inset for the whole screen — header, body, pills and footer. */
const ADD_NOTE_SIDE_PAD = 18;

export const addNoteScreenStyles = StyleSheet.create({
  screen: common.fill,
  //* the viewer's note toggle, same shape as TopBar's own buttons beside it
  headerButton: common.iconButton38,
  body: {
    paddingHorizontal: ADD_NOTE_SIDE_PAD,
    paddingBottom: 10,
    gap: 14,
  },
  //* the empty state is the screen: a note without a picture isn't a
  //* picture-note, so the drop zone takes the room the photo will
  pickButton: {
    height: 330,
    borderRadius: 18,
    borderWidth: 1,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  pickLabel: {
    fontFamily: fonts.interSemiBold,
    fontSize: 14,
  },
  pickHint: {
    fontFamily: fonts.interRegular,
    fontSize: 11,
  },
  //* the viewer's date line: same weight, size and colour, and above the note
  dateLine: common.semiBold10_5,
  //* no box around the caption — a hairline under it, the way a page rules a
  //* line to write on
  captionBox: {
    borderBottomWidth: 1,
    paddingBottom: 12,
  },
  //* the viewer's note type, so the text reads the same before and after saving
  caption: {
    fontFamily: fonts.frauncesMedium,
    fontSize: 21,
    lineHeight: 26,
    minHeight: 52,
    padding: 0,
    textAlignVertical: "top",
  },
  snippets: common.wrapRow6,
  snippetChip: common.snippetChip,
  snippetLabel: common.snippetLabel,
  tagRow: common.wrapRow6,
  //* the viewer's tag pill, plus room for the remove cross
  tagPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 999,
    paddingVertical: 4,
    paddingLeft: 10,
    paddingRight: 7,
  },
  tagLabel: common.semiBold10_5,
  //* whichever foot pill is open drops its panel right above the pills, so
  //* the thing you tapped and the thing that opened stay next to each other
  panel: {
    marginHorizontal: ADD_NOTE_SIDE_PAD,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
  },
  panelLabel: {
    fontFamily: fonts.interBold,
    fontSize: 10,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  panelChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  panelChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 9,
    paddingHorizontal: 14,
  },
  panelChipLabel: {
    fontFamily: fonts.interSemiBold,
    fontSize: 12,
  },
  tagInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  tagInput: {
    flex: 1,
    fontFamily: fonts.interRegular,
    fontSize: 12.5,
    paddingVertical: 9,
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  dateValue: {
    fontFamily: fonts.interRegular,
    fontSize: 13,
  },
  footPills: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: ADD_NOTE_SIDE_PAD,
    paddingTop: 12,
    paddingBottom: 12,
  },
  footPill: {
    flex: 1,
    height: 40,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  footPillLabel: {
    flexShrink: 1,
    fontFamily: fonts.interSemiBold,
    fontSize: 11.5,
  },
  error: {
    fontFamily: fonts.interRegular,
    fontSize: 11.5,
    paddingHorizontal: ADD_NOTE_SIDE_PAD,
    marginBottom: 10,
  },
  footer: {
    paddingHorizontal: ADD_NOTE_SIDE_PAD,
    gap: 10,
  },
  saveButton: {
    height: 50,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  saveLabel: {
    fontFamily: fonts.interBold,
    fontSize: 14,
  },
  footnote: {
    fontFamily: fonts.interRegular,
    fontSize: 10,
    lineHeight: 16,
  },
});

//* components/DraftNoteCard.tsx — the viewer's card for a note not saved yet.
//* Everything it shares with ViewNote points at viewNoteStyles, so a change to
//* the viewer's layout carries over rather than drifting.
export const draftNoteCardStyles = StyleSheet.create({
  root: viewNoteStyles.root,
  viewport: viewNoteStyles.viewport,
  noteArea: viewNoteStyles.noteArea,
  noteContent: viewNoteStyles.noteContent,
  photo: viewNoteStyles.photo,
  photoFill: viewNoteStyles.photoFill,
  media: viewNoteStyles.media,
  datePill: viewNoteStyles.datePill,
  datePillLabel: viewNoteStyles.datePillLabel,
  noteDate: viewNoteStyles.noteDate,
  noteText: viewNoteStyles.noteText,
  hintText: viewNoteStyles.hintText,
  snippets: viewNoteStyles.snippets,
  snippetChip: viewNoteStyles.snippetChip,
  snippetLabel: viewNoteStyles.snippetLabel,
  tagsRow: viewNoteStyles.tagsRow,
  tagLabel: viewNoteStyles.tagLabel,
  tagPill: addNoteScreenStyles.tagPill,
  captionBox: addNoteScreenStyles.captionBox,
  //* laid over noteText: the input's own padding and height rules only
  caption: {
    padding: 0,
    minHeight: 52,
    textAlignVertical: "top",
  },
  //* the strip's active-tile border (filmStripStyles.tile), drawn over the
  //* photo's edge since there is no strip tile to hand off to
  tileBorder: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: 2,
  },
  tileCover: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
});

//* components/FullscreenPhoto.tsx — black whatever the theme: it's a photo
//* viewer, and any tint around the letterboxing would read as part of the photo
export const fullscreenPhotoStyles = StyleSheet.create({
  root: common.fill,
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#000000",
  },
  photo: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  image: common.fullSize,
  closeWrap: {
    position: "absolute",
    right: 16,
  },
  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    //* dark glass with a light rim, so the white cross reads over a bright
    //* photo as well as a dark one
    backgroundColor: "rgba(0,0,0,0.5)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
  },
});
