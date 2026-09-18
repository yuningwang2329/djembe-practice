// @vitest-environment node
import { afterEach, expect, it, vi } from "vitest";
import { createDrumSampler } from "./drumSampler";

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

it("applies soft dynamics once to loaded samples and preserves the requested onset", async () => {
  vi.stubGlobal('document', { baseURI: 'https://example.test/' });
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, arrayBuffer: async () => new ArrayBuffer(4) }));
  vi.spyOn(Math, 'random').mockReturnValue(.5);
  const gains: ReturnType<typeof vi.fn>[] = [];
  const starts: ReturnType<typeof vi.fn>[] = [];
  const context = {
    currentTime: 0, state: 'running', destination: {},
    decodeAudioData: async () => ({ getChannelData: () => new Float32Array([0, 1, .2, 0]), length: 4, sampleRate: 22050 }),
    createBuffer: (_: number, length: number) => ({ getChannelData: () => new Float32Array(length) }),
    createBufferSource: () => { const start = vi.fn(); starts.push(start); return { connect: vi.fn(), start, stop: vi.fn() }; },
    createGain: () => { const setValueAtTime = vi.fn(); gains.push(setValueAtTime); return { connect: vi.fn(), gain: { setValueAtTime } }; },
  };
  const fallback = { schedule: vi.fn(), cancel: vi.fn(), resume: async () => {}, getCurrentTime: () => 0 };
  const sampler = createDrumSampler(context as unknown as AudioContext, fallback);
  await sampler.resume();
  await new Promise(resolve => setTimeout(resolve, 0));
  sampler.schedule({ atMs: 0, stroke: 'slap', hand: 'L', dynamics: 'soft' }, 2, .8);
  expect(starts[0]).toHaveBeenCalledWith(2);
  expect(gains[0]).toHaveBeenCalledWith(.8 * .45, 2);
  expect(fallback.schedule).not.toHaveBeenCalled();

  sampler.schedule({ atMs: 100, stroke: 'bass', hand: 'L', dynamics: 'soft' }, 3, .8);
  expect(starts[1]).toHaveBeenCalledWith(3);
  expect(gains[1]).toHaveBeenCalledWith(.8 * .70, 3);
});
