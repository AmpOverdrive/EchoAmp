"use client";

import { RefObject } from "react";
import { Pause, Play, SkipBack, SkipForward } from "lucide-react";
import { usePlayerStore } from "@/lib/player-store";

export default function PlayerControls({
  audioRef,
}: {
  audioRef: RefObject<HTMLAudioElement | null>;
}) {
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const togglePlay = usePlayerStore((s) => s.togglePlay);
  const next = usePlayerStore((s) => s.next);
  const previous = usePlayerStore((s) => s.previous);

  return (
    <div className="flex items-center justify-center gap-4">
      <button onClick={previous}>
        <SkipBack size={22} />
      </button>

      <button
        onClick={togglePlay}
        className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--app-accent-strong)] text-black"
      >
        {isPlaying ? <Pause size={24} /> : <Play size={24} />}
      </button>

      <button onClick={next}>
        <SkipForward size={22} />
      </button>
    </div>
  );
}
