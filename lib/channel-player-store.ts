import { create } from "zustand";

type ChannelState = {
  currentChannel: any;
  currentTrack: any;
  tracks: any[];
  isPlaying: boolean;
  recentlyPlayed: any[];
  liveProgress: number;
  liveDuration: number;

  setChannel: (channel: any, tracks: any[]) => void;
  setTrack: (track: any) => void;
  setPlaying: (playing: boolean) => void;
  setLiveProgress: (progress: number) => void;
  setLiveDuration: (duration: number) => void;
  addRecentlyPlayed: (track: any) => void;
};

export const useChannelPlayerStore = create<ChannelState>((set) => ({
  currentChannel: null,
  currentTrack: null,
  tracks: [],
  isPlaying: false,
  recentlyPlayed: [],
  liveProgress: 0,
  liveDuration: 0,

  setChannel: (channel, tracks) =>
    set({
      currentChannel: channel,
      tracks,
      recentlyPlayed: [],
    }),

  setTrack: (track) =>
    set({
      currentTrack: track,
    }),

  setPlaying: (playing) =>
    set({
      isPlaying: playing,
    }),

  setLiveProgress: (progress) =>
    set({
      liveProgress: progress,
    }),

  setLiveDuration: (duration) =>
    set({
      liveDuration: duration,
    }),

  addRecentlyPlayed: (track) =>
    set((state) => {
      if (!track?.id) return state;

      return {
        recentlyPlayed: [
          track,
          ...state.recentlyPlayed.filter((item) => item.id !== track.id),
        ].slice(0, 20),
      };
    }),
}));
