import type { Stroke } from "../domain/song";
import type { HitEvent } from "../domain/song";
import type { DrumSynth } from "./drumSynth";

const sampleFiles: Record<Stroke, string> = {
  bass: "audio/drums/bass.mp3",
  tone: "audio/drums/tone.mp3",
  slap: "audio/drums/slap.mp3",
};

/** 峰值归一化后的相对音量校准：开音采样延音长，听起来偏响，压一点。 */
const strokeTrim: Record<Stroke, number> = {
  bass: 1,
  tone: 0.85,
  slap: 0.95,
};

const TAIL_THRESHOLD_RATIO = 0.004;
const TAIL_FADE_SECONDS = 0.06;
const PEAK_TARGET = 0.95;

/**
 * 采样来自 AI 生成的干声单音，电平偏低且尾部带本底噪声。
 * 解码后统一处理：切掉衰减到底的尾巴、淡出、峰值归一化、按音色校准。
 */
function prepareSample(context: AudioContext, raw: AudioBuffer, stroke: Stroke): AudioBuffer {
  const input = raw.getChannelData(0);
  let peak = 0;
  for (let i = 0; i < input.length; i++) {
    const value = Math.abs(input[i]);
    if (value > peak) peak = value;
  }

  const threshold = Math.max(1e-4, peak * TAIL_THRESHOLD_RATIO);
  let end = input.length - 1;
  while (end > 0 && Math.abs(input[end]) < threshold) end -= 1;

  const fadeLength = Math.floor(raw.sampleRate * TAIL_FADE_SECONDS);
  const length = Math.min(raw.length, end + 1 + fadeLength);
  const output = context.createBuffer(1, length, raw.sampleRate);
  const data = output.getChannelData(0);
  const scale = peak > 0 ? (PEAK_TARGET / peak) * strokeTrim[stroke] : 1;

  for (let i = 0; i < length; i++) data[i] = input[i] * scale;
  const fadeStart = Math.max(0, length - fadeLength);
  for (let i = fadeStart; i < length; i++) data[i] *= (length - i) / (length - fadeStart);
  return output;
}

/**
 * 基于真实采样的鼓声播放器，接口与合成器一致。
 * 采样加载完成前以及加载失败时自动回退到合成鼓声。
 */
export function createDrumSampler(context: AudioContext, fallback: DrumSynth): DrumSynth {
  const buffers: Partial<Record<Stroke, AudioBuffer>> = {};
  const activeSources = new Set<AudioBufferSourceNode>();
  let loadStarted = false;

  function load(stroke: Stroke): void {
    const url = new URL(sampleFiles[stroke], document.baseURI).href;
    fetch(url)
      .then((response) => {
        if (!response.ok) throw new Error(`采样加载失败 ${response.status}`);
        return response.arrayBuffer();
      })
      .then((bytes) => context.decodeAudioData(bytes))
      .then((decoded) => {
        buffers[stroke] = prepareSample(context, decoded, stroke);
      })
      .catch(() => {
        // 保持回退到合成鼓声
      });
  }

  return {
    getCurrentTime() {
      return context.currentTime;
    },

    async resume() {
      if (!loadStarted) {
        loadStarted = true;
        (Object.keys(sampleFiles) as Stroke[]).forEach(load);
      }
      if (context.state === "suspended") await context.resume();
    },

    schedule(hit: HitEvent, atAudioTimeSeconds: number, volume: number) {
      const buffer = buffers[hit.stroke];
      if (!buffer || volume <= 0) {
        fallback.schedule(hit, atAudioTimeSeconds, volume);
        return;
      }

      const source = context.createBufferSource();
      source.buffer = buffer;
      const gain = context.createGain();
      const startTime = Math.max(context.currentTime, atAudioTimeSeconds);
      // 细微的力度变化，避免机器般的绝对均匀
      const velocity = Math.min(1, Math.max(0, volume)) * (0.93 + Math.random() * 0.14);

      gain.gain.setValueAtTime(velocity, startTime);
      source.connect(gain);
      gain.connect(context.destination);
      source.onended = () => activeSources.delete(source);
      activeSources.add(source);
      source.start(startTime);
    },

    cancel(atAudioTimeSeconds = context.currentTime) {
      const stopTime = Math.max(context.currentTime, atAudioTimeSeconds);
      for (const source of activeSources) {
        try {
          source.stop(stopTime);
        } catch {
          // 声源可能已结束
        }
      }
      activeSources.clear();
      fallback.cancel(stopTime);
    },
  };
}
