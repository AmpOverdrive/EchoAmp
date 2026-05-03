import { XMLParser } from "fast-xml-parser";

const BASE = "http://localhost:4533";

const AUTH = () =>
  `u=${process.env.NEXT_PUBLIC_NAV_USERNAME}&p=${process.env.NEXT_PUBLIC_NAV_PASSWORD}&v=1.16.1&c=navidrome`;

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
});

function decodeHtmlEntities(value) {
  if (typeof value !== "string") return value;

  return value
    .replace(/&#x([0-9a-fA-F]+);/g, (_, code) => String.fromCharCode(parseInt(code, 16)))
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&#34;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function decodeDeep(value) {
  if (typeof value === "string") return decodeHtmlEntities(value);

  if (Array.isArray(value)) {
    return value.map(decodeDeep);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, val]) => [key, decodeDeep(val)])
    );
  }

  return value;
}

function parseSubsonicXml(text) {
  return decodeDeep(parser.parse(text));
}

export async function getAlbumList() {
  const url =
    `${BASE}/rest/getAlbumList.view?type=recent&size=50&` + AUTH();

  const res = await fetch(url);
  const text = await res.text();

  const json = parseSubsonicXml(text);

  const albums =
    json?.["subsonic-response"]?.albumList?.album || [];

  console.log("ALBUMS OUTPUT:", albums);

  return Array.isArray(albums) ? albums : [albums];
}

export async function getAlbum(id) {
  const url =
    `${BASE}/rest/getAlbum.view?id=${id}&` + AUTH();

  const res = await fetch(url);
  const text = await res.text();

  const json = parseSubsonicXml(text);

  return json?.["subsonic-response"]?.album || null;
}

export async function getAlbumInfo(id) {
  if (!id) return null;

  async function load(endpoint) {
    const url =
      `${BASE}/rest/${endpoint}.view?id=${encodeURIComponent(id)}&` + AUTH();

    const res = await fetch(url);
    const text = await res.text();
    const json = parseSubsonicXml(text);
    const response = json?.["subsonic-response"] || {};

    return response.albumInfo2 || response.albumInfo || null;
  }

  try {
    const info = await load("getAlbumInfo2");
    if (info) return info;
  } catch {}

  try {
    return await load("getAlbumInfo");
  } catch {
    return null;
  }
}

export async function searchMusic(query) {
  if (!query || !query.trim()) return { albums: [], artists: [], songs: [] };

  const url =
    `${BASE}/rest/search3.view?query=${encodeURIComponent(query)}&albumCount=30&artistCount=30&songCount=50&` +
    AUTH();

  const res = await fetch(url);
  const text = await res.text();
  const json = parseSubsonicXml(text);

  const result = json?.["subsonic-response"]?.searchResult3 || {};

  const toArray = (value) => {
    if (!value) return [];
    return Array.isArray(value) ? value : [value];
  };

  return {
    albums: toArray(result.album),
    artists: toArray(result.artist),
    songs: toArray(result.song),
  };
}

export async function getAlbumListByType(type = "recent", size = 12, offset = 0) {
  const url =
    `${BASE}/rest/getAlbumList.view?type=${type}&size=${size}&offset=${offset}&` + AUTH();

  const res = await fetch(url);
  const text = await res.text();
  const json = parseSubsonicXml(text);

  const albums = json?.["subsonic-response"]?.albumList?.album || [];

  return Array.isArray(albums) ? albums : [albums];
}

export async function getAlbumsByGenre(genre, size = 100, offset = 0) {
  const params = new URLSearchParams({
    type: "byGenre",
    genre,
    size: String(size),
    offset: String(offset),
  });

  async function load(endpoint) {
    const url = `${BASE}/rest/${endpoint}.view?${params.toString()}&` + AUTH();

    const res = await fetch(url);
    const text = await res.text();
    const json = parseSubsonicXml(text);
    const response = json?.["subsonic-response"] || {};

    return (
      response.albumList2?.album ||
      response.albumList?.album ||
      []
    );
  }

  try {
    const albums = await load("getAlbumList2");
    return Array.isArray(albums) ? albums : [albums];
  } catch {
    const albums = await load("getAlbumList");
    return Array.isArray(albums) ? albums : [albums];
  }
}

export async function getAllAlbumListByType(type = "recent", pageSize = 500) {
  const albums = [];
  const seen = new Set();
  let offset = 0;

  while (true) {
    const url =
      `${BASE}/rest/getAlbumList.view?type=${type}&size=${pageSize}&offset=${offset}&` +
      AUTH();

    const res = await fetch(url);
    const text = await res.text();
    const json = parseSubsonicXml(text);

    const pageAlbums = json?.["subsonic-response"]?.albumList?.album || [];
    const page = Array.isArray(pageAlbums) ? pageAlbums : [pageAlbums];
    const filteredPage = page.filter(Boolean);

    if (filteredPage.length === 0) break;

    let added = 0;

    filteredPage.forEach((album) => {
      const key = album.id || `${album.name}-${album.artist}-${album.year}`;

      if (!seen.has(key)) {
        seen.add(key);
        albums.push(album);
        added += 1;
      }
    });

    if (filteredPage.length < pageSize || added === 0) break;

    offset += pageSize;
  }

  return albums;
}

export async function getRandomSongs(size = 12) {
  const url =
    `${BASE}/rest/getRandomSongs.view?size=${size}&` + AUTH();

  const res = await fetch(url);
  const text = await res.text();
  const json = parseSubsonicXml(text);

  const songs = json?.["subsonic-response"]?.randomSongs?.song || [];

  return Array.isArray(songs) ? songs : [songs];
}

export async function getGenres() {
  const url = `${BASE}/rest/getGenres.view?` + AUTH();

  const res = await fetch(url);
  const text = await res.text();
  const json = parseSubsonicXml(text);

  const genres = json?.["subsonic-response"]?.genres?.genre || [];
  const arr = Array.isArray(genres) ? genres : [genres];

  return arr
    .filter(Boolean)
    .map((genre) => {
      if (typeof genre === "string") {
        return {
          name: genre,
          songCount: 0,
          albumCount: 0,
        };
      }

      const name =
        genre["#text"] ||
        genre.name ||
        genre.value ||
        genre.genre ||
        "";

      return {
        ...genre,
        name: decodeHtmlEntities(String(name || "")).trim(),
        songCount: Number(genre.songCount || genre.songcount || 0),
        albumCount: Number(genre.albumCount || genre.albumcount || 0),
      };
    })
    .filter((genre) => genre.name);
}

export function getCoverArtUrl(id) {
  if (!id) return "/placeholder-album.png";

  return `${BASE}/rest/getCoverArt.view?id=${id}&` + AUTH();
}

export function getStreamUrl(id) {
  return `${BASE}/rest/stream.view?id=${id}&` + AUTH();
}

export async function getPlaylists() {
  const url = `${BASE}/rest/getPlaylists.view?` + AUTH();

  const res = await fetch(url);
  const text = await res.text();
  const json = parseSubsonicXml(text);

  const playlists =
    json?.["subsonic-response"]?.playlists?.playlist || [];

  return Array.isArray(playlists) ? playlists : [playlists];
}

export async function getInternetRadioStations() {
  const url = `${BASE}/rest/getInternetRadioStations.view?` + AUTH();

  const res = await fetch(url);
  const text = await res.text();
  const json = parseSubsonicXml(text);

  const stations =
    json?.["subsonic-response"]?.internetRadioStations?.internetRadioStation ||
    [];

  return Array.isArray(stations) ? stations : [stations];
}

export async function createInternetRadioStation({ name, streamUrl, homePageUrl }) {
  const params = new URLSearchParams({
    name,
    streamUrl,
    homepageUrl: homePageUrl || "",
  });

  const url = `${BASE}/rest/createInternetRadioStation.view?${params.toString()}&` + AUTH();
  await fetch(url);
}

export async function updateInternetRadioStation({ id, name, streamUrl, homePageUrl }) {
  const params = new URLSearchParams({
    id,
    name,
    streamUrl,
    homepageUrl: homePageUrl || "",
  });

  const url = `${BASE}/rest/updateInternetRadioStation.view?${params.toString()}&` + AUTH();
  await fetch(url);
}

export async function deleteInternetRadioStation(id) {
  const url = `${BASE}/rest/deleteInternetRadioStation.view?id=${encodeURIComponent(id)}&` + AUTH();
  await fetch(url);
}

export async function getArtists() {
  const url = `${BASE}/rest/getArtists.view?` + AUTH();

  const res = await fetch(url);
  const text = await res.text();
  const json = parseSubsonicXml(text);

  const indexes =
    json?.["subsonic-response"]?.artists?.index || [];

  const indexArray = Array.isArray(indexes) ? indexes : [indexes];

  const artists = indexArray.flatMap((index) => {
    const artist = index?.artist || [];
    return Array.isArray(artist) ? artist : [artist];
  });

  return artists.filter(Boolean);
}

export async function getArtist(id) {
  const url = `${BASE}/rest/getArtist.view?id=${id}&` + AUTH();

  const res = await fetch(url);
  const text = await res.text();
  const json = parseSubsonicXml(text);

  return json?.["subsonic-response"]?.artist || null;
}

export async function getArtistInfo(id) {
  const url = `${BASE}/rest/getArtistInfo2.view?id=${id}&count=12&includeNotPresent=true&` + AUTH();

  const res = await fetch(url);
  const text = await res.text();
  const json = parseSubsonicXml(text);

  const info = json?.["subsonic-response"]?.artistInfo2 || null;

  if (info?.biography) {
    info.biography = decodeHtmlEntities(info.biography);
  }

  return info;
}

export async function getPlaylist(id) {
  const url = `${BASE}/rest/getPlaylist.view?id=${id}&` + AUTH();

  const res = await fetch(url);
  const text = await res.text();
  const json = parseSubsonicXml(text);

  return json?.["subsonic-response"]?.playlist || null;
}

export async function getArtistPlaylists(artistName) {
  const playlists = await getPlaylists();
  const matches = [];

  for (const playlist of playlists.filter(Boolean)) {
    try {
      const full = await getPlaylist(playlist.id);
      const entries = full?.entry
        ? Array.isArray(full.entry)
          ? full.entry
          : [full.entry]
        : [];

      const found = entries.some(
        (song) =>
          song?.artist?.toLowerCase?.() === artistName?.toLowerCase?.() ||
          song?.albumArtist?.toLowerCase?.() === artistName?.toLowerCase?.()
      );

      if (found) {
        matches.push(playlist);
      }
    } catch (error) {
      console.error("Failed checking playlist", playlist.name, error);
    }
  }

  return matches;
}

export async function getAlbumPlaylists(albumName, artistName) {
  const playlists = await getPlaylists();
  const matches = [];

  for (const playlist of playlists.filter(Boolean)) {
    try {
      const full = await getPlaylist(playlist.id);
      const entries = full?.entry
        ? Array.isArray(full.entry)
          ? full.entry
          : [full.entry]
        : [];

      const found = entries.some((song) => {
        const sameAlbum =
          song?.album?.toLowerCase?.() === albumName?.toLowerCase?.();

        const sameArtist =
          !artistName ||
          song?.artist?.toLowerCase?.() === artistName?.toLowerCase?.() ||
          song?.albumArtist?.toLowerCase?.() === artistName?.toLowerCase?.();

        return sameAlbum && sameArtist;
      });

      if (found) matches.push(playlist);
    } catch (error) {
      console.error("Failed checking playlist", playlist.name, error);
    }
  }

  return matches;
}

export async function getAlbumsByArtistName(artistName) {
  if (!artistName) return [];

  const url =
    `${BASE}/rest/search3.view?query=${encodeURIComponent(artistName)}&albumCount=100&artistCount=0&songCount=0&` +
    AUTH();

  const res = await fetch(url);
  const text = await res.text();
  const json = parseSubsonicXml(text);

  const albums =
    json?.["subsonic-response"]?.searchResult3?.album || [];

  return Array.isArray(albums) ? albums : [albums];
}

export async function starItem(id) {
  const url = `${BASE}/rest/star.view?id=${id}&` + AUTH();
  await fetch(url);
}

export async function unstarItem(id) {
  const url = `${BASE}/rest/unstar.view?id=${id}&` + AUTH();
  await fetch(url);
}

export async function getTopSongs(artistName, count = 20) {
  if (!artistName) return [];

  const url =
    `${BASE}/rest/getTopSongs.view?artist=${encodeURIComponent(artistName)}&count=${count}&` +
    AUTH();

  const res = await fetch(url);
  const text = await res.text();
  const json = parseSubsonicXml(text);

  const songs =
    json?.["subsonic-response"]?.topSongs?.song || [];

  return Array.isArray(songs) ? songs : [songs];
}

export async function getStarredSongIds() {
  const url = `${BASE}/rest/getStarred2.view?` + AUTH();

  const res = await fetch(url);
  const text = await res.text();
  const json = parseSubsonicXml(text);

  const songs =
    json?.["subsonic-response"]?.starred2?.song || [];

  const arr = Array.isArray(songs) ? songs : [songs];

  return arr.filter(Boolean).map((song) => song.id);
}

export async function rateItem(id, rating) {
  const url = `${BASE}/rest/setRating.view?id=${id}&rating=${rating}&` + AUTH();
  await fetch(url);
}

export function getDownloadUrl(id) {
  return `${BASE}/rest/download.view?id=${encodeURIComponent(id)}&` + AUTH();
}

export async function createPlaylist(name) {
  if (!name || !name.trim()) throw new Error("Playlist name is required");

  const url =
    `${BASE}/rest/createPlaylist.view?name=${encodeURIComponent(name.trim())}&` +
    AUTH();

  const res = await fetch(url);
  const text = await res.text();
  const json = parseSubsonicXml(text);

  return json?.["subsonic-response"] || null;
}

export async function createPlaylistWithSongs(name, songIds = []) {
  await createPlaylist(name);

  const playlists = await getPlaylists();
  const created = playlists
    .filter(Boolean)
    .reverse()
    .find((playlist) => playlist.name === name);

  if (!created?.id) return created || null;

  for (const songId of songIds.filter(Boolean)) {
    await addSongToPlaylist(created.id, songId);
  }

  return created;
}

export async function addSongToPlaylist(playlistId, songId) {
  const url =
    `${BASE}/rest/updatePlaylist.view?playlistId=${encodeURIComponent(
      playlistId
    )}&songIdToAdd=${encodeURIComponent(songId)}&` + AUTH();

  const res = await fetch(url);
  const text = await res.text();
  const json = parseSubsonicXml(text);

  return json?.["subsonic-response"] || null;
}

export async function deletePlaylist(id) {
  if (!id) throw new Error("Playlist id is required");

  const url =
    `${BASE}/rest/deletePlaylist.view?id=${encodeURIComponent(id)}&` + AUTH();

  const res = await fetch(url);
  const text = await res.text();
  const json = parseSubsonicXml(text);

  return json?.["subsonic-response"] || null;
}

export async function getStarredItems() {
  const url = `${BASE}/rest/getStarred2.view?` + AUTH();

  const res = await fetch(url);
  const text = await res.text();
  const json = parseSubsonicXml(text);

  const starred = json?.["subsonic-response"]?.starred2 || {};

  const toArray = (value) => {
    if (!value) return [];
    return Array.isArray(value) ? value : [value];
  };

  return {
    artists: toArray(starred.artist),
    albums: toArray(starred.album),
    songs: toArray(starred.song),
  };
}

export async function scrobbleSong(id, submission = true) {
  if (!id) return;

  const url =
    `${BASE}/rest/scrobble.view?id=${encodeURIComponent(id)}&submission=${submission ? "true" : "false"}&time=${Date.now()}&` +
    AUTH();

  const res = await fetch(url);
  const text = await res.text();

  return parseSubsonicXml(text);
}


export async function getSimilarSongs(id, count = 50) {
  if (!id) return [];

  const url =
    `${BASE}/rest/getSimilarSongs2.view?id=${encodeURIComponent(id)}&count=${count}&` +
    AUTH();

  const res = await fetch(url);
  const text = await res.text();
  const json = parseSubsonicXml(text);

  const songs =
    json?.["subsonic-response"]?.similarSongs2?.song ||
    json?.["subsonic-response"]?.similarSongs?.song ||
    [];

  return Array.isArray(songs) ? songs : [songs];
}


export async function getSong(id) {
  if (!id) return null;

  const url = `${BASE}/rest/getSong.view?id=${encodeURIComponent(id)}&` + AUTH();

  const res = await fetch(url);
  const text = await res.text();
  const json = parseSubsonicXml(text);

  return json?.["subsonic-response"]?.song || null;
}

function normalizeLyricsResponse(json) {
  const response = json?.["subsonic-response"] || {};
  const legacyLyrics = response.lyrics;
  const lyricsList = response.lyricsList;
  const structured =
    lyricsList?.structuredLyrics ||
    lyricsList?.structuredLyric ||
    response.structuredLyrics ||
    response.structuredLyric;
  const structuredArray = Array.isArray(structured)
    ? structured
    : structured
      ? [structured]
      : [];
  const selected = structuredArray.find((item) => item?.line) || structuredArray[0];
  const linesRaw = selected?.line
    ? Array.isArray(selected.line)
      ? selected.line
      : [selected.line]
    : [];
  const synced = linesRaw
    .map((line) => ({
      time:
        (() => {
          if (line.start !== undefined) return Number(line.start) / 1000;
          if (line.startTime !== undefined) return Number(line.startTime) / 1000;
          if (line.offset !== undefined) return Number(line.offset) / 1000;

          const raw = Number(line.time) || 0;
          return raw > 1000 ? raw / 1000 : raw;
        })(),
      text:
        decodeHtmlEntities(
          line.value ||
            line.text ||
            line["#text"] ||
            line._ ||
            ""
        ),
    }))
    .filter((line) => line.text);

  const plain =
    selected?.value ||
    selected?.text ||
    legacyLyrics?.value ||
    legacyLyrics?.text ||
    legacyLyrics ||
    synced.map((line) => line.text).join("\n");

  return {
    plain: typeof plain === "string" ? decodeHtmlEntities(plain) : "",
    synced,
  };
}

export async function getLyrics({ id, artist, title, provider = "auto" }) {
  const lyricsProvider = String(provider || "auto").toLowerCase();

  if (id && lyricsProvider !== "legacy") {
    try {
      const url =
        `${BASE}/rest/getLyricsBySongId.view?id=${encodeURIComponent(id)}&` +
        AUTH();
      const res = await fetch(url);
      const text = await res.text();
      const json = parseSubsonicXml(text);
      const lyrics = normalizeLyricsResponse(json);
      if (lyrics.plain || lyrics.synced.length) return lyrics;
    } catch {}
  }

  if (!artist || !title) return { plain: "", synced: [] };

  const url =
    `${BASE}/rest/getLyrics.view?artist=${encodeURIComponent(artist)}&title=${encodeURIComponent(title)}&` +
    AUTH();
  const res = await fetch(url);
  const text = await res.text();
  const json = parseSubsonicXml(text);

  return normalizeLyricsResponse(json);
}
