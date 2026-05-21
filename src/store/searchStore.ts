import { create } from "zustand";
import type { SearchMatch, FileSearchResult } from "@/types";

interface SearchStore {
  isOpen: boolean;
  mode: "find" | "replace" | "global";
  query: string;
  replaceQuery: string;
  caseSensitive: boolean;
  useRegex: boolean;
  matches: SearchMatch[];
  fileResults: FileSearchResult[];
  currentIndex: number;
  openSearch: (mode: "find" | "replace" | "global") => void;
  closeSearch: () => void;
  setQuery: (q: string) => void;
  setReplaceQuery: (q: string) => void;
  toggleCaseSensitive: () => void;
  toggleRegex: () => void;
  setMatches: (m: SearchMatch[]) => void;
  setFileResults: (r: FileSearchResult[]) => void;
  nextMatch: () => void;
  prevMatch: () => void;
}

export const useSearchStore = create<SearchStore>((set, get) => ({
  isOpen: false,
  mode: "find",
  query: "",
  replaceQuery: "",
  caseSensitive: false,
  useRegex: false,
  matches: [],
  fileResults: [],
  currentIndex: -1,

  openSearch: (mode) => set({ isOpen: true, mode }),
  closeSearch: () => set({ isOpen: false, matches: [], fileResults: [], currentIndex: -1 }),
  setQuery: (q) => set({ query: q }),
  setReplaceQuery: (q) => set({ replaceQuery: q }),
  toggleCaseSensitive: () => set((s) => ({ caseSensitive: !s.caseSensitive })),
  toggleRegex: () => set((s) => ({ useRegex: !s.useRegex })),
  setMatches: (m) => set({ matches: m, currentIndex: m.length > 0 ? 0 : -1 }),
  setFileResults: (r) => set({ fileResults: r }),
  nextMatch: () => {
    const { matches, currentIndex } = get();
    if (matches.length === 0) return;
    set({ currentIndex: (currentIndex + 1) % matches.length });
  },
  prevMatch: () => {
    const { matches, currentIndex } = get();
    if (matches.length === 0) return;
    set({
      currentIndex: currentIndex <= 0 ? matches.length - 1 : currentIndex - 1,
    });
  },
}));
