"use client";

import { useEffect, useRef, useState } from "react";
import { usePlayer } from "../lib/player";
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Square,
  Maximize,
  Minimize,
  Volume2,
  ListMusic,
  Shuffle,
  Repeat,
  Settings,
} from "lucide-react";
import { getCoverUrl } from "../lib/cover";

function fmt(sec) {
  if (!sec || Number.isNaN(sec)) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export default function Player() {
  const audioRef = useRef(null);
  const progressRef = useRef(null);

  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.85);

  const {
    queue,
    currentIndex,
    isPlaying,
    isFullscreen,
    toggleFullscreen,
    toggle,
    next,
    prev,
    setAudioRef,
  } = usePlayer();

  const track = queue?.[currentIndex];

  useEffect(() => {
    if (audioRef.current) {
      setAudioRef(audioRef.current);
      audioRef.current.volume = volume;
    }
  }, [setAudioRef, volume]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const tick = () => {
      setTime(audio.currentTime || 0);
      setDuration(audio.duration || 0);
      requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
  }, []);

  const coverUrl = track ? getCoverUrl(track) : null;
  const percent = duration ? (time / duration) * 100 : 0;

  const seek = (e) => {
    const audio = audioRef.current;
    if (!audio || !duration || !progressRef.current) return;

    const rect = progressRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    audio.currentTime = (x / rect.width) * duration;
  };

  return (
    <>
      <audio ref={audioRef} />

      {/* MINI PLAYER */}
      {!isFullscreen && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-black/95 border-t border-zinc-800 px-4 py-3">
          <div className="flex items-center gap-4">
            {coverUrl && (
              <img src={coverUrl} className="w-12 h-12 rounded object-cover" />
            )}

            <div className="min-w-0">
              <div className="text-sm truncate">
                {track?.title || "No track playing"}
              </div>
              <div className="text-xs text-zinc-400 truncate">
                {track?.artist || ""}
              </div>
            </div>

            <div className="ml-auto flex items-center gap-4">
              <button onClick={prev}><SkipBack size={18} /></button>
              <button onClick={toggle}>
                {isPlaying ? <Pause size={20} /> : <Play size={20} />}
              </button>
              <button onClick={next}><SkipForward size={18} /></button>
              <button onClick={toggleFullscreen}><Maximize size={18} /></button>
            </div>
          </div>
        </div>
      )}

      {/* FULLSCREEN PLAYER */}
      {isFullscreen && track && (
        <div className="fixed inset-0 z-[100] overflow-hidden bg-[#3f3944] text-white">
          {/* blurred background */}
          {coverUrl && (
            <div
              className="absolute inset-0 scale-110 blur-3xl opacity-35"
              style={{
                backgroundImage: `url(${coverUrl})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            />
          )}

          <div className="absolute inset-0 bg-gradient-to-b from-[#8b484d]/70 via-[#5d3f49]/75 to-[#302d38]/95" />

          <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-6">
            {coverUrl && (
              <img
                src={coverUrl}
                className="w-[380px] max-w-[80vw] aspect-square object-cover rounded-lg shadow-2xl mb-6"
              />
            )}

            <div className="text-center mb-5">
              <div className="font-bold text-lg">{track.title}</div>
              <div className="text-zinc-300">{track.artist}</div>
              <div className="text-zinc-400">{track.album}</div>
            </div>

            {/* progress */}
            <div className="w-[560px] max-w-[85vw]">
              <div
                ref={progressRef}
                onClick={seek}
                className="relative h-2 rounded-full bg-white/35 cursor-pointer"
              >
                <div
                  className="absolute left-0 top-0 h-2 rounded-full bg-white"
                  style={{ width: `${percent}%` }}
                />
                <div
                  className="absolute top-1/2 w-4 h-4 rounded-full bg-white shadow -translate-y-1/2"
                  style={{ left: `${percent}%`, transform: "translate(-50%, -50%)" }}
                />
              </div>

              <div className="flex justify-between text-sm text-zinc-300 mt-2">
                <span>{fmt(time)}</span>
                <span>MP3</span>
                <span>-{fmt(Math.max(duration - time, 0))}</span>
              </div>
            </div>

            {/* main controls */}
            <div className="flex items-center gap-9 mt-6">
              <button onClick={prev} className="opacity-90 hover:opacity-100">
                <SkipBack size={28} />
              </button>

              <button onClick={toggle} className="opacity-90 hover:opacity-100">
                {isPlaying ? <Pause size={34} /> : <Play size={34} />}
              </button>

              <button className="opacity-90 hover:opacity-100">
                <Square size={26} />
              </button>

              <button onClick={next} className="opacity-90 hover:opacity-100">
                <SkipForward size={28} />
              </button>
            </div>

            {/* volume */}
            <div className="flex items-center gap-3 mt-7 w-[520px] max-w-[80vw]">
              <Volume2 size={17} />
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={volume}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setVolume(v);
                  if (audioRef.current) audioRef.current.volume = v;
                }}
                className="w-full accent-white"
              />
              <Volume2 size={17} />
            </div>

            {/* bottom icons */}
            <div className="flex items-center gap-7 mt-7 text-zinc-100">
              <button><ListMusic size={22} /></button>
              <button><ListMusic size={22} /></button>
              <button onClick={toggleFullscreen}><Minimize size={22} /></button>
              <button><Repeat size={22} /></button>
              <button><Settings size={22} /></button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
