import type { Bar, Hand, HitEvent, SongDefinition, Stroke } from "../domain/song";

/**
 * 《桥边姑娘》海伦 · 阿波非洲鼓供谱（节奏 4/4 · 录音校准速度 77.329 · 难度 2 星）
 *
 * 谱面来源：机主提供的「阿波非洲鼓」教学谱图片，逐小节人工转录，
 * 含左右手标注（双音 SB / BB 中前音右手、后音左手；独音均为右手；
 * 主歌二后半段第 4 拍 S 改用左手）。
 *
 * 歌词来源：百度百科《桥边姑娘》完整歌词（含第二段主歌
 * 「暖阳下的桥头旁 … 一个人在流浪」，共 24 句）。
 *
 * 时间坐标：小节和鼓点均使用录音绝对毫秒，播放器偏移为 0。
 * 鼓谱网格校准为 77.329 BPM / 3.111s：前段拟合，后段独立验证。
 * 详见 docs/2026-09-18-tempo-calibration.md；能量峰不等于歌词起唱证据。
 * 下方 specs 中的文字仅作为既有文本库，不再用于确定歌词时刻或段落。
 * 歌词独立采用参考 LRC；尚待对本机 FLAC 逐句听校。
 *
 * DSL：8 个字符 = 一小节的 8 个八分位置；大写 = 右手，小写 = 左手；
 * B/T/S 为鼓音，0 为休止。记谱组由渲染层归并：独音独占一拍为四分音符，
 * 两个八分紧邻共一条下划线，空拍只写一个 0（不并列两个 0）。
 */

const BPM = 77.329;
const BEAT_MS = 60000 / BPM;
const BAR_MS = BEAT_MS * 4;
const AUDIO_OFFSET_MS = 3111;
const BAR_COUNT = 58;
const EXPECTED_DURATION_MS = 183141;

const strokeForChar: Record<string, { stroke: Stroke; hand: Hand; dynamics?: "soft" }> = {
  B: { stroke: "bass", hand: "R" },
  b: { stroke: "bass", hand: "L", dynamics: "soft" },
  T: { stroke: "tone", hand: "R" },
  t: { stroke: "tone", hand: "L", dynamics: "soft" },
  S: { stroke: "slap", hand: "R" },
  s: { stroke: "slap", hand: "L", dynamics: "soft" },
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
  // 前奏 1–4（谱面：B SB B S ×3 ｜ B SB BB S）
  spec("a", { section: "前奏" }),
  spec("a"),
  spec("a"),
  spec("b"),
  // 主歌一 5–12：暖阳下我迎芬芳 / 是谁家的姑娘 / 我走在那座小桥上 / 你抚琴奏忧伤
  spec("a", { section: "主歌一", lyric: "暖阳下 我迎芬芳", lyricSpan: LYRIC_SPAN }),
  spec("a"),
  spec("a", { lyric: "是谁家的姑娘", lyricSpan: LYRIC_SPAN }),
  spec("b"),
  spec("a", { lyric: "我走在了那座小桥上", lyricSpan: LYRIC_SPAN }),
  spec("a"),
  spec("a", { lyric: "你抚琴奏忧伤", lyricSpan: LYRIC_SPAN }),
  spec("b"),
  // 主歌二 13–20（后半段第 4 拍 S 左手）
  spec("a", { section: "主歌二", lyric: "桥边歌唱的小姑娘", lyricSpan: LYRIC_SPAN }),
  spec("a"),
  spec("a", { lyric: "你眼角在流淌", lyricSpan: LYRIC_SPAN }),
  spec("b"),
  spec("aLeft", { lyric: "你说一个人在逞强", lyricSpan: LYRIC_SPAN }),
  spec("aLeft"),
  spec("aLeft", { lyric: "一个人念家乡", lyricSpan: LYRIC_SPAN }),
  spec("b"),
  // 副歌 21–32：风华两行 + 我说四行（弱唱 breakdown 段）
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
  // 主歌三（第二段）33–48
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
  // 副歌再现 49–52
  spec("b", { section: "副歌", lyric: "我说桥边姑娘 你的芬芳", lyricSpan: LYRIC_SPAN }),
  spec("b"),
  spec("b", { lyric: "我把你放心上 刻在了我心膛", lyricSpan: LYRIC_SPAN }),
  spec("b"),
  // 尾奏 53–58：弱唱收尾（鼓手休息），最后一记低音收束
  spec("rest", { section: "尾奏", lyric: "桥边姑娘 你的忧伤", lyricSpan: LYRIC_SPAN }),
  spec("rest"),
  spec("rest", { lyric: "我把你放心房 不想让你流浪", lyricSpan: LYRIC_SPAN }),
  spec("rest"),
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
      ...(mapped.dynamics ? { dynamics: mapped.dynamics } : {}),
    });
  }

  return {
    number,
    startMs: Math.round(startMs),
    endMs: Math.round(startMs + BAR_MS),
    beats: 4,
    hits,
    ...(index === 0 ? { section: "前奏" } : {}),
  };
});

import { qiaobianPatterns } from "./rhythmPatterns";

export const qiaobianguniang: SongDefinition = {
  id: "qiao-bian-gu-niang",
  title: "桥边姑娘",
  artist: "海伦",
  bpm: BPM,
  timeSignature: [4, 4],
  // bars/hits 已经包含录音开头的 3111ms，播放器不能再次扣除。
  audioOffsetMs: 0,
  expectedDurationMs: EXPECTED_DURATION_MS,
  bars: qiaobianguniangBars,
  lyrics: [],
  rhythmPatterns: qiaobianPatterns,
};

// 参考时间戳：https://www.9ku.com/play/1000452.htm
// 文本复用本项目已有歌词。参考 LRC 并非本机 FLAC 的逐句人工听校结果。
// 每句独立计时，保留间奏和第二段重复，不用“每句两小节”推断时间。
const lyricText = (bar: number) => specs[bar - 1].lyric!;
const lyricCues: Array<[number, number, string]> = [
  [17180, 22340, `${lyricText(5)} ${lyricText(7)}`],
  [23190, 26280, lyricText(9)], [26280, 28330, lyricText(11)],
  [29610, 34600, `${lyricText(13)} ${lyricText(15)}`],
  [35770, 40930, `${lyricText(17)} ${lyricText(19)}`],
  [42070, 47270, lyricText(21)], [48240, 53830, lyricText(23)],
  [56760, 62660, lyricText(25)], [63780, 68870, lyricText(27)],
  [69970, 75070, lyricText(29)], [76210, 81240, lyricText(31)],
  [97980, 102950, `${lyricText(33)} ${lyricText(35)}`],
  [103840, 109170, `${lyricText(37)} ${lyricText(39)}`],
  [110290, 115490, `${lyricText(41)} ${lyricText(43)}`],
  [116450, 121900, `${lyricText(45)} ${lyricText(47)}`],
  [122670, 127910, lyricText(21)], [128830, 134500, lyricText(23)],
  [137450, 143370, lyricText(49)], [144460, 149660, lyricText(51)],
  [150680, 155700, lyricText(53)], [156790, 162500, lyricText(55)],
];
qiaobianguniang.lyrics = lyricCues.map(([startMs, endMs, text]) => ({ startMs, endMs, text }));

// 段落标签跟随参考录音结构，允许进唱位于小节中途。
for (const [atMs, section] of [
  [17180, "主歌一"], [42070, "过渡"], [56760, "副歌"],
  [84398, "间奏"], [97980, "主歌二"], [122670, "过渡"],
  [137450, "副歌"], [164143, "尾奏"],
] as const) {
  const bar = qiaobianguniangBars.find((bar) => bar.startMs <= atMs && bar.endMs > atMs);
  if (bar) bar.section = section;
}
