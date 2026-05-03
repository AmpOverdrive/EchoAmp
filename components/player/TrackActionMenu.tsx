"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronRight, Download, ExternalLink, FolderOpen, Heart, Info, ListMusic, MoreVertical, Pause, Play, Plus, Radio, Share2, Star } from "lucide-react";
import { addSongToPlaylist, createPlaylist, getDownloadUrl, getPlaylists, rateItem } from "@/lib/navidrome";
import type { Track } from "@/lib/player-store";
import { RatingControl } from "@/components/ui/AppPrimitives";
import { AppModal } from "@/components/ui/AppModal";
import { useToast } from "@/components/ui/ToastProvider";

type Playlist = {
  id: string;
  name: string;
};

function decodeHtml(value: unknown): string {
  if (typeof value !== "string") return String(value ?? "");
  return value
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, code) => String.fromCharCode(parseInt(code, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

export default function TrackActionMenu({
  track,
  coverArt,
  coverFailed,
  isPlaying,
  isFavorite,
  rating,
  onTogglePlay,
  onToggleFavorite,
  onRate,
  onCoverError,
  onCoverLoad,
}: {
  track: Track;
  coverArt?: string;
  coverFailed?: boolean;
  isPlaying: boolean;
  isFavorite: boolean;
  rating: number;
  onTogglePlay: () => void;
  onToggleFavorite: () => void | Promise<void>;
  onRate?: (rating: number) => void | Promise<void>;
  onCoverError?: () => void;
  onCoverLoad?: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [playlistMenuOpen, setPlaylistMenuOpen] = useState(false);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [playlistName, setPlaylistName] = useState("");
  const menuRef = useRef<HTMLDivElement | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    if (!menuOpen) return;
    getPlaylists().then((items) => setPlaylists(items || [])).catch(() => {});
  }, [menuOpen]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (!menuRef.current?.contains(e.target as Node)) {
        setMenuOpen(false);
        setPlaylistMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function addToPlaylist(playlistId: string, playlistLabel: string) {
    await addSongToPlaylist(playlistId, track.id);
    setMenuOpen(false);
    showToast({ title: "Added to playlist", description: playlistLabel, tone: "success" });
  }

  async function submitCreatePlaylist() {
    const name = playlistName.trim();
    if (!name) return;
    await createPlaylist(name);
    const updated = await getPlaylists();
    setPlaylists(updated || []);
    const created = [...(updated || [])].reverse().find((playlist) => playlist.name === name);
    if (created?.id) await addSongToPlaylist(created.id, track.id);
    setPlaylistName("");
    setCreateOpen(false);
    setMenuOpen(false);
    showToast({ title: "Playlist created", description: name, tone: "success" });
  }

  async function rateTrack(nextRating: number) {
    await (onRate ? onRate(nextRating) : rateItem(track.id, nextRating));
    showToast({ title: nextRating ? `Rated ${nextRating} star${nextRating === 1 ? "" : "s"}` : "Rating cleared", description: decodeHtml(track.title), tone: "success" });
  }

  function shareTrack() {
    const text = `${decodeHtml(track.title)}${track.artist ? ` — ${decodeHtml(track.artist)}` : ""}`;
    if (navigator.share) {
      navigator.share({ title: decodeHtml(track.title), text }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(text).catch(() => {});
      showToast({ title: "Copied track info", description: text, tone: "success" });
    }
    setMenuOpen(false);
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        className="grid h-9 w-9 place-items-center rounded-full text-white/75 transition hover:bg-white/10 hover:text-white"
        onClick={() => setMenuOpen((open) => {
          if (open) setPlaylistMenuOpen(false);
          return !open;
        })}
        aria-label="Open track actions"
      >
        <MoreVertical size={18} />
      </button>

      {menuOpen && (
        <div className="absolute bottom-12 right-0 w-[28rem] overflow-hidden rounded-sm border border-white/10 bg-[#050506]/98 py-2 text-[1.02rem] shadow-2xl backdrop-blur-xl animate-[fadeIn_.15s_ease-out]">
          {!playlistMenuOpen ? (
            <>
              <button onClick={onTogglePlay} className="flex w-full items-center gap-5 px-4 py-3 text-left text-white/90 transition hover:bg-white/10">
                {isPlaying ? <Pause size={22} /> : <Play size={22} />}
                <span className="flex-1">{isPlaying ? "Pause" : "Play"}</span>
                <ChevronRight size={22} className="text-white/70" />
              </button>
              <button className="flex w-full items-center gap-5 px-4 py-3 text-left text-white/90 transition hover:bg-white/10">
                <Radio size={22} />
                <span className="flex-1">Track radio</span>
                <ChevronRight size={22} className="text-white/70" />
              </button>
              <div className="my-2 h-px bg-white/10" />
              <button onClick={() => setPlaylistMenuOpen(true)} className="flex w-full items-center gap-5 px-4 py-3 text-left text-white/90 transition hover:bg-white/10">
                <ListMusic size={22} />
                <span className="flex-1">Add to playlist</span>
                <ChevronRight size={22} className="text-white/70" />
              </button>
              <div className="my-2 h-px bg-white/10" />
              <button onClick={onToggleFavorite} className="flex w-full items-center gap-5 px-4 py-3 text-left text-white/90 transition hover:bg-white/10">
                <Heart size={22} fill={isFavorite ? "currentColor" : "none"} />
                <span className="flex-1">{isFavorite ? "Unfavorite" : "Favorite"}</span>
                <ChevronRight size={22} className="text-white/70" />
              </button>
              <div className="flex w-full items-center gap-5 px-4 py-3 text-white/90">
                <Star size={22} />
                <span className="flex-1">Set rating</span>
                <RatingControl value={rating} label={decodeHtml(track.title)} onRate={rateTrack} size={16} />
              </div>
              <div className="my-2 h-px bg-white/10" />
              <button onClick={() => { window.open(getDownloadUrl(track.id)); setMenuOpen(false); showToast({ title: "Download started", description: decodeHtml(track.title), tone: "success" }); }} className="flex w-full items-center gap-5 px-4 py-3 text-left text-white/90 transition hover:bg-white/10">
                <Download size={22} />
                <span>Download</span>
              </button>
              <button onClick={shareTrack} className="flex w-full items-center gap-5 px-4 py-3 text-left text-white/90 transition hover:bg-white/10">
                <Share2 size={22} />
                <span>Share item</span>
              </button>
              <div className="my-2 h-px bg-white/10" />
              <button className="flex w-full items-center gap-5 px-4 py-3 text-left text-white/90 transition hover:bg-white/10">
                <ExternalLink size={22} />
                <span className="flex-1">Go to</span>
                <ChevronRight size={22} className="text-white/70" />
              </button>
              <button className="flex w-full items-center gap-5 px-4 py-3 text-left text-white/90 transition hover:bg-white/10">
                <FolderOpen size={22} />
                <span>Show track in file manager</span>
              </button>
              <div className="my-2 h-px bg-white/10" />
              <button className="flex w-full items-center gap-5 px-4 py-3 text-left text-white/90 transition hover:bg-white/10">
                <Info size={22} />
                <span>Get info</span>
              </button>
              <div className="mt-2 flex items-center gap-4 border-t border-white/10 px-4 py-4">
                {coverArt && !coverFailed ? <img key={track.id} src={coverArt} alt="" className="h-14 w-14 rounded-md object-cover" onError={onCoverError} onLoad={onCoverLoad} /> : <div className="grid h-14 w-14 place-items-center rounded-md bg-white/10"><ListMusic size={22} /></div>}
                <div className="min-w-0 font-semibold">
                  <div className="truncate">{decodeHtml(track.title)}</div>
                </div>
              </div>
            </>
          ) : (
            <>
              <button onClick={() => setPlaylistMenuOpen(false)} className="flex w-full items-center gap-4 px-4 py-3 text-left text-white/90 transition hover:bg-white/10">
                <ChevronRight size={22} className="rotate-180" />
                <span>Add to playlist</span>
              </button>
              <div className="my-2 h-px bg-white/10" />
              <button onClick={() => setCreateOpen(true)} className="flex w-full items-center gap-5 px-4 py-3 text-left text-[var(--app-accent)] transition hover:bg-white/10">
                <Plus size={22} />
                <span>Create playlist</span>
              </button>
              <div className="max-h-80 overflow-y-auto">
                {playlists.map((playlist) => (
                  <button key={playlist.id} onClick={() => addToPlaylist(playlist.id, playlist.name)} className="flex w-full items-center gap-5 px-4 py-3 text-left text-white/90 transition hover:bg-white/10">
                    <ListMusic size={20} />
                    <span className="truncate">{playlist.name}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      <AppModal
        open={createOpen}
        title="Create playlist"
        description={`Add ${decodeHtml(track.title)} to a new playlist.`}
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
    </div>
  );
}
