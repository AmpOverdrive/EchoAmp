"use client";

import { create } from "zustand";

export type AppSettings = {
  autoOpenNowPlaying: boolean;
  coverArtBackground: boolean;
  floatingPlayerBar: boolean;
  showAudioQualityBadges: boolean;
  glassEffects: boolean;
  syncedLyrics: boolean;
  fullscreenLyrics: boolean;
  showSimilarArtists: boolean;
  showTourDates: boolean;
  compactLayout: boolean;
  uiFont: string;
  uiScale: number;
  seekbarStyle: string;
  fullscreenArtistPortrait: boolean;
  portraitDimming: number;
  defaultHomePage: string;
  albumSortDefault: "asc" | "desc";
  gridDensityDefault: "large" | "normal" | "compact";
  lyricsProvider: "auto" | "navidrome";
  cacheAlbumArt: boolean;
};

type AppSettingsState = AppSettings & {
  setSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
  resetSettings: () => void;
};

const STORAGE_KEY = "navidrome-app-settings";

export const defaultAppSettings: AppSettings = {
  autoOpenNowPlaying: true,
  coverArtBackground: true,
  floatingPlayerBar: false,
  showAudioQualityBadges: true,
  glassEffects: true,
  syncedLyrics: true,
  fullscreenLyrics: true,
  showSimilarArtists: true,
  showTourDates: true,
  compactLayout: false,
  uiFont: "inter",
  uiScale: 1,
  seekbarStyle: "truewave",
  fullscreenArtistPortrait: true,
  portraitDimming: 40,
  defaultHomePage: "/library",
  albumSortDefault: "asc",
  gridDensityDefault: "normal",
  lyricsProvider: "auto",
  cacheAlbumArt: true,
};

function loadSettings(): AppSettings {
  if (typeof window === "undefined") return defaultAppSettings;

  try {
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "{}");
    return { ...defaultAppSettings, ...saved };
  } catch {
    return defaultAppSettings;
  }
}

function saveSettings(settings: AppSettings) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  window.dispatchEvent(new CustomEvent("app-settings-changed", { detail: settings }));
}

export const useAppSettingsStore = create<AppSettingsState>((set, get) => ({
  ...loadSettings(),

  setSetting: (key, value) =>
    set((state) => {
      const next = { ...state, [key]: value } as AppSettingsState;
      const settings: AppSettings = {
        autoOpenNowPlaying: next.autoOpenNowPlaying,
        coverArtBackground: next.coverArtBackground,
        floatingPlayerBar: next.floatingPlayerBar,
        showAudioQualityBadges: next.showAudioQualityBadges,
        glassEffects: next.glassEffects,
        syncedLyrics: next.syncedLyrics,
        fullscreenLyrics: next.fullscreenLyrics,
        showSimilarArtists: next.showSimilarArtists,
        showTourDates: next.showTourDates,
        compactLayout: next.compactLayout,
        uiFont: next.uiFont,
        uiScale: next.uiScale,
        seekbarStyle: next.seekbarStyle,
        fullscreenArtistPortrait: next.fullscreenArtistPortrait,
        portraitDimming: next.portraitDimming,
        defaultHomePage: next.defaultHomePage,
        albumSortDefault: next.albumSortDefault,
        gridDensityDefault: next.gridDensityDefault,
        lyricsProvider: next.lyricsProvider,
        cacheAlbumArt: next.cacheAlbumArt,
      };
      saveSettings(settings);
      return next;
    }),

  resetSettings: () => {
    saveSettings(defaultAppSettings);
    set(defaultAppSettings);
  },
}));
