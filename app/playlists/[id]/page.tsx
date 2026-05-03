"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  getPlaylist,
  searchMusic,
  addSongToPlaylist,
  getSimilarSongs,
  rateItem,
} from "@/lib/navidrome";
import { usePlayerStore } from "@/lib/player-store";
import { useFavoritesStore } from "@/lib/favorites-store";
import {
  ArrowLeft,
  Play,
  Shuffle,
  Search,
  ListPlus,
  Upload,
  RefreshCw,
  Plus,
  Download,
  X,
  ChevronDown,
} from "lucide-react";
import { normalizePlaylist, normalizeTrack, trackForPlayer } from "@/lib/normalizers";
import {
  EmptyState,
  ErrorState,
  FavoriteButton,
  LoadingState,
  PageShell,
  RatingControl,
  TableSkeleton,
  TextInput,
  ToolbarButton,
} from "@/components/ui/AppPrimitives";
import { VirtualList } from "@/components/ui/VirtualList";

function cleanText(value: any) {
  if (!value) return "";
  return String(value)
    .replaceAll("&amp;", "&")
    .replaceAll("&#39;", "'")
    .replaceAll("&apos;", "'")
    .replaceAll("&quot;", '"')
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

function toArray(value: any) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function formatDuration(seconds: any) {
  if (!seconds) return "";
  const total = Number(seconds);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatLongDuration(seconds: any) {
  if (!seconds) return "";
  const total = Number(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);

  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatSize(bytes: any) {
  if (!bytes) return "";
  const mb = Number(bytes) / 1024 / 1024;
  return `${mb.toFixed(1)} MB`;
}

function splitCsvLine(line: string) {
  const values: string[] = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"' && quoted && next === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      values.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  values.push(current.trim());
  return values;
}

function parseCsv(text: string) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];

  const headers = splitCsvLine(lines[0]).map((header) =>
    header.toLowerCase().replace(/[^a-z0-9]/g, "")
  );

  return lines.slice(1).map((line) => {
    const values = splitCsvLine(line);
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || "";
    });

    const title =
      row.trackname || row.name || row.title || row.song || row.track || "";
    const artist =
      row.artistname ||
      row.artistnames ||
      row.artist ||
      row.artists ||
      "";
    const album = row.albumname || row.album || "";

    return { title, artist, album };
  }).filter((row) => row.title || row.artist);
}

function normalizeMatch(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s*\((remaster|remastered|live|radio edit|explicit|clean).*?\)\s*/gi, " ")
    .replace(/\s*-\s*(remaster|remastered|live|radio edit).*$/gi, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function matchScore(song: any, row: { title: string; artist: string; album: string }) {
  const title = normalizeMatch(song.title || "");
  const artist = normalizeMatch(song.artist || "");
  const album = normalizeMatch(song.album || "");
  const rowTitle = normalizeMatch(row.title);
  const rowArtist = normalizeMatch(row.artist);
  const rowAlbum = normalizeMatch(row.album);

  let score = 0;
  if (title && rowTitle && (title === rowTitle || title.includes(rowTitle) || rowTitle.includes(title))) {
    score += 0.55;
  }
  if (artist && rowArtist && (artist === rowArtist || artist.includes(rowArtist) || rowArtist.includes(artist))) {
    score += 0.35;
  }
  if (!rowAlbum || !album || album === rowAlbum || album.includes(rowAlbum) || rowAlbum.includes(album)) {
    score += 0.1;
  }
  return score;
}

type CsvTrackRow = {
  title: string;
  artist: string;
  album: string;
};

type CsvReportTrack = CsvTrackRow & {
  score?: number;
  threshold?: number;
};

type CsvImportReport = {
  total: number;
  added: number;
  duplicates: CsvReportTrack[];
  notFound: CsvReportTrack[];
};

export default function PlaylistDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const csvInputRef = useRef<HTMLInputElement | null>(null);

  const [playlist, setPlaylist] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [actionStatus, setActionStatus] = useState("");
  const [refreshingPlaylist, setRefreshingPlaylist] = useState(false);
  const [query, setQuery] = useState("");
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [showAddSongs, setShowAddSongs] = useState(false);
  const [songSearch, setSongSearch] = useState("");
  const [songResults, setSongResults] = useState<any[]>([]);
  const [searchingSongs, setSearchingSongs] = useState(false);
  const [addingSongId, setAddingSongId] = useState<string | null>(null);
  const [importingCsv, setImportingCsv] = useState(false);
  const [importReport, setImportReport] = useState<CsvImportReport | null>(null);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  const setTrack = usePlayerStore((s) => s.setTrack);
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const loadStarredFavorites = useFavoritesStore((s) => s.loadStarredFavorites);

  async function loadPlaylist() {
    setLoading(true);
    setPageError("");
    setActionStatus("");

    try {
      const data = await getPlaylist(id);
      setPlaylist(data);

      const songs = toArray(data?.entry);
      const initialRatings: Record<string, number> = {};
      songs.forEach((song: any) => {
        initialRatings[song.id] = Number(song.userRating || song.rating || 0);
      });
      setRatings(initialRatings);

      await loadStarredFavorites();
    } catch (error) {
      console.error("Failed to load playlist:", error);
      setPageError("Unable to load playlist.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPlaylist();
  }, [id, loadStarredFavorites]);

  const songs = useMemo(() => toArray(playlist?.entry), [playlist]);

  const filteredSongs = useMemo(() => songs.filter((song: any) => {
    const search = query.toLowerCase();
    const normalized = normalizeTrack(song);
    return (
      normalized.title.toLowerCase().includes(search) ||
      normalized.artist.toLowerCase().includes(search) ||
      normalized.album?.toLowerCase?.().includes(search)
    );
  }), [query, songs]);

  const queue = useMemo(() => filteredSongs.map(trackForPlayer), [filteredSongs]);

  async function refreshPlaylist({ silent = false } = {}) {
    if (!silent) {
      setRefreshingPlaylist(true);
      setActionStatus("");
    }

    try {
      const data = await getPlaylist(id);
      setPlaylist(data);

      const refreshedSongs = toArray(data?.entry);
      const nextRatings: Record<string, number> = {};
      refreshedSongs.forEach((song: any) => {
        nextRatings[song.id] = Number(song.userRating || song.rating || 0);
      });
      setRatings(nextRatings);
      if (!silent) setActionStatus("Playlist refreshed.");
    } catch (error) {
      console.error("Failed to refresh playlist:", error);
      if (!silent) setActionStatus("Could not refresh playlist.");
    } finally {
      if (!silent) setRefreshingPlaylist(false);
    }
  }

  async function loadSuggestions(seedSongs = songs, refreshAll = false) {
    const existingIds = new Set(seedSongs.map((song: any) => song.id));
    const currentArtist = currentTrack?.artist?.toLowerCase?.();
    const artistSeeds = currentArtist
      ? seedSongs.filter(
          (song: any) => song.artist?.toLowerCase?.() === currentArtist
        )
      : [];
    const seedPool = artistSeeds.length > 0 ? artistSeeds : seedSongs;
    const seeds = refreshAll
      ? [...seedPool].sort(() => Math.random() - 0.5).slice(0, 4)
      : [
          currentTrack &&
          (!seedSongs.length ||
            seedSongs.some((song: any) => song.artist === currentTrack.artist))
            ? currentTrack
            : seedPool.find((song: any) => song.id) || currentTrack,
        ].filter(Boolean);

    if (seeds.length === 0) {
      setSuggestions([]);
      return;
    }

    setLoadingSuggestions(true);
    if (refreshAll) setSuggestions([]);
    try {
      const relatedPages = await Promise.all(
        seeds.map((seed: any) => getSimilarSongs(seed.id, 30))
      );
      const seen = new Set<string>();
      const next = toArray(relatedPages.flat())
        .filter(Boolean)
        .filter((song: any) => !existingIds.has(song.id))
        .filter((song: any) => {
          if (seen.has(song.id)) return false;
          seen.add(song.id);
          return true;
        })
        .sort(() => (refreshAll ? Math.random() - 0.5 : 0))
        .slice(0, 12);
      setSuggestions(next);
    } catch (error) {
      console.error("Failed to load suggestions:", error);
      setSuggestions([]);
    } finally {
      setLoadingSuggestions(false);
    }
  }

  useEffect(() => {
    if (!loading && songs.length > 0) loadSuggestions(songs);
    // Suggestions should refresh when the viewed playlist changes or the
    // playing artist changes, not on every render of the songs array.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, id, currentTrack?.id]);

  async function handleSongSearch(e: React.FormEvent) {
    e.preventDefault();

    if (!songSearch.trim()) return;

    setSearchingSongs(true);

    try {
      const results = await searchMusic(songSearch);
      setSongResults(results.songs || []);
    } catch (error) {
      console.error("Song search failed:", error);
    } finally {
      setSearchingSongs(false);
    }
  }

  async function handleAddSong(songId: string) {
    setAddingSongId(songId);

    try {
      await addSongToPlaylist(id, songId);
      await refreshPlaylist({ silent: true });
      setSuggestions((current) => current.filter((song) => song.id !== songId));
      setActionStatus("Song added to playlist.");
    } catch (error) {
      console.error("Failed to add song:", error);
      setActionStatus("Could not add that song.");
    } finally {
      setAddingSongId(null);
    }
  }

  async function handleCsvFile(file?: File) {
    if (!file) return;

    setImportingCsv(true);
    setImportReport(null);

    try {
      const text = await file.text();
      const rows = parseCsv(text);
      const existingIds = new Set(songs.map((song: any) => song.id));
      let added = 0;
      const duplicates: CsvReportTrack[] = [];
      const notFound: CsvReportTrack[] = [];
      const threshold = 0.55;

      for (const row of rows) {
        const searchTerm = [row.title, row.artist].filter(Boolean).join(" ");
        if (!searchTerm.trim()) continue;

        const results = await searchMusic(searchTerm);
        const ranked = toArray(results.songs)
          .filter(Boolean)
          .map((song: any) => ({ song, score: matchScore(song, row) }))
          .sort((a, b) => b.score - a.score);

        const best = ranked[0];
        if (!best || best.score < threshold) {
          notFound.push({
            ...row,
            score: best?.score || 0,
            threshold,
          });
          continue;
        }

        if (existingIds.has(best.song.id)) {
          duplicates.push({
            ...row,
            score: best.score,
            threshold,
          });
          continue;
        }

        await addSongToPlaylist(id, best.song.id);
        existingIds.add(best.song.id);
        added += 1;
      }

      await refreshPlaylist({ silent: true });
      setImportReport({
        total: rows.length,
        added,
        duplicates,
        notFound,
      });
    } catch (error) {
      console.error("CSV import failed:", error);
      setActionStatus("Could not import that CSV file.");
    } finally {
      setImportingCsv(false);
      if (csvInputRef.current) csvInputRef.current.value = "";
    }
  }

  async function updateRating(songId: string, rating: number) {
    setRatings((prev) => ({ ...prev, [songId]: rating }));

    try {
      await rateItem(songId, rating);
    } catch (error) {
      console.error("Failed to update rating:", error);
    }
  }

  if (loading) {
    return (
      <PageShell className="p-8">
        <LoadingState
          title="Loading playlist"
          description="Pulling playlist tracks, ratings, and suggestions from Navidrome."
        />
        <div className="mt-8">
          <TableSkeleton rows={8} columns={7} />
        </div>
      </PageShell>
    );
  }

  if (pageError) {
    return (
      <PageShell className="p-8">
        <ErrorState
          title={pageError}
          description="Check your Navidrome connection and try again."
          onRetry={loadPlaylist}
        />
      </PageShell>
    );
  }

  if (!playlist) {
    return (
      <PageShell className="p-8">
        <EmptyState
          title="Playlist not found"
          description="Navidrome did not return details for this playlist."
        />
      </PageShell>
    );
  }

  const totalDuration =
    Number(playlist.duration || 0) ||
    songs.reduce((sum: number, song: any) => sum + Number(song.duration || 0), 0);

  const totalSize = songs.reduce(
    (sum: number, song: any) => sum + Number(song.size || 0),
    0
  );

  const normalizedPlaylist = normalizePlaylist(playlist);
  const cover = normalizedPlaylist.coverArt;

  return (
    <PageShell className="app-detail-page relative">
      <div
        className="absolute inset-x-0 top-0 h-[300px] bg-cover bg-center opacity-20 blur-xl"
        style={{ backgroundImage: `url(${cover})` }}
      />
      <div className="absolute inset-x-0 top-0 h-[320px] bg-gradient-to-b from-[var(--app-shell)]/70 via-[var(--app-bg)]/80 to-[var(--app-bg)]" />

      <div className="relative z-10">
        <section className="px-5 pt-5 sm:px-6 lg:px-8">
          <Link
            href="/playlists"
            className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-[var(--app-muted)] hover:text-[var(--foreground)]"
          >
            <ArrowLeft size={17} />
            Playlists
          </Link>

          <div className="flex flex-col gap-5 md:flex-row md:gap-7">
            <img
              src={cover}
              alt={normalizedPlaylist.name}
              className="app-detail-artwork h-44 w-44 shrink-0 rounded-[1.35rem] object-cover sm:h-52 sm:w-52"
              onError={(e) => {
                e.currentTarget.src = "/placeholder-album.png";
              }}
            />

            <div className="min-w-0 pt-2">
              <h1 className="app-detail-title truncate">
                {normalizedPlaylist.name}
              </h1>

              {normalizedPlaylist.comment && (
                <p className="app-muted mt-3 max-w-4xl">
                  {normalizedPlaylist.comment}
                </p>
              )}

              <div className="app-muted mt-3">
                {songs.length} songs · {formatLongDuration(totalDuration)}
                {totalSize ? ` · ${formatSize(totalSize)}` : ""}
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-2.5">
                <ToolbarButton
                  tone="primary"
                  onClick={() => {
                    const first = queue[0];
                    if (first) setTrack(first, queue);
                  }}
                >
                  <Play size={17} fill="currentColor" />
                  Play
                </ToolbarButton>

                <ToolbarButton
                  onClick={() => {
                    const shuffled = [...queue].sort(() => Math.random() - 0.5);
                    const first = shuffled[0];
                    if (first) setTrack(first, shuffled);
                  }}
                >
                  <Shuffle size={16} />
                  Shuffle
                </ToolbarButton>

                <ToolbarButton
                  onClick={() => {
                    const first = queue[0];
                    if (first) setTrack(first, queue);
                  }}
                >
                  <ListPlus size={16} />
                  Play Next
                </ToolbarButton>

                <ToolbarButton
                  onClick={() => setShowAddSongs(true)}
                >
                  <Search size={16} />
                  Add Songs
                </ToolbarButton>

                <ToolbarButton
                  onClick={() => csvInputRef.current?.click()}
                  disabled={importingCsv}
                >
                  {importingCsv ? (
                    <RefreshCw size={16} className="animate-spin" />
                  ) : (
                    <Upload size={16} />
                  )}
                  {importingCsv ? "Importing..." : "Import CSV"}
                </ToolbarButton>

                <ToolbarButton
                  onClick={() => refreshPlaylist()}
                  disabled={refreshingPlaylist}
                >
                  <RefreshCw
                    size={16}
                    className={refreshingPlaylist ? "animate-spin" : ""}
                  />
                  {refreshingPlaylist ? "Refreshing..." : "Refresh"}
                </ToolbarButton>

                <input
                  ref={csvInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(event) => handleCsvFile(event.target.files?.[0])}
                />
              </div>

              {actionStatus && (
                <div className="mt-4 inline-flex rounded-lg border border-[var(--app-border)] bg-[var(--app-panel)] px-3 py-2 text-sm font-semibold text-[var(--app-muted)]">
                  {actionStatus}
                </div>
              )}

              {importReport && (
                <button
                  onClick={() => setImportReport(importReport)}
                  className="app-muted mt-4 rounded-lg border border-[var(--app-border)] bg-[var(--app-panel)] px-3 py-2 text-left hover:bg-[var(--app-panel-strong)]"
                >
                  CSV import complete: {importReport.added} added,{" "}
                  {importReport.duplicates.length} duplicates,{" "}
                  {importReport.notFound.length} not found. View report
                </button>
              )}
            </div>
          </div>
        </section>

        {importReport && (
          <CsvImportReportModal
            report={importReport}
            playlistName={normalizedPlaylist.name}
            onClose={() => setImportReport(null)}
          />
        )}


        {showAddSongs && (
          <section className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-5">
            <div className="app-detail-panel max-h-[80vh] w-full max-w-3xl overflow-hidden rounded-3xl">
              <div className="flex items-center justify-between border-b border-[var(--app-border)] p-4">
                <h2 className="app-section-title">Add Songs</h2>

                <button
                  onClick={() => setShowAddSongs(false)}
                  className="rounded-lg bg-[var(--app-panel)] px-4 py-2 text-sm font-semibold text-[var(--app-muted)] hover:bg-[var(--app-panel-strong)]"
                >
                  Close
                </button>
              </div>

              <form onSubmit={handleSongSearch} className="flex gap-3 p-4">
                <input
                  value={songSearch}
                  onChange={(e) => setSongSearch(e.target.value)}
                  autoFocus
                  placeholder="Search songs, artists, albums..."
                  className="flex-1 rounded-lg border border-[var(--app-border)] bg-[var(--app-bg)] px-3.5 py-2 text-sm text-[var(--foreground)] outline-none placeholder:text-[var(--app-muted)]"
                />

                <button
                  disabled={searchingSongs || !songSearch.trim()}
                  className="rounded-lg bg-[var(--app-accent-strong)] px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50"
                >
                  {searchingSongs ? "Searching..." : "Search"}
                </button>
              </form>

              <div className="max-h-[55vh] overflow-y-auto px-5 pb-5">
                {searchingSongs ? (
                  <TableSkeleton rows={5} columns={4} />
                ) : songResults.length === 0 ? (
                  <EmptyState
                    title="Search for songs"
                    description="Find tracks by title, artist, or album and add them to this playlist."
                  />
                ) : (
                  <div className="space-y-2">
                    {songResults.map((song: any) => {
                      const normalized = normalizeTrack(song);
                      return (
                      <div
                        key={song.id}
                        className="flex items-center gap-3 rounded-lg p-2.5 hover:bg-white/5"
                      >
                        <img
                          src={normalized.coverArt}
                          alt=""
                          className="h-10 w-10 rounded object-cover"
                        />

                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-semibold text-[var(--foreground)]">
                            {normalized.title}
                          </div>
                          <div className="truncate text-sm text-[var(--app-muted)]">
                            {normalized.artist} · {normalized.album}
                          </div>
                        </div>

                        <button
                          onClick={() => handleAddSong(song.id)}
                          disabled={addingSongId === song.id}
                          className="rounded-lg bg-[var(--app-accent-strong)] px-3 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50"
                        >
                          {addingSongId === song.id ? "Adding..." : "Add"}
                        </button>
                      </div>
                    )})}
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        <section className="mt-8 px-5 sm:px-6 lg:px-8">
          <TextInput
            icon={Search}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter songs..."
            className="mb-7 max-w-xs"
          />

          {filteredSongs.length === 0 && (
            <div className="py-6">
              <EmptyState
                title={songs.length === 0 ? "This playlist is empty" : "No songs match your filter"}
                description={songs.length === 0 ? "Add your first song to get started." : undefined}
              />
              {songs.length === 0 && (
              <button
                onClick={() => setShowAddSongs(true)}
                className="mx-auto mt-5 block rounded-lg bg-[var(--app-accent-strong)] px-4 py-2 text-sm font-semibold text-slate-950"
              >
                Add your first song
              </button>
              )}
            </div>
          )}

          {filteredSongs.length > 0 && (
            <div className="app-detail-panel overflow-hidden rounded-2xl">
              <div className="app-label app-table-head grid grid-cols-[50px_1.5fr_1fr_1fr_90px_120px_90px] px-4 py-3">
                <div>#</div>
                <div>Title</div>
                <div>Artist</div>
                <div>Album</div>
                <div>Favorite</div>
                <div>Rating</div>
                <div>Duration</div>
              </div>

              <VirtualList
                items={filteredSongs}
                rowHeight={56}
                maxHeight={760}
                renderItem={(song: any, index) => {
                  const normalized = normalizeTrack(song);
                  const track = trackForPlayer(song);

                  return (
                    <div className="app-table-row grid h-14 grid-cols-[50px_1.5fr_1fr_1fr_90px_120px_90px] items-center px-4 text-sm">
                      <div className="text-[var(--app-muted)]">{index + 1}</div>

                      <button
                        type="button"
                        onClick={() => setTrack(track, queue)}
                        className="min-w-0 text-left"
                      >
                        <div className="truncate text-sm font-semibold text-[var(--foreground)] hover:text-[var(--app-accent)]">
                          {normalized.title}
                        </div>
                      </button>

                      <Link
                        href={normalized.artistId ? `/artists/${normalized.artistId}` : "#"}
                        onClick={(e) => e.stopPropagation()}
                        className="truncate text-[var(--app-muted)] hover:text-[var(--app-accent)] hover:underline"
                      >
                        {normalized.artist}
                      </Link>

                      <Link
                        href={normalized.albumId ? `/albums/${normalized.albumId}` : "#"}
                        onClick={(e) => e.stopPropagation()}
                        className="truncate text-[var(--app-muted)] hover:text-[var(--app-accent)] hover:underline"
                      >
                        {normalized.album}
                      </Link>

                      <FavoriteButton id={song.id} label={normalized.title} size="sm" />

                      <RatingControl
                        label={normalized.title}
                        value={ratings[song.id]}
                        size={15}
                        onRate={(rating) => updateRating(song.id, rating)}
                      />

                      <div className="text-[var(--app-muted)]">
                        {formatDuration(normalized.duration)}
                      </div>
                    </div>
                  );
                }}
              />
            </div>
          )}
        </section>

        <section className="mt-10 px-5 sm:px-6 lg:px-8">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="app-section-title">
                Suggested Songs
              </h2>
              <p className="app-muted mt-1">
                Related to the artist currently playing. Double-click a row to add it.
              </p>
            </div>

            <button
              onClick={() => loadSuggestions(songs, true)}
              disabled={loadingSuggestions || songs.length === 0}
                className="flex h-9 items-center gap-2 rounded-lg bg-[var(--app-panel)] px-3.5 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--app-panel-strong)] disabled:opacity-50"
            >
              <RefreshCw
                size={17}
                className={loadingSuggestions ? "animate-spin" : ""}
              />
              New suggestions
            </button>
          </div>

          {!loadingSuggestions && suggestions.length === 0 && (
            <EmptyState
              title="No suggestions available yet"
              description={songs.length === 0 ? "Add songs to this playlist before requesting suggestions." : "Try refreshing suggestions after playing a related artist."}
            />
          )}

          {loadingSuggestions && suggestions.length === 0 && (
            <TableSkeleton rows={6} columns={6} />
          )}

          {suggestions.length > 0 && (
            <div className="app-detail-panel overflow-hidden rounded-2xl">
              <div className="app-label app-table-head grid grid-cols-[50px_1.5fr_1fr_1fr_90px_60px] px-4 py-3">
                <div>#</div>
                <div>Title</div>
                <div>Artist</div>
                <div>Album</div>
                <div>Duration</div>
                <div />
              </div>

              {suggestions.map((song: any, index: number) => {
                const normalized = normalizeTrack(song);
                const track = trackForPlayer(song);

                return (
                  <div
                    key={song.id}
                    onDoubleClick={(event) => {
                      if ((event.target as HTMLElement).closest("button, a")) return;
                      handleAddSong(song.id);
                    }}
                    className="app-table-row grid min-h-14 grid-cols-[50px_1.5fr_1fr_1fr_90px_60px] items-center px-4 py-2 text-sm"
                  >
                    <div className="text-[var(--app-muted)]">{index + 1}</div>

                    <div className="flex min-w-0 items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setTrack(track, [track])}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--app-accent-strong)] text-slate-950 hover:brightness-110"
                        aria-label={`Play ${normalized.title}`}
                      >
                        <Play size={13} fill="currentColor" />
                      </button>
                      <div className="truncate font-semibold text-[var(--foreground)]">
                        {normalized.title}
                      </div>
                    </div>

                    <Link
                      href={song.artistId ? `/artists/${song.artistId}` : "#"}
                      className="truncate text-[var(--app-muted)] hover:text-[var(--app-accent)] hover:underline"
                    >
                      {normalized.artist}
                    </Link>

                    <Link
                      href={song.albumId ? `/albums/${song.albumId}` : "#"}
                      className="truncate text-[var(--app-muted)] hover:text-[var(--app-accent)] hover:underline"
                    >
                      {normalized.album}
                    </Link>

                    <div className="text-[var(--app-muted)]">
                      {formatDuration(normalized.duration)}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleAddSong(song.id)}
                      disabled={addingSongId === song.id}
                      className="ml-auto flex h-8 w-8 items-center justify-center rounded-full text-[var(--app-muted)] hover:bg-white/10 hover:text-[var(--app-accent)] disabled:opacity-50"
                      aria-label={`Add ${normalized.title} to playlist`}
                    >
                      {addingSongId === song.id ? (
                        <RefreshCw size={15} className="animate-spin" />
                      ) : (
                        <Plus size={18} />
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </PageShell>
  );
}

function CsvImportReportModal({
  onClose,
  playlistName,
  report,
}: {
  onClose: () => void;
  playlistName: string;
  report: CsvImportReport;
}) {
  function formatTrack(track: CsvReportTrack) {
    return [
      track.title || "Unknown title",
      track.artist || "Unknown artist",
      track.album || "",
      typeof track.score === "number"
        ? `Score: ${track.score.toFixed(2)} (threshold: ${(track.threshold || 0).toFixed(2)})`
        : "",
    ]
      .filter(Boolean)
      .join(" | ");
  }

  function downloadReport() {
    const lines = [
      `CSV Import Report - ${playlistName}`,
      "",
      `Total: ${report.total}`,
      `Added: ${report.added}`,
      `Duplicates: ${report.duplicates.length}`,
      `Not Found: ${report.notFound.length}`,
      "",
      "Duplicate Tracks:",
      ...(report.duplicates.length
        ? report.duplicates.map(formatTrack)
        : ["None"]),
      "",
      "Tracks Not Found:",
      ...(report.notFound.length ? report.notFound.map(formatTrack) : ["None"]),
      "",
    ];

    const blob = new Blob([lines.join("\n")], {
      type: "text/plain;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${playlistName || "playlist"}-csv-import-report.txt`
      .replace(/[^\w.-]+/g, "-")
      .replace(/-+/g, "-");
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6 backdrop-blur-sm">
      <div className="app-detail-panel max-h-[88vh] w-full max-w-3xl overflow-hidden rounded-3xl text-[var(--foreground)]">
        <div className="flex items-start justify-between gap-4 p-6 pb-3">
          <h2 className="app-section-title">
            CSV Import Report
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-[var(--app-muted)] hover:bg-white/10 hover:text-[var(--foreground)]"
            aria-label="Close CSV import report"
          >
            <X size={22} />
          </button>
        </div>

        <div className="grid grid-cols-4 gap-4 px-6 py-5 text-center">
          <ReportStat label="Total" value={report.total} />
          <ReportStat label="Added" value={report.added} accent="text-[var(--app-accent)]" />
          <ReportStat label="Duplicates" value={report.duplicates.length} />
          <ReportStat label="Not Found" value={report.notFound.length} accent="text-red-300" />
        </div>

        <div className="max-h-[44vh] space-y-3 overflow-y-auto px-6 pb-5">
          <ReportTrackList
            title="Duplicate Tracks (Already in Playlist)"
            tracks={report.duplicates}
          />
          <ReportTrackList title="Tracks Not Found" tracks={report.notFound} />
        </div>

        <div className="flex justify-end gap-3 border-t border-[var(--app-border)] bg-black/10 px-6 py-4">
          <button
            onClick={downloadReport}
            className="flex items-center gap-2 rounded-lg border border-[var(--app-border)] bg-[var(--app-panel)] px-4 py-2 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--app-panel-strong)]"
          >
            <Download size={17} />
            Download Report
          </button>
          <button
            onClick={onClose}
            className="rounded-lg bg-[var(--app-accent)] px-5 py-2 text-sm font-semibold text-black hover:brightness-110"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function ReportStat({
  accent = "",
  label,
  value,
}: {
  accent?: string;
  label: string;
  value: number;
}) {
  return (
    <div>
      <div className={`text-2xl font-bold ${accent}`}>{value}</div>
      <div className="app-muted mt-1">
        {label}
      </div>
    </div>
  );
}

function ReportTrackList({
  title,
  tracks,
}: {
  title: string;
  tracks: CsvReportTrack[];
}) {
  return (
    <details open={tracks.length > 0} className="group rounded-2xl border border-[var(--app-border)] bg-black/10">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-3 text-sm font-semibold text-[var(--app-muted)]">
        <span>
          {title}: {tracks.length}
        </span>
        <ChevronDown
          size={22}
          className="transition group-open:rotate-180"
        />
      </summary>

      {tracks.length === 0 ? (
        <div className="px-5 pb-5 text-sm text-[var(--app-muted)]">None</div>
      ) : (
        <div className="space-y-4 px-5 pb-5">
          {tracks.map((track, index) => (
            <div key={`${track.title}-${track.artist}-${index}`}>
              <div className="text-sm font-semibold">{track.title || "Unknown title"}</div>
              <div className="app-muted">
                {track.artist || "Unknown artist"}
              </div>
              {track.album && (
                <div className="app-muted text-xs">
                  {track.album}
                </div>
              )}
              {typeof track.score === "number" && (
                <div className="app-muted mt-1 text-xs">
                  Score:{" "}
                  <span className={track.score < (track.threshold || 0) ? "text-red-300" : "text-[var(--app-accent)]"}>
                    {track.score.toFixed(2)}
                  </span>{" "}
                  (threshold: {(track.threshold || 0).toFixed(2)})
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </details>
  );
}
