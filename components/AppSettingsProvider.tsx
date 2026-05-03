"use client";

import { useEffect } from "react";
import { useAppSettingsStore } from "@/lib/app-settings-store";

export default function AppSettingsProvider() {
  const compactLayout = useAppSettingsStore((s) => s.compactLayout);
  const glassEffects = useAppSettingsStore((s) => s.glassEffects);
  const floatingPlayerBar = useAppSettingsStore((s) => s.floatingPlayerBar);
  const uiFont = useAppSettingsStore((s) => s.uiFont);
  const uiScale = useAppSettingsStore((s) => s.uiScale);
  const seekbarStyle = useAppSettingsStore((s) => s.seekbarStyle);

  useEffect(() => {
    document.documentElement.dataset.compactLayout = compactLayout ? "true" : "false";
    document.documentElement.dataset.glassEffects = glassEffects ? "true" : "false";
    document.documentElement.dataset.floatingPlayer = floatingPlayerBar ? "true" : "false";
    document.documentElement.dataset.uiFont = uiFont;
    document.documentElement.dataset.seekbarStyle = seekbarStyle;
    document.documentElement.style.fontSize = `${Math.max(0.8, Math.min(1.5, uiScale)) * 16}px`;
  }, [compactLayout, floatingPlayerBar, glassEffects, seekbarStyle, uiFont, uiScale]);

  return null;
}
