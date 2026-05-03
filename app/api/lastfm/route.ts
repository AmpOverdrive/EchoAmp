import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

const API_KEY =
  process.env.LASTFM_API_KEY ||
  process.env.NEXT_PUBLIC_LASTFM_API_KEY ||
  "9917fb39049225a13bec225ad6d49054";
const API_SECRET =
  process.env.LASTFM_API_SECRET || "03817dda02bee87a178aab7581abae3b";
const LASTFM_URL = "https://ws.audioscrobbler.com/2.0/";

function sign(params: Record<string, string>) {
  const base = Object.entries(params)
    .filter(([key]) => key !== "format" && key !== "callback")
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}${value}`)
    .join("");

  return crypto
    .createHash("md5")
    .update(`${base}${API_SECRET}`, "utf8")
    .digest("hex");
}

async function callLastfm(params: Record<string, string>, signed = false) {
  const body = new URLSearchParams({
    ...params,
    api_key: API_KEY,
    format: "json",
  });

  if (signed) {
    body.set("api_sig", sign(Object.fromEntries(body.entries())));
  }

  const response = await fetch(LASTFM_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });

  const data = await response.json();

  if (!response.ok || data?.error) {
    return NextResponse.json(
      { error: data?.message || "Last.fm request failed", code: data?.error },
      { status: response.ok ? 400 : response.status }
    );
  }

  return NextResponse.json(data);
}

export async function GET(request: NextRequest) {
  const action = request.nextUrl.searchParams.get("action");

  if (action === "auth-url") {
    const tokenResponse = await fetch(LASTFM_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        method: "auth.getToken",
        api_key: API_KEY,
        format: "json",
      }),
    });
    const data = await tokenResponse.json();

    if (!tokenResponse.ok || data?.error || !data?.token) {
      return NextResponse.json(
        { error: data?.message || "Unable to create Last.fm token" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      token: data.token,
      url: `https://www.last.fm/api/auth/?api_key=${API_KEY}&token=${data.token}`,
    });
  }

  return NextResponse.json({ error: "Unknown Last.fm action" }, { status: 400 });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const action = body?.action;

  if (action === "session") {
    return callLastfm(
      {
        method: "auth.getSession",
        token: String(body.token || ""),
      },
      true
    );
  }

  if (action === "now-playing") {
    return callLastfm(
      {
        method: "track.updateNowPlaying",
        artist: String(body.artist || ""),
        track: String(body.track || ""),
        album: String(body.album || ""),
        duration: String(Math.round(Number(body.duration || 0))),
        sk: String(body.sessionKey || ""),
      },
      true
    );
  }

  if (action === "scrobble") {
    return callLastfm(
      {
        method: "track.scrobble",
        artist: String(body.artist || ""),
        track: String(body.track || ""),
        album: String(body.album || ""),
        duration: String(Math.round(Number(body.duration || 0))),
        timestamp: String(Math.floor(Number(body.timestamp || Date.now()) / 1000)),
        sk: String(body.sessionKey || ""),
      },
      true
    );
  }

  if (action === "love" || action === "unlove") {
    return callLastfm(
      {
        method: action === "love" ? "track.love" : "track.unlove",
        artist: String(body.artist || ""),
        track: String(body.track || ""),
        sk: String(body.sessionKey || ""),
      },
      true
    );
  }

  return NextResponse.json({ error: "Unknown Last.fm action" }, { status: 400 });
}
