// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { createAudioClock, createPerformanceClock } from "./clock";

function makeAudio() {
  let paused = true;
  const audio = {
    currentTime: 3,
    playbackRate: 1,
    get paused() {
      return paused;
    },
    play: vi.fn(async () => {
      paused = false;
    }),
    pause: vi.fn(() => {
      paused = true;
    }),
  };

  return audio;
}

describe("playback clocks", () => {
  it("retains the latest early seek until audio metadata is loaded", () => {
    const audio = Object.assign(new EventTarget(), { currentTime: 0, readyState: 0 });
    const clock = createAudioClock(audio as unknown as HTMLAudioElement);
    clock.seek(18000);
    clock.seek(18250);
    expect(clock.getTimeMs()).toBe(18250);
    expect(audio.currentTime).toBe(0);
    audio.readyState = 1;
    audio.dispatchEvent(new Event('loadedmetadata'));
    expect(audio.currentTime).toBe(18.25);
    expect(clock.getTimeMs()).toBe(18250);
    clock.seek(4000);
    expect(audio.currentTime).toBe(4);
  });
  it("maps score time through an audio pre-roll and keeps the audio element as master", async () => {
    const audio = makeAudio();
    const clock = createAudioClock(audio as unknown as HTMLAudioElement, 500);

    expect(clock.getTimeMs()).toBe(2_500);
    clock.seek(1_250);
    expect(audio.currentTime).toBe(1.75);

    expect(clock.setPlaybackRate(1.276)).toBe(1.3);
    expect(audio.playbackRate).toBe(1.3);

    await clock.play();
    expect(clock.isPlaying()).toBe(true);
    clock.pause();
    expect(clock.isPlaying()).toBe(false);
  });

  it("advances a fallback performance clock by its selected rate and preserves time while paused", async () => {
    let now = 1_000;
    const clock = createPerformanceClock(() => now);

    await clock.play();
    clock.setPlaybackRate(1.25);
    now = 2_200;
    expect(clock.getTimeMs()).toBe(1_500);

    clock.pause();
    now = 3_000;
    expect(clock.getTimeMs()).toBe(1_500);
  });
});
