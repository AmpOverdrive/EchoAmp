"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Pause, Play, Radio, Search, Signal, Volume2, X } from "lucide-react";
import { useChannelStore } from "@/lib/channel-store";
import { useChannelPlayerStore } from "@/lib/channel-player-store";
import { getPlaylist, getPlaylists } from "@/lib/navidrome";
import { normalizePlaylist, trackForPlayer } from "@/lib/normalizers";
import { getLiveState } from "@/lib/live-channel";
import LiveBars from "@/components/channel/LiveBars";

export default function ChannelsPage() {
  const { channels, setFromPlaylists } = useChannelStore();

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

  const tracksCacheRef = useRef<Record<string, any[]>>({});
  const loadingTracksRef = useRef<Record<string, Promise<any[]> | undefined>>({});

  const [liveByChannel, setLiveByChannel] = useState<any>({});
  const [loadingChannelId, setLoadingChannelId] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    async function load() {
      const playlists = await getPlaylists();
      const mapped = playlists.filter(Boolean).map((p: any) => {
        const n = normalizePlaylist(p);
        return {
          ...p,
          playlistId: p.id,
          name: n.name || p.name,
          coverArt: n.coverArt,
        };
      });

      setFromPlaylists(mapped);
    }

    load();
  }, [setFromPlaylists]);

  async function loadTracks(channel: any) {
    if (tracksCacheRef.current[channel.id]) {
      return tracksCacheRef.current[channel.id];
    }

    if (loadingTracksRef.current[channel.id]) {
      return loadingTracksRef.current[channel.id];
    }

    loadingTracksRef.current[channel.id] = getPlaylist(channel.playlistId)
      .then((data: any) => {
        const entries = Array.isArray(data?.entry)
          ? data.entry
          : data?.entry
            ? [data.entry]
            : [];

        const songs = entries.map((t: any) => trackForPlayer(t));
        tracksCacheRef.current[channel.id] = songs;
        delete loadingTracksRef.current[channel.id];
        return songs;
      })
      .catch((error: any) => {
        console.error("Failed to load channel tracks:", channel.name, error);
        delete loadingTracksRef.current[channel.id];
        tracksCacheRef.current[channel.id] = [];
        return [];
      });

    return loadingTracksRef.current[channel.id];
  }

  function refreshLivePreviews() {
    setLiveByChannel((current: any) => {
      const next = { ...current };

      for (const channel of channels) {
        const tracks = tracksCacheRef.current[channel.id];
        if (!tracks?.length) continue;

        const state = getLiveState(tracks, channel.id);
        if (state?.track) next[channel.id] = state;
      }

      return next;
    });
  }

  useEffect(() => {
    if (!channels.length) return;

    let cancelled = false;

    async function loadPreviewBatches() {
      const batchSize = 3;

      for (let index = 0; index < channels.length; index += batchSize) {
        if (cancelled) return;

        const batch = channels.slice(index, index + batchSize);
        await Promise.all(batch.map((channel: any) => loadTracks(channel)));

        if (!cancelled) {
          refreshLivePreviews();
        }
      }
    }

    loadPreviewBatches();

    const interval = setInterval(() => {
      refreshLivePreviews();
    }, 15000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [channels]);

  const filteredChannels = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return channels;
    return channels.filter((c: any) =>
      String(c.name || "").toLowerCase().includes(term)
    );
  }, [channels, query]);

  async function tuneIn(channel: any) {
    if (loadingChannelId) return;
    setLoadingChannelId(channel.id);

    try {
      const tracks = (await loadTracks(channel)) ?? [];
      if (!tracks.length) return;

      if (currentChannel?.id === channel.id && currentTrack) {
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

      setLiveByChannel((current: any) => ({
        ...current,
        [channel.id]: state,
      }));
    } finally {
      setLoadingChannelId(null);
    }
  }

  function togglePlayback() {
    if (!currentTrack) return;
    setPlaying(!isPlaying);
  }

  function stopChannel() {
    setPlaying(false);
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#030307] pb-32 text-white">
      <section className="relative overflow-hidden px-5 py-8 sm:px-8 lg:px-10">
        {currentChannel?.coverArt && (
          <img
            src={currentChannel.coverArt}
            alt=""
            className="absolute inset-0 h-full w-full scale-110 object-cover opacity-20 blur-3xl"
            loading="lazy"
          />
        )}

        <div className="absolute inset-0 bg-[radial-gradient(circle_at_16%_14%,rgba(255,35,90,0.32),transparent_32%),radial-gradient(circle_at_88%_8%,rgba(0,190,255,0.18),transparent_34%),radial-gradient(circle_at_55%_92%,rgba(120,75,255,0.18),transparent_34%)]" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-[#030307]/80 to-[#030307]" />

        <div className="relative mx-auto max-w-7xl">
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/[0.07] px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.24em] text-white/60 backdrop-blur-xl">
              <span className="h-2 w-2 animate-pulse rounded-full bg-red-400" />
              Live Radio Network
            </div>

            <label className="relative block w-full sm:w-96">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/35" size={18} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search stations..."
                className="h-12 w-full rounded-full border border-white/10 bg-black/35 pl-11 pr-4 text-sm outline-none backdrop-blur-xl placeholder:text-white/30 focus:border-cyan-200/40"
              />
            </label>
          </div>

          <div className="grid gap-8 lg:grid-cols-[1fr_460px] lg:items-center">
            <div>
              <h1 className="max-w-4xl text-5xl font-black tracking-[-0.055em] sm:text-7xl">
                Live channels from your library.
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-white/58">
                Premium playlist-powered stations with readable now-playing information before you tune in.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Metric label="Stations" value={channels.length} />
                <Metric label="Format" value="Live" />
                <Metric label="Source" value="Playlists" />
              </div>
            </div>

            <aside className="rounded-[2rem] border border-white/10 bg-white/[0.075] p-5 shadow-[0_30px_100px_rgba(0,0,0,0.55)] backdrop-blur-2xl">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="flex items-center gap-1.5 rounded-full bg-red-500/20 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-red-100">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-300" />
                      On Air
                    </span>
                    <LiveBars active={isPlaying} />
                  </div>
                  <h2 className="text-xl font-black leading-tight">
                    {currentChannel?.name || "No station selected"}
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={stopChannel}
                  disabled={!currentTrack}
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-black/30 text-white/55 ring-1 ring-white/10 transition hover:text-white disabled:opacity-30"
                >
                  <X size={17} />
                </button>
              </div>

              <div className="grid grid-cols-[116px_1fr] gap-4">
                <div className="grid h-[116px] w-[116px] place-items-center overflow-hidden rounded-[1.4rem] bg-black/45 ring-1 ring-white/10">
                  {currentTrack?.coverArt ? (
                    <img src={currentTrack.coverArt} alt="" className="max-h-full max-w-full object-contain" loading="lazy" />
                  ) : currentChannel?.coverArt ? (
                    <img src={currentChannel.coverArt} alt="" className="h-full w-full object-cover" loading="lazy" />
                  ) : (
                    <Radio className="text-white/30" size={46} />
                  )}
                </div>

                <div className="min-w-0">
                  <p className="line-clamp-2 text-base font-black leading-snug">
                    {currentTrack?.title || "Ready to broadcast"}
                  </p>
                  <p className="mt-1 line-clamp-2 text-sm leading-snug text-white/45">
                    {currentTrack?.artist || "Choose any station below"}
                  </p>

                  <div className="mt-4 rounded-2xl border border-white/10 bg-black/25 px-3 py-2">
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-white/40">
                      <Signal size={13} />
                      Live radio · no skipping
                    </div>
                  </div>

                  <div className="mt-4 flex items-center gap-3">
                    <button
                      type="button"
                      disabled={!currentTrack}
                      onClick={togglePlayback}
                      className="grid h-11 w-11 place-items-center rounded-full bg-white text-black shadow-xl transition hover:scale-105 disabled:opacity-30"
                    >
                      {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
                    </button>

                    <div className="hidden items-center gap-2 text-white/40 sm:flex">
                      <Volume2 size={16} />
                      <div className="h-1.5 w-24 rounded-full bg-white/15">
                        <div className="h-full w-3/4 rounded-full bg-white/70" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>

      <section className="relative mx-auto max-w-7xl px-5 pt-4 sm:px-8 lg:px-10">
        <div className="mb-7 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-black tracking-tight">Stations</h2>
            <p className="mt-1 text-sm text-white/42">
              {filteredChannels.length} live station{filteredChannels.length === 1 ? "" : "s"} available
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {filteredChannels.map((channel: any, index: number) => {
            const active = currentChannel?.id === channel.id;
            const loading = loadingChannelId === channel.id;
            const live = liveByChannel[channel.id]?.track;

            return (
              <article
                key={channel.id}
                className={[
                  "group relative overflow-hidden rounded-[2rem] border bg-white/[0.05] p-4 shadow-[0_24px_70px_rgba(0,0,0,0.36)] backdrop-blur-xl transition duration-300",
                  active
                    ? "border-red-300/50 ring-2 ring-red-400/15"
                    : "border-white/10 hover:-translate-y-1 hover:border-white/20 hover:bg-white/[0.07]",
                ].join(" ")}
              >
                <div className="relative grid gap-4 sm:grid-cols-[150px_1fr]">
                  <button
                    type="button"
                    onClick={() => tuneIn(channel)}
                    className="relative aspect-square overflow-hidden rounded-[1.5rem] bg-black/40 text-left ring-1 ring-white/10"
                  >
                    {channel.coverArt ? (
                      <img
                        src={channel.coverArt}
                        alt={channel.name}
                        className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105"
                        loading="lazy"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-red-500 via-fuchsia-700 to-cyan-800" />
                    )}

                    <div className="absolute inset-0 bg-gradient-to-b from-black/0 to-black/62" />

                    <div className="absolute left-3 top-3 rounded-full bg-black/50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.15em] text-white/80 backdrop-blur">
                      CH {index + 1}
                    </div>

                    {active && (
                      <div className="absolute right-3 top-3 rounded-full bg-red-500 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.13em]">
                        Live
                      </div>
                    )}

                    <div className="absolute inset-0 grid place-items-center bg-black/0 opacity-0 transition group-hover:bg-black/25 group-hover:opacity-100">
                      <div className="grid h-12 w-12 place-items-center rounded-full bg-white text-black shadow-2xl">
                        {loading ? <LoaderSpinner /> : <Play size={19} fill="currentColor" />}
                      </div>
                    </div>
                  </button>

                  <div className="min-w-0 py-1">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <h3 className="text-2xl font-black leading-tight">
                          {channel.name}
                        </h3>
                        <p className="mt-1 text-[11px] font-black uppercase tracking-[0.18em] text-white/35">
                          Playlist Station
                        </p>
                      </div>

                      <Link
                        href={`/channels/${channel.id}`}
                        className="shrink-0 rounded-full bg-white/8 px-4 py-2 text-xs font-black text-white/55 transition hover:bg-cyan-300/15 hover:text-cyan-100"
                      >
                        View
                      </Link>
                    </div>

                    <div className="mt-5 rounded-[1.4rem] bg-black/30 p-4 ring-1 ring-white/8">
                      <p className="mb-3 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-red-200">
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-300" />
                        On Now
                      </p>

                      <div className="flex items-center gap-4">
                        <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-2xl bg-white/8">
                          {live?.coverArt ? (
                            <img src={live.coverArt} alt="" className="max-h-full max-w-full object-contain" loading="lazy" />
                          ) : (
                            <Radio size={24} className="text-white/30" />
                          )}
                        </div>

                        <div className="min-w-0">
                          <p className="line-clamp-2 text-lg font-black leading-tight text-white/95">
                            {live?.title || "Loading broadcast..."}
                          </p>
                          <p className="mt-1 line-clamp-2 text-sm leading-snug text-white/45">
                            {live?.artist || "Checking signal"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string | number; value: string | number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 backdrop-blur-xl">
      <div className="text-xl font-black">{value}</div>
      <div className="text-[10px] font-black uppercase tracking-[0.18em] text-white/35">
        {label}
      </div>
    </div>
  );
}

function LoaderSpinner() {
  return <span className="h-5 w-5 animate-spin rounded-full border-2 border-black/30 border-t-black" />;
}
