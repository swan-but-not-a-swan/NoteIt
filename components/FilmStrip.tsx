import { useEffect, useRef } from "react";
import { Pressable, ScrollView, StyleSheet, useWindowDimensions } from "react-native";
import type { ThemeColors } from "@/theme/colors";
import { NoteModel } from "../models/NoteModel";
import MediaThumb from "./MediaThumb";

type Props = {
  notes: NoteModel[];
  currentIndex: number;
  colors: ThemeColors;
  onSelect: (index: number) => void;
};

const INACTIVE_SIZE = 44;
const ACTIVE_SIZE = 52;
const GAP = 6;

// Horizontal "contact sheet" below the main photo, iPhone-Photos style —
// ported from the web reference's FilmStrip. The active thumbnail is kept
// centered as `currentIndex` changes by scrolling to an analytically
// computed offset rather than measuring each tile (every tile's width is
// already known up front, so there's nothing to measure).
export default function FilmStrip({ notes, currentIndex, colors, onSelect }: Props) {
  const scrollRef = useRef<ScrollView>(null);
  const { width: windowWidth } = useWindowDimensions();

  useEffect(() => {
    let offset = 0;
    for (let i = 0; i < currentIndex; i++) {
      offset += INACTIVE_SIZE + GAP;
    }
    const centeredX = offset - windowWidth / 2 + ACTIVE_SIZE / 2;
    scrollRef.current?.scrollTo({ x: Math.max(0, centeredX), animated: true });
  }, [currentIndex, windowWidth]);

  if (notes.length <= 1) return null;

  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[styles.content, { paddingHorizontal: windowWidth / 2 - ACTIVE_SIZE / 2 }]}
    >
      {notes.map((note, i) => {
        const active = i === currentIndex;
        const size = active ? ACTIVE_SIZE : INACTIVE_SIZE;
        return (
          <Pressable
            key={note.id}
            onPress={() => onSelect(i)}
            style={[
              styles.tile,
              {
                width: size,
                height: size,
                borderColor: active ? colors.accent : "transparent",
                opacity: active ? 1 : 0.55,
              },
            ]}
          >
            <MediaThumb note={note} showPlayBadge={false} />
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: GAP,
    paddingTop: 14,
    paddingBottom: 2,
  },
  tile: {
    flexShrink: 0,
    borderRadius: 8,
    borderWidth: 2,
    overflow: "hidden",
  },
});
