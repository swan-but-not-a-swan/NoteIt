/** Date windows offered as pills in the gallery toolbar. `custom` is never a
 *  pill — it's what the query reports once an explicit from/to range has been
 *  picked in the search modal, so none of the four pills highlights. */
export type DatePreset = "any" | "today" | "week" | "month" | "custom";

export type NoteQuery = {
    /** Free text, matched against the note body and its tag titles. */
    text: string;
    /** Tag ids to match. Empty means "don't filter by tag". */
    tagIds: string[];
    /** Inclusive ISO "yyyy-mm-dd" bounds. "" means that end is open. */
    from: string;
    to: string;
    /** Which pill to light up. Presentational only — filtering reads from/to,
     *  so there is exactly one date filter to reason about rather than a pill
     *  and a range that can disagree. */
    preset: DatePreset;
    folderIds: string[]; //* Folder ids to match (gallery mode only), UNFILED for notes with no folder
};

/** How a query's filters combine. "and": every filter that is set must
 *  match — inside a folder, where the folder is already the scope. "or":
 *  any one is enough — the gallery tab, where search is for finding across
 *  everything rather than narrowing. */
export type QueryCombine = "and" | "or";

/** Stands in a query's folderIds for notes saved with no folder — the
 *  "No folder (Gallery only)" option in AddNote. */
export const UNFILED = "__unfiled";
