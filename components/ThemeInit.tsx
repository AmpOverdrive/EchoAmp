"use client";

import { useEffect } from "react";

export default function ThemeInit() {
  useEffect(() => {
    try {
      const theme = localStorage.getItem("navidrome-theme") || "psysonic-dark";
      const rawAccent = localStorage.getItem("navidrome-accent");
      const accentV2 = localStorage.getItem("navidrome-accent-v2") === "1";
      const accent =
        rawAccent === "Blue" && !accentV2
          ? "theme"
          : (rawAccent || "theme").toLowerCase();

      document.documentElement.dataset.theme = theme;
      document.documentElement.dataset.appTheme = theme;
      document.documentElement.dataset.appAccent = accent;
    } catch {}
  }, []);

  return null;
}
