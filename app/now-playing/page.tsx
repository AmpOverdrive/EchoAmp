"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  CalendarDays,
  Disc3,
  ExternalLink,
  Heart,
  MapPin,
  Play,
  TrendingUp,
  Users,
} from "lucide-react";
import { usePlayerStore } from "@/lib/player-store";
import {
  getAlbum,
  getSong,
  getAlbumsByArtistName,
  getArtistInfo,
  getCoverArtUrl,
  getStreamUrl,
  getTopSongs,
  rateItem,
} from "@/lib/navidrome";
import { useFavoritesStore } from "@/lib/favorites-store";
import { RatingControl } from "@/components/ui/AppPrimitives";
import {
  getArtistStats,
  getSimilarArtists,
  getTrackStats,
} from "@/lib/lastfm";
import { useAppSettingsStore } from "@/lib/app-settings-store";
import { formatDisplayValue } from "@/lib/text-utils";

function toArray(value: any) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function formatDuration(seconds: any) {
  if (!seconds) return "";
  const total = Number(seconds);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

function cleanArtistName(name = "") {
  return name
    .replace(/\(.*?\)/g, "")
    .replace(/\[.*?\]/g, "")
    .replace(/\s+feat\.?.*/i, "")
    .replace(/\s+ft\.?.*/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function decodeHtml(text = "") {
  return text
    .replace(/&#34;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function cleanFormat(value: any) {
  const match = String(value || "").match(/[a-zA-Z]+/);
  return match ? match[0].toUpperCase() : "";
}

export default function NowPlayingPage() {
  const currentTrack = usePlayerStore((s: any) => s.currentTrack);
  const setTrack = usePlayerStore((s: any) => s.setTrack);
  const updateTrackMetadata = usePlayerStore((s: any) => s.updateTrackMetadata);
  const loadStarredFavorites = useFavoritesStore((s) => s.loadStarredFavorites);
  const favorites = useFavoritesStore((s) => s.favorites);
  const toggleFavorite = useFavoritesStore((s) => s.toggleFavorite);
  const coverArtBackground = useAppSettingsStore((s) => s.coverArtBackground);
  const showAudioQualityBadges = useAppSettingsStore((s) => s.showAudioQualityBadges);
  const showSimilarArtists = useAppSettingsStore((s) => s.showSimilarArtists);
  const showTourDates = useAppSettingsStore((s) => s.showTourDates);

  const [resolvedTrack, setResolvedTrack] = useState<any>(null);
  const [album, setAlbum] = useState<any>(null);
  const [artistInfo, setArtistInfo] = useState<any>(null);
  const [artistAlbums, setArtistAlbums] = useState<any[]>([]);
  const [topSongs, setTopSongs] = useState<any[]>([]);
  const [tourEvents, setTourEvents] = useState<any[]>([]);
  const [lastfmStats, setLastfmStats] = useState<any>(null);
  const [lastfmTrackStats, setLastfmTrackStats] = useState<any>(null);
  const [similarArtists, setSimilarArtists] = useState<any[]>([]);
  const [rating, setRating] = useState(0);
  const [showFullBio, setShowFullBio] = useState(false);
  const [showAllAlbumTracks, setShowAllAlbumTracks] = useState(false);

  const albumSongs = useMemo(() => toArray(album?.song), [album]);

  useEffect(() => {
    if (!currentTrack?.id) return;

    const nextRating = Number(
      currentTrack.userRating || currentTrack.rating || 0
    );

    setRating(nextRating);

    setResolvedTrack((previous: any) => {
      if (!previous || previous.id !== currentTrack.id) return previous;

      return {
        ...previous,
        userRating: nextRating,
        rating: nextRating,
      };
    });
  }, [currentTrack?.id, currentTrack?.userRating, currentTrack?.rating]);

  useEffect(() => {
    async function load() {
      if (!currentTrack) return;

      setResolvedTrack(null);
      setAlbum(null);
      setArtistInfo(null);
      setArtistAlbums([]);
      setTopSongs([]);
      setTourEvents([]);
      setLastfmStats(null);
      setLastfmTrackStats(null);
      setSimilarArtists([]);
      setShowFullBio(false);
      setShowAllAlbumTracks(false);
      setRating(Number(currentTrack.userRating || currentTrack.rating || 0));

      try {
        const songData = currentTrack.id ? await getSong(currentTrack.id) : null;
        const mergedTrack = { ...currentTrack, ...(songData || {}) };

        const syncedRating = Number(mergedTrack.userRating || mergedTrack.rating || 0);
        setRating(syncedRating);

        if (mergedTrack.id && updateTrackMetadata) {
          updateTrackMetadata(mergedTrack.id, {
            userRating: syncedRating,
            rating: syncedRating,
          });
        }

        const artistName = cleanArtistName(mergedTrack.artist || currentTrack.artist || "");
        const realAlbumId = mergedTrack.albumId || currentTrack.albumId;
        const realArtistId = mergedTrack.artistId || currentTrack.artistId;

        const [
          albumData,
          infoData,
          topData,
          discographyData,
          _favoritesLoaded,
          statsData,
          trackStatsData,
          similarData,
          toursData,
        ] = await Promise.all([
          realAlbumId ? getAlbum(realAlbumId) : Promise.resolve(null),
          realArtistId ? getArtistInfo(realArtistId) : Promise.resolve(null),
          artistName ? getTopSongs(artistName, 20) : Promise.resolve([]),
          artistName ? getAlbumsByArtistName(artistName) : Promise.resolve([]),
          loadStarredFavorites().then(() => null),
          artistName ? getArtistStats(artistName) : Promise.resolve(null),
          artistName ? getTrackStats(artistName, mergedTrack.title || currentTrack.title) : Promise.resolve(null),
          artistName && showSimilarArtists ? getSimilarArtists(artistName) : Promise.resolve([]),
          artistName && showTourDates
            ? fetch(`/api/tours?artist=${encodeURIComponent(artistName)}`).then((r) => r.json())
            : Promise.resolve([]),
        ]);

        setResolvedTrack(mergedTrack);
        setAlbum(albumData);
        setArtistInfo(infoData);
        setArtistAlbums(
          discographyData.filter((album: any) => {
            const target = artistName.toLowerCase();
            const albumArtist = String(
              album.artist ||
              album.albumArtist ||
              album.artistName ||
              ""
            ).toLowerCase();

            return albumArtist === target;
          })
        );
        setTopSongs(
          topData
            .filter(Boolean)
            .sort((a: any, b: any) => Number(b.playCount || 0) - Number(a.playCount || 0))
        );
        setLastfmStats(statsData);
        setLastfmTrackStats(trackStatsData);
        setSimilarArtists(similarData || []);
        setTourEvents(Array.isArray(toursData) ? toursData : []);
      } catch (error) {
        console.error("Now Playing load failed:", error);
      }
    }

    load();
  }, [currentTrack?.id, loadStarredFavorites, showSimilarArtists, showTourDates]);

  if (!currentTrack) {
    return (
      <main className="app-detail-page min-h-screen p-6 text-white">
        <div className="app-detail-panel rounded-3xl p-8 text-center">
          Nothing playing.
        </div>
      </main>
    );
  }

  const track = resolvedTrack || currentTrack;

  const cover = track.coverArt?.startsWith("http")
    ? track.coverArt
    : getCoverArtUrl(track.coverArt || track.albumId || currentTrack.albumId);

  const possibleArtistImage =
    lastfmStats?.image ||
    artistInfo?.largeImageUrl ||
    artistInfo?.mediumImageUrl ||
    artistInfo?.smallImageUrl ||
    "";

  const artistImage =
    possibleArtistImage && !possibleArtistImage.includes("2a96cbd8b46e442fc41c2b86b821562f")
      ? possibleArtistImage
      : cover;

  const playCount = Number(track.playCount || currentTrack.playCount || 0);
  const bio = decodeHtml(artistInfo?.biography || lastfmStats?.bio || "");
  const shortBio = bio.length > 260 ? bio.slice(0, 260).trim() + "..." : bio;
  const visibleAlbumSongs = showAllAlbumTracks ? albumSongs : albumSongs.slice(0, 10);
  const currentTrackIndex = albumSongs.findIndex((s: any) => s.id === track.id) + 1;
  const fileFormat = cleanFormat(track.suffix || currentTrack.suffix);

  async function setSongRating(value: number) {
    const id = track.id || currentTrack.id;

    setRating(value);
    updateTrackMetadata(id, { userRating: value, rating: value });
    setResolvedTrack((previous: any) => ({
      ...(previous || track || currentTrack),
      userRating: value,
      rating: value,
    }));

    try {
      await rateItem(id, value);

      const refreshed = await getSong(id);
      if (refreshed) {
        setResolvedTrack((previous: any) => ({
          ...(previous || track || currentTrack),
          ...refreshed,
        }));
        setRating(Number(refreshed.userRating || refreshed.rating || value));
        updateTrackMetadata(id, {
          userRating: Number(refreshed.userRating || refreshed.rating || value),
          rating: Number(refreshed.userRating || refreshed.rating || value),
        });
      }
    } catch (error) {
      console.error("Rating failed:", error);
    }
  }

  function playSong(song: any, queue: any[]) {
    const mappedQueue = queue.map((s: any) => ({
      id: s.id,
      title: s.title,
      artist: s.artist || track.artist || currentTrack.artist,
      album: s.album || track.album || currentTrack.album,
      albumId: s.albumId || track.albumId || currentTrack.albumId,
      artistId: s.artistId || track.artistId || currentTrack.artistId,
      coverArt: getCoverArtUrl(s.coverArt || s.albumId || track.albumId || currentTrack.albumId),
      streamUrl: getStreamUrl(s.id),
      duration: s.duration,
      playCount: s.playCount,
      played: s.played,
      year: s.year,
      bitRate: s.bitRate,
      suffix: s.suffix,
      samplingRate: s.samplingRate,
      rating: s.rating,
      userRating: s.userRating,
    }));

    const selected = mappedQueue.find((s: any) => s.id === song.id) || mappedQueue[0];
    if (selected) setTrack(selected, mappedQueue);
  }

  return (
    <main className="app-detail-page relative min-h-screen pb-28 text-[var(--foreground)]">
      {coverArtBackground && (
        <>
          <img
            src={cover}
            alt=""
            className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[360px] w-full object-cover opacity-10 blur-3xl"
          />
          <div className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[420px] bg-gradient-to-b from-transparent to-[var(--app-bg)]" />
        </>
      )}
      <section className="relative z-10 px-5 pt-5">
        <div className="app-detail-panel relative overflow-hidden rounded-3xl p-5">
          <div className="grid gap-4 md:grid-cols-[180px_1fr]">
            <img
              src={cover}
              alt={track.title || currentTrack.title}
              className="app-detail-artwork aspect-square w-full max-w-[180px] rounded-2xl object-cover"
            />

            <div className="min-w-0">
              <h1 className="app-detail-title text-[var(--app-accent)]">
                {track.title || currentTrack.title}
              </h1>

              <div className="app-muted mt-2">
                {(track.artistId || currentTrack.artistId) ? (
                  <Link
                    href={`/artists/${track.artistId || currentTrack.artistId}`}
                    className="font-semibold hover:text-[var(--app-accent)] hover:underline"
                  >
                    {track.artist || currentTrack.artist}
                  </Link>
                ) : (
                  track.artist || currentTrack.artist
                )}
                <span className="mx-2 text-white/30">•</span>
                {(album?.id || track.albumId || currentTrack.albumId) ? (
                  <Link
                    href={`/albums/${album?.id || track.albumId || currentTrack.albumId}`}
                    className="font-semibold hover:text-[var(--app-accent)] hover:underline"
                  >
                    {album?.name || track.album || currentTrack.album}
                  </Link>
                ) : (
                  album?.name || track.album || currentTrack.album
                )}
                {(album?.year || track.year || currentTrack.year) && (
                  <>
                    <span className="mx-2 text-white/30">•</span>
                    {formatDisplayValue(album?.year || track.year || currentTrack.year)}
                  </>
                )}
              </div>

              {showAudioQualityBadges && (
              <div className="mt-3 flex flex-wrap gap-2">
                {fileFormat && <Pill>{fileFormat}</Pill>}
                {(track.bitRate || currentTrack.bitRate) && <Pill>{track.bitRate || currentTrack.bitRate} kbps</Pill>}
                {(track.samplingRate || currentTrack.samplingRate) && (
                  <Pill>{Math.round(Number(track.samplingRate || currentTrack.samplingRate) / 100) / 10} kHz</Pill>
                )}
                {(track.duration || currentTrack.duration) && <Pill>{formatDuration(track.duration || currentTrack.duration)}</Pill>}
              </div>
              )}

              <div className="mt-4 flex w-fit items-center gap-3 rounded-2xl border border-white/10 bg-black/10 px-3 py-2 backdrop-blur">
                <button
                  type="button"
                  onClick={() => {
                    const id = track.id || currentTrack.id;
                    if (id) toggleFavorite(id);
                  }}
                  className="grid h-9 w-9 place-items-center rounded-xl bg-white/10 text-white transition hover:bg-white/15"
                  aria-label={favorites[track.id || currentTrack.id] ? "Remove from favorites" : "Add to favorites"}
                >
                  <Heart
                    size={18}
                    fill={favorites[track.id || currentTrack.id] ? "currentColor" : "none"}
                    className={favorites[track.id || currentTrack.id] ? "text-red-500" : "text-white/80"}
                  />
                </button>
                <RatingControl
                  key={`${track.id || currentTrack.id}-${rating}`}
                  label={track.title || currentTrack.title}
                  value={rating}
                  size={17}
                  onRate={setSongRating}
                />
              </div>

              <div className="app-muted mt-3 text-xs">
                {playCount > 0 ? `${playCount} plays` : ""}
              </div>

              {(lastfmStats || lastfmTrackStats) && (
                <div className="mt-4 rounded-lg border-l-4 border-[var(--app-accent)] bg-white/[0.045] px-4 py-3">
                  <div className="app-label mb-1 text-[var(--app-accent)]">
                    Last.fm
                  </div>

                  <div className="space-y-1 text-xs text-[var(--app-muted)]">
                    {lastfmTrackStats && (
                      <div>
                        <b>This track</b>
                        <span className="mx-2 text-white/30">—</span>
                        {Number(lastfmTrackStats.listeners || 0).toLocaleString()} listeners
                        <span className="mx-2 text-white/30">•</span>
                        {Number(lastfmTrackStats.playcount || 0).toLocaleString()} scrobbles
                      </div>
                    )}

                    {lastfmStats && (
                      <div>
                        <b>This artist</b>
                        <span className="mx-2 text-white/30">—</span>
                        {Number(lastfmStats.listeners || 0).toLocaleString()} listeners
                        <span className="mx-2 text-white/30">•</span>
                        {Number(lastfmStats.playcount || 0).toLocaleString()} scrobbles
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-10 grid gap-5 px-5 pt-5 lg:grid-cols-2">
        <div className="space-y-5">
          <Card title="Most Played by This Artist" icon={<TrendingUp size={16} />}>
            <div className="space-y-1">
              {topSongs.slice(0, 5).map((song: any, index: number) => (
                <button
                  key={song.id}
                  onClick={() => playSong(song, topSongs)}
                  className="grid w-full grid-cols-[28px_1fr_46px_22px] items-center rounded-lg px-3 py-2 text-left transition hover:bg-white/10"
                >
                  <span className="text-sm font-semibold text-[var(--app-accent)]">{index + 1}</span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-[var(--foreground)]">
                      {song.title}
                    </span>
                    <span className="block truncate text-xs text-white/40">{song.album}</span>
                  </span>
                  <span className="text-xs text-white/50">{formatDuration(song.duration)}</span>
                  <Play size={14} className="text-white/35" />
                </button>
              ))}
            </div>

            <div className="mt-5 text-xs text-white/30">
              Top tracks from {track.artist || currentTrack.artist}
            </div>
          </Card>

          <Card
          title="From This Album"
          icon={<Disc3 size={16} />}
          action={
            (track.albumId || currentTrack.albumId) ? (
              <Link href={`/albums/${track.albumId || currentTrack.albumId}`} className="flex items-center gap-1 text-xs font-semibold text-[var(--app-accent)]">
                View Album <ExternalLink size={12} />
              </Link>
            ) : null
          }
        >
          <div className="mb-4 text-xs text-white/50">
            <div className="font-bold text-white/80">
              {(album?.id || track.albumId || currentTrack.albumId) ? (
                <Link
                  href={`/albums/${album?.id || track.albumId || currentTrack.albumId}`}
                  className="hover:text-[var(--app-accent)] hover:underline"
                >
                  {album?.name || track.album || currentTrack.album}
                </Link>
              ) : (
                album?.name || track.album || currentTrack.album
              )}
            </div>
            <div className="mt-1">
              {formatDisplayValue(album?.year || track.year || currentTrack.year)}
              {albumSongs.length ? ` • Track ${currentTrackIndex || "?"} / ${albumSongs.length}` : ""}
              {album?.duration ? ` • ${formatDuration(album.duration)}` : ""}
              {playCount > 0 ? ` • ${playCount} plays` : ""}
            </div>
          </div>

          <div className="space-y-1">
            {visibleAlbumSongs.map((song: any, index: number) => {
              const active = song.id === track.id;
              return (
                <button
                  key={song.id}
                  onClick={() => playSong(song, albumSongs)}
                  className={`grid w-full grid-cols-[28px_1fr_46px] rounded-lg px-3 py-2 text-left text-sm ${
                    active ? "bg-white/10 text-[var(--app-accent)]" : "text-white/70 hover:bg-white/10"
                  }`}
                >
                  <span className="text-xs">{index + 1}</span>
                  <span className="truncate">{song.title}</span>
                  <span className="text-right text-xs text-white/45">{formatDuration(song.duration)}</span>
                </button>
              );
            })}
          </div>

          {albumSongs.length > 10 && (
            <button onClick={() => setShowAllAlbumTracks((v) => !v)} className="mt-4 text-xs font-semibold text-[var(--app-accent)]">
              {showAllAlbumTracks ? "Show less" : `Show ${albumSongs.length - 10} more`}
            </button>
          )}
          </Card>
        </div>

        <div className="space-y-5">
          <Card title="About the Artist" icon={<Users size={16} />}>
            <div className="flex gap-4">
              <img src={artistImage} alt={track.artist || currentTrack.artist} className="h-20 w-20 shrink-0 rounded-lg object-cover" />
              <div>
                <h3 className="text-lg font-bold">
                  {(track.artistId || currentTrack.artistId) ? (
                    <Link
                      href={`/artists/${track.artistId || currentTrack.artistId}`}
                      className="hover:text-[var(--app-accent)] hover:underline"
                    >
                      {track.artist || currentTrack.artist}
                    </Link>
                  ) : (
                    track.artist || currentTrack.artist
                  )}
                </h3>
                <p className="mt-1 text-xs leading-5 text-white/55">
                  {showFullBio ? bio : shortBio || "No artist biography found."}
                </p>
                {bio.length > 260 && (
                  <button onClick={() => setShowFullBio((v) => !v)} className="mt-1 text-xs font-semibold text-[var(--app-accent)]">
                    {showFullBio ? "Show less" : "Read more"}
                  </button>
                )}
              </div>
            </div>

            {showSimilarArtists && similarArtists.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {similarArtists.slice(0, 10).map((artist: any) => (
                  <Link
                    key={artist.name}
                    href={`/search?q=${encodeURIComponent(artist.name)}`}
                    className="rounded-full bg-white/10 px-2.5 py-1 text-xs text-white/65 transition hover:bg-white/20 hover:text-white"
                  >
                    {artist.name}
                  </Link>
                ))}
              </div>
            )}
          </Card>

          <Card title="Discography" icon={<Disc3 size={16} />}>
            <div className="grid grid-cols-8 gap-2">
              {artistAlbums.slice(0, 16).map((item: any) => (
                <Link href={`/albums/${item.id}`} key={item.id}>
                  <img src={getCoverArtUrl(item.coverArt || item.id)} alt={item.name} className="aspect-square w-full rounded-md object-cover" />
                </Link>
              ))}
            </div>
          </Card>

          {showTourDates && (
          <Card title="On Tour" icon={<CalendarDays size={16} />}>
            {tourEvents.length > 0 ? (
              <div className="space-y-4">
                {tourEvents.slice(0, 4).map((event: any) => {
                  const date = new Date(event.datetime);

                  return (
                    <a
                      key={event.id || event.url}
                      href={event.url}
                      target="_blank"
                      rel="noreferrer"
                      className="grid grid-cols-[48px_1fr] gap-3 rounded-lg p-2 hover:bg-white/10"
                    >
                      <div className="text-center font-bold text-[var(--app-accent)]">
                        <div className="text-[10px] uppercase">
                          {date.toLocaleDateString([], { month: "short" })}
                        </div>
                        <div className="text-xl">{date.getDate()}</div>
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-[var(--foreground)]">
                          {event.title || event.venue?.name || "Tour Date"}
                        </div>
                        <div className="mt-1 flex items-center gap-2 text-xs text-white/45">
                          <MapPin size={12} />
                          {event.venue?.city}
                          {event.venue?.region ? `, ${event.venue.region}` : ""}
                          {event.venue?.country ? `, ${event.venue.country}` : ""}
                        </div>
                      </div>
                    </a>
                  );
                })}
                <div className="text-right text-xs text-white/25">Tour data via Ticketmaster</div>
              </div>
            ) : (
              <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4 text-xs text-white/45">
                No upcoming tour dates found.
              </div>
            )}
          </Card>
          )}
        </div>
      </section>
    </main>
  );
}

function Pill({ children }: { children: ReactNode }) {
  return (
    <span className="app-chip px-2.5 py-1 text-[11px]">
      {children}
    </span>
  );
}

function Card({
  title,
  icon,
  action,
  children,
}: {
  title: string;
  icon: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="app-detail-panel rounded-3xl p-4">
      <div className="mb-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-[var(--app-accent)]">{icon}</span>
          <h2 className="app-label">
            {title}
          </h2>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
