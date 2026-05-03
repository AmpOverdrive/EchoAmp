"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  AudioLines,
  Check,
  ChevronDown,
  Clock,
  Database,
  Download,
  Grid2X2,
  HardDrive,
  Info,
  Keyboard,
  Library,
  LogOut,
  Maximize2,
  MonitorCog,
  Music2,
  Palette,
  Plus,
  Search,
  Server,
  Sparkles,
  Trash2,
  Type,
  Users,
  Wifi,
  ZoomIn,
} from "lucide-react";
import {
  clearLastfmSession,
  completeLastfmAuth,
  createLastfmAuthUrl,
  getLastfmDiagnostics,
  getLastfmSettings,
  LASTFM_DIAGNOSTICS_KEY,
  LASTFM_NOW_PLAYING_KEY,
  LASTFM_SCROBBLING_KEY,
  saveLastfmSession,
  scrobbleLastfmTrack,
  setLastfmFlag,
  updateLastfmNowPlaying,
} from "@/lib/lastfm-client";
import type { LastfmDiagnostics } from "@/lib/lastfm-client";
import {
  ACCENT_STORAGE_KEY,
  applyAppearance,
  getSavedAppearance,
  THEME_STORAGE_KEY,
  accentOptions,
  themeGroups,
} from "@/components/AppearanceProvider";
import type { AccentOption, ThemeOption } from "@/components/AppearanceProvider";
import { useAppSettingsStore } from "@/lib/app-settings-store";
import { usePlayerStore } from "@/lib/player-store";

type TabId =
  | "servers"
  | "library"
  | "audio"
  | "lyrics"
  | "appearance"
  | "personalisation"
  | "integrations"
  | "input"
  | "storage"
  | "system"
  | "users";

const tabs: Array<{ id: TabId; label: string; icon: ReactNode }> = [
  { id: "servers", label: "Servers", icon: <Server size={15} /> },
  { id: "library", label: "Library", icon: <Library size={15} /> },
  { id: "audio", label: "Audio", icon: <AudioLines size={15} /> },
  { id: "lyrics", label: "Lyrics", icon: <Music2 size={15} /> },
  { id: "appearance", label: "Appearance", icon: <Palette size={15} /> },
  { id: "personalisation", label: "Personalisation", icon: <Grid2X2 size={15} /> },
  { id: "integrations", label: "Integrations", icon: <Sparkles size={15} /> },
  { id: "input", label: "Input", icon: <Keyboard size={15} /> },
  { id: "storage", label: "Storage", icon: <HardDrive size={15} /> },
  { id: "system", label: "System", icon: <MonitorCog size={15} /> },
  { id: "users", label: "Users", icon: <Users size={15} /> },
];

const ACCENT_VERSION_KEY = "navidrome-accent-v2";

const settingsIndex: Array<{ tab: TabId; title: string; keywords: string }> = [
  { tab: "servers", title: "Navidrome Server", keywords: "connection host localhost login audiomuse" },
  { tab: "library", title: "Library Refresh", keywords: "scan metadata musicbrainz albums sorting release sections" },
  { tab: "audio", title: "Playback Engine", keywords: "crossfade replaygain gapless bitrate device output hot cache" },
  { tab: "lyrics", title: "Lyrics", keywords: "synced fullscreen lrclib provider" },
  { tab: "appearance", title: "Theme", keywords: "appearance colors palette scheduler visual options" },
  { tab: "personalisation", title: "Personalisation", keywords: "home page now playing similar artists tour dates" },
  { tab: "integrations", title: "Integrations", keywords: "lastfm ticketmaster bandsintown navidrome scrobbling" },
  { tab: "input", title: "Keyboard Input", keywords: "shortcuts media keys spacebar global" },
  { tab: "storage", title: "Storage & Cache", keywords: "offline image cache album art downloads clear" },
  { tab: "system", title: "System", keywords: "version diagnostics reset logging danger" },
  { tab: "users", title: "Users", keywords: "admin multi user sessions orbit" },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabId>("servers");
  const [searchQuery, setSearchQuery] = useState("");

  const activeTabLabel = tabs.find((tab) => tab.id === activeTab)?.label || "Settings";
  const searchResults = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return [];

    return settingsIndex
      .map((item) => {
        const haystack = `${item.title} ${item.keywords}`.toLowerCase();
        const score = haystack.includes(query) ? 2 : query.split(/\s+/).filter((part) => haystack.includes(part)).length;
        return { ...item, score };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score);
  }, [searchQuery]);

  return (
    <main className="min-h-screen bg-[var(--app-bg)] px-5 py-5 pb-32 text-white transition-colors">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="app-title">Settings</h1>
          <p className="app-muted mt-1">
            Tune the app, server, playback, and visual behavior.
          </p>
        </div>

        <div className="relative w-full max-w-sm">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--app-muted)]" />
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search settings..."
            className="h-9 w-full rounded-lg border border-[var(--app-border)] bg-[var(--app-shell)] pl-9 pr-3 text-sm font-medium text-white/80 outline-none transition focus:border-[var(--app-accent)]"
          />
        </div>
      </div>

      <nav className="mb-5 flex gap-1 overflow-x-auto rounded-xl border border-[var(--app-border)] bg-[var(--app-panel)] p-1">
        {tabs.map((tab) => {
          const active = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActiveTab(tab.id);
                setSearchQuery("");
              }}
              className={[
                "flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition",
                active
                  ? "bg-[var(--app-accent-soft)] text-[var(--app-accent)]"
                  : "text-[var(--app-muted)] hover:bg-white/5 hover:text-white/80",
              ].join(" ")}
            >
              {tab.icon}
              {tab.label}
            </button>
          );
        })}
      </nav>

      {searchQuery.trim() ? (
        <SearchResults results={searchResults} onSelect={setActiveTab} />
      ) : (
        <section>
          <div className="mb-4 flex items-center gap-2">
            <span className="text-[var(--app-accent)]">
              {tabs.find((tab) => tab.id === activeTab)?.icon}
            </span>
            <h2 className="app-section-title">{activeTabLabel}</h2>
          </div>

          {activeTab === "servers" && <ServersPanel />}
          {activeTab === "library" && <LibraryPanel />}
          {activeTab === "audio" && <AudioPanel />}
          {activeTab === "lyrics" && <LyricsPanel />}
          {activeTab === "appearance" && <AppearancePanel />}
          {activeTab === "personalisation" && <PersonalisationPanel />}
          {activeTab === "integrations" && <IntegrationsPanel />}
          {activeTab === "input" && <InputPanel />}
          {activeTab === "storage" && <StoragePanel />}
          {activeTab === "system" && <SystemPanel />}
          {activeTab === "users" && <UsersPanel />}
        </section>
      )}
    </main>
  );
}

function SearchResults({
  results,
  onSelect,
}: {
  results: Array<{ tab: TabId; title: string; keywords: string; score: number }>;
  onSelect: (tab: TabId) => void;
}) {
  if (!results.length) {
    return (
      <SettingsCard>
        <p className="app-muted">No settings matched your search.</p>
      </SettingsCard>
    );
  }

  return (
    <div className="space-y-3">
      {results.map((result) => (
        <button
          key={`${result.tab}-${result.title}`}
          type="button"
          onClick={() => onSelect(result.tab)}
          className="flex w-full items-center justify-between rounded-xl border border-[var(--app-border)] bg-[var(--app-shell)] p-4 text-left transition hover:border-[var(--app-accent)]"
        >
          <div>
            <div className="app-card-title">{result.title}</div>
            <div className="app-muted mt-1">
              {tabs.find((tab) => tab.id === result.tab)?.label}
            </div>
          </div>
          <ChevronDown size={17} className="-rotate-90 text-[var(--app-muted)]" />
        </button>
      ))}
    </div>
  );
}

function ServersPanel() {
  return (
    <PanelStack>
      <SubSection title="Server Profiles" icon={<Server size={16} />} defaultOpen>
        <SettingsCard highlight>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex gap-4">
              <div className="mt-1 cursor-grab text-[var(--app-muted)]">::</div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="app-card-title">Navidrome</h3>
                  <Badge>Active</Badge>
                </div>
                <div className="mt-1 text-sm font-semibold text-[var(--app-muted)]">localhost:4533</div>
                <div className="mt-1 text-sm font-semibold text-[var(--app-muted)]">admin</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge>Connected</Badge>
              <Badge muted>Profile editing soon</Badge>
            </div>
          </div>
        </SettingsCard>
      </SubSection>

      <SubSection title="Smart Server Features" icon={<Sparkles size={16} />}>
        <SettingsCard>
          <ToggleRow
            title="AudioMuse-AI (Navidrome)"
            description="Enables Instant Mix from tracks and server-side similar artists when configured."
            control={<Badge muted>Coming soon</Badge>}
          />
        </SettingsCard>
      </SubSection>

      <div className="flex flex-wrap gap-3">
        <ActionButton icon={<Plus size={16} />} disabled>Add Server</ActionButton>
        <ActionButton variant="danger" icon={<LogOut size={16} />} disabled>Logout</ActionButton>
      </div>
    </PanelStack>
  );
}

function LibraryPanel() {
  const albumSortDefault = useAppSettingsStore((s) => s.albumSortDefault);
  const gridDensityDefault = useAppSettingsStore((s) => s.gridDensityDefault);
  const setSetting = useAppSettingsStore((s) => s.setSetting);

  return (
    <PanelStack>
      <SubSection title="Library Refresh" icon={<Library size={16} />} defaultOpen>
        <SettingsCard>
          <ToggleRow title="Scan interval" description="Automatic background refresh is not active yet." control={<Badge muted>Coming soon</Badge>} />
          <Divider />
          <ToggleRow title="Show release sections" description="Artist pages currently group albums automatically." control={<Badge>Active</Badge>} />
          <Divider />
          <ToggleRow title="Prefer MusicBrainz metadata" description="Release type tags are used when Navidrome returns them." control={<Badge>Active</Badge>} />
        </SettingsCard>
      </SubSection>

      <SubSection title="Browse Defaults" icon={<Grid2X2 size={16} />}>
        <SettingsCard>
          <ToggleRow
            title="Album sort default"
            description="Default album order on artist pages."
            control={
              <Select
                options={["Oldest first", "Newest first"]}
                value={albumSortDefault === "asc" ? "Oldest first" : "Newest first"}
                onChange={(value) => setSetting("albumSortDefault", value === "Newest first" ? "desc" : "asc")}
              />
            }
          />
          <Divider />
          <ToggleRow
            title="Grid density"
            description="Default genre album grid spacing."
            control={
              <Select
                options={["Large", "Normal", "Compact"]}
                value={gridDensityDefault === "large" ? "Large" : gridDensityDefault === "compact" ? "Compact" : "Normal"}
                onChange={(value) => setSetting("gridDensityDefault", value.toLowerCase() as "large" | "normal" | "compact")}
              />
            }
          />
        </SettingsCard>
      </SubSection>
    </PanelStack>
  );
}

function AudioPanel() {
  const showAudioQualityBadges = useAppSettingsStore((s) => s.showAudioQualityBadges);
  const setSetting = useAppSettingsStore((s) => s.setSetting);

  return (
    <PanelStack>
      <SubSection title="Playback Engine" icon={<AudioLines size={16} />} defaultOpen>
        <SettingsCard>
          <ToggleRow title="Crossfade" description="Blend tracks together during playback." control={<Badge muted>Coming soon</Badge>} />
          <Divider />
          <ToggleRow title="ReplayGain" description="Normalize playback volume when metadata exists." control={<Badge muted>Coming soon</Badge>} />
          <Divider />
          <ToggleRow title="Gapless playback" description="Reduce silence between consecutive tracks." control={<Badge muted>Coming soon</Badge>} />
          <Divider />
          <ToggleRow
            title="Audio quality badges"
            description="Show codec, bitrate and sample rate on Now Playing."
            control={
              <Toggle
                checked={showAudioQualityBadges}
                onChange={(value) => setSetting("showAudioQualityBadges", value)}
              />
            }
          />
        </SettingsCard>
      </SubSection>

      <SubSection title="Output & Cache" icon={<Database size={16} />}>
        <SettingsCard>
          <ToggleRow title="Output device" description="Browser output routing is not active yet." control={<Badge muted>Coming soon</Badge>} />
          <Divider />
          <ToggleRow title="Hot cache" description="Pre-cache nearby tracks for smoother playback." control={<Badge muted>Coming soon</Badge>} />
        </SettingsCard>
      </SubSection>
    </PanelStack>
  );
}

function LyricsPanel() {
  const syncedLyrics = useAppSettingsStore((s) => s.syncedLyrics);
  const fullscreenLyrics = useAppSettingsStore((s) => s.fullscreenLyrics);
  const lyricsProvider = useAppSettingsStore((s) => s.lyricsProvider);
  const setSetting = useAppSettingsStore((s) => s.setSetting);

  return (
    <PanelStack>
      <SubSection title="Lyrics Display" icon={<Music2 size={16} />} defaultOpen>
        <SettingsCard>
          <ToggleRow
            title="Synced lyrics"
            description="Show time-synced lyrics when available."
            control={
              <Toggle
                checked={syncedLyrics}
                onChange={(value) => setSetting("syncedLyrics", value)}
              />
            }
          />
          <Divider />
          <ToggleRow
            title="Fullscreen lyrics"
            description="Use larger animated lyrics in fullscreen mode."
            control={
              <Toggle
                checked={fullscreenLyrics}
                onChange={(value) => setSetting("fullscreenLyrics", value)}
              />
            }
          />
          <Divider />
          <ToggleRow
            title="Lyrics provider"
            description="Choose the Navidrome lyric lookup mode."
            control={
              <Select
                options={["Auto", "Navidrome"]}
                value={lyricsProvider === "navidrome" ? "Navidrome" : "Auto"}
                onChange={(value) => setSetting("lyricsProvider", value === "Navidrome" ? "navidrome" : "auto")}
              />
            }
          />
        </SettingsCard>
      </SubSection>
    </PanelStack>
  );
}

const FONTS: Array<{ id: string; label: string; stack: string }> = [
  { id: "inter",             label: "Inter",             stack: "'Inter Variable', sans-serif" },
  { id: "outfit",            label: "Outfit",            stack: "'Outfit Variable', sans-serif" },
  { id: "dm-sans",           label: "DM Sans",           stack: "'DM Sans Variable', sans-serif" },
  { id: "nunito",            label: "Nunito",            stack: "'Nunito Variable', sans-serif" },
  { id: "rubik",             label: "Rubik",             stack: "'Rubik Variable', sans-serif" },
  { id: "space-grotesk",     label: "Space Grotesk",     stack: "'Space Grotesk Variable', sans-serif" },
  { id: "figtree",           label: "Figtree",           stack: "'Figtree Variable', sans-serif" },
  { id: "manrope",           label: "Manrope",           stack: "'Manrope Variable', sans-serif" },
  { id: "plus-jakarta-sans", label: "Plus Jakarta Sans", stack: "'Plus Jakarta Sans Variable', sans-serif" },
  { id: "lexend",            label: "Lexend",            stack: "'Lexend Variable', sans-serif" },
  { id: "geist",             label: "Geist",             stack: "'Geist Variable', sans-serif" },
  { id: "jetbrains-mono",    label: "JetBrains Mono",    stack: "'JetBrains Mono Variable', monospace" },
  { id: "golos-text",        label: "Golos Text",        stack: "'Golos Text Variable', sans-serif" },
  { id: "unbounded",         label: "Unbounded",         stack: "'Unbounded Variable', sans-serif" },
];

const UI_SCALE_PRESETS = [80, 90, 100, 110, 125, 150];

const SEEKBAR_STYLES: Array<{ id: string; label: string }> = [
  { id: "truewave",     label: "True Wave" },
  { id: "pseudowave",   label: "Pseudo Wave" },
  { id: "linedot",      label: "Line & Dot" },
  { id: "bar",          label: "Bar" },
  { id: "thick",        label: "Thick" },
  { id: "segmented",    label: "Segmented" },
  { id: "neon",         label: "Neon" },
  { id: "pulsewave",    label: "Pulse Wave" },
  { id: "particletrail",label: "Particle Trail" },
  { id: "liquidfill",   label: "Liquid Fill" },
  { id: "retrotape",    label: "Retro Tape" },
];

function FontPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const current = FONTS.find((f) => f.id === value) ?? FONTS[0];

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 rounded-lg border border-[var(--app-border)] bg-[var(--app-bg)] px-3 py-2 text-sm font-semibold text-white/80 transition hover:border-[var(--app-accent)]"
      >
        <span style={{ fontFamily: current.stack }}>{current.label}</span>
        <ChevronDown
          size={14}
          className={[
            "text-[var(--app-muted)] transition",
            open ? "rotate-180" : "",
          ].join(" ")}
        />
      </button>
      {open && (
        <div className="mt-2 flex flex-col gap-1">
          {FONTS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => { onChange(f.id); setOpen(false); }}
              className={[
                "rounded-lg px-3 py-2 text-left text-sm font-semibold transition",
                value === f.id
                  ? "bg-[var(--app-accent-soft)] text-[var(--app-accent)]"
                  : "text-white/70 hover:bg-white/5 hover:text-white/90",
              ].join(" ")}
              style={{ fontFamily: f.stack }}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function UiScalePicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const currentPct = Math.round(value * 100);
  let idx = UI_SCALE_PRESETS.indexOf(currentPct);
  if (idx < 0) {
    idx = UI_SCALE_PRESETS.reduce(
      (best, p, i) => (Math.abs(p - currentPct) < Math.abs(UI_SCALE_PRESETS[best] - currentPct) ? i : best),
      0,
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-[var(--app-muted)]">UI Scale</span>
        <span className="text-sm font-semibold text-[var(--app-accent)]">{currentPct}%</span>
      </div>
      <input
        type="range"
        min={0}
        max={UI_SCALE_PRESETS.length - 1}
        step={1}
        value={idx}
        onChange={(e) => onChange(UI_SCALE_PRESETS[parseInt(e.target.value, 10)] / 100)}
        className="w-full accent-[var(--app-accent)]"
      />
      <div className="flex justify-between">
        {UI_SCALE_PRESETS.map((p) => {
          const active = currentPct === p;
          return (
            <button
              key={p}
              type="button"
              onClick={() => onChange(p / 100)}
              className={[
                "rounded-lg px-2 py-0.5 text-xs font-semibold transition",
                active
                  ? "text-[var(--app-accent)]"
                  : "text-[var(--app-muted)] opacity-50 hover:opacity-80",
              ].join(" ")}
            >
              {p}%
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SeekbarStylePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {SEEKBAR_STYLES.map((s) => {
        const active = value === s.id;
        return (
          <button
            key={s.id}
            type="button"
            onClick={() => onChange(s.id)}
            className={[
              "rounded-lg border px-3 py-1.5 text-xs font-semibold transition",
              active
                ? "border-[var(--app-accent)] bg-[var(--app-accent-soft)] text-[var(--app-accent)]"
                : "border-[var(--app-border)] text-[var(--app-muted)] hover:border-[var(--app-accent)] hover:text-white/80",
            ].join(" ")}
          >
            {s.label}
          </button>
        );
      })}
    </div>
  );
}

function AppearancePanel() {
  const [theme, setTheme] = useState<ThemeOption>("psysonic-dark");
  const [accent, setAccent] = useState<AccentOption>("Theme");
  const font = useAppSettingsStore((s) => s.uiFont);
  const uiScale = useAppSettingsStore((s) => s.uiScale);
  const seekbarStyle = useAppSettingsStore((s) => s.seekbarStyle);
  const fsArtistPortrait = useAppSettingsStore((s) => s.fullscreenArtistPortrait);
  const portraitDimming = useAppSettingsStore((s) => s.portraitDimming);
  const [themeSchedulerEnabled, setThemeSchedulerEnabled] = useState(false);
  const coverArtBg = useAppSettingsStore((s) => s.coverArtBackground);
  const floatingPlayerBar = useAppSettingsStore((s) => s.floatingPlayerBar);
  const showBitrate = useAppSettingsStore((s) => s.showAudioQualityBadges);
  const glassEffects = useAppSettingsStore((s) => s.glassEffects);
  const setSetting = useAppSettingsStore((s) => s.setSetting);

  useEffect(() => {
    const saved = getSavedAppearance();
    setTheme(saved.theme);
    setAccent(saved.accent);
  }, []);

  function updateTheme(nextTheme: string) {
    const value = nextTheme as ThemeOption;
    setTheme(value);
    window.localStorage.setItem(THEME_STORAGE_KEY, value);
    applyAppearance(value, accent);
  }

  function updateAccent(nextAccent: string) {
    const value = nextAccent as AccentOption;
    setAccent(value);
    window.localStorage.setItem(ACCENT_STORAGE_KEY, value);
    window.localStorage.setItem(ACCENT_VERSION_KEY, "1");
    applyAppearance(theme, value);
  }

  function updateFont(id: string) {
    setSetting("uiFont", id);
  }

  function updateUiScale(v: number) {
    setSetting("uiScale", v);
  }

  function updateSeekbarStyle(id: string) {
    setSetting("seekbarStyle", id);
  }

  return (
    <PanelStack>
      {/* Theme */}
      <SubSection title="Theme" icon={<Palette size={16} />} defaultOpen>
        <SettingsCard>
          {themeSchedulerEnabled && (
            <div className="mb-3 rounded-lg border border-[var(--app-accent)]/30 bg-[var(--app-accent-soft)] px-3 py-2 text-xs font-semibold text-[var(--app-accent)]">
              Theme scheduler is active — manual selection will take effect outside scheduled hours.
            </div>
          )}
          <ThemePicker value={theme} onChange={updateTheme} />
        </SettingsCard>
      </SubSection>

      {/* Theme Scheduler */}
      <SubSection title="Theme Scheduler" icon={<Clock size={16} />}>
        <SettingsCard>
          <ToggleRow
            title="Enable theme scheduler"
            description="Automatically switch between two themes based on time of day."
            control={
              <Toggle
                defaultOn={themeSchedulerEnabled}
                onChange={setThemeSchedulerEnabled}
              />
            }
          />
          {themeSchedulerEnabled && (
            <>
              <Divider />
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Day theme">
                  <Select options={themeGroups.flatMap((g) => g.themes.map((t) => t.label))} />
                </Field>
                <Field label="Day starts">
                  <Select options={["06:00", "07:00", "08:00", "09:00"]} />
                </Field>
                <Field label="Night theme">
                  <Select options={themeGroups.flatMap((g) => g.themes.map((t) => t.label))} />
                </Field>
                <Field label="Night starts">
                  <Select options={["18:00", "19:00", "20:00", "21:00"]} />
                </Field>
              </div>
            </>
          )}
        </SettingsCard>
      </SubSection>

      {/* Visual Options */}
      <SubSection title="Visual Options" icon={<Palette size={16} />}>
        <SettingsCard>
          <ToggleRow
            title="Accent color"
            description="Used for active states and highlights."
            control={<Select options={[...accentOptions]} value={accent} onChange={updateAccent} />}
          />
          <Divider />
          <ToggleRow
            title="Cover art background"
            description="Use current cover art as a soft page backdrop where available."
            control={
              <Toggle
                checked={coverArtBg}
                onChange={(value) => setSetting("coverArtBackground", value)}
              />
            }
          />
          <Divider />
          <ToggleRow
            title="Floating player bar"
            description="Detach the player bar so it floats above page content."
            control={
              <Toggle
                checked={floatingPlayerBar}
                onChange={(value) => setSetting("floatingPlayerBar", value)}
              />
            }
          />
          <Divider />
          <ToggleRow
            title="Show bitrate badge"
            description="Display codec and bitrate on the Now Playing bar."
            control={
              <Toggle
                checked={showBitrate}
                onChange={(value) => setSetting("showAudioQualityBadges", value)}
              />
            }
          />
          <Divider />
          <ToggleRow
            title="Glass effects"
            description="Use blur and translucent surfaces."
            control={
              <Toggle
                checked={glassEffects}
                onChange={(value) => setSetting("glassEffects", value)}
              />
            }
          />
        </SettingsCard>
      </SubSection>

      {/* UI Scale */}
      <SubSection title="UI Scale" icon={<ZoomIn size={16} />}>
        <SettingsCard>
          <UiScalePicker value={uiScale} onChange={updateUiScale} />
        </SettingsCard>
      </SubSection>

      {/* Font */}
      <SubSection title="Font" icon={<Type size={16} />}>
        <SettingsCard>
          <div className="app-label mb-2">
            UI Font
          </div>
          <FontPicker value={font} onChange={updateFont} />
        </SettingsCard>
      </SubSection>

      {/* Fullscreen Player */}
      <SubSection title="Fullscreen Player" icon={<Maximize2 size={16} />}>
        <SettingsCard>
          <ToggleRow
            title="Show artist portrait"
            description="Display artist image as a backdrop in the fullscreen player."
            control={
              <Toggle
                checked={fsArtistPortrait}
                onChange={(value) => setSetting("fullscreenArtistPortrait", value)}
              />
            }
          />
          {fsArtistPortrait && (
            <>
              <Divider />
              <div>
                <div className="app-card-title mb-2">Portrait dimming</div>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min={0}
                    max={80}
                    step={1}
                    value={portraitDimming}
                    onChange={(event) => setSetting("portraitDimming", Number(event.target.value))}
                    className="flex-1 accent-[var(--app-accent)]"
                  />
                  <span className="w-10 text-right text-sm font-semibold text-[var(--app-accent)]">{portraitDimming}%</span>
                </div>
              </div>
            </>
          )}
        </SettingsCard>
      </SubSection>

      {/* Seekbar Style */}
      <SubSection title="Seekbar Style" icon={<AudioLines size={16} />}>
        <SettingsCard>
          <p className="mb-3 text-sm font-semibold text-[var(--app-muted)]">
            Choose how the playback seekbar is rendered.
          </p>
          <SeekbarStylePicker value={seekbarStyle} onChange={updateSeekbarStyle} />
        </SettingsCard>
      </SubSection>
    </PanelStack>
  );
}

function PersonalisationPanel() {
  const autoOpenNowPlaying = useAppSettingsStore((s) => s.autoOpenNowPlaying);
  const compactLayout = useAppSettingsStore((s) => s.compactLayout);
  const defaultHomePage = useAppSettingsStore((s) => s.defaultHomePage);
  const showSimilarArtists = useAppSettingsStore((s) => s.showSimilarArtists);
  const showTourDates = useAppSettingsStore((s) => s.showTourDates);
  const setSetting = useAppSettingsStore((s) => s.setSetting);
  const homePageLabel =
    defaultHomePage === "/now-playing"
      ? "Now Playing"
      : defaultHomePage === "/albums"
        ? "Albums"
        : defaultHomePage === "/artists"
          ? "Artists"
          : "Library";

  return (
    <PanelStack>
      <SubSection title="Navigation" icon={<Grid2X2 size={16} />} defaultOpen>
        <SettingsCard>
          <ToggleRow
            title="Home page"
            description="Choose where the sidebar Home item takes you."
            control={
              <Select
                options={["Library", "Now Playing", "Albums", "Artists"]}
                value={homePageLabel}
                onChange={(value) => {
                  const path =
                    value === "Now Playing"
                      ? "/now-playing"
                      : value === "Albums"
                        ? "/albums"
                        : value === "Artists"
                          ? "/artists"
                          : "/library";
                  setSetting("defaultHomePage", path);
                }}
              />
            }
          />
          <Divider />
          <ToggleRow
            title="Compact layout"
            description="Reduce spacing where supported."
            control={
              <Toggle
                checked={compactLayout}
                onChange={(value) => setSetting("compactLayout", value)}
              />
            }
          />
          <Divider />
          <ToggleRow
            title="Auto-open Now Playing"
            description="Navigate to Now Playing when a song starts."
            control={
              <Toggle
                checked={autoOpenNowPlaying}
                onChange={(value) => setSetting("autoOpenNowPlaying", value)}
              />
            }
          />
        </SettingsCard>
      </SubSection>

      <SubSection title="Context Panels" icon={<Info size={16} />}>
        <SettingsCard>
          <ToggleRow
            title="Show similar artists"
            description="Use similar artist chips on detail pages."
            control={
              <Toggle
                checked={showSimilarArtists}
                onChange={(value) => setSetting("showSimilarArtists", value)}
              />
            }
          />
          <Divider />
          <ToggleRow
            title="Show tour dates"
            description="Display tour data on Now Playing."
            control={
              <Toggle
                checked={showTourDates}
                onChange={(value) => setSetting("showTourDates", value)}
              />
            }
          />
        </SettingsCard>
      </SubSection>
    </PanelStack>
  );
}

function IntegrationsPanel() {
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const [lastfmToken, setLastfmToken] = useState("");
  const [lastfmStatus, setLastfmStatus] = useState("");
  const [lastfmBusy, setLastfmBusy] = useState(false);
  const [lastfmDiagnostics, setLastfmDiagnostics] = useState<LastfmDiagnostics>(() =>
    typeof window === "undefined" ? {} : getLastfmDiagnostics()
  );
  const [lastfm, setLastfm] = useState(() =>
    typeof window === "undefined"
      ? {
          sessionKey: "",
          username: "",
          scrobblingEnabled: false,
          nowPlayingEnabled: false,
        }
      : getLastfmSettings()
  );

  function refreshLastfmSettings() {
    setLastfm(getLastfmSettings());
    setLastfmDiagnostics(getLastfmDiagnostics());
  }

  useEffect(() => {
    function refreshDiagnostics() {
      setLastfmDiagnostics(getLastfmDiagnostics());
    }

    window.addEventListener("lastfm-diagnostics-changed", refreshDiagnostics);
    window.addEventListener("lastfm-settings-changed", refreshDiagnostics);

    return () => {
      window.removeEventListener("lastfm-diagnostics-changed", refreshDiagnostics);
      window.removeEventListener("lastfm-settings-changed", refreshDiagnostics);
    };
  }, []);

  async function connectLastfm() {
    setLastfmBusy(true);
    setLastfmStatus("");

    try {
      const { token, url } = await createLastfmAuthUrl();
      setLastfmToken(token);
      window.open(url, "_blank", "noopener,noreferrer");
      setLastfmStatus("Authorize the app in Last.fm, then click Complete connection.");
    } catch (error) {
      console.error("Last.fm auth failed:", error);
      setLastfmStatus("Could not start Last.fm authorization.");
    } finally {
      setLastfmBusy(false);
    }
  }

  async function completeLastfmConnection() {
    if (!lastfmToken) return;
    setLastfmBusy(true);

    try {
      const session = await completeLastfmAuth(lastfmToken);
      saveLastfmSession(session.sessionKey, session.username);
      setLastfmToken("");
      setLastfmStatus(`Connected as @${session.username}.`);
      refreshLastfmSettings();
    } catch (error) {
      console.error("Last.fm session failed:", error);
      setLastfmStatus("Last.fm did not return a session. Make sure you authorized access first.");
    } finally {
      setLastfmBusy(false);
    }
  }

  function disconnectLastfm() {
    clearLastfmSession();
    setLastfmToken("");
    setLastfmStatus("Disconnected Last.fm.");
    refreshLastfmSettings();
  }

  async function testLastfm() {
    if (!lastfm.sessionKey || !currentTrack) return;

    setLastfmBusy(true);
    setLastfmStatus("");

    try {
      await updateLastfmNowPlaying(currentTrack, lastfm.sessionKey);
      await scrobbleLastfmTrack(
        currentTrack,
        lastfm.sessionKey,
        Date.now() - 60_000
      );
      setLastfmStatus(`Test sent for ${currentTrack.artist} - ${currentTrack.title}.`);
      setLastfmDiagnostics(getLastfmDiagnostics());
    } catch (error) {
      console.error("Last.fm test failed:", error);
      setLastfmStatus(error instanceof Error ? error.message : "Last.fm test failed.");
      setLastfmDiagnostics(getLastfmDiagnostics());
    } finally {
      setLastfmBusy(false);
    }
  }

  return (
    <PanelStack>
      <SubSection title="Connected Services" icon={<Sparkles size={16} />} defaultOpen>
        <SettingsCard>
          <div className="space-y-4">
            <ToggleRow
              title="Last.fm"
              description={
                lastfm.sessionKey
                  ? `Connected as @${lastfm.username}. Scrobbling is handled directly by this app.`
                  : "Connect Last.fm for now-playing updates and scrobbling after 50% playback."
              }
              control={
                lastfm.sessionKey ? (
                  <div className="flex items-center gap-2">
                    <Badge>Connected</Badge>
                    <ActionButton variant="danger" onClick={disconnectLastfm}>
                      Disconnect
                    </ActionButton>
                  </div>
                ) : (
                  <ActionButton onClick={connectLastfm}>
                    {lastfmBusy ? "Opening..." : "Connect"}
                  </ActionButton>
                )
              }
            />

            {lastfmToken && !lastfm.sessionKey && (
              <>
                <Divider />
                <div className="rounded-xl border border-[var(--app-border)] bg-[var(--app-panel)] p-4">
                  <p className="mb-3 text-sm font-semibold text-[var(--app-muted)]">
                    After approving access on Last.fm, complete the connection here.
                  </p>
                  <ActionButton onClick={completeLastfmConnection}>
                    {lastfmBusy ? "Connecting..." : "Complete connection"}
                  </ActionButton>
                </div>
              </>
            )}

            {lastfm.sessionKey && (
              <>
                <Divider />
                <div className="grid gap-3 md:grid-cols-2">
                  <DiagnosticTile label="Connected user" value={`@${lastfm.username}`} />
                  <DiagnosticTile
                    label="Current track"
                    value={
                      currentTrack
                        ? `${currentTrack.artist || "Unknown"} - ${currentTrack.title}`
                        : "Nothing playing"
                    }
                  />
                  <DiagnosticTile
                    label="Last now playing"
                    value={
                      lastfmDiagnostics.lastNowPlayingTrack
                        ? `${lastfmDiagnostics.lastNowPlayingTrack} · ${formatDateTime(lastfmDiagnostics.lastNowPlayingAt)}`
                        : "No update recorded"
                    }
                  />
                  <DiagnosticTile
                    label="Last scrobble"
                    value={
                      lastfmDiagnostics.lastScrobbleTrack
                        ? `${lastfmDiagnostics.lastScrobbleTrack} · ${formatDateTime(lastfmDiagnostics.lastScrobbleAt)}`
                        : "No scrobble recorded"
                    }
                  />
                </div>
                {lastfmDiagnostics.lastError && (
                  <div className="rounded-xl border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-sm font-semibold text-rose-200">
                    Last error: {lastfmDiagnostics.lastError}
                    {lastfmDiagnostics.lastErrorAt
                      ? ` · ${formatDateTime(lastfmDiagnostics.lastErrorAt)}`
                      : ""}
                  </div>
                )}
                <div className="flex justify-end">
                  <ActionButton onClick={testLastfm} disabled={lastfmBusy || !currentTrack}>
                    {lastfmBusy ? "Testing..." : "Send test scrobble"}
                  </ActionButton>
                </div>
                <Divider />
                <ToggleRow
                  title="Scrobbling enabled"
                  description="Send tracks to Last.fm after 50% playback."
                  control={
                    <Toggle
                      defaultOn={lastfm.scrobblingEnabled}
                      onChange={(value) => {
                        setLastfmFlag(LASTFM_SCROBBLING_KEY, value);
                        refreshLastfmSettings();
                      }}
                    />
                  }
                />
                <Divider />
                <ToggleRow
                  title="Now playing updates"
                  description="Tell Last.fm what is currently playing as soon as a track starts."
                  control={
                    <Toggle
                      defaultOn={lastfm.nowPlayingEnabled}
                      onChange={(value) => {
                        setLastfmFlag(LASTFM_NOW_PLAYING_KEY, value);
                        refreshLastfmSettings();
                      }}
                    />
                  }
                />
              </>
            )}

            {lastfmStatus && (
              <div className="rounded-xl border border-[var(--app-border)] bg-[var(--app-panel)] px-3 py-2 text-sm font-semibold text-[var(--app-muted)]">
                {lastfmStatus}
              </div>
            )}
          </div>
          <Divider />
          <ToggleRow title="Bandsintown" description="Tour data provider for Now Playing." control={<Badge>Connected</Badge>} />
          <Divider />
          <ToggleRow title="Navidrome scrobbling" description="Submit plays back to Navidrome." control={<Toggle defaultOn />} />
        </SettingsCard>
      </SubSection>
    </PanelStack>
  );
}

function InputPanel() {
  return (
    <PanelStack>
      <SubSection title="Keyboard Shortcuts" icon={<Keyboard size={16} />} defaultOpen>
        <SettingsCard>
          <ToggleRow title="Spacebar" description="Play / pause current track." control={<Badge>Enabled</Badge>} />
          <Divider />
          <ToggleRow title="Arrow keys" description="Seek or navigate lists." control={<Badge>Enabled</Badge>} />
          <Divider />
          <ToggleRow title="Media keys" description="Browser media key integration is not active yet." control={<Badge muted>Coming soon</Badge>} />
          <Divider />
          <ToggleRow title="Global shortcuts" description="Enable shortcuts while app is backgrounded." control={<Badge muted>Coming soon</Badge>} />
        </SettingsCard>
      </SubSection>
    </PanelStack>
  );
}

function StoragePanel() {
  const cacheAlbumArt = useAppSettingsStore((s) => s.cacheAlbumArt);
  const setSetting = useAppSettingsStore((s) => s.setSetting);

  return (
    <PanelStack>
      <SubSection title="Cache" icon={<HardDrive size={16} />} defaultOpen>
        <SettingsCard>
          <ToggleRow
            title="Cache album art"
            description="Keep this preference for image cache behavior."
            control={
              <Toggle
                checked={cacheAlbumArt}
                onChange={(value) => setSetting("cacheAlbumArt", value)}
              />
            }
          />
          <Divider />
          <ToggleRow title="Cache size" description="Maximum storage controls are not active yet." control={<Badge muted>Coming soon</Badge>} />
          <Divider />
          <ToggleRow title="Offline songs" description="Download tracks for offline playback." control={<Badge muted>Coming soon</Badge>} />
          <Divider />
          <ToggleRow title="Clear cache" description="Remove cached images and metadata." control={<ActionButton>Clear</ActionButton>} />
        </SettingsCard>
      </SubSection>
    </PanelStack>
  );
}

function SystemPanel() {
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const queue = usePlayerStore((s) => s.queue);
  const resetAppSettings = useAppSettingsStore((s) => s.resetSettings);
  const settings = useAppSettingsStore();
  const [status, setStatus] = useState("");
  const [appearance, setAppearance] = useState(() =>
    typeof window === "undefined"
      ? { theme: "psysonic-dark", accent: "Theme" }
      : getSavedAppearance()
  );

  useEffect(() => {
    function refreshAppearance() {
      setAppearance(getSavedAppearance());
    }

    window.addEventListener("appearance-changed", refreshAppearance);
    window.addEventListener("storage", refreshAppearance);

    return () => {
      window.removeEventListener("appearance-changed", refreshAppearance);
      window.removeEventListener("storage", refreshAppearance);
    };
  }, []);

  function clearKey(key: string, message: string) {
    window.localStorage.removeItem(key);
    setStatus(message);
  }

  function downloadDiagnostics() {
    const payload = {
      generatedAt: new Date().toISOString(),
      currentTrack,
      queueLength: queue.length,
      appearance,
      settings: {
        autoOpenNowPlaying: settings.autoOpenNowPlaying,
        coverArtBackground: settings.coverArtBackground,
        floatingPlayerBar: settings.floatingPlayerBar,
        showAudioQualityBadges: settings.showAudioQualityBadges,
        glassEffects: settings.glassEffects,
        syncedLyrics: settings.syncedLyrics,
        fullscreenLyrics: settings.fullscreenLyrics,
        showSimilarArtists: settings.showSimilarArtists,
        showTourDates: settings.showTourDates,
        compactLayout: settings.compactLayout,
        uiFont: settings.uiFont,
        uiScale: settings.uiScale,
        seekbarStyle: settings.seekbarStyle,
        fullscreenArtistPortrait: settings.fullscreenArtistPortrait,
        portraitDimming: settings.portraitDimming,
        defaultHomePage: settings.defaultHomePage,
        albumSortDefault: settings.albumSortDefault,
        gridDensityDefault: settings.gridDensityDefault,
        lyricsProvider: settings.lyricsProvider,
        cacheAlbumArt: settings.cacheAlbumArt,
      },
      lastfmDiagnostics: getLastfmDiagnostics(),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `navidrome-client-diagnostics-${new Date()
      .toISOString()
      .slice(0, 19)
      .replace(/[:T]/g, "-")}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setStatus("Diagnostic report downloaded.");
  }

  function resetSettings() {
    resetAppSettings();
    setStatus("App behavior settings restored to defaults.");
  }

  return (
    <PanelStack>
      <SubSection title="Diagnostics" icon={<MonitorCog size={16} />} defaultOpen>
        <SettingsCard>
          <ToggleRow title="Version" description="navidrome-client local build." control={<Badge>0.1.0</Badge>} />
          <Divider />
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <DiagnosticTile
              label="Current track"
              value={
                currentTrack
                  ? `${currentTrack.artist || "Unknown"} - ${currentTrack.title}`
                  : "Nothing playing"
              }
            />
            <DiagnosticTile label="Queue" value={`${queue.length} tracks`} />
            <DiagnosticTile label="Theme" value={appearance.theme} />
            <DiagnosticTile label="Accent" value={appearance.accent} />
          </div>
          <Divider />
          <ToggleRow
            title="Export diagnostics"
            description="Download a JSON snapshot of player, theme, settings, and Last.fm status."
            control={<ActionButton icon={<Download size={15} />} onClick={downloadDiagnostics}>Export</ActionButton>}
          />
          {status && (
            <>
              <Divider />
              <div className="rounded-xl border border-[var(--app-border)] bg-[var(--app-panel)] px-3 py-2 text-sm font-semibold text-[var(--app-muted)]">
                {status}
              </div>
            </>
          )}
        </SettingsCard>
      </SubSection>

      <SubSection title="Reset" icon={<Trash2 size={16} />}>
        <SettingsCard>
          <ToggleRow title="Reset app behavior" description="Restore behavior toggles to their defaults." control={<ActionButton onClick={resetSettings}>Reset</ActionButton>} />
          <Divider />
          <ToggleRow
            title="Clear recent searches"
            description="Remove saved global search suggestions."
            control={
              <ActionButton onClick={() => clearKey("navidrome_recent_searches", "Recent searches cleared.")}>
                Clear
              </ActionButton>
            }
          />
          <Divider />
          <ToggleRow
            title="Clear last played"
            description="Remove the restored track used after restarting the app."
            control={
              <ActionButton onClick={() => clearKey("lastPlayedTrack", "Last played track cleared.")}>
                Clear
              </ActionButton>
            }
          />
          <Divider />
          <ToggleRow
            title="Clear Last.fm diagnostics"
            description="Remove saved Last.fm status, errors, and test history."
            control={
              <ActionButton
                variant="danger"
                onClick={() => clearKey(LASTFM_DIAGNOSTICS_KEY, "Last.fm diagnostics cleared.")}
              >
                Clear
              </ActionButton>
            }
          />
        </SettingsCard>
      </SubSection>
    </PanelStack>
  );
}

function UsersPanel() {
  return (
    <PanelStack>
      <SubSection title="Accounts" icon={<Users size={16} />} defaultOpen>
        <SettingsCard>
          <ToggleRow title="Current user" description="admin" control={<Badge>Active</Badge>} />
          <Divider />
          <ToggleRow title="Multi-user mode" description="Switch between saved Navidrome users." control={<Badge muted>Coming soon</Badge>} />
          <Divider />
          <ToggleRow title="Listening sessions" description="Shared listening rooms similar to Orbit." control={<Badge muted>Coming soon</Badge>} />
        </SettingsCard>
      </SubSection>
    </PanelStack>
  );
}

function PanelStack({ children }: { children: ReactNode }) {
  return <div className="space-y-4">{children}</div>;
}

function SubSection({
  title,
  icon,
  children,
  defaultOpen = false,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details
      open={defaultOpen}
      className="group overflow-hidden rounded-xl border border-[var(--app-border)] bg-[var(--app-panel)]"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-3 text-sm font-semibold text-white/85">
        <span className="flex items-center gap-2">
          <span className="text-[var(--app-accent)]">{icon}</span>
          {title}
        </span>
        <ChevronDown size={16} className="text-[var(--app-muted)] transition group-open:rotate-180" />
      </summary>
      <div className="border-t border-[var(--app-border)] bg-[var(--app-bg)] p-3.5">
        {children}
      </div>
    </details>
  );
}

function SettingsCard({
  children,
  highlight = false,
}: {
  children: ReactNode;
  highlight?: boolean;
}) {
  return (
    <div
      className={[
        "rounded-xl border bg-[var(--app-shell)] p-4 shadow-xl shadow-black/10 transition-colors",
        highlight ? "border-[var(--app-accent)]" : "border-[var(--app-border)]",
      ].join(" ")}
    >
      {children}
    </div>
  );
}

function ToggleRow({
  title,
  description,
  control,
}: {
  title: string;
  description: string;
  control: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-5 py-1">
      <div className="min-w-0">
        <h3 className="app-card-title">{title}</h3>
        <p className="app-muted mt-1">{description}</p>
      </div>
      <div className="shrink-0">{control}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <div className="app-label mb-2">
        {label}
      </div>
      {children}
    </label>
  );
}

function Divider() {
  return <div className="my-3 h-px bg-[var(--app-border)]" />;
}

function Toggle({
  checked,
  defaultOn = false,
  onChange,
}: {
  checked?: boolean;
  defaultOn?: boolean;
  onChange?: (value: boolean) => void;
}) {
  const [on, setOn] = useState(defaultOn);
  const isControlled = checked !== undefined;
  const active = isControlled ? checked : on;

  return (
    <button
      type="button"
      onClick={() => {
        const next = !active;
        if (!isControlled) setOn(next);
        onChange?.(next);
      }}
      className={[
        "relative h-7 w-12 rounded-full transition",
        active ? "bg-[var(--app-accent-strong)]" : "bg-white/15",
      ].join(" ")}
      aria-pressed={active}
    >
      <span
        className={[
          "absolute top-1 h-5 w-5 rounded-full bg-white transition",
          active ? "left-6" : "left-1",
        ].join(" ")}
      />
    </button>
  );
}

function Select({
  options,
  value,
  onChange,
}: {
  options: string[];
  value?: string;
  onChange?: (value: string) => void;
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange?.(event.target.value)}
      className="h-9 max-w-56 rounded-lg border border-[var(--app-border)] bg-[var(--app-bg)] px-3 text-sm font-semibold text-white/75 outline-none"
    >
      {options.map((option) => (
        <option key={option}>{option}</option>
      ))}
    </select>
  );
}

function ThemePicker({
  value,
  onChange,
}: {
  value: ThemeOption;
  onChange: (value: string) => void;
}) {
  const activeGroup =
    themeGroups.find((group) => group.themes.some((theme) => theme.id === value))
      ?.group || themeGroups[0].group;
  const [openGroup, setOpenGroup] = useState<string | null>(activeGroup);

  return (
    <div className="overflow-hidden rounded-xl border border-[var(--app-border)]">
      {themeGroups.map((group) => {
        const isOpen = openGroup === group.group;
        const hasActive = group.themes.some((theme) => theme.id === value);

        return (
          <div key={group.group} className="border-b border-[var(--app-border)] last:border-b-0">
            <button
              type="button"
              onClick={() => setOpenGroup(isOpen ? null : group.group)}
              className={[
                "app-label flex w-full items-center justify-between gap-4 px-4 py-3 text-left transition",
                isOpen
                  ? "bg-[var(--app-panel-strong)] text-[var(--app-accent)]"
                  : "bg-[var(--app-panel)] text-[var(--app-muted)] hover:bg-[var(--app-panel-strong)]",
              ].join(" ")}
            >
              <span className="flex items-center gap-2">
                {group.group}
                {hasActive && !isOpen && (
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--app-accent)]" />
                )}
              </span>
              <ChevronDown
                size={15}
                className={isOpen ? "rotate-180 transition" : "transition"}
              />
            </button>

            {isOpen && (
              <div className="border-t border-[var(--app-border)] bg-[var(--app-bg)] p-4">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                  {group.themes.map((theme) => {
                    const active = theme.id === value;

                    return (
                      <button
                        key={theme.id}
                        type="button"
                        onClick={() => onChange(theme.id)}
                        className="group min-w-0 text-left"
                      >
                        <div
                          className={[
                            "relative h-16 overflow-hidden rounded-lg outline outline-2 outline-offset-2 transition group-hover:scale-[1.03]",
                            active
                              ? "outline-[var(--app-accent)] shadow-[0_0_16px_var(--app-accent-soft)]"
                              : "outline-transparent group-hover:outline-[var(--app-accent)]",
                          ].join(" ")}
                        >
                          <div style={{ background: theme.bg, height: "54%" }} />
                          <div style={{ background: theme.card, height: "22%" }} />
                          <div style={{ background: theme.accent, height: "24%" }} />
                          {active && (
                            <span
                              className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full border border-white/70"
                              style={{ background: theme.accent }}
                            >
                              <Check size={12} strokeWidth={3} className="text-white" />
                            </span>
                          )}
                        </div>
                        <div
                          className={[
                            "mt-2 truncate text-center text-xs font-semibold transition",
                            active
                              ? "text-white"
                              : "text-[var(--app-muted)] group-hover:text-white",
                          ].join(" ")}
                        >
                          {theme.label}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function Badge({
  children,
  muted = false,
}: {
  children: ReactNode;
  muted?: boolean;
}) {
  return (
    <span
      className={[
        "rounded-full px-3 py-1 text-xs font-semibold",
        muted ? "bg-white/10 text-[var(--app-muted)]" : "bg-[var(--app-accent-soft)] text-[var(--app-accent)]",
      ].join(" ")}
    >
      {children}
    </span>
  );
}

function DiagnosticTile({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="min-w-0 rounded-lg border border-[var(--app-border)] bg-[var(--app-panel)] px-3 py-3">
      <div className="app-label text-[10px]">
        {label}
      </div>
      <div className="mt-1 break-words text-sm font-semibold text-white/85">
        {value || "-"}
      </div>
    </div>
  );
}

function formatDateTime(value?: string) {
  if (!value) return "Never";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";

  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function ActionButton({
  children,
  icon,
  onClick,
  variant = "default",
  disabled = false,
}: {
  children: ReactNode;
  icon?: ReactNode;
  onClick?: () => void;
  variant?: "default" | "danger";
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        "flex items-center gap-2 rounded-lg border px-3.5 py-2 text-sm font-semibold transition",
        disabled ? "cursor-not-allowed opacity-50" : "",
        variant === "danger"
          ? "border-rose-400/60 text-rose-300 hover:bg-rose-400/10"
          : "border-[var(--app-border)] bg-white/5 text-white/75 hover:bg-white/10",
      ].join(" ")}
    >
      {icon}
      {children}
    </button>
  );
}
