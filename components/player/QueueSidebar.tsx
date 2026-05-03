"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  AudioLines,
  FolderOpen,
  Infinity,
  Info,
  ListMusic,
  Mic2,
  Play,
  RefreshCw,
  Save,
  Share2,
  Shuffle,
  SkipForward,
  Trash2,
  X,
} from "lucide-react";
import { getLyrics } from "@/lib/navidrome";
import { usePlayerStore } from "@/lib/player-store";
import { useAppSettingsStore } from "@/lib/app-settings-store";

type QueueTab = "queue" | "lyrics" | "info";

function formatTime(seconds?: number) {
  if (!seconds || Number.isNaN(seconds)) return "";
  const total = Math.round(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatQueueDuration(queue: Array<{ duration?: number }>) {
  const total = queue.reduce((sum, track) => sum + Number(track.duration || 0), 0);
  return total ? formatTime(total) : "";
}

function parseLrc(plain: string) {
  const lines = plain.split(/\r?\n/);
  const parsed: Array<{ time: number; text: string }> = [];

  lines.forEach((line) => {
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

export default function QueueSidebar() {
  const [tab, setTab] = useState<QueueTab>("queue");
  const [lyrics, setLyrics] = useState<{ plain: string; synced: Array<{ time: number; text: string }> }>({
    plain: "",
    synced: [],
  });
  const [lyricsLoading, setLyricsLoading] = useState(false);
  const activeLyricRef = useRef<HTMLButtonElement | null>(null);
  const lastScrolledLyricIndex = useRef(-1);

  const isQueueOpen = usePlayerStore((s) => s.isQueueOpen);
  const closeQueue = usePlayerStore((s) => s.closeQueue);
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const currentTime = usePlayerStore((s) => s.currentTime);
  const queue = usePlayerStore((s) => s.queue);
  const setTrack = usePlayerStore((s) => s.setTrack);
  const clearQueue = usePlayerStore((s) => s.clearQueue);
  const removeFromQueue = usePlayerStore((s) => s.removeFromQueue);
  const moveQueueItem = usePlayerStore((s) => s.moveQueueItem);
  const shuffleQueue = usePlayerStore((s) => s.shuffleQueue);
  const seekTo = usePlayerStore((s) => s.seekTo);
  const next = usePlayerStore((s) => s.next);
  const syncedLyrics = useAppSettingsStore((s) => s.syncedLyrics);
  const lyricsProvider = useAppSettingsStore((s) => s.lyricsProvider);

  const currentIndex = currentTrack
    ? queue.findIndex((track) => track.id === currentTrack.id)
    : -1;
  const nextTracks =
    currentIndex >= 0
      ? queue.slice(currentIndex + 1).map((track, offset) => ({
          track,
          queueIndex: currentIndex + 1 + offset,
        }))
      : queue.filter(Boolean).map((track, queueIndex) => ({ track, queueIndex }));
  const totalDuration = formatQueueDuration(queue);

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
    if (!currentTrack?.id) {
      setLyrics({ plain: "", synced: [] });
      return;
    }

    let cancelled = false;
    setLyricsLoading(true);
    getLyrics({
      id: currentTrack.id,
      artist: currentTrack.artist,
      title: currentTrack.title,
      provider: lyricsProvider,
    })
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
  }, [currentTrack?.id, currentTrack?.artist, currentTrack?.title, lyricsProvider]);

  useEffect(() => {
    if (tab !== "lyrics") return;
    if (activeLyricIndex === lastScrolledLyricIndex.current) return;
    lastScrolledLyricIndex.current = activeLyricIndex;
    activeLyricRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [activeLyricIndex, tab]);

  if (!isQueueOpen) return null;

  const plainLines = lyrics.plain
    .split(/\r?\n/)
    .map((line) => line.replace(/\[[^\]]+\]/g, "").trim())
    .filter(Boolean);

  return (
    <aside className="fixed bottom-24 right-0 top-0 z-50 flex w-[360px] flex-col border-l border-[var(--app-border)] bg-[var(--app-shell)] text-[var(--foreground)] shadow-2xl transition-colors">
      <div className="flex items-center justify-between border-b border-[var(--app-border)] px-4 py-3">
        <h2 className="app-section-title">
          Queue{" "}
          <span className="text-sm font-semibold text-[var(--app-accent)]">
            {queue.length} tracks{totalDuration ? ` · ${totalDuration}` : ""}
          </span>
        </h2>

        <button
          onClick={closeQueue}
          className="rounded-full p-1.5 text-[var(--app-muted)] hover:bg-[var(--app-panel)] hover:text-[var(--foreground)]"
          aria-label="Close queue"
        >
        <X size={19} />
        </button>
      </div>

      <div className="app-label border-b border-[var(--app-border)] bg-[var(--app-panel-strong)] px-4 py-1.5 text-center text-[var(--app-accent)]">
        <AudioLines size={12} className="mr-2 inline" />
        Now Playing
      </div>

      {currentTrack ? (
        <div className="border-b border-[var(--app-border)] px-4 py-3">
          <div className="flex gap-3">
            <img
              src={currentTrack.coverArt || "/placeholder-album.png"}
              alt=""
              className="h-16 w-16 shrink-0 rounded-lg object-cover"
              onError={(event) => {
                event.currentTarget.src = "/placeholder-album.png";
              }}
            />

            <div className="min-w-0 pt-0.5">
              <div className="truncate text-sm font-semibold">
                {cleanText(currentTrack.title)}
              </div>
              <div className="mt-1 truncate text-xs font-medium text-[var(--app-muted)]">
                {currentTrack.artistId ? (
                  <Link
                    href={`/artists/${currentTrack.artistId}`}
                    className="hover:text-[var(--app-accent)] hover:underline"
                  >
                    {cleanText(currentTrack.artist) || "Unknown Artist"}
                  </Link>
                ) : (
                  cleanText(currentTrack.artist) || "Unknown Artist"
                )}
              </div>
              <div className="mt-1 truncate text-xs font-medium text-[var(--app-muted)]">
                {currentTrack.albumId ? (
                  <Link
                    href={`/albums/${currentTrack.albumId}`}
                    className="hover:text-[var(--app-accent)] hover:underline"
                  >
                    {cleanText(currentTrack.album) || "Unknown Album"}
                  </Link>
                ) : (
                  cleanText(currentTrack.album) || "Unknown Album"
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="border-b border-[var(--app-border)] px-6 py-8 text-[var(--app-muted)]">
          Nothing is playing.
        </div>
      )}

      <div className="grid grid-cols-7 gap-1.5 border-b border-[var(--app-border)] px-4 py-2.5">
        <IconButton label="Shuffle" onClick={shuffleQueue}>
          <Shuffle size={18} />
        </IconButton>
        <IconButton label="Save queue"><Save size={18} /></IconButton>
        <IconButton label="Open album"><FolderOpen size={18} /></IconButton>
        <IconButton label="Share"><Share2 size={18} /></IconButton>
        <IconButton label="Clear queue" onClick={clearQueue}><Trash2 size={18} /></IconButton>
        <IconButton label="Skip" onClick={next}><SkipForward size={18} /></IconButton>
        <IconButton label="Continuous play"><Infinity size={18} /></IconButton>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        {tab === "queue" && (
          <>
            <h3 className="app-label mb-3">
              Next Tracks
            </h3>

            <div className="space-y-1.5">
              {nextTracks.length === 0 && (
                <div className="rounded-lg bg-[var(--app-panel)] p-4 text-sm text-[var(--app-muted)]">
                  No upcoming tracks in the queue.
                </div>
              )}

              {nextTracks.map(({ track, queueIndex }) => (
                <div
                  key={`${track.id}-${queueIndex}`}
                  className="app-table-row grid w-full grid-cols-[1fr_76px] items-center gap-2 rounded-xl border-b-0 px-3 py-2.5"
                >
                  <button
                    onClick={() => setTrack(track, queue)}
                    className="min-w-0 text-left"
                  >
                    <div className="truncate text-[13px] font-semibold">
                      {cleanText(track.title)}
                    </div>
                    <div className="mt-0.5 truncate text-xs font-semibold text-[var(--app-muted)]">
                      {cleanText(track.artist) || "Unknown Artist"}
                    </div>
                  </button>

                  <div className="flex items-center justify-end gap-1 text-[var(--app-muted)]">
                    <span className="mr-1 text-xs font-medium">
                      {formatTime(track.duration)}
                    </span>
                    <button
                      type="button"
                      onClick={() => moveQueueItem(queueIndex, Math.max(0, queueIndex - 1))}
                      className="text-xs hover:text-[var(--foreground)]"
                      aria-label={`Move ${cleanText(track.title)} up`}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => removeFromQueue(track.id)}
                      className="hover:text-red-400"
                      aria-label={`Remove ${cleanText(track.title)} from queue`}
                    >
                      <X size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {tab === "lyrics" && (
          <div>
            <h3 className="app-label mb-3">
              Lyrics
            </h3>

            {lyricsLoading ? (
              <div className="flex items-center gap-3 rounded-lg bg-[var(--app-panel)] p-4 text-sm text-[var(--app-muted)]">
                <RefreshCw size={18} className="animate-spin" />
                Loading lyrics...
              </div>
            ) : syncedLyrics && lyricLines.length > 0 ? (
              <div className="space-y-1 rounded-lg bg-[var(--app-panel)] p-3">
                {lyricLines.map((line, index) => (
                  <button
                    key={`${line.time}-${index}`}
                    ref={index === activeLyricIndex ? activeLyricRef : undefined}
                    onClick={() => seekTo(line.time)}
                    className={[
                      "block w-full rounded-lg px-2 py-1.5 text-left text-sm font-semibold leading-relaxed transition hover:bg-white/5",
                      index < activeLyricIndex ? "opacity-55" : "",
                      index === activeLyricIndex
                        ? "text-[var(--app-accent)]"
                        : "text-[var(--app-muted)]",
                    ].join(" ")}
                  >
                    {cleanText(line.text) || "♪"}
                  </button>
                ))}
              </div>
            ) : plainLines.length > 0 || (!syncedLyrics && lyrics.plain) ? (
              <div className="space-y-2 rounded-lg bg-[var(--app-panel)] p-4 text-sm font-medium leading-relaxed text-[var(--app-muted)]">
                {(plainLines.length ? plainLines : lyrics.plain.split(/\r?\n/).filter(Boolean)).map((line, index) => (
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

        {tab === "info" && (
          <div className="space-y-4 rounded-lg bg-[var(--app-panel)] p-4">
            <InfoRow label="Title" value={cleanText(currentTrack?.title)} />
            <InfoRow label="Artist" value={cleanText(currentTrack?.artist)} />
            <InfoRow label="Album" value={cleanText(currentTrack?.album)} />
            <InfoRow label="Track ID" value={currentTrack?.id} />
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 border-t border-[var(--app-border)] bg-[var(--app-shell)]">
        <TabButton active={tab === "queue"} onClick={() => setTab("queue")}>
          <ListMusic size={20} />
          Queue
        </TabButton>
        <TabButton active={tab === "lyrics"} onClick={() => setTab("lyrics")}>
          <Mic2 size={20} />
          Lyrics
        </TabButton>
        <TabButton active={tab === "info"} onClick={() => setTab("info")}>
          <Info size={20} />
          Info
        </TabButton>
      </div>
    </aside>
  );
}

function IconButton({
  children,
  label,
  onClick,
}: {
  children: ReactNode;
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--app-panel-strong)] text-[var(--app-muted)] hover:text-[var(--foreground)]"
      title={label}
      aria-label={label}
    >
      {children}
    </button>
  );
}

function TabButton({
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
        "flex items-center justify-center gap-2 py-2.5 text-sm font-semibold transition",
        active
          ? "text-[var(--app-accent)]"
          : "text-[var(--app-muted)] hover:text-[var(--foreground)]",
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
      <div className="mt-1 break-words text-sm font-medium">
        {value || "Unknown"}
      </div>
    </div>
  );
}
