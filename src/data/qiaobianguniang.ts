import type { Bar, Hand, HitEvent, SongDefinition, Stroke } from "../domain/song";

/**
 * 《桥边姑娘》海伦 · 阿波非洲鼓供谱（节奏 4/4 · 速度 77.5 · 难度 2 星）
 *
 * 谱面来源：机主提供的「阿波非洲鼓」教学谱图片，逐小节人工转录，
 * 含左右手标注（双音 SB / BB 中前音右手、后音左手；独音均为右手；
 * 进唱后段第 4 拍 S 改用左手）。
 *
 * 音频对齐：第一段吉他落音实测 2.282s；全曲网格拟合 77.33 BPM，
 * 与谱面标注速度 77.5 一致。原谱按歌词行循环记谱（×3 / ×9 反复），
 * 这里按歌曲实际结构展开为 58 小节；段落划分与能量曲线分析吻合：
 * 前奏 1–8 · 进唱 9–24 · 间奏 25–29 · 副歌 30–50 · 尾奏 51–58。
 * （段落到具体小节的对应是按歌词行推断的，若跟唱时感觉错位可微调。）
 *
 * DSL：8 个字符 = 一小节的 8 个八分位置；大写 = 右手，小写 = 左手；
 * B/T/S 为鼓音，0 为休止。记谱组由渲染层归并：独音独占一拍为四分音符，
 * 两个八分紧邻共一条下划线，空拍只写一个 0（不并列两个 0）。
 */

const BPM = 77.5;
const BEAT_MS = 60000 / BPM;
const BAR_MS = BEAT_MS * 4;
const AUDIO_OFFSET_MS = 2282;
const BAR_COUNT = 58;
const EXPECTED_DURATION_MS = 183141;

const strokeForChar: Record<string, { stroke: Stroke; hand: Hand }> = {
  B: { stroke: "bass", hand: "R" },
  b: { stroke: "bass", hand: "L" },
  T: { stroke: "tone", hand: "R" },
  t: { stroke: "tone", hand: "L" },
  S: { stroke: "slap", hand: "R" },
  s: { stroke: "slap", hand: "L" },
};

type PatternName = "a" | "aLeft" | "b" | "c" | "d" | "rest";

/** 阿波谱节奏型（右手大写、左手小写） */
const PATTERNS: Record<PatternName, string> = {
  /** A：B ｜ SB ｜ B ｜ S —— 基本型 */
  a: "B0SbB0S0",
  /** A'：第 4 拍 S 左手（进唱后两段） */
  aLeft: "B0SbB0s0",
  /** B：B ｜ SB ｜ BB ｜ S */
  b: "B0SbBbS0",
  /** C：单 B 收尾 */
  c: "B0000000",
  /** D：B ｜ B ｜ B ｜ 0 —— 副歌结束句 */
  d: "B0B0B000",
  /** 全休止 */
  rest: "00000000",
};

interface BarSpec {
  pattern: PatternName;
  section?: string;
  lyric?: string;
}

const spec = (pattern: PatternName, extra: Omit<BarSpec, "pattern"> = {}): BarSpec => ({
  pattern,
  ...extra,
});

const specs: BarSpec[] = [
  // 前奏 1–8（谱面：B SB B S ×3 ｜ B SB BB S ｜ B 0）
  spec("a", { section: "前奏" }),
  spec("a"),
  spec("a"),
  spec("b"),
  spec("c"),
  spec("a"),
  spec("a"),
  spec("b"),
  // 进唱 9–24：每行歌词 B SB B S ×3 ｜ B SB BB S（后两段第 4 拍 S 左手）
  spec("a", { section: "进唱", lyric: "暖阳下 我迎芬芳 是谁家的姑娘" }),
  spec("a"),
  spec("a"),
  spec("b"),
  spec("a", { lyric: "我走在了那座小桥上 你抚琴奏忧伤" }),
  spec("a"),
  spec("a"),
  spec("b"),
  spec("aLeft", { lyric: "桥边歌唱的小姑娘 你眼角在流淌" }),
  spec("aLeft"),
  spec("aLeft"),
  spec("b"),
  spec("aLeft", { lyric: "你说一个人在逞强 一个人念家乡" }),
  spec("aLeft"),
  spec("aLeft"),
  spec("b"),
  // 间奏 25–29（谱面：0 0 0 0 反复）
  spec("rest", { section: "间奏" }),
  spec("rest"),
  spec("rest"),
  spec("rest"),
  spec("rest"),
  // 副歌 30–50
  spec("a", { section: "副歌", lyric: "风华模样 你落落大方" }),
  spec("a"),
  spec("a"),
  spec("b"),
  spec("a", { lyric: "坐在桥上 我听你歌唱" }),
  spec("a"),
  spec("a"),
  spec("d"),
  spec("b", { lyric: "我说桥边姑娘 你的芬芳" }),
  spec("b"),
  spec("b"),
  spec("b"),
  spec("b", { lyric: "我把你放心上 刻在了我心膛" }),
  spec("b"),
  spec("b"),
  spec("b"),
  spec("b", { lyric: "桥边姑娘 你的忧伤" }),
  spec("b"),
  spec("b"),
  spec("b", { lyric: "我把你放心房 不想让你流浪" }),
  spec("b"),
  // 尾奏 51–58：B SB BB S 持续后休止收尾（谱面末尾间奏）
  spec("b", { section: "尾奏" }),
  spec("b"),
  spec("b"),
  spec("b"),
  spec("rest"),
  spec("rest"),
  spec("rest"),
  spec("rest"),
];

if (specs.length !== BAR_COUNT) {
  throw new Error(`桥边姑娘谱面小节数应为 ${BAR_COUNT}，实际 ${specs.length}`);
}

export const qiaobianguniangBars: Bar[] = specs.map((barSpec, index) => {
  const number = index + 1;
  const startMs = AUDIO_OFFSET_MS + index * BAR_MS;
  const pattern = PATTERNS[barSpec.pattern];
  const hits: HitEvent[] = [];

  for (let eighth = 0; eighth < 8; eighth += 1) {
    const mapped = strokeForChar[pattern[eighth] ?? "0"];
    if (!mapped) continue;
    hits.push({
      atMs: Math.round(startMs + eighth * (BEAT_MS / 2)),
      stroke: mapped.stroke,
      hand: mapped.hand,
    });
  }

  return {
    number,
    startMs: Math.round(startMs),
    endMs: Math.round(startMs + BAR_MS),
    beats: 4,
    hits,
    ...(barSpec.section ? { section: barSpec.section } : {}),
    ...(barSpec.lyric ? { lyric: barSpec.lyric } : {}),
  };
});

export const qiaobianguniang: SongDefinition = {
  id: "qiao-bian-gu-niang",
  title: "桥边姑娘",
  artist: "海伦",
  bpm: BPM,
  timeSignature: [4, 4],
  audioOffsetMs: AUDIO_OFFSET_MS,
  expectedDurationMs: EXPECTED_DURATION_MS,
  bars: qiaobianguniangBars,
};
