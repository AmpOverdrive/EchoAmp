"use client";

import { create } from "zustand";
import { trackForPlayer } from "@/lib/normalizers";

export type Track = {
  id: string;
  title: string;
  artist?: string;
  album?: string;
  coverArt?: string;
  streamUrl: string;
  duration?: number;
  bitRate?: number;
  suffix?: string;
  samplingRate?: number;
  year?: number | string;
  genre?: string;
  albumId?: string;
  artistId?: string;
  playCount?: number;
  rating?: number | string;
  userRating?: number | string;
  starred?: boolean;
  kind?: "track" | "radio";
};

export type RepeatMode = "off" | "all" | "one";

type PlayerState = {
  currentTrack: Track | null;
  queue: Track[];
  isPlaying: boolean;
  isFullscreen: boolean;
  isQueueOpen: boolean;
  duration: number;
  currentTime: number;
  volume: number;
  shuffleEnabled: boolean;
  repeatMode: RepeatMode;
  playRequestId: number;
  seekRequest: number | null;

  setTrack: (track: Track, queue?: Track[]) => void;
  restoreTrack: (track: Track, queue?: Track[]) => void;
  addToQueue: (track: Track) => void;
  playNext: (track: Track) => void;
  removeFromQueue: (id: string) => void;
  clearQueue: () => void;
  moveQueueItem: (fromIndex: number, toIndex: number) => void;
  shuffleQueue: () => void;
  toggleShuffle: () => void;
  toggleRepeatMode: () => void;
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  next: () => void;
  previous: () => void;
  openFullscreen: () => void;
  closeFullscreen: () => void;
  openQueue: () => void;
  closeQueue: () => void;
  toggleQueue: () => void;
  setDuration: (duration: number) => void;
  setCurrentTime: (time: number) => void;
  seekTo: (time: number) => void;
  setVolume: (volume: number) => void;
  updateTrackMetadata: (id: string, patch: Partial<Track>) => void;
};

function normalizePlayerTrack(track: Track): Track {
  return trackForPlayer(track) as Track;
}

function normalizeQueue(queue: Track[]) {
  return queue.filter(Boolean).map(normalizePlayerTrack);
}

function persistTrack(track: Track | null) {
  if (typeof window === "undefined") return;

  if (track) {
    localStorage.setItem("lastPlayedTrack", JSON.stringify(track));
  } else {
    localStorage.removeItem("lastPlayedTrack");
  }
}

function loadPlaybackSettings() {
  if (typeof window === "undefined") {
    return { volume: 0.8, shuffleEnabled: false, repeatMode: "off" as RepeatMode };
  }

  try {
    const saved = JSON.parse(localStorage.getItem("playbackSettings") || "{}");
    return {
      volume: typeof saved.volume === "number" ? saved.volume : 0.8,
      shuffleEnabled: Boolean(saved.shuffleEnabled),
      repeatMode: ["off", "all", "one"].includes(saved.repeatMode) ? saved.repeatMode as RepeatMode : "off",
    };
  } catch {
    return { volume: 0.8, shuffleEnabled: false, repeatMode: "off" as RepeatMode };
  }
}

function persistPlaybackSettings(settings: Partial<Pick<PlayerState, "volume" | "shuffleEnabled" | "repeatMode">>) {
  if (typeof window === "undefined") return;

  try {
    const current = JSON.parse(localStorage.getItem("playbackSettings") || "{}");
    localStorage.setItem("playbackSettings", JSON.stringify({ ...current, ...settings }));
  } catch {}
}

const initialPlaybackSettings = loadPlaybackSettings();

export const usePlayerStore = create<PlayerState>((set, get) => ({
  currentTrack: null,
  queue: [],
  isPlaying: false,
  isFullscreen: false,
  isQueueOpen: false,
  duration: 0,
  currentTime: 0,
  volume: initialPlaybackSettings.volume,
  shuffleEnabled: initialPlaybackSettings.shuffleEnabled,
  repeatMode: initialPlaybackSettings.repeatMode,
  playRequestId: 0,
  seekRequest: null,

  setTrack: (track, queue = []) => {
    const normalizedTrack = normalizePlayerTrack(track);
    const normalizedQueue = normalizeQueue(queue.length ? queue : [normalizedTrack]);
    persistTrack(normalizedTrack);

    set((state) => ({
      currentTrack: normalizedTrack,
      queue: normalizedQueue,
      isPlaying: true,
      currentTime: 0,
      playRequestId: state.playRequestId + 1,
    }));
  },

  restoreTrack: (track, queue = []) => {
    const normalizedTrack = normalizePlayerTrack(track);
    const normalizedQueue = normalizeQueue(queue.length ? queue : [normalizedTrack]);

    set({
      currentTrack: normalizedTrack,
      queue: normalizedQueue,
      isPlaying: false,
      currentTime: 0,
    });
  },

  addToQueue: (track) =>
    set((state) => ({
      queue: [...state.queue, normalizePlayerTrack(track)],
    })),

  playNext: (track) =>
    set((state) => {
      const normalizedTrack = normalizePlayerTrack(track);
      const currentIndex = state.currentTrack
        ? state.queue.findIndex((item) => item.id === state.currentTrack?.id)
        : -1;
      const insertAt = currentIndex >= 0 ? currentIndex + 1 : 0;
      const queue = [...state.queue];
      queue.splice(insertAt, 0, normalizedTrack);

      return {
        currentTrack: state.currentTrack || normalizedTrack,
        queue,
        isPlaying: state.currentTrack ? state.isPlaying : true,
        playRequestId: state.currentTrack
          ? state.playRequestId
          : state.playRequestId + 1,
      };
    }),

  removeFromQueue: (id) =>
    set((state) => {
      const queue = state.queue.filter((track) => track.id !== id);
      const removingCurrent = state.currentTrack?.id === id;
      const nextTrack = removingCurrent ? queue[0] || null : state.currentTrack;
      if (removingCurrent) persistTrack(nextTrack);

      return {
        currentTrack: nextTrack,
        queue,
        isPlaying: nextTrack ? state.isPlaying : false,
        currentTime: removingCurrent ? 0 : state.currentTime,
        playRequestId:
          removingCurrent && nextTrack ? state.playRequestId + 1 : state.playRequestId,
      };
    }),

  clearQueue: () =>
    set((state) => {
      if (state.currentTrack) {
        persistTrack(state.currentTrack);
        return {
          queue: [state.currentTrack],
        };
      }

      persistTrack(null);
      return {
        currentTrack: null,
        queue: [],
        isPlaying: false,
        currentTime: 0,
        duration: 0,
      };
    }),

  moveQueueItem: (fromIndex, toIndex) =>
    set((state) => {
      if (fromIndex === toIndex) return state;
      if (fromIndex < 0 || toIndex < 0) return state;
      if (fromIndex >= state.queue.length || toIndex >= state.queue.length) return state;

      const queue = [...state.queue];
      const [item] = queue.splice(fromIndex, 1);
      queue.splice(toIndex, 0, item);

      return { queue };
    }),

  shuffleQueue: () =>
    set((state) => {
      if (state.queue.length < 2) return state;

      const current = state.currentTrack;
      const rest = state.queue.filter((track) => track.id !== current?.id);
      for (let index = rest.length - 1; index > 0; index -= 1) {
        const swap = Math.floor(Math.random() * (index + 1));
        [rest[index], rest[swap]] = [rest[swap], rest[index]];
      }

      persistPlaybackSettings({ shuffleEnabled: true });
      return { queue: current ? [current, ...rest] : rest, shuffleEnabled: true };
    }),

  toggleShuffle: () =>
    set((state) => {
      if (!state.shuffleEnabled && state.queue.length > 1) {
        const current = state.currentTrack;
        const rest = state.queue.filter((track) => track.id !== current?.id);
        for (let index = rest.length - 1; index > 0; index -= 1) {
          const swap = Math.floor(Math.random() * (index + 1));
          [rest[index], rest[swap]] = [rest[swap], rest[index]];
        }
        persistPlaybackSettings({ shuffleEnabled: true });
        return {
          shuffleEnabled: true,
          queue: current ? [current, ...rest] : rest,
        };
      }

      persistPlaybackSettings({ shuffleEnabled: !state.shuffleEnabled });
      return { shuffleEnabled: !state.shuffleEnabled };
    }),

  toggleRepeatMode: () =>
    set((state) => {
      const repeatMode =
        state.repeatMode === "off"
          ? "all"
          : state.repeatMode === "all"
            ? "one"
            : "off";
      persistPlaybackSettings({ repeatMode });
      return { repeatMode };
    }),

  play: () => set({ isPlaying: true }),
  pause: () => set({ isPlaying: false }),
  togglePlay: () => set((s) => ({ isPlaying: !s.isPlaying })),

  next: () => {
    const { currentTrack, queue, repeatMode } = get();
    if (!currentTrack || queue.length === 0) return;

    const index = queue.findIndex((t) => t.id === currentTrack.id);
    if (repeatMode === "one") {
      set((state) => ({
        isPlaying: true,
        currentTime: 0,
        playRequestId: state.playRequestId + 1,
      }));
      return;
    }

    const isLastTrack = index >= queue.length - 1;
    if (isLastTrack && repeatMode === "off") {
      set({ isPlaying: false, currentTime: 0 });
      return;
    }

    const nextTrack = queue[index + 1] ?? queue[0];

    persistTrack(nextTrack);

    set((state) => ({
      currentTrack: nextTrack,
      isPlaying: true,
      currentTime: 0,
      playRequestId: state.playRequestId + 1,
    }));
  },

  previous: () => {
    const { currentTrack, queue } = get();
    if (!currentTrack || queue.length === 0) return;

    const index = queue.findIndex((t) => t.id === currentTrack.id);
    const previousTrack = queue[index - 1] ?? queue[queue.length - 1];

    persistTrack(previousTrack);

    set((state) => ({
      currentTrack: previousTrack,
      isPlaying: true,
      currentTime: 0,
      playRequestId: state.playRequestId + 1,
    }));
  },

  openFullscreen: () => set({ isFullscreen: true }),
  closeFullscreen: () => set({ isFullscreen: false }),
  openQueue: () => set({ isQueueOpen: true }),
  closeQueue: () => set({ isQueueOpen: false }),
  toggleQueue: () => set((s) => ({ isQueueOpen: !s.isQueueOpen })),
  setDuration: (duration) => set({ duration }),
  setCurrentTime: (currentTime) => set({ currentTime }),
  seekTo: (time) => set({ seekRequest: time, currentTime: time }),
  setVolume: (volume) => {
    persistPlaybackSettings({ volume });
    set({ volume });
  },

  updateTrackMetadata: (id, patch) =>
    set((state) => {
      const currentTrack =
        state.currentTrack?.id === id
          ? { ...state.currentTrack, ...patch }
          : state.currentTrack;

      if (currentTrack?.id === id) {
        persistTrack(currentTrack);
      }

      return {
        currentTrack,
        queue: state.queue.map((track) =>
          track.id === id ? { ...track, ...patch } : track
        ),
      };
    }),
}));
