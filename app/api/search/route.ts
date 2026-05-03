import { NextResponse } from "next/server";
import { searchMusic } from "@/lib/navidrome";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q")?.trim();

  if (!query) {
    return NextResponse.json({ artists: [], albums: [], songs: [] });
  }

  try {
    const results = await searchMusic(query);

    return NextResponse.json(results);
  } catch (err) {
    console.error("Search error:", err);
    return NextResponse.json({ artists: [], albums: [], songs: [] });
  }
}
