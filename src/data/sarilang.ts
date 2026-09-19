import type { Bar, Hand, HitEvent, SongDefinition, Stroke } from "../domain/song";
import { sarilangPatterns } from "./rhythmPatterns";

/**
 * 《火红的萨日朗》乌兰托娅 原版演唱
 * 谱面来源：机主提供的标准非洲鼓高清原谱（raw/火红的萨日朗.jpeg）及简谱（raw/火红的萨日朗-简谱.jpeg）
 * 速度：实测 105.263 BPM，前 21.57s 为马头琴引子，非洲鼓前奏自 21570ms 规范切入
 */

const BPM = 105.263;
const BEAT_MS = 60000 / BPM;
const START_MS = 21570;
const EXPECTED_DURATION_MS = 246265;

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
  | "a"
  | "b"
  | "c"
  | "c_var"
  | "chorus_end1"
  | "chorus_end2"
  | "verse2_intro"
  | "verse2_bar2"
  | "verse2_end"
  | "stop"
  | "rest";

const PATTERN_SLOTS: Record<PatternId, string> = {
  // 基本型：B ｜ SB ｜ B ｜ S
  a: "B000Sb00B000S000",
  // 乐句过渡：B ｜ SB ｜ 0B ｜ S SS
  b: "B000Sb000b00S0Ss",
  // 推进加重：BB ｜ SB ｜ 0 ｜ SS SB
  c: "Bb00Sb000000SsSb",
  // 推进变奏：BB ｜ SB ｜ 0S ｜ S SS
  c_var: "Bb00Sb000s00S0Ss",
  // 副歌乐句变奏1：B ｜ SB ｜ SB ｜ S SS
  chorus_end1: "B000Sb00Sb00S0Ss",
  // 副歌乐句变奏2：B ｜ SB ｜ BS ｜ S SS
  chorus_end2: "B000Sb00Bs00S0Ss",
  // 进唱二切入：B 0 0 SB
  verse2_intro: "B00000000000Sb00",
  // 进唱二第 2 小节：0 SB B S
  verse2_bar2: "0000Sb00B000S000",
  // 进唱二收尾：BB SB 0 0
  verse2_end: "Bb00Sb0000000000",
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
  // 前奏 1–4（鼓点进入，21.57s - 30.69s）
  { pattern: "a", section: "前奏" },
  { pattern: "a" },
  { pattern: "a" },
  { pattern: "b" },

  // 进唱·主歌一 5–12
  { pattern: "a", section: "主歌", lyric: "天下有多大", lyricBeats: ["天下", "有多", "大", ""] },
  { pattern: "a", lyric: "随它去宽广", lyricBeats: ["随它", "去宽", "广", ""] },
  { pattern: "a", lyric: "大路有多远", lyricBeats: ["大路", "有多", "远", ""] },
  { pattern: "b", lyric: "幸福有多长", lyricBeats: ["幸福", "有多", "长", ""] },
  { pattern: "a", lyric: "听惯了牧马人", lyricBeats: ["听惯", "了牧", "马人", ""] },
  { pattern: "a", lyric: "悠扬的琴声", lyricBeats: ["悠扬", "的琴", "声", ""] },
  { pattern: "a", lyric: "爱上这水草", lyricBeats: ["爱上", "这水", "草", ""] },
  { pattern: "c", lyric: "丰美的牧场", lyricBeats: ["丰美", "的牧", "场", ""] },

  // 主歌二 13–20
  { pattern: "a", section: "主歌", lyric: "花开一抹红", lyricBeats: ["花开", "一抹", "红", ""] },
  { pattern: "a", lyric: "尽情的怒放", lyricBeats: ["尽情", "的怒", "放", ""] },
  { pattern: "a", lyric: "河流有多远", lyricBeats: ["河流", "有多", "远", ""] },
  { pattern: "b", lyric: "幸福有多长", lyricBeats: ["幸福", "有多", "长", ""] },
  { pattern: "a", lyric: "习惯了游牧人", lyricBeats: ["习惯", "了游", "牧人", ""] },
  { pattern: "a", lyric: "自由的生活", lyricBeats: ["自由", "的生", "活", ""] },
  { pattern: "a", lyric: "爱人在身边", lyricBeats: ["爱人", "在身", "边", ""] },
  { pattern: "c_var", lyric: "随处是天堂", lyricBeats: ["随处", "是天", "堂", ""] },

  // 副歌一 21–28
  { pattern: "a", section: "副歌", lyric: "草原最美的花", lyricBeats: ["草原", "最美", "的花", ""] },
  { pattern: "a", lyric: "火红的萨日朗", lyricBeats: ["火红", "的萨", "日朗", ""] },
  { pattern: "a", lyric: "一梦到天涯", lyricBeats: ["一梦", "到天", "涯", ""] },
  { pattern: "b", lyric: "遍地是花香", lyricBeats: ["遍地", "是花", "香", ""] },
  { pattern: "a", lyric: "流浪的人啊", lyricBeats: ["流浪", "的人", "啊", ""] },
  { pattern: "a", lyric: "心上有了她", lyricBeats: ["心上", "有了", "她", ""] },
  { pattern: "a", lyric: "千里万里也会", lyricBeats: ["千里", "万里", "也会", ""] },
  { pattern: "chorus_end1", lyric: "回头望", lyricBeats: ["回头", "望", "", ""] },

  // 副歌二 29–36
  { pattern: "a", section: "副歌", lyric: "草原最美的花", lyricBeats: ["草原", "最美", "的花", ""] },
  { pattern: "a", lyric: "火红的萨日朗", lyricBeats: ["火红", "的萨", "日朗", ""] },
  { pattern: "a", lyric: "火一样热烈", lyricBeats: ["火一", "样热", "烈", ""] },
  { pattern: "b", lyric: "火一样奔放", lyricBeats: ["火一", "样奔", "放", ""] },
  { pattern: "a", lyric: "痴情的人啊", lyricBeats: ["痴情", "的人", "啊", ""] },
  { pattern: "a", lyric: "心上有了她", lyricBeats: ["心上", "有了", "她", ""] },
  { pattern: "a", lyric: "有种幸福叫", lyricBeats: ["有种", "幸福", "叫", ""] },
  { pattern: "chorus_end2", lyric: "地久天长", lyricBeats: ["地久", "天长", "", ""] },

  // 间奏 37–40
  { pattern: "a", section: "间奏" },
  { pattern: "a" },
  { pattern: "a" },
  { pattern: "chorus_end2" },

  // 进唱二（原谱特色段落） 41–48
  { pattern: "verse2_intro", section: "主歌", lyric: "天下有多大", lyricBeats: ["天下", "有多", "大", ""] },
  { pattern: "verse2_bar2", lyric: "随它去宽广", lyricBeats: ["随它", "去宽", "广", ""] },
  { pattern: "a", lyric: "大路有多远", lyricBeats: ["大路", "有多", "远", ""] },
  { pattern: "b", lyric: "幸福有多长", lyricBeats: ["幸福", "有多", "长", ""] },
  { pattern: "a", lyric: "听惯了牧马人", lyricBeats: ["听惯", "了牧", "马人", ""] },
  { pattern: "a", lyric: "悠扬的琴声", lyricBeats: ["悠扬", "的琴", "声", ""] },
  { pattern: "a", lyric: "爱上这水草", lyricBeats: ["爱上", "这水", "草", ""] },
  { pattern: "verse2_end", lyric: "丰美的牧场", lyricBeats: ["丰美", "的牧", "场", ""] },

  // 主歌二重奏 49–56
  { pattern: "a", section: "主歌", lyric: "花开一抹红", lyricBeats: ["花开", "一抹", "红", ""] },
  { pattern: "a", lyric: "尽情的怒放", lyricBeats: ["尽情", "的怒", "放", ""] },
  { pattern: "a", lyric: "河流有多远", lyricBeats: ["河流", "有多", "远", ""] },
  { pattern: "b", lyric: "幸福有多长", lyricBeats: ["幸福", "有多", "长", ""] },
  { pattern: "a", lyric: "习惯了游牧人", lyricBeats: ["习惯", "了游", "牧人", ""] },
  { pattern: "a", lyric: "自由的生活", lyricBeats: ["自由", "的生", "活", ""] },
  { pattern: "a", lyric: "爱人在身边", lyricBeats: ["爱人", "在身", "边", ""] },
  { pattern: "c_var", lyric: "随处是天堂", lyricBeats: ["随处", "是天", "堂", ""] },

  // 副歌重奏一 57–64
  { pattern: "a", section: "副歌", lyric: "草原最美的花", lyricBeats: ["草原", "最美", "的花", ""] },
  { pattern: "a", lyric: "火红的萨日朗", lyricBeats: ["火红", "的萨", "日朗", ""] },
  { pattern: "a", lyric: "一梦到天涯", lyricBeats: ["一梦", "到天", "涯", ""] },
  { pattern: "b", lyric: "遍地是花香", lyricBeats: ["遍地", "是花", "香", ""] },
  { pattern: "a", lyric: "流浪的人啊", lyricBeats: ["流浪", "的人", "啊", ""] },
  { pattern: "a", lyric: "心上有了她", lyricBeats: ["心上", "有了", "她", ""] },
  { pattern: "a", lyric: "千里万里也会", lyricBeats: ["千里", "万里", "也会", ""] },
  { pattern: "chorus_end1", lyric: "回头望", lyricBeats: ["回头", "望", "", ""] },

  // 副歌重奏二 65–72
  { pattern: "a", section: "副歌", lyric: "草原最美的花", lyricBeats: ["草原", "最美", "的花", ""] },
  { pattern: "a", lyric: "火红的萨日朗", lyricBeats: ["火红", "的萨", "日朗", ""] },
  { pattern: "a", lyric: "火一样热烈", lyricBeats: ["火一", "样热", "烈", ""] },
  { pattern: "b", lyric: "火一样奔放", lyricBeats: ["火一", "样奔", "放", ""] },
  { pattern: "a", lyric: "痴情的人啊", lyricBeats: ["痴情", "的人", "啊", ""] },
  { pattern: "a", lyric: "心上有了她", lyricBeats: ["心上", "有了", "她", ""] },
  { pattern: "a", lyric: "有种幸福叫", lyricBeats: ["有种", "幸福", "叫", ""] },
  { pattern: "chorus_end2", lyric: "地久天长", lyricBeats: ["地久", "天长", "", ""] },

  // 副歌重复终曲 73–80
  { pattern: "a", section: "副歌", lyric: "草原最美的花", lyricBeats: ["草原", "最美", "的花", ""] },
  { pattern: "a", lyric: "火红的萨日朗", lyricBeats: ["火红", "的萨", "日朗", ""] },
  { pattern: "a", lyric: "一梦到天涯", lyricBeats: ["一梦", "到天", "涯", ""] },
  { pattern: "b", lyric: "遍地是花香", lyricBeats: ["遍地", "是花", "香", ""] },
  { pattern: "a", lyric: "痴情的人啊", lyricBeats: ["痴情", "的人", "啊", ""] },
  { pattern: "a", lyric: "心上有了她", lyricBeats: ["心上", "有了", "她", ""] },
  { pattern: "a", lyric: "有种幸福叫", lyricBeats: ["有种", "幸福", "叫", ""] },
  { pattern: "chorus_end2", lyric: "地久天长", lyricBeats: ["地久", "天长", "", ""] },

  // 尾奏 81–88
  { pattern: "a", section: "尾奏" },
  { pattern: "a" },
  { pattern: "a" },
  { pattern: "b" },
  { pattern: "a" },
  { pattern: "a" },
  { pattern: "a" },
  { pattern: "stop" },
];

export const sarilangBars: Bar[] = [];
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

  sarilangBars.push({
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

const sarilangLyrics = [
  { startMs: 30690, endMs: 39810, text: "天下有多大 随它去宽广 大路有多远 幸福有多长" },
  { startMs: 39810, endMs: 48930, text: "听惯了牧马人悠扬的琴声 爱上这水草丰美的牧场" },
  { startMs: 48930, endMs: 58050, text: "花开一抹红 尽情的怒放 河流有多远 幸福有多长" },
  { startMs: 58050, endMs: 67170, text: "习惯了游牧人自由的生活 爱人在身边随处是天堂" },
  { startMs: 67170, endMs: 76290, text: "草原最美的花 火红的萨日朗 一梦到天涯遍地是花香" },
  { startMs: 76290, endMs: 85410, text: "流浪的人啊心上有了她 千里万里也会 回头望" },
  { startMs: 85410, endMs: 94530, text: "草原最美的花 火红的萨日朗 火一样热烈 火一样奔放" },
  { startMs: 94530, endMs: 103650, text: "痴情的人啊心上有了她 有种幸福叫地久天长" },
  { startMs: 112770, endMs: 121890, text: "天下有多大 随它去宽广 大路有多远 幸福有多长" },
  { startMs: 121890, endMs: 131010, text: "听惯了牧马人悠扬的琴声 爱上这水草丰美的牧场" },
  { startMs: 131010, endMs: 140130, text: "花开一抹红 尽情的怒放 河流有多远 幸福有多长" },
  { startMs: 140130, endMs: 149250, text: "习惯了游牧人自由的生活 爱人在身边随处是天堂" },
  { startMs: 149250, endMs: 158370, text: "草原最美的花 火红的萨日朗 一梦到天涯遍地是花香" },
  { startMs: 158370, endMs: 167490, text: "流浪的人啊心上有了她 千里万里也会 回头望" },
  { startMs: 167490, endMs: 176610, text: "草原最美的花 火红的萨日朗 火一样热烈 火一样奔放" },
  { startMs: 176610, endMs: 185730, text: "痴情的人啊心上有了她 有种幸福叫地久天长" },
  { startMs: 185730, endMs: 203970, text: "草原最美的花 火红的萨日朗 有种幸福叫地久天长" },
];

export const sarilang: SongDefinition = {
  id: "huo-hong-de-sa-ri-lang",
  title: "火红的萨日朗",
  artist: "乌兰托娅",
  bpm: BPM,
  timeSignature: [4, 4],
  audioOffsetMs: 0,
  expectedDurationMs: EXPECTED_DURATION_MS,
  bars: sarilangBars,
  lyrics: sarilangLyrics,
  rhythmPatterns: sarilangPatterns,
};
