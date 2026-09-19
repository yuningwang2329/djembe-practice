import type { Bar, Hand, HitEvent, SongDefinition, Stroke } from "../domain/song";
import { beijingPatterns } from "./rhythmPatterns";

/**
 * 《站在草原望北京》乌兰图雅 演唱
 * 谱面来源：机主提供的马丁手写原谱（raw/站在草原望北京.jpeg）及简谱（raw/站在草原望北京-简谱.gif）
 * 速度：实测 102.8 BPM，前奏由 2/4 拍两记清脆掌击起拍进入
 */

const BPM = 102.8;
const BEAT_MS = 60000 / BPM;
const START_MS = 365;
const EXPECTED_DURATION_MS = 248200;

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
  S: { stroke: "slap", hand: "R" },
  s: { stroke: "slap", hand: "L", dynamics: "soft" },
};

type PatternId =
  | "lead_in_2_4"
  | "a"
  | "b"
  | "c_stop"
  | "c_stop_b"
  | "c_sbs"
  | "fill_sss"
  | "chorus_inter"
  | "chorus_inter_end"
  | "stop"
  | "rest";

const PATTERN_SLOTS: Record<PatternId, string> = {
  // 2/4 拍引子：S S
  lead_in_2_4: "S000S000",
  // 核心主干：Bs SB Bs Ss
  a: "Bs00Sb00Bs00Ss00",
  // 推进型：Bs SB BS SB
  b: "Bs00Sb00Bs00Sb00",
  // 留白型：BS SB BS 0
  c_stop: "BS00Sb00BS000000",
  // 主歌留白型：BS SB B 0
  c_stop_b: "BS00Sb00B0000000",
  // 密集成组加花：Bs SB BS SBS
  c_sbs: "Bs00Sb00BS00SbS0",
  // 句尾爆发加花：B.B SB BS SSS
  fill_sss: "Bb00Sb00BS00SSSS",
  // 间奏行进：B B B SB
  chorus_inter: "B000B000B000Sb00",
  // 间奏收束：B B B 0
  chorus_inter_end: "B000B000B0000000",
  // 顿音：B 0 0 0
  stop: "B000000000000000",
  // 全休止
  rest: "0000000000000000",
};

interface BarConfig {
  pattern: PatternId;
  beats?: number;
  timeSignature?: [number, number];
  section?: string;
  lyric?: string;
  lyricBeats?: string[];
}

const barConfigs: BarConfig[] = [
  // 前奏 1–9（含第 1 小节 2/4 拍引子）
  { pattern: "lead_in_2_4", beats: 2, timeSignature: [2, 4], section: "前奏" },
  { pattern: "a" },
  { pattern: "a" },
  { pattern: "a" },
  { pattern: "b" },
  { pattern: "a" },
  { pattern: "a" },
  { pattern: "c_stop" },
  { pattern: "c_sbs" },

  // 主歌一 10–25
  { pattern: "a", section: "主歌", lyric: "瓦蓝蓝的天", lyricBeats: ["瓦蓝", "蓝的", "天", ""] },
  { pattern: "a", lyric: "上飞雄鹰", lyricBeats: ["上飞", "雄鹰", "", ""] },
  { pattern: "a", lyric: "我在高岗", lyricBeats: ["我在", "高岗", "", ""] },
  { pattern: "b", lyric: "眺望北京", lyricBeats: ["眺望", "北京", "", ""] },
  { pattern: "a", lyric: "侧耳倾听", lyricBeats: ["侧耳", "倾听", "", ""] },
  { pattern: "a", lyric: "母亲的声音", lyricBeats: ["母亲", "的声", "音", ""] },
  { pattern: "c_stop_b", lyric: "放眼欲穿", lyricBeats: ["放眼", "欲穿", "", ""] },
  { pattern: "c_sbs", lyric: "崇山峻岭", lyricBeats: ["崇山", "峻岭", "", ""] },
  { pattern: "a", lyric: "绿波波的草场", lyricBeats: ["绿波", "波的", "草场", ""] },
  { pattern: "a", lyric: "骏马行", lyricBeats: ["骏马", "行", "", ""] },
  { pattern: "a", lyric: "我在草原", lyricBeats: ["我在", "草原", "", ""] },
  { pattern: "b", lyric: "歌唱北京", lyricBeats: ["歌唱", "北京", "", ""] },
  { pattern: "a", lyric: "谁的眼睛", lyricBeats: ["谁的", "眼睛", "", ""] },
  { pattern: "b", lyric: "掠过了风景", lyricBeats: ["掠过", "了风", "景", ""] },
  { pattern: "stop", lyric: "迎风高唱", lyricBeats: ["迎风", "高唱", "", ""] },
  { pattern: "fill_sss", lyric: "五星红旗", lyricBeats: ["五星", "红旗", "", ""] },

  // 副歌一 26–41
  { pattern: "a", section: "副歌", lyric: "我站在草原", lyricBeats: ["我站", "在草", "原", ""] },
  { pattern: "a", lyric: "望北京", lyricBeats: ["望北", "京", "", ""] },
  { pattern: "a", lyric: "一望无际", lyricBeats: ["一望", "无际", "", ""] },
  { pattern: "b", lyric: "国泰安宁", lyricBeats: ["国泰", "安宁", "", ""] },
  { pattern: "a", lyric: "唱出草原的豪情", lyricBeats: ["唱出", "草原", "的豪", "情"] },
  { pattern: "a", lyric: "和美丽", lyricBeats: ["和美", "丽", "", ""] },
  { pattern: "a", lyric: "让这歌声", lyricBeats: ["让这", "歌声", "", ""] },
  { pattern: "c_sbs", lyric: "回荡紫禁", lyricBeats: ["回荡", "紫禁", "", ""] },
  { pattern: "a", lyric: "我站在草原", lyricBeats: ["我站", "在草", "原", ""] },
  { pattern: "a", lyric: "望北京", lyricBeats: ["望北", "京", "", ""] },
  { pattern: "a", lyric: "青青山岗", lyricBeats: ["青青", "山岗", "", ""] },
  { pattern: "b", lyric: "心旷神怡", lyricBeats: ["心旷", "神怡", "", ""] },
  { pattern: "a", lyric: "让心放飞着", lyricBeats: ["让心", "放飞", "着", ""] },
  { pattern: "a", lyric: "喜悦的心情", lyricBeats: ["喜悦", "的心", "情", ""] },
  { pattern: "a", lyric: "吉祥彩云", lyricBeats: ["吉祥", "彩云", "", ""] },
  { pattern: "c_sbs", lyric: "献给你", lyricBeats: ["献给", "你", "", ""] },

  // 间奏 42–50（音频实测 9 小节：8 小节 B B B SB + 1 小节 B B B 0）
  { pattern: "chorus_inter", section: "间奏" },
  { pattern: "chorus_inter" },
  { pattern: "chorus_inter" },
  { pattern: "chorus_inter" },
  { pattern: "chorus_inter" },
  { pattern: "chorus_inter" },
  { pattern: "chorus_inter" },
  { pattern: "chorus_inter" },
  { pattern: "chorus_inter_end" },

  // 主歌二 50–65
  { pattern: "a", section: "主歌", lyric: "瓦蓝蓝的天", lyricBeats: ["瓦蓝", "蓝的", "天", ""] },
  { pattern: "a", lyric: "上飞雄鹰", lyricBeats: ["上飞", "雄鹰", "", ""] },
  { pattern: "a", lyric: "我在高岗", lyricBeats: ["我在", "高岗", "", ""] },
  { pattern: "b", lyric: "眺望北京", lyricBeats: ["眺望", "北京", "", ""] },
  { pattern: "a", lyric: "侧耳倾听", lyricBeats: ["侧耳", "倾听", "", ""] },
  { pattern: "a", lyric: "母亲的声音", lyricBeats: ["母亲", "的声", "音", ""] },
  { pattern: "c_stop_b", lyric: "放眼欲穿", lyricBeats: ["放眼", "欲穿", "", ""] },
  { pattern: "c_sbs", lyric: "崇山峻岭", lyricBeats: ["崇山", "峻岭", "", ""] },
  { pattern: "a", lyric: "绿波波的草场", lyricBeats: ["绿波", "波的", "草场", ""] },
  { pattern: "a", lyric: "骏马行", lyricBeats: ["骏马", "行", "", ""] },
  { pattern: "a", lyric: "我在草原", lyricBeats: ["我在", "草原", "", ""] },
  { pattern: "b", lyric: "歌唱北京", lyricBeats: ["歌唱", "北京", "", ""] },
  { pattern: "a", lyric: "谁的眼睛", lyricBeats: ["谁的", "眼睛", "", ""] },
  { pattern: "b", lyric: "掠过了风景", lyricBeats: ["掠过", "了风", "景", ""] },
  { pattern: "stop", lyric: "迎风高唱", lyricBeats: ["迎风", "高唱", "", ""] },
  { pattern: "fill_sss", lyric: "五星红旗", lyricBeats: ["五星", "红旗", "", ""] },

  // 副歌二 66–81
  { pattern: "a", section: "副歌", lyric: "我站在草原", lyricBeats: ["我站", "在草", "原", ""] },
  { pattern: "a", lyric: "望北京", lyricBeats: ["望北", "京", "", ""] },
  { pattern: "a", lyric: "一望无际", lyricBeats: ["一望", "无际", "", ""] },
  { pattern: "b", lyric: "国泰安宁", lyricBeats: ["国泰", "安宁", "", ""] },
  { pattern: "a", lyric: "唱出草原的豪情", lyricBeats: ["唱出", "草原", "的豪", "情"] },
  { pattern: "a", lyric: "和美丽", lyricBeats: ["和美", "丽", "", ""] },
  { pattern: "a", lyric: "让这歌声", lyricBeats: ["让这", "歌声", "", ""] },
  { pattern: "c_sbs", lyric: "回荡紫禁", lyricBeats: ["回荡", "紫禁", "", ""] },
  { pattern: "a", lyric: "我站在草原", lyricBeats: ["我站", "在草", "原", ""] },
  { pattern: "a", lyric: "望北京", lyricBeats: ["望北", "京", "", ""] },
  { pattern: "a", lyric: "青青山岗", lyricBeats: ["青青", "山岗", "", ""] },
  { pattern: "b", lyric: "心旷神怡", lyricBeats: ["心旷", "神怡", "", ""] },
  { pattern: "a", lyric: "让心放飞着", lyricBeats: ["让心", "放飞", "着", ""] },
  { pattern: "a", lyric: "喜悦的心情", lyricBeats: ["喜悦", "的心", "情", ""] },
  { pattern: "a", lyric: "吉祥彩云", lyricBeats: ["吉祥", "彩云", "", ""] },
  { pattern: "c_sbs", lyric: "献给你", lyricBeats: ["献给", "你", "", ""] },

  // 副歌重唱高潮 82–97
  { pattern: "a", section: "副歌", lyric: "我站在草原", lyricBeats: ["我站", "在草", "原", ""] },
  { pattern: "a", lyric: "望北京", lyricBeats: ["望北", "京", "", ""] },
  { pattern: "a", lyric: "一望无际", lyricBeats: ["一望", "无际", "", ""] },
  { pattern: "b", lyric: "国泰安宁", lyricBeats: ["国泰", "安宁", "", ""] },
  { pattern: "a", lyric: "唱出草原的豪情", lyricBeats: ["唱出", "草原", "的豪", "情"] },
  { pattern: "a", lyric: "和美丽", lyricBeats: ["和美", "丽", "", ""] },
  { pattern: "a", lyric: "让这歌声", lyricBeats: ["让这", "歌声", "", ""] },
  { pattern: "c_sbs", lyric: "回荡紫禁", lyricBeats: ["回荡", "紫禁", "", ""] },
  { pattern: "a", lyric: "我站在草原", lyricBeats: ["我站", "在草", "原", ""] },
  { pattern: "a", lyric: "望北京", lyricBeats: ["望北", "京", "", ""] },
  { pattern: "a", lyric: "青青山岗", lyricBeats: ["青青", "山岗", "", ""] },
  { pattern: "b", lyric: "心旷神怡", lyricBeats: ["心旷", "神怡", "", ""] },
  { pattern: "a", lyric: "让心放飞着", lyricBeats: ["让心", "放飞", "着", ""] },
  { pattern: "a", lyric: "喜悦的心情", lyricBeats: ["喜悦", "的心", "情", ""] },
  { pattern: "a", lyric: "吉祥彩云", lyricBeats: ["吉祥", "彩云", "", ""] },
  { pattern: "c_sbs", lyric: "献给你", lyricBeats: ["献给", "你", "", ""] },

  // 尾奏 98–105
  { pattern: "a", section: "尾奏", lyric: "吉祥彩云献给你", lyricBeats: ["吉祥", "彩云", "献给", "你"] },
  { pattern: "b" },
  { pattern: "a" },
  { pattern: "c_sbs" },
  { pattern: "a" },
  { pattern: "b" },
  { pattern: "a" },
  { pattern: "stop" },
];

export const beijingBars: Bar[] = [];
let currentBarStartMs = START_MS;

for (let index = 0; index < barConfigs.length; index++) {
  const cfg = barConfigs[index];
  const barNumber = index + 1;
  const beats = cfg.beats ?? 4;
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

  beijingBars.push({
    number: barNumber,
    startMs,
    endMs,
    beats,
    hits,
    ...(cfg.timeSignature ? { timeSignature: cfg.timeSignature } : {}),
    ...(cfg.section ? { section: cfg.section } : {}),
    ...(cfg.lyric ? { lyric: cfg.lyric } : {}),
    ...(cfg.lyricBeats ? { lyricBeats: cfg.lyricBeats } : {}),
  });

  currentBarStartMs += barDurationMs;
}

const beijingLyrics = [
  { startMs: 20120, endMs: 29450, text: "瓦蓝蓝的天上飞雄鹰 我在高岗眺望北京" },
  { startMs: 29450, endMs: 38780, text: "侧耳倾听母亲的声音 放眼欲穿崇山峻岭" },
  { startMs: 38780, endMs: 48110, text: "绿波波的草场骏马行 我在草原歌唱北京" },
  { startMs: 48110, endMs: 57440, text: "谁的眼睛掠过了风景 迎风高唱五星红旗" },
  { startMs: 57440, endMs: 66770, text: "我站在草原望北京 一望无际国泰安宁" },
  { startMs: 66770, endMs: 76100, text: "唱出草原的豪情和美丽 让这歌声回荡紫禁" },
  { startMs: 76100, endMs: 85430, text: "我站在草原望北京 青青山岗心旷神怡" },
  { startMs: 85430, endMs: 94760, text: "让心放飞着喜悦的心情 吉祥彩云献给你" },
  { startMs: 118080, endMs: 127410, text: "瓦蓝蓝的天上飞雄鹰 我在高岗眺望北京" },
  { startMs: 127410, endMs: 136740, text: "侧耳倾听母亲的声音 放眼欲穿崇山峻岭" },
  { startMs: 136740, endMs: 146070, text: "绿波波的草场骏马行 我在草原歌唱北京" },
  { startMs: 146070, endMs: 155400, text: "谁的眼睛掠过了风景 迎风高唱五星红旗" },
  { startMs: 155400, endMs: 164730, text: "我站在草原望北京 一望无际国泰安宁" },
  { startMs: 164730, endMs: 174060, text: "唱出草原的豪情和美丽 让这歌声回荡紫禁" },
  { startMs: 174060, endMs: 183390, text: "我站在草原望北京 青青山岗心旷神怡" },
  { startMs: 183390, endMs: 192720, text: "让心放飞着喜悦的心情 吉祥彩云献给你" },
  { startMs: 192720, endMs: 202050, text: "我站在草原望北京 一望无际国泰安宁" },
  { startMs: 202050, endMs: 211380, text: "唱出草原的豪情和美丽 让这歌声回荡紫禁" },
  { startMs: 211380, endMs: 220710, text: "我站在草原望北京 青青山岗心旷神怡" },
  { startMs: 220710, endMs: 231500, text: "让心放飞着喜悦的心情 吉祥彩云献给你" },
];

export const beijing: SongDefinition = {
  id: "zhan-zai-cao-yuan-wang-bei-jing",
  title: "站在草原望北京",
  artist: "乌兰图雅",
  bpm: BPM,
  timeSignature: [4, 4],
  audioOffsetMs: 0,
  expectedDurationMs: EXPECTED_DURATION_MS,
  bars: beijingBars,
  lyrics: beijingLyrics,
  rhythmPatterns: beijingPatterns,
};
