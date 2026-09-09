import { useCallback, useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { Image } from "expo-image";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { useVideoPlayer, VideoView } from "expo-video";
import type { ThemeColors } from "@/theme/colors";
import { fonts } from "@/theme/fonts";
import { hexToRgba } from "@/lib/color";
import { formatDayDate, formatShortDate } from "@/lib/date";
import { rubberBand, snapTarget } from "@/lib/notePager";
import { NoteModel, TagModel } from "../models/NoteModel";
import FilmStrip, { filmStripMetrics } from "./FilmStrip";
import MarkdownText from "./MarkdownText";
import MediaThumb from "./MediaThumb";

/** Dead space between two pages, so the photo arriving is visibly a separate
 *  one rather than the same photo sliding. iOS Photos uses the same trick. */
const GUTTER = 16;

/** One line of note plus its padding — what shows under the photo while the
 *  photo is the thing you're looking at. */
const HINT_H = 46;

/** Horizontal inset for everything that isn't the full-bleed photo. */
const SIDE_PAD = 18;

/** Inactive tile size for the strip while the note is open. The active tile
 *  comes out 8 larger — 96 — which is exactly what the standalone thumbnail
 *  used to be, because the strip is doing that job now. */
const NOTE_TILE = 88;

/** Where the open strip's active tile lands. The photo condenses onto exactly
 *  these numbers, so the hand-off from photo to tile is invisible. */
const TILE = filmStripMetrics(NOTE_TILE);

const OPEN_MS = 300;
/** The strip's own fade. Short and independent of the drag: the gap opens with
 *  your finger, but the strip arriving is an event, not something you scrub. */
const STRIP_FADE_MS = 140;

/** The last stretch of the condense, over which the photo hands off to the
 *  strip's own tile. Same image, same place, so the crossfade is invisible and
 *  what you see is one continuous movement. */
const HANDOFF_FROM = 0.75;
/** Drag this far, or throw the finger this fast, and the note commits. */
const OPEN_DISTANCE = 55;
const OPEN_VELOCITY = 500; // px/s

/** The sideways snap. Slightly overdamped (zeta ~1.07), so it decelerates into
 *  place without the bounce a springier config would add — and it takes the
 *  release velocity, so a hard flick lands faster than a slow drag. */
const SNAP = { damping: 30, stiffness: 220, mass: 0.9 };

type Props = {
  /** Everything swipeable from here — the folder's notes, or the whole gallery. */
  notes: NoteModel[];
  /** Which of them is showing. */
  index: number;
  onIndexChange: (index: number) => void;
  tags: TagModel[];
  colors: ThemeColors;
  noteOpen: boolean;
  onToggleNote: (open: boolean) => void;
};

// The picture-note viewer: a full-bleed photo with the first line of its note
// underneath, paging sideways to its neighbours, and collapsing to a thumbnail
// when you pull the note open.
//
// It fills whatever box the screen gives it rather than reserving a fixed
// height. That is what lets the photo be as large as the device allows, and it
// is why there is no exported card height any more — the screen decides how
// much room there is, and this measures it.
//
// Read-only: editing and deleting a note is business logic Swan wires up.
export default function ViewNote({
  notes,
  index,
  onIndexChange,
  tags,
  colors,
  noteOpen,
  onToggleNote,
}: Props) {
  // Width seeds from the window because the pager is full-bleed — there is no
  // padding between it and the screen edge for the two to disagree about. The
  // measurement still wins once it lands; this only keeps the first frame from
  // rendering a zero-width photo.
  const { width: windowW } = useWindowDimensions();
  const [box, setBox] = useState({ w: windowW, h: 0 });

  const stride = box.w + GUTTER;
  const count = notes.length;
  const photoFull = Math.max(0, box.h - HINT_H);
  //* the photo closes all the way now, so a drag maps 1:1 onto its height
  const travel = Math.max(1, photoFull);

  // Every shared value below is read and written through .get()/.set() rather
  // than .value. React Compiler treats a shared value as an external mutable
  // store, so assigning to .value reads to it as mutating something it isn't
  // allowed to; Reanimated added get/set as the sanctioned accessors for
  // exactly this. Identical behaviour — still the same mutable boxes.

  /** Track position in px. At rest it is always -index * stride. */
  const offset = useSharedValue(0);

  /** Where the strip sits, in tile units. Internal now that the strip is a
   *  child rather than a sibling — it was a prop only because the pager and
   *  the strip sat next to each other and had to share it via the screen. */
  const stripPos = useSharedValue(0);
  const dragFrom = useSharedValue(0);
  const axis = useSharedValue<"x" | "y" | null>(null);

  /** 0 = photo, 1 = note. Normalised rather than px so a rotation can't strand
   *  it at a height that no longer exists. */
  const open = useSharedValue(noteOpen ? 1 : 0);
  const noteOpenSV = useSharedValue(noteOpen);

  // The last page this pager put itself on. A swipe animates the track and
  // *then* reports the new index, so without this the effect below would
  // restart that same spring from wherever it had got to — killing the release
  // velocity a hard flick was carrying, one frame in.
  //
  // A shared value rather than a ref, and written on the JS thread in
  // commitIndex rather than inside the gesture: both sides of the comparison
  // then happen in JS, in commit order, with no cross-thread propagation to
  // race. (react-hooks/refs also rejects a ref read from anything handed out
  // during render, which is what a gesture callback is.)
  const settled = useSharedValue(-1);

  const commitIndex = useCallback(
    (next: number) => {
      settled.set(next);
      onIndexChange(next);
    },
    [onIndexChange, settled],
  );

  useEffect(() => {
    if (stride <= GUTTER) return; // not measured yet
    if (settled.get() === index) return; // the gesture already animated there
    //* first positioning jumps: opening note #7 from the gallery should start
    //* on it, not scroll there from the beginning of the list
    const first = settled.get() === -1;
    settled.set(index);
    offset.set(first ? -index * stride : withSpring(-index * stride, SNAP));
  }, [index, stride, offset, settled]);

  useEffect(() => {
    noteOpenSV.set(noteOpen);
    open.set(withTiming(noteOpen ? 1 : 0, { duration: OPEN_MS }));
  }, [noteOpen, noteOpenSV, open]);

  //* driven off noteOpen rather than `open`, so the strip fades in at its own
  //* pace the moment the note commits — tying it to the drag made it arrive
  //* at whatever opacity the finger happened to stop at
  const stripFade = useSharedValue(noteOpen ? 1 : 0);
  useEffect(() => {
    stripFade.set(withTiming(noteOpen ? 1 : 0, { duration: STRIP_FADE_MS }));
  }, [noteOpen, stripFade]);

  // The small strip has to outlive `noteOpen` to be able to fade at all — an
  // unmount is instant. So the fade drives the unmount rather than the other
  // way round, and an interrupted fade (reopened mid-flight) never unmounts.
  const [smallStripMounted, setSmallStripMounted] = useState(!noteOpen);
  const smallStripFade = useSharedValue(noteOpen ? 0 : 1);

  //* adjusted during render rather than in the effect below: "the note is shut,
  //* so the small strip is on screen" is derivable from noteOpen, and deriving
  //* it here means it is already true on the frame that closes the note. Going
  //* through an effect would setState after commit — a cascading render, and
  //* one frame of missing strip
  if (!noteOpen && !smallStripMounted) setSmallStripMounted(true);

  useEffect(() => {
    if (!noteOpen) {
      smallStripFade.set(withTiming(1, { duration: STRIP_FADE_MS }));
      return;
    }
    smallStripFade.set(
      withTiming(0, { duration: STRIP_FADE_MS }, (finished) => {
        "worklet";
        if (finished === true) scheduleOnRN(setSmallStripMounted, false);
      }),
    );
  }, [noteOpen, smallStripFade]);

  const smallStripStyle = useAnimatedStyle(() => ({ opacity: smallStripFade.get() }));

  //* one source of truth for both: the strip is just the track measured in
  //* pages, so it follows the finger and the snap for free
  useAnimatedReaction(
    () => offset.get(),
    (value) => {
      if (stride > GUTTER) stripPos.set(-value / stride);
    },
  );

  const panGesture = Gesture.Pan()
    .onStart(() => {
      axis.set(null);
      dragFrom.set(offset.get());
    })
    .onUpdate((e) => {
      if (axis.get() === null) {
        if (Math.abs(e.translationX) > 8 || Math.abs(e.translationY) > 8) {
          axis.set(Math.abs(e.translationX) > Math.abs(e.translationY) ? "x" : "y");
        }
      }

      if (axis.get() === "y") {
        //* up opens it: the note is below the photo, so lifting the finger
        //* lifts the note into view and pushes the photo out of the way.
        //* translationY is negative upward, hence the subtraction.
        const base = noteOpenSV.get() ? 1 : 0;
        open.set(Math.min(1, Math.max(0, base - e.translationY / travel)));
        return;
      }

      if (axis.get() === "x" && !noteOpenSV.get() && stride > GUTTER) {
        const raw = dragFrom.get() + e.translationX;
        offset.set(rubberBand(raw, -(count - 1) * stride));
      }
    })
    .onEnd((e) => {
      if (axis.get() === "y") {
        let shouldOpen = noteOpenSV.get();
        if (e.translationY < -OPEN_DISTANCE || e.velocityY < -OPEN_VELOCITY) shouldOpen = true;
        else if (e.translationY > OPEN_DISTANCE || e.velocityY > OPEN_VELOCITY) shouldOpen = false;
        open.set(withTiming(shouldOpen ? 1 : 0, { duration: OPEN_MS }));
        scheduleOnRN(onToggleNote, shouldOpen);
      } else if (axis.get() === "x" && stride > GUTTER) {
        //* where the track sits right now, measured in pages
        const target = snapTarget(-offset.get() / stride, e.velocityX, count);
        offset.set(withSpring(-target * stride, { ...SNAP, velocity: e.velocityX }));
        if (target !== index) scheduleOnRN(commitIndex, target);
      }
      axis.set(null);
    });

  const trackStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: offset.get() }],
  }));

  //* only the neighbours are mounted, so a thousand-note gallery still costs
  //* three cards — and both of the ones you can swipe to are already there,
  //* which is what makes the drag show real content
  const first = Math.max(0, index - 1);
  const last = Math.min(count - 1, index + 1);
  const windowed: NoteModel[] = notes.slice(first, last + 1);

  // The gap the open strip sits in. Driven by `open` so the space grows with
  // the drag, and read by the cards too — they leave exactly this much room at
  // the top of the note so the text starts below the strip.
  const stripLayerStyle = useAnimatedStyle(() => ({
    //* the gap tracks the finger 1:1, the strip inside it does not
    height: interpolate(open.get(), [0, 1], [0, TILE.height]),
    // Two things gate this. `stripFade` is the quick fade in on commit, and
    // the `open` term keeps the strip off the screen while the photo is still
    // big — without it the tiles paint over the photo as it enlarges, which
    // reads as the strip sitting on top of the thing it is supposed to be
    // handing back to.
    opacity:
      stripFade.get() * interpolate(open.get(), [HANDOFF_FROM, 1], [0, 1], Extrapolation.CLAMP),
  }));

  // Two instances rather than one that resizes: they overlap for the length of
  // a fade, and a single strip would visibly jump tile size mid-crossfade.
  const stripProps = {
    notes,
    currentIndex: index,
    colors,
    onSelect: onIndexChange,
    position: stripPos,
  };

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
          <Animated.View style={[styles.track, trackStyle]}>
            {windowed.map((note, i) => {
              const noteIndex = first + i;
              const isCurrent = noteIndex === index;
              return (
                <View
                  key={note.id}
                  style={[
                    styles.slot,
                    {
                      left: noteIndex * stride,
                      //* the current page paints above its neighbours, which
                      //* only matters before the first measurement: until
                      //* `stride` is real every slot sits at left 0, and
                      //* without this the page stacked last is the one you see
                      zIndex: isCurrent ? 1 : 0,
                    },
                  ]}
                >
                  <NoteCard
                    note={note}
                    tags={tags}
                    colors={colors}
                    isCurrent={isCurrent}
                    noteOpen={noteOpen}
                    open={open}
                    cardW={box.w}
                    photoFull={photoFull}
                    measured={box.h > 0}
                  />
                </View>
              );
            })}
          </Animated.View>
        </View>
      </GestureDetector>

      {/* A layer over the pager rather than a child of the page. The strip is
          a navigator for the whole list — pinning it inside a page would slide
          it sideways every time it was used, and unmount it mid-transition
          just as the tap it is servicing lands. Each card reserves the same
          height at the top of its note, so the text starts below this. */}
      <Animated.View
        style={[styles.stripLayer, stripLayerStyle]}
        pointerEvents={noteOpen ? "auto" : "none"}
      >
        {noteOpen && <FilmStrip {...stripProps} tileSize={NOTE_TILE} />}
      </Animated.View>

      {/* picture mode keeps it where it has always been, under the hint */}
      {smallStripMounted && (
        <Animated.View style={smallStripStyle} pointerEvents={noteOpen ? "none" : "auto"}>
          <FilmStrip {...stripProps} />
        </Animated.View>
      )}
    </View>
  );
}

type CardProps = {
  note: NoteModel;
  tags: TagModel[];
  colors: ThemeColors;
  isCurrent: boolean;
  noteOpen: boolean;
  /** 0 = photo, 1 = note. Shared, so every mounted page collapses together. */
  open: SharedValue<number>;
  cardW: number;
  photoFull: number;
  /** False until onLayout lands, when the animated sizes would all be zero. */
  measured: boolean;
};

// One picture-note: the photo, and the note underneath it. At rest the note is
// a single line and the photo has the rest of the screen; open, the photo has
// closed entirely and the strip stands where it was.
function NoteCard({
  note,
  tags,
  colors,
  isCurrent,
  noteOpen,
  open,
  cardW,
  photoFull,
  measured,
}: CardProps) {
  //* a null source keeps the hook call unconditional while spending nothing:
  //* three mounted pages must not mean three native players, and a neighbour
  //* shows its still until you actually land on it
  const videoPlayer = useVideoPlayer(
    isCurrent && note.mediaType === "video" ? note.mediaUri : null,
  );

  // The photo condenses onto the strip's active tile: same size, same place,
  // then hands off to the real tile over the last quarter. Opening enlarges it
  // back out of the tile by running all of this in reverse.
  //
  // An overlay rather than a box in the column, and that is load-bearing: the
  // note's position now comes from the spacer alone, so a photo animation that
  // stalls can leave the photo wrong but can never leave a hole above the text.
  const photoStyle = useAnimatedStyle(() => {
    const p = open.get();
    return {
      width: interpolate(p, [0, 1], [cardW, TILE.activeSize]),
      height: interpolate(p, [0, 1], [photoFull, TILE.activeSize]),
      left: interpolate(p, [0, 1], [0, (cardW - TILE.activeSize) / 2]),
      top: interpolate(p, [0, 1], [0, TILE.padTop]),
      borderRadius: interpolate(p, [0, 1], [0, TILE.radius]),
      opacity: interpolate(p, [HANDOFF_FROM, 1], [1, 0], Extrapolation.CLAMP),
    };
  });

  //* the pill is legible over a full-bleed photo and absurd over a 96pt tile
  const pillStyle = useAnimatedStyle(() => ({ opacity: 1 - open.get() }));

  // What actually places the note. At rest it is the photo's full height, so
  // the hint line sits under the photo; open, it is the strip's height, so the
  // text sits under the strip.
  const spacerStyle = useAnimatedStyle(() => ({
    height: interpolate(open.get(), [0, 1], [photoFull, TILE.height]),
  }));

  const noteTags = note.tagIds
    .map((id) => tags.find((t) => t.id === id))
    .filter((t): t is TagModel => t != null);

  const body = note.note.trim();

  return (
    <View style={styles.card}>
      <ScrollView
        style={styles.noteArea}
        contentContainerStyle={styles.noteContent}
        //* only scrollable once there is something to scroll. While it is a
        //* one-line hint this stays off, so the pan underneath keeps the whole
        //* surface and an upward drag anywhere opens the note.
        scrollEnabled={noteOpen}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={spacerStyle} />

        {noteOpen && note.date.length > 0 && (
          <Text style={[styles.noteDate, { color: colors.stoneDim }]}>
            {formatDayDate(note.date)}
          </Text>
        )}

        {body.length > 0 ? (
          <MarkdownText
            text={body}
            //* one line while it is a hint, so a long note ellipsises instead
            //* of being sliced mid-word by the container's edge
            numberOfLines={noteOpen ? undefined : 1}
            style={[
              noteOpen ? styles.noteText : styles.hintText,
              { color: colors.textPrimary },
            ]}
          />
        ) : (
          <Text
            numberOfLines={1}
            style={[noteOpen ? styles.noteText : styles.hintText, { color: colors.stoneDim }]}
          >
            No note yet.
          </Text>
        )}

        {noteOpen && noteTags.length > 0 && (
          <View style={styles.tagsRow}>
            {noteTags.map((tag) => (
              <View
                key={tag.id}
                style={[styles.tagPill, { backgroundColor: hexToRgba(colors.teal, 0.16) }]}
              >
                <Text style={[styles.tagLabel, { color: colors.teal }]}>#{tag.title}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* after the note so it paints over it, and inert once it is a tile —
          the strip above owns those taps */}
      <Animated.View
        style={[styles.photo, measured ? photoStyle : styles.photoFill]}
        pointerEvents={noteOpen ? "none" : "auto"}
      >
        {note.mediaType === "video" ? (
          isCurrent ? (
            <VideoView style={styles.media} player={videoPlayer} nativeControls contentFit="cover" />
          ) : (
            <MediaThumb note={note} />
          )
        ) : (
          <Image source={{ uri: note.mediaUri }} style={styles.media} contentFit="cover" />
        )}

        {note.date.length > 0 && (
          <Animated.View style={[styles.datePill, pillStyle]}>
            <Text style={styles.datePillLabel}>{formatShortDate(note.date)}</Text>
          </Animated.View>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  viewport: {
    flex: 1,
    //* the neighbours live outside this box until you drag them in
    overflow: "hidden",
  },
  track: {
    flex: 1,
  },
  slot: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: "100%",
  },
  card: {
    flex: 1,
  },
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
  media: {
    width: "100%",
    height: "100%",
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
  noteArea: {
    flex: 1,
  },
  stripLayer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    overflow: "hidden",
  },
  noteContent: {
    paddingHorizontal: SIDE_PAD,
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
  noteDate: {
    fontFamily: fonts.interSemiBold,
    fontSize: 11.5,
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  tagPill: {
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  tagLabel: {
    fontFamily: fonts.interSemiBold,
    fontSize: 11.5,
  },
});
