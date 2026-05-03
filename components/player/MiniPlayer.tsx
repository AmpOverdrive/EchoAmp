"use client";

import { RefObject, useEffect, useState } from "react";
import Link from "next/link";
import {
  Heart,
  Shuffle,
  SkipBack,
  SkipForward,
  Play,
  Pause,
  Repeat2,
  PanelBottom,
  ListMusic,
  Volume2,
  Music2,
} from "lucide-react";
import { usePlayerStore } from "@/lib/player-store";
import { rateItem } from "@/lib/navidrome";
import { useFavoritesStore } from "@/lib/favorites-store";
import { useAppSettingsStore } from "@/lib/app-settings-store";
import { RatingControl } from "@/components/ui/AppPrimitives";
import { useBehaviorStore } from "@/lib/listening-behavior-store";
import TrackActionMenu from "@/components/player/TrackActionMenu";

function formatTime(seconds: number) {
  if (!seconds || Number.isNaN(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function decodeHtml(value: unknown): string {
  if (typeof value !== "string") return String(value ?? "");
  return value
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, code) => String.fromCharCode(parseInt(code, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

export default function MiniPlayer({
  audioRef,
}: {
  audioRef: RefObject<HTMLAudioElement | null>;
}) {
  const track = usePlayerStore((s) => s.currentTrack);
  const like = useBehaviorStore((s) => s.like);
  const skip = useBehaviorStore((s) => s.skip);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const duration = usePlayerStore((s) => s.duration);
  const currentTime = usePlayerStore((s) => s.currentTime);
  const volume = usePlayerStore((s) => s.volume);
  const setVolume = usePlayerStore((s) => s.setVolume);
  const setCurrentTime = usePlayerStore((s) => s.setCurrentTime);
  const togglePlay = usePlayerStore((s) => s.togglePlay);
  const next = usePlayerStore((s) => s.next);
  const previous = usePlayerStore((s) => s.previous);
  const shuffleEnabled = usePlayerStore((s) => s.shuffleEnabled);
  const repeatMode = usePlayerStore((s) => s.repeatMode);
  const toggleShuffle = usePlayerStore((s) => s.toggleShuffle);
  const toggleRepeatMode = usePlayerStore((s) => s.toggleRepeatMode);
  const openFullscreen = usePlayerStore((s) => s.openFullscreen);
  const toggleQueue = usePlayerStore((s) => s.toggleQueue);
  const updateTrackMetadata = usePlayerStore((s) => s.updateTrackMetadata);

  const favorites = useFavoritesStore((s) => s.favorites);
  const toggleFavorite = useFavoritesStore((s) => s.toggleFavorite);
  const loadStarredFavorites = useFavoritesStore((s) => s.loadStarredFavorites);

  const floatingPlayerBar = useAppSettingsStore((s) => s.floatingPlayerBar);
  const [coverFailed, setCoverFailed] = useState(false);


  useEffect(() => {
    loadStarredFavorites().catch(() => {});
  }, [loadStarredFavorites]);

  const displayTrack =
    track || {
      title: "Select a song",
      artist: "Nothing playing",
      coverArt: "",
    };

  const coverArt =
    typeof displayTrack.coverArt === "string" &&
    displayTrack.coverArt &&
    !displayTrack.coverArt.includes("placeholder-album.png")
      ? displayTrack.coverArt
      : "";
  const trackWithRating = track as ({ userRating?: unknown; rating?: unknown } & typeof track);
  const currentRating = track?.id
    ? Number(trackWithRating?.userRating || trackWithRating?.rating || 0)
    : 0;

  function seek(value: number) {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = value;
    setCurrentTime(value);
  }

  function changeVolume(value: number) {
    const audio = audioRef.current;
    const nextVolume = value / 100;
    if (audio) audio.volume = nextVolume;
    setVolume(nextVolume);
  }

  async function rateCurrentTrack(nextRating: number) {
    if (!track?.id) return;
    updateTrackMetadata(track.id, { userRating: nextRating, rating: nextRating });
    try {
      await rateItem(track.id, nextRating);
    } catch (error) {
      console.error("Rating sync failed:", error);
    }
  }


  // Track listening behavior for smart radio
  useEffect(() => {
    if (!track?.id) return;

    const startedAt = Date.now();

    return () => {
      const listenedMs = Date.now() - startedAt;

      if (listenedMs < 15000) {
        skip(track.id, track.artist);
      } else {
        like(track.id, track.artist);
      }
    };
  }, [track?.id, like, skip]);

  return (
    <div
      className={[
        "app-player-shell fixed z-40 h-20 border border-white/10 bg-black/90 text-[var(--foreground)] shadow-[0_-18px_60px_rgba(0,0,0,.45)] backdrop-blur-2xl max-md:bottom-[4.25rem] max-md:h-16",
        floatingPlayerBar
          ? "bottom-4 left-4 right-4 rounded-2xl"
          : "bottom-0 left-0 right-0",
      ].join(" ")}
    >
      <div className="grid h-full grid-cols-[420px_1fr_420px] items-center gap-6 px-4 max-lg:grid-cols-[minmax(220px,1fr)_auto] max-md:grid-cols-[1fr_auto] max-md:gap-3">

        {/* LEFT */}
        <div className="flex items-center gap-3">
          {coverArt && !coverFailed ? (
            <img
              src={coverArt}
              className="h-14 w-14 rounded-lg object-cover max-md:h-11 max-md:w-11"
              onError={() => setCoverFailed(true)}
              alt=""
            />
          ) : (
            <div className="grid h-14 w-14 place-items-center rounded-lg bg-[var(--app-panel)] max-md:h-11 max-md:w-11">
              <Music2 size={26} />
            </div>
          )}

          <div className="min-w-0 leading-tight">
            <div className="truncate text-sm font-semibold">
              {decodeHtml(displayTrack.title)}
            </div>
            <div className="truncate text-sm text-[var(--app-muted)]">
              {track?.artistId ? (
                <Link href={`/artists/${track.artistId}`}>
                  {decodeHtml(displayTrack.artist)}
                </Link>
              ) : (
                decodeHtml(displayTrack.artist)
              )}
            </div>
          </div>
        </div>

        {/* CENTER */}
        <div className="flex flex-col items-center gap-1 max-lg:hidden">
          <div className="flex items-center gap-5 text-white/75">
            <button
              className={["transition hover:text-white", shuffleEnabled ? "text-[var(--app-accent)]" : ""].join(" ")}
              onClick={toggleShuffle}
              aria-pressed={shuffleEnabled}
              aria-label="Toggle shuffle"
            >
              <Shuffle size={16} />
            </button>
            <button className="transition hover:text-white" onClick={previous}><SkipBack size={18} /></button>
            <button className="grid h-9 w-9 place-items-center rounded-full bg-white text-black transition hover:scale-105" onClick={togglePlay}>
              {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
            </button>
            <button className="transition hover:text-white" onClick={next}><SkipForward size={18} /></button>
            <button
              className={["relative transition hover:text-white", repeatMode !== "off" ? "text-[var(--app-accent)]" : ""].join(" ")}
              onClick={toggleRepeatMode}
              aria-pressed={repeatMode !== "off"}
              aria-label={`Repeat mode: ${repeatMode}`}
            >
              <Repeat2 size={16} />
              {repeatMode === "one" && <span className="absolute -right-1 -top-1 text-[9px] font-black">1</span>}
            </button>
          </div>

          <div className="flex w-full max-w-2xl items-center gap-3 text-xs text-white/55">
            <span className="w-9 text-right">{formatTime(currentTime)}</span>
            <input
              type="range"
              min="0"
              max={duration || 0}
              value={Math.min(currentTime, duration || 0)}
              onChange={(e) => seek(Number(e.target.value))}
              className="w-full"
            />
            <span className="w-9">{formatTime(duration)}</span>
          </div>
        </div>

        {/* RIGHT */}
        <div className="flex items-center justify-end gap-4 max-md:gap-2">

          <button className="max-md:hidden" onClick={() => track?.id && toggleFavorite(track.id)}>
            <Heart
              fill={track?.id && favorites[track.id] ? "red" : "none"}
            />
          </button>

          <RatingControl
            key={`${track?.id || "empty"}-${currentRating}`}
            value={currentRating}
            label={decodeHtml(displayTrack.title)}
            onRate={rateCurrentTrack}
            size={16}
            readOnly={!track?.id}
            className="hidden text-white/70 xl:flex"
          />

          <button onClick={toggleQueue} className="max-md:hidden"><ListMusic /></button>
          <button onClick={openFullscreen}><PanelBottom /></button>
          <button className="grid h-9 w-9 place-items-center rounded-full bg-white text-black transition hover:scale-105 md:hidden" onClick={togglePlay} aria-label={isPlaying ? "Pause" : "Play"}>
            {isPlaying ? <Pause size={17} fill="currentColor" /> : <Play size={17} fill="currentColor" />}
          </button>

          {/* VOLUME */}
          <div className="flex items-center gap-2 text-white/70 max-xl:hidden">
            <Volume2 size={17} />
            <input
              type="range"
              min="0"
              max="100"
              value={Math.round(volume * 100)}
              onChange={(e) => changeVolume(Number(e.target.value))}
            />
          </div>

          {track && (
            <TrackActionMenu
              track={track}
              coverArt={coverArt}
              coverFailed={coverFailed}
              isPlaying={isPlaying}
              isFavorite={Boolean(favorites[track.id])}
              rating={currentRating}
              onTogglePlay={togglePlay}
              onToggleFavorite={() => toggleFavorite(track.id)}
              onRate={rateCurrentTrack}
              onCoverError={() => setCoverFailed(true)}
              onCoverLoad={() => setCoverFailed(false)}
            />
          )}

        </div>
      </div>
    </div>
  );
}


