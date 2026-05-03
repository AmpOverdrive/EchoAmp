import { XMLParser } from "fast-xml-parser";

const BASE = "http://localhost:4533";

const AUTH = () =>
  `u=${process.env.NEXT_PUBLIC_NAV_USERNAME}&p=${process.env.NEXT_PUBLIC_NAV_PASSWORD}&v=1.16.1&c=navidrome`;

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
});

export async function getAlbumTracks(id) {
  const res = await fetch(
    `${BASE}/rest/getAlbum.view?id=${id}&` + AUTH()
  );

  const text = await res.text();
  const json = parser.parse(text);

  const album = json?.["subsonic-response"]?.album;

  const songs = album?.song || [];

  return Array.isArray(songs) ? songs : [songs];
}
