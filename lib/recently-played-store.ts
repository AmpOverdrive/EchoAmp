"use client";

import { create } from "zustand";
import type { Track } from "@/lib/player-store";
import { decodeTrack } from "@/lib/text-utils";

type RecentState = {
  recentTracks: Track[];
  addRecentTrack: (track: Track) => void;
};

const STORAGE_KEY = "navidrome_recent_tracks";

function loadInitial(): Track[] {
  if (typeof window === "undefined") return [];

  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]").map(decodeTrack);
  } catch {
    return [];
  }
}

export const useRecentlyPlayedStore = create<RecentState>((set, get) => ({
  recentTracks: loadInitial(),

  addRecentTrack: (track) => {
    const cleanTrack = decodeTrack(track);
    const current = get().recentTracks.map(decodeTrack);

    const next = [
      cleanTrack,
      ...current.filter((item) => item.id !== cleanTrack.id),
    ].slice(0, 50);

    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));

    set({ recentTracks: next });
  },
}));
