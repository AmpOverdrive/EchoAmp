"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, Music2, Play, Radio, Signal } from "lucide-react";

import { useChannelPlayerStore } from "@/lib/channel-player-store";
import { getPlaylist, getPlaylists } from "@/lib/navidrome";
import { normalizePlaylist, trackForPlayer } from "@/lib/normalizers";
import { getLiveState, getLiveHistory } from "@/lib/live-channel";
import LiveBars from "@/components/channel/LiveBars";

function formatDuration(seconds: any) {
  const total = Number(seconds || 0);
  if (!total) return "";
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function formatPlayedAgo(seconds: any) {
  const total = Math.max(0, Number(seconds || 0));
  const minutes = Math.floor(total / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m`;
  return `${Math.floor(total)}s`;
}

export default function ChannelDetailPage() {
  const params = useParams();
  const channelId = String(params.id || "");
  const playlistId = channelId.replace(/^channel-/, "");

  const {
    currentChannel,
    currentTrack,
    isPlaying,
    setChannel,
    setTrack,
    setPlaying,
    setLiveProgress,
    setLiveDuration,
    addRecentlyPlayed,
  } = useChannelPlayerStore();

  const [channel, setChannelData] = useState<any>(null);
  const [tracks, setTracks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [liveProgress, setLocalLiveProgress] = useState(0);
  const [liveDuration, setLocalLiveDuration] = useState(0);
  const [liveHistory, setLiveHistory] = useState<any[]>([]);

  const isCurrentChannel = currentChannel?.id === channel?.id;
  const displayTrack = isCurrentChannel ? currentTrack : getLiveState(tracks, channel?.id || "")?.track;

  const topArtists = useMemo(() => {
    const counts: Record<string, number> = {};
    tracks.forEach((track) => {
      if (!track.artist) return;
      counts[track.artist] = (counts[track.artist] || 0) + 1;
    });

    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([artist]) => artist);
  }, [tracks]);

  useEffect(() => {
    async function load() {
      setLoading(true);

      const playlists = await getPlaylists();
      const playlist = playlists.find((p: any) => String(p.id) === playlistId);

      if (!playlist) {
        setLoading(false);
        return;
      }

      const normalized = normalizePlaylist(playlist);

      const channelObj = {
        id: `channel-${playlist.id}`,
        playlistId: playlist.id,
        name: normalized.name || playlist.name,
        coverArt: normalized.coverArt,
        songCount: normalized.songCount,
        duration: normalized.duration,
      };

      setChannelData(channelObj);

      const data = await getPlaylist(playlist.id);
      const entries = Array.isArray(data?.entry)
        ? data.entry
        : data?.entry
          ? [data.entry]
          : [];

      setTracks(entries.map(trackForPlayer));
      setLoading(false);
    }

    load();
  }, [playlistId]);

  useEffect(() => {
    if (!channel || !tracks.length) return;

    function updateLiveInfo() {
      const state = getLiveState(tracks, channel.id);
      setLocalLiveProgress(state?.progress || 0);
      setLocalLiveDuration(state?.duration || 0);
      setLiveHistory(getLiveHistory(tracks, channel.id, 20));
    }

    updateLiveInfo();
    const interval = setInterval(updateLiveInfo, 1000);

    return () => clearInterval(interval);
  }, [channel, tracks]);

  function tuneIn() {
    if (!channel || !tracks.length) return;

    if (isCurrentChannel && currentTrack) {
      setPlaying(true);
      return;
    }

    const state = getLiveState(tracks, channel.id);
    const next = state?.track;
    if (!next) return;

    setChannel(channel, tracks);
    setTrack(next);
    setLiveProgress(state.progress || 0);
    setLiveDuration(state.duration || next.duration || 180);
    addRecentlyPlayed(next);
    setPlaying(true);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#050509] p-10 text-white">
        Loading channel...
      </main>
    );
  }

  if (!channel) {
    return (
      <main className="min-h-screen bg-[#050509] p-10 text-white">
        <Link href="/channels" className="text-white/60 hover:text-white">
          ← Back to Channels
        </Link>
        <h1 className="mt-8 text-3xl font-black">Channel not found</h1>
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#050509] text-white">
      <section className="relative min-h-screen px-6 py-8">
        {channel.coverArt && (
          <img
            src={channel.coverArt}
            alt=""
            className="absolute inset-0 h-full w-full scale-110 object-cover opacity-20 blur-3xl"
          />
        )}

        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(255,45,85,0.25),transparent_30%),radial-gradient(circle_at_80%_0%,rgba(0,170,255,0.16),transparent_35%)]" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-[#050509]/85 to-[#050509]" />

        <div className="relative mx-auto max-w-7xl">
          <Link
            href="/channels"
            className="inline-flex items-center gap-2 text-sm font-semibold text-white/60 hover:text-white"
          >
            <ArrowLeft size={16} />
            Back to Channels
          </Link>

          <div className="mt-8 grid gap-8 lg:grid-cols-[420px_1fr] lg:items-center">
            <div className="rounded-[2rem] border border-white/10 bg-white/[0.05] p-5 shadow-2xl backdrop-blur-xl">
              <div className="grid aspect-square place-items-center overflow-hidden rounded-[1.5rem] bg-black/30">
                {channel.coverArt ? (
                  <img
                    src={channel.coverArt}
                    alt={channel.name}
                    className="max-h-full max-w-full object-contain"
                  />
                ) : (
                  <Radio size={90} className="text-white/30" />
                )}
              </div>
            </div>

            <div>
              <div className="mb-4 inline-flex items-center gap-3 rounded-full border border-red-300/20 bg-red-500/15 px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-red-100">
                <span className="h-2 w-2 animate-pulse rounded-full bg-red-300" />
                Live Channel
                <LiveBars active={Boolean(isPlaying && isCurrentChannel)} />
              </div>

              <h1 className="max-w-4xl text-5xl font-black tracking-tight sm:text-6xl lg:text-7xl">
                {channel.name}
              </h1>

              <p className="mt-4 max-w-2xl text-lg leading-8 text-white/60">
                A playlist-powered live radio station built from your library.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <Stat label="Tracks" value={tracks.length} />
                <Stat label="Duration" value={formatDuration(channel.duration) || "Live"} />
                <Stat label="Mode" value="Live Radio" />
              </div>

              <button
                onClick={tuneIn}
                className="mt-8 inline-flex items-center gap-3 rounded-full bg-white px-7 py-4 text-base font-black text-black transition hover:scale-105 hover:bg-cyan-100"
              >
                <Play size={20} fill="currentColor" />
                {isCurrentChannel ? "Resume Live Channel" : "Tune In"}
              </button>
            </div>
          </div>

          <div className="mt-12 grid gap-6 lg:grid-cols-[1fr_380px]">
            <section className="rounded-[2rem] border border-white/10 bg-white/[0.05] p-6 shadow-2xl backdrop-blur-xl">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-white/35">
                    Channel Now Playing
                  </p>
                  <h2 className="mt-1 text-2xl font-black">
                    Broadcasting Now
                  </h2>
                </div>

                <Signal className="text-red-300" size={28} />
              </div>

              <div className="grid gap-5 md:grid-cols-[140px_1fr] md:items-center">
                <div className="grid h-36 w-36 place-items-center overflow-hidden rounded-3xl border border-white/10 bg-black/35">
                  {displayTrack?.coverArt ? (
                    <img
                      src={displayTrack.coverArt}
                      alt=""
                      className="max-h-full max-w-full object-contain"
                    />
                  ) : (
                    <Music2 size={52} className="text-white/25" />
                  )}
                </div>

                <div className="min-w-0">
                  <p className="line-clamp-2 text-3xl font-black">
                    {displayTrack?.title || "Live track loading"}
                  </p>
                  <p className="mt-2 line-clamp-2 text-lg text-white/55">
                    {displayTrack?.artist || "Broadcast signal loading"}
                  </p>

                  <div className="mt-4">
                    <div className="h-1.5 rounded bg-white/20">
                      <div
                        className="h-1.5 rounded bg-white"
                        style={{
                          width:
                            liveDuration > 0
                              ? `${Math.min(100, (liveProgress / liveDuration) * 100)}%`
                              : "0%",
                        }}
                      />
                    </div>

                    <div className="mt-1 flex justify-between text-xs text-white/40">
                      <span>{Math.floor(liveProgress / 60)}:{String(Math.floor(liveProgress % 60)).padStart(2,"0")}</span>
                      <span>{Math.floor(liveDuration / 60)}:{String(Math.floor(liveDuration % 60)).padStart(2,"0")}</span>
                    </div>
                  </div>

                  <div className="mt-5 rounded-2xl border border-white/10 bg-black/25 p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/35">
                      Live behavior
                    </p>
                    <p className="mt-1 text-sm text-white/55">
                      Channels are treated like radio: continuous playback with no forward/back seeking.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <aside className="rounded-[2rem] border border-white/10 bg-white/[0.05] p-6 shadow-2xl backdrop-blur-xl">
              <h2 className="text-xl font-black">Station Identity</h2>

              <div className="mt-5 space-y-4">
                <InfoRow label="Source" value="Playlist Channel" />
                <InfoRow label="Tracks" value={String(tracks.length)} />
                <InfoRow label="Status" value={isCurrentChannel ? "Live now" : "Ready"} />
              </div>

              {topArtists.length > 0 && (
                <div className="mt-6">
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-white/35">
                    Core Artists
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {topArtists.map((artist) => (
                      <span
                        key={artist}
                        className="rounded-full border border-white/10 bg-white/8 px-3 py-1 text-xs font-semibold text-white/70"
                      >
                        {artist}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </aside>
          </div>

          <section className="mt-8 rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-2xl backdrop-blur-xl">
            <div className="mb-5">
              <h2 className="text-2xl font-black">Recently Played</h2>
              <p className="mt-1 text-sm text-white/45">
                Last 20 songs broadcast on this channel.
              </p>
            </div>

            <div className="overflow-hidden rounded-2xl border border-white/10">
              {liveHistory.length === 0 ? (
                <div className="p-6 text-sm text-white/40">
                  Live history is loading...
                </div>
              ) : (
                liveHistory.map((track, index) => (
                  <div
                    key={`${track.id}-${index}`}
                    className="grid grid-cols-[36px_52px_1fr] items-center gap-4 border-b border-white/8 bg-black/15 px-4 py-3 last:border-b-0"
                  >
                    <div className="text-sm text-white/35">{index + 1}</div>

                    <div className="grid h-12 w-12 place-items-center overflow-hidden rounded-xl bg-white/8">
                      {track.coverArt ? (
                        <img
                          src={track.coverArt}
                          alt=""
                          className="max-h-full max-w-full object-contain"
                        />
                      ) : (
                        <Music2 size={22} className="text-white/25" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold">{track.title}</p>
                      <p className="truncate text-xs text-white/45">
                        {track.artist || "Unknown artist"}
                      </p>
                      <p className="mt-0.5 text-[11px] font-semibold text-white/30">
                        {index === 0 ? "On now" : `${formatPlayedAgo(track.playedAgo)} ago`}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.07] px-4 py-3 backdrop-blur">
      <div className="text-lg font-black">{value}</div>
      <div className="text-[10px] font-black uppercase tracking-[0.18em] text-white/35">
        {label}
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-white/8 pb-3 last:border-b-0">
      <span className="text-sm text-white/45">{label}</span>
      <span className="text-sm font-bold">{value}</span>
    </div>
  );
}
