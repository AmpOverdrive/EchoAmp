"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  ListPlus,
  Loader2,
  Play,
  RefreshCw,
  Search,
  Sparkles,
} from "lucide-react";
import { getRandomSongs } from "@/lib/navidrome";
import { usePlayerStore } from "@/lib/player-store";
import { normalizeTrack, trackForPlayer } from "@/lib/normalizers";
import {
  EmptyState,
  ErrorState,
  IconButton,
  MediaCard,
  PageHeader,
  PageShell,
  ShelfSkeleton,
  TableSkeleton,
  TextInput,
  ToolbarButton,
} from "@/components/ui/AppPrimitives";
import { VirtualList } from "@/components/ui/VirtualList";

function formatDuration(seconds: any) {
  if (!seconds) return "";
  const total = Number(seconds);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

export default function TrackCollectionPage() {
  const batchSize = 100;
  const randomRef = useRef<HTMLDivElement | null>(null);
  const [songs, setSongs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const setTrack = usePlayerStore((s) => s.setTrack);
  const addToQueue = usePlayerStore((s) => s.addToQueue);

  const loadTracks = useCallback(async (append = false) => {
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
      setError("");
    }

    try {
      const data = await getRandomSongs(batchSize);
      const nextSongs = data.filter(Boolean);

      setSongs((current) => {
        if (!append) return nextSongs;

        const seen = new Set(current.map((song) => song.id));
        const additions = nextSongs.filter((song) => !seen.has(song.id));
        return [...current, ...additions];
      });
    } catch (error) {
      console.error("Failed to load tracks:", error);
      if (!append) {
        setError("Unable to load tracks.");
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    loadTracks(false);
  }, [loadTracks]);

  const queue = useMemo(() => songs.map(trackForPlayer), [songs]);

  const trackOfMoment = songs[0];
  const randomPicks = songs.slice(1, 14);

  const filteredSongs = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return songs;

    return songs.filter((song) => {
      return [song.title, song.artist, song.album]
        .filter(Boolean)
        .some((value) => String(value || "").toLowerCase().includes(needle));
    });
  }, [query, songs]);

  function playSong(song: any) {
    setTrack(trackForPlayer(song), queue);
  }

  function scrollRandom(direction: "left" | "right") {
    randomRef.current?.scrollBy({
      left: direction === "right" ? 900 : -900,
      behavior: "smooth",
    });
  }

  const loadMoreTracks = useCallback(() => {
    if (loading || loadingMore || query.trim()) return;
    loadTracks(true);
  }, [loadTracks, loading, loadingMore, query]);

  return (
    <PageShell className="p-5">
      <div className="mb-6">
        <PageHeader
          title="Tracks"
          description="Browse. Search. Discover."
          actions={
            <ToolbarButton onClick={() => loadTracks(false)}>
              <RefreshCw size={17} />
              Refresh
            </ToolbarButton>
          }
        />
      </div>

      {loading ? (
        <div className="space-y-9">
          <div className="h-[160px] animate-pulse rounded-2xl bg-white/[0.06] ring-1 ring-white/[0.04]" />
          <ShelfSkeleton />
          <TableSkeleton rows={7} columns={6} />
        </div>
      ) : error ? (
        <div>
          <ErrorState
            title={error}
            description="Check your Navidrome connection and try again."
            onRetry={() => loadTracks(false)}
          />
        </div>
      ) : (
        <>
          {trackOfMoment && (
            <section className="mb-8 rounded-xl bg-[var(--app-panel)] p-4">
              <div className="flex items-center gap-4">
                <img
                  src={normalizeTrack(trackOfMoment).coverArt}
                  alt={normalizeTrack(trackOfMoment).album || normalizeTrack(trackOfMoment).title}
                  className="h-32 w-32 shrink-0 rounded-lg object-cover"
                />

                <div className="min-w-0">
                  <div className="app-label mb-3 flex items-center gap-2 text-[var(--app-accent)]">
                    <Sparkles size={14} />
                    Track of the Moment
                  </div>

                  <h2 className="app-section-title truncate">
                    {normalizeTrack(trackOfMoment).title}
                  </h2>

                  <div className="app-muted mt-3">
                    {normalizeTrack(trackOfMoment).artistId ? (
                      <Link
                        href={`/artists/${normalizeTrack(trackOfMoment).artistId}`}
                        className="hover:text-[var(--app-accent)] hover:underline"
                      >
                        {normalizeTrack(trackOfMoment).artist}
                      </Link>
                    ) : (
                      normalizeTrack(trackOfMoment).artist
                    )}
                    <span className="mx-2 opacity-50">·</span>
                    {normalizeTrack(trackOfMoment).albumId ? (
                      <Link
                        href={`/albums/${normalizeTrack(trackOfMoment).albumId}`}
                        className="hover:text-[var(--app-accent)] hover:underline"
                      >
                        {normalizeTrack(trackOfMoment).album}
                      </Link>
                    ) : (
                      normalizeTrack(trackOfMoment).album
                    )}
                  </div>

                  <div className="mt-4 flex items-center gap-2.5">
                    <ToolbarButton
                      tone="primary"
                      onClick={() => playSong(trackOfMoment)}
                    >
                      <Play size={19} fill="currentColor" />
                      Play
                    </ToolbarButton>

                    <ToolbarButton
                      tone="subtle"
                      onClick={() => addToQueue(trackForPlayer(trackOfMoment))}
                    >
                      <ListPlus size={18} />
                      Add to queue
                    </ToolbarButton>

                    <IconButton
                      tone="subtle"
                      onClick={() => loadTracks(false)}
                      aria-label="Refresh track picks"
                    >
                      <RefreshCw size={18} />
                    </IconButton>
                  </div>
                </div>
              </div>
            </section>
          )}

          <section className="mb-9">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="app-section-title">Random Pick</h2>

              <div className="flex items-center gap-3">
                <IconButton
                  onClick={() => loadTracks(false)}
                  aria-label="Refresh random picks"
                >
                  <RefreshCw size={17} />
                </IconButton>
                <IconButton
                  onClick={() => scrollRandom("left")}
                  aria-label="Scroll left"
                >
                  <ChevronLeft size={19} />
                </IconButton>
                <IconButton
                  onClick={() => scrollRandom("right")}
                  aria-label="Scroll right"
                >
                  <ChevronRight size={19} />
                </IconButton>
              </div>
            </div>

            <div ref={randomRef} className="flex gap-4 overflow-x-auto scroll-smooth pb-2">
              {randomPicks.map((song) => {
                const normalized = normalizeTrack(song);

                return (
                  <div key={normalized.id} className="w-[220px] shrink-0">
                    <MediaCard
                      image={normalized.coverArt}
                      title={normalized.title}
                      subtitle={normalized.artist}
                      meta={normalized.album}
                      subtitleHref={normalized.artistId ? `/artists/${normalized.artistId}` : undefined}
                      metaHref={normalized.albumId ? `/albums/${normalized.albumId}` : undefined}
                      itemId={normalized.id}
                      itemType="track"
                      initialRating={Number(normalized.raw?.userRating || normalized.raw?.rating || 0)}
                      onClick={() => playSong(song)}
                    />
                  </div>
                );
              })}
            </div>
          </section>

          <section>
            <div className="mb-5 flex flex-wrap items-end justify-between gap-5">
              <div>
                <h2 className="app-section-title">Browse all tracks</h2>
                <TextInput
                  icon={Search}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Find a track by title, artist or album..."
                  className="mt-5 w-[min(560px,calc(100vw-3rem))]"
                />
              </div>

              <div className="app-muted">
                {filteredSongs.length} tracks+
              </div>
            </div>

            <div className="app-table-shell overflow-hidden rounded-2xl">
              <div className="app-label app-table-head grid grid-cols-[62px_2fr_1.2fr_1.2fr_1fr_78px] px-5 py-3">
                <div />
                <div>Title</div>
                <div>Artist</div>
                <div>Album</div>
                <div>Genre</div>
                <div className="text-right">Duration</div>
              </div>

              {filteredSongs.length === 0 ? (
                <div className="p-5">
                  <EmptyState title="No tracks found" description="Try a different search." />
                </div>
              ) : (
                <VirtualList
                  items={filteredSongs}
                  rowHeight={58}
                  maxHeight={720}
                  overscan={10}
                  onEndReached={loadMoreTracks}
                  renderItem={(song, index) => {
                    const normalized = normalizeTrack(song);
                    const track = trackForPlayer(song);

                    return (
                      <div
                        className="app-table-row grid h-[58px] grid-cols-[62px_2fr_1.2fr_1.2fr_1fr_78px] items-center px-5 py-2 text-sm font-medium"
                      >
                        <div className="flex items-center gap-4 text-[var(--app-accent)]">
                          <button
                            type="button"
                            onClick={() => setTrack(track, queue)}
                            aria-label={`Play ${normalized.title}`}
                          >
                            <Play size={15} fill="currentColor" />
                          </button>
                          <button
                            type="button"
                            onClick={() => addToQueue(track)}
                            className="text-[var(--app-muted)] hover:text-[var(--app-accent)]"
                            aria-label={`Add ${normalized.title} to queue`}
                          >
                            <ListPlus size={15} />
                          </button>
                        </div>

                        <div className="truncate pr-5 font-semibold text-[var(--foreground)]">
                          {normalized.title}
                        </div>
                        <div className="truncate pr-5">
                          {normalized.artistId ? (
                            <Link
                              href={`/artists/${normalized.artistId}`}
                              className="hover:text-[var(--app-accent)] hover:underline"
                            >
                              {normalized.artist}
                            </Link>
                          ) : (
                            normalized.artist
                          )}
                        </div>
                        <div className="truncate pr-5">
                          {normalized.albumId ? (
                            <Link
                              href={`/albums/${normalized.albumId}`}
                              className="hover:text-[var(--app-accent)] hover:underline"
                            >
                              {normalized.album}
                            </Link>
                          ) : (
                            normalized.album
                          )}
                        </div>
                        <div className="truncate pr-5 text-[var(--app-muted)]">
                          {normalized.genre}
                        </div>
                        <div className="text-right text-[var(--app-muted)]">
                          {formatDuration(normalized.duration)}
                        </div>
                      </div>
                    );
                  }}
                />
              )}
            </div>

            <div className="flex min-h-16 items-center justify-center gap-3 text-sm font-semibold text-[var(--app-muted)]">
              {loadingMore ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Loading more tracks...
                </>
              ) : query.trim() ? (
                "Clear search to continue infinite loading"
              ) : (
                "Scroll the table for more"
              )}
            </div>
          </section>
        </>
      )}
    </PageShell>
  );
}
