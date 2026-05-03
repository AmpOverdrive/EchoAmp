"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Disc3, ListPlus, Mic2, Music2, Play, Search, X } from "lucide-react";
import { usePlayerStore } from "@/lib/player-store";
import { searchMusic } from "@/lib/navidrome";
import { normalizeAlbum, normalizeArtist, normalizeTrack, trackForPlayer } from "@/lib/normalizers";
import { useFavoritesStore } from "@/lib/favorites-store";
import {
  EmptyState,
  ErrorState,
  FavoriteButton,
  MediaCard,
  PageHeader,
  PageShell,
  TableSkeleton,
  TextInput,
} from "@/components/ui/AppPrimitives";

type ResultFilter = "all" | "artists" | "albums" | "songs";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any>({
    albums: [],
    artists: [],
    songs: [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<ResultFilter>("all");
  const setTrack = usePlayerStore((s) => s.setTrack);
  const addToQueue = usePlayerStore((s) => s.addToQueue);
  const loadStarredFavorites = useFavoritesStore((s) => s.loadStarredFavorites);

  const trimmedQuery = query.trim();
  const hasResults =
    results.songs.length > 0 ||
    results.albums.length > 0 ||
    results.artists.length > 0;

  const songQueue = useMemo(
    () => results.songs.map(trackForPlayer),
    [results.songs]
  );
  const normalizedArtists = useMemo(
    () => results.artists.map((artist: any) => normalizeArtist(artist)),
    [results.artists]
  );
  const normalizedAlbums = useMemo(
    () => results.albums.map((album: any) => normalizeAlbum(album)),
    [results.albums]
  );
  const showArtists = filter === "all" || filter === "artists";
  const showAlbums = filter === "all" || filter === "albums";
  const showSongs = filter === "all" || filter === "songs";

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const initialQuery = params.get("q")?.trim();
    if (initialQuery) setQuery(initialQuery);
  }, []);

  useEffect(() => {
    loadStarredFavorites().catch(() => {});
  }, [loadStarredFavorites]);

  useEffect(() => {
    if (!trimmedQuery) {
      setResults({ albums: [], artists: [], songs: [] });
      setLoading(false);
      setError("");
      return;
    }

    let active = true;
    setLoading(true);
    setError("");

    const timer = window.setTimeout(async () => {
      try {
        const data = await searchMusic(trimmedQuery);

        if (active) {
          setResults(data);
          const params = new URLSearchParams(window.location.search);
          params.set("q", trimmedQuery);
          window.history.replaceState(null, "", `/search?${params.toString()}`);
        }
      } catch (error) {
        console.error("Search failed:", error);

        if (active) {
          setResults({ albums: [], artists: [], songs: [] });
          setError("Unable to search your library.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }, 250);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [trimmedQuery]);

  function retrySearch() {
    const current = query;
    setQuery("");
    window.setTimeout(() => setQuery(current), 0);
  }

  return (
    <PageShell className="px-5 py-6 md:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6">
          <PageHeader title="Search" description="Find artists, albums, and tracks in your Navidrome library." />
        </div>

        <div className="relative">
          <TextInput
            icon={Search}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            placeholder="Search artists, albums, songs..."
            className="h-11 rounded-xl bg-[var(--app-panel)] pr-20 text-base font-semibold"
          />

          <div className="absolute right-4 top-1/2 flex -translate-y-1/2 items-center gap-2">
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--app-muted)] transition hover:bg-[var(--app-panel-strong)] hover:text-[var(--foreground)]"
                aria-label="Clear search"
              >
                <X size={19} />
              </button>
            )}
          </div>
        </div>

        {trimmedQuery && (
          <>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {[
              ["all", `All (${results.artists.length + results.albums.length + results.songs.length})`],
              ["artists", `Artists (${results.artists.length})`],
              ["albums", `Albums (${results.albums.length})`],
              ["songs", `Songs (${results.songs.length})`],
            ].map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setFilter(id as ResultFilter)}
                className={[
                  "rounded-full border px-3 py-1.5 text-sm font-bold transition",
                  filter === id
                    ? "border-[var(--app-accent)] bg-[var(--app-accent-soft)] text-[var(--app-accent)]"
                    : "border-[var(--app-border)] bg-[var(--app-panel)] text-[var(--app-muted)] hover:text-[var(--foreground)]",
                ].join(" ")}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="mt-4 rounded-2xl border border-[var(--app-border)] bg-[color-mix(in_srgb,var(--app-panel)_88%,transparent)] p-4 shadow-2xl shadow-black/20">
            {loading && <SearchPageSkeleton />}

            {!loading && error && (
              <ErrorState
                title={error}
                description="Check your Navidrome connection and try again."
                onRetry={retrySearch}
              />
            )}

            {!loading && !error && !hasResults && (
              <EmptyState title={`No results for "${trimmedQuery}"`} />
            )}

            {!loading && !error && showArtists && results.artists.length > 0 && (
              <section>
                <div className="app-label mb-3 flex items-center gap-2">
                  <Mic2 size={17} />
                  Artists
                </div>

                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                  {normalizedArtists.slice(0, 8).map((artist: any) => (
                    <MediaCard
                      key={artist.id}
                      href={`/artists/${artist.id}`}
                      image={artist.imageUrl}
                      title={artist.name}
                      subtitle={`${artist.albumCount} Albums`}
                      initialRating={Number(artist.raw?.userRating || artist.raw?.rating || 0)}
                      fallback={<Mic2 size={34} />}
                    />
                  ))}
                </div>
              </section>
            )}

            {!loading && !error && showAlbums && results.albums.length > 0 && (
              <section className="mt-7">
                <div className="app-label mb-3 flex items-center gap-2">
                  <Disc3 size={17} />
                  Albums
                </div>

                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                  {normalizedAlbums.slice(0, 12).map((album: any) => (
                    <MediaCard
                      key={album.id}
                      href={`/albums/${album.id}`}
                      subtitleHref={album.artistId ? `/artists/${album.artistId}` : undefined}
                      image={album.coverArt}
                      title={album.name}
                      subtitle={album.artist}
                      meta={album.year}
                      initialRating={Number(album.raw?.userRating || album.raw?.rating || 0)}
                      fallback={<Disc3 size={34} />}
                    />
                  ))}
                </div>
              </section>
            )}

            {!loading && !error && showSongs && results.songs.length > 0 && (
              <section className="mt-7">
                <div className="app-label mb-3 flex items-center gap-2">
                  <Music2 size={17} />
                  Songs
                </div>

                <div className="app-table-shell overflow-hidden rounded-2xl">
                  {results.songs.slice(0, 25).map((song: any) => {
                    const normalized = normalizeTrack(song);
                    const track = trackForPlayer(song);

                    return (
                      <div
                        key={song.id}
                        className="app-table-row flex min-h-16 w-full items-center gap-3 px-4 py-2"
                      >
                        <div className="flex min-w-0 flex-1 items-center gap-4">
                          <button
                            type="button"
                            onClick={() => setTrack(track, songQueue)}
                            className="shrink-0"
                            aria-label={`Play ${normalized.title}`}
                          >
                            <img
                              src={normalized.coverArt}
                              alt={normalized.album || normalized.title}
                              className="h-11 w-11 rounded-lg object-cover"
                            />
                          </button>

                          <div className="min-w-0">
                            <button
                              type="button"
                              onClick={() => setTrack(track, songQueue)}
                              className="block max-w-full truncate text-left text-sm font-semibold text-[var(--foreground)] hover:text-[var(--app-accent)]"
                            >
                              {normalized.title}
                            </button>
                            <div className="app-muted truncate">
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
                              {normalized.album && (
                                <>
                                  <span className="mx-2 opacity-50">·</span>
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
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-1">
                          <QuickAction label="Play" onClick={() => setTrack(track, songQueue)}>
                            <Play size={16} fill="currentColor" />
                          </QuickAction>
                          <QuickAction label="Add to queue" onClick={() => addToQueue(track)}>
                            <ListPlus size={16} />
                          </QuickAction>
                          <FavoriteButton id={normalized.id} label={normalized.title} size="sm" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}
          </div>
          </>
        )}
      </div>
    </PageShell>
  );
}

function SearchPageSkeleton() {
  return (
    <div className="space-y-7">
      <div>
        <div className="mb-3 h-3 w-24 animate-pulse rounded bg-white/[0.08]" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="animate-pulse">
              <div className="aspect-square rounded-2xl bg-white/[0.07]" />
              <div className="mt-3 h-4 w-3/4 rounded bg-white/[0.09]" />
              <div className="mt-2 h-3 w-1/2 rounded bg-white/[0.06]" />
            </div>
          ))}
        </div>
      </div>
      <TableSkeleton rows={6} columns={4} />
    </div>
  );
}

function QuickAction({
  children,
  label,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-10 w-10 items-center justify-center rounded-xl text-[var(--app-muted)] hover:bg-[var(--app-panel)] hover:text-[var(--foreground)]"
      aria-label={label}
      title={label}
    >
      {children}
    </button>
  );
}
