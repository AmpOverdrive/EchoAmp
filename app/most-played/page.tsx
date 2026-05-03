"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Disc3,
  Music2,
  Play,
  TrendingUp,
  UsersRound,
} from "lucide-react";
import {
  getAlbum,
  getAlbumListByType,
  getCoverArtUrl,
  getStreamUrl,
} from "@/lib/navidrome";
import { usePlayerStore } from "@/lib/player-store";
import { formatDisplayValue } from "@/lib/text-utils";
import { decodeHtml } from "@/lib/text-utils";

const PAGE_SIZE = 50;

const COMPILATION_NAMES = new Set([
  "various artists",
  "various",
  "va",
  "v.a.",
  "v.a",
  "soundtrack",
  "original soundtrack",
  "ost",
  "original motion picture soundtrack",
  "original score",
  "compilations",
]);

function isCompilation(name = "") {
  return COMPILATION_NAMES.has(name.toLowerCase().trim());
}

function deriveTopArtists(albums: any[], filterCompilations: boolean) {
  const map = new Map<string, any>();

  albums.forEach((album) => {
    const plays = Number(album.playCount || 0);
    if (!plays) return;
    if (filterCompilations && isCompilation(album.artist || "")) return;

    const id = album.artistId || album.artist || "unknown";
    const existing = map.get(id);

    if (existing) {
      existing.totalPlays += plays;
      if (!existing.coverArt && album.coverArt) existing.coverArt = album.coverArt;
    } else {
      map.set(id, {
        id,
        name: album.artist || "Unknown Artist",
        coverArt: album.coverArt,
        totalPlays: plays,
      });
    }
  });

  return [...map.values()].sort((a, b) => b.totalPlays - a.totalPlays).slice(0, 10);
}

export default function MostPlayedPage() {
  const setTrack = usePlayerStore((s: any) => s.setTrack);

  const [albums, setAlbums] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [sortAsc, setSortAsc] = useState(false);
  const [filterCompilations, setFilterCompilations] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setAlbums([]);
    setHasMore(true);

    try {
      const result = await getAlbumListByType("frequent", PAGE_SIZE, 0);
      setAlbums(result.filter(Boolean));
      setHasMore(result.length === PAGE_SIZE);
    } catch (error) {
      console.error("Most Played load failed:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function loadMore() {
    if (loadingMore || !hasMore) return;

    setLoadingMore(true);

    try {
      const result = await getAlbumListByType("frequent", PAGE_SIZE, albums.length);
      setAlbums((prev) => [...prev, ...result.filter(Boolean)]);
      setHasMore(result.length === PAGE_SIZE);
    } catch (error) {
      console.error("Most Played load more failed:", error);
    } finally {
      setLoadingMore(false);
    }
  }

  async function playAlbum(albumId: string) {
    try {
      const album = await getAlbum(albumId);
      const songs = Array.isArray(album?.song) ? album.song : album?.song ? [album.song] : [];

      const queue = songs.map((song: any) => ({
        id: song.id,
        title: decodeHtml(song.title),
        artist: decodeHtml(song.artist || album.artist),
        album: decodeHtml(song.album || album.name),
        albumId: song.albumId || album.id,
        artistId: song.artistId || album.artistId,
        coverArt: getCoverArtUrl(song.coverArt || song.albumId || album.coverArt || album.id),
        streamUrl: getStreamUrl(song.id),
        duration: song.duration,
        playCount: song.playCount,
        starred: song.starred,
      }));

      if (queue[0]) setTrack(queue[0], queue);
    } catch (error) {
      console.error("Play album failed:", error);
    }
  }

  const sortedAlbums = useMemo(() => {
    const withPlays = albums.filter((album) => Number(album.playCount || 0) > 0);
    return sortAsc ? [...withPlays].reverse() : withPlays;
  }, [albums, sortAsc]);

  const topArtists = useMemo(
    () => deriveTopArtists(albums, filterCompilations),
    [albums, filterCompilations]
  );

  return (
    <main className="min-h-screen bg-[var(--app-bg)] px-5 py-5 pb-32 text-[var(--foreground)]">
      <div className="mb-7 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <TrendingUp size={22} className="text-[var(--app-accent)]" />
          <h1 className="app-title">Most Played</h1>
        </div>

        <button
          onClick={() => setSortAsc((v) => !v)}
          className="flex items-center gap-2 rounded-lg border border-[var(--app-border)] bg-[var(--app-panel)] px-3.5 py-2 text-sm font-semibold text-[var(--app-muted)] hover:bg-[var(--app-panel-strong)]"
        >
          {sortAsc ? <ArrowUp size={15} /> : <ArrowDown size={15} />}
          {sortAsc ? "Least played first" : "Most played first"}
          <ArrowUpDown size={13} className="opacity-50" />
        </button>
      </div>

      {!loading && (
        <section className="app-table-shell mb-8 rounded-2xl p-4">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <UsersRound size={17} className="text-[var(--app-accent)]" />
              <h2 className="app-label">
                Top Artists
              </h2>
            </div>

            <button
              onClick={() => setFilterCompilations((v) => !v)}
              className={[
                "rounded-lg border px-3 py-2 text-xs font-semibold transition",
                filterCompilations
                  ? "border-[var(--app-accent)] bg-[var(--app-accent-soft)] text-[var(--app-accent)]"
                  : "border-[var(--app-border)] bg-[var(--app-panel)] text-[var(--app-muted)] hover:bg-[var(--app-panel-strong)]",
              ].join(" ")}
            >
              Hide compilations
            </button>
          </div>

          {topArtists.length ? (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              {topArtists.map((artist, index) => (
                <Link
                  key={artist.id}
                  href={`/artists/${artist.id}`}
                  className="app-table-row flex items-center gap-3 rounded-xl border-b-0 px-3 py-3"
                >
                  <div className="w-6 text-center text-base font-bold text-[var(--app-accent)]">
                    {index + 1}
                  </div>

                  <img
                    src={getCoverArtUrl(artist.coverArt || artist.id)}
                    alt=""
                    className="app-table-thumb h-12 w-12 object-cover"
                  />

                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-[var(--foreground)]">
                      {decodeHtml(artist.name)}
                    </div>
                    <div className="text-xs text-[var(--app-muted)]">
                      {artist.totalPlays.toLocaleString()} plays
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-[var(--app-border)] bg-[var(--app-panel)] p-4 text-sm text-[var(--app-muted)]">
              No top artists found yet.
            </div>
          )}
        </section>
      )}

      <section className="app-table-shell rounded-2xl p-4">
        <div className="mb-5 flex items-center gap-2">
          <Disc3 size={17} className="text-[var(--app-accent)]" />
          <h2 className="app-label">
            Top Albums
          </h2>
        </div>

        {loading ? (
          <div className="p-8 text-[var(--app-muted)]">Loading most played albums...</div>
        ) : sortedAlbums.length ? (
          <>
            <div className="space-y-1.5">
              {sortedAlbums.map((album, index) => (
                <div
                  key={album.id}
                  className="app-table-row grid grid-cols-[42px_56px_1fr_80px_90px_42px] items-center gap-3 rounded-xl border-b-0 px-3 py-2.5"
                >
                  <div className="text-center text-sm font-bold text-[var(--app-accent)]">
                    {sortAsc ? sortedAlbums.length - index : index + 1}
                  </div>

                  <Link href={`/albums/${album.id}`}>
                    <img
                      src={getCoverArtUrl(album.coverArt || album.id)}
                      alt={decodeHtml(album.name)}
                      className="app-table-thumb h-14 w-14 object-cover"
                    />
                  </Link>

                  <div className="min-w-0">
                    <Link
                      href={`/albums/${album.id}`}
                      className="block truncate text-sm font-semibold text-[var(--foreground)] hover:text-[var(--app-accent)]"
                    >
                      {decodeHtml(album.name || album.title || "Unknown Album")}
                    </Link>

                    <Link
                      href={`/artists/${album.artistId}`}
                      className="mt-1 block truncate text-xs text-[var(--app-muted)] hover:text-[var(--app-accent)]"
                    >
                      {decodeHtml(album.artist || "Unknown Artist")}
                    </Link>
                  </div>

                  <div className="text-sm text-[var(--app-muted)]">{formatDisplayValue(album.year)}</div>

                  <div className="text-right text-sm font-semibold text-[var(--app-muted)]">
                    {Number(album.playCount || 0).toLocaleString()} plays
                  </div>

                  <button
                    onClick={() => playAlbum(album.id)}
                    className="grid h-9 w-9 place-items-center rounded-full bg-[var(--app-accent-strong)] text-black hover:scale-105"
                  >
                    <Play size={17} fill="currentColor" />
                  </button>
                </div>
              ))}
            </div>

            {hasMore && (
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="mt-5 rounded-lg border border-[var(--app-border)] bg-[var(--app-panel)] px-4 py-2 text-sm font-semibold text-[var(--app-muted)] hover:bg-[var(--app-panel-strong)] disabled:opacity-50"
              >
                {loadingMore ? "Loading..." : "Load more"}
              </button>
            )}
          </>
        ) : (
          <div className="rounded-lg border border-[var(--app-border)] bg-[var(--app-panel)] p-4 text-sm text-[var(--app-muted)]">
            No play-count data found yet.
          </div>
        )}
      </section>
    </main>
  );
}
