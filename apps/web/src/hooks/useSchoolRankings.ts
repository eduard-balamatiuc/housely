"use client";

import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "housely_school_ranks";

export function useSchoolRankings() {
  const [customRanks, setCustomRanksState] = useState<Record<number, number> | null>(null);
  const [loaded, setLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setCustomRanksState(parsed);
      }
    } catch {
      // ignore parse errors
    }
    setLoaded(true);
  }, []);

  const setCustomRanks = useCallback((ranks: Record<number, number> | null) => {
    setCustomRanksState(ranks);
    try {
      if (ranks) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(ranks));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  const resetToDefault = useCallback(() => {
    setCustomRanks(null);
  }, [setCustomRanks]);

  return {
    customRanks,
    setCustomRanks,
    resetToDefault,
    hasCustomRanks: customRanks !== null,
    loaded,
  };
}
