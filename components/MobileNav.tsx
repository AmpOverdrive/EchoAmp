"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Disc3, Heart, Library, ListMusic, Search, Settings } from "lucide-react";

const items = [
  { href: "/library", label: "Home", icon: Disc3 },
  { href: "/albums", label: "Library", icon: Library },
  { href: "/search", label: "Search", icon: Search },
  { href: "/favorites", label: "Favorites", icon: Heart },
  { href: "/playlists", label: "Playlists", icon: ListMusic },
  { href: "/settings", label: "Settings", icon: Settings },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-black/90 px-2 pb-[env(safe-area-inset-bottom)] pt-1 backdrop-blur-2xl md:hidden">
      <div className="grid grid-cols-6 gap-1">
        {items.map((item) => {
          const Icon = item.icon;
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={["flex min-w-0 flex-col items-center gap-0.5 rounded-xl px-1 py-2 text-[10px] font-bold transition", active ? "bg-white/10 text-[var(--app-accent)]" : "text-white/55 hover:bg-white/5 hover:text-white"].join(" ")}
            >
              <Icon size={18} />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
