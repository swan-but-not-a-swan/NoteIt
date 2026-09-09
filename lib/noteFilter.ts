import { NoteModel, TagModel } from "@/models/NoteModel";
import { formatShortDate } from "@/lib/date";

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
        parts.push(`${from} \u2192 ${to}`);
    }

    return parts.join("  \u00b7  ");
}
