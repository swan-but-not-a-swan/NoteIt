// Date helpers for the gallery's search query: the preset pills in the
// toolbar and the hand-picked range in the search sheet. Pure — no storage,
// no React. Calendar formatting lives in lib/date.ts.

import { toLocalISODate } from "@/lib/date";
import type { DatePreset, NoteQuery } from "@/models/NoteQueryModel";

export const DATE_PRESETS: { id: Exclude<DatePreset, "custom">; label: string }[] = [
    { id: "any", label: "Any time" },
    { id: "today", label: "Today" },
    { id: "week", label: "7 days" },
    { id: "month", label: "30 days" },
];

/** ISO "yyyy-mm-dd" for `daysAgo` days before today, in local time. */
function isoDaysAgo(daysAgo: number): string {
    const d = new Date();
    //* stepped back from noon rather than midnight, so a clock change on the
    //* way can't tip it into a neighbouring calendar day
    d.setHours(12, 0, 0, 0);
    d.setDate(d.getDate() - daysAgo);
    return toLocalISODate(d);
}

/** Applies a preset pill, rewriting the from/to range it stands for. */
export function withPreset(query: NoteQuery, preset: Exclude<DatePreset, "custom">): NoteQuery {
    if (preset === "any") return { ...query, from: "", to: "", preset: "any" };
    if (preset === "today") {
        //* pinned at both ends: "Today" means today, not today onwards
        const today = isoDaysAgo(0);
        return { ...query, from: today, to: today, preset };
    }
    const days = preset === "week" ? 6 : 29;
    //* `to` stays open rather than pinned to today — a note dated in the
    //* future (the date field is free) shouldn't vanish from "7 days"
    return { ...query, from: isoDaysAgo(days), to: "", preset };
}

/** Applies a hand-picked range, which by definition matches no pill. */
export function withRange(query: NoteQuery, from: string, to: string): NoteQuery {
    const cleared = from.length === 0 && to.length === 0;
    return { ...query, from, to, preset: cleared ? "any" : "custom" };
}
