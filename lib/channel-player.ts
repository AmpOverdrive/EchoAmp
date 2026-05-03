type History = {
  recentTrackIds?: string[];
  recentArtists?: string[];
};

export function getNextTrack<T extends { id?: string; artist?: string }>(
  tracks: T[],
  history: History = {}
): T | null {
  if (!tracks || tracks.length === 0) return null;

  const recentTrackIds = new Set(history.recentTrackIds || []);
  const recentArtists = new Set(history.recentArtists || []);

  let pool = tracks.filter(
    (track) =>
      !recentTrackIds.has(track?.id || "") &&
      !recentArtists.has(track?.artist || "")
  );

  // fallback if everything filtered out
  if (pool.length === 0) {
    pool = [...tracks];
  }

  const index = Math.floor(Math.random() * pool.length);
  return pool[index] ?? null;
}
