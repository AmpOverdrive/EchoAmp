"use client";

import { useEffect, useRef } from "react";
import { Pause, Play, Volume2, X } from "lucide-react";
import { useChannelPlayerStore } from "@/lib/channel-player-store";
import { getNextTrack } from "@/lib/channel-player";

export default function GlobalChannelPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const { addRecentlyPlayed,
    currentChannel,
    currentTrack,
    tracks,
    isPlaying,
    setTrack,
    setPlaying,
  } = useChannelPlayerStore();

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;

    addRecentlyPlayed(currentTrack);

    if (audio.src !== currentTrack.streamUrl) {
      audio.src = currentTrack.streamUrl;
      audio.load();

    }

    if (isPlaying) {
      audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  }, [currentTrack, isPlaying]);

  function next() {
    if (!tracks?.length) return;

    const nextTrack = getNextTrack(tracks, {
      recentTrackIds: [],
      recentArtists: [],
    });

    if (!nextTrack) return;

    addRecentlyPlayed(currentTrack);
    setTrack(nextTrack);
    setPlaying(true);
  }

  function toggle() {
    setPlaying(!isPlaying);
  }

  function stop() {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.src = "";
    }
    setPlaying(false);
  }

  if (!currentChannel) return null;

  return (
    <>
      <audio ref={audioRef} />

      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-black/90 backdrop-blur-xl px-6 py-3 flex items-center gap-4">
        {currentTrack?.coverArt && (
          <img
            src={currentTrack.coverArt}
            className="h-12 w-12 object-contain rounded"
          />
        )}

        <div className="flex-1 min-w-0">
          <p className="truncate font-semibold">
            {currentTrack?.title}
          </p>
          <p className="text-xs text-white/50 truncate">
            {currentTrack?.artist}
          </p>
        </div>

        <button onClick={toggle}>
          {isPlaying ? <Pause /> : <Play />}
        </button>

        

        <button onClick={stop}>
          <X />
        </button>

        <Volume2 className="ml-2" />
      </div>
    </>
  );
}
