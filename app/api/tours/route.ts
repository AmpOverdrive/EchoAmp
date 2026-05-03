import { NextResponse } from "next/server";

const API_KEY = "dOCwXGPfTNGgLxf0ufApujNC0lyDaAzb";

function cleanArtist(name: string) {
  return name
    .replace(/\(.*?\)/g, "")
    .replace(/\[.*?\]/g, "")
    .replace(/\s+feat\.?.*/i, "")
    .replace(/\s+ft\.?.*/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const rawArtist = searchParams.get("artist");

  if (!rawArtist) return NextResponse.json([]);

  const artist = cleanArtist(rawArtist);

  try {
    const url = `https://app.ticketmaster.com/discovery/v2/events.json?keyword=${encodeURIComponent(
      artist
    )}&apikey=${API_KEY}&size=12&sort=date,asc`;

    const res = await fetch(url, { cache: "no-store" });
    const data = await res.json();

    const events = data?._embedded?.events || [];

    return NextResponse.json(
      events.map((e: any) => ({
        id: e.id,
        title: e.name,
        datetime: e.dates?.start?.dateTime || e.dates?.start?.localDate,
        venue: {
          name: e._embedded?.venues?.[0]?.name,
          city: e._embedded?.venues?.[0]?.city?.name,
          region: e._embedded?.venues?.[0]?.state?.name,
          country: e._embedded?.venues?.[0]?.country?.name,
        },
        url: e.url,
      }))
    );
  } catch (error) {
    console.error("Ticketmaster error:", error);
    return NextResponse.json([]);
  }
}
