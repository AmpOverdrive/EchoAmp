"use client";

import { create } from "zustand";

export const usePlaylists = create((set) => ({
  playlists: JSON.parse(localStorage.getItem("playlists") || "[]"),

  addPlaylist: (name) =>
    set((state) => {
      const updated = [...state.playlists, { name, songs: [] }];
      localStorage.setItem("playlists", JSON.stringify(updated));
      return { playlists: updated };
    }),

  addSong: (index, song) =>
    set((state) => {
      const updated = [...state.playlists];
      updated[index].songs.push(song);
      localStorage.setItem("playlists", JSON.stringify(updated));
      return { playlists: updated };
    }),
}));
