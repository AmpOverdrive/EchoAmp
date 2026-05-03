"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  getAlbum,
  getAlbumInfo,
  getArtist,
  getArtistInfo,
  getAlbumPlaylists,
  getCoverArtUrl,
  getStreamUrl,
  rateItem,
} from "@/lib/navidrome";
import { usePlayerStore } from "@/lib/player-store";
import { useFavoritesStore } from "@/lib/favorites-store";
import {
  EmptyState,
  ErrorState,
  FavoriteButton,
  LoadingState,
  PageShell,
  RatingControl,
} from "@/components/ui/AppPrimitives";
import {
  Play,
  Shuffle,
  ListPlus,
  ArrowLeft,
} from "lucide-react";
import { formatDisplayValue } from "@/lib/text-utils";

function toArray(value: any) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function formatDuration(seconds: any) {
  if (!seconds) return "";
  const total = Number(seconds);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function formatAlbumDuration(seconds: any) {
  if (!seconds) return "";
  const total = Number(seconds);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatSize(bytes: any) {
  if (!bytes) return "";
  const mb = Number(bytes) / 1024 / 1024;
  return `${mb.toFixed(1)} MB`;
}

function yearNumber(value: any) {
  if (!value) return 0;
  if (typeof value === "object") return Number(value.year || 0);
  return Number(value || 0);
}

function cleanRichText(value: any) {
  if (typeof value !== "string") return "";

  return value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]*>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export default function AlbumPage() {
  const params = useParams();
  const id = params.id as string;

  const [album, setAlbum] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [albumRating, setAlbumRating] = useState(0);
  const [artistAlbums, setArtistAlbums] = useState<any[]>([]);
  const [includedPlaylists, setIncludedPlaylists] = useState<any[]>([]);
  const [albumInfo, setAlbumInfo] = useState<any>(null);

  const setTrack = usePlayerStore((s) => s.setTrack);
  const loadStarredFavorites = useFavoritesStore((s) => s.loadStarredFavorites);

  useEffect(() => {
    async function loadAlbum() {
      setLoading(true);
      setError("");
      try {
        const albumData = await getAlbum(id);
        setAlbum(albumData);
        setAlbumInfo(await getAlbumInfo(albumData?.id || id));
        setAlbumRating(Number(albumData?.userRating || albumData?.rating || 0));

        const songs = toArray(albumData?.song);
        const initialRatings: Record<string, number> = {};
        songs.forEach((song: any) => {
          initialRatings[song.id] = Number(song.userRating || song.rating || 0);
        });
        setRatings(initialRatings);

        if (albumData?.artistId) {
          const artistData = await getArtist(albumData.artistId);
          const albums = Array.isArray(artistData?.album)
            ? artistData.album
            : artistData?.album
            ? [artistData.album]
            : [];

          setArtistAlbums(
            albums
              .filter((item: any) => item.id !== albumData.id)
              .sort((a: any, b: any) => yearNumber(b.year) - yearNumber(a.year))
          );

          await getArtistInfo(albumData.artistId).catch(() => null);
        }

        if (albumData?.name) {
          const playlists = await getAlbumPlaylists(albumData.name, albumData.artist);
          setIncludedPlaylists(playlists.filter(Boolean));
        }

        await loadStarredFavorites();
      } catch (error) {
        console.error("Failed to load album:", error);
        setError("Unable to load album.");
      } finally {
        setLoading(false);
      }
    }

    loadAlbum();
  }, [id, loadStarredFavorites]);

  const songs = useMemo(() => toArray(album?.song), [album]);

  const queue = songs.map((song: any) => ({
    id: song.id,
    title: song.title,
    artist: song.artist || album?.artist,
    album: album?.name,
    coverArt: getCoverArtUrl(song.coverArt || album?.coverArt || album?.id),
    streamUrl: getStreamUrl(song.id),
    duration: Number(song.duration || 0),
    bitRate: song.bitRate,
    suffix: song.suffix,
    samplingRate: song.samplingRate,
    year: song.year || album?.year,
    genre: song.genre || album?.genre,
    albumId: song.albumId || album?.id,
    artistId: song.artistId || album?.artistId,
    playCount: song.playCount,
  }));

  async function updateRating(songId: string, rating: number) {
    setRatings((prev) => ({ ...prev, [songId]: rating }));

    try {
      await rateItem(songId, rating);
    } catch (error) {
      console.error("Failed to update rating:", error);
    }
  }

  async function updateAlbumRating(rating: number) {
    setAlbumRating(rating);

    try {
      await rateItem(album.id, rating);
    } catch (error) {
      console.error("Failed to update album rating:", error);
    }
  }

  if (loading) {
    return (
      <PageShell className="p-8">
        <LoadingState
          title="Loading album"
          description="Pulling album details, tracks, metadata, and artwork from Navidrome."
        />
      </PageShell>
    );
  }

  if (error) {
    return (
      <PageShell className="p-8">
        <ErrorState
          title={error}
          description="Check your Navidrome connection and try again."
          onRetry={() => window.location.reload()}
        />
      </PageShell>
    );
  }

  if (!album) {
    return (
      <PageShell className="p-8">
        <EmptyState
          title="Album not found"
          description="Navidrome did not return details for this album."
        />
      </PageShell>
    );
  }

  const cover = getCoverArtUrl(album.coverArt || album.id);
  const totalDuration = songs.reduce(
    (sum: number, song: any) => sum + Number(song.duration || 0),
    0
  );
  const totalSize = songs.reduce(
    (sum: number, song: any) => sum + Number(song.size || 0),
    0
  );
  const genre = songs.find((song: any) => song.genre)?.genre || album.genre || "";
  const albumDetails = cleanRichText(
    albumInfo?.notes ||
      albumInfo?.summary ||
      albumInfo?.biography ||
      album.description ||
      album.comment ||
      album.notes
  );
  const metadata = [
    ["Released", album.releaseDate || album.year],
    ["Genre", genre],
    ["Tracks", songs.length ? `${songs.length}` : ""],
    ["Duration", formatAlbumDuration(totalDuration)],
    ["Size", totalSize ? formatSize(totalSize) : ""],
    ["MusicBrainz", album.musicBrainzId || albumInfo?.musicBrainzId],
  ].filter((item) => item[1]);
  const albumName = formatDisplayValue(album.name, "Unknown Album");
  const albumArtist = formatDisplayValue(album.artist, "Unknown Artist");

  return (
    <div className="app-detail-page min-h-screen pb-32 text-slate-200 transition-colors">
      <section className="app-detail-hero relative overflow-hidden border-b border-white/[0.06] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="absolute inset-0">
          <img
            src={cover}
            alt=""
            aria-hidden="true"
            className="h-full w-full scale-110 object-cover opacity-20 blur-3xl"
          />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_48%,var(--app-accent-soft),transparent_34%),linear-gradient(90deg,var(--app-bg)_0%,color-mix(in_srgb,var(--app-bg)_86%,transparent)_50%,var(--app-bg)_100%)]" />
          <div className="absolute inset-0 bg-gradient-to-b from-white/[0.05] via-transparent to-black/20" />
        </div>

        <div className="relative z-10">
          <button
            type="button"
            onClick={() => window.history.back()}
            className="mb-6 flex items-center gap-2 text-sm font-semibold text-white/60 hover:text-white"
          >
            <ArrowLeft size={18} />
            Back
          </button>

        <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
          <img
            src={cover}
            alt={albumName}
            className="app-detail-artwork h-48 w-48 shrink-0 rounded-[1.35rem] border border-white/12 object-cover ring-1 ring-white/10 sm:h-60 sm:w-60 lg:h-64 lg:w-64"
          />

          <div className="min-w-0 pt-2">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="app-detail-title min-w-0">
                {albumName}
              </h1>
            </div>

            <Link
              href={album.artistId ? `/artists/${album.artistId}` : "#"}
              className="mt-3 block text-base font-semibold text-[var(--app-accent)] hover:underline"
            >
              {albumArtist}
            </Link>

            <div className="app-muted mt-2">
              {formatDisplayValue(album.year, "Unknown Year")} · {songs.length} Songs ·{" "}
              {formatAlbumDuration(totalDuration)}
              {totalSize ? ` · ${formatSize(totalSize)}` : ""}
            </div>

            <div className="mt-3 flex items-center gap-4 rounded-2xl border border-white/10 bg-black/10 px-3 py-2 backdrop-blur">
              <RatingControl
                label={albumName}
                value={albumRating}
                size={22}
                onRate={updateAlbumRating}
              />
              <FavoriteButton id={album.id} label={albumName} />
            </div>

            {metadata.length > 0 && (
              <div className="mt-5 flex max-w-5xl flex-wrap gap-2">
                {metadata.map(([label, value]) => (
                  <div
                    key={label}
                    className="app-chip"
                  >
                    <span className="text-[var(--app-muted)]">{label}: </span>
                    <span className="text-white/85">{formatDisplayValue(value)}</span>
                  </div>
                ))}
              </div>
            )}

            {albumDetails && (
              <p className="app-body mt-6 max-w-5xl whitespace-pre-line">
                {albumDetails}
              </p>
            )}
          </div>
        </div>
        </div>
      </section>

      <section className="flex flex-wrap items-center gap-3 px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
        <button
          onClick={() => {
            const first = queue[0];
            if (first) setTrack(first, queue);
          }}
          className="app-detail-action flex h-12 w-12 items-center justify-center rounded-full bg-[var(--app-accent-strong)] text-black transition hover:scale-105"
        >
          <Play size={24} fill="currentColor" className="ml-1" />
        </button>

        <button
          onClick={() => {
            const shuffled = [...queue].sort(() => Math.random() - 0.5);
            const first = shuffled[0];
            if (first) setTrack(first, shuffled);
          }}
          className="flex h-10 items-center gap-2 rounded-lg border border-[var(--app-border)] bg-[var(--app-panel)] px-4 text-sm font-semibold hover:bg-[var(--app-panel-strong)]"
        >
          <Shuffle size={18} />
          Shuffle
        </button>

        <button
          onClick={() => {
            const nextTrack = queue[1] || queue[0];
            if (nextTrack) setTrack(nextTrack, queue);
          }}
          className="flex h-10 items-center gap-2 rounded-lg border border-[var(--app-border)] bg-[var(--app-panel)] px-4 text-sm font-semibold hover:bg-[var(--app-panel-strong)]"
        >
          <ListPlus size={18} />
          Play Next
        </button>


      </section>

      <section className="overflow-x-auto px-4 sm:px-6 lg:px-8">
        <div className="app-table-shell min-w-[980px] overflow-hidden rounded-2xl">
        <div className="app-label app-table-head grid grid-cols-[50px_60px_1.4fr_1fr_90px_90px_130px_90px_100px] px-5 py-3">
          <div>#</div>
          <div />
          <div>Title</div>
          <div>Artist</div>
          <div>Time</div>
          <div>Plays</div>
          <div>Rating</div>
          <div>Favorite</div>
          <div>Genre</div>
        </div>

        {songs.map((song: any, index: number) => {
          const songTitle = formatDisplayValue(song.title, "Unknown Track");
          const songArtist = formatDisplayValue(song.artist || album.artist, "Unknown Artist");
          const songGenre = formatDisplayValue(song.genre || genre);
          const track = {
            id: song.id,
            title: songTitle,
            artist: songArtist,
            album: albumName,
            coverArt: getCoverArtUrl(song.coverArt || album.coverArt || album.id),
            streamUrl: getStreamUrl(song.id),
            duration: Number(song.duration || 0),
            bitRate: song.bitRate,
            suffix: song.suffix,
            samplingRate: song.samplingRate,
            year: formatDisplayValue(song.year || album.year),
            genre: songGenre,
            albumId: song.albumId || album.id,
            artistId: song.artistId || album.artistId,
            playCount: song.playCount,
          };

          return (
            <div
              key={song.id}
              onClick={() => setTrack(track, queue)}
              className="app-table-row grid min-h-14 cursor-pointer grid-cols-[50px_60px_1.4fr_1fr_90px_90px_130px_90px_100px] items-center px-5 py-2 text-sm"
            >
              <div className="text-[var(--app-muted)]">{index + 1}</div>

              <img
                src={track.coverArt}
                alt=""
                className="app-table-thumb h-10 w-10 object-cover"
              />

              <div className="min-w-0">
                <div className="truncate font-semibold text-white">
                  {songTitle}
                </div>

              </div>

              <Link
                href={album.artistId ? `/artists/${album.artistId}` : "#"}
                onClick={(e) => e.stopPropagation()}
                className="truncate text-[var(--app-accent)] hover:underline"
              >
                {songArtist}
              </Link>

              <div className="text-white/75">{formatDuration(song.duration)}</div>
              <div className="text-[var(--app-muted)]">{formatDisplayValue(song.playCount)}</div>

              <RatingControl
                label={songTitle}
                value={ratings[song.id]}
                size={16}
                onRate={(rating) => updateRating(song.id, rating)}
              />

              <FavoriteButton id={song.id} label={songTitle} size="sm" />

              <div className="truncate text-[var(--app-muted)]">
                {songGenre}
              </div>
            </div>
          );
        })}
        </div>
      </section>

      {artistAlbums.length > 0 && (
        <section className="px-4 pt-12 sm:px-6 lg:px-8">
          <h2 className="mb-5 text-2xl font-bold text-white">
            More from {albumArtist}
          </h2>

          <div className="app-detail-panel rounded-3xl p-4">
          <div className="flex gap-6 overflow-x-auto pb-2">
            {artistAlbums.map((item: any) => (
              <Link
                key={item.id}
                href={`/albums/${item.id}`}
                className="w-[220px] shrink-0"
              >
                <img
                  src={getCoverArtUrl(item.coverArt || item.id)}
                  alt={formatDisplayValue(item.name, "Unknown Album")}
                  className="aspect-square w-full rounded-lg object-cover"
                />
                <div className="mt-3 truncate text-sm font-semibold text-white">
                  {formatDisplayValue(item.name, "Unknown Album")}
                </div>
                <div className="truncate text-sm text-[var(--app-muted)]">
                  {formatDisplayValue(item.year)}
                </div>
              </Link>
            ))}
          </div>
          </div>
        </section>
      )}

      {includedPlaylists.length > 0 && (
        <section className="px-4 pt-12 sm:px-6 lg:px-8">
          <h2 className="mb-5 text-2xl font-bold text-white">Included In</h2>

          <div className="app-detail-panel rounded-3xl p-4">
          <div className="flex gap-6 overflow-x-auto pb-2">
            {includedPlaylists.map((playlist: any) => (
              <Link key={playlist.id} href={`/playlists/${playlist.id}`} className="w-[220px] shrink-0">
                <img
                  src={getCoverArtUrl(playlist.coverArt || playlist.id)}
                  alt={formatDisplayValue(playlist.name, "Playlist")}
                  className="aspect-square w-full rounded-lg object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
                <div className="mt-3 truncate text-sm font-semibold text-white">
                  {formatDisplayValue(playlist.name, "Playlist")}
                </div>
                <div className="truncate text-sm text-[var(--app-muted)]">
                  Playlist
                </div>
              </Link>
            ))}
          </div>
          </div>
        </section>
      )}

    </div>
  );
}
