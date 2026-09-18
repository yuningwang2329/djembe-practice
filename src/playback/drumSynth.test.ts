// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { createDrumSynth } from "./drumSynth";

function makeAudioContext() {
  const oscillators: Array<{
    type: OscillatorType;
    frequency: { setValueAtTime: ReturnType<typeof vi.fn>; exponentialRampToValueAtTime: ReturnType<typeof vi.fn> };
    connect: ReturnType<typeof vi.fn>;
    start: ReturnType<typeof vi.fn>;
    stop: ReturnType<typeof vi.fn>;
    onended: (() => void) | null;
  }> = [];
  const gains: Array<{
    gain: { setValueAtTime: ReturnType<typeof vi.fn>; exponentialRampToValueAtTime: ReturnType<typeof vi.fn> };
    connect: ReturnType<typeof vi.fn>;
  }> = [];
  const destination = {} as AudioDestinationNode;
  const context = {
    currentTime: 5,
    destination,
    createOscillator: vi.fn(() => {
      const oscillator = {
        type: "sine" as OscillatorType,
        frequency: {
          setValueAtTime: vi.fn(),
          exponentialRampToValueAtTime: vi.fn(),
        },
        connect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
        onended: null,
      };
      oscillators.push(oscillator);
      return oscillator;
    }),
    createGain: vi.fn(() => {
      const gain = {
        gain: {
          setValueAtTime: vi.fn(),
          exponentialRampToValueAtTime: vi.fn(),
        },
        connect: vi.fn(),
      };
      gains.push(gain);
      return gain;
    }),
  };

  return { context, oscillators, gains };
}

describe("drum synth", () => {
  it("plays lowercase soft strokes more quietly without changing their timbre or timing", () => {
    const { context, gains, oscillators } = makeAudioContext();
    const synth = createDrumSynth(context as unknown as AudioContext);
    synth.schedule({ atMs: 0, stroke: "bass", hand: "L", dynamics: "soft" }, 7, 0.8);
    expect(gains[0].gain.setValueAtTime).toHaveBeenCalledWith(0.8 * 0.45, 7);
    expect(oscillators[0].frequency.setValueAtTime).toHaveBeenCalledWith(110, 7);
  });
  it("schedules a bass voice at the requested Web Audio time and can cancel it", () => {
    const { context, oscillators, gains } = makeAudioContext();
    const synth = createDrumSynth(context as unknown as AudioContext);

    synth.schedule({ atMs: 1_000, stroke: "bass", hand: "R" }, 7, 0.6);

    expect(oscillators).toHaveLength(1);
    expect(oscillators[0].frequency.setValueAtTime).toHaveBeenCalledWith(110, 7);
    expect(gains[0].gain.setValueAtTime).toHaveBeenCalledWith(0.6, 7);
    expect(oscillators[0].start).toHaveBeenCalledWith(7);

    synth.cancel(6.5);
    expect(oscillators[0].stop).toHaveBeenCalledWith(6.5);
  });
});
