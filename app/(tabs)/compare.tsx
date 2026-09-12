import { useCallback, useState } from "react";
import {
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
    useWindowDimensions,
} from "react-native";
import { Feather } from "@react-native-vector-icons/feather/static";
import { useFocusEffect } from "expo-router/react-navigation";
import { useLocalSearchParams, useRouter } from "expo-router";
import { type ThemeColors } from "@/theme/colors";
import { useTheme } from "@/theme/ThemeContext";
import { fonts } from "@/theme/fonts";
import { hexToRgba } from "@/lib/color";
import { formatShortDate } from "@/lib/date";
import TopBar from "@/components/TopBar";
import MediaThumb from "@/components/MediaThumb";
import MarkdownText from "@/components/MarkdownText";
import { getNotesFromStorageAsync, getTagsFromStorageAsync } from "@/persistence/FileStorage";
import { NoteModel, TagModel } from "@/models/NoteModel";

const H_PADDING = 18;
const GAP = 12;
/** Fixed width once three or more are side by side, so a fourth is reachable
 *  by scrolling rather than by shrinking every card past legibility. */
const MANY_CARD_W = 180;

// Side-by-side comparison of the picture-notes selected in the gallery.
// Ported from the web reference's CompareView.
//
// The selection happens in the gallery grid, not here: choosing from a
// three-across grid of the notes you were already looking at beats choosing
// from a second, smaller picker on this screen. This route just receives the
// ids and lays them out.
export default function Compare() {
    const { colors } = useTheme();
    const router = useRouter();
    const { width } = useWindowDimensions();
    const { ids } = useLocalSearchParams<{ ids?: string }>();

    const [notes, setNotes] = useState<NoteModel[]>([]);
    const [tags, setTags] = useState<TagModel[]>([]);
    //* removing a card is local to this screen — it narrows the comparison
    //* without editing anything, so backing out and picking again is the undo
    const [removedIds, setRemovedIds] = useState<string[]>([]);

    useFocusEffect(
        useCallback(() => {
            getNotesFromStorageAsync().then(setNotes);
            getTagsFromStorageAsync().then(setTags);
        }, []),
    );

    //* driven by the id list, not by storage order, so the cards sit in the
    //* order they were picked
    const selectedIds = (ids ?? "").split(",").filter((id) => id.length > 0);
    const items = selectedIds
        .filter((id) => !removedIds.includes(id))
        .map((id) => notes.find((n) => n.id === id))
        .filter((n): n is NoteModel => n != null);

    const cardWidth =
        items.length === 1
            ? width - H_PADDING * 2
            : items.length === 2
              ? (width - H_PADDING * 2 - GAP) / 2
              : MANY_CARD_W;

    if (items.length === 0) {
        return (
            <View style={[styles.screen, { backgroundColor: colors.bg }]}>
                <TopBar title="Compare" colors={colors} onBack={() => router.back()} />
                <View style={styles.empty}>
                    <Feather name="columns" size={28} color={colors.stoneDim} />
                    <Text style={[styles.emptyLabel, { color: colors.stone }]}>
                        Nothing left to compare.
                    </Text>
                </View>
            </View>
        );
    }

    return (
        <View style={[styles.screen, { backgroundColor: colors.bg }]}>
            <TopBar
                title={`Comparing ${items.length}`}
                colors={colors}
                onBack={() => router.back()}
            />

            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.row}
            >
                {items.map((note) => (
                    <CompareCard
                        key={note.id}
                        note={note}
                        tags={tags}
                        colors={colors}
                        width={cardWidth}
                        onRemove={() => setRemovedIds((prev) => [...prev, note.id])}
                    />
                ))}
            </ScrollView>
        </View>
    );
}

type CardProps = {
    note: NoteModel;
    tags: TagModel[];
    colors: ThemeColors;
    width: number;
    onRemove: () => void;
};

function CompareCard({ note, tags, colors, width, onRemove }: CardProps) {
    const noteTags = note.tagIds
        .map((id) => tags.find((t) => t.id === id))
        .filter((t): t is TagModel => t != null);

    return (
        <View
            style={[
                styles.card,
                { width, backgroundColor: colors.surface, borderColor: colors.line },
            ]}
        >
            <View style={styles.cardMedia}>
                {/* mediaUri, not the thumbnail: comparing two photos is exactly
                    when detail matters, and MediaThumb's 400px-wide thumbnail
                    would be upscaled at this size. */}
                <MediaThumb note={note} preferFullMedia showPlayBadge={false} />

                <Pressable
                    onPress={onRemove}
                    hitSlop={6}
                    accessibilityLabel="Remove from comparison"
                    style={styles.removeButton}
                >
                    <Feather name="x" size={14} color="#fff" />
                </Pressable>

                {note.date.length > 0 && (
                    <View style={styles.datePill}>
                        <Text style={styles.datePillLabel}>{formatShortDate(note.date)}</Text>
                    </View>
                )}
            </View>

            <ScrollView style={styles.cardBody} contentContainerStyle={styles.cardBodyContent}>
                {note.note.trim().length > 0 ? (
                    <MarkdownText
                        text={note.note}
                        style={[styles.noteText, { color: colors.textPrimary }]}
                    />
                ) : (
                    <Text style={[styles.noteText, { color: colors.stoneDim }]}>No note yet.</Text>
                )}

                {noteTags.length > 0 && (
                    <View style={styles.tagsRow}>
                        {noteTags.map((tag) => (
                            <View
                                key={tag.id}
                                style={[
                                    styles.tagPill,
                                    { backgroundColor: hexToRgba(colors.teal, 0.16) },
                                ]}
                            >
                                <Text style={[styles.tagLabel, { color: colors.teal }]}>
                                    #{tag.title}
                                </Text>
                            </View>
                        ))}
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1 },
    row: {
        flexDirection: "row",
        gap: GAP,
        paddingHorizontal: H_PADDING,
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
    cardBody: { flex: 1 },
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
    emptyLabel: { fontFamily: fonts.interRegular, fontSize: 13 },
});
