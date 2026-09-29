import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, Modal, Text, View } from "react-native";
import { Feather } from "@react-native-vector-icons/feather/static";
import { useLocalSearchParams, useRouter } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/theme/ThemeContext";
import { flatSurface } from "@/theme/glass";
import GlassPressable from "@/components/GlassPressable";
import PressableScale from "@/components/PressableScale";
import GlassSurface from "@/components/GlassSurface";
import { hexToRgba } from "@/theme/colors";
import TopBar from "@/components/TopBar";
import GalleryGrid from "@/components/GalleryGrid";
import ViewNote from "@/components/ViewNote";
import ImportSummary from "@/components/ImportSummary";
import MoveNotesModal from "@/components/MoveNotesModal";
import { BottomBarInsetContext } from "@/lib/BottomBarInset";
import { formatDayDate } from "@/lib/date";
import { useLibrary } from "@/lib/LibraryContext";
import {
    commitStagedImportAsync,
    discardStagedImport,
    stageImportAsync,
    TransferError,
    type StagedImport,
} from "@/lib/noteTransfer";
import type { NoteModel, TagModel } from "@/models/NoteModel";
import { importScreenStyles as styles } from "@/theme/styles/transfer.styles";

// The preview of a .noteit file: what's in it, before any of it is added.
//
// The file is unpacked into the cache as the screen opens, and everything here
// reads from that copy — the library isn't touched until "Add" commits it.
// Leaving any other way (Discard, back, the close button) throws the copy
// away, which is why that happens on unmount rather than in each button.
//
// Reached with the file's uri as `?uri=`: from Settings after the file picker,
// and later from the OS when another app opens a .noteit with NoteIt.
export default function ImportPreview() {
    const { colors } = useTheme();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { uri } = useLocalSearchParams<{ uri?: string }>();
    const { folders, reloadAsync } = useLibrary();

    const [staged, setStaged] = useState<StagedImport | null>(null);
    const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
    const [stageError, setStageError] = useState<string | undefined>(undefined);
    //* derived, not set in the effect: a missing uri is known on the first render
    const error = uri == null ? "No file was given to open." : stageError;
    const [adding, setAdding] = useState(false);
    const [barHeight, setBarHeight] = useState(0);

    //* what the unmount cleanup discards. A ref, because the cleanup has to see
    //* the staged copy that exists when the screen goes, not the one from the
    //* render the effect was set up in
    const stagedRef = useRef<StagedImport | null>(null);

    useEffect(() => {
        if (uri == null) return;
        let cancelled = false;
        stageImportAsync(uri, (done, total) => {
            if (!cancelled) setProgress({ done, total });
        })
            .then((result) => {
                //* the screen closed while it was still unpacking
                if (cancelled) {
                    discardStagedImport(result);
                    return;
                }
                stagedRef.current = result;
                setStaged(result);
            })
            .catch((caught) => {
                if (cancelled) return;
                setStageError(caught instanceof TransferError ? caught.message : "That file couldn't be opened.");
            });

        return () => {
            cancelled = true;
            if (stagedRef.current != null) discardStagedImport(stagedRef.current);
            stagedRef.current = null;
        };
    }, [uri]);

    //* the staged notes, dressed as NoteModels so the grid and the viewer can
    //* draw them as they are. Their tags travel as titles, so each title stands
    //* in as its own id
    const previewNotes = useMemo<NoteModel[]>(
        () =>
            staged == null
                ? []
                : staged.notes.map((note, i) => ({
                    id: String(i),
                    mediaUri: note.mediaUri,
                    mediaType: note.mediaType,
                    thumbnailUri: note.thumbnailUri,
                    note: note.note,
                    date: note.date,
                    tagIds: note.tagTitles,
                    folderId: null,
                    createdAt: staged.payload.exportedAt,
                })),
        [staged],
    );
    const previewTags = useMemo<TagModel[]>(() => {
        const titles = new Set(staged?.notes.flatMap((note) => note.tagTitles) ?? []);
        return [...titles].map((title) => ({ id: title, title }));
    }, [staged]);

    //* the note opened from the grid, as an index into previewNotes
    const [openIndex, setOpenIndex] = useState<number | null>(null);
    const [noteOpen, setNoteOpen] = useState(false);

    //* where a single note goes; a folder import makes its own folder instead.
    //* A folder deleted meanwhile falls back to the gallery rather than
    //* leaving the note pointing at nothing
    const [targetFolderId, setTargetFolderId] = useState<string | null>(null);
    const targetFolder = folders.find((f) => f.id === targetFolderId) ?? null;
    const [pickingFolder, setPickingFolder] = useState(false);

    //* opened by another app, this is the first screen and there's nothing to
    //* go back to — so it goes home instead
    const close = () => {
        if (router.canGoBack()) router.back();
        else router.replace("/(tabs)/home");
    };

    const addAsync = async () => {
        if (staged == null || adding) return;
        setAdding(true);
        try {
            await commitStagedImportAsync(staged, { targetFolderId: targetFolder?.id ?? null });
            //* committed files moved out of the staging folder; nothing left to discard
            stagedRef.current = null;
            await reloadAsync();
            close();
        } catch (caught) {
            Alert.alert(
                "Couldn't add it",
                caught instanceof TransferError ? caught.message : "Something went wrong adding that file. Try again.",
            );
        } finally {
            setAdding(false);
        }
    };

    const payload = staged?.payload ?? null;
    const isFolder = payload?.kind === "folder";
    const noteCount = previewNotes.length;
    const title =
        payload == null
            ? "Opening…"
            : isFolder
                ? payload.folder?.name ?? "Shared folder"
                : noteCount === 1
                    ? "Shared note"
                    : "Shared notes";

    const meta =
        staged == null
            ? ""
            : [
                noteCount === 1 ? "1 picture-note" : `${noteCount} picture-notes`,
                formatBytes(staged.totalBytes),
                `exported ${formatShortDate(staged.payload.exportedAt)}`,
            ].join(" · ");

    return (
        <View style={[styles.screen, { backgroundColor: colors.bg }]}>
            <TopBar
                title={title}
                colors={colors}
                right={
                    <GlassPressable
                        colors={colors}
                        onPress={close}
                        hitSlop={8}
                        accessibilityRole="button"
                        accessibilityLabel="Close without adding"
                        style={styles.headerButton}
                    >
                        <Feather name="x" size={17} color={colors.textPrimary} />
                    </GlassPressable>
                }
            />

            {staged == null ? (
                //* also what shows behind the error dialog, so it never flashes
                //* an empty preview first
                error == null && (
                    <View style={styles.loading}>
                        <ActivityIndicator color={colors.accent} />
                        <Text style={[styles.loadingTitle, { color: colors.textPrimary }]}>Opening the file…</Text>
                        <Text style={[styles.loadingDetail, { color: colors.stone }]}>
                            {progress != null && progress.total > 0
                                ? `Unpacking ${progress.done} of ${progress.total}`
                                : "Checking what's inside"}
                        </Text>
                    </View>
                )
            ) : (
                <>
                    <View style={styles.summary}>
                        <Text style={[styles.meta, { color: colors.stone }]}>{meta}</Text>

                        <View
                            style={[
                                styles.notice,
                                { borderColor: hexToRgba(colors.teal, 0.45), backgroundColor: hexToRgba(colors.teal, 0.1) },
                            ]}
                        >
                            <Feather name="eye" size={16} color={colors.teal} />
                            <Text style={[styles.noticeText, { color: colors.textPrimary }]}>
                                Preview only. Tap a note to read it. Nothing is added until you choose.
                            </Text>
                        </View>

                        {previewTags.length > 0 && (
                            <View style={styles.tags}>
                                {previewTags.map((tag) => (
                                    <View
                                        key={tag.id}
                                        style={[
                                            styles.tag,
                                            {
                                                borderColor: hexToRgba(colors.accent, 0.6),
                                                backgroundColor: hexToRgba(colors.accent, 0.16),
                                            },
                                        ]}
                                    >
                                        <Text style={[styles.tagLabel, { color: colors.accent }]}>#{tag.title}</Text>
                                    </View>
                                ))}
                            </View>
                        )}
                    </View>

                    {/* the grid pads its end by the floating bar's height, the
                        way home's lists clear the tab bar */}
                    <BottomBarInsetContext.Provider value={barHeight}>
                        <View style={styles.grid}>
                            <GalleryGrid
                                notes={previewNotes}
                                colors={colors}
                                onOpenNote={(note) => {
                                    setNoteOpen(false);
                                    setOpenIndex(previewNotes.indexOf(note));
                                }}
                            />
                        </View>
                    </BottomBarInsetContext.Provider>

                    <View
                        style={[styles.barWrap, { paddingBottom: insets.bottom + 12 }]}
                        onLayout={(e) => setBarHeight(e.nativeEvent.layout.height)}
                    >
                        {!isFolder && (
                            <GlassPressable
                                colors={colors}
                                lift="float"
                                onPress={() => setPickingFolder(true)}
                                accessibilityRole="button"
                                accessibilityLabel={`Add to ${targetFolder?.name ?? "the gallery only"}. Change`}
                                style={styles.destination}
                            >
                                <Text style={[styles.destinationHint, { color: colors.stone }]}>Add to</Text>
                                {targetFolder != null ? (
                                    <View style={[styles.destinationDot, { backgroundColor: targetFolder.accent }]} />
                                ) : (
                                    <Feather name="image" size={14} color={colors.stone} />
                                )}
                                <Text
                                    style={[styles.destinationName, { color: colors.textPrimary }]}
                                    numberOfLines={1}
                                >
                                    {targetFolder?.name ?? "Gallery only"}
                                </Text>
                                <Feather name="chevron-down" size={16} color={colors.stone} />
                            </GlassPressable>
                        )}
                        <GlassSurface colors={colors} lift="float" style={styles.bar}>
                            {/* the buttons on the bar draw flat even on iOS 26:
                                glass can't sample glass */}
                            <PressableScale
                                onPress={close}
                                disabled={adding}
                                accessibilityRole="button"
                                style={[styles.barButton, flatSurface(colors), { opacity: adding ? 0.5 : 1 }]}
                            >
                                <Text style={[styles.barButtonLabel, { color: colors.textPrimary }]}>Discard</Text>
                            </PressableScale>
                            <PressableScale
                                onPress={addAsync}
                                disabled={adding}
                                accessibilityRole="button"
                                accessibilityState={{ busy: adding }}
                                style={[
                                    styles.barButton,
                                    styles.barButtonPrimary,
                                    flatSurface(colors, { tint: colors.accentSolid, strength: "fill" }),
                                ]}
                            >
                                {adding ? (
                                    <ActivityIndicator color={colors.onAccent} />
                                ) : (
                                    <>
                                        <Feather name="download" size={16} color={colors.onAccent} />
                                        <Text style={[styles.barButtonLabel, { color: colors.onAccent }]}>
                                            {isFolder ? "Add to my folders" : noteCount === 1 ? "Add note" : "Add notes"}
                                        </Text>
                                    </>
                                )}
                            </PressableScale>
                        </GlassSurface>
                    </View>
                </>
            )}

            {/* one staged note at a time, in the app's own viewer. Read-only:
                none of the viewer screen's editing or deleting is offered */}
            <Modal
                visible={openIndex != null}
                animationType="slide"
                onRequestClose={() => setOpenIndex(null)}
            >
                {/* a Modal is its own native root, so gestures need their own
                    handler root inside it */}
                <GestureHandlerRootView style={[styles.viewer, { backgroundColor: colors.bg }]}>
                    <TopBar
                        title={title}
                        colors={colors}
                        onBack={() => setOpenIndex(null)}
                        right={
                            <GlassPressable
                                colors={colors}
                                tint={noteOpen ? colors.accent : undefined}
                                onPress={() => setNoteOpen(!noteOpen)}
                                hitSlop={8}
                                accessibilityRole="button"
                                accessibilityState={{ selected: noteOpen }}
                                accessibilityLabel={noteOpen ? "Hide the note" : "Show the note"}
                                style={styles.headerButton}
                            >
                                <Feather
                                    name="file-text"
                                    size={16}
                                    color={noteOpen ? colors.accent : colors.textPrimary}
                                />
                            </GlassPressable>
                        }
                    />
                    {openIndex != null && (
                        <View style={[styles.viewerBody, { paddingBottom: insets.bottom + 12 }]}>
                            <ViewNote
                                notes={previewNotes}
                                index={openIndex}
                                onIndexChange={setOpenIndex}
                                tags={previewTags}
                                colors={colors}
                                noteOpen={noteOpen}
                                onToggleNote={setNoteOpen}
                            />
                        </View>
                    )}
                </GestureHandlerRootView>
            </Modal>

            <MoveNotesModal
                visible={pickingFolder}
                colors={colors}
                folders={folders}
                count={noteCount}
                title={noteCount === 1 ? "Add this note to…" : `Add ${noteCount} notes to…`}
                onCancel={() => setPickingFolder(false)}
                onSelectFolder={(folderId) => {
                    setTargetFolderId(folderId);
                    setPickingFolder(false);
                }}
            />

            {/* a file that can't be read gets the same dialog Settings used to
                show, and closing it leaves the screen */}
            <ImportSummary
                visible={error != null}
                payload={null}
                error={error}
                busy={false}
                colors={colors}
                onCancel={close}
                onConfirm={() => {}}
            />
        </View>
    );
}

function formatBytes(bytes: number): string {
    if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
    const mb = bytes / (1024 * 1024);
    return mb < 10 ? `${mb.toFixed(1)} MB` : `${Math.round(mb)} MB`;
}

//* "12 Sep 2026" — the weekday formatDayDate adds is noise in a summary line
function formatShortDate(iso: string): string {
    const full = formatDayDate(iso.slice(0, 10));
    const parts = full.split(" · ");
    return parts.length === 2 ? parts[1] : full;
}
