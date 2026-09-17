import type { SongDefinition } from "../domain/song";
import { clampPlaybackRate, getLoopSeekTarget } from "../domain/timeline";
import { createAudioClock, createPerformanceClock, type PlaybackClock } from "./clock";
import { type DrumSynth } from "./drumSynth";
import { createScheduleCursor } from "./scheduler";

export type PlaybackTrack = "song" | "drums";

export interface LoopRange {
  startMs: number;
  endMs: number;
}

export interface PlaybackSnapshot {
  countInBeatsRemaining: number;
  currentTimeMs: number;
  drumMuted: boolean;
  drumVolume: number;
  isCountingIn: boolean;
  isPlaying: boolean;
  loop: LoopRange | null;
  playbackRate: number;
  songMuted: boolean;
  songVolume: number;
}

export interface PlaybackControllerOptions {
  audio?: HTMLAudioElement;
  cancelFrame?: (frame: number) => void;
  clock?: PlaybackClock;
  lookAheadMs?: number;
  requestFrame?: (callback: FrameRequestCallback) => number | undefined;
  song: SongDefinition;
  synth?: DrumSynth;
}

export interface PlayOptions {
  /** Defaults to one bar only for the first play from the start of the song. */
  countInBeats?: number;
}

export interface PlaybackController {
  destroy(): void;
  getSnapshot(): PlaybackSnapshot;
  pause(): void;
  play(options?: PlayOptions): Promise<void>;
  seek(timeMs: number): void;
  setLoop(loop: LoopRange | null): void;
  setPlaybackRate(rate: number): number;
  setRate(rate: number): number;
  setTrackMuted(track: PlaybackTrack, muted: boolean): void;
  setVolumes(volumes: Partial<{ drums: number; song: number }>): void;
  subscribe(listener: (snapshot: PlaybackSnapshot) => void): () => void;
  tick(): void;
}

const defaultRequestFrame =
  typeof requestAnimationFrame === "function"
    ? (callback: FrameRequestCallback) => requestAnimationFrame(callback)
    : () => undefined;
const defaultCancelFrame =
  typeof cancelAnimationFrame === "function" ? (frame: number) => cancelAnimationFrame(frame) : () => {};

function normalizeVolume(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function normalizeLoop(song: SongDefinition, loop: LoopRange | null): LoopRange | null {
  if (!loop) return null;
  const startMs = Math.max(0, Math.min(song.expectedDurationMs, loop.startMs));
  const endMs = Math.max(0, Math.min(song.expectedDurationMs, loop.endMs));
  return endMs > startMs ? { startMs, endMs } : null;
}

export function createPlaybackController(options: PlaybackControllerOptions): PlaybackController {
  const { audio, song, synth } = options;
  const clock = options.clock ?? (audio ? createAudioClock(audio, song.audioOffsetMs) : createPerformanceClock());
  const cursor = createScheduleCursor(song);
  const requestFrame = options.requestFrame ?? defaultRequestFrame;
  const cancelFrame = options.cancelFrame ?? defaultCancelFrame;
  const lookAheadMs = options.lookAheadMs ?? 200;
  const listeners = new Set<(snapshot: PlaybackSnapshot) => void>();

  let countInBeatsRemaining = 0;
  let countInTimer: ReturnType<typeof setTimeout> | undefined;
  let destroyed = false;
  let drumMuted = false;
  let drumVolume = 0.8;
  let frame: number | undefined;
  let hasStarted = false;
  let loop: LoopRange | null = null;
  let songMuted = false;
  let songVolume = audio?.volume ?? 1;

  function getCurrentTimeMs(): number {
    return Math.max(0, Math.min(song.expectedDurationMs, clock.getTimeMs()));
  }

  function getSnapshot(): PlaybackSnapshot {
    return {
      countInBeatsRemaining,
      currentTimeMs: getCurrentTimeMs(),
      drumMuted,
      drumVolume,
      isCountingIn: countInBeatsRemaining > 0,
      isPlaying: clock.isPlaying(),
      loop,
      playbackRate: clock.getPlaybackRate(),
      songMuted,
      songVolume,
    };
  }

  function emit(): void {
    const snapshot = getSnapshot();
    for (const listener of [...listeners]) listener(snapshot);
  }

  function cancelScheduledDrums(): void {
    synth?.cancel();
    cursor.reset(getCurrentTimeMs());
  }

  function cancelAnimationFrameLoop(): void {
    if (frame === undefined) return;
    cancelFrame(frame);
    frame = undefined;
  }

  function scheduleAnimationFrameLoop(): void {
    if (frame !== undefined || !clock.isPlaying() || destroyed) return;
    const nextFrame = requestFrame(() => {
      frame = undefined;
      tick();
    });
    if (nextFrame !== undefined) frame = nextFrame;
  }

  function cancelCountIn(): void {
    if (countInTimer !== undefined) clearTimeout(countInTimer);
    countInTimer = undefined;
    countInBeatsRemaining = 0;
  }

  async function startPlayback(): Promise<void> {
    if (destroyed || clock.isPlaying()) return;
    await synth?.resume();
    // The recording may begin with lead-in silence before the score origin
    // (score time 0 = audio time audioOffsetMs). If we start playback while
    // the audio element sits before that point, the user hears the silence
    // first and the drums feel late. Seek the audio to the score origin first.
    if (audio && audio.currentTime * 1_000 < song.audioOffsetMs) {
      clock.seek(getCurrentTimeMs());
    }
    await clock.play();
    hasStarted = true;
    cursor.reset(getCurrentTimeMs());
    tick();
  }

  function startCountIn(beats: number): void {
    const beatDurationMs = 60_000 / song.bpm / clock.getPlaybackRate();
    countInBeatsRemaining = beats;
    emit();

    const nextBeat = () => {
      if (destroyed || countInBeatsRemaining <= 0) return;
      if (!drumMuted && synth) {
        synth.schedule(
          { atMs: -1, stroke: "bass", hand: "R" },
          synth.getCurrentTime(),
          Math.min(drumVolume, 0.55),
        );
      }
      countInBeatsRemaining -= 1;
      emit();
      if (countInBeatsRemaining === 0) {
        void startPlayback();
        return;
      }
      countInTimer = setTimeout(nextBeat, beatDurationMs);
    };

    countInTimer = setTimeout(nextBeat, beatDurationMs);
  }

  function tick(): void {
    if (destroyed || !clock.isPlaying()) {
      emit();
      return;
    }

    const currentTimeMs = getCurrentTimeMs();
    const loopTarget = loop
      ? getLoopSeekTarget(currentTimeMs, loop.startMs, loop.endMs)
      : null;
    if (loopTarget !== null) {
      clock.seek(loopTarget);
      cancelScheduledDrums();
      emit();
      scheduleAnimationFrameLoop();
      return;
    }

    if (currentTimeMs >= song.expectedDurationMs) {
      clock.pause();
      cancelScheduledDrums();
      emit();
      return;
    }

    if (!drumMuted && synth) {
      const rate = clock.getPlaybackRate();
      const scheduled = cursor.schedule({
        scoreNowMs: currentTimeMs,
        scoreUntilMs: Math.min(song.expectedDurationMs, currentTimeMs + lookAheadMs * rate),
        audioNowSeconds: synth.getCurrentTime(),
        playbackRate: rate,
      });
      for (const event of scheduled) {
        synth.schedule(event.hit, event.atAudioTimeSeconds, drumVolume);
      }
    }

    emit();
    scheduleAnimationFrameLoop();
  }

  function setRate(rate: number): number {
    const nextRate = clock.setPlaybackRate(clampPlaybackRate(rate));
    cancelScheduledDrums();
    tick();
    return nextRate;
  }

  return {
    destroy() {
      if (destroyed) return;
      destroyed = true;
      cancelCountIn();
      cancelAnimationFrameLoop();
      clock.pause();
      cancelScheduledDrums();
      listeners.clear();
    },

    getSnapshot,

    pause() {
      cancelCountIn();
      cancelAnimationFrameLoop();
      clock.pause();
      cancelScheduledDrums();
      emit();
    },

    async play(playOptions = {}) {
      if (destroyed || clock.isPlaying() || countInBeatsRemaining > 0) return;
      const isFirstStart = !hasStarted && getCurrentTimeMs() === 0;
      const countInBeats = Math.max(
        0,
        Math.floor(playOptions.countInBeats ?? (isFirstStart ? song.timeSignature[0] : 0)),
      );
      if (countInBeats > 0) {
        await synth?.resume();
        startCountIn(countInBeats);
        return;
      }
      await startPlayback();
    },

    seek(timeMs) {
      clock.seek(Math.max(0, Math.min(song.expectedDurationMs, timeMs)));
      cancelScheduledDrums();
      tick();
    },

    setLoop(nextLoop) {
      loop = normalizeLoop(song, nextLoop);
      cancelScheduledDrums();
      emit();
    },

    setPlaybackRate(rate) {
      return setRate(rate);
    },

    setRate,

    setTrackMuted(track, muted) {
      if (track === "song") {
        songMuted = muted;
        if (audio) audio.muted = muted;
      } else {
        drumMuted = muted;
        if (muted) cancelScheduledDrums();
      }
      emit();
    },

    setVolumes(volumes) {
      if (volumes.song !== undefined) {
        songVolume = normalizeVolume(volumes.song);
        if (audio) audio.volume = songVolume;
      }
      if (volumes.drums !== undefined) drumVolume = normalizeVolume(volumes.drums);
      emit();
    },

    subscribe(listener) {
      listeners.add(listener);
      listener(getSnapshot());
      return () => listeners.delete(listener);
    },

    tick,
  };
}
