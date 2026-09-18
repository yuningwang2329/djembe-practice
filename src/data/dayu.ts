import type { Bar, HitEvent, SongDefinition } from "../domain/song";

// 《大鱼》周深 · 马丁非洲鼓教学谱（用户提供图片，4/4 拍 · 速度 70）。
// 记谱约定：每拍四个十六分位置，“-”延续不重新击打，“0”休止；
// 大小写是力度（小写 b/s = 轻击，对应谱面带斜杠的弱音），不是左右手；
// R/L 为右手起拍、拍内交替的建议手序，原谱未标注，不声称来自原谱。
//
// 时间坐标：小节与鼓点均为录音绝对毫秒，播放器偏移为 0（单一时间轴）。
// 标称速度 70 BPM 与录音实测有偏差，且各段略有伸缩（周深演唱较自由）。
// 网格取 bar = 3398ms（70.63 BPM），用三处实测人声锚点最小二乘确定：
//   主歌一句首 43.20s = 第 6 小节、主歌二句首 138.35s = 第 34 小节、
//   副歌二句首 ≈192.7s = 第 50 小节；副歌一唱腔提前约 1 拍进入为演唱处理。
// 谱面小节拍数按录音取舍：主歌二原谱 ×7/×2 加反复记号共 18 小节，
// 录音仅容 16 小节，第二型每轮取一遍（34–49）。
const BPM = 70.63;
const START_MS = 26220; // 前奏第 1 小节；此前 26.2s 为谱外钢琴引子
const BEAT_MS = 60000 / BPM;
const BAR_MS = BEAT_MS * 4;

// 每拍四个十六分位置（对应谱面连音线分组）：
// "B-SB" = B 八分 + S B 十六分（谱面 Bsb）；只有谱面带斜杠的弱音才写小写（soft），
// 谱面小写字母本身是十六分记法，力度与正音相同，故在此一律转大写。
const patterns = {
  introA: ["B-SB", "S-SB", "B-SB", "S-SS"],
  introB: ["B-SB", "S-SB", "B-SB", "S---"],
  verseA: ["B-SB", "s---", "0---", "S-SS"],
  verseB: ["B-SB", "S-SB", "B-BB", "S---"],
  verseC: ["B-SB", "S-SB", "BSBB", "SSSS"],
  chorusA: ["B-SB", "S-SB", "B-BB", "s-SS"],
  chorusB: ["B-SB", "S-SB", "B-B-", "s-S-"],
  verse2B: ["B-SB", "S-SB", "BSBS", "sSSS"],
  chorus2A: ["BSSS", "SSSB", "BSBS", "SSSS"],
  chorus2B: ["BSSS", "SSSB", "SBBS", "SSSS"],
  chorus2C: ["BSSS", "SSSB", "B---", "SSSS"],
  outA: ["BSSS", "SSSB", "BSSS", "SSSS"],
  outB: ["BSSS", "SSSB", "BSSS", "SSSS"],
  outC: ["B-SB", "S-SB", "BSBS", "SSSS"],
  outD: ["B-SB", "S-SB", "BSBS", "SSSS"],
  outE: ["B-SB", "S-SB", "B-SB", "S-SS"],
  final: ["B-0-", "0---", "0---", "0---"],
  rest: ["0---", "0---", "0---", "0---"],
} as const;
type Pattern = keyof typeof patterns;

const specs: Array<{ pattern: Pattern; section?: string }> = [];
function add(pattern: Pattern, count = 1, section?: string) {
  for (let i = 0; i < count; i += 1) {
    specs.push({ pattern, ...(i === 0 && section ? { section } : {}) });
  }
}

add("introA", 3, "前奏"); add("introB", 2); // 1–5
add("verseA", 8, "主歌一"); add("verseB", 7); add("verseC"); // 6–21
add("chorusA", 7, "副歌一"); add("chorusB"); // 22–29
add("chorusA", 3, "间奏"); add("chorusB"); // 30–33
add("chorusA", 7, "主歌二"); add("verse2B"); add("chorusA", 7); add("verse2B"); // 34–49
add("chorus2A", 3, "副歌二"); add("chorus2B"); add("chorus2A", 2); add("chorus2C"); // 50–56
add("outA", 1, "尾奏"); add("outB"); add("outC"); add("outD"); add("outE"); add("outE"); // 57–62
add("final"); // 63：谱末 "B 0" 收束
add("rest", 20, "尾奏·休止"); // 64–83，长尾奏后半程鼓手休止

export const dayuBars: Bar[] = specs.map((spec, index) => {
  const start = START_MS + index * BAR_MS;
  const hits: HitEvent[] = [];
  patterns[spec.pattern].forEach((slots, beat) => {
    let handIndex = 0;
    [...slots].forEach((char, slot) => {
      if (char === "-" || char === "0") return;
      hits.push({
        atMs: Math.round(start + (beat + slot / 4) * BEAT_MS),
        stroke: char.toUpperCase() === "B" ? "bass" : "slap",
        hand: handIndex++ % 2 === 0 ? "R" : "L",
        ...(char === char.toLowerCase() ? { dynamics: "soft" as const } : {}),
      });
    });
  });
  return {
    number: index + 1,
    startMs: Math.round(start),
    endMs: Math.round(start + BAR_MS),
    beats: 4,
    hits,
    ...(spec.section ? { section: spec.section } : {}),
  };
});

// 用户提供的 LRC（整秒逐句，未经逐字听校）；句尾取下一句开始，末句延 8s。
// 间奏（约 124.8–138.3s）与首尾引子/尾奏留白，不生造歌词事件。
const cues: Array<[number, number, string]> = [
  [43, 50, "海浪无声将夜幕深深淹没"],
  [50, 56, "漫过天空尽头的角落"],
  [56, 63, "大鱼在梦境的缝隙里游过"],
  [63, 69, "凝望你沉睡的轮廓"],
  [69, 76, "看海天一色 听风起雨落"],
  [76, 83, "执子手吹散苍茫茫烟波"],
  [83, 91, "大鱼的翅膀 已经太辽阔"],
  [91, 97, "我松开时间的绳索"],
  [97, 103, "怕你飞远去 怕你离我而去"],
  [103, 110, "更怕你永远停留在这里"],
  [110, 118, "每一滴泪水 都向你流淌去"],
  [118, 124.7, "倒流进天空的海底"],
  [139, 145, "海浪无声将夜幕深深淹没"],
  [145, 152, "漫过天空尽头的角落"],
  [152, 159, "大鱼在梦境的缝隙里游过"],
  [159, 165, "凝望你沉睡的轮廓"],
  [165, 172, "看海天一色 听风起雨落"],
  [172, 179, "执子手吹散苍茫茫烟波"],
  [179, 187, "大鱼的翅膀 已经太辽阔"],
  [187, 193, "我松开时间的绳索"],
  [193, 199, "看你飞远去 看你离我而去"],
  [199, 206, "原来你生来就属于天际"],
  [206, 214, "每一滴泪水 都向你流淌去"],
  [214, 222, "倒流回最初的相遇"],
];

import { dayuPatterns } from "./rhythmPatterns";

export const dayu: SongDefinition = {
  id: "da-yu-zhou-shen",
  title: "大鱼",
  artist: "周深",
  bpm: BPM,
  timeSignature: [4, 4],
  audioOffsetMs: 0,
  expectedDurationMs: 313756,
  bars: dayuBars,
  lyrics: cues.map(([start, end, text]) => ({
    startMs: Math.round(start * 1000),
    endMs: Math.round(end * 1000),
    text,
  })),
  rhythmPatterns: dayuPatterns,
};
