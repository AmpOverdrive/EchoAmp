"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getArtists } from "@/lib/navidrome";
import { Grid2X2, Image, List, Search, CheckSquare, UsersRound } from "lucide-react";
import { normalizeArtist } from "@/lib/normalizers";
import {
  CardGridSkeleton,
  EmptyState,
  ErrorState,
  IconButton,
  MediaCard,
  PageHeader,
  PageShell,
  TextInput,
  ToolbarButton,
} from "@/components/ui/AppPrimitives";

const LETTERS = ["All", "#", "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z"];
const ARTIST_RENDER_BATCH = 120;

export default function ArtistsPage() {
  const loaderRef = useRef<HTMLDivElement | null>(null);
  const [artists, setArtists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [letter, setLetter] = useState("All");
  const [visibleCount, setVisibleCount] = useState(ARTIST_RENDER_BATCH);

  const loadArtists = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getArtists();
      setArtists(data);
    } catch (error) {
      console.error("Failed to load artists:", error);
      setError("Unable to load artists.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadArtists();
  }, [loadArtists]);

  const filteredArtists = useMemo(() => {
    return artists.filter((artist) => {
      const name = artist.name || "";

      const matchesQuery = name.toLowerCase().includes(query.toLowerCase());

      const first = name.charAt(0).toUpperCase();
      const matchesLetter =
        letter === "All" ||
        (letter === "#" && !/[A-Z]/.test(first)) ||
        first === letter;

      return matchesQuery && matchesLetter;
    });
  }, [artists, query, letter]);

  useEffect(() => {
    setVisibleCount(ARTIST_RENDER_BATCH);
  }, [query, letter]);

  const visibleArtists = useMemo(
    () => filteredArtists.slice(0, visibleCount),
    [filteredArtists, visibleCount]
  );

  const hasMoreArtists = visibleCount < filteredArtists.length;

  useEffect(() => {
    const loader = loaderRef.current;
    if (!loader || loading || !hasMoreArtists) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;

        setVisibleCount((current) =>
          Math.min(current + ARTIST_RENDER_BATCH, filteredArtists.length)
        );
      },
      { rootMargin: "900px 0px" }
    );

    observer.observe(loader);

    return () => observer.disconnect();
  }, [filteredArtists.length, hasMoreArtists, loading]);

  if (loading) {
    return (
      <PageShell className="p-5">
        <div className="mb-5">
          <PageHeader title="Artists" />
        </div>
        <CardGridSkeleton />
      </PageShell>
    );
  }

  return (
    <PageShell className="p-5">
      <div className="mb-5">
        <PageHeader
          title="Artists"
          eyebrow={`${filteredArtists.length} of ${artists.length} artists`}
          actions={
            <>
              <TextInput
                icon={Search}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search..."
                className="w-60"
              />
              <IconButton tone="primary" aria-label="Image grid">
                <Image size={18} />
              </IconButton>
              <IconButton tone="primary" aria-label="Card grid">
                <Grid2X2 size={18} />
              </IconButton>
              <IconButton aria-label="List view">
                <List size={18} />
              </IconButton>
              <ToolbarButton>
                <CheckSquare size={16} />
                Multi-select
              </ToolbarButton>
            </>
          }
        />
      </div>

      <div className="mb-7 flex flex-wrap gap-2 border-b border-[var(--app-border)] pb-4">
        {LETTERS.map((item) => (
          <button
            key={item}
            onClick={() => setLetter(item)}
            className={`h-9 min-w-9 rounded-lg px-3 text-sm font-semibold transition ${
              letter === item
                ? "bg-[var(--app-accent-strong)] text-slate-950"
                : "bg-[var(--app-shell)] text-[var(--app-muted)] hover:bg-[var(--app-panel)] hover:text-[var(--foreground)]"
            }`}
          >
            {item}
          </button>
        ))}
      </div>

      {error ? (
        <ErrorState
          title={error}
          description="Check your Navidrome connection and try again."
          onRetry={loadArtists}
        />
      ) : filteredArtists.length === 0 ? (
        <EmptyState
          title="No artists found"
          description="Try a different search or letter filter."
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-7">
            {visibleArtists.map((artist) => {
              const normalized = normalizeArtist(artist);

              return (
                <MediaCard
                  key={normalized.id}
                  href={`/artists/${normalized.id}`}
                  image={normalized.imageUrl}
                  title={normalized.name}
                  subtitle={`${normalized.albumCount} Albums`}
                  initialRating={Number(normalized.raw?.userRating || normalized.raw?.rating || 0)}
                  fallback={<UsersRound size={34} />}
                />
              );
            })}
          </div>

          <div
            ref={loaderRef}
            className="flex min-h-20 items-center justify-center px-6 py-6 text-sm font-semibold text-[var(--app-muted)]"
          >
            {hasMoreArtists
              ? `Showing ${visibleArtists.length} of ${filteredArtists.length} artists`
              : "End of artists"}
          </div>
        </>
      )}
    </PageShell>
  );
}
