import type { Bar, Hand, HitEvent, SongDefinition, Stroke } from "../domain/song";

/**
 * 《桥边姑娘》海伦 · 阿波非洲鼓供谱（节奏 4/4 · 速度 77.5 · 难度 2 星）
 *
 * 谱面来源：机主提供的「阿波非洲鼓」教学谱图片，逐小节人工转录，
 * 含左右手标注（双音 SB / BB 中前音右手、后音左手；独音均为右手；
 * 主歌二后半段第 4 拍 S 改用左手）。
 *
 * 歌词来源：百度百科《桥边姑娘》完整歌词（含第二段主歌
 * 「暖阳下的桥头旁 … 一个人在流浪」，共 24 句）。
 *
 * 音频对齐：第一段吉他落音实测 2.282s；全曲网格拟合 77.33 BPM，
 * 与谱面标注速度 77.5 一致。逐小节能量分析确认：第 6 小节人声进入；
 * 28–30 小节为弱唱 breakdown（能量骤降的循环段）；54–57 小节尾奏渐弱；
 * 第 58 小节收尾。全曲每句歌词占 2 小节，展开为 58 小节：
 * 前奏 1–5 · 主歌一 6–13 · 主歌二 14–21 · 副歌 22–33 ·
 * 主歌三 34–49 · 副歌再现 50–53 · 尾奏 54–58。
 * （段落到具体小节的对应按歌词句与能量曲线推断，若跟唱时感觉错位可微调。）
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

type PatternName = "a" | "aLeft" | "b" | "c" | "rest";

/** 阿波谱节奏型（右手大写、左手小写） */
const PATTERNS: Record<PatternName, string> = {
  /** A：B ｜ SB ｜ B ｜ S —— 基本型 */
  a: "B0SbB0S0",
  /** A'：第 4 拍 S 左手（主歌二后半段） */
  aLeft: "B0SbB0s0",
  /** B：B ｜ SB ｜ BB ｜ S —— 副歌型 */
  b: "B0SbBbS0",
  /** C：单 B 收尾 */
  c: "B0000000",
  /** 全休止（尾奏弱唱段鼓手休息） */
  rest: "00000000",
};

interface BarSpec {
  pattern: PatternName;
  section?: string;
  lyric?: string;
  /** 歌词跨越的小节数（默认 1） */
  lyricSpan?: number;
}

const spec = (pattern: PatternName, extra: Omit<BarSpec, "pattern"> = {}): BarSpec => ({
  pattern,
  ...extra,
});

/**
 * 歌词按句对位：每句 2 小节（lyricSpan=2），共 24 句；
 * 词组尽量不跨 4 小节的谱面行（行尾小节起始的词组渲染时收进本行）。
 */
const LYRIC_SPAN = 2;

const specs: BarSpec[] = [
  // 前奏 1–5（谱面：B SB B S ×3 ｜ B SB BB S ｜ B 0）
  spec("a", { section: "前奏" }),
  spec("a"),
  spec("a"),
  spec("b"),
  spec("c"),
  // 主歌一 6–13：暖阳下我迎芬芳 / 是谁家的姑娘 / 我走在那座小桥上 / 你抚琴奏忧伤
  spec("a", { section: "主歌一", lyric: "暖阳下 我迎芬芳", lyricSpan: LYRIC_SPAN }),
  spec("a"),
  spec("a", { lyric: "是谁家的姑娘", lyricSpan: LYRIC_SPAN }),
  spec("b"),
  spec("a", { lyric: "我走在了那座小桥上", lyricSpan: LYRIC_SPAN }),
  spec("a"),
  spec("a", { lyric: "你抚琴奏忧伤", lyricSpan: LYRIC_SPAN }),
  spec("b"),
  // 主歌二 14–21（后半段第 4 拍 S 左手）
  spec("a", { section: "主歌二", lyric: "桥边歌唱的小姑娘", lyricSpan: LYRIC_SPAN }),
  spec("a"),
  spec("a", { lyric: "你眼角在流淌", lyricSpan: LYRIC_SPAN }),
  spec("b"),
  spec("aLeft", { lyric: "你说一个人在逞强", lyricSpan: LYRIC_SPAN }),
  spec("aLeft"),
  spec("aLeft", { lyric: "一个人念家乡", lyricSpan: LYRIC_SPAN }),
  spec("b"),
  // 副歌 22–33：风华两行 + 我说四行（28–30 弱唱 breakdown）
  spec("a", { section: "副歌", lyric: "风华模样 你落落大方", lyricSpan: LYRIC_SPAN }),
  spec("a"),
  spec("a", { lyric: "坐在桥上 我听你歌唱", lyricSpan: LYRIC_SPAN }),
  spec("b"),
  spec("b", { lyric: "我说桥边姑娘 你的芬芳", lyricSpan: LYRIC_SPAN }),
  spec("b"),
  spec("b", { lyric: "我把你放心上 刻在了我心膛", lyricSpan: LYRIC_SPAN }),
  spec("b"),
  spec("b", { lyric: "桥边姑娘 你的忧伤", lyricSpan: LYRIC_SPAN }),
  spec("b"),
  spec("b", { lyric: "我把你放心房 不想让你流浪", lyricSpan: LYRIC_SPAN }),
  spec("b"),
  // 主歌三（第二段）34–49
  spec("a", { section: "主歌三", lyric: "暖阳下 的桥头旁", lyricSpan: LYRIC_SPAN }),
  spec("a"),
  spec("a", { lyric: "有这样一姑娘", lyricSpan: LYRIC_SPAN }),
  spec("b"),
  spec("a", { lyric: "她有着长长的乌黑发", lyricSpan: LYRIC_SPAN }),
  spec("a"),
  spec("a", { lyric: "一双眼明亮", lyricSpan: LYRIC_SPAN }),
  spec("b"),
  spec("a", { lyric: "姑娘你让我心荡漾", lyricSpan: LYRIC_SPAN }),
  spec("a"),
  spec("a", { lyric: "小鹿在乱撞", lyricSpan: LYRIC_SPAN }),
  spec("b"),
  spec("a", { lyric: "你说无人在身旁", lyricSpan: LYRIC_SPAN }),
  spec("a"),
  spec("a", { lyric: "一个人在流浪", lyricSpan: LYRIC_SPAN }),
  spec("b"),
  // 副歌再现 50–53
  spec("b", { section: "副歌", lyric: "我说桥边姑娘 你的芬芳", lyricSpan: LYRIC_SPAN }),
  spec("b"),
  spec("b", { lyric: "我把你放心上 刻在了我心膛", lyricSpan: LYRIC_SPAN }),
  spec("b"),
  // 尾奏 54–58：弱唱收尾（鼓手休息），最后一记低音收束
  spec("rest", { section: "尾奏", lyric: "桥边姑娘 你的忧伤", lyricSpan: LYRIC_SPAN }),
  spec("rest"),
  spec("rest", { lyric: "我把你放心房 不想让你流浪", lyricSpan: LYRIC_SPAN }),
  spec("rest"),
  spec("c"),
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
    ...(barSpec.lyricSpan && barSpec.lyricSpan > 1 ? { lyricSpan: barSpec.lyricSpan } : {}),
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
