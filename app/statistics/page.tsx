"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Album,
  AudioLines,
  Clock3,
  Disc3,
  Flame,
  Library,
  Music2,
  Star,
  Tags,
  Users,
} from "lucide-react";
import {
  getAlbum,
  getAlbumListByType,
  getAllAlbumListByType,
  getArtists,
  getCoverArtUrl,
} from "@/lib/navidrome";
import { decodeHtml } from "@/lib/text-utils";
import {
  ErrorState,
  PageShell,
  ShelfSkeleton,
} from "@/components/ui/AppPrimitives";

type AnyItem = any;

function toArray(value: any) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function formatDuration(seconds: number) {
  if (!seconds) return "—";

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours <= 0) return `${minutes}m`;
  return `${hours.toLocaleString()}h ${minutes}m`;
}

function cleanFormat(value: any) {
  const text = String(value || "").toUpperCase();
  if (!text) return "UNKNOWN";
  return text.replace(/[^A-Z0-9]/g, "").slice(0, 8) || "UNKNOWN";
}

export default function StatisticsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [artists, setArtists] = useState<AnyItem[]>([]);
  const [allAlbums, setAllAlbums] = useState<AnyItem[]>([]);
  const [recentAlbums, setRecentAlbums] = useState<AnyItem[]>([]);
  const [frequentAlbums, setFrequentAlbums] = useState<AnyItem[]>([]);
  const [highestAlbums, setHighestAlbums] = useState<AnyItem[]>([]);
  const [genreRows, setGenreRows] = useState<{ name: string; count: number }[]>([]);
  const [formatRows, setFormatRows] = useState<{ name: string; count: number }[]>([]);
  const [songCount, setSongCount] = useState(0);
  const [playtime, setPlaytime] = useState(0);

  async function load() {
    setLoading(true);
    setError("");

    try {
      const [artistData, recent, frequent, highest, libraryAlbums] =
        await Promise.all([
          getArtists(),
          getAlbumListByType("recent", 12),
          getAlbumListByType("frequent", 12),
          getAlbumListByType("highest", 12),
          getAllAlbumListByType("newest", 500),
        ]);

      setArtists(artistData.filter(Boolean));
      setRecentAlbums(recent.filter(Boolean));
      setFrequentAlbums(frequent.filter(Boolean));
      setHighestAlbums(highest.filter(Boolean));
      setAllAlbums(libraryAlbums.filter(Boolean));

      const sampleAlbums = libraryAlbums.filter(Boolean).slice(0, 120);
      const fullAlbums = await Promise.all(
        sampleAlbums.map((album: any) => getAlbum(album.id).catch(() => null))
      );

      const genreMap = new Map<string, number>();
      const formatMap = new Map<string, number>();
      let songs = 0;
      let seconds = 0;

      fullAlbums.filter(Boolean).forEach((album: any) => {
        const albumSongs = toArray(album.song);

        albumSongs.forEach((song: any) => {
          songs += 1;
          seconds += Number(song.duration || 0);

          const genre = decodeHtml(song.genre || album.genre || "Unknown") || "Unknown";
          genreMap.set(genre, (genreMap.get(genre) || 0) + 1);

          const format = cleanFormat(song.suffix || song.contentType || song.type);
          formatMap.set(format, (formatMap.get(format) || 0) + 1);
        });
      });

      setSongCount(songs);
      setPlaytime(seconds);

      setGenreRows(
        [...genreMap.entries()]
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10)
      );

      setFormatRows(
        [...formatMap.entries()]
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 8)
      );
    } catch (error) {
      console.error("Statistics failed:", error);
      setError("Unable to load statistics.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const maxGenre = Math.max(...genreRows.map((g) => g.count), 1);
  const maxFormat = Math.max(...formatRows.map((f) => f.count), 1);

  const stats = useMemo(
    () => [
      {
        label: "Artists",
        value: artists.length.toLocaleString(),
        icon: Users,
      },
      {
        label: "Albums",
        value: allAlbums.length.toLocaleString(),
        icon: Disc3,
      },
      {
        label: "Songs sampled",
        value: songCount.toLocaleString(),
        icon: AudioLines,
      },
      {
        label: "Playtime sampled",
        value: formatDuration(playtime),
        icon: Clock3,
      },
    ],
    [artists.length, allAlbums.length, songCount, playtime]
  );

  return (
    <PageShell className="px-5 py-5">
      <div className="mb-7 flex items-center gap-3">
        <Library size={22} className="text-[var(--app-accent)]" />
        <h1 className="app-title">Statistics</h1>
      </div>

      {loading ? (
        <StatisticsSkeleton />
      ) : error ? (
        <ErrorState
          title={error}
          description="Check your Navidrome connection and try again."
          onRetry={load}
        />
      ) : (
        <>

      <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;

          return (
            <div
              key={stat.label}
              className="rounded-xl border border-[var(--app-border)] bg-[var(--app-shell)] p-4 shadow-xl"
            >
              <div className="mb-5 flex items-center justify-between">
                <div className="app-label">
                  {stat.label}
                </div>
                <Icon size={18} className="text-[var(--app-accent)]" />
              </div>

              <div className="text-2xl font-bold text-[var(--app-accent)]">
                {stat.value}
              </div>
            </div>
          );
        })}
      </section>

      <section className="mb-6 grid gap-5 lg:grid-cols-2">
        <InsightCard title="Genre Insights" icon={<Tags size={16} />}>
          {genreRows.length ? (
            <div className="space-y-4">
              {genreRows.map((genre) => (
                <BarRow
                  key={genre.name}
                  label={genre.name}
                  value={genre.count}
                  percent={(genre.count / maxGenre) * 100}
                />
              ))}
            </div>
          ) : (
            <Empty text="Genre data is still computing or not tagged." />
          )}
        </InsightCard>

        <InsightCard title="Format Distribution" icon={<Music2 size={16} />}>
          {formatRows.length ? (
            <div className="space-y-4">
              {formatRows.map((format) => (
                <BarRow
                  key={format.name}
                  label={format.name}
                  value={format.count}
                  percent={(format.count / maxFormat) * 100}
                  mono
                />
              ))}
            </div>
          ) : (
            <Empty text="Format data is still computing." />
          )}
        </InsightCard>
      </section>

      <AlbumRow title="Recently Played" icon={<Clock3 size={17} />} albums={recentAlbums} />
      <AlbumRow title="Most Played" icon={<Flame size={17} />} albums={frequentAlbums} />
      <AlbumRow title="Highest Rated" icon={<Star size={17} />} albums={highestAlbums} />

      <p className="app-muted mt-8 max-w-3xl text-xs">
        Library totals are pulled from Navidrome/Subsonic data. Genre, format, song count,
        and playtime are computed from a capped album sample so the page stays responsive.
      </p>
        </>
      )}
    </PageShell>
  );
}

function StatisticsSkeleton() {
  return (
    <div className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="animate-pulse rounded-xl border border-[var(--app-border)] bg-[var(--app-shell)] p-4 shadow-xl"
          >
            <div className="mb-5 flex items-center justify-between">
              <div className="h-3 w-20 rounded bg-white/[0.08]" />
              <div className="h-5 w-5 rounded bg-white/[0.08]" />
            </div>
            <div className="h-8 w-24 rounded bg-white/[0.1]" />
          </div>
        ))}
      </section>
      <section className="grid gap-5 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, index) => (
          <div
            key={index}
            className="animate-pulse rounded-xl border border-[var(--app-border)] bg-[var(--app-shell)] p-4 shadow-xl"
          >
            <div className="mb-5 h-3 w-32 rounded bg-white/[0.08]" />
            <div className="space-y-4">
              {Array.from({ length: 6 }).map((__, row) => (
                <div key={row}>
                  <div className="mb-2 flex justify-between">
                    <div className="h-3 w-32 rounded bg-white/[0.08]" />
                    <div className="h-3 w-10 rounded bg-white/[0.06]" />
                  </div>
                  <div className="h-1.5 rounded-full bg-white/[0.07]" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>
      <ShelfSkeleton />
    </div>
  );
}

function InsightCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-[var(--app-border)] bg-[var(--app-shell)] p-4 shadow-xl">
      <div className="mb-5 flex items-center gap-2">
        <span className="text-[var(--app-accent)]">{icon}</span>
        <h2 className="app-label">
          {title}
        </h2>
      </div>
      {children}
    </section>
  );
}

function BarRow({
  label,
  value,
  percent,
  mono = false,
}: {
  label: string;
  value: number;
  percent: number;
  mono?: boolean;
}) {
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-4">
        <span
          className={[
            "truncate text-sm font-semibold text-[var(--foreground)]",
            mono ? "font-mono" : "",
          ].join(" ")}
        >
          {decodeHtml(label)}
        </span>
        <span className="text-xs text-[var(--app-muted)]">{value.toLocaleString()}</span>
      </div>

      <div className="h-1.5 overflow-hidden rounded-full bg-[var(--app-panel)]">
        <div
          className="h-full rounded-full bg-[var(--app-accent)] transition-all"
          style={{ width: `${Math.max(percent, 4)}%` }}
        />
      </div>
    </div>
  );
}

function AlbumRow({
  title,
  icon,
  albums,
}: {
  title: string;
  icon: React.ReactNode;
  albums: AnyItem[];
}) {
  if (!albums.length) return null;

  return (
    <section className="mb-8">
      <div className="mb-4 flex items-center gap-2">
        <span className="text-[var(--app-accent)]">{icon}</span>
        <h2 className="app-label">
          {title}
        </h2>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-2">
        {albums.map((album: any) => (
          <Link
            key={album.id}
            href={`/albums/${album.id}`}
            className="group w-[220px] shrink-0"
          >
            <img
              src={getCoverArtUrl(album.coverArt || album.id)}
              alt={decodeHtml(album.name || album.title || "Album")}
              className="aspect-square w-full rounded-xl object-cover shadow-lg transition group-hover:scale-[1.03]"
            />

            <div className="app-card-title mt-3 truncate">
              {decodeHtml(album.name || album.title || "Unknown Album")}
            </div>

            <div className="app-muted mt-1 truncate text-xs">
              {decodeHtml(album.artist || "Unknown Artist")}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-[var(--app-border)] bg-[var(--app-panel)] p-4 text-sm text-[var(--app-muted)]">
      {text}
    </div>
  );
}
