import { create } from "zustand";

type Behavior = {
  skips: Record<string, number>;
  plays: Record<string, number>;
  artistSkips: Record<string, number>;
  artistLikes: Record<string, number>;
  like: (id: string, artist?: string) => void;
  skip: (id: string, artist?: string) => void;
};

function loadInitialState() {
  if (typeof window === "undefined") {
    return {
      skips: {},
      plays: {},
      artistSkips: {},
      artistLikes: {},
    };
  }

  try {
    const saved = localStorage.getItem("listening-behavior");
    if (!saved) throw new Error("No saved behavior");

    const parsed = JSON.parse(saved);

    return {
      skips: parsed.skips || {},
      plays: parsed.plays || {},
      artistSkips: parsed.artistSkips || {},
      artistLikes: parsed.artistLikes || {},
    };
  } catch {
    return {
      skips: {},
      plays: {},
      artistSkips: {},
      artistLikes: {},
    };
  }
}

function persist(state: Pick<Behavior, "skips" | "plays" | "artistSkips" | "artistLikes">) {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem("listening-behavior", JSON.stringify(state));
  } catch {}
}

export const useBehaviorStore = create<Behavior>((set) => ({
  ...loadInitialState(),

  like: (id, artist) =>
    set((state) => {
      const next = {
        skips: state.skips,
        plays: {
          ...state.plays,
          [id]: (state.plays[id] || 0) + 1,
        },
        artistSkips: state.artistSkips,
        artistLikes: artist
          ? {
              ...state.artistLikes,
              [artist]: (state.artistLikes[artist] || 0) + 1,
            }
          : state.artistLikes,
      };

      persist(next);
      return next;
    }),

  skip: (id, artist) =>
    set((state) => {
      const next = {
        skips: {
          ...state.skips,
          [id]: (state.skips[id] || 0) + 1,
        },
        plays: state.plays,
        artistSkips: artist
          ? {
              ...state.artistSkips,
              [artist]: (state.artistSkips[artist] || 0) + 1,
            }
          : state.artistSkips,
        artistLikes: state.artistLikes,
      };

      persist(next);
      return next;
    }),
}));
