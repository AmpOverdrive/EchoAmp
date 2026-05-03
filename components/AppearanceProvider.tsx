"use client";

import { useEffect } from "react";

export const THEME_STORAGE_KEY = "navidrome-theme";
export const ACCENT_STORAGE_KEY = "navidrome-accent";
const ACCENT_VERSION_KEY = "navidrome-accent-v2";

export const accentOptions = ["Theme", "Blue", "Green", "Purple", "Orange"] as const;

export type ThemeOption =
  | "psysonic-dark"
  | "midnight-blue"
  | "slate"
  | "mocha"
  | "latte"
  | "dracula"
  | "gruvbox-dark"
  | "amoled-black-pure"
  | "phosphor-green"
  | "rose-dark"
  | "sepia-dark"
  | "ice-blue";

type ThemeDef = {
  id: ThemeOption;
  label: string;
  bg: string;
  card: string;
  accent: string;
};

export const themeGroups: Array<{ group: string; themes: ThemeDef[] }> = [
  {
    group: "Psysonic",
    themes: [
      { id: "psysonic-dark", label: "Psysonic Dark", bg: "#17212d", card: "#1f2b3a", accent: "#93c5fd" },
      { id: "midnight-blue", label: "Midnight Blue", bg: "#0d1420", card: "#111a28", accent: "#60a5fa" },
      { id: "slate", label: "Slate", bg: "#20262f", card: "#303946", accent: "#b2bdcb" },
    ],
  },
  {
    group: "Open Source Classics",
    themes: [
      { id: "mocha", label: "Mocha", bg: "#1e1e2e", card: "#313244", accent: "#cba6f7" },
      { id: "latte", label: "Latte", bg: "#eff1f5", card: "#ccd0da", accent: "#8839ef" },
      { id: "dracula", label: "Dracula", bg: "#282a36", card: "#44475a", accent: "#bd93f9" },
      { id: "gruvbox-dark", label: "Gruvbox Dark", bg: "#282828", card: "#3c3836", accent: "#fabd2f" },
    ],
  },
  {
    group: "Community",
    themes: [
      { id: "amoled-black-pure", label: "AMOLED", bg: "#000000", card: "#050505", accent: "#ffffff" },
      { id: "phosphor-green", label: "Phosphor", bg: "#0d1a0d", card: "#111f11", accent: "#4ade80" },
      { id: "rose-dark", label: "Rose Dark", bg: "#1a0d14", card: "#20111a", accent: "#f472b6" },
      { id: "sepia-dark", label: "Sepia Dark", bg: "#1e1a14", card: "#252018", accent: "#c8b89a" },
      { id: "ice-blue", label: "Ice Blue", bg: "#0e1d28", card: "#132430", accent: "#7dd3e8" },
    ],
  },
] as const;

export const themeOptions = themeGroups.flatMap((group) => group.themes);

export type AccentOption = (typeof accentOptions)[number];

export function applyAppearance(theme: ThemeOption, accent: AccentOption) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.dataset.appTheme = theme;
  document.documentElement.dataset.appAccent = accent.toLowerCase();
}

export function getSavedAppearance() {
  const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
  const savedAccent = window.localStorage.getItem(ACCENT_STORAGE_KEY);
  const accentWasChosenWithThemeMode =
    window.localStorage.getItem(ACCENT_VERSION_KEY) === "1";
  const accent =
    savedAccent === "Blue" && !accentWasChosenWithThemeMode
      ? "Theme"
      : savedAccent;

  return {
    theme: themeOptions.some((theme) => theme.id === savedTheme)
      ? (savedTheme as ThemeOption)
      : "psysonic-dark",
    accent: accentOptions.includes(accent as AccentOption)
      ? (accent as AccentOption)
      : "Theme",
  };
}

export default function AppearanceProvider() {
  useEffect(() => {
    const { theme, accent } = getSavedAppearance();
    applyAppearance(theme, accent);
  }, []);

  return null;
}
