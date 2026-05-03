"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { ComponentType, ReactNode } from "react";
import {
  AudioLines,
  BarChart3,
  Cast,
  ChevronDown,
  ChevronRight,
  Disc3,
  Heart,
  ListMusic,
  Music,
  PlayCircle,
  Radio,
  Settings,
  Tags,
  TrendingUp,
  UsersRound,
  WandSparkles,
} from "lucide-react";
import { getCoverArtUrl, getPlaylists } from "@/lib/navidrome";
import { useAppSettingsStore } from "@/lib/app-settings-store";

type SidebarItem = {
  href: string;
  label: string;
  icon: ComponentType<{ size?: number; className?: string }>;
};

const libraryItems: SidebarItem[] = [
  { href: "/library", label: "Home", icon: Disc3 },
  { href: "/new-releases", label: "New Releases", icon: Radio },
  { href: "/albums", label: "All Albums", icon: Music },
  { href: "/tracks", label: "Tracks", icon: AudioLines },
  { href: "/mix", label: "Mixes", icon: WandSparkles },
  { href: "/moods", label: "Moods", icon: AudioLines },
  { href: "/artists", label: "Artists", icon: UsersRound },
  { href: "/genres", label: "Genres", icon: Tags },
  { href: "/favorites", label: "Favorites", icon: Heart },
  { href: "/most-played", label: "Most Played", icon: TrendingUp },
  { href: "/internet-radio", label: "Internet Radio", icon: Cast },
];

const systemItems: SidebarItem[] = [
  { href: "/statistics", label: "Statistics", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavItem({ item }: { item: SidebarItem }) {
  const pathname = usePathname();
  const active = isActive(pathname, item.href);
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      className={[
        "app-sidebar-item group flex h-9 items-center gap-3 rounded-lg px-3 text-[13px] font-semibold transition",
        active
          ? "bg-[color-mix(in_srgb,var(--app-accent-soft)_72%,transparent)] text-[var(--app-accent)] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
          : "text-[var(--app-muted)] hover:bg-[color-mix(in_srgb,var(--app-panel)_74%,transparent)] hover:text-[var(--foreground)]",
      ].join(" ")}
      data-active={active ? "true" : "false"}
    >
      <Icon
        size={16}
        className={active ? "text-[var(--app-accent)]" : "text-[var(--app-muted)] group-hover:text-[var(--foreground)]"}
      />
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="app-label px-3 pb-2 pt-4 text-[10px]">
      {children}
    </div>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const defaultHomePage = useAppSettingsStore((s) => s.defaultHomePage);
  const [playlistsOpen, setPlaylistsOpen] = useState(true);
  const [playlists, setPlaylists] = useState<any[]>([]);

  useEffect(() => {
    getPlaylists().then((p) => setPlaylists(p || []));
  }, []);

  const playlistsActive =
    pathname === "/playlists" || pathname.startsWith("/playlists/");

  return (
    <aside className="app-sidebar-shell hidden h-screen w-60 shrink-0 flex-col border-r border-[var(--app-border)] px-3 py-4 md:flex">
      <nav className="flex-1 overflow-y-auto pr-1">
        <SectionLabel>Library</SectionLabel>

        <div className="space-y-0.5">
          {libraryItems.map((item) => (
            <NavItem
              key={item.href}
              item={
                item.href === "/library"
                  ? { ...item, href: defaultHomePage || "/library" }
                  : item
              }
            />
          ))}

          {/* PLAYLISTS */}
          <div>
            <div
              className={[
                "app-sidebar-item group flex h-9 w-full items-center gap-3 rounded-lg px-3 text-left text-[13px] font-semibold transition",
                playlistsActive
                  ? "bg-[color-mix(in_srgb,var(--app-accent-soft)_72%,transparent)] text-[var(--app-accent)]"
                  : "text-[var(--app-muted)] hover:bg-[color-mix(in_srgb,var(--app-panel)_74%,transparent)] hover:text-[var(--foreground)]",
              ].join(" ")}
              data-active={playlistsActive ? "true" : "false"}
            >
              <Link href="/playlists" className="flex min-w-0 flex-1 items-center gap-3">
                <ListMusic size={16} />
                <span className="truncate">Playlists</span>
              </Link>
              <button
                type="button"
                onClick={() => setPlaylistsOpen((v) => !v)}
                aria-label={playlistsOpen ? "Collapse playlists" : "Expand playlists"}
                className="rounded p-0.5 text-inherit hover:bg-[var(--app-panel-strong)]"
              >
                {playlistsOpen ? (
                  <ChevronDown size={14} />
                ) : (
                  <ChevronRight size={14} />
                )}
              </button>
            </div>

            {playlistsOpen && (
              <div className="mt-1 space-y-0.5 pl-7">
                {playlists.map((p) => {
                  const active = pathname === `/playlists/${p.id}`;
                  return (
                    <Link
                      key={p.id}
                      href={`/playlists/${p.id}`}
                      className={[
                        "flex h-7 items-center gap-2 rounded-md px-2 text-[12px] transition",
                        active
                          ? "text-[var(--app-accent)]"
                          : "text-[var(--app-muted)] hover:bg-[var(--app-panel)] hover:text-[var(--foreground)]",
                      ].join(" ")}
                    >
                      {p.coverArt || p.id ? (
                        <img
                          src={getCoverArtUrl(p.coverArt || p.id)}
                          alt=""
                          className="h-5 w-5 shrink-0 rounded object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                          }}
                        />
                      ) : (
                        <PlayCircle size={13} />
                      )}
                      <span className="truncate">{p.name}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* NOW PLAYING */}
        <div className="mt-6">
          <NavItem item={{ href: "/now-playing", label: "Now Playing", icon: AudioLines }} />
        </div>

        {/* SYSTEM */}
        <SectionLabel>System</SectionLabel>
        <div className="space-y-0.5">
          {systemItems.map((item) => (
            <NavItem key={item.href} item={item} />
          ))}
        </div>
      </nav>
    </aside>
  );
}
