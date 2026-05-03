export function decodeHtml(value: any) {
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

export function formatDisplayValue(value: any, fallback = "") {
  if (value === undefined || value === null || value === false) return fallback;

  if (typeof value === "object") {
    if ("year" in value && value.year) {
      return String(value.year);
    }

    if ("value" in value && value.value !== value) {
      return formatDisplayValue(value.value, fallback);
    }

    if ("name" in value && value.name) {
      return formatDisplayValue(value.name, fallback);
    }

    if ("title" in value && value.title) {
      return formatDisplayValue(value.title, fallback);
    }

    return fallback;
  }

  return String(decodeHtml(value)).trim() || fallback;
}

export function decodeTrack(track: any) {
  if (!track || typeof track !== "object") return track;

  return {
    ...track,
    title: decodeHtml(track.title),
    artist: decodeHtml(track.artist),
    album: decodeHtml(track.album),
    name: decodeHtml(track.name),
  };
}
