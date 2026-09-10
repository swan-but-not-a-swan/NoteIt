// How a snippet joins the text already in a note. Kept out of both editors
// because there are now two of them — the AddNote sheet and the viewer's
// in-place editor — and a rule copied into both is a rule that drifts.

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
