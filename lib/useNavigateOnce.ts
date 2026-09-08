import { useCallback, useRef } from "react";
import { useFocusEffect } from "expo-router/react-navigation";

/**
 * Wraps a navigation call so a double-tap can't push the same screen twice.
 *
 * Pushing doesn't unmount the screen you pushed from — it stays mounted
 * underneath for the whole transition — so the row that triggered it is still
 * sitting there, still hittable, and a second tap pushes a duplicate. The user
 * then has to press back twice, and the first press looks like it did nothing
 * because the screen behind is identical.
 *
 * The latch clears on focus, which is precisely when navigating again becomes
 * legitimate: either the push was cancelled, or the user has come back.
 */
export function useNavigateOnce() {
    const navigating = useRef(false);

    useFocusEffect(
        useCallback(() => {
            navigating.current = false;
        }, []),
    );

    return useCallback((navigate: () => void) => {
        if (navigating.current) return;
        navigating.current = true;
        navigate();
    }, []);
}
