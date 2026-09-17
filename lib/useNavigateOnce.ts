//! Manually reviewed since 16/09/2026

import { useCallback, useRef } from "react";
import { useFocusEffect } from "expo-router/react-navigation";

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
