import { create } from "zustand";

export type Channel = {
  id: string;
  name: string;
  playlistId: string;
  coverArt?: string;
};

type ChannelState = {
  channels: Channel[];
  setFromPlaylists: (playlists: any[]) => void;
};

export const useChannelStore = create<ChannelState>((set) => ({
  channels: [],

  setFromPlaylists: (playlists) =>
    set(() => ({
      channels: playlists.filter(Boolean).map((p) => {
        const playlistId = p.playlistId || p.id;
        return {
          id: String(p.id || "").startsWith("channel-")
            ? p.id
            : `channel-${playlistId}`,
          name: p.name || "Untitled Channel",
          playlistId,
          coverArt: p.coverArt || p.coverArtUrl || p.imageUrl || "",
        };
      }),
    })),
}));
