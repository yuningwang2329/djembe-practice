import { clampPlaybackRate } from "../domain/timeline";

export interface PlaybackClock {
  getTimeMs(): number;
  getPlaybackRate(): number;
  isPlaying(): boolean;
  pause(): void;
  play(): Promise<void>;
  seek(timeMs: number): void;
  setPlaybackRate(rate: number): number;
}

/**
 * A positive offset means the audio has that much material before score time zero.
 */
export function createAudioClock(
  audio: HTMLAudioElement,
  audioOffsetMs = 0,
): PlaybackClock {
  let pendingSeekSeconds: number | null = null;

  function applyPendingSeek(): void {
    if (pendingSeekSeconds === null) return;
    audio.currentTime = pendingSeekSeconds;
    pendingSeekSeconds = null;
  }

  return {
    getTimeMs() {
      if (pendingSeekSeconds !== null) {
        return Math.max(0, pendingSeekSeconds * 1_000 - audioOffsetMs);
      }
      const currentTime = Number.isFinite(audio.currentTime) ? audio.currentTime : 0;
      // A stalled/quantized media clock must not produce fictitious future drum events.
      // The intentional visual lead is applied in ScorePage, never to this audio clock.
      return Math.max(0, currentTime * 1_000 - audioOffsetMs);
    },

    getPlaybackRate() {
      return audio.playbackRate;
    },

    isPlaying() {
      return !audio.paused;
    },

    pause() {
      audio.pause();
    },

    play() {
      return audio.play();
    },

    seek(timeMs: number) {
      const seconds = Math.max(0, timeMs + audioOffsetMs) / 1_000;
      if (audio.readyState === 0) {
        pendingSeekSeconds = seconds;
        audio.addEventListener("loadedmetadata", applyPendingSeek, { once: true });
      } else {
        pendingSeekSeconds = null;
        audio.currentTime = seconds;
      }
    },

    setPlaybackRate(rate: number) {
      const nextRate = clampPlaybackRate(rate);
      audio.playbackRate = nextRate;
      return nextRate;
    },
  };
}

export function createPerformanceClock(now: () => number = () => performance.now()): PlaybackClock {
  let elapsedMs = 0;
  let isRunning = false;
  let playbackRate = 1;
  let startedAtMs = now();

  function currentTimeMs(): number {
    if (!isRunning) return elapsedMs;
    return elapsedMs + (now() - startedAtMs) * playbackRate;
  }

  function holdCurrentTime(): void {
    elapsedMs = currentTimeMs();
    startedAtMs = now();
  }

  return {
    getTimeMs: currentTimeMs,

    getPlaybackRate() {
      return playbackRate;
    },

    isPlaying() {
      return isRunning;
    },

    pause() {
      if (!isRunning) return;
      holdCurrentTime();
      isRunning = false;
    },

    async play() {
      if (isRunning) return;
      startedAtMs = now();
      isRunning = true;
    },

    seek(timeMs: number) {
      elapsedMs = Math.max(0, timeMs);
      startedAtMs = now();
    },

    setPlaybackRate(rate: number) {
      holdCurrentTime();
      playbackRate = clampPlaybackRate(rate);
      return playbackRate;
    },
  };
}
