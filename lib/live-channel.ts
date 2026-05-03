export function getLiveState(tracks: any[], channelId: string) {
  if (!tracks?.length) return null;

  const nowSeconds = Math.floor(Date.now() / 1000);
  const seedSeconds = hashCode(channelId) % 86400;

  const durations = tracks.map((track) => {
    const duration = Number(track.duration || 180);
    return Number.isFinite(duration) && duration > 0 ? duration : 180;
  });

  const totalDuration = durations.reduce((sum, duration) => sum + duration, 0);
  if (!totalDuration) {
    return { track: tracks[0], progress: 0, duration: durations[0] || 180 };
  }

  let position = (nowSeconds + seedSeconds) % totalDuration;

  for (let index = 0; index < tracks.length; index += 1) {
    const duration = durations[index];

    if (position < duration) {
      return {
        track: tracks[index],
        index,
        progress: Math.floor(position),
        duration,
      };
    }

    position -= duration;
  }

  return { track: tracks[0], index: 0, progress: 0, duration: durations[0] || 180 };
}

export function getLiveTrack(tracks: any[], channelId: string) {
  return getLiveState(tracks, channelId)?.track || null;
}

export function getLiveHistory(tracks: any[], channelId: string, count = 20) {
  const state = getLiveState(tracks, channelId);
  if (!state || !tracks?.length) return [];

  const history = [];
  let index = state.index ?? 0;
  let playedAgo = state.progress || 0;

  for (let i = 0; i < count; i += 1) {
    const track = tracks[index];
    if (!track) break;

    history.push({
      ...track,
      playedAgo,
    });

    index = index - 1;
    if (index < 0) index = tracks.length - 1;

    const previousDuration = Number(tracks[index]?.duration || 180);
    playedAgo += Number.isFinite(previousDuration) && previousDuration > 0
      ? previousDuration
      : 180;
  }

  return history;
}

function hashCode(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = Math.imul(31, hash) + value.charCodeAt(index);
    hash |= 0;
  }

  return Math.abs(hash);
}
