"use client";

import { useEffect, useRef } from "react";
import { usePlayerStore } from "@/lib/player-store";
import MiniPlayer from "./MiniPlayer";
import FullscreenPlayer from "./FullscreenPlayer";
import QueueSidebar from "./QueueSidebar";

export default function PlayerProvider() {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const volume = usePlayerStore((s) => s.volume);
  const next = usePlayerStore((s) => s.next);

  const isRadio = currentTrack?.kind === "radio";

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack?.streamUrl) return;

    if (audio.src !== currentTrack.streamUrl) {
      audio.src = currentTrack.streamUrl;
      audio.load();
      usePlayerStore.setState({ currentTime: 0, duration: 0 });
    }

    if (isPlaying) {
      audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  }, [currentTrack, isPlaying]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = volume;
  }, [volume]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const syncTime = () => {
      usePlayerStore.setState({
        currentTime: audio.currentTime || 0,
        duration: Number.isFinite(audio.duration) ? audio.duration : 0,
      });
    };

    const handlePlay = () => usePlayerStore.setState({ isPlaying: true });
    const handlePause = () => usePlayerStore.setState({ isPlaying: false });

    const handleEnded = () => {
      usePlayerStore.setState({ isPlaying: false, currentTime: 0 });
      if (!isRadio) next();
    };

    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("timeupdate", syncTime);
    audio.addEventListener("durationchange", syncTime);
    audio.addEventListener("loadedmetadata", syncTime);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("timeupdate", syncTime);
      audio.removeEventListener("durationchange", syncTime);
      audio.removeEventListener("loadedmetadata", syncTime);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [isRadio, next]);

  return (
    <>
      <audio ref={audioRef} />

      <MiniPlayer audioRef={audioRef} />
      <FullscreenPlayer audioRef={audioRef} />
      <QueueSidebar />
    </>
  );
}
