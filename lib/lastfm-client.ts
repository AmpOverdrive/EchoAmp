"use client";

import type { Track } from "@/lib/player-store";

export const LASTFM_SESSION_KEY = "lastfm-session-key";
export const LASTFM_USERNAME_KEY = "lastfm-username";
export const LASTFM_SCROBBLING_KEY = "lastfm-scrobbling-enabled";
export const LASTFM_NOW_PLAYING_KEY = "lastfm-now-playing-enabled";
export const LASTFM_DIAGNOSTICS_KEY = "lastfm-diagnostics";

export type LastfmDiagnostics = {
  lastNowPlayingAt?: string;
  lastNowPlayingTrack?: string;
  lastScrobbleAt?: string;
  lastScrobbleTrack?: string;
  lastErrorAt?: string;
  lastError?: string;
};

export function getLastfmDiagnostics(): LastfmDiagnostics {
  if (typeof window === "undefined") return {};

  try {
    return JSON.parse(localStorage.getItem(LASTFM_DIAGNOSTICS_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveLastfmDiagnostics(next: LastfmDiagnostics) {
  if (typeof window === "undefined") return;
  localStorage.setItem(
    LASTFM_DIAGNOSTICS_KEY,
    JSON.stringify({ ...getLastfmDiagnostics(), ...next })
  );
  window.dispatchEvent(new Event("lastfm-diagnostics-changed"));
}

export function getLastfmSettings() {
  if (typeof window === "undefined") {
    return {
      sessionKey: "",
      username: "",
      scrobblingEnabled: false,
      nowPlayingEnabled: false,
    };
  }

  return {
    sessionKey: localStorage.getItem(LASTFM_SESSION_KEY) || "",
    username: localStorage.getItem(LASTFM_USERNAME_KEY) || "",
    scrobblingEnabled: localStorage.getItem(LASTFM_SCROBBLING_KEY) === "1",
    nowPlayingEnabled: localStorage.getItem(LASTFM_NOW_PLAYING_KEY) !== "0",
  };
}

export function saveLastfmSession(sessionKey: string, username: string) {
  localStorage.setItem(LASTFM_SESSION_KEY, sessionKey);
  localStorage.setItem(LASTFM_USERNAME_KEY, username);
  localStorage.setItem(LASTFM_SCROBBLING_KEY, "1");
  localStorage.setItem(LASTFM_NOW_PLAYING_KEY, "1");
  window.dispatchEvent(new Event("lastfm-settings-changed"));
}

export function clearLastfmSession() {
  localStorage.removeItem(LASTFM_SESSION_KEY);
  localStorage.removeItem(LASTFM_USERNAME_KEY);
  window.dispatchEvent(new Event("lastfm-settings-changed"));
}

export function setLastfmFlag(key: string, value: boolean) {
  localStorage.setItem(key, value ? "1" : "0");
  window.dispatchEvent(new Event("lastfm-settings-changed"));
}

async function postLastfm(action: string, payload: Record<string, unknown>) {
  const response = await fetch("/api/lastfm", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action, ...payload }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data?.error || "Last.fm request failed");
  }

  return response.json();
}

export async function createLastfmAuthUrl() {
  const response = await fetch("/api/lastfm?action=auth-url");
  if (!response.ok) throw new Error("Unable to start Last.fm auth");
  return response.json() as Promise<{ token: string; url: string }>;
}

export async function completeLastfmAuth(token: string) {
  const data = await postLastfm("session", { token });
  return {
    sessionKey: data?.session?.key as string,
    username: data?.session?.name as string,
  };
}

export async function updateLastfmNowPlaying(track: Track, sessionKey: string) {
  if (!track.artist || !track.title || track.kind === "radio") return;
  try {
    await postLastfm("now-playing", {
      sessionKey,
      artist: track.artist,
      track: track.title,
      album: track.album || "",
      duration: track.duration || 0,
    });
    saveLastfmDiagnostics({
      lastNowPlayingAt: new Date().toISOString(),
      lastNowPlayingTrack: `${track.artist} - ${track.title}`,
      lastError: "",
      lastErrorAt: "",
    });
  } catch (error) {
    saveLastfmDiagnostics({
      lastErrorAt: new Date().toISOString(),
      lastError: error instanceof Error ? error.message : "Last.fm now playing failed",
    });
    throw error;
  }
}

export async function scrobbleLastfmTrack(
  track: Track,
  sessionKey: string,
  timestamp = Date.now()
) {
  if (!track.artist || !track.title || track.kind === "radio") return;
  try {
    await postLastfm("scrobble", {
      sessionKey,
      artist: track.artist,
      track: track.title,
      album: track.album || "",
      duration: track.duration || 0,
      timestamp,
    });
    saveLastfmDiagnostics({
      lastScrobbleAt: new Date().toISOString(),
      lastScrobbleTrack: `${track.artist} - ${track.title}`,
      lastError: "",
      lastErrorAt: "",
    });
  } catch (error) {
    saveLastfmDiagnostics({
      lastErrorAt: new Date().toISOString(),
      lastError: error instanceof Error ? error.message : "Last.fm scrobble failed",
    });
    throw error;
  }
}
