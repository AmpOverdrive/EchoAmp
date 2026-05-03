"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { usePlayerStore } from "@/lib/player-store";
import { useAppSettingsStore } from "@/lib/app-settings-store";

export default function NowPlayingRedirect() {
  const router = useRouter();
  const pathname = usePathname();
  const playRequestId = usePlayerStore((s) => s.playRequestId);
  const autoOpenNowPlaying = useAppSettingsStore((s) => s.autoOpenNowPlaying);
  const lastSeenPlayRequest = useRef(playRequestId);

  useEffect(() => {
    if (playRequestId === lastSeenPlayRequest.current) return;

    lastSeenPlayRequest.current = playRequestId;

    if (!autoOpenNowPlaying) return;

    if (pathname !== "/now-playing") {
      router.push("/now-playing");
    }
  }, [autoOpenNowPlaying, playRequestId, pathname, router]);

  return null;
}
