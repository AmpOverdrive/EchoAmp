"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Cast,
  ChevronDown,
  Heart,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import {
  createInternetRadioStation,
  deleteInternetRadioStation,
  getInternetRadioStations,
  updateInternetRadioStation,
  getCoverArtUrl,
} from "@/lib/navidrome";
import { usePlayerStore } from "@/lib/player-store";
import {
  CardGridSkeleton,
  EmptyState,
  ErrorState,
  PageShell,
} from "@/components/ui/AppPrimitives";

type RadioStation = {
  id: string;
  name: string;
  streamUrl: string;
  homePageUrl?: string;
  homepageUrl?: string;
  favicon?: string;
  coverArt?: string;
  imageUrl?: string;
  logoUrl?: string;
};

type DirectoryStation = {
  name: string;
  url_resolved?: string;
  url?: string;
  homepage?: string;
  favicon?: string;
  country?: string;
  tags?: string;
};

const letters = ["#", ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("")];

function cleanText(value: any) {
  if (!value) return "";
  return String(value)
    .replaceAll("&amp;", "&")
    .replaceAll("&#34;", '"')
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&apos;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

function stationHomePage(station: RadioStation) {
  return station.homePageUrl || station.homepageUrl || "";
}

function stationImage(station: RadioStation | DirectoryStation) {
  if ("coverArt" in station && station.coverArt) {
    if (station.coverArt.startsWith("http") || station.coverArt.startsWith("/")) {
      return station.coverArt;
    }

    return getCoverArtUrl(station.coverArt);
  }

  if ("imageUrl" in station && station.imageUrl) return station.imageUrl;
  if ("logoUrl" in station && station.logoUrl) return station.logoUrl;
  if ("favicon" in station && station.favicon) return station.favicon;

  const homepage = "streamUrl" in station ? stationHomePage(station) : station.homepage;

  if (!homepage) return "";

  try {
    const host = new URL(homepage).hostname;
    return `https://www.google.com/s2/favicons?domain=${host}&sz=256`;
  } catch {
    return "";
  }
}

function stationInitials(name = "Radio") {
  const parts = cleanText(name)
    .replace(/[^\w\s]/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  const initials = parts.slice(0, 2).map((part) => part[0]).join("");
  return (initials || name.slice(0, 2) || "R").toUpperCase();
}

function firstLetter(name = "") {
  const char = cleanText(name).trim().charAt(0).toUpperCase();
  return /^[A-Z]$/.test(char) ? char : "#";
}

function RadioPlaceholder({
  name = "Radio",
  compact = false,
}: {
  name?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={`flex h-full w-full flex-col items-center justify-center bg-[var(--app-panel-strong)] ${
        compact ? "p-2" : "p-5"
      } text-[var(--app-accent)]`}
    >
      <div
        className={`rounded-full bg-[var(--app-accent-soft)] ${
          compact ? "mb-1 p-1.5" : "mb-3 p-3"
        }`}
      >
        <Cast size={compact ? 15 : 31} />
      </div>
      <div
        className={`max-w-full truncate font-bold tracking-tight ${
          compact ? "text-sm" : "text-3xl"
        }`}
      >
        {stationInitials(name)}
      </div>
    </div>
  );
}

export default function InternetRadioPage() {
  const [stations, setStations] = useState<RadioStation[]>([]);
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});
  const [filter, setFilter] = useState<"all" | "favorites">("all");
  const [letter, setLetter] = useState<string>("all");
  const [sortMode, setSortMode] = useState("Manual");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [status, setStatus] = useState("");
  const [modalStation, setModalStation] = useState<RadioStation | null>(null);
  const [isStationModalOpen, setIsStationModalOpen] = useState(false);
  const [isDirectoryOpen, setIsDirectoryOpen] = useState(false);
  const setTrack = usePlayerStore((s) => s.setTrack);

  async function loadStations() {
    setLoading(true);
    setLoadError("");
    try {
      const data = await getInternetRadioStations();
      setStations(data.filter(Boolean));
    } catch (error) {
      console.error("Failed to load radio stations:", error);
      setLoadError("Unable to load radio stations.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStations();

    const saved = window.localStorage.getItem("navidrome-radio-favorites");
    if (saved) setFavorites(JSON.parse(saved));
  }, []);

  useEffect(() => {
    window.localStorage.setItem(
      "navidrome-radio-favorites",
      JSON.stringify(favorites)
    );
  }, [favorites]);

  const visibleStations = useMemo(() => {
    const next = stations.filter((station) => {
      if (filter === "favorites" && !favorites[station.id]) return false;
      if (letter !== "all" && firstLetter(station.name) !== letter) return false;
      return true;
    });

    if (sortMode === "Name") {
      return [...next].sort((a, b) => a.name.localeCompare(b.name));
    }

    return next;
  }, [favorites, filter, letter, sortMode, stations]);

  function playStation(station: RadioStation) {
    const image = stationImage(station);

    setTrack({
      id: `radio-${station.id}`,
      title: cleanText(station.name),
      artist: "Internet Radio",
      album: stationHomePage(station),
      coverArt: image || "",
      streamUrl: station.streamUrl,
      kind: "radio",
    });
  }

  function toggleFavorite(id: string) {
    setFavorites((current) => ({
      ...current,
      [id]: !current[id],
    }));
  }

  function openAddModal() {
    setModalStation(null);
    setIsStationModalOpen(true);
  }

  function openEditModal(station: RadioStation) {
    setModalStation(station);
    setIsStationModalOpen(true);
  }

  return (
    <PageShell className="p-5 sm:p-6 lg:p-8">
      <div className="mb-8 flex items-start justify-between gap-6">
        <h1 className="app-title">Internet Radio</h1>

        <div className="flex flex-wrap justify-end gap-3">
          <button
            type="button"
            onClick={() => setIsDirectoryOpen(true)}
            className="flex h-10 items-center gap-2 rounded-lg bg-[var(--app-accent-strong)] px-4 text-sm font-semibold text-slate-950 transition hover:brightness-110"
          >
            <Search size={18} />
            Search Directory
          </button>

          <button
            type="button"
            onClick={openAddModal}
            className="flex h-10 items-center gap-2 rounded-lg bg-[var(--app-accent-strong)] px-4 text-sm font-semibold text-slate-950 transition hover:brightness-110"
          >
            <Plus size={18} />
            Add Station
          </button>
        </div>
      </div>

      {status && (
        <div className="mb-5 rounded-xl border border-[var(--app-border)] bg-[var(--app-panel)] px-4 py-3 text-sm font-semibold text-[var(--app-muted)]">
          {status}
        </div>
      )}

      <div className="mb-7 flex items-center justify-between gap-5">
        <div className="flex rounded-lg border border-[var(--app-border)] bg-[var(--app-panel)] p-1">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`rounded-md px-3 py-1.5 text-sm font-semibold transition ${
              filter === "all"
                ? "bg-[var(--app-accent-strong)] text-slate-950"
                : "text-[var(--app-muted)] hover:text-[var(--foreground)]"
            }`}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setFilter("favorites")}
            className={`rounded-md px-3 py-1.5 text-sm font-semibold transition ${
              filter === "favorites"
                ? "bg-[var(--app-accent-strong)] text-slate-950"
                : "text-[var(--app-muted)] hover:text-[var(--foreground)]"
            }`}
          >
            Favorites
          </button>
        </div>

        <label className="flex h-10 min-w-40 items-center justify-between rounded-lg border border-[var(--app-border)] bg-[var(--app-panel)] px-3 text-sm font-semibold text-[var(--app-muted)]">
          <select
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value)}
            className="w-full appearance-none bg-transparent outline-none"
          >
            <option className="bg-[var(--app-shell)]">Manual</option>
            <option className="bg-[var(--app-shell)]">Name</option>
          </select>
          <ChevronDown size={16} className="text-[var(--app-muted)]" />
        </label>
      </div>

      <div className="app-label mb-7 flex flex-wrap gap-4 px-1">
        <button
          type="button"
          onClick={() => setLetter("all")}
          className={
            letter === "all"
              ? "text-[var(--foreground)]"
              : "hover:text-[var(--app-accent)]"
          }
        >
          All
        </button>
        {letters.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setLetter(item)}
            className={
              letter === item
                ? "text-[var(--foreground)]"
                : "hover:text-[var(--app-accent)]"
            }
          >
            {item}
          </button>
        ))}
      </div>

      {loading ? (
        <div>
          <CardGridSkeleton count={12} />
        </div>
      ) : loadError ? (
        <ErrorState
          title={loadError}
          description="Check your Navidrome connection and try again."
          onRetry={loadStations}
        />
      ) : visibleStations.length === 0 ? (
        <EmptyState
          title={filter === "favorites" ? "No favorite stations" : "No radio stations found"}
          description={
            filter === "favorites"
              ? "Heart stations you like and they will appear here."
              : "Add a station manually or search the radio directory."
          }
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <button
                type="button"
                onClick={() => setIsDirectoryOpen(true)}
                className="rounded-lg bg-[var(--app-accent-strong)] px-4 py-2 text-sm font-bold text-slate-950 hover:brightness-110"
              >
                Search Directory
              </button>
              <button
                type="button"
                onClick={openAddModal}
                className="rounded-lg border border-[var(--app-border)] bg-[var(--app-panel)] px-4 py-2 text-sm font-bold text-[var(--foreground)] hover:bg-[var(--app-panel-strong)]"
              >
                Add Station
              </button>
            </div>
          }
        />
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-5 2xl:grid-cols-6">
          {visibleStations.map((station) => (
            <StationCard
              key={station.id}
              station={station}
              favorite={Boolean(favorites[station.id])}
              onPlay={() => playStation(station)}
              onEdit={() => openEditModal(station)}
              onToggleFavorite={() => toggleFavorite(station.id)}
            />
          ))}
        </div>
      )}

      {isStationModalOpen && (
        <StationModal
          station={modalStation}
          onClose={() => setIsStationModalOpen(false)}
          onSaved={async () => {
            setIsStationModalOpen(false);
            setStatus(modalStation ? "Station updated." : "Station added.");
            await loadStations();
          }}
        />
      )}

      {isDirectoryOpen && (
        <DirectoryModal
          onClose={() => setIsDirectoryOpen(false)}
          onImport={async (station) => {
            await createInternetRadioStation({
              name: cleanText(station.name),
              streamUrl: station.url_resolved || station.url || "",
              homePageUrl: station.homepage || "",
            });
            setStatus(`${cleanText(station.name)} added.`);
            await loadStations();
          }}
        />
      )}
    </PageShell>
  );
}

function StationCard({
  station,
  favorite,
  onPlay,
  onEdit,
  onToggleFavorite,
}: {
  station: RadioStation;
  favorite: boolean;
  onPlay: () => void;
  onEdit: () => void;
  onToggleFavorite: () => void;
}) {
  const image = stationImage(station);
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = image && !imageFailed;

  return (
    <div className="overflow-hidden rounded-lg border border-[var(--app-border)] bg-[var(--app-panel)]">
      <button
        type="button"
        onClick={onPlay}
        className="flex aspect-square w-full items-center justify-center bg-[var(--app-panel-strong)]"
      >
        {showImage ? (
          <img
            src={image}
            alt={cleanText(station.name)}
            className="h-full w-full object-cover"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <RadioPlaceholder name={cleanText(station.name)} />
        )}
      </button>

      <div className="p-3">
        <button
          type="button"
          onClick={onPlay}
          className="app-card-title block w-full truncate text-left"
        >
          {cleanText(station.name)}
        </button>

        <div className="mt-3 flex items-center gap-3">
          <button
            type="button"
            onClick={onEdit}
            className="rounded-full bg-[var(--app-accent-soft)] px-3 py-1 text-xs font-semibold text-[var(--app-accent)] transition hover:brightness-110"
          >
            Edit
          </button>

          <button
            type="button"
            onClick={onToggleFavorite}
            className={
              favorite
                ? "text-red-500"
                : "text-[var(--app-muted)] transition hover:text-red-400"
            }
            aria-label="Toggle favorite"
          >
            <Heart size={17} fill="currentColor" />
          </button>
        </div>
      </div>
    </div>
  );
}

function StationModal({
  station,
  onClose,
  onSaved,
}: {
  station: RadioStation | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(cleanText(station?.name) || "");
  const [streamUrl, setStreamUrl] = useState(station?.streamUrl || "");
  const [homePageUrl, setHomePageUrl] = useState(station ? stationHomePage(station) : "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      if (station) {
        await updateInternetRadioStation({
          id: station.id,
          name,
          streamUrl,
          homePageUrl,
        });
      } else {
        await createInternetRadioStation({ name, streamUrl, homePageUrl });
      }

      onSaved();
    } catch (error) {
      console.error("Failed to save radio station:", error);
      setError("Could not save this station.");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!station) return;
    setSaving(true);
    setError("");
    try {
      await deleteInternetRadioStation(station.id);
      onSaved();
    } catch (error) {
      console.error("Failed to delete radio station:", error);
      setError("Could not delete this station.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-5">
      <form
        onSubmit={save}
        className="w-full max-w-lg rounded-xl border border-[var(--app-border)] bg-[var(--app-shell)] p-5 text-[var(--foreground)] shadow-2xl"
      >
        <div className="mb-6 flex items-center justify-between">
          <h2 className="app-section-title">{station ? "Edit Station" : "Add Station"}</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-[var(--app-muted)] hover:text-[var(--foreground)]"
          >
            <X size={22} />
          </button>
        </div>

        <div className="space-y-4">
          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-200">
              {error}
            </div>
          )}

          <label className="block">
            <span className="app-label">Name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} required className="mt-2 h-10 w-full rounded-lg border border-[var(--app-border)] bg-[var(--app-bg)] px-3 text-sm outline-none focus:border-[var(--app-accent)]" />
          </label>

          <label className="block">
            <span className="app-label">Stream URL</span>
            <input value={streamUrl} onChange={(e) => setStreamUrl(e.target.value)} required className="mt-2 h-10 w-full rounded-lg border border-[var(--app-border)] bg-[var(--app-bg)] px-3 text-sm outline-none focus:border-[var(--app-accent)]" />
          </label>

          <label className="block">
            <span className="app-label">Homepage URL</span>
            <input value={homePageUrl} onChange={(e) => setHomePageUrl(e.target.value)} className="mt-2 h-10 w-full rounded-lg border border-[var(--app-border)] bg-[var(--app-bg)] px-3 text-sm outline-none focus:border-[var(--app-accent)]" />
          </label>
        </div>

        <div className="mt-7 flex items-center justify-between">
          {station ? (
            <button type="button" onClick={remove} disabled={saving} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-red-300 hover:bg-red-500/10">
              <Trash2 size={17} />
              Delete
            </button>
          ) : (
            <div />
          )}

          <button disabled={saving} className="flex items-center gap-2 rounded-lg bg-[var(--app-accent-strong)] px-4 py-2 text-sm font-semibold text-slate-950 hover:brightness-110 disabled:opacity-60">
            <Pencil size={16} />
            {saving ? "Saving..." : "Save Station"}
          </button>
        </div>
      </form>
    </div>
  );
}

function DirectoryModal({
  onClose,
  onImport,
}: {
  onClose: () => void;
  onImport: (station: DirectoryStation) => Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<DirectoryStation[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    let active = true;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const url = new URL("https://de1.api.radio-browser.info/json/stations/search");
        url.searchParams.set("name", query.trim());
        url.searchParams.set("hidebroken", "true");
        url.searchParams.set("limit", "20");
        url.searchParams.set("order", "votes");
        url.searchParams.set("reverse", "true");

        const res = await fetch(url);
        const data = await res.json();
        if (active) setResults(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Radio directory search failed:", error);
        if (active) setResults([]);
        if (active) setError("Unable to search the radio directory.");
      } finally {
        if (active) setLoading(false);
      }
    }, 350);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [query]);

  async function importStation(station: DirectoryStation) {
    const streamUrl = station.url_resolved || station.url || "";
    if (!streamUrl) return;

    setImporting(streamUrl);
    setError("");
    try {
      await onImport(station);
    } catch (error) {
      console.error("Failed to import radio station:", error);
      setError("Could not add that station.");
    } finally {
      setImporting(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-5">
      <div className="flex max-h-[82vh] w-full max-w-3xl flex-col rounded-xl border border-[var(--app-border)] bg-[var(--app-shell)] p-5 text-[var(--foreground)] shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="app-section-title">Search Directory</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-[var(--app-muted)] hover:text-[var(--foreground)]"
          >
            <X size={22} />
          </button>
        </div>

        <div className="relative mb-5">
          <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--app-muted)]" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} autoFocus placeholder="Search radio-browser.info" className="h-10 w-full rounded-lg border border-[var(--app-border)] bg-[var(--app-bg)] pl-10 pr-3 text-sm outline-none focus:border-[var(--app-accent)]" />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {loading && (
            <div className="flex items-center gap-3 text-[var(--app-muted)]">
              <Loader2 size={18} className="animate-spin" />
              Searching...
            </div>
          )}

          {!loading && error && (
            <div className="mb-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-200">
              {error}
            </div>
          )}

          {!loading && !error && query.trim() && results.length === 0 && (
            <EmptyState
              title="No directory results"
              description={`No stations matched "${query.trim()}".`}
            />
          )}

          <div className="space-y-2">
            {results.map((station) => {
              const streamUrl = station.url_resolved || station.url || "";
              const image = stationImage(station);
              const fallbackName = cleanText(station.name) || "Radio";

              return (
                <div key={`${station.name}-${streamUrl}`} className="flex items-center gap-3 rounded-lg bg-[var(--app-panel)] p-3 transition hover:bg-[var(--app-panel-strong)]">
                  <DirectoryThumb image={image} name={fallbackName} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">{cleanText(station.name)}</div>
                    <div className="app-muted truncate text-xs">
                      {[cleanText(station.country), cleanText(station.tags)]
                        .filter(Boolean)
                        .join(" - ")}
                    </div>
                  </div>
                  <button type="button" onClick={() => importStation(station)} disabled={!streamUrl || importing === streamUrl} className="rounded-lg bg-[var(--app-accent-strong)] px-3 py-2 text-xs font-semibold text-slate-950 hover:brightness-110 disabled:opacity-60">
                    {importing === streamUrl ? "Adding..." : "Add"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function DirectoryThumb({ image, name }: { image: string; name: string }) {
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = image && !imageFailed;

  return (
    <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[var(--app-panel-strong)]">
      {showImage ? (
        <img
          src={image}
          alt=""
          className="h-full w-full object-cover"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <RadioPlaceholder name={name} compact />
      )}
    </div>
  );
}
