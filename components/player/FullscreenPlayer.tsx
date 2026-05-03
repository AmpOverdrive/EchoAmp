"use client";

import { RefObject, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import {
  ChevronDown,
  Heart,
  Info,
  ListMusic,
  Mic2,
  Pause,
  Play,
  Repeat2,
  Shuffle,
  SkipBack,
  SkipForward,
  Volume2,
} from "lucide-react";
import { getLyrics } from "@/lib/navidrome";
import { useFavoritesStore } from "@/lib/favorites-store";
import { usePlayerStore } from "@/lib/player-store";
import { useAppSettingsStore } from "@/lib/app-settings-store";

type FullscreenTab = "lyrics" | "queue" | "info";

function formatTime(seconds: number) {
  if (!seconds || Number.isNaN(seconds)) return "0:00";
  const total = Math.floor(seconds);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function cleanText(value?: string) {
  if (!value) return "";
  return String(value)
    .replaceAll("&#34;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'")
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

function parseLrc(plain: string) {
  const parsed: Array<{ time: number; text: string }> = [];
  plain.split(/\r?\n/).forEach((line) => {
    const matches = [...line.matchAll(/\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\]/g)];
    const text = line.replace(/\[[^\]]+\]/g, "").trim();
    matches.forEach((match) => {
      const minutes = Number(match[1]);
      const seconds = Number(match[2]);
      const fraction = Number((match[3] || "0").padEnd(3, "0")) / 1000;
      parsed.push({ time: minutes * 60 + seconds + fraction, text });
    });
  });
  return parsed.sort((a, b) => a.time - b.time);
}

export default function FullscreenPlayer({
  audioRef,
}: {
  audioRef: RefObject<HTMLAudioElement | null>;
}) {
  const [tab, setTab] = useState<FullscreenTab>("lyrics");
  const [lyrics, setLyrics] = useState<{ plain: string; synced: Array<{ time: number; text: string }> }>({
    plain: "",
    synced: [],
  });
  const [lyricsLoading, setLyricsLoading] = useState(false);
  const activeLyricRef = useRef<HTMLButtonElement | null>(null);
  const lastScrolledLyricIndex = useRef(-1);

  const track = usePlayerStore((s) => s.currentTrack);
  const queue = usePlayerStore((s) => s.queue);
  const isFullscreen = usePlayerStore((s) => s.isFullscreen);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const currentTime = usePlayerStore((s) => s.currentTime);
  const duration = usePlayerStore((s) => s.duration);
  const volume = usePlayerStore((s) => s.volume);
  const togglePlay = usePlayerStore((s) => s.togglePlay);
  const next = usePlayerStore((s) => s.next);
  const previous = usePlayerStore((s) => s.previous);
  const setTrack = usePlayerStore((s) => s.setTrack);
  const closeFullscreen = usePlayerStore((s) => s.closeFullscreen);
  const seekTo = usePlayerStore((s) => s.seekTo);
  const setVolume = usePlayerStore((s) => s.setVolume);
  const favorites = useFavoritesStore((s) => s.favorites);
  const toggleFavorite = useFavoritesStore((s) => s.toggleFavorite);
  const fullscreenLyrics = useAppSettingsStore((s) => s.fullscreenLyrics);
  const syncedLyrics = useAppSettingsStore((s) => s.syncedLyrics);
  const fullscreenArtistPortrait = useAppSettingsStore((s) => s.fullscreenArtistPortrait);
  const portraitDimming = useAppSettingsStore((s) => s.portraitDimming);
  const lyricsProvider = useAppSettingsStore((s) => s.lyricsProvider);

  const lyricLines = useMemo(() => {
    if (lyrics.synced.length) return lyrics.synced;
    return parseLrc(lyrics.plain);
  }, [lyrics]);

  const activeLyricIndex = useMemo(() => {
    if (!lyricLines.length) return -1;
    let active = 0;
    for (let index = 0; index < lyricLines.length; index += 1) {
      if (lyricLines[index].time <= currentTime) active = index;
      else break;
    }
    return active;
  }, [currentTime, lyricLines]);

  useEffect(() => {
    if (!track?.id || !isFullscreen) return;

    let cancelled = false;
    setLyricsLoading(true);
    getLyrics({ id: track.id, artist: track.artist, title: track.title, provider: lyricsProvider })
      .then((data) => {
        if (!cancelled) setLyrics(data);
      })
      .catch(() => {
        if (!cancelled) setLyrics({ plain: "", synced: [] });
      })
      .finally(() => {
        if (!cancelled) setLyricsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [track?.id, track?.artist, track?.title, isFullscreen, lyricsProvider]);

  useEffect(() => {
    if (tab !== "lyrics") return;
    if (activeLyricIndex === lastScrolledLyricIndex.current) return;
    lastScrolledLyricIndex.current = activeLyricIndex;
    activeLyricRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [activeLyricIndex, tab]);

  if (!track || !isFullscreen) return null;

  function changeVolume(value: number) {
    const nextVolume = value / 100;
    if (audioRef.current) audioRef.current.volume = nextVolume;
    setVolume(nextVolume);
  }

  const remaining = duration ? Math.max(0, duration - currentTime) : 0;
  const currentIndex = queue.findIndex((item) => item.id === track.id);
  const nextTracks = currentIndex >= 0 ? queue.slice(currentIndex + 1) : queue;
  const cover = track.coverArt || "/placeholder-album.png";
  const plainLines = lyrics.plain
    .split(/\r?\n/)
    .map((line) => line.replace(/\[[^\]]+\]/g, "").trim())
    .filter(Boolean);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-[var(--app-bg)] text-[var(--foreground)]">
      {fullscreenArtistPortrait && (
        <img
          src={cover}
          alt=""
          className="absolute inset-0 h-full w-full scale-110 object-cover blur-3xl"
          style={{ opacity: Math.max(0, Math.min(0.8, (80 - portraitDimming) / 260)) }}
        />
      )}
      <div
        className="absolute inset-0 bg-gradient-to-br from-black/55 via-[var(--app-bg)]/90 to-black/70"
        style={{ opacity: Math.max(0.45, Math.min(0.95, 0.55 + portraitDimming / 200)) }}
      />

      <button
        onClick={closeFullscreen}
        className="absolute left-5 top-5 z-20 rounded-lg bg-black/20 p-2 text-white/80 backdrop-blur hover:bg-black/35 hover:text-white"
        aria-label="Close fullscreen player"
      >
        <ChevronDown size={24} />
      </button>

      <div className="relative z-10 grid h-full grid-cols-[minmax(380px,0.9fr)_minmax(340px,0.8fr)] gap-6 px-8 py-8">
        <section className="flex min-h-0 flex-col justify-center">
          <div className="mx-auto w-full max-w-[560px]">
            <img
              src={cover}
              alt={cleanText(track.title)}
              className="aspect-square w-full max-w-[460px] rounded-xl object-cover shadow-2xl shadow-black/35"
              onError={(event) => {
                event.currentTarget.src = "/placeholder-album.png";
              }}
            />

            <div className="mt-6 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h1 className="truncate text-3xl font-bold tracking-tight">
                  {cleanText(track.title)}
                </h1>
                <p className="mt-2 truncate text-lg font-semibold text-[var(--app-muted)]">
                  {track.artistId ? (
                    <Link
                      href={`/artists/${track.artistId}`}
                      className="hover:text-[var(--app-accent)] hover:underline"
                    >
                      {cleanText(track.artist) || "Unknown Artist"}
                    </Link>
                  ) : (
                    cleanText(track.artist) || "Unknown Artist"
                  )}
                </p>
                <p className="mt-1 truncate text-sm font-medium text-[var(--app-muted)]">
                  {track.albumId ? (
                    <Link
                      href={`/albums/${track.albumId}`}
                      className="hover:text-[var(--app-accent)] hover:underline"
                    >
                      {cleanText(track.album) || "Unknown Album"}
                    </Link>
                  ) : (
                    cleanText(track.album) || "Unknown Album"
                  )}
                </p>
              </div>

              <button
                onClick={() => toggleFavorite(track.id)}
                className={[
                  "rounded-lg p-2.5 transition hover:bg-white/10",
                  favorites[track.id] ? "text-red-400" : "text-[var(--app-muted)]",
                ].join(" ")}
                aria-label="Favorite"
              >
                <Heart size={22} fill={favorites[track.id] ? "currentColor" : "none"} />
              </button>
            </div>

            <div className="mt-6">
              <input
                type="range"
                min="0"
                max={duration || 0}
                value={Math.min(currentTime, duration || 0)}
                onChange={(event) => seekTo(Number(event.target.value))}
                className="themed-range w-full"
              />
              <div className="mt-2 flex justify-between text-xs font-semibold text-[var(--app-muted)]">
                <span>{formatTime(currentTime)}</span>
                <span>-{formatTime(remaining)}</span>
              </div>
            </div>

            <div className="mt-7 flex items-center justify-center gap-7">
              <button className="text-[var(--app-muted)] hover:text-[var(--foreground)]" aria-label="Shuffle">
                <Shuffle size={21} />
              </button>
              <button onClick={previous} className="text-[var(--app-muted)] hover:text-[var(--foreground)]" aria-label="Previous">
                <SkipBack size={28} />
              </button>
              <button
                onClick={togglePlay}
                className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--app-accent)] text-black shadow-xl shadow-black/25 transition hover:scale-105"
                aria-label={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? <Pause size={30} fill="currentColor" /> : <Play size={32} fill="currentColor" className="ml-1" />}
              </button>
              <button onClick={next} className="text-[var(--app-muted)] hover:text-[var(--foreground)]" aria-label="Next">
                <SkipForward size={28} />
              </button>
              <button className="text-[var(--app-muted)] hover:text-[var(--foreground)]" aria-label="Repeat">
                <Repeat2 size={21} />
              </button>
            </div>

            <div className="mx-auto mt-6 flex max-w-sm items-center gap-3">
              <Volume2 size={19} className="text-[var(--app-muted)]" />
              <input
                type="range"
                min="0"
                max="100"
                value={Math.round(volume * 100)}
                onChange={(event) => changeVolume(Number(event.target.value))}
                className="themed-range w-full"
              />
            </div>
          </div>
        </section>

        <section className="min-h-0 rounded-xl border border-[var(--app-border)] bg-[var(--app-shell)]/88 shadow-2xl shadow-black/20 backdrop-blur">
          <div className="grid grid-cols-3 border-b border-[var(--app-border)]">
            <PanelTab active={tab === "lyrics"} onClick={() => setTab("lyrics")}>
              <Mic2 size={18} />
              Lyrics
            </PanelTab>
            <PanelTab active={tab === "queue"} onClick={() => setTab("queue")}>
              <ListMusic size={18} />
              Queue
            </PanelTab>
            <PanelTab active={tab === "info"} onClick={() => setTab("info")}>
              <Info size={18} />
              Info
            </PanelTab>
          </div>

          <div className="h-[calc(100%-49px)] overflow-y-auto p-5">
            {tab === "lyrics" && (
              <div>
                {lyricsLoading ? (
                  <div className="text-[var(--app-muted)]">Loading lyrics...</div>
                ) : syncedLyrics && lyricLines.length > 0 ? (
                  <div className="space-y-2">
                    {lyricLines.map((line, index) => (
                      <button
                        key={`${line.time}-${index}`}
                        ref={index === activeLyricIndex ? activeLyricRef : undefined}
                        onClick={() => seekTo(line.time)}
                        className={[
                          [
                            "block w-full rounded-lg px-3 py-2 text-left font-semibold leading-snug transition hover:bg-white/5",
                            fullscreenLyrics ? "text-xl" : "text-base",
                          ].join(" "),
                          index < activeLyricIndex ? "opacity-45" : "",
                          index === activeLyricIndex
                            ? "text-[var(--app-accent)]"
                            : "text-[var(--app-muted)]",
                        ].join(" ")}
                      >
                        {cleanText(line.text) || "♪"}
                      </button>
                    ))}
                  </div>
                ) : plainLines.length > 0 ? (
                  <div className="space-y-3 text-lg font-semibold leading-relaxed text-[var(--app-muted)]">
                    {plainLines.map((line, index) => (
                      <p key={`${line}-${index}`}>{cleanText(line)}</p>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-lg bg-[var(--app-panel)] p-4 text-sm text-[var(--app-muted)]">
                    No lyrics found for this track.
                  </div>
                )}
              </div>
            )}

            {tab === "queue" && (
              <div className="space-y-2">
                <h2 className="app-label mb-4">
                  Next Tracks
                </h2>
                {nextTracks.length === 0 ? (
                  <div className="rounded-lg bg-[var(--app-panel)] p-4 text-sm text-[var(--app-muted)]">
                    No upcoming tracks.
                  </div>
                ) : (
                  nextTracks.map((item, index) => (
                    <button
                      key={`${item.id}-${index}`}
                      onClick={() => setTrack(item, queue)}
                      className="grid w-full grid-cols-[1fr_54px] items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-[var(--app-panel)]"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold">
                          {cleanText(item.title)}
                        </div>
                        <div className="mt-1 truncate text-xs font-medium text-[var(--app-muted)]">
                          {cleanText(item.artist) || "Unknown Artist"}
                        </div>
                      </div>
                      <div className="text-right text-xs font-semibold text-[var(--app-muted)]">
                        {item.duration ? formatTime(item.duration) : ""}
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}

            {tab === "info" && (
              <div className="space-y-4 rounded-lg bg-[var(--app-panel)] p-4">
                <InfoRow label="Title" value={cleanText(track.title)} />
                <InfoRow label="Artist" value={cleanText(track.artist)} />
                <InfoRow label="Album" value={cleanText(track.album)} />
                <InfoRow label="Track ID" value={track.id} />
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function PanelTab({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={[
        "flex items-center justify-center gap-2 py-3 text-sm font-semibold transition",
        active ? "text-[var(--app-accent)]" : "text-[var(--app-muted)] hover:text-[var(--foreground)]",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function InfoRow({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <div className="app-label">
        {label}
      </div>
      <div className="mt-1 break-words text-sm font-medium">{value || "Unknown"}</div>
    </div>
  );
}
