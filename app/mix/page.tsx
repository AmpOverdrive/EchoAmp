"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getRandomSongs,
  getSimilarSongs,
  getTopSongs,
  getStarredItems,
  getGenres,
  getCoverArtUrl,
} from "@/lib/navidrome";
import { trackForPlayer } from "@/lib/normalizers";
import { usePlayerStore } from "@/lib/player-store";
import { useBehaviorStore } from "@/lib/listening-behavior-store";
import { PageShell, ShelfSkeleton } from "@/components/ui/AppPrimitives";
import {
  Flame,
  Heart,
  Infinity,
  Play,
  RefreshCw,
  Sparkles,
  Star,
  Wand2,
} from "lucide-react";

type Mix = {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  label: string;
  tracks: any[];
  icon: any;
  accent: string;
};

function uniqueTracks(tracks: any[]) {
  const seen = new Set<string>();

  return tracks.filter((track) => {
    if (!track?.id) return false;
    if (seen.has(track.id)) return false;
    seen.add(track.id);
    return true;
  });
}


function getTodayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}




function artistCooldownPenalty(track: any, queue: any[]) {
  if (!track.artist) return 0;

  const lastN = 8; // cooldown window
  const recent = queue.slice(-lastN);

  if (recent.some((t) => t.artist === track.artist)) {
    return 25; // strong penalty
  }

  return 0;
}

function diversityPenalty(track: any, queue: any[]) {
  if (!track.artist) return 0;

  let penalty = 0;

  // Count how many times artist appears in queue
  const count = queue.filter((t) => t.artist === track.artist).length;

  // Strong penalty if repeated a lot
  penalty += count * 5;

  // Extra penalty if in last 5 songs
  const recent = queue.slice(-5);
  if (recent.some((t) => t.artist === track.artist)) {
    penalty += 10;
  }

  return penalty;
}

function scoreTrack(track: any, plays: any, skips: any, artistLikes: any, artistSkips: any, queue: any[] = []) {
  let s = 0;

  const id = track.id;
  const rating = Number(track.userRating || track.rating || 0);
  const playCount = Number(track.playCount || 0);

  s += rating * 5;
  s += playCount;

  s += (plays[id] || 0) * 3;
  s -= (skips[id] || 0) * 6;

  const artist = track.artist;
  if (artist) {
    s += (artistLikes[artist] || 0) * 4;
    s -= (artistSkips[artist] || 0) * 6;
  }

  // 🎧 diversity control (critical)
  s -= diversityPenalty(track, queue);

  // 🎸 artist cooldown (prevents repeats)
  s -= artistCooldownPenalty(track, queue);

  return s;
}

function shuffle<T>(items: T[]) {
  return [...items].sort(() => Math.random() - 0.5);
}

function safeTracks(items: any) {
  return Array.isArray(items) ? items.filter(Boolean) : [];
}

function byHighRating(tracks: any[]) {
  return tracks
    .filter((track) => Number(track.userRating || track.rating || 0) >= 4)
    .sort(
      (a, b) =>
        Number(b.userRating || b.rating || 0) -
        Number(a.userRating || a.rating || 0)
    );
}


function fillMix(primary: any[], fallback: any[], limit = 50) {
  const filled = uniqueTracks([...primary, ...shuffle(fallback)]);
  return filled.slice(0, limit);
}

function byLowPlayCount(tracks: any[]) {
  return tracks
    .filter((track) => Number(track.playCount || 0) <= 2)
    .sort((a, b) => Number(a.playCount || 0) - Number(b.playCount || 0));
}


if (typeof window !== "undefined") {
  try {
    localStorage.removeItem("daily-mixes");
  } catch {}
}

export default function MixPage() {
  const setTrack = usePlayerStore((s) => s.setTrack);
  const addToQueue = usePlayerStore((s) => s.addToQueue);
  const openQueue = usePlayerStore((s) => s.openQueue);
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const plays = useBehaviorStore((s) => s.plays);
  const skips = useBehaviorStore((s) => s.skips);
  const artistLikes = useBehaviorStore((s) => s.artistLikes);
  const artistSkips = useBehaviorStore((s) => s.artistSkips);
  const queue = usePlayerStore((s) => s.queue);

  const [mixes, setMixes] = useState<Mix[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [infiniteAutoplay, setInfiniteAutoplay] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  async function loadMixes() {
    const todayKey = getTodayKey();
    const cached = localStorage.getItem("daily-mixes");

    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed.key === todayKey) {
          setMixes(parsed.mixes);
          setLoading(false);
          return;
        }
      } catch {}
    }

    setRefreshing(true);

    try {
      const [
        randomA,
        randomB,
        randomC,
        randomD,
        randomE,
        starred,
        genres,
      ] = await Promise.all([
        getRandomSongs(60),
        getRandomSongs(60),
        getRandomSongs(60),
        getRandomSongs(60),
        getRandomSongs(60),
        getStarredItems(),
        getGenres(),
      ]);

      const favorites = safeTracks(starred?.songs);
      const allRandom = uniqueTracks([
        ...safeTracks(randomA),
        ...safeTracks(randomB),
        ...safeTracks(randomC),
        ...safeTracks(randomD),
        ...safeTracks(randomE),
      ]);

      const seed =
        currentTrack ||
        favorites[0] ||
        randomA?.[0] ||
        randomB?.[0] ||
        randomC?.[0];

      let similar: any[] = [];
      let topArtistTracks: any[] = [];

      if (seed?.id) {
        similar = safeTracks(await getSimilarSongs(seed.id, 60));
      }

      if (seed?.artist) {
        topArtistTracks = safeTracks(await getTopSongs(seed.artist, 50));
      }

      const genreNames = safeTracks(genres)
        .map((genre: any) => genre.name)
        .filter(Boolean)
        .slice(0, 6);

      const highRated = byHighRating([...favorites, ...allRandom]);
      const hiddenGems = byLowPlayCount([...favorites, ...allRandom, ...similar]);

      const nextMixes: Mix[] = [
        {
          id: "daily-1",
          title: "Daily Mix 1",
          subtitle: "Favorites + discovery",
          description: "A balanced mix of music you love and fresh tracks from your library.",
          label: "Daily",
          tracks: uniqueTracks([...favorites, ...randomA, ...similar]).slice(0, 50),
          icon: Sparkles,
          accent: "from-purple-500/30 via-fuchsia-500/20 to-zinc-950",
        },
        {
          id: "daily-2",
          title: "Daily Mix 2",
          subtitle: "Artist-focused radio",
          description: seed?.artist ? `Built around ${seed.artist}, similar songs, and nearby discoveries.` : "Built around similar songs and nearby discoveries.",
          label: "Daily",
          tracks: uniqueTracks([...similar, ...topArtistTracks, ...randomB]).slice(0, 50),
          icon: Wand2,
          accent: "from-sky-500/30 via-blue-500/20 to-zinc-950",
        },
        {
          id: "daily-3",
          title: "Daily Mix 3",
          subtitle: "Deep cuts",
          description: "A deeper library lane with less obvious tracks and forgotten music.",
          label: "Daily",
          tracks: uniqueTracks([...hiddenGems, ...randomC]).slice(0, 50),
          icon: Flame,
          accent: "from-orange-500/30 via-red-500/20 to-zinc-950",
        },
        {
          id: "daily-4",
          title: "Daily Mix 4",
          subtitle: "Long-play session",
          description: "A bigger queue designed for continuous listening and background play.",
          label: "Daily",
          tracks: uniqueTracks([...randomA, ...randomB, ...randomC, ...randomD]).slice(0, 50),
          icon: Infinity,
          accent: "from-emerald-500/30 via-teal-500/20 to-zinc-950",
        },
        {
          id: "obsessed",
          title: "Recently Obsessed",
          subtitle: "Your most played lately",
          description: "Tracks you have been playing the most recently.",
          label: "Behavior",
          tracks: fillMix(shuffle(byObsessed(allRandom)), allRandom, 50),
          icon: Flame,
          accent: "from-red-500/30 via-orange-500/20 to-zinc-950",
        },
        {
          id: "top-rated",
          title: "Top Rated",
          subtitle: "Your highest rated music",
          description: "Your favorite tracks ranked by rating.",
          label: "Behavior",
          tracks: fillMix(shuffle(byTopRated([...favorites, ...allRandom])), [...favorites, ...allRandom], 50),
          icon: Star,
          accent: "from-yellow-500/30 via-amber-500/20 to-zinc-950",
        },
        {
          id: "hidden-gems",
          title: "Hidden Gems",
          subtitle: "Undiscovered favorites",
          description: "Highly rated tracks you have not played much.",
          label: "Behavior",
          tracks: fillMix(shuffle(byHiddenGems([...favorites, ...allRandom, ...similar])), [...favorites, ...allRandom, ...similar], 50),
          icon: Sparkles,
          accent: "from-indigo-500/30 via-purple-500/20 to-zinc-950",
        },
        {
          id: "favorites",
          title: "Favorites Mix",
          subtitle: "Starred songs",
          description: "Your liked songs reshuffled into a clean listening session.",
          label: "Favorites",
          tracks: uniqueTracks(favorites).slice(0, 50),
          icon: Heart,
          accent: "from-rose-500/30 via-pink-500/20 to-zinc-950",
        },
        {
          id: "discovery",
          title: "Discovery Radio",
          subtitle: "Fresh from your library",
          description: "A randomized discovery station that keeps your library feeling new.",
          label: "Discover",
          tracks: uniqueTracks(allRandom).slice(0, 50),
          icon: Sparkles,
          accent: "from-cyan-500/30 via-sky-500/20 to-zinc-950",
        },
      ];

      if (genreNames.length) {
        nextMixes.splice(4, 0, {
          id: "genre-cloud",
          title: "Genre Cloud",
          subtitle: genreNames.slice(0, 3).join(" • "),
          description:
            "A genre-inspired blend using the strongest categories in your collection.",
          label: "Genres",
          tracks: uniqueTracks([...randomE, ...randomD, ...favorites]).slice(0, 60),
          icon: Wand2,
          accent: "from-green-500/30 via-emerald-500/20 to-zinc-950",
        });
      }

      setMixes(nextMixes);

      try {
        localStorage.setItem(
          "daily-mixes",
          JSON.stringify({
            key: getTodayKey(),
            mixes: nextMixes,
          })
        );
      } catch {}
    } catch (error) {
      console.error("Failed to load smart mixes:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadMixes();
  }, []);

  useEffect(() => {
    if (!infiniteAutoplay || !currentTrack || loadingMore) return;

    const currentIndex = queue.findIndex((track) => track.id === currentTrack.id);
    const remaining = queue.length - currentIndex - 1;

    if (remaining > 5) return;

    async function extendQueue() {
      setLoadingMore(true);

      try {
        const more = await getRandomSongs(30);
        const existingIds = new Set(queue.map((track) => track.id));

        uniqueTracks(more)
          .map(trackForPlayer)
          .filter((track: any) => !existingIds.has(track.id))
          .slice(0, 20)
          .forEach((track: any) => addToQueue(track));
      } catch (error) {
        console.error("Failed to extend queue:", error);
      } finally {
        setLoadingMore(false);
      }
    }

    extendQueue();
  }, [addToQueue, currentTrack, infiniteAutoplay, loadingMore, queue]);

  function playMix(mix: Mix) {
    const tracks = uniqueTracks(mix.tracks).map(trackForPlayer);
    if (!tracks.length) return;
    setTrack(tracks[0], tracks);
  }

  function queueMix(mix: Mix) {
    uniqueTracks(mix.tracks)
      .map(trackForPlayer)
      .slice(0, 40)
      .forEach((track: any) => addToQueue(track));

    openQueue();
  }

  const hero = useMemo(() => mixes[0], [mixes]);

  const heroCover = hero?.tracks?.[0]
    ? getCoverArtUrl(hero.tracks[0].coverArt || hero.tracks[0].albumId || hero.tracks[0].id)
    : "";

  if (loading) {
    return (
      <PageShell className="p-5">
        <ShelfSkeleton />
        <ShelfSkeleton />
        <ShelfSkeleton />
      </PageShell>
    );
  }

  return (
    <PageShell className="p-5 pb-32">
      <section className="relative mb-10 overflow-hidden rounded-[2rem] border border-white/10 bg-zinc-950 p-8 shadow-2xl">
        {heroCover && (
          <img
            src={heroCover}
            alt=""
            className="absolute inset-0 h-full w-full scale-125 object-cover opacity-30 blur-3xl"
          />
        )}

        <div className="absolute inset-0 bg-gradient-to-br from-black/80 via-zinc-950/80 to-black" />

        <div className="relative z-10 grid gap-8 lg:grid-cols-[1fr_280px] lg:items-center">
          <div>
            <div className="mb-4 flex items-center gap-2 text-sm font-black uppercase tracking-[0.3em] text-[var(--app-accent)]">
              <Sparkles size={16} />
              Spotify-Level Smart Mixes
            </div>

            <h1 className="text-5xl font-black tracking-tight md:text-7xl">
              Daily Mixes
            </h1>

            <p className="mt-4 max-w-3xl text-lg leading-8 text-zinc-300">
              Personalized daily mixes, favorites, hidden gems, genre blends,
              similar-song radio, and infinite autoplay powered by your
              Navidrome library.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              {hero && (
                <button
                  onClick={() => playMix(hero)}
                  className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-black text-black transition hover:scale-105"
                >
                  <Play size={18} fill="currentColor" />
                  Play Daily Mix
                </button>
              )}

              <button
                onClick={() => setInfiniteAutoplay((value) => !value)}
                className={`inline-flex items-center gap-2 rounded-full border px-6 py-3 text-sm font-black transition hover:scale-105 ${
                  infiniteAutoplay
                    ? "border-emerald-400/40 bg-emerald-400/15 text-emerald-200"
                    : "border-white/15 bg-white/5 text-white"
                }`}
              >
                <Infinity size={18} />
                Infinite Autoplay {infiniteAutoplay ? "On" : "Off"}
              </button>

              <button
                onClick={loadMixes}
                disabled={refreshing}
                className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-6 py-3 text-sm font-black text-white transition hover:scale-105 hover:bg-white/10 disabled:opacity-50"
              >
                <RefreshCw size={17} className={refreshing ? "animate-spin" : ""} />
                Refresh
              </button>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.05] p-5 shadow-xl backdrop-blur">
            <p className="text-sm font-bold uppercase tracking-[0.25em] text-zinc-400">
              Mix Engine
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <Stat label="Mixes" value={mixes.length} />
              <Stat
                label="Tracks"
                value={mixes.reduce((sum, mix) => sum + mix.tracks.length, 0)}
              />
              <Stat label="Mode" value={infiniteAutoplay ? "∞" : "Smart"} />
              <Stat label="Source" value="Library" />
            </div>
          </div>
        </div>
      </section>

      <section className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
        <Feature
          title="Daily Refresh"
          description="Refreshes mixes using new random seeds from your library."
          icon={<RefreshCw size={18} />}
        />
        <Feature
          title="Smart Radio"
          description="Uses similar songs and top artist tracks when available."
          icon={<Wand2 size={18} />}
        />
        <Feature
          title="Endless Queue"
          description="Automatically adds more tracks when your queue gets low."
          icon={<Infinity size={18} />}
        />
      </section>

      <section className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        {mixes.map((mix) => {
          const Icon = typeof mix.icon === "function" ? mix.icon : Sparkles;
          const cover = mix.tracks?.[0]
            ? getCoverArtUrl(
                mix.tracks[0].coverArt || mix.tracks[0].albumId || mix.tracks[0].id
              )
            : "";

          return (
            <article
              key={mix.id}
              className={`group relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br ${mix.accent} p-5 shadow-xl transition hover:-translate-y-1 hover:border-white/20 hover:shadow-2xl`}
            >
              {cover && (
                <img
                  src={cover}
                  alt=""
                  className="absolute inset-0 h-full w-full scale-125 object-cover opacity-15 blur-2xl transition group-hover:opacity-25"
                />
              )}

              <div className="absolute inset-0 bg-black/25" />

              <div className="relative z-10">
                <div className="mb-5 flex items-center justify-between">
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/30 px-3 py-1 text-xs font-bold text-zinc-200">
                    <Icon size={13} />
                    {mix.label}
                  </span>

                  <span className="text-xs font-semibold text-zinc-300">
                    {mix.tracks.length} tracks
                  </span>
                </div>

                <div className="mb-5 aspect-square overflow-hidden rounded-2xl bg-white/10 shadow-2xl">
                  {cover ? (
                    <img
                      src={cover}
                      alt={mix.title}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="grid h-full w-full place-items-center text-5xl">
                      ♪
                    </div>
                  )}
                </div>

                <p className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400">
                  {mix.subtitle}
                </p>

                <h2 className="mt-2 text-2xl font-black">{mix.title}</h2>

                <p className="mt-2 min-h-[72px] text-sm leading-6 text-zinc-300">
                  {mix.description}
                </p>

                <div className="mt-5 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      playMix(mix);
                    }}
                    disabled={!mix.tracks.length}
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-4 py-3 text-sm font-black text-black transition hover:scale-[1.02] disabled:opacity-40"
                  >
                    <Play size={16} fill="currentColor" />
                    Play
                  </button>

                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      queueMix(mix);
                    }}
                    disabled={!mix.tracks.length}
                    className="rounded-full border border-white/15 bg-white/10 px-4 py-3 text-sm font-black text-white transition hover:bg-white/15 disabled:opacity-40"
                  >
                    Queue
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </section>

      {infiniteAutoplay && (
        <div className="mt-8 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm font-semibold text-emerald-100">
          Infinite autoplay is active. When your queue gets low, the app will
          automatically add more Navidrome tracks.
        </div>
      )}
    </PageShell>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <div className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">
        {label}
      </div>
      <div className="mt-2 text-2xl font-black text-white">{value}</div>
    </div>
  );
}

function Feature({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-[var(--app-accent)]">
        {icon}
      </div>
      <h3 className="font-black text-white">{title}</h3>
      <p className="mt-1 text-sm leading-6 text-zinc-400">{description}</p>
    </div>
  );
}

// 🧠 BEHAVIOR HELPERS
function byRecentlyPlayed(tracks: any[]) {
  return tracks
    .filter((t) => t.playCount > 0)
    .sort((a, b) => (b.lastPlayed || 0) - (a.lastPlayed || 0));
}

function byObsessed(tracks: any[]) {
  return tracks
    .filter((t) => t.playCount > 5)
    .sort((a, b) => b.playCount - a.playCount);
}

function byHiddenGems(tracks: any[]) {
  return tracks
    .filter(
      (t) =>
        Number(t.playCount || 0) <= 2 &&
        Number(t.userRating || t.rating || 0) >= 4
    );
}

function byTopRated(tracks: any[]) {
  return tracks
    .filter((t) => Number(t.userRating || t.rating || 0) >= 4)
    .sort(
      (a, b) =>
        Number(b.userRating || b.rating || 0) -
        Number(a.userRating || a.rating || 0)
    );
}

