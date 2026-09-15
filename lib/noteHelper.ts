// Picture-note helpers, in four parts:
//   1. Filtering — the gallery's search query, date presets and summary line.
//   2. Pager — the two arithmetic rules behind swiping between notes.
//   3. Snippets — how a snippet joins the text already in a note.
//   4. Saving — writing a new note's files and storage entries.
//
// Parts 1–3 are pure: no storage, no React. Part 4 holds the save pipeline for
// a new note, outside useAddNote, so the hook itself has no try/catch; the
// file steps it calls live in mediaHelper.

import * as Crypto from "expo-crypto";
import { Directory, Paths } from "expo-file-system";
import { formatShortDate } from "@/lib/date";
import { copyAndGetMediaFileUri, createThumbnailAsync, deleteFileIfExists } from "@/lib/mediaHelper";
import { NoteMediaType, NoteModel, TagModel } from "@/models/NoteModel";
import { setNoteToStorageAsync, setTagsToStorageAsync } from "@/persistence/FileStorage";

// ── 1. Filtering ────────────────────────────────────────────────────────────

/** Date windows offered as pills in the gallery toolbar. `custom` is never a
 *  pill — it's what the query reports once an explicit from/to range has been
 *  picked in the search modal, so none of the four pills highlights. */
export type DatePreset = "any" | "today" | "week" | "month" | "custom";

export const DATE_PRESETS: { id: Exclude<DatePreset, "custom">; label: string }[] = [
    { id: "any", label: "Any time" },
    { id: "today", label: "Today" },
    { id: "week", label: "7 days" },
    { id: "month", label: "30 days" },
];

export type NoteQuery = {
    /** Free text, matched against the note body and its tag titles. */
    text: string;
    /** Tag ids that must ALL be present. Empty means "don't filter by tag". */
    tagIds: string[];
    /** Inclusive ISO "yyyy-mm-dd" bounds. "" means that end is open. */
    from: string;
    to: string;
    /** Which pill to light up. Presentational only — filtering reads from/to,
     *  so there is exactly one date filter to reason about rather than a pill
     *  and a range that can disagree. */
    preset: DatePreset;
};

export const EMPTY_QUERY: NoteQuery = { text: "", tagIds: [], from: "", to: "", preset: "any" };

/** True when nothing is being filtered — lets a caller skip the work and show
 *  the unfiltered list, and lets the UI decide whether to offer a "clear". */
export function isEmptyQuery(q: NoteQuery): boolean {
    return (
        q.text.trim().length === 0 &&
        q.tagIds.length === 0 &&
        q.from.length === 0 &&
        q.to.length === 0
    );
}

/** ISO "yyyy-mm-dd" for `daysAgo` days before today, in local time. */
function isoDaysAgo(daysAgo: number): string {
    const d = new Date();
    d.setHours(12, 0, 0, 0);
    d.setDate(d.getDate() - daysAgo);
    //* noon, not midnight, and built by hand rather than via toISOString():
    //* toISOString() converts to UTC first, so east of Greenwich a local
    //* midnight lands on the previous calendar day and "Today" silently
    //* matches yesterday's notes
    const month = `${d.getMonth() + 1}`.padStart(2, "0");
    const day = `${d.getDate()}`.padStart(2, "0");
    return `${d.getFullYear()}-${month}-${day}`;
}

/** Applies a preset pill, rewriting the from/to range it stands for. */
export function withPreset(query: NoteQuery, preset: Exclude<DatePreset, "custom">): NoteQuery {
    if (preset === "any") return { ...query, from: "", to: "", preset: "any" };
    const days = preset === "today" ? 0 : preset === "week" ? 6 : 29;
    //* `to` stays open rather than pinned to today — a note dated in the
    //* future (the date field is free) shouldn't vanish from "7 days"
    return { ...query, from: isoDaysAgo(days), to: "", preset };
}

/** Applies a hand-picked range, which by definition matches no pill. */
export function withRange(query: NoteQuery, from: string, to: string): NoteQuery {
    const cleared = from.length === 0 && to.length === 0;
    return { ...query, from, to, preset: cleared ? "any" : "custom" };
}

/**
 * Filters notes by text, tags and a date range.
 *
 * Pure and synchronous: it takes the already-loaded list rather than reading
 * storage, so it can run on every keystroke without touching AsyncStorage, and
 * can be unit-tested without mocking anything.
 *
 * Tags are matched by id but *searched* by title, which is why `allTags` is
 * needed — a note only stores tagIds, and a user typing "beach" means the tag
 * named beach, not an id they've never seen.
 */
export function filterNotes(
    notes: NoteModel[],
    query: NoteQuery,
    allTags: TagModel[],
): NoteModel[] {
    if (isEmptyQuery(query)) return notes;

    const text = query.text.trim().toLowerCase();
    const titleById = new Map(allTags.map((t) => [t.id, t.title.toLowerCase()]));

    return notes.filter((note) => {
        //* note.date is a plain "yyyy-mm-dd" string, and that format sorts
        //* lexicographically the same way it sorts chronologically — so both
        //* bounds are string comparisons, with no parsing per note
        if (query.from.length > 0 && (note.date.length === 0 || note.date < query.from)) return false;
        if (query.to.length > 0 && (note.date.length === 0 || note.date > query.to)) return false;

        //* every selected tag must be present, so stacking tags narrows rather
        //* than widens — "beach AND sunset", not "beach OR sunset"
        if (query.tagIds.length > 0 && !query.tagIds.every((id) => note.tagIds.includes(id))) {
            return false;
        }

        if (text.length > 0) {
            const inBody = note.note.toLowerCase().includes(text);
            const inTags = note.tagIds.some((id) => titleById.get(id)?.includes(text) === true);
            if (!inBody && !inTags) return false;
        }

        return true;
    });
}

/** One-line summary of what's filtered, for the collapsed search button.
 *  Empty string when nothing is. */
export function describeQuery(query: NoteQuery, allTags: TagModel[]): string {
    const parts: string[] = [];

    const text = query.text.trim();
    if (text.length > 0) parts.push(`"${text}"`);

    if (query.tagIds.length > 0) {
        parts.push(
            query.tagIds
                .map((id) => allTags.find((t) => t.id === id))
                .filter((t): t is TagModel => t != null)
                .map((t) => `#${t.title}`)
                .join(" "),
        );
    }

    if (query.from.length > 0 || query.to.length > 0) {
        const from = query.from.length > 0 ? formatShortDate(query.from) : "any";
        const to = query.to.length > 0 ? formatShortDate(query.to) : "any";
        parts.push(`${from} → ${to}`);
    }

    return parts.join("  ·  ");
}

// ── 2. Pager ────────────────────────────────────────────────────────────────
// The two arithmetic rules behind the picture-note pager, kept out of the
// component so they can be read — and tested — on their own. Both are marked
// "worklet" because the pan handler calls them on the UI thread; they are
// ordinary pure functions from JS's point of view.

/** A flick faster than this pages regardless of how far it travelled. Matching
 *  on distance alone makes a quick, short swipe feel ignored. */
export const FLING_VELOCITY = 420; // px/s

/** How much of a drag survives past the first or last note. Low enough that
 *  the end of the list is unmistakable, not so low the card feels stuck. */
export const EDGE_RESISTANCE = 0.32;

/**
 * Where the track should sit for a raw finger position, damping anything past
 * either end of the list.
 *
 * @param raw       where the drag would put the track, unclamped and negative-going
 * @param furthest  the track position of the last page (0 for a single note)
 *
 * A hard stop at the ends reads as the gesture having failed; the give is what
 * says "there is nothing after this".
 */
export function rubberBand(raw: number, furthest: number): number {
    "worklet";
    if (raw > 0) return raw * EDGE_RESISTANCE;
    if (raw < furthest) return furthest + (raw - furthest) * EDGE_RESISTANCE;
    return raw;
}

/**
 * Which page a release lands on.
 *
 * @param page       where the track is now, measured in pages (2.4 = 40% of the
 *                   way from note 2 to note 3)
 * @param velocityX  release velocity, px/s; negative is a flick towards "next"
 * @param count      how many notes there are
 *
 * A flick moves exactly one page whichever way it was thrown, taking its
 * direction from velocity rather than displacement — so a flick that has
 * already started to come back still counts as "next". Anything slower falls
 * to the nearest page, i.e. past halfway commits.
 */
export function snapTarget(page: number, velocityX: number, count: number): number {
    "worklet";
    const target =
        Math.abs(velocityX) > FLING_VELOCITY
            ? velocityX < 0
                ? Math.floor(page) + 1
                : Math.ceil(page) - 1
            : Math.round(page);
    return Math.min(count - 1, Math.max(0, target));
}

// ── 3. Snippets ─────────────────────────────────────────────────────────────
// How a snippet joins the text already in a note. Shared because there are two
// editors — the AddNote sheet and the viewer's in-place editor — and a rule
// copied into both is a rule that drifts.

/**
 * Appends a snippet to whatever has been written so far.
 *
 * Always lands at the end rather than at the cursor: neither editor tracks a
 * selection, and inserting mid-word because the caret happened to be there is
 * worse than a predictable append. The existing text is trimmed first so
 * tapping two snippets in a row gives exactly one space between them.
 *
 * @param current  the note text as it stands
 * @param snippet  the snippet's body (not its name — the name only labels the chip)
 * @returns        the text the field should now hold
 */
export function appendSnippet(current: string, snippet: string): string {
    const trimmed = current.trim();
    return trimmed.length > 0 ? `${trimmed} ${snippet}` : snippet;
}

// ── 4. Saving a new picture-note ────────────────────────────────────────────

const getNoteMediaDir = () => new Directory(Paths.document, "note-media");

/** What the Add Note sheet has collected, ready to save. */
export type NoteDraft = {
    /** The picker's uri — a temporary file until saving copies it. */
    mediaUri: string;
    mediaType: NoteMediaType;
    mimeType: string | null;
    text: string;
    /** ISO "yyyy-mm-dd". */
    date: string;
    /** Tag titles as shown on the sheet; ones not stored yet are created. */
    tags: string[];
    /** null = gallery only. */
    folderId: string | null;
};

/**
 * Writes a new picture-note: copies its media into app storage, makes a
 * thumbnail, saves any new tags, then the note itself.
 *
 * Returns an error message to show, or null once the note is saved. Never
 * throws. Every file it created is deleted again if a later step fails, so a
 * failed save can't leave media on disk that no note points at.
 */
export async function saveNoteDraftAsync(draft: NoteDraft, storedTags: TagModel[]): Promise<string | null> {
    const created: string[] = [];
    try {
        const mediaUri = await copyAndGetMediaFileUri(getNoteMediaDir(), { uri: draft.mediaUri, mimeType: draft.mimeType }, draft.mediaType);
        created.push(mediaUri);

        //* every note must have a thumbnail — a video's first frame or the photo
        //* shrunk to tile size, so the gallery isn't decoding full camera
        //* resolution per cell
        const thumbnailUri = await createThumbnailAsync(getNoteMediaDir(), mediaUri, draft.mediaType);
        if (thumbnailUri == null) {
            created.forEach(deleteFileIfExists);
            return "Couldn't make a preview for that photo or video, so it wasn't saved. Try a different one.";
        }
        created.push(thumbnailUri);

        const tagIds = await saveTagsAsync(draft.tags, storedTags);
        await setNoteToStorageAsync({
            id: Crypto.randomUUID(),
            mediaUri,
            mediaType: draft.mediaType,
            thumbnailUri,
            note: draft.text,
            date: draft.date,
            tagIds,
            folderId: draft.folderId,
            createdAt: new Date().toISOString(),
        });
        return null;
    } catch {
        //* the copy, the tag write or the note write failed. New tags that were
        //* already written stay — they're harmless and show up as stored tags
        created.forEach(deleteFileIfExists);
        return "Couldn't save that note. Try again.";
    }
}

/** Stores any of `tagNames` that aren't stored yet, and returns the note's tag
 *  ids in the order the sheet showed them. Titles match without case. */
async function saveTagsAsync(tagNames: string[], storedTags: TagModel[]): Promise<string[]> {
    const newTags: TagModel[] = tagNames
        .filter((name) => !storedTags.some((tag) => tag.title.toLowerCase() === name.toLowerCase()))
        .map((title) => ({ id: Crypto.randomUUID(), title }));
    const allTags = [...storedTags, ...newTags];
    if (newTags.length > 0) {
        await setTagsToStorageAsync(allTags);
    }
    return tagNames.map((name) => allTags.find((tag) => tag.title.toLowerCase() === name.toLowerCase())!.id);
}
