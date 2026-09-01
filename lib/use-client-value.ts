"use client";

import { useCallback, useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};

/**
 * False during SSR and the hydration render, true afterwards - without the
 * setState-in-an-effect that the same pattern usually requires.
 */
export function useIsMounted(): boolean {
    return useSyncExternalStore(
        noopSubscribe,
        () => true,
        () => false,
    );
}

/**
 * Reads a localStorage key as an external store. Server and hydration renders
 * both see "", so the stored value appears only once the client takes over.
 */
export function useStoredValue(key: string): string {
    const subscribe = useCallback((onChange: () => void) => {
        window.addEventListener("storage", onChange);
        return () => window.removeEventListener("storage", onChange);
    }, []);

    return useSyncExternalStore(
        subscribe,
        useCallback(() => localStorage.getItem(key) ?? "", [key]),
        () => "",
    );
}
