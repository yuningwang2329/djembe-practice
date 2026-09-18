import type { Bar, Hand, HitEvent, SongDefinition, Stroke } from "../domain/song";
import { chouchangkePatterns } from "./rhythmPatterns";

/**
 * 《我是人间惆怅客》芜筝 词 · 空想之喵 曲/唱
 * 谱面来源：机主提供的红笔手写批注原谱（raw/我是人间惆怅客.jpeg）及正版简谱（raw/我是人间惆怅客-简谱.jpeg）
 * 速度：65.0 BPM，前奏音频自 1700ms 鼓点进入，红笔标注多层次手序与弹击
 */

const BPM = 65.0;
const BEAT_MS = 60000 / BPM;
const START_MS = 1700;
const EXPECTED_DURATION_MS = 208235;

interface StrokeSpec {
  stroke: Stroke;
  hand: Hand;
  dynamics?: "soft";
}

const strokeMap: Record<string, StrokeSpec> = {
  B: { stroke: "bass", hand: "R" },
  b: { stroke: "bass", hand: "L", dynamics: "soft" },
  T: { stroke: "tone", hand: "R" },
  t: { stroke: "tone", hand: "L", dynamics: "soft" },
  M: { stroke: "tone", hand: "R" },
  m: { stroke: "tone", hand: "L", dynamics: "soft" },
  X: { stroke: "tone", hand: "R", dynamics: "soft" },
  S: { stroke: "slap", hand: "R" },
  s: { stroke: "slap", hand: "L", dynamics: "soft" },
};

type PatternId =
  | "intro_groove"
  | "intro_roll"
  | "verse_main"
  | "verse_end"
  | "chorus_main"
  | "chorus_roll"
  | "chorus_var"
  | "inter_fill"
  | "inter_end"
  | "stop"
  | "rest";

const PATTERN_SLOTS: Record<PatternId, string> = {
  // 前奏经典红笔律动：BbB shb bBbB Sbb
  intro_groove: "BbB0sb0BbBbBSbb0",
  // 前奏加花滚奏：BbB shB bBbB Sssss
  intro_roll: "BbB0sbBbBbBbSSSS",
  // 主歌中音叙事：BbM XB bM X
  verse_main: "BbM0X0B0b0M0X000",
  // 主歌乐句收束：BbM XB bM Xss
  verse_end: "BbM0X0B0b0M0Xss0",
  // 副歌深情律动：BbB sSB bBbB Sbb
  chorus_main: "BbB0sS0BbBbBSbb0",
  // 副歌高潮滚奏：BbB shB bBbB Sssss
  chorus_roll: "BbB0sbBbBbBbSSSS",
  // 副歌变奏：BbB BbB sBb Sbb
  chorus_var: "BbB0BbB0sBb0Sbb0",
  // 间奏推进：BBtB SSB tB S
  inter_fill: "BBtBSS0Bt0B0S000",
  // 间奏收束：BBtB SSB BSBB SBB
  inter_end: "BBtBSS0BBSBbSbB0",
  // 顿音收尾
  stop: "B000000000000000",
  // 全休止
  rest: "0000000000000000",
};

interface BarConfig {
  pattern: PatternId;
  section?: string;
  lyric?: string;
  lyricBeats?: string[];
}

const barConfigs: BarConfig[] = [
  // 前奏 1–8
  { pattern: "intro_groove", section: "前奏" },
  { pattern: "intro_groove" },
  { pattern: "intro_groove" },
  { pattern: "intro_roll" },
  { pattern: "intro_groove" },
  { pattern: "intro_groove" },
  { pattern: "intro_groove" },
  { pattern: "intro_roll" },

  // 主歌一 9–16
  { pattern: "verse_main", section: "主歌", lyric: "我是漂泊的孩子", lyricBeats: ["我是", "漂泊", "的孩", "子"] },
  { pattern: "verse_main", lyric: "生来就无家可归", lyricBeats: ["生来", "就无", "家可", "归"] },
  { pattern: "verse_main", lyric: "八万四千法门", lyricBeats: ["八万", "四千", "法门", ""] },
  { pattern: "verse_end", lyric: "没有一扇为我开启", lyricBeats: ["没有", "一扇", "为我", "开启"] },
  { pattern: "verse_main", lyric: "我是远方的孩子", lyricBeats: ["我是", "远方", "的孩", "子"] },
  { pattern: "verse_main", lyric: "风是唯一的知己", lyricBeats: ["风是", "唯一", "的知", "己"] },
  { pattern: "verse_main", lyric: "走过千山万水", lyricBeats: ["走过", "千山", "万水", ""] },
  { pattern: "verse_end", lyric: "却没能走出我自己", lyricBeats: ["却没", "能走", "出我", "自己"] },

  // 副歌一 17–24
  { pattern: "chorus_main", section: "副歌", lyric: "你不明白", lyricBeats: ["你不", "明白", "", ""] },
  { pattern: "chorus_main", lyric: "我为何倚门独立", lyricBeats: ["我为", "何倚", "门独", "立"] },
  { pattern: "chorus_main", lyric: "因为我在人间", lyricBeats: ["因为", "我在", "人间", ""] },
  { pattern: "chorus_roll", lyric: "无靠无依", lyricBeats: ["无靠", "无依", "", ""] },
  { pattern: "chorus_main", lyric: "你不明白", lyricBeats: ["你不", "明白", "", ""] },
  { pattern: "chorus_var", lyric: "我为何逆风哭泣", lyricBeats: ["我为", "何逆", "风哭", "泣"] },
  { pattern: "chorus_main", lyric: "因为我在人间", lyricBeats: ["因为", "我在", "人间", ""] },
  { pattern: "chorus_roll", lyric: "无靠无依", lyricBeats: ["无靠", "无依", "", ""] },

  // 间奏 25–28
  { pattern: "inter_fill", section: "间奏" },
  { pattern: "inter_fill" },
  { pattern: "inter_fill" },
  { pattern: "inter_end" },

  // 主歌二 29–36
  { pattern: "verse_main", section: "主歌", lyric: "我是迷途的星子", lyricBeats: ["我是", "迷途", "的星", "子"] },
  { pattern: "verse_main", lyric: "只知道燃烧自己", lyricBeats: ["只知", "道燃", "烧自", "己"] },
  { pattern: "verse_main", lyric: "银河浩瀚如经文", lyricBeats: ["银河", "浩瀚", "如经", "文"] },
  { pattern: "verse_end", lyric: "没有一句渡我皈依", lyricBeats: ["没有", "一句", "渡我", "皈依"] },
  { pattern: "verse_main", lyric: "我是断线的风筝", lyricBeats: ["我是", "断线", "的风", "筝"] },
  { pattern: "verse_main", lyric: "飘摇在冷雨黄昏", lyricBeats: ["飘摇", "在冷", "雨黄", "昏"] },
  { pattern: "verse_main", lyric: "三千世界如长绳", lyricBeats: ["三千", "世界", "如长", "绳"] },
  { pattern: "verse_end", lyric: "没有一根系我浮生", lyricBeats: ["没有", "一根", "系我", "浮生"] },

  // 副歌二 37–44
  { pattern: "chorus_main", section: "副歌", lyric: "你不明白", lyricBeats: ["你不", "明白", "", ""] },
  { pattern: "chorus_main", lyric: "我为何倚门独立", lyricBeats: ["我为", "何倚", "门独", "立"] },
  { pattern: "chorus_main", lyric: "因为我在人间", lyricBeats: ["因为", "我在", "人间", ""] },
  { pattern: "chorus_roll", lyric: "无靠无依", lyricBeats: ["无靠", "无依", "", ""] },
  { pattern: "chorus_main", lyric: "你不明白", lyricBeats: ["你不", "明白", "", ""] },
  { pattern: "chorus_var", lyric: "我为何逆风哭泣", lyricBeats: ["我为", "何逆", "风哭", "泣"] },
  { pattern: "chorus_main", lyric: "因为我在人间", lyricBeats: ["因为", "我在", "人间", ""] },
  { pattern: "chorus_roll", lyric: "无靠无依", lyricBeats: ["无靠", "无依", "", ""] },

  // 终曲尾奏 45–54
  { pattern: "chorus_main", section: "尾奏", lyric: "因为我在人间", lyricBeats: ["因为", "我在", "人间", ""] },
  { pattern: "chorus_main", lyric: "无靠无依", lyricBeats: ["无靠", "无依", "", ""] },
  { pattern: "chorus_main", lyric: "因为我在人间", lyricBeats: ["因为", "我在", "人间", ""] },
  { pattern: "chorus_roll", lyric: "无靠无依", lyricBeats: ["无靠", "无依", "", ""] },
  { pattern: "inter_fill" },
  { pattern: "inter_fill" },
  { pattern: "inter_fill" },
  { pattern: "inter_fill" },
  { pattern: "inter_end" },
  { pattern: "stop" },
];

export const chouchangkeBars: Bar[] = [];
let currentBarStartMs = START_MS;

for (let index = 0; index < barConfigs.length; index++) {
  const cfg = barConfigs[index];
  const barNumber = index + 1;
  const beats = 4;
  const barDurationMs = BEAT_MS * beats;
  const startMs = Math.round(currentBarStartMs);
  const endMs = Math.round(currentBarStartMs + barDurationMs);
  const slots = PATTERN_SLOTS[cfg.pattern];
  const totalSlots = slots.length;
  const slotMs = barDurationMs / totalSlots;

  const hits: HitEvent[] = [];
  for (let slotIndex = 0; slotIndex < totalSlots; slotIndex++) {
    const char = slots[slotIndex];
    if (char === "0" || char === ".") continue;
    const mapped = strokeMap[char];
    if (!mapped) continue;
    hits.push({
      atMs: Math.round(startMs + slotIndex * slotMs),
      stroke: mapped.stroke,
      hand: mapped.hand,
      ...(mapped.dynamics ? { dynamics: mapped.dynamics } : {}),
    });
  }

  chouchangkeBars.push({
    number: barNumber,
    startMs,
    endMs,
    beats,
    hits,
    ...(cfg.section ? { section: cfg.section } : {}),
    ...(cfg.lyric ? { lyric: cfg.lyric } : {}),
    ...(cfg.lyricBeats ? { lyricBeats: cfg.lyricBeats } : {}),
  });

  currentBarStartMs += barDurationMs;
}

const chouchangkeLyrics = [
  { startMs: 31240, endMs: 38620, text: "我是漂泊的孩子 生来就无家可归" },
  { startMs: 38620, endMs: 46000, text: "八万四千法门 没有一扇为我开启" },
  { startMs: 46000, endMs: 53380, text: "我是远方的孩子 风是唯一的知己" },
  { startMs: 53380, endMs: 60760, text: "走过千山万水 却没能走出我自己" },
  { startMs: 60760, endMs: 68140, text: "你不明白 我为何倚门独立" },
  { startMs: 68140, endMs: 75520, text: "因为我在人间 无靠无依" },
  { startMs: 75520, endMs: 82900, text: "你不明白 我为何逆风哭泣" },
  { startMs: 82900, endMs: 90280, text: "因为我在人间 无靠无依" },
  { startMs: 105040, endMs: 112420, text: "我是迷途的星子 只知道燃烧自己" },
  { startMs: 112420, endMs: 119800, text: "银河浩瀚如经文 没有一句渡我皈依" },
  { startMs: 119800, endMs: 127180, text: "我是断线的风筝 飘摇在冷雨黄昏" },
  { startMs: 127180, endMs: 134560, text: "三千世界如长绳 没有一根系我浮生" },
  { startMs: 134560, endMs: 141940, text: "你不明白 我为何倚门独立" },
  { startMs: 141940, endMs: 149320, text: "因为我在人间 无靠无依" },
  { startMs: 149320, endMs: 156700, text: "你不明白 我为何逆风哭泣" },
  { startMs: 156700, endMs: 164080, text: "因为我在人间 无靠无依" },
  { startMs: 164080, endMs: 178840, text: "因为我在人间 无靠无依" },
];

export const chouchangke: SongDefinition = {
  id: "wo-shi-ren-jian-chou-chang-ke",
  title: "我是人间惆怅客",
  artist: "空想之喵",
  bpm: BPM,
  timeSignature: [4, 4],
  audioOffsetMs: 0,
  expectedDurationMs: EXPECTED_DURATION_MS,
  bars: chouchangkeBars,
  lyrics: chouchangkeLyrics,
  rhythmPatterns: chouchangkePatterns,
};
