"use client";

const BASE = "http://localhost:4533";

export function getCoverUrl(item) {
  const id = item?.coverArt || item?.albumId || item?.id;

  if (!id) return "/placeholder.png";

  return `${BASE}/rest/getCoverArt.view?id=${encodeURIComponent(id)}&u=${process.env.NEXT_PUBLIC_NAV_USERNAME}&p=${process.env.NEXT_PUBLIC_NAV_PASSWORD}&v=1.16.1&c=navidrome`;
}
