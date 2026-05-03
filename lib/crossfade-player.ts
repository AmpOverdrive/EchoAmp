type CrossfadeTrack = {
  streamUrl: string;
};

export async function crossfadeTo(
  audio: HTMLAudioElement | null,
  nextTrack: CrossfadeTrack,
  volume = 0.85
): Promise<void> {
  if (!audio || !nextTrack?.streamUrl) return;

  const FADE_DURATION = 800;
  const steps = 10;
  const stepTime = FADE_DURATION / steps;

  for (let i = steps; i >= 0; i--) {
    audio.volume = (volume * i) / steps;
    await new Promise<void>((resolve) => setTimeout(resolve, stepTime));
  }

  audio.src = nextTrack.streamUrl;
  audio.load();

  try {
    await audio.play();
  } catch {
    // Ignore autoplay/playback interruptions.
  }

  for (let i = 0; i <= steps; i++) {
    audio.volume = (volume * i) / steps;
    await new Promise<void>((resolve) => setTimeout(resolve, stepTime));
  }
}
