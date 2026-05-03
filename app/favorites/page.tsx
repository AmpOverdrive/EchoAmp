"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  getStarredItems,
  rateItem,
} from "@/lib/navidrome";
import { usePlayerStore } from "@/lib/player-store";
import { useFavoritesStore } from "@/lib/favorites-store";
import {
  Play,
  ListPlus,
  SlidersHorizontal,
  Star,
  Heart,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  normalizeAlbum,
  normalizeArtist,
  normalizeTrack,
  trackForPlayer,
} from "@/lib/normalizers";
import {
  EmptyState,
  ErrorState,
  IconButton,
  MediaCard,
  PageHeader,
  PageShell,
  ShelfSkeleton,
  TableSkeleton,
  ToolbarButton,
} from "@/components/ui/AppPrimitives";
import { useToast } from "@/components/ui/ToastProvider";

function formatDuration(seconds: any) {
  if (!seconds) return "";
  const total = Number(seconds);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function ArtistCard({ artist, count }: { artist: any; count?: number }) {
  const normalized = normalizeArtist(artist);

  return (
    <div className="w-[220px] shrink-0">
      <MediaCard
        href={normalized.id ? `/artists/${normalized.id}` : undefined}
        image={normalized.imageUrl || artist.coverArt}
        title={normalized.name}
        subtitle={count !== undefined ? `${count} songs` : `${normalized.albumCount} Albums`}
        initialRating={Number(normalized.raw?.userRating || normalized.raw?.rating || 0)}
      />
    </div>
  );
}

function AlbumCard({ album }: { album: any }) {
  const normalized = normalizeAlbum(album);

  return (
    <div className="w-[220px] shrink-0">
      <MediaCard
        href={`/albums/${normalized.id}`}
        subtitleHref={normalized.artistId ? `/artists/${normalized.artistId}` : undefined}
        image={normalized.coverArt}
        title={normalized.name}
        subtitle={normalized.artist}
        meta={normalized.year}
        initialRating={Number(normalized.raw?.userRating || normalized.raw?.rating || 0)}
      />
    </div>
  );
}

function RowScroller({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement | null>(null);

  return (
    <section className="mb-16">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-[var(--foreground)]">{title}</h2>
        <div className="flex gap-2">
          <IconButton
            onClick={() => ref.current?.scrollBy({ left: -800, behavior: "smooth" })}
            aria-label={`Scroll ${title} left`}
          >
            <ChevronLeft size={20} />
          </IconButton>
          <IconButton
            onClick={() => ref.current?.scrollBy({ left: 800, behavior: "smooth" })}
            aria-label={`Scroll ${title} right`}
          >
            <ChevronRight size={20} />
          </IconButton>
        </div>
      </div>

      <div ref={ref} className="flex scroll-smooth gap-5 overflow-x-auto pb-3">
        {children}
      </div>
    </section>
  );
}

export default function FavoritesPage() {
  const [artists, setArtists] = useState<any[]>([]);
  const [albums, setAlbums] = useState<any[]>([]);
  const [songs, setSongs] = useState<any[]>([]);
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const setTrack = usePlayerStore((s) => s.setTrack);
  const favorites = useFavoritesStore((s) => s.favorites);
  const loadStarredFavorites = useFavoritesStore((s) => s.loadStarredFavorites);
  const toggleFavorite = useFavoritesStore((s) => s.toggleFavorite);
  const { showToast } = useToast();

  async function loadFavorites() {
    setLoading(true);
    setError("");
    try {
      const data = await getStarredItems();
      setArtists(data.artists);
      setAlbums(data.albums);
      setSongs(data.songs);

      const initialRatings: Record<string, number> = {};
      data.songs.forEach((song: any) => {
        initialRatings[song.id] = Number(song.userRating || song.rating || 0);
      });
      setRatings(initialRatings);

      await loadStarredFavorites();
    } catch (error) {
      console.error("Failed to load favorites:", error);
      setError("Unable to load favorites.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadFavorites();
  }, [loadStarredFavorites]);

  const topArtists = useMemo(() => {
    const favoriteArtistIds = new Set(
      artists
        .map((artist: any) => artist.id)
        .filter(Boolean)
    );

    const favoriteArtistNames = new Set(
      artists
        .map((artist: any) => artist.name?.toLowerCase?.())
        .filter(Boolean)
    );

    const map = new Map<string, any>();

    songs.forEach((song: any) => {
      const artistId = song.artistId;
      const artistName = song.artist || "Unknown Artist";
      const artistNameKey = artistName.toLowerCase();

      // Only keep artists that are explicitly still favorited.
      if (
        artistId &&
        favoriteArtistIds.size > 0 &&
        !favoriteArtistIds.has(artistId) &&
        !favoriteArtistNames.has(artistNameKey)
      ) {
        return;
      }

      if (
        !artistId &&
        favoriteArtistNames.size > 0 &&
        !favoriteArtistNames.has(artistNameKey)
      ) {
        return;
      }

      const matchedArtist = artists.find(
        (artist: any) =>
          artist.id === artistId ||
          artist.name?.toLowerCase?.() === artistNameKey
      );

      const key = artistId || matchedArtist?.id || artistNameKey;

      if (!map.has(key)) {
        map.set(key, {
          ...(matchedArtist || {}),
          id: artistId || matchedArtist?.id,
          name: artistName || matchedArtist?.name || "Unknown Artist",
          coverArt:
            matchedArtist?.coverArt ||
            matchedArtist?.artistImageUrl ||
            song.artistImageUrl ||
            song.coverArt ||
            song.albumId,
          count: 0,
        });
      }

      map.get(key).count += 1;
    });

    return Array.from(map.values())
      .filter((artist) => artist.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);
  }, [songs, artists]);

  const queue = songs.map(trackForPlayer);

  async function updateRating(songId: string, rating: number) {
    setRatings((prev) => ({ ...prev, [songId]: rating }));
    try {
      await rateItem(songId, rating);
    } catch (error) {
      console.error("Failed to update rating:", error);
      showToast({ title: "Failed to update rating", description: "Check your Navidrome connection and try again.", tone: "error" });
    }
  }

  if (loading) {
    return (
      <PageShell className="p-8">
        <div className="mb-14">
          <PageHeader title="Favorites" />
        </div>
        <div className="space-y-14">
          <ShelfSkeleton />
          <ShelfSkeleton />
          <TableSkeleton rows={7} columns={8} />
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell className="p-8">
      <div className="mb-14">
        <PageHeader
          title="Favorites"
          eyebrow={`${artists.length} artists · ${albums.length} albums · ${songs.length} songs`}
        />
      </div>

      {error ? (
        <ErrorState
          title={error}
          description="Check your Navidrome connection and try again."
          onRetry={loadFavorites}
        />
      ) : (
        <>
      {artists.length > 0 && (
        <RowScroller title="Artists">
          {artists.map((artist) => (
            <ArtistCard key={artist.id || artist.name} artist={artist} />
          ))}
        </RowScroller>
      )}

      {albums.length > 0 && (
        <RowScroller title="Albums">
          {albums.map((album) => (
            <AlbumCard key={album.id} album={album} />
          ))}
        </RowScroller>
      )}

      {topArtists.length > 0 && (
        <RowScroller title="Top Artists by Favorites">
          {topArtists.map((artist) => (
            <ArtistCard
              key={artist.id || artist.name}
              artist={artist}
              count={artist.count}
            />
          ))}
        </RowScroller>
      )}

      <section>
        <h2 className="mb-5 text-2xl font-bold">Songs</h2>

        <div className="mb-8 flex gap-3">
          <button
            onClick={() => {
              const first = queue[0];
              if (first) {
                setTrack(first, queue);
              } else {
                showToast({ title: "No favorite songs", description: "Favorite songs will appear here once you star them.", tone: "info" });
              }
            }}
            className="flex items-center gap-3 rounded-xl bg-[var(--app-accent-strong)] px-5 py-3 font-bold text-slate-950 hover:brightness-110"
          >
            <Play size={18} fill="currentColor" />
            Play all
          </button>

          <ToolbarButton
            onClick={() => {
              const first = queue[0];
              if (first) {
                setTrack(first, queue);
                showToast({ title: "Favorites queued", description: `${queue.length} songs ready to play.`, tone: "success" });
              } else {
                showToast({ title: "Nothing to queue", description: "No favorite songs were found.", tone: "info" });
              }
            }}
          >
            <ListPlus size={18} />
            Add all to queue
          </ToolbarButton>

          <ToolbarButton>
            <SlidersHorizontal size={18} />
            Filters
          </ToolbarButton>
        </div>

        {songs.length === 0 ? (
          <EmptyState title="No favorite songs found" />
        ) : (
          <div className="app-table-shell overflow-hidden rounded-2xl">
            <div className="app-label app-table-head grid grid-cols-[60px_1.5fr_1fr_1fr_1fr_130px_100px_120px] px-5 py-3">
              <div>#</div>
              <div>Title</div>
              <div>Artist</div>
              <div>Album</div>
              <div>Genre</div>
              <div>Rating</div>
              <div>Duration</div>
              <div>Format</div>
            </div>

            {songs.map((song: any, index: number) => {
              const normalized = normalizeTrack(song);
              const track = trackForPlayer(song);

              return (
                <div
                  key={`${song.id}-${index}`}
                  className="app-table-row grid min-h-14 grid-cols-[60px_1.5fr_1fr_1fr_1fr_130px_100px_120px] items-center px-5 py-2 text-sm"
                >
                  <button
                    type="button"
                    onClick={() => setTrack(track, queue)}
                    className="text-[var(--app-muted)] hover:text-[var(--app-accent)]"
                  >
                    {index + 1}
                  </button>

                  <button
                    type="button"
                    onClick={() => setTrack(track, queue)}
                    className="truncate text-left font-semibold text-[var(--foreground)] hover:text-[var(--app-accent)]"
                  >
                    {normalized.title}
                  </button>

                  <Link
                    href={song.artistId ? `/artists/${song.artistId}` : "#"}
                    className="truncate hover:text-[var(--app-accent)] hover:underline"
                  >
                    {normalized.artist}
                  </Link>

                  <Link
                    href={song.albumId ? `/albums/${song.albumId}` : "#"}
                    className="truncate hover:text-[var(--app-accent)] hover:underline"
                  >
                    {normalized.album}
                  </Link>

                  <div className="truncate text-[var(--app-muted)]">{normalized.genre || "-"}</div>

                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => updateRating(song.id, star)}
                        className="text-[var(--app-muted)] hover:text-yellow-300"
                      >
                        <Star
                          size={16}
                          fill="currentColor"
                          className={
                            ratings[song.id] >= star
                              ? "text-yellow-300"
                              : "text-[var(--app-muted)]"
                          }
                        />
                      </button>
                    ))}
                  </div>

                  <div className="text-[var(--app-muted)]">{formatDuration(normalized.duration)}</div>

                  <div className="flex items-center gap-3 text-[var(--app-muted)]">
                    <span>{normalized.suffix || "MP3"}</span>
                    <button
                      type="button"
                      onClick={() => toggleFavorite(song.id)}
                      className="hover:text-red-400"
                    >
                      <Heart
                        size={18}
                        fill="currentColor"
                        className={
                          favorites[song.id] ? "text-red-500" : "text-[var(--app-muted)]"
                        }
                      />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
        </>
      )}
    </PageShell>
  );
}
