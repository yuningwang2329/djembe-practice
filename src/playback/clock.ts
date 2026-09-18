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
  let lastAudioTimeSeconds = audio.currentTime;
  let lastPerfTimeMs = typeof performance !== "undefined" ? performance.now() : 0;

  function applyPendingSeek(): void {
    if (pendingSeekSeconds === null) return;
    audio.currentTime = pendingSeekSeconds;
    lastAudioTimeSeconds = pendingSeekSeconds;
    lastPerfTimeMs = typeof performance !== "undefined" ? performance.now() : 0;
    pendingSeekSeconds = null;
  }

  return {
    getTimeMs() {
      if (pendingSeekSeconds !== null) {
        return Math.max(0, pendingSeekSeconds * 1_000 - audioOffsetMs);
      }
      const isAudioPaused = audio.paused !== false;
      const playbackRate = Number.isFinite(audio.playbackRate) ? audio.playbackRate : 1;
      const currentTime = Number.isFinite(audio.currentTime) ? audio.currentTime : 0;
      const isRealMedia = typeof audio.canPlayType === "function";

      if (!isRealMedia || isAudioPaused || typeof performance === "undefined") {
        lastAudioTimeSeconds = currentTime;
        lastPerfTimeMs = typeof performance !== "undefined" ? performance.now() : 0;
        return Math.max(0, currentTime * 1_000 - audioOffsetMs);
      }

      const now = performance.now();
      if (currentTime !== lastAudioTimeSeconds) {
        lastAudioTimeSeconds = currentTime;
        lastPerfTimeMs = now;
      }
      const elapsedMs = (now - lastPerfTimeMs) * playbackRate;
      const estimatedSeconds = lastAudioTimeSeconds + elapsedMs / 1_000;
      const diff = Math.abs(estimatedSeconds - currentTime);
      const effectiveSeconds = diff > 0.35 ? currentTime : estimatedSeconds;
      return Math.max(0, effectiveSeconds * 1_000 - audioOffsetMs);
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
      lastAudioTimeSeconds = audio.currentTime;
      lastPerfTimeMs = typeof performance !== "undefined" ? performance.now() : 0;
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
        lastAudioTimeSeconds = seconds;
        lastPerfTimeMs = typeof performance !== "undefined" ? performance.now() : 0;
      }
    },

    setPlaybackRate(rate: number) {
      const nextRate = clampPlaybackRate(rate);
      audio.playbackRate = nextRate;
      lastAudioTimeSeconds = audio.currentTime;
      lastPerfTimeMs = typeof performance !== "undefined" ? performance.now() : 0;
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
