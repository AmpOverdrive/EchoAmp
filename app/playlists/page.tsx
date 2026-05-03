"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  CheckSquare,
  ListMusic,
  Loader2,
  Pencil,
  Play,
  Plus,
  Search,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import {
  createPlaylist,
  createPlaylistWithSongs,
  deletePlaylist,
  getPlaylist,
  getPlaylists,
  getRandomSongs,
  searchMusic,
} from "@/lib/navidrome";
import { usePlayerStore } from "@/lib/player-store";
import { normalizePlaylist, trackForPlayer } from "@/lib/normalizers";
import {
  CardGridSkeleton,
  EmptyState,
  ErrorState,
  PageHeader,
  PageShell,
  TextInput,
  ToolbarButton,
} from "@/components/ui/AppPrimitives";
import { useToast } from "@/components/ui/ToastProvider";

const SMART_PREFIX = "psy-smart-";
const SMART_RULES_KEY = "navidrome-smart-playlist-rules";

type SmartFilters = {
  name: string;
  query: string;
  artistContains: string;
  albumContains: string;
  titleContains: string;
  genreContains: string;
  yearFrom: string;
  yearTo: string;
  minRating: string;
  limit: string;
  sort: string;
};

const defaultSmartFilters: SmartFilters = {
  name: "",
  query: "",
  artistContains: "",
  albumContains: "",
  titleContains: "",
  genreContains: "",
  yearFrom: "",
  yearTo: "",
  minRating: "0",
  limit: "50",
  sort: "+random",
};

function formatDuration(seconds: any) {
  if (!seconds) return "";
  const total = Number(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);

  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function isSmartPlaylist(name?: string) {
  return (name || "").toLowerCase().startsWith(SMART_PREFIX);
}

function displayPlaylistName(name?: string) {
  if (!name) return "Untitled playlist";
  return isSmartPlaylist(name) ? name.slice(SMART_PREFIX.length) : name;
}

function toArray(value: any) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function includes(value: any, needle: string) {
  if (!needle.trim()) return true;
  return String(value || "").toLowerCase().includes(needle.trim().toLowerCase());
}

function shuffle<T>(items: T[]) {
  const next = [...items];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    [next[index], next[swap]] = [next[swap], next[index]];
  }
  return next;
}

function loadStoredRules(): Record<string, SmartFilters> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(SMART_RULES_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveStoredRule(id: string, filters: SmartFilters) {
  if (typeof window === "undefined" || !id) return;
  const current = loadStoredRules();
  localStorage.setItem(
    SMART_RULES_KEY,
    JSON.stringify({ ...current, [id]: filters })
  );
}

export default function PlaylistsPage() {
  const router = useRouter();
  const setTrack = usePlayerStore((s) => s.setTrack);
  const { showToast } = useToast();
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showSmart, setShowSmart] = useState(false);
  const [editingSmartId, setEditingSmartId] = useState<string | null>(null);
  const [playlistName, setPlaylistName] = useState("");
  const [smartFilters, setSmartFilters] =
    useState<SmartFilters>(defaultSmartFilters);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);

  async function loadPlaylists() {
    setLoading(true);
    setError("");
    try {
      const data = await getPlaylists();
      setPlaylists(data.filter(Boolean));
    } catch (error) {
      console.error("Failed to load playlists:", error);
      setError("Unable to load playlists.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPlaylists();
  }, []);

  const filteredPlaylists = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return playlists;
    return playlists.filter((playlist) =>
      displayPlaylistName(playlist.name).toLowerCase().includes(term)
    );
  }, [playlists, query]);

  async function handleCreatePlaylist(e: React.FormEvent) {
    e.preventDefault();
    if (!playlistName.trim()) return;

    setBusy(true);
    try {
      await createPlaylist(playlistName);
      showToast({ title: "Playlist created", description: playlistName, tone: "success" });
      setPlaylistName("");
      setShowCreate(false);
      await loadPlaylists();
    } catch (error) {
      console.error("Failed to create playlist:", error);
      showToast({ title: "Failed to create playlist", description: "Check your Navidrome connection and try again.", tone: "error" });
    } finally {
      setBusy(false);
    }
  }

  async function buildSmartSongs(filters: SmartFilters) {
    const limit = Math.max(1, Math.min(500, Number(filters.limit) || 50));
    const seed =
      filters.query.trim() ||
      filters.titleContains.trim() ||
      filters.artistContains.trim() ||
      filters.albumContains.trim() ||
      filters.genreContains.trim();

    const candidates = seed
      ? (await searchMusic(seed)).songs
      : await getRandomSongs(Math.max(limit * 4, 100));

    const yearFrom = Number(filters.yearFrom);
    const yearTo = Number(filters.yearTo);
    const minRating = Number(filters.minRating) || 0;

    let songs = toArray(candidates)
      .filter(Boolean)
      .filter((song) => includes(song.artist, filters.artistContains))
      .filter((song) => includes(song.album, filters.albumContains))
      .filter((song) => includes(song.title, filters.titleContains))
      .filter((song) => includes(song.genre, filters.genreContains))
      .filter((song) => {
        if (!Number.isFinite(yearFrom) && !Number.isFinite(yearTo)) return true;
        const year = Number(song.year);
        if (!Number.isFinite(year)) return false;
        if (Number.isFinite(yearFrom) && year < yearFrom) return false;
        if (Number.isFinite(yearTo) && year > yearTo) return false;
        return true;
      })
      .filter((song) => {
        if (!minRating) return true;
        return Number(song.userRating || song.rating || 0) >= minRating;
      });

    if (filters.sort === "+title") {
      songs = songs.sort((a, b) =>
        String(a.title || "").localeCompare(String(b.title || ""))
      );
    } else if (filters.sort === "+artist") {
      songs = songs.sort((a, b) =>
        String(a.artist || "").localeCompare(String(b.artist || ""))
      );
    } else if (filters.sort === "-year") {
      songs = songs.sort((a, b) => Number(b.year || 0) - Number(a.year || 0));
    } else if (filters.sort === "-played") {
      songs = songs.sort(
        (a, b) => Number(b.playCount || 0) - Number(a.playCount || 0)
      );
    } else {
      songs = shuffle(songs);
    }

    return songs.slice(0, limit);
  }

  async function handleCreateSmartPlaylist(e: React.FormEvent) {
    e.preventDefault();
    const baseName =
      smartFilters.name.trim() || `Smart Mix ${new Date().toLocaleDateString()}`;
    const playlistNameWithPrefix = `${SMART_PREFIX}${baseName}`;

    setBusy(true);
    try {
      const songs = await buildSmartSongs(smartFilters);
      if (songs.length === 0) {
        showToast({ title: "No matching songs", description: "Try relaxing the smart playlist rules.", tone: "info" });
        return;
      }

      if (editingSmartId) await deletePlaylist(editingSmartId);

      const created = await createPlaylistWithSongs(
        playlistNameWithPrefix,
        songs.map((song) => song.id)
      );
      if (created?.id) saveStoredRule(created.id, smartFilters);
      showToast({ title: editingSmartId ? "Smart playlist updated" : "Smart playlist created", description: baseName, tone: "success" });

      setSmartFilters(defaultSmartFilters);
      setEditingSmartId(null);
      setShowSmart(false);
      await loadPlaylists();
    } catch (error) {
      console.error("Failed to create smart playlist:", error);
      showToast({ title: "Failed to create smart playlist", description: "Check your Navidrome connection and try again.", tone: "error" });
    } finally {
      setBusy(false);
    }
  }

  async function handlePlay(e: React.MouseEvent, playlist: any) {
    e.preventDefault();
    e.stopPropagation();
    if (playingId === playlist.id) return;

    setPlayingId(playlist.id);
    try {
      const data = await getPlaylist(playlist.id);
      const songs = toArray(data?.entry).filter(Boolean);
      const queue = songs.map(trackForPlayer);
      if (queue.length > 0) {
        setTrack(queue[0], queue);
      } else {
        showToast({ title: "Playlist is empty", description: displayPlaylistName(playlist.name), tone: "info" });
      }
    } catch (error) {
      console.error("Failed to play playlist:", error);
      showToast({ title: "Failed to play playlist", description: displayPlaylistName(playlist.name), tone: "error" });
    } finally {
      setPlayingId(null);
    }
  }

  async function deletePlaylistByTarget(playlist: any) {
    try {
      await deletePlaylist(playlist.id);
      setPlaylists((current) =>
        current.filter((item) => item.id !== playlist.id)
      );
      showToast({ title: "Playlist deleted", description: displayPlaylistName(playlist.name), tone: "success" });
      setDeleteTarget(null);
    } catch (error) {
      console.error("Failed to delete playlist:", error);
      showToast({ title: "Failed to delete playlist", description: displayPlaylistName(playlist.name), tone: "error" });
    }
  }

  async function deleteSelectedPlaylists() {
    const selected = playlists.filter((p) => selectedIds.has(p.id));
    try {
      for (const playlist of selected) await deletePlaylist(playlist.id);
      setPlaylists((current) =>
        current.filter((playlist) => !selectedIds.has(playlist.id))
      );
      showToast({ title: "Playlists deleted", description: `${selected.length} playlists removed.`, tone: "success" });
      setSelectedIds(new Set());
      setSelectionMode(false);
      setConfirmBulkDelete(false);
    } catch (error) {
      console.error("Failed to delete selected playlists:", error);
      showToast({ title: "Failed to delete playlists", description: "Check your Navidrome connection and try again.", tone: "error" });
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function openSmartEditor(playlist?: any) {
    if (playlist?.id) {
      setEditingSmartId(playlist.id);
      const saved = loadStoredRules()[playlist.id];
      setSmartFilters(
        saved || {
          ...defaultSmartFilters,
          name: displayPlaylistName(playlist.name),
        }
      );
    } else {
      setEditingSmartId(null);
      setSmartFilters(defaultSmartFilters);
    }
    setShowCreate(false);
    setShowSmart(true);
  }

  if (loading) {
    return (
      <PageShell className="p-5">
        <div className="mb-5">
          <PageHeader title="Playlists" />
        </div>
        <CardGridSkeleton count={10} />
      </PageShell>
    );
  }

  return (
    <PageShell className="p-5">
      <div className="mb-5">
        <PageHeader
          title="Playlists"
          eyebrow={`${filteredPlaylists.length} of ${playlists.length} playlists`}
          actions={
            <>
          <ToolbarButton
            tone="primary"
            onClick={() => {
              setShowSmart(false);
              setShowCreate(true);
            }}
          >
            <Plus size={18} />
            New Playlist
          </ToolbarButton>

          <ToolbarButton
            onClick={() => openSmartEditor()}
          >
            <Plus size={18} />
            New Smart Playlist
          </ToolbarButton>

          <ToolbarButton
            onClick={() => {
              setSelectionMode((current) => !current);
              setSelectedIds(new Set());
            }}
            active={selectionMode}
          >
            <CheckSquare size={17} />
            {selectionMode ? "Done" : "Select"}
          </ToolbarButton>
            </>
          }
        />
      </div>

      <TextInput
        icon={Search}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search playlists..."
        className="mb-6 max-w-lg"
      />

      {selectionMode && selectedIds.size > 0 && (
        <div className="mb-5 flex items-center gap-3 rounded-xl border border-[var(--app-border)] bg-[var(--app-panel)] px-4 py-3 text-sm">
          <span className="font-medium">{selectedIds.size} selected</span>
          <button
            onClick={() => setConfirmBulkDelete(true)}
            className="rounded-lg bg-red-500/15 px-3 py-2 text-sm font-semibold text-red-200 hover:bg-red-500/25"
          >
            Delete selected
          </button>
        </div>
      )}

      {showCreate && (
        <Modal title="New Playlist" onClose={() => setShowCreate(false)}>
          <form onSubmit={handleCreatePlaylist} className="space-y-4">
            <label className="block text-sm font-semibold text-[var(--app-muted)]">
              Name
              <input
                value={playlistName}
                onChange={(e) => setPlaylistName(e.target.value)}
                autoFocus
                placeholder="Playlist name..."
                className="mt-2 h-11 w-full rounded-lg border border-[var(--app-border)] bg-[var(--app-bg)] px-3 text-[var(--foreground)] outline-none focus:border-[var(--app-accent)]"
              />
            </label>
            <ModalActions
              busy={busy}
              disabled={!playlistName.trim()}
              onCancel={() => setShowCreate(false)}
              submitLabel="Create"
            />
          </form>
        </Modal>
      )}

      {showSmart && (
        <SmartPlaylistModal
          busy={busy}
          editing={Boolean(editingSmartId)}
          filters={smartFilters}
          setFilters={setSmartFilters}
          onClose={() => setShowSmart(false)}
          onSubmit={handleCreateSmartPlaylist}
        />
      )}

      {deleteTarget && (
        <Modal title="Delete Playlist" onClose={() => setDeleteTarget(null)}>
          <div className="space-y-5">
            <p className="text-sm text-[var(--app-muted)]">
              Delete <span className="font-semibold text-[var(--foreground)]">{displayPlaylistName(deleteTarget.name)}</span>? This cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="rounded-lg border border-[var(--app-border)] px-4 py-2 text-sm font-semibold text-[var(--app-muted)] hover:bg-[var(--app-panel)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => deletePlaylistByTarget(deleteTarget)}
                className="rounded-lg bg-red-500 px-4 py-2 text-sm font-bold text-white hover:bg-red-400"
              >
                Delete
              </button>
            </div>
          </div>
        </Modal>
      )}

      {confirmBulkDelete && (
        <Modal title="Delete Selected Playlists" onClose={() => setConfirmBulkDelete(false)}>
          <div className="space-y-5">
            <p className="text-sm text-[var(--app-muted)]">
              Delete {selectedIds.size} selected playlist{selectedIds.size === 1 ? "" : "s"}? This cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmBulkDelete(false)}
                className="rounded-lg border border-[var(--app-border)] px-4 py-2 text-sm font-semibold text-[var(--app-muted)] hover:bg-[var(--app-panel)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={deleteSelectedPlaylists}
                className="rounded-lg bg-red-500 px-4 py-2 text-sm font-bold text-white hover:bg-red-400"
              >
                Delete selected
              </button>
            </div>
          </div>
        </Modal>
      )}

      {error ? (
        <ErrorState
          title={error}
          description="Check your Navidrome connection and try again."
          onRetry={loadPlaylists}
        />
      ) : filteredPlaylists.length === 0 ? (
        <EmptyState title="No playlists found" />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-7">
          {filteredPlaylists.map((playlist) => {
            const normalized = normalizePlaylist(playlist);
            const smart = isSmartPlaylist(playlist.name);
            const selected = selectedIds.has(playlist.id);
            const card = (
              <article
                className={[
                  "group overflow-hidden rounded-lg bg-[var(--app-panel)] transition",
                  "hover:-translate-y-0.5 hover:bg-[var(--app-panel-strong)]",
                  selected ? "ring-2 ring-[var(--app-accent)]" : "",
                ].join(" ")}
              >
                <div className="relative aspect-square bg-[var(--app-panel-strong)]">
                  <img
                    src={normalized.coverArt}
                    alt={displayPlaylistName(playlist.name)}
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                  <div className="absolute inset-0 -z-10 flex items-center justify-center bg-[var(--app-panel-strong)]">
                    {smart ? (
                      <Sparkles size={48} className="text-[var(--app-accent)] opacity-70" />
                    ) : (
                      <ListMusic size={48} className="text-[var(--app-muted)] opacity-70" />
                    )}
                  </div>

                  {smart && (
                    <div className="absolute left-2.5 top-2.5 rounded-full bg-black/45 px-2 py-1 text-[10px] font-semibold text-white backdrop-blur">
                      Smart
                    </div>
                  )}

                  <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition group-hover:bg-black/30">
                    <button
                      onClick={(e) => handlePlay(e, playlist)}
                      className="flex h-10 w-14 scale-95 items-center justify-center rounded-full bg-[var(--app-accent)] text-black opacity-0 shadow-xl transition group-hover:scale-100 group-hover:opacity-100"
                      aria-label={`Play ${displayPlaylistName(playlist.name)}`}
                    >
                      {playingId === playlist.id ? (
                        <Loader2 size={20} className="animate-spin" />
                      ) : (
                        <Play size={19} fill="currentColor" />
                      )}
                    </button>
                  </div>

                  <div className="absolute right-2.5 top-2.5 flex gap-2 opacity-0 transition group-hover:opacity-100">
                    {smart && (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          openSmartEditor(playlist);
                        }}
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur hover:bg-black/75"
                        aria-label="Edit smart playlist"
                      >
                        <Pencil size={15} />
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setDeleteTarget(playlist);
                      }}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur hover:bg-red-500"
                      aria-label="Delete playlist"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>

                  {selectionMode && (
                    <div className="absolute left-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white">
                      {selected && <Check size={19} />}
                    </div>
                  )}
                </div>

                <div className="p-3">
                  <div className="app-card-title truncate">
                    {displayPlaylistName(playlist.name)}
                  </div>
                  <div className="app-muted mt-1 truncate text-xs">
                    {normalized.songCount} songs
                    {normalized.duration
                      ? ` · ${formatDuration(normalized.duration)}`
                      : ""}
                  </div>
                </div>
              </article>
            );

            if (selectionMode) {
              return (
                <div
                  key={playlist.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => toggleSelect(playlist.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      toggleSelect(playlist.id);
                    }
                  }}
                  className="cursor-pointer text-left"
                >
                  {card}
                </div>
              );
            }

            return (
              <div
                key={playlist.id}
                role="link"
                tabIndex={0}
                onClick={() => router.push(`/playlists/${playlist.id}`)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    router.push(`/playlists/${playlist.id}`);
                  }
                }}
                className="cursor-pointer"
              >
                {card}
              </div>
            );
          })}
        </div>
      )}
    </PageShell>
  );
}

function Modal({
  children,
  onClose,
  title,
}: {
  children: React.ReactNode;
  onClose: () => void;
  title: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-5 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-xl border border-[var(--app-border)] bg-[var(--app-shell)] p-5 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="app-section-title">{title}</h2>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--app-muted)] hover:bg-[var(--app-panel)] hover:text-[var(--foreground)]"
            aria-label="Close"
          >
            <X size={19} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ModalActions({
  busy,
  disabled,
  onCancel,
  submitLabel,
}: {
  busy: boolean;
  disabled: boolean;
  onCancel: () => void;
  submitLabel: string;
}) {
  return (
    <div className="flex justify-end gap-3 pt-2">
      <button
        type="button"
        onClick={onCancel}
        className="rounded-lg border border-[var(--app-border)] px-4 py-2 text-sm font-semibold text-[var(--app-muted)] hover:bg-[var(--app-panel)]"
      >
        Cancel
      </button>
      <button
        disabled={busy || disabled}
        className="flex items-center gap-2 rounded-lg bg-[var(--app-accent)] px-4 py-2 text-sm font-semibold text-black disabled:opacity-50"
      >
        {busy && <Loader2 size={16} className="animate-spin" />}
        {busy ? "Working..." : submitLabel}
      </button>
    </div>
  );
}

function SmartPlaylistModal({
  busy,
  editing,
  filters,
  setFilters,
  onClose,
  onSubmit,
}: {
  busy: boolean;
  editing: boolean;
  filters: SmartFilters;
  setFilters: (filters: SmartFilters) => void;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
}) {
  const update = (key: keyof SmartFilters, value: string) =>
    setFilters({ ...filters, [key]: value });

  return (
    <Modal title={editing ? "Edit Smart Playlist" : "New Smart Playlist"} onClose={onClose}>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name">
            <input
              value={filters.name}
              onChange={(e) => update("name", e.target.value)}
              autoFocus
              placeholder="Road trip radio"
              className="field-input"
            />
          </Field>
          <Field label="Seed search">
            <input
              value={filters.query}
              onChange={(e) => update("query", e.target.value)}
              placeholder="artist, album, genre..."
              className="field-input"
            />
          </Field>
          <Field label="Artist contains">
            <input
              value={filters.artistContains}
              onChange={(e) => update("artistContains", e.target.value)}
              className="field-input"
            />
          </Field>
          <Field label="Album contains">
            <input
              value={filters.albumContains}
              onChange={(e) => update("albumContains", e.target.value)}
              className="field-input"
            />
          </Field>
          <Field label="Title contains">
            <input
              value={filters.titleContains}
              onChange={(e) => update("titleContains", e.target.value)}
              className="field-input"
            />
          </Field>
          <Field label="Genre contains">
            <input
              value={filters.genreContains}
              onChange={(e) => update("genreContains", e.target.value)}
              className="field-input"
            />
          </Field>
          <Field label="Year from">
            <input
              value={filters.yearFrom}
              onChange={(e) => update("yearFrom", e.target.value)}
              inputMode="numeric"
              className="field-input"
            />
          </Field>
          <Field label="Year to">
            <input
              value={filters.yearTo}
              onChange={(e) => update("yearTo", e.target.value)}
              inputMode="numeric"
              className="field-input"
            />
          </Field>
          <Field label="Minimum rating">
            <select
              value={filters.minRating}
              onChange={(e) => update("minRating", e.target.value)}
              className="field-input"
            >
              <option value="0">Any rating</option>
              <option value="1">1 star+</option>
              <option value="2">2 stars+</option>
              <option value="3">3 stars+</option>
              <option value="4">4 stars+</option>
              <option value="5">5 stars</option>
            </select>
          </Field>
          <Field label="Sort">
            <select
              value={filters.sort}
              onChange={(e) => update("sort", e.target.value)}
              className="field-input"
            >
              <option value="+random">Random</option>
              <option value="+title">A-Z title</option>
              <option value="+artist">A-Z artist</option>
              <option value="-year">Newest year</option>
              <option value="-played">Most played</option>
            </select>
          </Field>
          <Field label="Limit">
            <input
              value={filters.limit}
              onChange={(e) => update("limit", e.target.value)}
              inputMode="numeric"
              className="field-input"
            />
          </Field>
        </div>

        <p className="app-muted rounded-lg border border-[var(--app-border)] bg-[var(--app-panel)] p-3 text-xs">
          Smart playlists are created as Navidrome playlists and filled from
          the matching songs. Saved rules can be reopened from smart playlists
          created here.
        </p>

        <ModalActions
          busy={busy}
          disabled={!filters.name.trim()}
          onCancel={onClose}
          submitLabel={editing ? "Update Smart Playlist" : "Create Smart Playlist"}
        />
      </form>
    </Modal>
  );
}

function Field({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <label className="app-label block">
      {label}
      <div className="mt-2">{children}</div>
    </label>
  );
}
