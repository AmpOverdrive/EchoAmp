"use client";

import Link from "next/link";
import type { ComponentType, CSSProperties, ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  AlertCircle,
  ChevronDown,
  Download,
  ExternalLink,
  Heart,
  Info,
  ListPlus,
  Loader2,
  MoreHorizontal,
  Play,
  Radio,
  RefreshCw,
  Share2,
  Star,
  StepForward,
} from "lucide-react";
import { useFavoritesStore } from "@/lib/favorites-store";
import {
  addSongToPlaylist,
  createPlaylist,
  getAlbum,
  getDownloadUrl,
  getPlaylists,
  getTopSongs,
  rateItem,
} from "@/lib/navidrome";
import { trackForPlayer } from "@/lib/normalizers";
import { usePlayerStore } from "@/lib/player-store";
import { formatDisplayValue } from "@/lib/text-utils";
import { AppModal } from "@/components/ui/AppModal";
import { useToast } from "@/components/ui/ToastProvider";

type Tone = "default" | "primary" | "subtle" | "danger";

type PlaylistSummary = {
  id: string;
  name: string;
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

const toneClasses: Record<Tone, string> = {
  default:
    "border-[var(--app-border)] bg-[var(--app-panel)] text-[var(--foreground)] hover:bg-[var(--app-panel-strong)]",
  primary:
    "border-[var(--app-accent-strong)] bg-[var(--app-accent-strong)] text-slate-950 hover:brightness-110",
  subtle:
    "border-transparent bg-transparent text-[var(--app-muted)] hover:bg-[var(--app-panel)] hover:text-[var(--foreground)]",
  danger:
    "border-red-500/40 bg-red-500/10 text-red-200 hover:bg-red-500/20",
};

export function PageShell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cx(
        "min-h-screen bg-[var(--app-bg)] pb-32 text-[var(--foreground)] transition-colors",
        className
      )}
    >
      {children}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  eyebrow,
  actions,
}: {
  title: string;
  description?: string;
  eyebrow?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && (
          <div className="app-label mb-2">
            {eyebrow}
          </div>
        )}
        <h1 className="app-title truncate">{title}</h1>
        {description && (
          <p className="app-muted mt-2 max-w-2xl">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2.5">{actions}</div>}
    </div>
  );
}

export function ToolbarButton({
  children,
  tone = "default",
  active = false,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: Tone;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      {...props}
      className={cx(
        "inline-flex h-9 items-center justify-center gap-2 rounded-lg border px-3.5 text-sm font-semibold transition disabled:pointer-events-none disabled:opacity-50",
        toneClasses[tone],
        active && "border-[var(--app-accent)] text-[var(--app-accent)]",
        className
      )}
    >
      {children}
    </button>
  );
}

export function IconButton({
  children,
  tone = "default",
  active = false,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: Tone;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      {...props}
      className={cx(
        "inline-flex h-9 w-9 items-center justify-center rounded-lg border text-sm transition disabled:pointer-events-none disabled:opacity-50",
        toneClasses[tone],
        active && "border-[var(--app-accent)] text-[var(--app-accent)]",
        className
      )}
    >
      {children}
    </button>
  );
}

export function FavoriteButton({
  id,
  label,
  size = "md",
  className,
  onAfterToggle,
}: {
  id?: string | null;
  label: string;
  size?: "sm" | "md" | "lg";
  className?: string;
  onAfterToggle?: (favorite: boolean) => void;
}) {
  const favorites = useFavoritesStore((s) => s.favorites);
  const toggleFavorite = useFavoritesStore((s) => s.toggleFavorite);
  const active = Boolean(id && favorites[id]);

  return (
    <button
      type="button"
      disabled={!id}
      onClick={async (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (!id) return;
        await toggleFavorite(id);
        onAfterToggle?.(!active);
      }}
      aria-pressed={active}
      aria-label={active ? `Remove ${label} from favorites` : `Add ${label} to favorites`}
      className={cx(
        "inline-flex items-center justify-center rounded-lg border border-transparent transition disabled:pointer-events-none disabled:opacity-40",
        size === "sm" && "h-7 w-7",
        size === "md" && "h-9 w-9",
        size === "lg" && "h-11 w-11",
        className,
        active
          ? "bg-red-500/10 text-red-500 hover:bg-red-500/15"
          : "text-[var(--app-muted)] hover:bg-[var(--app-panel)] hover:text-red-400",
      )}
    >
      <Heart
        size={size === "sm" ? 16 : size === "lg" ? 22 : 19}
        fill={active ? "currentColor" : "none"}
      />
    </button>
  );
}

export function RatingControl({
  value,
  label,
  onRate,
  size = 19,
  readOnly = false,
  className,
}: {
  value?: number;
  label: string;
  onRate?: (rating: number) => void | Promise<void>;
  size?: number;
  readOnly?: boolean;
  className?: string;
}) {
  const current = Number(value || 0);

  return (
    <div
      className={cx("flex items-center gap-1", className)}
      aria-label={`${label} rating: ${current || "unrated"}`}
    >
      {[1, 2, 3, 4, 5].map((star) => {
        const active = current >= star;
        const icon = (
          <Star
            size={size}
            fill={active ? "currentColor" : "none"}
            className={active ? "text-amber-300" : "text-[var(--app-muted)]"}
          />
        );

        if (readOnly) {
          return <span key={star}>{icon}</span>;
        }

        return (
          <button
            key={star}
            type="button"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onRate?.(star === current ? 0 : star);
            }}
            className="rounded text-[var(--app-muted)] transition hover:text-amber-300 focus:outline-none focus:ring-2 focus:ring-[var(--app-accent)]"
            aria-label={`Set ${label} rating to ${star}`}
          >
            {icon}
          </button>
        );
      })}
    </div>
  );
}

export function TextInput({
  icon: Icon,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  icon?: ComponentType<{ size?: number; className?: string }>;
}) {
  return (
    <div className="relative">
      {Icon && (
        <Icon
          size={17}
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--app-muted)]"
        />
      )}
      <input
        {...props}
        className={cx(
          "h-10 w-full rounded-lg border border-[var(--app-border)] bg-[var(--app-shell)] px-3.5 text-sm font-medium text-[var(--foreground)] outline-none transition placeholder:text-[var(--app-muted)] focus:border-[var(--app-accent)]",
          Icon && "pl-10",
          className
        )}
      />
    </div>
  );
}

export function SelectField({
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cx(
        "h-9 rounded-lg border border-[var(--app-border)] bg-[var(--app-panel)] px-3 text-sm font-semibold text-[var(--foreground)] outline-none transition focus:border-[var(--app-accent)]",
        className
      )}
    >
      {children}
    </select>
  );
}


function MediaCardFloatingMenu({
  anchorRef,
  panelRef,
  displayTitle,
  mediaEntity,
  href,
  rating,
  onRate,
  onPlay,
  onRadio,
  onAddToPlaylist,
  onCreatePlaylist,
  onDownload,
  onShare,
  onClose,
  radioLabel,
}: {
  anchorRef: React.RefObject<HTMLElement | null>;
  panelRef: React.RefObject<HTMLDivElement | null>;
  displayTitle: string;
  mediaEntity: { type: "album" | "artist" | "track"; id: string };
  href?: string;
  rating: number;
  onRate: (rating: number) => void | Promise<void>;
  onPlay: () => void | Promise<void>;
  onRadio: () => void | Promise<void>;
  onAddToPlaylist: (playlistId: string) => void | Promise<void>;
  onCreatePlaylist: (name: string) => void | Promise<void>;
  onDownload: () => void;
  onShare: () => void | Promise<void>;
  onClose: () => void;
  radioLabel: string;
}) {
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [showPlaylists, setShowPlaylists] = useState(false);
  const [playlists, setPlaylists] = useState<PlaylistSummary[]>([]);
  const [playlistLoading, setPlaylistLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [playlistName, setPlaylistName] = useState("");
  const { showToast } = useToast();

  useEffect(() => {
    function updatePosition() {
      const anchor = anchorRef.current;
      if (!anchor) return;

      const rect = anchor.getBoundingClientRect();
      const width = 244;
      const margin = 12;

      setPosition({
        top: Math.min(window.innerHeight - margin, rect.bottom + 8),
        left: Math.min(
          window.innerWidth - width - margin,
          Math.max(margin, rect.right - width)
        ),
      });
    }

    updatePosition();

    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [anchorRef]);

  useEffect(() => {
    if (!showPlaylists) return;

    let cancelled = false;
    getPlaylists()
      .then((items) => {
        if (!cancelled) setPlaylists((items || []).filter(Boolean));
      })
      .catch((error) => console.error("Failed to load playlists:", error))
      .finally(() => {
        if (!cancelled) setPlaylistLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [showPlaylists]);

  if (typeof document === "undefined") return null;

  const itemClass =
    "flex w-full items-center gap-3 whitespace-nowrap px-3 py-2.5 text-left text-sm font-semibold text-[var(--foreground)] transition hover:bg-white/10";

  async function submitCreatePlaylist() {
    const name = playlistName.trim();
    if (!name) return;
    await onCreatePlaylist(name);
    setPlaylistName("");
    setCreateOpen(false);
    onClose();
    showToast({ title: "Playlist created", description: name, tone: "success" });
  }

  return createPortal(
    <>
    <div
        ref={panelRef}
        style={{ top: position.top, left: position.left, width: 244 }}
        className="fixed z-[9999] overflow-visible rounded-2xl border border-white/10 bg-[color-mix(in_srgb,var(--app-shell)_92%,black)] py-1 shadow-2xl shadow-black/70 backdrop-blur-xl"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
        }}
      >
      <button
        type="button"
        onClick={async () => {
          await onPlay();
          onClose();
        }}
        className={itemClass}
      >
        <Play size={17} /> Play
      </button>

      <button
        type="button"
        onClick={async () => {
          await onRadio();
          onClose();
        }}
        className={itemClass}
      >
        <Radio size={17} /> {radioLabel}
      </button>

      <button
        type="button"
        onClick={() => {
          setPlaylistLoading(true);
          setShowPlaylists((value) => !value);
        }}
        className={itemClass}
      >
        <ListPlus size={17} /> Add to playlist
        <ChevronDown size={14} className="ml-auto opacity-60" />
      </button>

      {showPlaylists && (
        <div className="mx-2 mb-2 max-h-56 overflow-y-auto rounded-xl border border-white/10 bg-black/20 py-1">
          {playlistLoading && (
            <div className="px-3 py-2 text-xs text-[var(--app-muted)]">
              Loading playlists...
            </div>
          )}

          {!playlistLoading && playlists.length === 0 && (
            <div className="px-3 py-2 text-xs text-[var(--app-muted)]">
              No playlists found.
            </div>
          )}

          {playlists.map((playlist) => (
            <button
              key={playlist.id}
              type="button"
              onClick={async () => {
                await onAddToPlaylist(playlist.id);
                showToast({ title: "Added to playlist", description: playlist.name, tone: "success" });
                onClose();
              }}
              className="flex w-full items-center gap-2 whitespace-nowrap px-3 py-2 text-left text-xs font-semibold text-[var(--foreground)] hover:bg-white/10"
            >
              <ListPlus size={14} />
              <span className="min-w-0 flex-1 truncate">{playlist.name}</span>
            </button>
          ))}

          <div className="my-1 border-t border-white/10" />

          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="flex w-full items-center gap-2 whitespace-nowrap px-3 py-2 text-left text-xs font-bold text-[var(--app-accent)] hover:bg-white/10"
          >
            <ListPlus size={14} />
            Create new playlist
          </button>
        </div>
      )}

      <div className="my-1 border-t border-white/10" />

      <div className="flex items-center justify-between gap-2 px-3 py-2.5">
        <span className="inline-flex items-center gap-3 whitespace-nowrap text-sm font-semibold">
          <Heart size={17} /> Favorite
        </span>
        <FavoriteButton id={mediaEntity.id} label={displayTitle} size="sm" />
      </div>

      <div className="px-3 py-2.5">
        <div className="mb-2 inline-flex items-center gap-3 whitespace-nowrap text-sm font-semibold">
          <Star size={17} /> Set rating
        </div>
        <RatingControl value={rating} label={displayTitle} onRate={onRate} size={18} />
      </div>

      <div className="my-1 border-t border-white/10" />

      <button
        type="button"
        onClick={() => {
          onDownload();
          onClose();
        }}
        className={itemClass}
      >
        <Download size={17} /> Download
      </button>

      <button
        type="button"
        onClick={async () => {
          await onShare();
          onClose();
        }}
        className={itemClass}
      >
        <Share2 size={17} /> Share item
      </button>

      <div className="my-1 border-t border-white/10" />

      {href && (
        <Link href={href} className={itemClass} onClick={onClose}>
          <ExternalLink size={17} /> Go to
        </Link>
      )}

      {href && (
        <Link href={href} className={itemClass} onClick={onClose}>
          <Info size={17} /> Get info
        </Link>
      )}
    </div>
    <AppModal
      open={createOpen}
      title="Create playlist"
      description={`Add ${displayTitle} to a new playlist.`}
      onClose={() => setCreateOpen(false)}
      footer={
        <>
          <button type="button" onClick={() => setCreateOpen(false)} className="rounded-xl px-4 py-2 text-sm font-semibold text-white/70 transition hover:bg-white/10 hover:text-white">Cancel</button>
          <button type="button" onClick={submitCreatePlaylist} className="rounded-xl bg-[var(--app-accent-strong)] px-4 py-2 text-sm font-bold text-black transition hover:brightness-110">Create</button>
        </>
      }
    >
      <input
        value={playlistName}
        onChange={(event) => setPlaylistName(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") submitCreatePlaylist();
        }}
        autoFocus
        placeholder="Playlist name"
        className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-[var(--app-accent)]"
      />
    </AppModal>
    </>,
    document.body
  );
}

export function MediaCard({
  href,
  itemId,
  itemType,
  subtitleHref,
  metaHref,
  image,
  title,
  subtitle,
  meta,
  initialRating = 0,
  fallback,
  selected,
  onClick,
  onPlayNext,
  onAddToQueue,
}: {
  href?: string;
  itemId?: string;
  itemType?: "album" | "artist" | "track";
  subtitleHref?: string;
  metaHref?: string;
  image?: string;
  title: unknown;
  subtitle?: unknown;
  meta?: unknown;
  initialRating?: number;
  fallback?: ReactNode;
  selected?: boolean;
  onClick?: () => void;
  onPlayNext?: () => void;
  onAddToQueue?: () => void;
}) {
  const displayTitle = formatDisplayValue(title, "Untitled");
  const displaySubtitle = formatDisplayValue(subtitle);
  const displayMeta = formatDisplayValue(meta);
  const initialRatingKey = itemId || href || displayTitle;
  const [ratingState, setRatingState] = useState({
    key: initialRatingKey,
    value: Number(initialRating || 0),
  });
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement | null>(null);
  const menuPanelRef = useRef<HTMLDivElement | null>(null);
  const favorites = useFavoritesStore((s) => s.favorites);
  const setTrack = usePlayerStore((s) => s.setTrack);
  const playNext = usePlayerStore((s) => s.playNext);
  const addToQueue = usePlayerStore((s) => s.addToQueue);

  const mediaEntity = useMemo(() => {
    if (itemId && itemType) {
      return { type: itemType, id: itemId } as const;
    }

    if (!href) return null;
    const match = href.match(/^\/(albums|artists)\/([^/?#]+)/);
    if (!match) return null;
    return {
      type: match[1] === "albums" ? "album" : "artist",
      id: decodeURIComponent(match[2]),
    } as const;
  }, [href, itemId, itemType]);
  const isFavorite = Boolean(mediaEntity?.id && favorites[mediaEntity.id]);

  const ratingKey = mediaEntity?.id || href || displayTitle;
  const rating = ratingState.key === ratingKey ? ratingState.value : Number(initialRating || 0);

  useEffect(() => {
    if (!menuOpen) return;

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (menuButtonRef.current?.contains(target)) return;
      if (menuPanelRef.current?.contains(target)) return;
      setMenuOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  async function handleRate(nextRating: number) {
    if (!mediaEntity?.id) return;
    setRatingState({ key: ratingKey, value: nextRating });
    try {
      await rateItem(mediaEntity.id, nextRating);
    } catch (error) {
      console.error("Rating sync failed:", error);
    }
  }

  async function handleShare() {
    const url = href ? `${window.location.origin}${href}` : displayTitle;
    try {
      if (navigator.share) {
        await navigator.share({ title: displayTitle, url });
      } else {
        await navigator.clipboard?.writeText(url);
      }
    } catch {
      // Share dialogs can be cancelled by the user.
    }
  }

  function handleDownload() {
    if (!mediaEntity) return;

    if (mediaEntity.type === "track") {
      window.location.href = getDownloadUrl(mediaEntity.id);
      return;
    }

    if (href) window.location.href = href;
  }

  async function loadEntityTracks() {
    if (!mediaEntity || mediaEntity.type === "track") return [];

    if (mediaEntity.type === "album") {
      const album = await getAlbum(mediaEntity.id);
      const songs = album?.song || [];
      return Array.isArray(songs) ? songs : [songs];
    }

    const songs = await getTopSongs(displayTitle, 50);
    return Array.isArray(songs) ? songs : [songs];
  }

  async function playEntity() {
    if (!mediaEntity || mediaEntity.type === "track") {
      onClick?.();
      return;
    }

    try {
      const tracks = (await loadEntityTracks()).filter(Boolean).map(trackForPlayer);
      if (tracks.length) {
        setTrack(tracks[0], tracks);
      } else if (href) {
        window.location.href = href;
      }
    } catch (error) {
      console.error("Failed to play media card:", error);
      if (href) window.location.href = href;
    }
  }

  async function queueEntity(mode: "next" | "end") {
    if (!mediaEntity) return;

    if (mediaEntity.type === "track") {
      if (mode === "next") onPlayNext?.();
      else onAddToQueue?.();
      return;
    }

    try {
      const tracks = (await loadEntityTracks()).filter(Boolean).map(trackForPlayer);
      if (!tracks.length) return;

      if (mode === "next") {
        tracks
          .slice()
          .reverse()
          .forEach((track) => playNext(track));
      } else {
        tracks.forEach((track) => addToQueue(track));
      }
    } catch (error) {
      console.error("Failed to queue media card:", error);
    }
  }

  async function addEntityToPlaylist(playlistId: string) {
    if (!mediaEntity) return;

    try {
      const tracks =
        mediaEntity.type === "track"
          ? [{ id: mediaEntity.id }]
          : (await loadEntityTracks()).filter(Boolean);

      for (const track of tracks) {
        if (track?.id) {
          await addSongToPlaylist(playlistId, track.id);
        }
      }
    } catch (error) {
      console.error("Failed to add item to playlist:", error);
    }
  }

  async function createPlaylistWithEntity(name: string) {
    if (!mediaEntity) return;

    try {
      const response = await createPlaylist(name);
      const playlistId =
        response?.playlist?.id ||
        response?.id ||
        response?.["subsonic-response"]?.playlist?.id;

      if (playlistId) {
        await addEntityToPlaylist(playlistId);
      }
    } catch (error) {
      console.error("Failed to create playlist:", error);
    }
  }

  const overlayControlClass =
    "app-media-control grid place-items-center rounded-full bg-white/95 text-black ring-1 ring-black/5 transition duration-200 hover:scale-105 hover:bg-white";

  const radioLabel =
    mediaEntity?.type === "artist"
      ? "Artist radio"
      : mediaEntity?.type === "track"
        ? "Song radio"
        : "Album radio";

  const overlay = mediaEntity ? (
    <div className="app-media-overlay pointer-events-none absolute inset-0 z-10 flex flex-col justify-between rounded-[1.15rem] p-3 opacity-0 backdrop-blur-[2px] transition duration-300 group-hover:pointer-events-auto group-hover:opacity-100">
      <div className="flex items-start justify-between gap-2">
        <FavoriteButton
          id={mediaEntity.id}
          label={displayTitle}
          size="md"
          className="border-white/20 bg-black/25 shadow-lg shadow-black/20 backdrop-blur-md hover:bg-white/10"
        />
        <RatingControl
          value={rating}
          label={displayTitle}
          onRate={handleRate}
          size={17}
          className="rounded-full bg-black/25 px-1.5 py-1 text-white shadow-lg shadow-black/20 backdrop-blur-md"
        />
      </div>

      <div className="flex translate-y-1 items-center justify-center gap-4 transition duration-300 group-hover:translate-y-0">
        <button
          type="button"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            queueEntity("end");
          }}
          className={cx(overlayControlClass, "h-10 w-10")}
          aria-label={`${displayTitle} actions`}
        >
          <Radio size={18} />
        </button>
        <button
          type="button"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            playEntity();
          }}
          className={cx(overlayControlClass, "h-14 w-14")}
          aria-label={`Play ${displayTitle}`}
        >
          <Play size={24} fill="currentColor" />
        </button>
        <button
          type="button"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            queueEntity("next");
          }}
          className={cx(overlayControlClass, "h-10 w-10")}
          aria-label={`Play next ${displayTitle}`}
        >
          <StepForward size={18} />
        </button>
      </div>

      <div className="flex items-end justify-between">
        <button
          type="button"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            setMenuOpen((open) => !open);
          }}
          className="grid h-8 w-8 place-items-center rounded-full text-white/90 transition hover:bg-white/10 hover:text-white"
          aria-label={`${displayTitle} quick actions`}
        >
          <ChevronDown size={19} />
        </button>
        <button
          ref={menuButtonRef}
          type="button"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            setMenuOpen((open) => !open);
          }}
          className="grid h-8 w-8 place-items-center rounded-full text-white/90 transition hover:bg-white/10 hover:text-white"
          aria-label={`More actions for ${displayTitle}`}
        >
          <MoreHorizontal size={22} />
        </button>
      </div>

    </div>
  ) : null;

  const imageContent = (
    <div className="app-media-art relative aspect-square w-full overflow-visible bg-[var(--app-panel-strong)] ring-1 ring-white/[0.06]">
      {image ? (
        <img
          src={image}
          alt={displayTitle}
          className="h-full w-full rounded-[1.15rem] object-cover transition duration-500 group-hover:scale-[1.035]"
        />
      ) : (
        <div className="grid h-full w-full place-items-center rounded-[1.15rem] bg-[linear-gradient(135deg,var(--app-panel),var(--app-shell))] text-[var(--app-muted)]">
          {fallback}
        </div>
      )}
      {href && (
        <Link
          href={href}
          className="absolute inset-0 z-[1]"
          aria-label={`Open ${displayTitle}`}
        />
      )}
      {!href && onClick && (
        <button
          type="button"
          onClick={onClick}
          className="absolute inset-0 z-[1]"
          aria-label={`Open ${displayTitle}`}
        />
      )}
      {isFavorite && (
        <div
          className="pointer-events-none absolute left-0 top-0 z-[8] h-0 w-0 border-r-[38px] border-t-[38px] border-r-transparent border-t-red-500"
          aria-hidden="true"
        />
      )}
      {overlay}
    </div>
  );

  const titleContent = (
    <div className="app-card-title truncate">
      {displayTitle}
    </div>
  );

  const titleAction = href ? (
    <Link href={href} className="block hover:text-[var(--app-accent)]">
      {titleContent}
    </Link>
  ) : onClick ? (
    <button type="button" onClick={onClick} className="block w-full text-left hover:text-[var(--app-accent)]">
      {titleContent}
    </button>
  ) : (
    titleContent
  );

  const content = (
    <article
      className={cx(
        "app-media-card group relative overflow-visible rounded-2xl bg-transparent text-left transition",
        selected && "ring-2 ring-[var(--app-accent)]"
      )}
    >
      {imageContent}
      <div className="px-0 pb-1 pt-3">
        {titleAction}
        {displaySubtitle && (
          <div className="app-muted mt-1 truncate">
            {subtitleHref ? (
              <Link
                href={subtitleHref}
                className="relative z-10 hover:text-[var(--app-accent)] hover:underline"
              >
                {displaySubtitle}
              </Link>
            ) : (
              displaySubtitle
            )}
          </div>
        )}
        {displayMeta && (
          <div className="mt-1 truncate text-[0.98rem] font-medium leading-[1.38] text-[var(--app-muted)] opacity-80">
            {metaHref ? (
              <Link
                href={metaHref}
                className="relative z-10 hover:text-[var(--app-accent)] hover:underline"
              >
                {displayMeta}
              </Link>
            ) : (
              displayMeta
            )}
          </div>
        )}
      </div>
    </article>
  );

  return (
    <>
      {content}

      {menuOpen && mediaEntity && (
        <MediaCardFloatingMenu
          anchorRef={menuButtonRef}
          panelRef={menuPanelRef}
          displayTitle={displayTitle}
          mediaEntity={mediaEntity}
          href={href}
          rating={rating}
          onRate={handleRate}
          onPlay={playEntity}
          onRadio={() => queueEntity("end")}
          onAddToPlaylist={addEntityToPlaylist}
          onCreatePlaylist={createPlaylistWithEntity}
          onDownload={handleDownload}
          onShare={handleShare}
          onClose={() => setMenuOpen(false)}
          radioLabel={radioLabel}
        />
      )}
    </>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-[var(--app-border)] bg-[color-mix(in_srgb,var(--app-panel)_88%,transparent)] px-6 py-10 text-center shadow-[0_14px_34px_rgba(0,0,0,0.16)] ring-1 ring-white/[0.03]">
      <div className="app-section-title">{title}</div>
      {description && (
        <div className="app-muted mx-auto mt-2 max-w-md">
          {description}
        </div>
      )}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}

export function LoadingState({
  title = "Loading",
  description,
  className,
}: {
  title?: string;
  description?: string;
  className?: string;
}) {
  return (
    <div
      className={cx(
        "rounded-2xl border border-[var(--app-border)] bg-[color-mix(in_srgb,var(--app-panel)_82%,transparent)] px-6 py-8 text-[var(--app-muted)] shadow-[0_14px_34px_rgba(0,0,0,0.14)] ring-1 ring-white/[0.03]",
        className
      )}
    >
      <div className="flex items-center gap-3 text-sm font-bold text-[var(--foreground)]">
        <Loader2 size={18} className="animate-spin text-[var(--app-accent)]" />
        {title}
      </div>
      {description && <div className="app-muted mt-2">{description}</div>}
    </div>
  );
}

export function ErrorState({
  title = "Something went wrong",
  description,
  actionLabel = "Try again",
  onRetry,
}: {
  title?: string;
  description?: string;
  actionLabel?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="rounded-2xl border border-red-500/25 bg-[color-mix(in_srgb,var(--app-panel)_86%,rgb(127_29_29)_14%)] px-6 py-10 text-center shadow-[0_14px_34px_rgba(0,0,0,0.16)] ring-1 ring-red-400/10">
      <div className="mx-auto mb-4 grid h-11 w-11 place-items-center rounded-full bg-red-500/10 text-red-300">
        <AlertCircle size={22} />
      </div>
      <div className="app-section-title">{title}</div>
      {description && <div className="app-muted mx-auto mt-2 max-w-md">{description}</div>}
      {onRetry && (
        <div className="mt-5 flex justify-center">
          <ToolbarButton onClick={onRetry}>
            <RefreshCw size={16} />
            {actionLabel}
          </ToolbarButton>
        </div>
      )}
    </div>
  );
}

export function CardGridSkeleton({
  count = 14,
  className,
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div className={cx("grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-7", className)}>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="animate-pulse">
          <div className="aspect-square rounded-2xl bg-white/[0.07] shadow-[0_10px_30px_rgba(0,0,0,0.18)] ring-1 ring-white/[0.04]" />
          <div className="mt-3 h-4 w-4/5 rounded bg-white/[0.09]" />
          <div className="mt-2 h-3 w-3/5 rounded bg-white/[0.06]" />
          <div className="mt-2 h-3 w-1/3 rounded bg-white/[0.05]" />
        </div>
      ))}
    </div>
  );
}

export function ShelfSkeleton({
  count = 7,
}: {
  count?: number;
}) {
  return (
    <div className="flex gap-4 overflow-hidden pb-2">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="w-[220px] shrink-0 animate-pulse">
          <div className="aspect-square rounded-2xl bg-white/[0.07] shadow-[0_10px_30px_rgba(0,0,0,0.18)] ring-1 ring-white/[0.04]" />
          <div className="mt-3 h-4 w-4/5 rounded bg-white/[0.09]" />
          <div className="mt-2 h-3 w-3/5 rounded bg-white/[0.06]" />
          <div className="mt-2 h-3 w-1/3 rounded bg-white/[0.05]" />
        </div>
      ))}
    </div>
  );
}

export function TableSkeleton({
  rows = 8,
  columns = 5,
  className,
}: {
  rows?: number;
  columns?: number;
  className?: string;
}) {
  return (
    <div className={cx("app-table-shell overflow-hidden rounded-2xl", className)}>
      <div className="app-table-head grid grid-cols-[repeat(var(--cols),minmax(0,1fr))] gap-4 px-5 py-3" style={{ "--cols": columns } as CSSProperties}>
        {Array.from({ length: columns }).map((_, index) => (
          <div key={index} className="h-3 rounded bg-white/[0.06]" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, row) => (
        <div
          key={row}
          className="app-table-row grid min-h-14 animate-pulse grid-cols-[repeat(var(--cols),minmax(0,1fr))] items-center gap-4 px-5 py-2"
          style={{ "--cols": columns } as CSSProperties}
        >
          {Array.from({ length: columns }).map((_, column) => (
            <div
              key={column}
              className={cx(
                "h-3 rounded bg-white/[0.07]",
                column === 0 && "w-1/2",
                column === columns - 1 && "ml-auto w-1/3"
              )}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
