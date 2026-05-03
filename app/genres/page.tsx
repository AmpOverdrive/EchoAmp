"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search, Tags } from "lucide-react";
import { getGenres } from "@/lib/navidrome";
import {
  CardGridSkeleton,
  EmptyState,
  ErrorState,
  PageHeader,
  PageShell,
  TextInput,
} from "@/components/ui/AppPrimitives";
import { formatDisplayValue } from "@/lib/text-utils";

type Genre = {
  name: string;
  songCount?: number;
  albumCount?: number;
};

const GENRE_COLORS = [
  "#cb5ddd",
  "#9a1d58",
  "#30306f",
  "#df557d",
  "#e3d68e",
  "#673dc6",
  "#4c66ee",
  "#f0ef49",
  "#648b87",
  "#b55e70",
  "#adbb49",
  "#71d987",
  "#121d24",
  "#918b7b",
  "#df7b35",
  "#2f8ca3",
  "#e25c5c",
  "#5567a9",
];

function hashText(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function genreColor(name: string) {
  return GENRE_COLORS[hashText(name) % GENRE_COLORS.length];
}

function textColor(hex: string) {
  const raw = hex.replace("#", "");
  const red = parseInt(raw.slice(0, 2), 16);
  const green = parseInt(raw.slice(2, 4), 16);
  const blue = parseInt(raw.slice(4, 6), 16);
  const brightness = (red * 299 + green * 587 + blue * 114) / 1000;
  return brightness > 150 ? "#05070a" : "#f8fafc";
}

function pluralize(count: number, singular: string, plural: string) {
  return `${count.toLocaleString()} ${count === 1 ? singular : plural}`;
}

export default function GenresPage() {
  const [genres, setGenres] = useState<Genre[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadGenres = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const data = await getGenres();
      setGenres(data.filter(Boolean));
    } catch (loadError) {
      console.error("Failed to load genres:", loadError);
      setError("Unable to load genres from Navidrome.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGenres();
  }, [loadGenres]);

  const filteredGenres = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return genres;

    return genres.filter((genre) =>
      genre.name.toLowerCase().includes(needle)
    );
  }, [genres, query]);

  return (
    <PageShell className="px-5 py-6 md:px-8">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <PageHeader
          title="Genres"
          description="Browse your Navidrome library by genre."
        />

        <div className="w-full max-w-xs">
          <TextInput
            icon={Search}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search genres..."
          />
        </div>
      </div>

      {loading && (
        <CardGridSkeleton />
      )}

      {!loading && error && (
        <ErrorState
          title={error}
          description="Check that Navidrome is running and reachable."
          onRetry={loadGenres}
        />
      )}

      {!loading && !error && filteredGenres.length === 0 && (
        <EmptyState
          title="No genres found"
          description={query ? `No genres match "${query}".` : "Your library did not return any genres."}
        />
      )}

      {!loading && !error && filteredGenres.length > 0 && (
        <div className="grid grid-cols-2 gap-x-5 gap-y-9 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-7">
          {filteredGenres.map((genre) => {
            const name = formatDisplayValue(genre.name, "Unknown");
            const color = genreColor(name);
            const songCount = Number(genre.songCount || 0);
            const albumCount = Number(genre.albumCount || 0);

            return (
              <Link
                key={name}
                href={`/genres/${encodeURIComponent(name)}`}
                className="group min-w-0"
              >
                <div
                  className="grid aspect-square place-items-center rounded-md px-4 text-center shadow-sm shadow-black/20 transition duration-200 group-hover:-translate-y-0.5 group-hover:brightness-110"
                  style={{
                    background: color,
                    color: textColor(color),
                  }}
                >
                  <div className="line-clamp-2 text-base font-bold leading-tight">
                    {name || <Tags size={24} />}
                  </div>
                </div>

                <div className="mt-3 min-w-0">
                  <div className="truncate text-sm font-semibold text-[var(--foreground)]">
                    {name}
                  </div>
                  <div className="mt-1 space-y-0.5 text-sm leading-tight text-[var(--app-muted)]">
                    <div>{pluralize(songCount, "track", "tracks")}</div>
                    <div>{pluralize(albumCount, "album", "albums")}</div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </PageShell>
  );
}
