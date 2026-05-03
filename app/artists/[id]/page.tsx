"use client";

import ExpandableArtistBio from "@/components/ExpandableArtistBio";
import type { UIEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  getArtist,
  getAlbum,
  getArtistInfo,
  getArtistPlaylists,
  getCoverArtUrl,
  getStreamUrl,
  getTopSongs,
  getSimilarSongs,
  rateItem,
} from "@/lib/navidrome";
import {
  Play,
  Radio,
  Clock3,
  Search,
  ListMusic,
  ArrowLeft,
  Shuffle,
  Share2,
  ExternalLink,
} from "lucide-react";
import { usePlayerStore } from "@/lib/player-store";
import { useFavoritesStore } from "@/lib/favorites-store";
import { useAppSettingsStore } from "@/lib/app-settings-store";
import {
  EmptyState,
  ErrorState,
  FavoriteButton,
  LoadingState,
  MediaCard,
  PageShell,
  RatingControl,
} from "@/components/ui/AppPrimitives";
import { formatDisplayValue } from "@/lib/text-utils";

const TOP_SONG_PAGE_SIZE = 100;
const TOP_SONG_REQUEST_COUNT = 1000;

function isStarred(value: any) {
  if (value === true) return true;
  if (value === false) return false;
  if (value === undefined || value === null) return false;

  const text = String(value).trim().toLowerCase();

  if (!text) return false;
  if (text === "false") return false;
  if (text === "0") return false;
  if (text === "null") return false;
  if (text === "undefined") return false;

  return true;
}

function toArray(value: any) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function normalizeAlbumName(name: string) {
  return name
    .toLowerCase()
    .replace(/\(.*?\)/g, "") // remove (Deluxe), (Remaster)
    .replace(/deluxe|remaster(ed)?|anniversary|expanded|edition|version/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function formatDuration(seconds: any) {
  if (!seconds) return "";
  const total = Number(seconds);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

function yearNumber(value: any) {
  if (!value) return 0;
  if (typeof value === "object") return Number(value.year || 0);
  return Number(value || 0);
}

function formatYear(value: any) {
  return formatDisplayValue(value);
}

export default function ArtistDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [artist, setArtist] = useState<any>(null);
  const [info, setInfo] = useState<any>(null);
  const [includedPlaylists, setIncludedPlaylists] = useState<any[]>([]);
  const [topSongs, setTopSongs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [songQuery, setSongQuery] = useState("");
  const [visibleTopSongCount, setVisibleTopSongCount] = useState(TOP_SONG_PAGE_SIZE);
  const [albumSort, setAlbumSort] = useState<"desc" | "asc">("asc");
  const [artistRating, setArtistRating] = useState(0);

  const setTrack = usePlayerStore((s) => s.setTrack);
  const loadStarredFavorites = useFavoritesStore((s) => s.loadStarredFavorites);
  const showSimilarArtistsSetting = useAppSettingsStore((s) => s.showSimilarArtists);
  const albumSortDefault = useAppSettingsStore((s) => s.albumSortDefault);
  const similarArtistsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setAlbumSort(albumSortDefault);
  }, [albumSortDefault, id]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");
      try {
        const artistData = await getArtist(id);
        setArtistRating(Number(artistData?.userRating || artistData?.rating || 0));

        const artistAlbums = artistData?.album
          ? Array.isArray(artistData.album)
            ? artistData.album
            : [artistData.album]
          : [];

        const fullAlbums = await Promise.all(
          artistAlbums.map(async (album: any) => {
            try {
              return await getAlbum(album.id);
            } catch {
              return album;
            }
          })
        );

        const fullArtistData = {
          ...artistData,
          album: fullAlbums.filter(Boolean),
        };

        setArtist(fullArtistData);
        await loadStarredFavorites();

        const infoData = await getArtistInfo(id);
        setInfo(infoData);

        if (artistData?.name) {
          const topSongData = await getTopSongs(artistData.name, TOP_SONG_REQUEST_COUNT);
          setTopSongs(topSongData.filter(Boolean));

          const playlistData = await getArtistPlaylists(artistData.name);
          setIncludedPlaylists(playlistData.filter(Boolean));
        }
      } catch (error) {
        console.error("Failed to load artist page:", error);
        setError("Unable to load artist.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [id]);

  const albums = toArray(artist?.album);

  const similarArtists = toArray(info?.similarArtist);

  function albumGroup(album: any) {
    const name = String(album?.name || album?.title || "").toLowerCase().trim();

    const rawTypes = [
      album?.albumType,
      album?.type,
      album?.releaseType,
      album?.releaseTypes,
      album?.musicBrainzReleaseGroupType,
      album?.musicBrainzReleaseGroupSecondaryType,
    ]
      .filter(Boolean)
      .join(";")
      .toLowerCase();

    const albumTypes = rawTypes
      .split(/[;,]/)
      .map((t: string) => t.trim())
      .filter(Boolean);

    const songCount =
      toArray(album?.song).length ||
      Number(album?.songCount || 0);

    // Metadata first
    if (albumTypes.some((t) => t.includes("live"))) return "Live Albums";
    if (albumTypes.some((t) => t.includes("compilation"))) return "Compilations";
    if (albumTypes.some((t) => t === "ep" || t.includes("ep"))) return "EPs";
    if (albumTypes.some((t) => t.includes("single"))) return "Singles";

    // Title fallbacks
    if (/greatest hits|best of|collection|anthology|essentials|retrospective|chronicles|telephantasm/.test(name)) {
      return "Compilations";
    }

    if (/live|unplugged|mtv unplugged|concert|bbc|kexp|tiny desk/.test(name)) {
      return "Live Albums";
    }

    if (/\bep\b|\be\.p\.\b|extended play/.test(name)) {
      return "EPs";
    }

    if (/\bsingle\b/.test(name)) {
      return "Singles";
    }

    if (songCount > 0 && songCount <= 3) return "Singles";
    if (songCount > 3 && songCount <= 6) return "EPs";

    return "Studio Albums";
  }

  const groupedAlbums = useMemo(() => {
    const groups: Record<string, any[]> = {
      "Studio Albums": [],
      "Live Albums": [],
      "EPs": [],
      "Singles": [],
      "Compilations": [],
    };

    // STEP 1: group albums by normalized name
    const albumMap: Record<string, any[]> = {};

    albums.forEach((album: any) => {
      const baseName = normalizeAlbumName(album.name || album.title || "");
      if (!albumMap[baseName]) albumMap[baseName] = [];
      albumMap[baseName].push(album);
    });

    // STEP 2: pick primary + attach versions
    Object.values(albumMap).forEach((versions: any[]) => {
      const sorted = versions.sort((a, b) => yearNumber(b.year) - yearNumber(a.year));

      const primary = sorted[0];
      primary.versions = sorted.slice(1);

      const group = albumGroup(primary);
      groups[group].push(primary);
    });

    // STEP 3: sort groups
    Object.values(groups).forEach((items) => {
      items.sort((a: any, b: any) => {
        const ay = yearNumber(a.year);
        const by = yearNumber(b.year);
        return albumSort === "asc" ? ay - by : by - ay;
      });
    });

    return groups;
  }, [albums, albumSort]);

  const allSongs = useMemo(() => {
    return albums.flatMap((album: any) => {
      const songs = toArray(album.song);
      return songs.map((song: any) => ({
        ...song,
        album: song.album || album.name,
        albumId: song.albumId || album.id,
        coverArt: song.coverArt || album.coverArt,
        year: song.year || album.year,
      }));
    });
  }, [albums, albumSort]);

  const displayTopSongs = topSongs.length > 0 ? topSongs : allSongs;

  const filteredSongs = displayTopSongs.filter((song: any) =>
    song.title?.toLowerCase?.().includes(songQuery.toLowerCase())
  );
  const visibleTopSongs = filteredSongs.slice(0, visibleTopSongCount);
  const hasMoreTopSongs = visibleTopSongCount < filteredSongs.length;

  const queue = displayTopSongs.map((song: any) => ({
    id: song.id,
    title: song.title,
    artist: song.artist || artist?.name,
    album: song.album,
    coverArt: getCoverArtUrl(song.coverArt || song.albumId),
    streamUrl: getStreamUrl(song.id),
    starred: isStarred(song.starred),
  }));

  useEffect(() => {
    setVisibleTopSongCount(TOP_SONG_PAGE_SIZE);
  }, [id, songQuery]);

  function handleTopSongsScroll(event: UIEvent<HTMLDivElement>) {
    const target = event.currentTarget;
    const remaining = target.scrollHeight - target.scrollTop - target.clientHeight;

    if (remaining < 96 && hasMoreTopSongs) {
      setVisibleTopSongCount((count) =>
        Math.min(count + TOP_SONG_PAGE_SIZE, filteredSongs.length)
      );
    }
  }

  function handleTopSongsWheel(event: UIEvent<HTMLDivElement>) {
    const target = event.currentTarget;
    const wheelEvent = event.nativeEvent as WheelEvent;
    const scrollingDown = wheelEvent.deltaY > 0;
    const scrollingUp = wheelEvent.deltaY < 0;
    const atBottom = target.scrollTop + target.clientHeight >= target.scrollHeight - 4;
    const atTop = target.scrollTop <= 0;

    if ((scrollingDown && atBottom) || (scrollingUp && atTop)) {
      window.scrollBy({ top: wheelEvent.deltaY, behavior: "auto" });
    }
  }

  function playAll() {
    const first = queue[0];
    if (first) setTrack(first, queue);
  }

  function shuffleAll() {
    const shuffled = [...queue].sort(() => Math.random() - 0.5);
    const first = shuffled[0];
    if (first) setTrack(first, shuffled);
  }

  async function startArtistRadio() {
    const seeds = queue.slice(0, 5);

    if (!seeds.length) return;

    try {
      const similarResults = await Promise.all(
        seeds.map((song: any) => getSimilarSongs(song.id, 25))
      );

      const similarQueue = similarResults
        .flat()
        .filter(Boolean)
        .map((song: any) => ({
          id: song.id,
          title: song.title,
          artist: song.artist || artist?.name,
          album: song.album,
          coverArt: getCoverArtUrl(song.coverArt || song.albumId),
          streamUrl: getStreamUrl(song.id),
          starred: isStarred(song.starred),
        }));

      const combined = [...queue, ...similarQueue];
      const unique = Array.from(
        new Map(combined.map((song: any) => [song.id, song])).values()
      );

      const shuffled = unique.sort(() => Math.random() - 0.5);
      const first = shuffled[0];

      if (first) setTrack(first, shuffled);
    } catch (error) {
      console.error("Artist radio failed:", error);

      const fallback = [...queue].sort(() => Math.random() - 0.5);
      const first = fallback[0];

      if (first) setTrack(first, fallback);
    }
  }

  async function shareArtist() {
    const url = window.location.href;

    if (navigator.share) {
      await navigator.share({
        title: artist?.name || "Artist",
        url,
      });
      return;
    }

    await navigator.clipboard.writeText(url);
    alert("Artist link copied to clipboard.");
  }

  function openLastFm() {
    window.open(
      `https://www.last.fm/music/${encodeURIComponent(artist?.name || "")}`,
      "_blank",
      "noopener,noreferrer"
    );
  }

  function openWikipedia() {
    window.open(
      `https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(
        artist?.name || ""
      )}`,
      "_blank",
      "noopener,noreferrer"
    );
  }

  function scrollSimilarArtists(direction: "left" | "right") {
    similarArtistsRef.current?.scrollBy({
      left: direction === "right" ? 800 : -800,
      behavior: "smooth",
    });
  }

  async function updateArtistRating(rating: number) {
    setArtistRating(rating);

    try {
      await rateItem(artist.id, rating);
    } catch (error) {
      console.error("Failed to update artist rating:", error);
    }
  }

  if (loading) {
    return (
      <PageShell className="p-8">
        <LoadingState
          title="Loading artist"
          description="Pulling artist details, albums, top songs, and artwork from Navidrome."
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

  if (!artist) {
    return (
      <PageShell className="p-8">
        <EmptyState
          title="Artist not found"
          description="Navidrome did not return details for this artist."
        />
      </PageShell>
    );
  }

  const artistImage =
    info?.largeImageUrl ||
    info?.mediumImageUrl ||
    info?.smallImageUrl ||
    artist?.artistImageUrl ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(
      artist.name || "Artist"
    )}&background=111827&color=ffffff&size=500`;

  return (
    <div className="app-detail-page min-h-screen pb-32 text-white transition-colors">
      <section className="app-detail-hero relative overflow-hidden border-b border-white/[0.06] px-4 pb-7 pt-5 sm:px-6 lg:px-8 lg:pb-8 lg:pt-6">
        <div className="absolute inset-0">
          <img
            src={artistImage}
            alt=""
            aria-hidden="true"
            className="h-full w-full scale-110 object-cover opacity-18 blur-3xl"
          />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_14%_42%,var(--app-accent-soft),transparent_30%),linear-gradient(90deg,var(--app-bg)_0%,color-mix(in_srgb,var(--app-bg)_84%,transparent)_48%,var(--app-bg)_100%)]" />
          <div className="absolute inset-0 bg-gradient-to-b from-white/[0.05] via-transparent to-black/18" />
        </div>

        <div className="relative z-10">
          <button
            type="button"
            onClick={() => window.history.back()}
            className="mb-7 flex items-center gap-2 text-sm font-semibold text-white/60 hover:text-white lg:mb-8"
          >
            <ArrowLeft size={18} />
            Back
          </button>

          <div className="flex flex-col gap-7 lg:flex-row lg:items-start lg:gap-8">
            <div className="group relative shrink-0">
              <div className="absolute inset-[-5px] rounded-full bg-[var(--app-accent)]/16 blur-2xl" />
              <img
                src={artistImage}
                alt={artist.name}
                className="app-detail-artwork relative h-64 w-64 rounded-full border border-white/15 object-cover ring-1 ring-white/10"
              />
            </div>

            <div className="min-w-0 lg:pt-2">
              <h1 className="max-w-5xl text-[clamp(2.75rem,2rem+2.4vw,3.45rem)] font-[850] leading-[0.96] tracking-normal text-[var(--foreground)]">
                {artist.name}
              </h1>

              <div className="mt-4 text-base font-semibold text-[var(--app-muted)]">
                {artist.albumCount || albums.length} Albums
              </div>

              <div className="mt-5 flex w-fit flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-black/10 px-3 py-2 backdrop-blur">
                <span className="app-label">Artist Rating</span>
                <RatingControl
                  label={artist.name}
                  value={artistRating}
                  onRate={updateArtistRating}
                  className="normal-case tracking-normal"
                />
                <FavoriteButton id={artist.id} label={artist.name} />
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  onClick={openLastFm}
                  className="h-8 rounded-full border border-[var(--app-border)] bg-[var(--app-panel)] px-3 text-xs font-semibold text-[var(--app-muted)] hover:bg-[var(--app-panel-strong)] hover:text-[var(--foreground)]"
                >
                  Last.fm
                </button>

                <button
                  onClick={openWikipedia}
                  className="flex h-8 items-center gap-1.5 rounded-full border border-[var(--app-border)] bg-[var(--app-panel)] px-3 text-xs font-semibold text-[var(--app-muted)] hover:bg-[var(--app-panel-strong)] hover:text-[var(--foreground)]"
                >
                  <ExternalLink size={14} />
                  Wikipedia
                </button>
              </div>

              <div className="mt-6 flex flex-wrap gap-2">
                <button
                  onClick={playAll}
                  className="app-detail-action flex h-10 items-center gap-2 rounded-lg bg-[var(--app-accent-strong)] px-4 text-sm font-bold text-black hover:opacity-90"
                >
                  <Play size={16} />
                  Play All
                </button>

                <button
                  onClick={shuffleAll}
                  className="flex h-10 items-center gap-2 rounded-lg border border-[var(--app-border)] bg-[var(--app-panel)] px-4 text-sm font-semibold text-[var(--app-muted)] hover:bg-[var(--app-panel-strong)] hover:text-[var(--foreground)]"
                >
                  <Shuffle size={16} />
                  Shuffle
                </button>

                <button
                  onClick={startArtistRadio}
                  className="flex h-10 items-center gap-2 rounded-lg border border-[var(--app-border)] bg-[var(--app-panel)] px-4 text-sm font-semibold text-[var(--app-muted)] hover:bg-[var(--app-panel-strong)] hover:text-[var(--foreground)]"
                >
                  <Radio size={16} />
                  Radio
                </button>

                <button
                  onClick={shareArtist}
                  className="flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--app-border)] bg-[var(--app-panel)] text-[var(--app-muted)] hover:bg-[var(--app-panel-strong)] hover:text-[var(--foreground)]"
                >
                  <Share2 size={16} />
                </button>

              </div>
            </div>
          </div>
        </div>
      </section>

      {info?.biography && (
        <ExpandableArtistBio
          text={info.biography}
          image={artistImage}
          artistName={artist.name}
          maxLength={650}
        />
      )}

      <section className="px-4 sm:px-6 lg:px-8">
        <section className="mt-12">
          <h2 className="app-section-title mb-5">Top songs</h2>

          <div className="mb-5 flex h-10 w-full items-center rounded-lg border border-[var(--app-border)] bg-[var(--app-shell)] px-3.5">
            <Search size={17} className="mr-3 text-[var(--app-muted)]" />
            <input
              value={songQuery}
              onChange={(e) => setSongQuery(e.target.value)}
              placeholder="Search"
              className="w-full bg-transparent text-sm outline-none placeholder:text-neutral-500"
            />
          </div>

          <div
            onScroll={handleTopSongsScroll}
            onWheel={handleTopSongsWheel}
            className="app-detail-panel max-h-[360px] w-full overflow-y-auto rounded-2xl"
          >
            <div className="app-label app-table-head sticky top-0 z-10 grid grid-cols-[50px_minmax(260px,1.5fr)_80px_minmax(220px,1fr)_160px_60px] px-4 py-3">
              <div>#</div>
              <div>Title</div>
              <div><Clock3 size={15} /></div>
              <div>Album</div>
              <div>Release Date</div>
              <div>♡</div>
            </div>

            {visibleTopSongs.map((song: any, index: number) => {
              const track = {
                id: song.id,
                title: formatDisplayValue(song.title, "Unknown Track"),
                artist: formatDisplayValue(song.artist || artist.name, "Unknown Artist"),
                album: formatDisplayValue(song.album),
                coverArt: getCoverArtUrl(song.coverArt || song.albumId),
                streamUrl: getStreamUrl(song.id),
                albumId: song.albumId,
                artistId: song.artistId || artist.id,
                starred: isStarred(song.starred),
              };

              return (
                <div
                  key={song.id}
                  onClick={(e) => {
                    if ((e.target as HTMLElement).closest("button")) return;
                    setTrack(track, queue);
                  }}
                  className="app-table-row grid min-h-14 w-full cursor-pointer grid-cols-[50px_minmax(260px,1.5fr)_80px_minmax(220px,1fr)_160px_60px] items-center px-4 py-2 text-left text-sm"
                >
                  <div>{index + 1}</div>

                  <div className="flex min-w-0 items-center gap-3">
                    <img
                      src={getCoverArtUrl(song.coverArt || song.albumId)}
                      className="app-table-thumb h-10 w-10 object-cover"
                    />
                    <div className="min-w-0">
                      <div className="truncate text-white">{formatDisplayValue(song.title, "Unknown Track")}</div>
                      <div className="truncate text-[var(--app-muted)]">
                        {song.artistId ? (
                          <Link
                            href={`/artists/${song.artistId}`}
                            onClick={(event) => event.stopPropagation()}
                            className="hover:text-[var(--app-accent)] hover:underline"
                          >
                            {formatDisplayValue(song.artist || artist.name, "Unknown Artist")}
                          </Link>
                        ) : (
                          formatDisplayValue(song.artist || artist.name, "Unknown Artist")
                        )}
                      </div>
                    </div>
                  </div>

                  <div>{formatDuration(song.duration)}</div>
                  <div className="truncate">
                    {song.albumId ? (
                      <Link
                        href={`/albums/${song.albumId}`}
                        onClick={(event) => event.stopPropagation()}
                        className="hover:text-[var(--app-accent)] hover:underline"
                      >
                        {formatDisplayValue(song.album)}
                      </Link>
                    ) : (
                      formatDisplayValue(song.album)
                    )}
                  </div>
                  <div>{formatYear(song.year)}</div>
                  <FavoriteButton id={song.id} label={formatDisplayValue(song.title, "Unknown Track")} size="sm" />
                </div>
              );
            })}

            {hasMoreTopSongs && (
              <div className="px-4 py-4 text-center text-sm font-semibold text-[var(--app-muted)]">
                Scroll for more songs
              </div>
            )}
          </div>
        </section>

        {albums.length > 0 && (
          <section className="mt-12 space-y-12">
            {Object.entries(groupedAlbums).map(([groupName, groupAlbums]) =>
              groupAlbums.length > 0 ? (
                <div key={groupName}>
                  <div className="mb-6 flex items-center gap-4">
                    <h2 className="app-section-title">{groupName}</h2>
                    <span className="rounded-md border border-white/20 px-2 py-0.5 text-xs text-neutral-300">
                      {groupAlbums.length}
                    </span>
                    <div className="h-px flex-1 bg-[var(--app-border)]" />

                    <select
                      value={albumSort}
                      onChange={(e) => setAlbumSort(e.target.value as "asc" | "desc")}
                      className="rounded-xl border border-[var(--app-border)] bg-[var(--app-shell)] px-3 py-2 text-sm text-white outline-none"
                    >
                      <option value="asc">Oldest first</option>
                      <option value="desc">Newest first</option>
                    </select>
                  </div>

                  <div className="app-detail-panel rounded-3xl p-4">
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-7">
                    {groupAlbums.map((album: any) => (
                      <MediaCard
                        key={album.id}
                        href={`/albums/${album.id}`}
                        subtitleHref={album.artistId ? `/artists/${album.artistId}` : undefined}
                        image={getCoverArtUrl(album.coverArt || album.id)}
                        title={formatDisplayValue(album.name, "Unknown Album")}
                        subtitle={formatDisplayValue(album.artist, "Unknown Artist")}
                        meta={formatYear(album.year)}
                        initialRating={Number(album.userRating || album.rating || 0)}
                      />
                    ))}
                  </div>
                  </div>
                </div>
              ) : null
            )}
          </section>
        )}

        {showSimilarArtistsSetting && similarArtists.length > 0 && (
          <section className="mt-14">
            <div className="mb-6 flex items-center gap-4">
              <h2 className="text-2xl font-bold">Related artists</h2>
              <span className="rounded-md border border-white/20 px-2 py-0.5 text-xs text-neutral-300 aspect-square">
                {similarArtists.length}
              </span>
              <div className="h-px flex-1 bg-[var(--app-border)]" />

              <button
                onClick={() => scrollSimilarArtists("left")}
                className="rounded-2xl bg-white/10 px-3 py-2 text-neutral-300 hover:bg-white/20 hover:text-white aspect-square"
              >
                ←
              </button>

              <button
                onClick={() => scrollSimilarArtists("right")}
                className="rounded-2xl bg-white/10 px-3 py-2 text-neutral-300 hover:bg-white/20 hover:text-white aspect-square"
              >
                →
              </button>
            </div>

            <div
              ref={similarArtistsRef}
              className="app-detail-panel flex scroll-smooth gap-5 overflow-x-auto rounded-3xl p-4"
            >
              {similarArtists.map((similar: any, index: number) => {
                const image =
                  similar.largeImageUrl ||
                  similar.mediumImageUrl ||
                  similar.smallImageUrl ||
                  similar.artistImageUrl ||
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(
                    formatDisplayValue(similar.name, "Artist")
                  )}&background=111827&color=ffffff&size=400`;

                return (
                  <div
                    key={`${similar.id || similar.name || "similar"}-${index}`}
                    className="w-[220px] shrink-0"
                  >
                    <MediaCard
                      href={similar.id && similar.id !== "-1" ? `/artists/${similar.id}` : `/artists?search=${encodeURIComponent(formatDisplayValue(similar.name || ""))}`}
                      itemId={similar.id && similar.id !== "-1" ? similar.id : undefined}
                      itemType={similar.id && similar.id !== "-1" ? "artist" : undefined}
                      image={image}
                      title={formatDisplayValue(similar.name, "Artist")}
                      initialRating={Number(similar.userRating || similar.rating || 0)}
                    />
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {includedPlaylists.length > 0 && (
          <section className="mt-14">
            <h2 className="app-section-title mb-6">Included In</h2>
            <div className="app-detail-panel flex gap-10 overflow-x-auto rounded-3xl p-4">
              {includedPlaylists.map((playlist) => (
                <Link
                  href={`/playlists/${playlist.id}`}
                  key={playlist.id}
                  className="w-[220px] shrink-0"
                >
                  <div className="relative aspect-square overflow-hidden rounded-xl bg-[var(--app-shell)]">
                    <img
                      src={getCoverArtUrl(playlist.coverArt || playlist.id)}
                      alt={formatDisplayValue(playlist.name, "Playlist")}
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                    <div className="absolute inset-0 -z-10 flex items-center justify-center">
                      <ListMusic size={54} className="text-slate-300" />
                    </div>
                  </div>
                  <div className="mt-3 truncate text-sm font-semibold text-white">
                    {formatDisplayValue(playlist.name, "Playlist")}
                  </div>
                  <div className="truncate text-sm text-neutral-400">
                    Playlist
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </section>
    </div>
  );
}
