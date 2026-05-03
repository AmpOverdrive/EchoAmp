"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState } from "react";
import {   getAlbum,
  getAlbumListByType,
  getRandomSongs,
  getPlaylists,
  getCoverArtUrl,
} from "@/lib/navidrome";
import {   ChevronRight,
  ChevronLeft,
  ListPlus,
  ListMusic,
  Play,
  RefreshCw,
} from "lucide-react";
import { usePlayerStore } from "@/lib/player-store";
import { useRecentlyPlayedStore } from "@/lib/recently-played-store";
import {
  normalizeAlbum,
  normalizePlaylist,
  normalizeTrack,
  trackForPlayer,
} from "@/lib/normalizers";
import {
  ErrorState,
  IconButton,
  MediaCard,
  PageShell,
  ShelfSkeleton,
} from "@/components/ui/AppPrimitives";

type Album = any;
type Song = any;
type Playlist = any;
type CarouselItem = {
  id: string;
  type: "album" | "track";
  label: string;
  title: string;
  subtitle: string;
  meta?: string;
  image: string;
  href?: string;
  raw: any;
};
type PlayerTrack = ReturnType<typeof trackForPlayer>;

function PlaylistCard({ playlist }: { playlist: Playlist }) {
  const normalized = normalizePlaylist(playlist);

  return (
    <div className="w-[220px] shrink-0">
      <MediaCard
        href={`/playlists/${normalized.id}`}
        image={normalized.coverArt}
        title={normalized.name}
        subtitle={`${normalized.songCount} songs`}
        fallback={<ListMusic size={42} />}
      />
    </div>
  );
}

function AlbumCard({ album }: { album: Album }) {
  const normalized = normalizeAlbum(album);

  return (
    <div className="w-[220px] shrink-0">
      <MediaCard
        href={`/albums/${normalized.id}`}
        subtitleHref={normalized.artistId ? `/artists/${normalized.artistId}` : undefined}
        image={normalized.coverArt}
        title={normalized.name}
        subtitle={normalized.artist}
        meta={normalized.year}
        initialRating={Number(normalized.raw?.userRating || normalized.raw?.rating || 0)}
      />
    </div>
  );
}

function SongCard({ song, songs }: { song: Song; songs: Song[] }) {
  const setTrack = usePlayerStore((s) => s.setTrack);
  const playNext = usePlayerStore((s) => s.playNext);
  const addToQueue = usePlayerStore((s) => s.addToQueue);
  const normalized = normalizeTrack(song);
  const track = trackForPlayer(song);
  const queue = songs.map(trackForPlayer);

  return (
    <div className="w-[220px] shrink-0">
      <div
className="group relative hover:scale-[1.01] transition-transform duration-300">
        <MediaCard
          itemId={normalized.id}
          itemType="track"
          image={normalized.coverArt}
          title={normalized.title}
          subtitle={normalized.artist}
          meta={normalized.album}
          metaHref={normalized.albumId ? `/albums/${normalized.albumId}` : undefined}
          initialRating={Number(normalized.raw?.userRating || normalized.raw?.rating || 0)}
          subtitleHref={normalized.artistId ? `/artists/${normalized.artistId}` : undefined}
          onClick={() => setTrack(track, queue)}
          onPlayNext={() => playNext(track)}
          onAddToQueue={() => addToQueue(track)}
        />
      </div>
    </div>
  );
}

function Row({
  title,
  albums,
  songs,
  playlists,
}: {
  title: string;
  albums?: Album[];
  songs?: Song[];
  playlists?: Playlist[];
}) {
  const rowRef = useRef<HTMLDivElement | null>(null);
  const items = albums || songs || playlists || [];

  if (!items.length) return null;

  function scrollRow(direction: "left" | "right") {
    rowRef.current?.scrollBy({
      left: direction === "right" ? 700 : -700,
      behavior: "smooth",
    });
  }

  return (
    <section className="mb-10">
      <div className="mb-4 flex items-center justify-between">
        <button className="app-section-title flex items-center gap-2 hover:underline">
          {title}
          <ChevronRight size={19} />
        </button>

        <div className="flex gap-2">
          <IconButton
            onClick={() => scrollRow("left")}
            aria-label={`Scroll ${title} left`}
          >
            <ChevronLeft size={20} />
          </IconButton>

          <IconButton
            onClick={() => scrollRow("right")}
            aria-label={`Scroll ${title} right`}
          >
            <ChevronRight size={20} />
          </IconButton>
        </div>
      </div>

      <div ref={rowRef} className="flex scroll-smooth gap-4 overflow-x-auto pb-2">
        {albums?.map((album) => (
          <AlbumCard key={album.id} album={album} />
        ))}

        {songs?.map((song) => (
          <SongCard key={song.id} song={song} songs={songs} />
        ))}

        {playlists?.map((playlist) => (
          <PlaylistCard key={playlist.id} playlist={playlist} />
        ))}
      </div>
    </section>
  );
}

function HomeCarousel({ items }: { items: CarouselItem[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const setTrack = usePlayerStore((s) => s.setTrack);
  const addToQueue = usePlayerStore((s) => s.addToQueue);
  const active = items[activeIndex] || items[0];

  useEffect(() => {
    if (activeIndex >= items.length) setActiveIndex(0);
  }, [activeIndex, items.length]);

  useEffect(() => {
    if (items.length <= 1) return;

    const timer = window.setInterval(() => {
      setActiveIndex((index) => (index + 1) % items.length);
    }, 8000);

    return () => window.clearInterval(timer);
  }, [items.length]);

  if (!active) return null;

  function move(direction: "previous" | "next") {
    setActiveIndex((index) => {
      if (direction === "previous") {
        return index === 0 ? items.length - 1 : index - 1;
      }

      return (index + 1) % items.length;
    });
  }

  async function getItemTracks(item: CarouselItem): Promise<PlayerTrack[]> {
    if (item.type === "track") return [trackForPlayer(item.raw)];

    const album = await getAlbum(item.id);
    const songs = album?.song ? (Array.isArray(album.song) ? album.song : [album.song]) : [];
    return songs.filter(Boolean).map(trackForPlayer);
  }

  async function playItem(item: CarouselItem) {
    setBusy(true);
    try {
      const tracks = await getItemTracks(item);
      if (tracks.length) setTrack(tracks[0], tracks);
    } finally {
      setBusy(false);
    }
  }

  async function queueItem(item: CarouselItem) {
    setBusy(true);
    try {
      const tracks = await getItemTracks(item);
      tracks.forEach((track) => addToQueue(track));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mb-10 overflow-hidden rounded-[1.6rem] border border-white/10 bg-[color-mix(in_srgb,var(--app-shell)_80%,transparent)] shadow-[0_24px_70px_rgba(0,0,0,0.34)] ring-1 ring-white/[0.03]">
      <div className="relative min-h-[320px]">
        {active.image && (
          <img
            src={active.image}
            alt=""
            className="absolute inset-0 h-full w-full scale-125 object-cover opacity-40 blur-3xl saturate-150"
            aria-hidden="true"
          />
        )}
        <div className="absolute inset-0 bg-[linear-gradient(100deg,color-mix(in_srgb,var(--app-shell)_85%,black)_0%,color-mix(in_srgb,var(--app-shell)_60%,transparent)_50%,color-mix(in_srgb,var(--app-panel)_80%,black)_100%)]" />

        <div className="relative grid min-h-[320px] grid-cols-1 items-center gap-7 p-5 md:grid-cols-[minmax(220px,320px)_1fr] md:p-7">
          <Link
            href={active.href || "#"}
            className="group relative mx-auto block aspect-square w-full max-w-[280px] overflow-hidden rounded-[1.35rem] bg-[var(--app-panel)] shadow-[0_26px_70px_rgba(0,0,0,0.44)] ring-1 ring-white/10 transition-transform duration-300 hover:scale-[1.01] md:mx-0"
          >
            {active.image ? (
              <img
                src={active.image}
                alt={active.title}
                className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.045]"
              />
            ) : (
              <div className="grid h-full w-full place-items-center text-[var(--app-muted)]">
                <Music2Fallback />
              </div>
            )}
          </Link>

          <div className="min-w-0">
            <div className="app-label mb-4 text-[var(--app-accent)]">
              {active.label}
            </div>
            <Link href={active.href || "#"} className="group block">
              <h1 className="max-w-4xl truncate text-[clamp(2.4rem,5vw,5.6rem)] font-[900] leading-[0.98] tracking-tight text-[var(--foreground)] transition-all duration-500 group-hover:text-[var(--app-accent)]">
                {active.title}
              </h1>
            </Link>
            <div className="mt-4 flex flex-wrap items-center gap-2 text-base font-medium text-[var(--app-muted)] opacity-90">
              <span>{active.subtitle}</span>
              {active.meta && (
                <>
                  <span className="opacity-45">•</span>
                  <span>{active.meta}</span>
                </>
              )}
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={() => playItem(active)}
                disabled={busy}
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-[var(--app-accent-strong)] px-6 text-sm font-bold text-slate-950 shadow-[0_20px_50px_var(--app-accent-soft)] transition hover:scale-[1.04] active:scale-[0.98] hover:shadow-[0_0_30px_var(--app-accent-soft)] disabled:opacity-60"
              >
                <Play size={18} fill="currentColor" />
                Play
              </button>
              <button
                type="button"
                onClick={() => queueItem(active)}
                disabled={busy}
                className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/15 bg-white/[0.08] px-4 text-sm font-bold text-[var(--foreground)] transition hover:bg-white/[0.15] hover:scale-[1.02] disabled:opacity-60"
              >
                <ListPlus size={17} />
                Add to queue
              </button>
              {active.href && (
                <Link
                  href={active.href}
                  className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/15 bg-white/[0.08] px-4 text-sm font-bold text-[var(--foreground)] shadow-md shadow-black/20 transition hover:bg-white/[0.15] hover:scale-[1.04] active:scale-[0.98] hover:shadow-[0_0_30px_var(--app-accent-soft)] hover:text-[var(--app-accent)]"
                >
                  Open
                </Link>
              )}
            </div>
          </div>

          {items.length > 1 && (
            <>
              <button
                type="button"
                onClick={() => move("previous")}
                className="absolute left-4 top-1/2 hidden h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-white/10 bg-black/25 text-white shadow-xl backdrop-blur transition hover:bg-black/40 md:grid"
                aria-label="Previous featured item"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                type="button"
                onClick={() => move("next")}
                className="absolute right-4 top-1/2 hidden h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-white/10 bg-black/25 text-white shadow-xl backdrop-blur transition hover:bg-black/40 md:grid"
                aria-label="Next featured item"
              >
                <ChevronRight size={20} />
              </button>

              <div className="absolute bottom-5 right-6 flex gap-2">
                {items.map((item, index) => (
                  <button
                    key={`${item.type}-${item.id}`}
                    type="button"
                    onClick={() => setActiveIndex(index)}
                    className={`h-2 rounded-full transition ${
                      index === activeIndex
                        ? "w-8 bg-[var(--app-accent)]"
                        : "w-2 bg-white/25 hover:bg-white/45"
                    }`}
                    aria-label={`Show ${item.title}`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

function Music2Fallback() {
  return <ListMusic size={52} />;
}

function shuffleItems<T>(items: T[]) {
  return [...items].sort(() => Math.random() - 0.5);
}

function formatDisplayValue(value: any, fallback = "") {
  if (value === null || value === undefined || value === "") return fallback;

  return String(value)
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

export default function HomePage() {
  const recentTracks = useRecentlyPlayedStore((s) => s.recentTracks);
  const [recentlyPlayed, setRecentlyPlayed] = useState<Album[]>([]);
  const [favorites, setFavorites] = useState<Album[]>([]);
  const [mostPlayed, setMostPlayed] = useState<Album[]>([]);
  const [recentlyAdded, setRecentlyAdded] = useState<Album[]>([]);
  const [discover, setDiscover] = useState<Album[]>([]);
  const [discoverSongs, setDiscoverSongs] = useState<Song[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadHome = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [
        recentAlbums,
        starred,
        frequent,
        newest,
        randomAlbums,
        randomSongs,
        playlistData,
      ] = await Promise.all([
        getAlbumListByType("recent", 12),
        getAlbumListByType("starred", 12),
        getAlbumListByType("frequent", 12),
        getAlbumListByType("newest", 12),
        getAlbumListByType("random", 12),
        getRandomSongs(12),
        getPlaylists(),
      ]);

      setRecentlyPlayed(recentAlbums.filter(Boolean));
      setFavorites(starred.filter(Boolean));
      setMostPlayed(frequent.filter(Boolean));
      setRecentlyAdded(newest.filter(Boolean));
      setDiscover(randomAlbums.filter(Boolean));
      setDiscoverSongs(randomSongs.filter(Boolean));
      setPlaylists(playlistData.filter(Boolean));
    } catch (error) {
      console.error("Failed to load home:", error);
      setError("Unable to load your home page.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHome();
  }, [loadHome]);

  const carouselItems = useMemo(() => {
    return shuffleItems(favorites)
      .filter(Boolean)
      .slice(0, 12)
      .map((album: any) => ({
        id: album.id,
        type: "album" as const,
        label: "Favorite Album",
        title: formatDisplayValue(album.name || album.title || "Unknown Album"),
        subtitle: formatDisplayValue(album.artist || "Unknown Artist"),
        meta: album.year ? String(album.year) : "",
        image: getCoverArtUrl(album.coverArt || album.id),
        href: `/albums/${album.id}`,
        raw: album,
      }));
  }, [favorites]);

  if (loading) {
    return (
      <PageShell className="p-5">
        <div className="space-y-10">
          <ShelfSkeleton />
          <ShelfSkeleton />
          <ShelfSkeleton />
        </div>
      </PageShell>
    );
  }

  if (error) {
    return (
      <PageShell className="p-5">
        <ErrorState
          title={error}
          description="Check your Navidrome connection and try again."
          onRetry={loadHome}
        />
      </PageShell>
    );
  }

  return (
    <PageShell className="p-5">
      <HomeCarousel items={carouselItems} />
      {recentTracks.length > 0 ? (
        <Row title="Recently Played" songs={recentTracks} />
      ) : (
        <Row title="Recently Played" albums={recentlyPlayed} />
      )}
      <Row title="Personal Favorites" albums={favorites} />
      <Row title="Most Played" albums={mostPlayed} />
      <Row title="Recently Added" albums={recentlyAdded} />
      <Row title="Discover" albums={discover} />
      <Row title="Playlists" playlists={playlists} />
      <Row title="Discover Songs" songs={discoverSongs} />
    </PageShell>
  );
}
