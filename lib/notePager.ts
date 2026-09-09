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
