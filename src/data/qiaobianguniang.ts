import type { Bar, Hand, HitEvent, SongDefinition, Stroke } from "../domain/song";

/**
 * 《桥边姑娘》海伦
 * 音频实测：183.141s，第一段吉他落音在 2.282s 处，全曲网格拟合 77.33 BPM。
 * 小节线从 2.282s 起，每小节 4 拍、每拍两个八分位置，共 58 小节。
 * 结构（按能量曲线分段）：
 *   前奏 1–8 · 主歌 9–24 · 间奏 25–29 · 副歌 30–50 · 尾奏 51–58
 *
 * 节奏型 DSL：8 个字符 = 一小节的 8 个八分位置，B/T/S 为鼓音，0 为休止；
 * 左右手按时间顺序自动交替（每小节从右手起）。
 */

const BPM = 77.33;
const BEAT_MS = 60000 / BPM;
const BAR_MS = BEAT_MS * 4;
const AUDIO_OFFSET_MS = 2282;
const BAR_COUNT = 58;
const EXPECTED_DURATION_MS = 183141;

const strokeForChar: Record<string, Stroke> = { B: "bass", T: "tone", S: "slap" };

interface Section {
  from: number;
  to: number;
  pattern: string;
}

function buildBars(sections: Section[]): Bar[] {
  const patternFor = new Map<number, string>();
  for (const section of sections) {
    for (let bar = section.from; bar <= section.to; bar += 1) {
      patternFor.set(bar, section.pattern);
    }
  }

  return Array.from({ length: BAR_COUNT }, (_, index) => {
    const number = index + 1;
    const startMs = AUDIO_OFFSET_MS + index * BAR_MS;
    const pattern = patternFor.get(number) ?? "00000000";
    const hits: HitEvent[] = [];
    let hand: Hand = "R";

    for (let eighth = 0; eighth < 8; eighth += 1) {
      const stroke = strokeForChar[pattern[eighth] ?? "0"];
      if (!stroke) continue;
      hits.push({ atMs: Math.round(startMs + eighth * (BEAT_MS / 2)), stroke, hand });
      hand = hand === "R" ? "L" : "R";
    }

    return {
      number,
      startMs: Math.round(startMs),
      endMs: Math.round(startMs + BAR_MS),
      beats: 4,
      hits,
    };
  });
}

/** 扒谱版：跟随歌曲动态编排。主歌 B-TS- 型流动，副歌第 4 拍加双音。 */
const transcribedBars = buildBars([
  { from: 1, to: 8, pattern: "B000T000" },
  { from: 9, to: 24, pattern: "B0TTB0S0" },
  { from: 25, to: 29, pattern: "B000T0T0" },
  { from: 30, to: 50, pattern: "B0TTB0SS" },
  { from: 51, to: 57, pattern: "B000T000" },
  { from: 58, to: 58, pattern: "B0000000" },
]);

/**
 * 教材版：网络上流传的《桥边姑娘》教学（B 站「马丁非洲鼓」等）均要求关注
 * 公众号或付费解锁曲谱，无法直接取得；此版采用公开教材中收录的同曲目
 * 伴奏型——经典 Kuku 型（第 3 拍留空是它的标志），源自《十个非洲手鼓
 * 常用的传统节奏》等公开教学资料。
 */
const textbookBars = buildBars([
  { from: 1, to: 7, pattern: "B0000000" },
  { from: 8, to: 8, pattern: "B000T000" },
  { from: 9, to: 24, pattern: "B0TT00S0" },
  { from: 25, to: 29, pattern: "B00000S0" },
  { from: 30, to: 50, pattern: "B0TT00SS" },
  { from: 51, to: 57, pattern: "B000T000" },
  { from: 58, to: 58, pattern: "B0000000" },
]);

export const qiaobianguniang: SongDefinition = {
  id: "qiao-bian-gu-niang",
  title: "桥边姑娘",
  artist: "海伦",
  bpm: BPM,
  timeSignature: [4, 4],
  audioOffsetMs: AUDIO_OFFSET_MS,
  expectedDurationMs: EXPECTED_DURATION_MS,
  bars: transcribedBars,
  variants: [
    { id: "transcribed", name: "扒谱版", bars: transcribedBars },
    { id: "textbook", name: "教材版", bars: textbookBars },
  ],
};
