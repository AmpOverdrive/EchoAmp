import { getCoverArtUrl, getStreamUrl } from "@/lib/navidrome";
import { formatDisplayValue } from "@/lib/text-utils";

export type NormalizedAlbum = {
  id: string;
  name: string;
  artist: string;
  artistId?: string;
  year?: string;
  genre?: string;
  coverArt: string;
  songCount?: number;
  duration?: number;
  playCount?: number;
  starred?: boolean;
  kind?: "track" | "radio";
  raw: any;
};

export type NormalizedArtist = {
  id: string;
  name: string;
  albumCount: number;
  imageUrl: string;
  raw: any;
};

export type NormalizedTrack = {
  id: string;
  title: string;
  artist: string;
  album?: string;
  albumId?: string;
  artistId?: string;
  coverArt: string;
  streamUrl: string;
  duration?: number;
  bitRate?: number;
  suffix?: string;
  samplingRate?: number;
  year?: string | number;
  genre?: string;
  playCount?: number;
  starred?: boolean;
  kind?: "track" | "radio";
  raw: any;
};

export type NormalizedPlaylist = {
  id: string;
  name: string;
  coverArt: string;
  songCount: number;
  duration?: number;
  comment?: string;
  raw: any;
};

function text(value: any, fallback = "") {
  return formatDisplayValue(value, fallback);
}

function numberOrUndefined(value: any) {
  const next = Number(value);
  return Number.isFinite(next) ? next : undefined;
}

function isResolvedAsset(value: any) {
  return (
    typeof value === "string" &&
    (value.startsWith("http://") ||
      value.startsWith("https://") ||
      value.startsWith("/") ||
      value.startsWith("data:"))
  );
}

function coverUrl(value: any, fallbackId?: string) {
  if (isResolvedAsset(value)) return value;
  return getCoverArtUrl(value || fallbackId);
}

function streamUrl(value: any, id: string) {
  if (isResolvedAsset(value)) return value;
  return getStreamUrl(id);
}

export function normalizeAlbum(album: any): NormalizedAlbum {
  const id = text(album?.id);

  return {
    id,
    name: text(album?.name || album?.title, "Unknown Album"),
    artist: text(album?.artist, "Unknown Artist"),
    artistId: text(album?.artistId) || undefined,
    year: text(album?.year) || undefined,
    genre: text(album?.genre) || undefined,
    coverArt: coverUrl(album?.coverArt, id),
    songCount: numberOrUndefined(album?.songCount),
    duration: numberOrUndefined(album?.duration),
    playCount: numberOrUndefined(album?.playCount),
    starred: Boolean(album?.starred),
    raw: album,
  };
}

export function normalizeArtist(artist: any): NormalizedArtist {
  const name = text(artist?.name, "Unknown Artist");

  return {
    id: text(artist?.id),
    name,
    albumCount: numberOrUndefined(artist?.albumCount) || 0,
    imageUrl:
      (isResolvedAsset(artist?.artistImageUrl) ? artist.artistImageUrl : "") ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(
        name
      )}&background=1e293b&color=ffffff&size=400`,
    raw: artist,
  };
}

export function normalizeTrack(song: any): NormalizedTrack {
  const id = text(song?.id);

  return {
    id,
    title: text(song?.title || song?.name, "Unknown Track"),
    artist: text(song?.artist, "Unknown Artist"),
    album: text(song?.album) || undefined,
    albumId: text(song?.albumId) || undefined,
    artistId: text(song?.artistId) || undefined,
    coverArt: coverUrl(song?.coverArt, song?.albumId || id),
    streamUrl: streamUrl(song?.streamUrl, id),
    duration: numberOrUndefined(song?.duration),
    bitRate: numberOrUndefined(song?.bitRate),
    suffix: text(song?.suffix) || undefined,
    samplingRate: numberOrUndefined(song?.samplingRate),
    year: text(song?.year) || undefined,
    genre: text(song?.genre) || undefined,
    playCount: numberOrUndefined(song?.playCount),
    starred: Boolean(song?.starred),
    kind: song?.kind,
    raw: song,
  };
}

export function normalizePlaylist(playlist: any): NormalizedPlaylist {
  const id = text(playlist?.id);

  return {
    id,
    name: text(playlist?.name, "Untitled Playlist"),
    coverArt: coverUrl(playlist?.coverArt, id),
    songCount: numberOrUndefined(playlist?.songCount) || 0,
    duration: numberOrUndefined(playlist?.duration),
    comment: text(playlist?.comment) || undefined,
    raw: playlist,
  };
}

export function trackForPlayer(song: any) {
  const track = normalizeTrack(song);

  return {
    id: track.id,
    title: track.title,
    artist: track.artist,
    album: track.album,
    coverArt: track.coverArt,
    streamUrl: track.streamUrl,
    duration: track.duration,
    bitRate: track.bitRate,
    suffix: track.suffix,
    samplingRate: track.samplingRate,
    year: track.year,
    genre: track.genre,
    albumId: track.albumId,
    artistId: track.artistId,
    playCount: track.playCount,
    starred: track.starred,
    kind: track.kind,
  };
}
