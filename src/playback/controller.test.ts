// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { createAudioClock, createPerformanceClock } from "./clock";
import { createPlaybackController } from "./controller";
import { makeSong } from "../test/fixtures";
import { qiaobianguniang } from "../data/qiaobianguniang";

function makeSynth() {
  return {
    cancel: vi.fn(),
    getCurrentTime: vi.fn(() => 10),
    resume: vi.fn(async () => undefined),
    schedule: vi.fn(),
  };
}

function makeAudio(currentTime = 0) {
  const state = { currentTime, paused: true };
  return {
    get currentTime() {
      return state.currentTime;
    },
    set currentTime(value: number) {
      state.currentTime = value;
    },
    get paused() {
      return state.paused;
    },
    muted: false,
    playbackRate: 1,
    volume: 1,
    pause: vi.fn(() => {
      state.paused = true;
    }),
    play: vi.fn(async () => {
      state.paused = false;
    }),
  } as unknown as HTMLAudioElement;
}

describe("playback controller", () => {
  it.each([0.5, 1, 1.5])("aligns the real song's first and late hits with media time at rate %s", async (rate) => {
    const audio = makeAudio();
    const synth = makeSynth();
    const controller = createPlaybackController({ song: qiaobianguniang, audio, synth, requestFrame: () => 1 });
    controller.setRate(rate);
    await controller.play({ countInBeats: 0 });
    for (const index of [0, 24, 56]) {
      const hit = qiaobianguniang.bars[index].hits[0];
      synth.schedule.mockClear();
      controller.seek(hit.atMs - 100);
      expect(audio.currentTime).toBeCloseTo((hit.atMs - 100) / 1000, 5);
      controller.tick();
      expect(synth.schedule).toHaveBeenCalledWith(hit, 10 + 0.1 / rate, 0.8);
      expect(controller.getSnapshot().currentTimeMs).toBeCloseTo(hit.atMs - 100, 5);
    }
    controller.destroy();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("uses its clock as the published score time and schedules demonstration hits ahead", async () => {
    let now = 0;
    const clock = createPerformanceClock(() => now);
    const synth = makeSynth();
    const controller = createPlaybackController({
      song: makeSong(),
      clock,
      synth,
      requestFrame: () => 1,
      cancelFrame: vi.fn(),
      lookAheadMs: 600,
    });

    await controller.play({ countInBeats: 0 });
    now = 1_000;
    controller.tick();

    expect(controller.getSnapshot()).toMatchObject({
      currentTimeMs: 1_000,
      isPlaying: true,
      playbackRate: 1,
    });
    expect(synth.schedule).toHaveBeenCalledWith(
      { atMs: 1_000, stroke: "bass", hand: "R" },
      10,
      0.8,
    );
  });

  it("counts in one bar before its first playback", async () => {
    vi.useFakeTimers();
    const clock = createPerformanceClock(() => 0);
    const controller = createPlaybackController({
      song: makeSong(),
      clock,
      synth: makeSynth(),
      requestFrame: () => 1,
      cancelFrame: vi.fn(),
    });

    await controller.play();
    expect(controller.getSnapshot()).toMatchObject({
      countInBeatsRemaining: 4,
      isCountingIn: true,
      isPlaying: false,
    });

    await vi.advanceTimersByTimeAsync(2_000);
    expect(controller.getSnapshot()).toMatchObject({
      countInBeatsRemaining: 0,
      isCountingIn: false,
      isPlaying: true,
    });
  });

  it("seeks back to the loop start and cancels old scheduled voices at loop end", async () => {
    let now = 0;
    const clock = createPerformanceClock(() => now);
    const synth = makeSynth();
    const controller = createPlaybackController({
      song: makeSong(),
      clock,
      synth,
      requestFrame: () => 1,
      cancelFrame: vi.fn(),
    });

    await controller.play({ countInBeats: 0 });
    controller.setLoop({ startMs: 500, endMs: 1_000 });
    synth.cancel.mockClear();
    now = 1_000;
    controller.tick();

    expect(controller.getSnapshot().currentTimeMs).toBe(500);
    expect(synth.cancel).toHaveBeenCalledTimes(1);
  });

  it("keeps the song and demonstration tracks independently controllable", async () => {
    const audio = { currentTime: 0, muted: false, volume: 1 } as HTMLAudioElement;
    const synth = makeSynth();
    const controller = createPlaybackController({
      song: makeSong(),
      audio,
      clock: createPerformanceClock(() => 0),
      synth,
      requestFrame: () => 1,
      cancelFrame: vi.fn(),
    });

    controller.setTrackMuted("song", true);
    controller.setTrackMuted("drums", true);
    controller.setVolumes({ song: 0.3, drums: 0.45 });
    await controller.play({ countInBeats: 0 });
    controller.tick();

    expect(audio).toMatchObject({ muted: true, volume: 0.3 });
    expect(controller.getSnapshot()).toMatchObject({
      songMuted: true,
      drumMuted: true,
      songVolume: 0.3,
      drumVolume: 0.45,
    });
    expect(synth.schedule).not.toHaveBeenCalled();
  });

  it("seeks the audio to the score origin before playing so drums and song enter together", async () => {
    const audio = makeAudio(0);
    const song = { ...makeSong(), audioOffsetMs: 2_000 };
    const controller = createPlaybackController({
      song,
      audio,
      clock: createAudioClock(audio, song.audioOffsetMs),
      synth: makeSynth(),
      requestFrame: () => 1,
      cancelFrame: vi.fn(),
    });

    await controller.play({ countInBeats: 0 });

    expect(audio.currentTime).toBe(2);
    expect(controller.getSnapshot()).toMatchObject({ currentTimeMs: 0, isPlaying: true });
  });

  it("does not seek the audio on resume when it already sits past the score origin", async () => {
    const audio = makeAudio(5);
    const song = { ...makeSong(), audioOffsetMs: 2_000 };
    const controller = createPlaybackController({
      song,
      audio,
      clock: createAudioClock(audio, song.audioOffsetMs),
      synth: makeSynth(),
      requestFrame: () => 1,
      cancelFrame: vi.fn(),
    });

    await controller.play({ countInBeats: 0 });

    expect(audio.currentTime).toBe(5);
    expect(controller.getSnapshot()).toMatchObject({ currentTimeMs: 3_000, isPlaying: true });
  });

  it("allows the playback-rate alias to be passed directly to a control", () => {
    const controller = createPlaybackController({
      song: makeSong(),
      clock: createPerformanceClock(() => 0),
    });
    const { setPlaybackRate } = controller;

    expect(setPlaybackRate(1.26)).toBe(1.25);
  });
});
