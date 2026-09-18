import type { Bar, Hand, HitEvent, SongDefinition, Stroke } from "../domain/song";
import { qiaobianPatterns } from "./rhythmPatterns";

/**
 * 《桥边姑娘》海伦 · 马丁非洲鼓教学（节奏 4/4 · 录音校准速度 77.329 · 难度 2 星）
 *
 * 谱面来源：机主提供的「马丁非洲鼓教学」高清原谱（raw/桥边姑娘.jpeg），
 * 特别包含前奏第 5 小节独有的 2/4 拍过渡（| 2/4 B 0 |）。
 *
 * 结构：
 * - 前奏：| B SB B S | [x3] | B SB BB S | [2/4 B 0] |（共 5 小节，含 1 个 2/4 拍小节）
 * - 主歌：||: B SB B S [x3] | B SB BB S [x3] :|| B B B 0 |（共 13 小节）
 * - 副歌：||: B SB BB S [x3] | B SB BB SS [x2] :|| B SB BB S |（共 11 小节）
 * - 间奏：| 0 0 0 0 [x4] |（共 4 小节）
 * - 主歌二：同主歌一（共 13 小节）
 * - 副歌二：同副歌一（共 11 小节）
 * - 尾奏：| 0 0 0 0 [x3] |（淡出收尾，共 3 小节）
 * 全曲共计 60 小节。
 */

const BPM = 77.329;
const BEAT_MS = 60000 / BPM;
const AUDIO_OFFSET_MS = 3111;
const EXPECTED_DURATION_MS = 183141;

const strokeForChar: Record<string, { stroke: Stroke; hand: Hand; dynamics?: "soft" }> = {
  B: { stroke: "bass", hand: "R" },
  b: { stroke: "bass", hand: "L", dynamics: "soft" },
  T: { stroke: "tone", hand: "R" },
  t: { stroke: "tone", hand: "L", dynamics: "soft" },
  S: { stroke: "slap", hand: "R" },
  s: { stroke: "slap", hand: "L", dynamics: "soft" },
};

type PatternName = "a" | "b" | "b_2_4" | "bbb0" | "bss" | "rest";

const PATTERNS: Record<PatternName, string> = {
  /** A：B ｜ SB ｜ B ｜ S —— 基本型 */
  a: "B0SbB0S0",
  /** B：B ｜ SB ｜ BB ｜ S —— 推进型 */
  b: "B0SbBbS0",
  /** 2/4拍：B ｜ 0 —— 前奏第 5 小节变拍过渡 */
  b_2_4: "B000",
  /** 主歌过渡收束：B ｜ B ｜ B ｜ 0 */
  bbb0: "B0B0B000",
  /** 副歌高潮加花：B ｜ SB ｜ BB ｜ SS */
  bss: "B0SbBbSs",
  /** 全休止 */
  rest: "00000000",
};

interface BarSpec {
  pattern: PatternName;
  beats?: number;
  timeSignature?: [number, number];
  section?: string;
  lyric?: string;
  lyricBeats?: string[];
}

const spec = (pattern: PatternName, extra: Omit<BarSpec, "pattern"> = {}): BarSpec => ({
  pattern,
  ...extra,
});

const specs: BarSpec[] = [
  // 前奏 1–5（含第 5 小节 2/4 拍过渡）
  spec("a", { section: "前奏" }),
  spec("a"),
  spec("a"),
  spec("b"),
  spec("b_2_4", { beats: 2, timeSignature: [2, 4] }),

  // 主歌一 6–18（||: B SB B S [x3] | B SB BB S [x3] :|| B B B 0 |）
  spec("a", { section: "主歌", lyric: "暖阳下", lyricBeats: ["暖", "阳", "下", ""] }),
  spec("a", { lyric: "我迎芬芳", lyricBeats: ["我", "迎", "芬", "芳"] }),
  spec("a", { lyric: "是谁家的姑娘", lyricBeats: ["是", "谁家", "的姑", "娘"] }),
  spec("b", { lyric: "我走在了那座小桥上", lyricBeats: ["我走", "在了", "那座", "小桥上"] }),
  spec("b", { lyric: "你抚琴奏忧伤", lyricBeats: ["你", "抚琴", "奏忧", "伤"] }),
  spec("b"),
  spec("a", { lyric: "桥边歌唱的小姑娘", lyricBeats: ["桥边", "歌唱的", "小姑", "娘"] }),
  spec("a", { lyric: "你眼角在流淌", lyricBeats: ["你", "眼角", "在流", "淌"] }),
  spec("a", { lyric: "你说一个人在逞强", lyricBeats: ["你说", "一个人", "在逞", "强"] }),
  spec("b", { lyric: "一个人念家乡", lyricBeats: ["一个", "人念", "家", "乡"] }),
  spec("b", { lyric: "风华模样 你落落大方", lyricBeats: ["风华", "模样", "你落落", "大方"] }),
  spec("b", { lyric: "坐在桥上", lyricBeats: ["坐在", "桥上", "", ""] }),
  spec("bbb0", { lyric: "我听你歌唱", lyricBeats: ["我", "听你", "歌唱", ""] }),

  // 副歌一 19–29（||: B SB BB S [x3] | B SB BB SS [x2] :|| B SB BB S |）
  spec("b", { section: "副歌", lyric: "我说桥边姑娘", lyricBeats: ["我说", "桥边", "姑娘", ""] }),
  spec("b", { lyric: "你的芬芳", lyricBeats: ["你的", "芬", "芳", ""] }),
  spec("b", { lyric: "我把你放心上", lyricBeats: ["我把", "你放", "心上", ""] }),
  spec("bss", { lyric: "刻在了我心膛", lyricBeats: ["刻在", "了我", "心", "膛"] }),
  spec("bss"),
  spec("b", { lyric: "桥边姑娘", lyricBeats: ["桥边", "姑", "娘", ""] }),
  spec("b", { lyric: "你的忧伤", lyricBeats: ["你的", "忧", "伤", ""] }),
  spec("b", { lyric: "我把你放心房", lyricBeats: ["我把", "你放", "心", "房"] }),
  spec("bss", { lyric: "不想让你流浪", lyricBeats: ["不想", "让你", "流", "浪"] }),
  spec("bss"),
  spec("b"),

  // 间奏 30–33（| 0 0 0 0 [x4] |）
  spec("rest", { section: "间奏" }),
  spec("rest"),
  spec("rest"),
  spec("rest"),

  // 主歌二 34–46（||: B SB B S [x3] | B SB BB S [x3] :|| B B B 0 |）
  spec("a", { section: "主歌", lyric: "暖阳下 的桥头旁", lyricBeats: ["暖阳", "下的", "桥头", "旁"] }),
  spec("a", { lyric: "有这样一姑娘", lyricBeats: ["有这", "样一", "姑", "娘"] }),
  spec("a", { lyric: "她有着长长的乌黑发", lyricBeats: ["她有", "着长长的", "乌黑", "发"] }),
  spec("b", { lyric: "一双眼明亮", lyricBeats: ["一双", "眼明", "亮", ""] }),
  spec("b", { lyric: "姑娘你让我心荡漾", lyricBeats: ["姑娘", "你让我", "心荡", "漾"] }),
  spec("b", { lyric: "小鹿在乱撞", lyricBeats: ["小鹿", "在乱", "撞", ""] }),
  spec("a", { lyric: "你说无人在身旁", lyricBeats: ["你说", "无人在", "身", "旁"] }),
  spec("a", { lyric: "一个人在流浪", lyricBeats: ["一个", "人在", "流", "浪"] }),
  spec("a"),
  spec("b", { lyric: "风华模样 你落落大方", lyricBeats: ["风华", "模样", "你落落", "大方"] }),
  spec("b", { lyric: "坐在桥上", lyricBeats: ["坐在", "桥上", "", ""] }),
  spec("b", { lyric: "我听你歌唱", lyricBeats: ["我", "听你", "歌唱", ""] }),
  spec("bbb0"),

  // 副歌二 47–57（||: B SB BB S [x3] | B SB BB SS [x2] :|| B SB BB S |）
  spec("b", { section: "副歌", lyric: "我说桥边姑娘", lyricBeats: ["我说", "桥边", "姑娘", ""] }),
  spec("b", { lyric: "你的芬芳", lyricBeats: ["你的", "芬", "芳", ""] }),
  spec("b", { lyric: "我把你放心上", lyricBeats: ["我把", "你放", "心上", ""] }),
  spec("bss", { lyric: "刻在了我心膛", lyricBeats: ["刻在", "了我", "心", "膛"] }),
  spec("bss"),
  spec("b", { lyric: "桥边姑娘", lyricBeats: ["桥边", "姑", "娘", ""] }),
  spec("b", { lyric: "你的忧伤", lyricBeats: ["你的", "忧", "伤", ""] }),
  spec("b", { lyric: "我把你放心房", lyricBeats: ["我把", "你放", "心", "房"] }),
  spec("bss", { lyric: "不想让你流浪", lyricBeats: ["不想", "让你", "流", "浪"] }),
  spec("bss"),
  spec("b"),

  // 尾奏 58（| 0 0 0 0 |，伴随弱唱渐弱收尾）
  spec("rest", { section: "尾奏" }),
];

export const qiaobianguniangBars: Bar[] = [];
let currentBarStartMs = AUDIO_OFFSET_MS;

for (let index = 0; index < specs.length; index++) {
  const barSpec = specs[index];
  const number = index + 1;
  const beats = barSpec.beats ?? 4;
  const barDurationMs = BEAT_MS * beats;
  const startMs = currentBarStartMs;
  const endMs = startMs + barDurationMs;
  const pattern = PATTERNS[barSpec.pattern];
  const hits: HitEvent[] = [];

  const slots = beats * 2;
  for (let eighth = 0; eighth < slots; eighth += 1) {
    const char = pattern[eighth] ?? "0";
    const mapped = strokeForChar[char];
    if (!mapped) continue;
    hits.push({
      atMs: Math.round(startMs + eighth * (BEAT_MS / 2)),
      stroke: mapped.stroke,
      hand: mapped.hand,
      ...(mapped.dynamics ? { dynamics: mapped.dynamics } : {}),
    });
  }

  qiaobianguniangBars.push({
    number,
    startMs: Math.round(startMs),
    endMs: Math.round(endMs),
    beats,
    hits,
    ...(barSpec.timeSignature ? { timeSignature: barSpec.timeSignature } : {}),
    ...(barSpec.section ? { section: barSpec.section } : {}),
    ...(barSpec.lyric ? { lyric: barSpec.lyric } : {}),
    ...(barSpec.lyricBeats ? { lyricBeats: barSpec.lyricBeats } : {}),
  });

  currentBarStartMs = endMs;
}

const lyricCues: Array<[number, number, string]> = [
  [17180, 22340, "暖阳下 我迎芬芳 是谁家的姑娘"],
  [23190, 28330, "我走在了那座小桥上 你抚琴奏忧伤"],
  [29610, 34600, "桥边歌唱的小姑娘 你眼角在流淌"],
  [35770, 40930, "你说一个人在逞强 一个人念家乡"],
  [42070, 47270, "风华模样 你落落大方"],
  [48240, 53830, "坐在桥上 我听你歌唱"],
  [56760, 62660, "我说桥边姑娘 你的芬芳"],
  [63780, 68870, "我把你放心上 刻在了我心膛"],
  [69970, 75070, "桥边姑娘 你的忧伤"],
  [76210, 81240, "我把你放心房 不想让你流浪"],
  [103840, 109170, "暖阳下 的桥头旁 有这样一姑娘"],
  [110290, 115490, "她有着长长的乌黑发 一双眼明亮"],
  [116450, 121900, "姑娘你让我心荡漾 小鹿在乱撞"],
  [122670, 127910, "你说无人在身旁 一个人在流浪"],
  [128830, 134500, "风华模样 你落落大方"],
  [135000, 140500, "坐在桥上 我听你歌唱"],
  [144460, 149660, "我说桥边姑娘 你的芬芳"],
  [150680, 155700, "我把你放心上 刻在了我心膛"],
  [159840, 165000, "桥边姑娘 你的忧伤"],
  [166050, 172000, "我把你放心房 不想让你流浪"],
];

export const qiaobianguniang: SongDefinition = {
  id: "qiao-bian-gu-niang",
  title: "桥边姑娘",
  artist: "海伦",
  bpm: BPM,
  timeSignature: [4, 4],
  audioOffsetMs: 0,
  expectedDurationMs: EXPECTED_DURATION_MS,
  bars: qiaobianguniangBars,
  lyrics: lyricCues.map(([startMs, endMs, text]) => ({ startMs, endMs, text })),
  rhythmPatterns: qiaobianPatterns,
};
