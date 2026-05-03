"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CheckSquare,
  Disc3,
  Filter,
  SlidersHorizontal,
  SortAsc,
  CalendarDays,
} from "lucide-react";
import { getAlbumListByType } from "@/lib/navidrome";
import { normalizeAlbum } from "@/lib/normalizers";
import {
  CardGridSkeleton,
  EmptyState,
  ErrorState,
  MediaCard,
  PageHeader,
  PageShell,
  SelectField,
  TextInput,
  ToolbarButton,
} from "@/components/ui/AppPrimitives";

type AlbumCollectionPageProps = {
  title: string;
  description: string;
  type: string;
  fetchAll?: boolean;
  pageSize?: number;
  showToolbar?: boolean;
};

export default function AlbumCollectionPage({
  title,
  description,
  type,
  pageSize = 100,
  showToolbar = false,
}: AlbumCollectionPageProps) {
  const batchSize = pageSize;
  const loaderRef = useRef<HTMLDivElement | null>(null);
  const [albums, setAlbums] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState("");
  const [sortMode, setSortMode] = useState<"album-asc" | "album-desc" | "artist-asc" | "year-desc" | "year-asc">("album-asc");
  const [yearFilter, setYearFilter] = useState("");
  const [genreFilter, setGenreFilter] = useState("");
  const [compilationsOnly, setCompilationsOnly] = useState(false);
  const [multiSelect, setMultiSelect] = useState(false);
  const [selectedAlbums, setSelectedAlbums] = useState<Record<string, boolean>>({});

  const loadAlbumPage = useCallback(
    async (offset: number) => {
      if (offset === 0) {
        setLoading(true);
        setError("");
      } else {
        setLoadingMore(true);
      }

      try {
        const data = await getAlbumListByType(type, batchSize, offset);
        const nextAlbums = data.filter(Boolean);

        setAlbums((current) => {
          if (offset === 0) return nextAlbums;

          const seen = new Set(current.map((album) => album.id));
          const additions = nextAlbums.filter((album) => !seen.has(album.id));
          return [...current, ...additions];
        });

        setHasMore(nextAlbums.length === batchSize);
      } catch (error) {
        console.error(`Failed to load ${title}:`, error);
        if (offset === 0) {
          setError(`Unable to load ${title.toLowerCase()}.`);
        }
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [batchSize, title, type]
  );

  useEffect(() => {
    setAlbums([]);
    setHasMore(true);
    setSelectedAlbums({});
    loadAlbumPage(0);
  }, [loadAlbumPage]);

  useEffect(() => {
    const loader = loaderRef.current;
    if (!loader || loading || loadingMore || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          loadAlbumPage(albums.length);
        }
      },
      { rootMargin: "800px 0px" }
    );

    observer.observe(loader);

    return () => observer.disconnect();
  }, [albums.length, hasMore, loadAlbumPage, loading, loadingMore]);

  const genres = useMemo(() => {
    const values = albums
      .map((album) => album.genre)
      .filter(Boolean)
      .map((genre) => String(genre));

    return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));
  }, [albums]);

  const visibleAlbums = useMemo(() => {
    const filtered = albums.filter((album) => {
      if (yearFilter && String(album.year || "") !== yearFilter) return false;
      if (genreFilter && String(album.genre || "") !== genreFilter) return false;

      if (compilationsOnly) {
        const compilation =
          album.isCompilation === true ||
          album.compilation === true ||
          String(album.isCompilation || album.compilation || "").toLowerCase() === "true";

        if (!compilation) return false;
      }

      return true;
    });

    if (!showToolbar) return filtered;

    return [...filtered].sort((a, b) => {
      if (sortMode === "album-desc") {
        return String(b.name || "").localeCompare(String(a.name || ""));
      }

      if (sortMode === "artist-asc") {
        return (
          String(a.artist || "").localeCompare(String(b.artist || "")) ||
          String(a.name || "").localeCompare(String(b.name || ""))
        );
      }

      if (sortMode === "year-desc") {
        return Number(b.year || 0) - Number(a.year || 0);
      }

      if (sortMode === "year-asc") {
        return Number(a.year || 0) - Number(b.year || 0);
      }

      return String(a.name || "").localeCompare(String(b.name || ""));
    });
  }, [albums, compilationsOnly, genreFilter, showToolbar, sortMode, yearFilter]);

  const selectedCount = Object.values(selectedAlbums).filter(Boolean).length;

  function toggleSelected(id: string) {
    setSelectedAlbums((current) => ({
      ...current,
      [id]: !current[id],
    }));
  }

  function toggleMultiSelect() {
    setMultiSelect((current) => {
      if (current) setSelectedAlbums({});
      return !current;
    });
  }

  function retryLoad() {
    setAlbums([]);
    setHasMore(true);
    setSelectedAlbums({});
    loadAlbumPage(0);
  }

  return (
    <PageShell>
      <div className="sticky top-0 z-20 border-b border-[var(--app-border)] bg-[color-mix(in_srgb,var(--app-bg)_94%,transparent)] px-5 py-5 backdrop-blur">
        <PageHeader
          title={title}
          description={showToolbar ? undefined : description}
          eyebrow={!loading ? `${visibleAlbums.length} of ${albums.length} albums` : undefined}
          actions={
            showToolbar ? (
            <>
              <label className="inline-flex h-9 items-center gap-2 rounded-lg border border-[var(--app-border)] bg-[var(--app-panel)] px-3 text-sm font-semibold text-[var(--foreground)]">
                <SortAsc size={16} />
                <SelectField
                  value={sortMode}
                  onChange={(e) => setSortMode(e.target.value as typeof sortMode)}
                  className="h-auto border-0 bg-transparent px-0"
                >
                  <option value="album-asc">
                    A-Z (Album)
                  </option>
                  <option value="album-desc">
                    Z-A (Album)
                  </option>
                  <option value="artist-asc">
                    A-Z (Artist)
                  </option>
                  <option value="year-desc">
                    Newest
                  </option>
                  <option value="year-asc">
                    Oldest
                  </option>
                </SelectField>
              </label>

              <TextInput
                icon={CalendarDays}
                value={yearFilter}
                onChange={(e) => setYearFilter(e.target.value)}
                placeholder="Year"
                inputMode="numeric"
                className="h-9 w-24"
              />

              <label className="inline-flex h-9 items-center gap-2 rounded-lg border border-[var(--app-border)] bg-[var(--app-panel)] px-3 text-sm font-semibold text-[var(--foreground)]">
                <Filter size={16} />
                <SelectField
                  value={genreFilter}
                  onChange={(e) => setGenreFilter(e.target.value)}
                  className="h-auto max-w-40 border-0 bg-transparent px-0"
                >
                  <option value="">
                    Genre Filter
                  </option>
                  {genres.map((genre) => (
                    <option key={genre} value={genre}>
                      {genre}
                    </option>
                  ))}
                </SelectField>
              </label>

              <ToolbarButton
                onClick={() => setCompilationsOnly((current) => !current)}
                active={compilationsOnly}
              >
                <Disc3 size={18} />
                Compilations
              </ToolbarButton>

              <ToolbarButton
                onClick={toggleMultiSelect}
                active={multiSelect}
              >
                <CheckSquare size={18} />
                Multi-select
              </ToolbarButton>
            </>
          ) : undefined
          }
        />

        {showToolbar && multiSelect && (
          <div className="mt-4 flex items-center gap-3 text-sm font-semibold text-[var(--app-accent)]">
            <SlidersHorizontal size={16} />
            {selectedCount} selected
          </div>
        )}
      </div>

      {loading ? (
        <div className="p-5">
          <CardGridSkeleton />
        </div>
      ) : error ? (
        <div className="p-6">
          <ErrorState
            title={error}
            description="Check your Navidrome connection and try again."
            onRetry={retryLoad}
          />
        </div>
      ) : (
        <>
          {visibleAlbums.length === 0 ? (
            <div className="p-6">
              <EmptyState
                title="No albums found"
                description="Try clearing the active filters or loading more of your library."
              />
            </div>
          ) : (
          <div className="grid grid-cols-2 gap-4 p-5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-7">
            {visibleAlbums.map((album) => {
              const normalized = normalizeAlbum(album);
              const card = (
                <AlbumCard
                  album={normalized}
                  selected={Boolean(selectedAlbums[normalized.id])}
                  linked={!multiSelect}
                />
              );

              if (multiSelect) {
                return (
                  <button
                    type="button"
                    key={normalized.id}
                    onClick={() => toggleSelected(normalized.id)}
                    className="text-left"
                  >
                    {card}
                  </button>
                );
              }

              return <div key={normalized.id}>{card}</div>;
            })}
          </div>
          )}

          <div ref={loaderRef} className="flex min-h-20 items-center justify-center px-6 pb-10 text-sm font-semibold text-[var(--app-muted)]">
            {loadingMore && "Loading more albums..."}
            {!loadingMore && hasMore && "Scroll for more"}
            {!loadingMore && !hasMore && albums.length > 0 && "End of albums"}
          </div>
        </>
      )}
    </PageShell>
  );
}

function AlbumCard({
  album,
  selected,
  linked = true,
}: {
  album: ReturnType<typeof normalizeAlbum>;
  selected: boolean;
  linked?: boolean;
}) {
  return (
    <MediaCard
      href={linked ? `/albums/${album.id}` : undefined}
      subtitleHref={linked && album.artistId ? `/artists/${album.artistId}` : undefined}
      image={album.coverArt}
      title={album.name}
      subtitle={album.artist}
      meta={album.year}
      initialRating={Number(album.raw?.userRating || album.raw?.rating || 0)}
      selected={selected}
      fallback={<Disc3 size={34} />}
    />
  );
}
