import { useCallback, useEffect, useRef, useState } from "react";
import type { SongDefinition } from "../domain/song";
import {
  createPlaybackController,
  type LoopRange,
  type PlaybackController,
  type PlaybackSnapshot,
  type PlaybackTrack,
  type PlayOptions,
  type PlaybackControllerOptions,
} from "../playback/controller";
import { createDrumSynth } from "../playback/drumSynth";

const emptySnapshot: PlaybackSnapshot = {
  countInBeatsRemaining: 0,
  currentTimeMs: 0,
  drumMuted: false,
  drumVolume: 0.8,
  isCountingIn: false,
  isPlaying: false,
  loop: null,
  playbackRate: 1,
  songMuted: false,
  songVolume: 0.8,
};

type AudioContextConstructor = new () => AudioContext;

function createAudioContext(): AudioContext | undefined {
  if (typeof window === "undefined") return undefined;
  const Constructor = (window.AudioContext ??
    (window as Window & { webkitAudioContext?: AudioContextConstructor }).webkitAudioContext) as
    | AudioContextConstructor
    | undefined;
  try {
    return Constructor ? new Constructor() : undefined;
  } catch {
    return undefined;
  }
}

function createMediaElement(audioUrl: string | undefined): HTMLAudioElement | undefined {
  if (!audioUrl || typeof Audio === "undefined") return undefined;
  const audio = new Audio(audioUrl);
  audio.preload = "auto";
  audio.volume = 0.8;
  audio.preservesPitch = true;
  return audio;
}

export interface PracticePlayback {
  pause: () => void;
  play: (options?: PlayOptions) => Promise<void>;
  seek: (timeMs: number) => void;
  setLoop: (loop: LoopRange | null) => void;
  setRate: (rate: number) => void;
  setTrackMuted: (track: PlaybackTrack, muted: boolean) => void;
  setVolumes: (volumes: Partial<{ drums: number; song: number }>) => void;
  snapshot: PlaybackSnapshot;
}

type ControllerTimingOverrides = Pick<
  PlaybackControllerOptions,
  "cancelFrame" | "requestFrame"
>;

export function usePlaybackController(
  song: SongDefinition,
  audioUrl?: string,
  timingOverrides: ControllerTimingOverrides = {},
): PracticePlayback {
  const controllerRef = useRef<PlaybackController | null>(null);
  const [snapshot, setSnapshot] = useState<PlaybackSnapshot>(emptySnapshot);
  const requestFrameOverride = timingOverrides.requestFrame;
  const cancelFrameOverride = timingOverrides.cancelFrame;

  useEffect(() => {
    const audio = createMediaElement(audioUrl);
    const context = createAudioContext();
    const controller = createPlaybackController({
      audio,
      song,
      synth: context ? createDrumSynth(context) : undefined,
      requestFrame: requestFrameOverride,
      cancelFrame: cancelFrameOverride,
    });
    controllerRef.current = controller;
    const unsubscribe = controller.subscribe(setSnapshot);

    return () => {
      unsubscribe();
      controller.destroy();
      controllerRef.current = null;
      if (audio) {
        audio.pause();
        audio.removeAttribute("src");
        audio.load();
      }
      void context?.close();
    };
  }, [audioUrl, cancelFrameOverride, requestFrameOverride, song]);

  const call = useCallback(<T,>(operation: (controller: PlaybackController) => T, fallback: T): T => {
    const controller = controllerRef.current;
    return controller ? operation(controller) : fallback;
  }, []);

  return {
    snapshot,
    play: (options) => call((controller) => controller.play(options), Promise.resolve()),
    pause: () => call((controller) => controller.pause(), undefined),
    seek: (timeMs) => call((controller) => controller.seek(timeMs), undefined),
    setLoop: (loop) => call((controller) => controller.setLoop(loop), undefined),
    setRate: (rate) => call((controller) => controller.setRate(rate), undefined),
    setTrackMuted: (track, muted) => call((controller) => controller.setTrackMuted(track, muted), undefined),
    setVolumes: (volumes) => call((controller) => controller.setVolumes(volumes), undefined),
  };
}
