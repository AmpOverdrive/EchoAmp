"use client";

import { create } from "zustand";
import { getStarredItems, starItem, unstarItem } from "@/lib/navidrome";

type FavoritesState = {
  favorites: Record<string, boolean>;
  loadStarredFavorites: () => Promise<void>;
  isFavorite: (id?: string | null) => boolean;
  toggleFavorite: (id: string) => Promise<void>;
};

export const useFavoritesStore = create<FavoritesState>((set, get) => ({
  favorites: {},

  loadStarredFavorites: async () => {
    const starred = await getStarredItems();
    const next: Record<string, boolean> = {};

    [...starred.songs, ...starred.albums, ...starred.artists]
      .filter(Boolean)
      .forEach((item: any) => {
        if (item.id) next[item.id] = true;
      });

    set({ favorites: next });
  },

  isFavorite: (id) => {
    if (!id) return false;
    return Boolean(get().favorites[id]);
  },

  toggleFavorite: async (id) => {
    const current = Boolean(get().favorites[id]);
    const next = !current;

    set((state) => ({
      favorites: {
        ...state.favorites,
        [id]: next,
      },
    }));

    try {
      if (next) {
        await starItem(id);
      } else {
        await unstarItem(id);
      }

      await get().loadStarredFavorites();
    } catch (error) {
      console.error("Favorite sync failed:", error);

      set((state) => ({
        favorites: {
          ...state.favorites,
          [id]: current,
        },
      }));
    }
  },
}));
