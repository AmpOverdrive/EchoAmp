"use client";

import { useEffect, useState } from "react";
import {
  getRandomSongs,
  getSimilarSongs,
  getStarredItems,
  getCoverArtUrl,
} from "@/lib/navidrome";
import { trackForPlayer } from "@/lib/normalizers";
import { usePlayerStore } from "@/lib/player-store";
import { useBehaviorStore } from "@/lib/listening-behavior-store";
import { PageShell, ShelfSkeleton } from "@/components/ui/AppPrimitives";
import {
  Flame,
  Guitar,
  Heart,
  Moon,
  Play,
  RefreshCw,
  Route,
  Zap,
  Radio,
} from "lucide-react";

type Mood = {
  id: string;
  title: string;
  description: string;
  label: string;
  tracks: any[];
  icon: any;
  accent: string;
};

function uniqueTracks(tracks: any[]) {
  const seen = new Set<string>();
  return tracks.filter((track) => {
    if (!track?.id || seen.has(track.id)) return false;
    seen.add(track.id);
    return true;
  });
}

function shuffle<T>(items: T[]) {
  return [...items].sort(() => Math.random() - 0.5);
}

function textFor(track: any) {
  return `${track.title || ""} ${track.artist || ""} ${track.album || ""} ${track.genre || ""}`.toLowerCase();
}

function matches(track: any, words: string[]) {
  const text = textFor(track);
  return words.some((word) => text.includes(word));
}

function byYear(track: any, min: number, max: number) {
  const year = Number(track.year || 0);
  return year >= min && year <= max;
}

function fillMood(primary: any[], fallback: any[], limit = 50) {
  return uniqueTracks([...primary, ...shuffle(fallback)]).slice(0, limit);
}

export default function MoodsPage() {
  const setTrack = usePlayerStore((s) => s.setTrack);
  const addToQueue = usePlayerStore((s) => s.addToQueue);
  const openQueue = usePlayerStore((s) => s.openQueue);
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const queue = usePlayerStore((s) => s.queue);
  const plays = useBehaviorStore((s) => s.plays);
  const skips = useBehaviorStore((s) => s.skips);
  const artistLikes = useBehaviorStore((s) => s.artistLikes);
  const artistSkips = useBehaviorStore((s) => s.artistSkips);

  const [moods, setMoods] = useState<Mood[]>([]);
  const [activeMood, setActiveMood] = useState<Mood | null>(null);
  const [loading, setLoading] = useState(true);
  const [radioEnabled, setRadioEnabled] = useState(true);

  async function loadMoods() {
    setLoading(true);

    try {
      const [randomA, randomB, randomC, starred] = await Promise.all([
        getRandomSongs(80),
        getRandomSongs(80),
        getRandomSongs(80),
        getStarredItems(),
      ]);

      const favorites = Array.isArray(starred?.songs) ? starred.songs : [];
      const library = uniqueTracks([...randomA, ...randomB, ...randomC, ...favorites]);

      const heavy = library.filter((t) =>
        matches(t, [
          "metal",
          "hard rock",
          "heavy",
          "rage",
          "angry",
          "fire",
          "war",
          "black",
          "death",
          "burn",
          "monster",
          "riot",
        ])
      );

      const alternative = library.filter((t) =>
        matches(t, [
          "alternative",
          "grunge",
          "post-grunge",
          "soundgarden",
          "nirvana",
          "pearl jam",
          "alice in chains",
          "stone temple",
          "foo fighters",
          "audioslave",
        ])
      );

      const classic = library.filter((t) =>
        byYear(t, 1960, 1989) ||
        matches(t, [
          "classic rock",
          "led zeppelin",
          "pink floyd",
          "queen",
          "aerosmith",
          "rolling stones",
          "the who",
          "fleetwood mac",
        ])
      );

      const acoustic = library.filter((t) =>
        matches(t, [
          "acoustic",
          "unplugged",
          "stripped",
          "piano",
          "live",
          "ballad",
          "slow",
        ])
      );

      const roadTrip = library.filter((t) =>
        Number(t.playCount || 0) >= 1 ||
        Number(t.userRating || t.rating || 0) >= 4
      );

      const hidden = library.filter((t) =>
        Number(t.playCount || 0) <= 2 &&
        Number(t.userRating || t.rating || 0) >= 4
      );

      setMoods([
        {
          id: "heavy",
          title: "Heavy Rock",
          description: "Harder riffs, louder guitars, and aggressive rock energy.",
          label: "Heavy",
          tracks: fillMood(heavy, library),
          icon: Flame,
          accent: "from-red-500/30 via-orange-500/20 to-zinc-950",
        },
        {
          id: "alternative",
          title: "Alternative & Grunge",
          description: "90s and 2000s alternative, grunge, and post-grunge moods.",
          label: "Alt",
          tracks: fillMood(alternative, library),
          icon: Guitar,
          accent: "from-purple-500/30 via-indigo-500/20 to-zinc-950",
        },
        {
          id: "classic",
          title: "Classic Rock",
          description: "Older rock staples and familiar timeless artists.",
          label: "Classic",
          tracks: fillMood(classic, library),
          icon: Guitar,
          accent: "from-yellow-500/30 via-amber-500/20 to-zinc-950",
        },
        {
          id: "acoustic",
          title: "Acoustic / Unplugged",
          description: "Softer rock, acoustic cuts, live tracks, and stripped songs.",
          label: "Chill",
          tracks: fillMood(acoustic, library),
          icon: Moon,
          accent: "from-sky-500/30 via-blue-500/20 to-zinc-950",
        },
        {
          id: "road-trip",
          title: "Road Trip Rock",
          description: "Familiar favorites built for long drives and replay.",
          label: "Drive",
          tracks: fillMood(roadTrip, [...favorites, ...library]),
          icon: Route,
          accent: "from-emerald-500/30 via-teal-500/20 to-zinc-950",
        },
        {
          id: "workout",
          title: "Workout Rock",
          description: "High-energy tracks for movement, pace, and momentum.",
          label: "Energy",
          tracks: fillMood([...heavy, ...roadTrip], library),
          icon: Zap,
          accent: "from-lime-500/30 via-green-500/20 to-zinc-950",
        },
        {
          id: "favorites",
          title: "Favorite Rock",
          description: "Your starred songs reshuffled into a mood station.",
          label: "Liked",
          tracks: fillMood(favorites, library),
          icon: Heart,
          accent: "from-rose-500/30 via-pink-500/20 to-zinc-950",
        },
        {
          id: "hidden",
          title: "Forgotten Rock Favorites",
          description: "Highly rated tracks you have not played much.",
          label: "Rediscover",
          tracks: fillMood(hidden, library),
          icon: RefreshCw,
          accent: "from-cyan-500/30 via-sky-500/20 to-zinc-950",
        },
      ]);
    } catch (error) {
      console.error("Failed to load moods:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMoods();
  }, []);

  function playMood(mood: Mood) {
    const tracks = uniqueTracks(mood.tracks).map(trackForPlayer);
    if (!tracks.length) return;

    setActiveMood(mood);
    setTrack(tracks[0], tracks);
  }

  function queueMood(mood: Mood) {
    uniqueTracks(mood.tracks)
      .map(trackForPlayer)
      .slice(0, 50)
      .forEach((track: any) => addToQueue(track));

    openQueue();
  }

  useEffect(() => {
    if (!radioEnabled || !activeMood || !currentTrack || !queue.length) return;

    const index = queue.findIndex((t: any) => t.id === currentTrack.id);
    const remaining = queue.length - index - 1;

    if (remaining > 5) return;

    async function extendQueue() {
      try {
        const existing = new Set(queue.map((t: any) => t.id));

        let similar: any[] = [];
        if (currentTrack?.id) {
          try {
            similar = await getSimilarSongs(currentTrack.id, 25);
          } catch {}
        }

        const random = await getRandomSongs(25);

        const moodTracks = activeMood?.tracks || [];

        // 🎧 Smart weighted blend
        function score(track: any) {
          let s = 0;

          const id = track.id;
          const playScore = plays[id] || 0;
          const skipScore = skips[id] || 0;

          const artist = track.artist;
          const artistBoost = artistLikes[artist] || 0;
          const artistPenalty = artistSkips[artist] || 0;

          s += playScore * 3;
          s -= skipScore * 5;

          // 🎸 artist-level learning (BIG upgrade)
          s += artistBoost * 4;
          s -= artistPenalty * 6;

          return s;
        }

        const more = uniqueTracks([
          ...moodTracks.slice(0, 14),   // 70%
          ...similar.slice(0, 4),       // 20%
          ...random.slice(0, 2),        // 10%
        ])
          .filter((t: any) => !existing.has(t.id))
          .slice(0, 20)
          .map(trackForPlayer);

        more.forEach((track: any) => addToQueue(track));
      } catch (error) {
        console.error("Mood radio failed:", error);
      }
    }

    extendQueue();
  }, [radioEnabled, activeMood, currentTrack, queue, addToQueue]);

  if (loading) {
    return (
      <PageShell className="p-5">
        <ShelfSkeleton />
        <ShelfSkeleton />
      </PageShell>
    );
  }

  return (
    <PageShell className="p-5 pb-32">
      <section className="relative mb-10 overflow-hidden rounded-[2rem] border border-white/10 bg-zinc-950 p-8 shadow-2xl">
        <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-purple-500/20 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 h-80 w-80 rounded-full bg-emerald-500/10 blur-3xl" />

        <div className="relative z-10 max-w-4xl">
          <div className="mb-4 flex items-center gap-2 text-sm font-black uppercase tracking-[0.3em] text-[var(--app-accent)]">
            <Guitar size={16} />
            Rock Mood Engine
          </div>

          <h1 className="text-5xl font-black tracking-tight md:text-7xl">
            Moods
          </h1>

          <p className="mt-4 max-w-3xl text-lg leading-8 text-zinc-300">
            Rock-focused mood stations built from your library using artist names,
            titles, albums, years, ratings, play counts, and smart fallbacks.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <button
              onClick={loadMoods}
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-6 py-3 text-sm font-black text-white transition hover:scale-105 hover:bg-white/10"
            >
              <RefreshCw size={17} />
              Refresh Moods
            </button>

            <button
              onClick={() => setRadioEnabled((v) => !v)}
              className={`inline-flex items-center gap-2 rounded-full border px-6 py-3 text-sm font-black transition hover:scale-105 ${
                radioEnabled
                  ? "border-emerald-400/40 bg-emerald-400/15 text-emerald-200"
                  : "border-white/15 bg-white/5 text-white"
              }`}
            >
              <Radio size={17} />
              Mood Radio {radioEnabled ? "On" : "Off"}
            </button>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        {moods.map((mood) => {
          const Icon = mood.icon;
          const cover = mood.tracks?.[0]
            ? getCoverArtUrl(mood.tracks[0].coverArt || mood.tracks[0].albumId || mood.tracks[0].id)
            : "";

          return (
            <article
              key={mood.id}
              className={`group relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br ${mood.accent} p-6 shadow-2xl transition duration-300 hover:-translate-y-2 hover:scale-[1.02] hover:border-white/20 hover:shadow-[0_20px_60px_rgba(0,0,0,0.6)]`}
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
                    {mood.label}
                  </span>

                  <span className="text-xs font-semibold text-zinc-300">
                    {mood.tracks.length} tracks
                  </span>
                </div>

                <div className="mb-5 aspect-square overflow-hidden rounded-2xl bg-white/10 shadow-2xl">
                  {cover ? (
                    <img
                      src={cover}
                      alt={mood.title}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="grid h-full w-full place-items-center text-5xl">
                      ♪
                    </div>
                  )}
                </div>

                <h2 className="text-2xl font-black tracking-tight">{mood.title}</h2>

                <p className="mt-3 min-h-[72px] text-sm leading-6 text-zinc-300">
                  {mood.description}
                </p>

                <div className="mt-5 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      playMood(mood);
                    }}
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-4 py-3 text-sm font-black text-black transition hover:scale-[1.02]"
                  >
                    <Play size={16} fill="currentColor" />
                    Play
                  </button>

                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      queueMood(mood);
                    }}
                    className="rounded-full border border-white/15 bg-white/10 px-4 py-3 text-sm font-black text-white transition hover:bg-white/15"
                  >
                    Queue
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </section>
    </PageShell>
  );
}
