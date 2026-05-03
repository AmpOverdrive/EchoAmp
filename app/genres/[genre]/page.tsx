"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowDownUp,
  ArrowLeft,
  Disc3,
  Filter,
  Grid3X3,
  RefreshCw,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { getAlbumsByGenre } from "@/lib/navidrome";
import { useAppSettingsStore } from "@/lib/app-settings-store";
import { normalizeAlbum } from "@/lib/normalizers";
import {
  CardGridSkeleton,
  EmptyState,
  ErrorState,
  MediaCard,
  PageShell,
} from "@/components/ui/AppPrimitives";
import { formatDisplayValue } from "@/lib/text-utils";

const PAGE_SIZE = 100;

type SortMode = "name" | "artist" | "year-desc" | "year-asc";
type GridDensity = "large" | "normal" | "compact";

function yearNumber(value: any) {
  const display = formatDisplayValue(value);
  const year = Number(display);
  return Number.isFinite(year) ? year : 0;
}

function albumKey(album: any) {
  return album?.id || `${album?.name || album?.title}-${album?.artist}-${formatDisplayValue(album?.year)}`;
}

export default function GenreAlbumsPage() {
  const params = useParams();
  const genre = decodeURIComponent(String(params.genre || ""));
  const loaderRef = useRef<HTMLDivElement | null>(null);
  const [albums, setAlbums] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("name");
  const [reverseSort, setReverseSort] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [artistFilter, setArtistFilter] = useState("");
  const [yearFrom, setYearFrom] = useState("");
  const [yearTo, setYearTo] = useState("");
  const [gridDensity, setGridDensity] = useState<GridDensity>("normal");
  const [refreshKey, setRefreshKey] = useState(0);
  const gridDensityDefault = useAppSettingsStore((s) => s.gridDensityDefault);

  useEffect(() => {
    setGridDensity(gridDensityDefault);
  }, [genre, gridDensityDefault]);

  const loadPage = useCallback(
    async (offset: number) => {
      if (!genre) return;

      if (offset === 0) {
        setLoading(true);
        setError("");
      } else {
        setLoadingMore(true);
      }

      try {
        const data = await getAlbumsByGenre(genre, PAGE_SIZE, offset);
        const nextAlbums = data.filter(Boolean);

        setAlbums((current) => {
          if (offset === 0) return nextAlbums;

          const seen = new Set(current.map(albumKey));
          const additions = nextAlbums.filter((album) => !seen.has(albumKey(album)));
          return [...current, ...additions];
        });

        setHasMore(nextAlbums.length === PAGE_SIZE);
      } catch (error) {
        console.error(`Failed to load ${genre} albums:`, error);
        if (offset === 0) setAlbums([]);
        if (offset === 0) setError(`Unable to load ${genre} albums.`);
        setHasMore(false);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [genre]
  );

  useEffect(() => {
    setAlbums([]);
    setHasMore(true);
    loadPage(0);
  }, [loadPage, refreshKey]);

  useEffect(() => {
    const loader = loaderRef.current;
    if (!loader || loading || loadingMore || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadPage(albums.length);
      },
      { rootMargin: "700px 0px" }
    );

    observer.observe(loader);

    return () => observer.disconnect();
  }, [albums.length, hasMore, loadPage, loading, loadingMore]);

  const visibleAlbums = useMemo(() => {
    const filtered = albums.filter((album) => {
      const albumName = formatDisplayValue(album.name || album.title).toLowerCase();
      const artistName = formatDisplayValue(album.artist).toLowerCase();
      const needle = query.trim().toLowerCase();
      const artistNeedle = artistFilter.trim().toLowerCase();
      const albumYear = yearNumber(album.year);
      const from = Number(yearFrom);
      const to = Number(yearTo);

      if (needle && !albumName.includes(needle) && !artistName.includes(needle)) {
        return false;
      }

      if (artistNeedle && !artistName.includes(artistNeedle)) {
        return false;
      }

      if (Number.isFinite(from) && yearFrom.trim() && albumYear < from) {
        return false;
      }

      if (Number.isFinite(to) && yearTo.trim() && albumYear > to) {
        return false;
      }

      return true;
    });

    const sorted = [...filtered].sort((a, b) => {
      if (sortMode === "artist") {
        return (
          formatDisplayValue(a.artist).localeCompare(formatDisplayValue(b.artist)) ||
          formatDisplayValue(a.name || a.title).localeCompare(formatDisplayValue(b.name || b.title))
        );
      }

      if (sortMode === "year-desc") {
        return yearNumber(b.year) - yearNumber(a.year);
      }

      if (sortMode === "year-asc") {
        return yearNumber(a.year) - yearNumber(b.year);
      }

      return formatDisplayValue(a.name || a.title).localeCompare(formatDisplayValue(b.name || b.title));
    });

    return reverseSort ? sorted.reverse() : sorted;
  }, [albums, artistFilter, query, reverseSort, sortMode, yearFrom, yearTo]);

  const gridClass =
    gridDensity === "compact"
      ? "grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8"
      : gridDensity === "large"
      ? "grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5"
      : "grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-7";

  const hasActiveFilters =
    Boolean(query.trim()) ||
    Boolean(artistFilter.trim()) ||
    Boolean(yearFrom.trim()) ||
    Boolean(yearTo.trim());

  function cycleGridDensity() {
    setGridDensity((current) =>
      current === "normal" ? "compact" : current === "compact" ? "large" : "normal"
    );
  }

  function clearFilters() {
    setQuery("");
    setArtistFilter("");
    setYearFrom("");
    setYearTo("");
  }

  return (
    <PageShell className="bg-black text-white">
      <div className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-white/10 bg-black/90 px-2 backdrop-blur">
        <div className="flex h-full items-center">
          <Link
            href="/genres"
            className="mr-2 inline-flex h-11 items-center gap-2 rounded px-3 text-sm font-semibold text-white/80 transition hover:bg-white/10 hover:text-white"
          >
            <ArrowLeft size={17} />
            Albums
          </Link>

          <div className="mx-2 h-full w-px bg-white/10" />

          <label className="flex h-11 items-center gap-2 px-4 text-sm font-semibold text-white/80">
            <select
              value={sortMode}
              onChange={(event) => setSortMode(event.target.value as SortMode)}
              className="appearance-none bg-transparent outline-none"
            >
              <option className="bg-black" value="name">Name</option>
              <option className="bg-black" value="artist">Artist</option>
              <option className="bg-black" value="year-desc">Newest</option>
              <option className="bg-black" value="year-asc">Oldest</option>
            </select>
          </label>

          <div className="mx-2 h-full w-px bg-white/10" />

          <ToolbarIcon
            label={reverseSort ? "Ascending order" : "Descending order"}
            active={reverseSort}
            onClick={() => setReverseSort((current) => !current)}
          >
            <ArrowDownUp size={18} />
          </ToolbarIcon>
          <ToolbarIcon
            label="Filter"
            active={filterOpen || Boolean(query.trim())}
            onClick={() => setFilterOpen((current) => !current)}
          >
            <Filter size={18} />
          </ToolbarIcon>
          <ToolbarIcon label="Refresh" onClick={() => setRefreshKey((key) => key + 1)}>
            <RefreshCw size={18} className={loading ? "animate-spin" : undefined} />
          </ToolbarIcon>
        </div>

        <div className="flex items-center gap-1">
          <div className="hidden truncate px-3 text-sm font-semibold text-white/45 sm:block">
            {genre}
          </div>
          <ToolbarIcon
            label={`Grid density: ${gridDensity}`}
            active={gridDensity !== "normal"}
            onClick={cycleGridDensity}
          >
            <Grid3X3 size={18} />
          </ToolbarIcon>
          <ToolbarIcon
            label="Options"
            active={optionsOpen || hasActiveFilters}
            onClick={() => setOptionsOpen((current) => !current)}
          >
            <SlidersHorizontal size={18} />
          </ToolbarIcon>
        </div>
      </div>

      {(filterOpen || optionsOpen) && (
        <div className="sticky top-14 z-10 border-b border-white/10 bg-black/90 px-4 py-3 backdrop-blur">
          <div className="flex flex-wrap items-center gap-3">
            {filterOpen && (
              <div className="relative min-w-64 flex-1">
                <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/35" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Filter albums or artists..."
                  autoFocus
                  className="h-10 w-full rounded-lg border border-white/10 bg-white/[0.06] pl-9 pr-10 text-sm font-semibold text-white outline-none placeholder:text-white/35 focus:border-white/25"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded text-white/45 hover:bg-white/10 hover:text-white"
                    aria-label="Clear album filter"
                  >
                    <X size={15} />
                  </button>
                )}
              </div>
            )}

            {optionsOpen && (
              <>
                <input
                  value={artistFilter}
                  onChange={(event) => setArtistFilter(event.target.value)}
                  placeholder="Artist"
                  className="h-10 w-44 rounded-lg border border-white/10 bg-white/[0.06] px-3 text-sm font-semibold text-white outline-none placeholder:text-white/35 focus:border-white/25"
                />
                <input
                  value={yearFrom}
                  onChange={(event) => setYearFrom(event.target.value)}
                  placeholder="From year"
                  inputMode="numeric"
                  className="h-10 w-28 rounded-lg border border-white/10 bg-white/[0.06] px-3 text-sm font-semibold text-white outline-none placeholder:text-white/35 focus:border-white/25"
                />
                <input
                  value={yearTo}
                  onChange={(event) => setYearTo(event.target.value)}
                  placeholder="To year"
                  inputMode="numeric"
                  className="h-10 w-28 rounded-lg border border-white/10 bg-white/[0.06] px-3 text-sm font-semibold text-white outline-none placeholder:text-white/35 focus:border-white/25"
                />
              </>
            )}

            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="h-10 rounded-lg border border-white/10 px-3 text-sm font-semibold text-white/60 hover:bg-white/10 hover:text-white"
              >
                Clear
              </button>
            )}

            <div className="ml-auto text-sm font-semibold text-white/35">
              {visibleAlbums.length.toLocaleString()} of {albums.length.toLocaleString()}
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="p-2">
          <CardGridSkeleton className={gridClass} />
        </div>
      ) : error ? (
        <div className="p-6">
          <ErrorState
            title={error}
            description="Check your Navidrome connection and try again."
            onRetry={() => {
              setAlbums([]);
              setHasMore(true);
              setRefreshKey((key) => key + 1);
            }}
          />
        </div>
      ) : visibleAlbums.length === 0 ? (
        <div className="p-6">
          <EmptyState
            title={`No ${genre} albums found`}
            description={hasActiveFilters ? "Try clearing the active filters." : "Navidrome did not return any albums for this genre."}
          />
        </div>
      ) : (
        <>
          <div className={`grid p-2 ${gridClass}`}>
            {visibleAlbums.map((album) => {
              const normalized = normalizeAlbum(album);

              return (
                <div
                  key={normalized.id || albumKey(album)}
                  className="min-w-0"
                >
                  <MediaCard
                    href={`/albums/${normalized.id}`}
                    subtitleHref={normalized.artistId ? `/artists/${normalized.artistId}` : undefined}
                    image={normalized.coverArt}
                    title={normalized.name}
                    subtitle={normalized.artist}
                    meta={normalized.year}
                    initialRating={Number(normalized.raw?.userRating || normalized.raw?.rating || 0)}
                    fallback={<Disc3 size={42} />}
                  />
                </div>
              );
            })}
          </div>

          <div
            ref={loaderRef}
            className="flex min-h-20 items-center justify-center px-6 pb-10 text-sm font-semibold text-white/40"
          >
            {loadingMore && "Loading more albums..."}
            {!loadingMore && hasMore && "Scroll for more"}
            {!loadingMore && !hasMore && `${visibleAlbums.length.toLocaleString()} albums`}
          </div>
        </>
      )}
    </PageShell>
  );
}

function ToolbarIcon({
  children,
  label,
  active = false,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`inline-flex h-11 w-11 items-center justify-center rounded transition hover:bg-white/10 hover:text-white ${
        active ? "bg-white/10 text-white" : "text-white/65"
      }`}
    >
      {children}
    </button>
  );
}
