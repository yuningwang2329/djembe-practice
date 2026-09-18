import type { Bar, HitEvent, SongDefinition } from "../domain/song";

// 马丁非洲鼓教学谱，用户提供。大小写是力度，不是左右手。
// R/L 是右手起拍、拍内交替的建议手序，不声称来自原谱。
// 录音前 10.61 秒为谱外引子；小节 1 从实际鼓组进入处开始。
const BPM = 118;
const START_MS = 10610;
const BEAT_MS = 60000 / BPM;

// 每拍四个十六分位置，“-”延续而不重新击打；“0”整拍休止。
const patterns = {
  basic: ["B---", "S-B-", "B---", "S---"],
  fill: ["B---", "S-B-", "B-SS", "SSB-"],
  chorus: ["B-ss", "S-B-", "B-ss", "S-ss"],
  chorusFill: ["B-S-", "S-ss", "sSBs", "SsBB"],
  stop: ["B---", "0---", "0---", "0---"],
  rest: ["0---", "0---", "0---", "0---"],
  ending: ["B---", "B-b-", "0---", "0---"],
} as const;
type Pattern = keyof typeof patterns;
const specs: Array<{ pattern: Pattern; section?: string }> = [];
function add(pattern: Pattern, count = 1, section?: string) {
  for (let i = 0; i < count; i++) specs.push({ pattern, ...(i === 0 && section ? { section } : {}) });
}
function phrase(pattern: Pattern, fill: Pattern, repeats: number, section: string) {
  for (let i = 0; i < repeats; i++) { add(pattern, 7, i === 0 ? section : undefined); add(fill); }
}
add("basic", 6, "前奏"); add("fill"); add("stop"); // 1–8
phrase("basic", "fill", 2, "主歌一"); // 9–24
phrase("chorus", "chorusFill", 2, "副歌一"); // 25–40
add("chorus", 7, "间奏一"); add("stop"); // 41–48
phrase("basic", "fill", 2, "主歌二"); // 49–64
add("stop", 1, "间奏二"); add("rest", 15); // 65–80
phrase("chorus", "chorusFill", 3, "副歌二"); // 81–104
add("chorus", 6); add("chorusFill"); add("stop"); // 105–112
add("rest", 8, "尾奏·休止"); // 113–120
add("basic", 6, "尾奏"); add("fill"); add("ending"); // 121–128

const barLyrics: Record<number, { lyric: string; lyricBeats: string[] }> = {
  8: { lyric: "我走", lyricBeats: ["", "", "我", "走"] },
  9: { lyric: "在 鼓楼下", lyricBeats: ["在", "", "鼓楼", "下"] },
  10: { lyric: "面", lyricBeats: ["面", "", "", ""] },
  11: { lyric: "路在堵着", lyricBeats: ["", "路在", "堵", ""] },
  12: { lyric: "着 雨后的", lyricBeats: ["着", "雨后", "的", ""] },
  13: { lyric: "阳光洒落", lyricBeats: ["阳", "", "光洒", "落"] },
  14: { lyric: "人们都", lyricBeats: ["", "", "人们", "都"] },
  15: { lyric: "出来了", lyricBeats: ["出", "来", "了", ""] },
  16: { lyric: "执着", lyricBeats: ["", "", "执", "着"] },
  17: { lyric: "的 迷惘的", lyricBeats: ["的", "", "迷惘", "的"] },
  18: { lyric: "", lyricBeats: ["", "", "", ""] },
  19: { lyric: "文艺青年很", lyricBeats: ["文艺", "青年", "很", ""] },
  20: { lyric: "多 如果", lyricBeats: ["多", "", "如", "果"] },
  21: { lyric: "我 无聊了", lyricBeats: ["我", "", "无聊", "了"] },
  22: { lyric: "就会来这里", lyricBeats: ["就会", "来这", "里", ""] },
  23: { lyric: "坐坐", lyricBeats: ["坐", "坐", "", ""] },
  24: { lyric: "我是个", lyricBeats: ["", "", "我是", "个"] },
  25: { lyric: "沉默不语的", lyricBeats: ["沉默", "不语", "的", ""] },
  26: { lyric: "靠着墙壁", lyricBeats: ["靠着", "墙壁", "", ""] },
  27: { lyric: "晒太阳的过", lyricBeats: ["晒太", "阳的", "过", ""] },
  28: { lyric: "客 如果我", lyricBeats: ["客", "", "如果", "我"] },
  29: { lyric: "有些倦意了", lyricBeats: ["有些", "倦意", "了", ""] },
  30: { lyric: "就让我在", lyricBeats: ["就让", "我在", "", ""] },
  31: { lyric: "这里 独自", lyricBeats: ["这里", "独自", "", ""] },
  32: { lyric: "醒过 我", lyricBeats: ["醒", "过", "", "我"] },
  33: { lyric: "站在鼓楼上", lyricBeats: ["站在", "鼓楼", "上", ""] },
  34: { lyric: "面 一切", lyricBeats: ["面", "", "一切", ""] },
  35: { lyric: "繁华与我无", lyricBeats: ["繁华", "与我", "无", ""] },
  36: { lyric: "关 这是个", lyricBeats: ["关", "", "这是", "个"] },
  37: { lyric: "拥挤的地", lyricBeats: ["拥挤", "的地", "", ""] },
  38: { lyric: "方 而我却", lyricBeats: ["方", "", "而我", "却"] },
  39: { lyric: "很平凡", lyricBeats: ["很", "平", "凡", ""] },
  48: { lyric: "我走", lyricBeats: ["", "", "我", "走"] },
  49: { lyric: "在 鼓楼下", lyricBeats: ["在", "", "鼓楼", "下"] },
  50: { lyric: "面 淋湿的", lyricBeats: ["面", "", "淋湿", "的"] },
  51: { lyric: "咖啡馆", lyricBeats: ["咖啡", "馆", "", ""] },
  52: { lyric: "睡不着的", lyricBeats: ["", "睡不", "着", "的"] },
  53: { lyric: "后海边", lyricBeats: ["后海", "边", "", ""] },
  54: { lyric: "月亮还在", lyricBeats: ["", "月亮", "还在", ""] },
  55: { lyric: "抽着烟", lyricBeats: ["抽", "着", "烟", ""] },
  56: { lyric: "喝醉的", lyricBeats: ["", "", "喝醉", "的"] },
  57: { lyric: "亲吻着", lyricBeats: ["亲吻", "着", "", ""] },
  58: { lyric: "快活的人", lyricBeats: ["", "快活", "的人", ""] },
  59: { lyric: "不眠", lyricBeats: ["不", "眠", "", ""] },
  60: { lyric: "唯有我", lyricBeats: ["", "唯有", "我", ""] },
  61: { lyric: "倚着围栏", lyricBeats: ["倚着", "围栏", "", ""] },
  62: { lyric: "对过往说", lyricBeats: ["对过", "往说", "", ""] },
  63: { lyric: "晚安", lyricBeats: ["晚", "安", "", ""] },
  80: { lyric: "我是个", lyricBeats: ["", "", "我是", "个"] },
  81: { lyric: "沉默不语的", lyricBeats: ["沉默", "不语", "的", ""] },
  82: { lyric: "靠着车窗", lyricBeats: ["靠着", "车窗", "", ""] },
  83: { lyric: "想念你的乘", lyricBeats: ["想念", "你的", "乘", ""] },
  84: { lyric: "客 当一零", lyricBeats: ["客", "", "当一", "零"] },
  85: { lyric: "七路再次经", lyricBeats: ["七路", "再次", "经", ""] },
  86: { lyric: "过 时间是", lyricBeats: ["过", "", "时间", "是"] },
  87: { lyric: "带走青春的", lyricBeats: ["带走", "青春", "的", ""] },
  88: { lyric: "电车 我", lyricBeats: ["电", "车", "", "我"] },
  89: { lyric: "站在什刹海", lyricBeats: ["站在", "什刹", "海", ""] },
  90: { lyric: "边 一切", lyricBeats: ["边", "", "一切", ""] },
  91: { lyric: "甜蜜与我无", lyricBeats: ["甜蜜", "与我", "无", ""] },
  92: { lyric: "关 这是个", lyricBeats: ["关", "", "这是", "个"] },
  93: { lyric: "拥挤的地", lyricBeats: ["拥挤", "的地", "", ""] },
  94: { lyric: "方 而我却", lyricBeats: ["方", "", "而我", "却"] },
  95: { lyric: "很孤单", lyricBeats: ["很", "孤", "单", ""] },
  96: { lyric: "我在鼓楼", lyricBeats: ["我在", "鼓楼", "", ""] },
  97: { lyric: "我在鼓楼", lyricBeats: ["我在", "鼓楼", "", ""] },
  98: { lyric: "我在鼓楼", lyricBeats: ["我在", "鼓楼", "", ""] },
  99: { lyric: "我在鼓楼", lyricBeats: ["我在", "鼓楼", "", ""] },
  100: { lyric: "我在鼓楼", lyricBeats: ["我在", "鼓楼", "", ""] },
  101: { lyric: "我在鼓楼", lyricBeats: ["我在", "鼓楼", "", ""] },
  102: { lyric: "我在鼓楼", lyricBeats: ["我在", "鼓楼", "", ""] },
  103: { lyric: "我在鼓楼", lyricBeats: ["我在", "鼓楼", "", ""] },
  104: { lyric: "我在鼓楼", lyricBeats: ["我在", "鼓楼", "", ""] },
};

export const gulouBars: Bar[] = specs.map((spec, index) => {
  const barNum = index + 1;
  const start = START_MS + index * 4 * BEAT_MS;
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
  const barLyricInfo = barLyrics[barNum];
  return {
    number: barNum,
    startMs: Math.round(start),
    endMs: Math.round(start + 4 * BEAT_MS),
    beats: 4,
    hits,
    ...(spec.section ? { section: spec.section } : {}),
    ...(barLyricInfo ? barLyricInfo : {}),
  };
});

// 用户提供的 LRC 为整秒逐句时间，尚非逐字听校数据。
// 句尾为显示估计，长间奏必须留白，不能延伸到下一次进唱。
const cues: Array<[number, number, string]> = [
  [26, 33, "我走在鼓楼下面 路在堵着"],
  [34, 41, "雨后的阳光洒落 人们都出来了"],
  [42, 49, "执着的迷惘的文艺青年很多"],
  [50, 57, "如果我无聊了就会来这里坐坐"],
  [58, 61, "我是个沉默不语的"],
  [61, 65.5, "靠着墙壁晒太阳的过客"],
  [66, 69, "如果我有些倦意了"],
  [69, 74, "就让我在这里独自醒过"],
  [75, 79, "我站在鼓楼上面"],
  [79, 82.5, "一切繁华与我无关"],
  [83, 90, "这是个拥挤的地方 而我却很平凡"],
  [107, 114, "我走在鼓楼下面 淋湿的咖啡馆"],
  [115, 122, "睡不着的后海边 月亮还在抽着烟"],
  [123, 130, "喝醉的亲吻着 快活的人不眠"],
  [131, 138, "唯有我倚着围栏 对过往说晚安"],
  [172, 175, "我是个沉默不语的"],
  [175, 179.5, "靠着车窗想念你的乘客"],
  [180, 184, "当107 路再次经过"],
  [184, 188.5, "时间是带走青春的电车"],
  [189, 196, "我站在什刹海边一切甜蜜与我无关"],
  [197, 203.5, "这是个拥挤的地方 而我却很孤单"],
  [204, 211, "我在鼓楼 我在鼓楼"],
  [212, 219, "我在鼓楼 我在鼓楼"],
  [224, 231, "我在鼓楼 我在鼓楼"],
];

import { gulouPatterns } from "./rhythmPatterns";

export const gulou: SongDefinition = {
  id: "gu-lou-zhao-lei", title: "鼓楼", artist: "赵雷", bpm: BPM,
  timeSignature: [4, 4], audioOffsetMs: 0, expectedDurationMs: 281003,
  bars: gulouBars,
  lyrics: cues.map(([start, end, text]) => ({ startMs: start * 1000, endMs: end * 1000, text })),
  rhythmPatterns: gulouPatterns,
};
