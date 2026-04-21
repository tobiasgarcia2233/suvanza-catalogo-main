"use client";

import { useEffect } from "react";
import { create } from "zustand";

interface RefreshGuardState {
  count: number;
  inc: () => void;
  dec: () => void;
}

export const useRefreshGuard = create<RefreshGuardState>((set) => ({
  count: 0,
  inc: () => set((s) => ({ count: s.count + 1 })),
  dec: () => set((s) => ({ count: Math.max(0, s.count - 1) })),
}));

/** Call this inside a component to mark that refresh should be paused while it is mounted/active. */
export function usePauseRefresh(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const { inc, dec } = useRefreshGuard.getState();
    inc();
    return () => dec();
  }, [active]);
}

/** Returns true if anything is currently asking to pause refresh. */
export function isRefreshPaused() {
  return useRefreshGuard.getState().count > 0;
}
