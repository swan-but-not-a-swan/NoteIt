import { useEffect, useState, type ReactNode, type Ref } from "react";
import { Pressable, ScrollView, Text, TextInput, View, useWindowDimensions } from "react-native";
import { Image } from "expo-image";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { useVideoPlayer, VideoView } from "expo-video";
import type { ThemeColors } from "@/theme/colors";
import { useFieldFocus } from "@/theme/focus";
import { formatDayDate, formatShortDate } from "@/lib/date";
import { NoteMediaType } from "../models/NoteModel";
import FullscreenPhoto from "./FullscreenPhoto";
import MarkdownText from "./MarkdownText";
import { HANDOFF_FROM, HINT_H, OPEN_DISTANCE, OPEN_MS, OPEN_VELOCITY, TILE } from "./ViewNote";
import { draftNoteCardStyles as styles } from "@/theme/styles/note.styles";

type Props = {
  colors: ThemeColors;
  mediaUri: string;
  mediaType: NoteMediaType | null;
  date: string;
  note: string;
  onNoteChange: (text: string) => void;
  /** Tell the screen the note has the keyboard, so the row on top of it offers
   *  snippets. */
  onNoteFocus: () => void;
  onNoteBlur: () => void;
  /** Drawn under the note while it's open — the screen's Tags, Folder and
   *  Date fields. */
  children?: ReactNode;
  /** The note's scroll view, so the screen can bring its fields into view
   *  above the keyboard or a picker. */
  scrollRef?: Ref<ScrollView>;
  /** Room left under the fields for whatever covers the bottom of the screen:
   *  the Save button, the keyboard, a picker. */
  bottomInset: number;
  /** Snippets and Paste (a SuggestionRow), drawn under the note while the
   *  screen says the note has focus. */
  noteSuggestions?: ReactNode;
  /** The note and its chips as one block, so the screen can line the block up
   *  with the keyboard's top edge. */
  noteBlockRef?: Ref<View>;
  onNoteBlockLayout?: () => void;
  /** How far the note is scrolled, for that same lining-up. */
  onScrollOffset?: (y: number) => void;
  /** Owned by the screen, like the viewer's, because the header's toggle has
   *  to be able to flip it too. */
  noteOpen: boolean;
  onToggleNote: (open: boolean) => void;
};

// The draft as the viewer will show it once it's saved: ViewNote's NoteCard,
// minus the pager and the strip.
//
// Open, the photo is the 96pt tile centred at the top, exactly where the
// viewer's strip puts the active tile, with the date and the note under it in
// the viewer's order. Pull down and the photo opens back out to full bleed with
// its date pill and a one-line hint of the note; pull up and it condenses again.
// Same distances, speeds and timing as the viewer, imported rather than copied.
//
// The one difference: the viewer hands its tile off to the strip's own, which
// carries the accent border. There is no strip here, so the photo stays and
// fades that border in over the same last stretch of the condense instead.
export default function DraftNoteCard({
  colors,
  mediaUri,
  mediaType,
  date,
  note,
  onNoteChange,
  onNoteFocus,
  onNoteBlur,
  children,
  scrollRef,
  bottomInset,
  noteSuggestions,
  noteBlockRef,
  onNoteBlockLayout,
  onScrollOffset,
  noteOpen,
  onToggleNote,
}: Props) {
  //* full-bleed like the viewer, so the window is the right first guess for
  //* the width; the height only matters once the photo opens out, by which
  //* time onLayout has landed
  const { width: windowW } = useWindowDimensions();
  const [box, setBox] = useState({ w: windowW, h: 0 });
  const [fullscreenUri, setFullscreenUri] = useState<string | null>(null);
  const noteFocus = useFieldFocus(colors);

  // This card mounts when the picture lands, so the note can start focused and
  // the keyboard is already up to write into. Spent on the first focus: the
  // field unmounts whenever the photo opens back out, and without this it
  // would grab the keyboard again every time you flipped back to the note.
  const [focusOnMount, setFocusOnMount] = useState(true);

  const cardW = box.w;
  const photoFull = Math.max(0, box.h - HINT_H);
  const travel = Math.max(1, photoFull);
  const measured = box.h > 0;

  /** 0 = photo, 1 = note, as in the viewer. */
  const open = useSharedValue(noteOpen ? 1 : 0);
  const noteOpenSV = useSharedValue(noteOpen);
  /** How far the note is scrolled, so a pull down that is really the scroll
   *  coming back up doesn't open the photo instead. */
  const scrollY = useSharedValue(0);
  const ignoreDrag = useSharedValue(false);

  useEffect(() => {
    noteOpenSV.set(noteOpen);
    open.set(withTiming(noteOpen ? 1 : 0, { duration: OPEN_MS }));
  }, [noteOpen, noteOpenSV, open]);

  const videoPlayer = useVideoPlayer(mediaType === "video" ? mediaUri : null);

  const panGesture = Gesture.Pan()
    //* vertical only: there is nothing to page to sideways, and failing on a
    //* horizontal move leaves that direction to the back gesture
    .activeOffsetY([-8, 8])
    .failOffsetX([-12, 12])
    .onStart(() => {
      ignoreDrag.set(noteOpenSV.get() && scrollY.get() > 0);
    })
    .onUpdate((e) => {
      if (ignoreDrag.get()) return;
      //* up opens the note, down opens the photo — translationY is negative
      //* upward, hence the subtraction
      const base = noteOpenSV.get() ? 1 : 0;
      open.set(Math.min(1, Math.max(0, base - e.translationY / travel)));
    })
    .onEnd((e) => {
      if (ignoreDrag.get()) return;
      let shouldOpen = noteOpenSV.get();
      if (e.translationY < -OPEN_DISTANCE || e.velocityY < -OPEN_VELOCITY) shouldOpen = true;
      else if (e.translationY > OPEN_DISTANCE || e.velocityY > OPEN_VELOCITY) shouldOpen = false;
      open.set(withTiming(shouldOpen ? 1 : 0, { duration: OPEN_MS }));
      scheduleOnRN(onToggleNote, shouldOpen);
    });

  // The viewer's condense, verbatim, except that the photo doesn't fade: it is
  // the tile here, not a stand-in for one.
  const photoAnimated = useAnimatedStyle(() => {
    const p = open.get();
    return {
      width: interpolate(p, [0, 1], [cardW, TILE.activeSize]),
      height: interpolate(p, [0, 1], [photoFull, TILE.activeSize]),
      left: interpolate(p, [0, 1], [0, (cardW - TILE.activeSize) / 2]),
      top: interpolate(p, [0, 1], [0, TILE.padTop]),
      borderRadius: interpolate(p, [0, 1], [0, TILE.radius]),
    };
  });

  //* the strip's active-tile border, arriving over the stretch where the
  //* viewer would have handed the photo off to it
  const borderAnimated = useAnimatedStyle(() => {
    const p = open.get();
    return {
      opacity: interpolate(p, [HANDOFF_FROM, 1], [0, 1], Extrapolation.CLAMP),
      borderRadius: interpolate(p, [0, 1], [0, TILE.radius]),
    };
  });

  const pillAnimated = useAnimatedStyle(() => ({ opacity: 1 - open.get() }));

  //* the band the tile sits in, solid while the note is open. The tile is
  //* pinned, not part of the scroll, so without this the note scrolling up —
  //* iOS does it on its own to keep the cursor in view, the fields do it to
  //* clear the keyboard — slid visibly under and around the tile
  const bandAnimated = useAnimatedStyle(() => ({
    opacity: interpolate(open.get(), [HANDOFF_FROM, 1], [0, 1], Extrapolation.CLAMP),
  }));

  const spacerAnimated = useAnimatedStyle(() => ({
    height: interpolate(open.get(), [0, 1], [photoFull, TILE.height]),
  }));

  const body = note.trim();
  const isVideo = mediaType === "video";

  return (
    <View style={styles.root}>
      <GestureDetector gesture={panGesture}>
        <View
          style={styles.viewport}
          onLayout={(e) => {
            const { width, height } = e.nativeEvent.layout;
            setBox({ w: Math.max(1, width), h: Math.max(0, height) });
          }}
        >
          <ScrollView
            ref={scrollRef}
            style={styles.noteArea}
            contentContainerStyle={[styles.noteContent, { paddingBottom: bottomInset }]}
            //* same rule as the viewer: nothing to scroll while it's a hint,
            //* so the pull underneath keeps the whole surface
            scrollEnabled={noteOpen}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            onScroll={(e) => {
              scrollY.set(e.nativeEvent.contentOffset.y);
              onScrollOffset?.(e.nativeEvent.contentOffset.y);
            }}
            scrollEventThrottle={16}
          >
            <Animated.View style={spacerAnimated} />

            {noteOpen ? (
              <>
                {/* the viewer's date line, in its place; the Day & date pill
                    is what changes it */}
                <Text style={[styles.noteDate, { color: colors.stoneDim }]}>{formatDayDate(date)}</Text>

                {/* the viewer's type, so the note reads the same before and
                    after it's saved; a ruled line rather than a box, because
                    this is somewhere to write rather than a note being fixed.
                    It and its chips are one block the screen lines up with
                    the keyboard */}
                <View ref={noteBlockRef} onLayout={onNoteBlockLayout} style={styles.noteBlock}>
                  <View style={[styles.captionBox, { borderBottomColor: noteFocus.border }]}>
                    <TextInput
                      value={note}
                      onChangeText={onNoteChange}
                      placeholder="What's happening…"
                      placeholderTextColor={noteFocus.placeholder}
                      multiline
                      scrollEnabled={false}
                      textAlignVertical="top"
                      autoFocus={focusOnMount}
                      accessibilityLabel="Note"
                      style={[styles.noteText, styles.caption, { color: colors.textPrimary }]}
                      onFocus={() => {
                        setFocusOnMount(false);
                        noteFocus.handlers.onFocus();
                        onNoteFocus();
                      }}
                      onBlur={() => {
                        noteFocus.handlers.onBlur();
                        onNoteBlur();
                      }}
                    />
                  </View>
                  {noteFocus.focused && noteSuggestions}
                </View>

                {/* the screen's Tags, Folder and Date fields */}
                {children}
              </>
            ) : (
              <Pressable onPress={() => onToggleNote(true)} accessibilityRole="button" accessibilityLabel="Show the note">
                {body.length > 0 ? (
                  <MarkdownText
                    text={body}
                    numberOfLines={1}
                    style={[styles.hintText, { color: colors.textPrimary }]}
                  />
                ) : (
                  <Text numberOfLines={1} style={[styles.hintText, { color: colors.stoneDim }]}>
                    {"What's happening…"}
                  </Text>
                )}
              </Pressable>
            )}
          </ScrollView>

          <Animated.View
            style={[styles.tileBand, { height: TILE.height, backgroundColor: colors.bg }, bandAnimated]}
          />

          {/* after the note so it paints over it, as in the viewer */}
          <Animated.View style={[styles.photo, measured || noteOpen ? photoAnimated : styles.photoFill]}>
            {isVideo ? (
              <VideoView
                style={styles.media}
                player={videoPlayer}
                nativeControls={!noteOpen}
                contentFit="cover"
              />
            ) : (
              <Pressable
                style={styles.media}
                //* the tile opens the photo out; the open photo goes full screen,
                //* the way it does in the viewer
                onPress={noteOpen ? () => onToggleNote(false) : () => setFullscreenUri(mediaUri)}
                accessibilityRole="imagebutton"
                accessibilityLabel={noteOpen ? "Show the photo" : "Show the photo full screen"}
              >
                <Image source={{ uri: mediaUri }} style={styles.media} contentFit="cover" />
              </Pressable>
            )}

            {/* a video's own controls would take this tap, so the tile gets a
                cover of its own while it is one */}
            {isVideo && noteOpen && (
              <Pressable
                style={styles.tileCover}
                onPress={() => onToggleNote(false)}
                accessibilityRole="button"
                accessibilityLabel="Show the video"
              />
            )}

            <Animated.View
              pointerEvents="none"
              style={[styles.tileBorder, { borderColor: colors.accent }, borderAnimated]}
            />

            {date.length > 0 && (
              <Animated.View style={[styles.datePill, pillAnimated]}>
                <Text style={styles.datePillLabel}>{formatShortDate(date)}</Text>
              </Animated.View>
            )}
          </Animated.View>
        </View>
      </GestureDetector>

      <FullscreenPhoto uri={fullscreenUri} onClose={() => setFullscreenUri(null)} />
    </View>
  );
}
