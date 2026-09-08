// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { createPerformanceClock } from "./clock";
import { createPlaybackController } from "./controller";
import { makeSong } from "../test/fixtures";

function makeSynth() {
  return {
    cancel: vi.fn(),
    getCurrentTime: vi.fn(() => 10),
    resume: vi.fn(async () => undefined),
    schedule: vi.fn(),
  };
}

describe("playback controller", () => {
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
    const audio = { muted: false, volume: 1 } as HTMLAudioElement;
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

  it("allows the playback-rate alias to be passed directly to a control", () => {
    const controller = createPlaybackController({
      song: makeSong(),
      clock: createPerformanceClock(() => 0),
    });
    const { setPlaybackRate } = controller;

    expect(setPlaybackRate(1.26)).toBe(1.25);
  });
});
