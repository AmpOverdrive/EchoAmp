"use client";

import { Search, X, Disc3, UserRound, Music2, Play, ListPlus, Heart, Clock3 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { usePlayerStore } from "@/lib/player-store";
import { normalizeAlbum, normalizeArtist, normalizeTrack, trackForPlayer } from "@/lib/normalizers";
import { useFavoritesStore } from "@/lib/favorites-store";

const RECENT_SEARCHES_KEY = "navidrome_recent_searches";

function loadRecentSearches() {
  if (typeof window === "undefined") return [];
  try {
    const value = JSON.parse(localStorage.getItem(RECENT_SEARCHES_KEY) || "[]");
    return Array.isArray(value) ? value.slice(0, 6) : [];
  } catch {
    return [];
  }
}

function saveRecentSearch(term: string) {
  const clean = term.trim();
  if (!clean || typeof window === "undefined") return;
  const next = [clean, ...loadRecentSearches().filter((item) => item !== clean)].slice(0, 6);
  localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
}

export default function GlobalSearchBar() {
  const router = useRouter();
  const setTrack = usePlayerStore((s) => s.setTrack);
  const addToQueue = usePlayerStore((s) => s.addToQueue);
  const favorites = useFavoritesStore((s) => s.favorites);
  const toggleFavorite = useFavoritesStore((s) => s.toggleFavorite);

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState({ artists: [], albums: [], songs: [] });
  const [activeIndex, setActiveIndex] = useState(0);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = query.trim();

    if (q.length < 2) {
      setResults({ artists: [], albums: [], songs: [] });
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
        const data = await res.json();

        setResults({
          artists: data.artists || [],
          albums: data.albums || [],
          songs: data.songs || [],
        });

        setActiveIndex(0);
        setOpen(true);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    setRecentSearches(loadRecentSearches());
  }, []);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    }

    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function rememberSearch() {
    const term = query.trim();
    if (!term) return;
    saveRecentSearch(term);
    setRecentSearches(loadRecentSearches());
  }

  function go(path: string) {
    rememberSearch();
    setOpen(false);
    setQuery("");
    router.push(path);
  }

  const hasResults =
    results.artists.length || results.albums.length || results.songs.length;
  const normalizedArtists = useMemo(
    () => results.artists.slice(0, 6).map((artist: any) => normalizeArtist(artist)),
    [results.artists]
  );
  const normalizedAlbums = useMemo(
    () => results.albums.slice(0, 6).map((album: any) => normalizeAlbum(album)),
    [results.albums]
  );
  const normalizedSongs = useMemo(
    () => results.songs.slice(0, 8).map((song: any) => normalizeTrack(song)),
    [results.songs]
  );
  const songQueue = useMemo(() => results.songs.map(trackForPlayer), [results.songs]);
  const flatResults = useMemo(
    () => [
      ...normalizedArtists.map((item) => ({ type: "artist", id: item.id })),
      ...normalizedAlbums.map((item) => ({ type: "album", id: item.id })),
      ...normalizedSongs.map((item) => ({ type: "song", id: item.id })),
    ],
    [normalizedAlbums, normalizedArtists, normalizedSongs]
  );

  function activateResult(index = activeIndex) {
    const result = flatResults[index];
    if (!result) return;

    if (result.type === "artist") go(`/artists/${result.id}`);
    if (result.type === "album") go(`/albums/${result.id}`);
    if (result.type === "song") {
      const rawSong = results.songs.find((song: any) => song.id === result.id);
      if (!rawSong) return;
      rememberSearch();
      setTrack(trackForPlayer(rawSong), songQueue);
      setOpen(false);
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!open && ["ArrowDown", "ArrowUp", "Enter"].includes(event.key)) {
      setOpen(true);
    }

    if (event.key === "Escape") {
      setOpen(false);
      return;
    }

    if (!flatResults.length) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => Math.min(flatResults.length - 1, index + 1));
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(0, index - 1));
    }

    if (event.key === "Enter") {
      event.preventDefault();
      activateResult();
    }
  }

  return (
    <div className="app-top-search-shell sticky top-0 z-50 border-b px-4 py-3 shadow-[0_10px_34px_rgba(0,0,0,0.16)] backdrop-blur-2xl transition-colors">
      <div ref={boxRef} className="relative mx-auto max-w-4xl">
        <div className="app-top-search-input flex h-12 items-center gap-3 rounded-2xl border border-white/10 px-4 ring-1 ring-white/[0.03] transition focus-within:border-[var(--app-accent)]/55 focus-within:shadow-[0_16px_46px_rgba(0,0,0,0.28)]">
          <Search className="h-4 w-4 text-[var(--app-accent)]" />

          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder="Search artists, albums, songs..."
            className="w-full bg-transparent text-[0.95rem] font-semibold text-[var(--foreground)] placeholder:text-[var(--app-muted)] outline-none"
          />

          <div className="hidden rounded-md border border-white/10 bg-black/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--app-muted)] sm:block">
            Enter
          </div>

          {query && (
            <button
              onClick={() => {
                setQuery("");
                setOpen(false);
              }}
              className="rounded-full p-1 text-[var(--app-muted)] transition hover:bg-[var(--app-panel-strong)] hover:text-[var(--foreground)]"
              type="button"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {open && query.trim().length < 2 && recentSearches.length > 0 && (
          <div className="absolute left-0 right-0 top-16 overflow-hidden rounded-3xl border border-white/10 bg-[color-mix(in_srgb,var(--app-shell)_92%,black)] p-3 shadow-2xl shadow-black/50 backdrop-blur-2xl ring-1 ring-white/[0.03]">
            <Section title="Recent Searches">
              {recentSearches.map((term) => (
                <button
                  key={term}
                  type="button"
                  onClick={() => {
                    setQuery(term);
                    setOpen(true);
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-[var(--foreground)] transition hover:bg-white/[0.07]"
                >
                  <Clock3 size={16} className="text-[var(--app-muted)]" />
                  {term}
                </button>
              ))}
            </Section>
          </div>
        )}

        {open && query.trim().length >= 2 && (
          <div className="absolute left-0 right-0 top-16 max-h-[72vh] overflow-y-auto rounded-3xl border border-white/10 bg-[color-mix(in_srgb,var(--app-shell)_92%,black)] p-3 shadow-2xl shadow-black/50 backdrop-blur-2xl ring-1 ring-white/[0.03]">
            {loading && (
              <SearchSkeleton />
            )}

            {!loading && !hasResults && (
              <div className="px-3 py-6 text-center text-sm text-[var(--app-muted)]">
                No results found
              </div>
            )}

            {!!results.artists.length && (
              <Section title="Artists">
                {normalizedArtists.map((artist, index) => (
                  <SearchResultRow
                    key={artist.id}
                    active={activeIndex === index}
                    onHover={() => setActiveIndex(index)}
                    onOpen={() => go(`/artists/${artist.id}`)}
                  >
                    {artist.imageUrl ? (
                      <img
                        src={artist.imageUrl}
                        alt=""
                        className="h-11 w-11 rounded-full object-cover shadow-md shadow-black/25 ring-1 ring-white/10"
                      />
                    ) : (
                      <div className="grid h-11 w-11 place-items-center rounded-full bg-[var(--app-panel-strong)]">
                        <UserRound className="h-4 w-4 text-[var(--app-muted)]" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="truncate text-sm font-bold text-[var(--foreground)]">
                        {artist.name}
                      </div>
                      <div className="text-xs text-[var(--app-muted)]">Artist</div>
                    </div>
                  </SearchResultRow>
                ))}
              </Section>
            )}

            {!!results.albums.length && (
              <Section title="Albums">
                {normalizedAlbums.map((album, index) => (
                  <SearchResultRow
                    key={album.id}
                    active={activeIndex === normalizedArtists.length + index}
                    onHover={() => setActiveIndex(normalizedArtists.length + index)}
                    onOpen={() => go(`/albums/${album.id}`)}
                  >
                    {album.coverArt ? (
                      <img
                        src={album.coverArt}
                        className="h-11 w-11 rounded-xl object-cover shadow-md shadow-black/25 ring-1 ring-white/10"
                        alt=""
                        onError={(event) => {
                          event.currentTarget.style.display = "none";
                        }}
                      />
                    ) : (
                      <div className="grid h-11 w-11 place-items-center rounded-xl bg-[var(--app-panel-strong)]">
                        <Disc3 className="h-4 w-4 text-[var(--app-muted)]" />
                      </div>
                    )}

                    <div className="min-w-0">
                      <div className="truncate text-sm font-bold text-[var(--foreground)]">
                        {album.name}
                      </div>
                      <div className="truncate text-xs text-[var(--app-muted)]">
                        {album.artist}
                      </div>
                    </div>
                  </SearchResultRow>
                ))}
              </Section>
            )}

            {!!results.songs.length && (
              <Section title="Songs">
                {normalizedSongs.map((song, index) => {
                  const rawSong = results.songs.find((item: any) => item.id === song.id);
                  const track = rawSong ? trackForPlayer(rawSong) : trackForPlayer(song);
                  const resultIndex = normalizedArtists.length + normalizedAlbums.length + index;

                  return (
                  <SearchResultRow
                    key={song.id}
                    active={activeIndex === resultIndex}
                    onHover={() => setActiveIndex(resultIndex)}
                    onOpen={() => {
                      rememberSearch();
                      setTrack(track, songQueue);
                      setOpen(false);
                    }}
                    actions={
                      <>
                        <QuickButton label="Play" onClick={() => {
                          rememberSearch();
                          setTrack(track, songQueue);
                          setOpen(false);
                        }}>
                          <Play size={15} fill="currentColor" />
                        </QuickButton>
                        <QuickButton label="Add to queue" onClick={() => addToQueue(track)}>
                          <ListPlus size={15} />
                        </QuickButton>
                        <QuickButton label="Favorite" onClick={() => toggleFavorite(song.id)}>
                          <Heart
                            size={15}
                            fill={favorites[song.id] ? "currentColor" : "none"}
                            className={favorites[song.id] ? "text-red-500" : ""}
                          />
                        </QuickButton>
                      </>
                    }
                  >
                    {song.coverArt ? (
                      <img
                        src={song.coverArt}
                        className="h-11 w-11 rounded-xl object-cover shadow-md shadow-black/25 ring-1 ring-white/10"
                        alt=""
                      />
                    ) : (
                      <div className="grid h-11 w-11 place-items-center rounded-xl bg-[var(--app-panel-strong)]">
                        <Music2 className="h-4 w-4 text-[var(--app-muted)]" />
                      </div>
                    )}

                    <div className="min-w-0">
                      <div className="truncate text-sm font-bold text-[var(--foreground)]">
                        {song.title}
                      </div>
                      <div className="truncate text-xs text-[var(--app-muted)]">
                        {song.artist}
                      </div>
                    </div>
                  </SearchResultRow>
                )})}
              </Section>
            )}

            {hasResults ? (
              <button
                onClick={() => go(`/search?q=${encodeURIComponent(query.trim())}`)}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-white/[0.06] px-3 py-3 text-sm font-bold text-[var(--foreground)] transition hover:bg-white/[0.1]"
              >
                View full search results
              </button>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

function SearchResultRow({
  active,
  actions,
  children,
  onHover,
  onOpen,
}: {
  active?: boolean;
  actions?: React.ReactNode;
  children: React.ReactNode;
  onHover?: () => void;
  onOpen: () => void;
}) {
  return (
    <div
      onMouseEnter={onHover}
      className={[
        "group flex min-h-[60px] w-full items-center gap-2 rounded-2xl px-3 py-2 transition",
        active
          ? "bg-[var(--app-panel)] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.07),0_10px_24px_rgba(0,0,0,0.14)]"
          : "hover:bg-white/[0.055]",
      ].join(" ")}
    >
      <button
        type="button"
        onClick={onOpen}
        className="flex min-w-0 flex-1 items-center gap-3 text-left"
      >
        {children}
      </button>
      {actions && <div className="flex shrink-0 items-center gap-1 opacity-80 transition group-hover:opacity-100">{actions}</div>}
    </div>
  );
}

function QuickButton({
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
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onClick();
      }}
      className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--app-muted)] transition hover:bg-[var(--app-panel-strong)] hover:text-[var(--foreground)]"
      aria-label={label}
      title={label}
    >
      {children}
    </button>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <div className="px-3 pb-1 text-xs font-semibold uppercase tracking-wider text-[var(--app-muted)]">
        {title}
      </div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function SearchSkeleton() {
  return (
    <div className="space-y-2 px-1 py-1">
      {[0, 1, 2, 3, 4].map((item) => (
        <div
          key={item}
          className="flex min-h-[60px] animate-pulse items-center gap-3 rounded-2xl px-3 py-2"
        >
          <div className="h-11 w-11 rounded-xl bg-white/[0.08]" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-3 w-2/5 rounded bg-white/[0.1]" />
            <div className="h-2.5 w-1/4 rounded bg-white/[0.07]" />
          </div>
          <div className="hidden gap-1 sm:flex">
            <div className="h-8 w-8 rounded-lg bg-white/[0.06]" />
            <div className="h-8 w-8 rounded-lg bg-white/[0.06]" />
          </div>
        </div>
      ))}
    </div>
  );
}
