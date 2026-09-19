import type { Bar, HitEvent, SongDefinition } from "../domain/song";
import { lasaPatterns } from "./rhythmPatterns";

/**
 * 《坐上火车去拉萨》徐千雅 · 马丁非洲鼓教学谱（4/4 拍 · 标称速度 100）
 * 转录自 raw/坐上火车去拉萨.jpeg。
 */
const BPM = 100;
const START_MS = 0;
const BEAT_MS = 60000 / BPM;
const BAR_MS = BEAT_MS * 4;

const patterns = {
  introRest: ["0---", "0---", "0---", "0---"],
  patIntro: ["B-sb", "S-sB", "B-sb", "S-ss"], // 前奏
  patVerse1: ["B-sb", "S-sB", "B-sb", "S-ss"],
  patVerse2: ["B-sb", "S-sB", "B-Bb", "S-SS"],
  patVerseEnd: ["Bsss", "SssB", "BsBs", "SSSS"],
  patChorus1: ["Bsss", "SssB", "BsBs", "Ssss"],
  patChorus2: ["Bsss", "SssB", "BsBs", "SSSS"],
  patChorus3: ["Bsss", "SssS", "sSBs", "SSSS"],
  patStop: ["B-B-", "S---", "0---", "0---"], // BB S 0 0
  patOutroEnd: ["Bsss", "SssB", "sSBs", "SSBB"],
} as const;

type PatternKey = keyof typeof patterns;

interface BarSpec {
  pattern: PatternKey;
  section?: string;
}

const specs: BarSpec[] = [];
function add(pattern: PatternKey, count = 1, section?: string) {
  for (let i = 0; i < count; i += 1) {
    specs.push({ pattern, ...(i === 0 && section ? { section } : {}) });
  }
}

// 0~7.2s 汽笛引子 (3 小节)
add("introRest", 3, "鸣笛引子");
// 前奏 8 小节
add("patIntro", 8, "前奏律动");

// 主歌一：山有多高啊... (8 小节)
add("patVerse1", 3, "主歌一");
add("patVerse2", 4);
add("patVerseEnd", 1);

// 副歌一：坐上了火车去拉萨... (10 小节)
add("patChorus1", 3, "副歌一");
add("patChorus2", 1);
add("patChorus1", 3);
add("patChorus3", 2);
add("patStop", 1);

// 间奏 (4 小节)
add("patIntro", 4, "间奏");

// 主歌二：山有多高啊... (8 小节)
add("patVerse1", 3, "主歌二");
add("patVerse2", 4);
add("patVerseEnd", 1);

// 副歌二：坐上了火车去拉萨... (10 小节)
add("patChorus1", 3, "副歌二");
add("patChorus2", 1);
add("patChorus1", 3);
add("patChorus3", 2);

// 尾奏：(5 小节)
add("patChorus1", 3, "尾奏");
add("patOutroEnd", 1);
add("patStop", 1);

// 尾声余韵 (20 小节)
add("introRest", 20, "尾声渐隐");

export const lasaLyrics = [
  {
    "startMs": 26000,
    "text": "山有多高啊",
    "endMs": 28000
  },
  {
    "startMs": 28000,
    "text": "水有多长",
    "endMs": 31000
  },
  {
    "startMs": 31000,
    "text": "通往天堂的路太难",
    "endMs": 35200
  },
  {
    "startMs": 36000,
    "text": "终于盼来啊",
    "endMs": 38000
  },
  {
    "startMs": 38000,
    "text": "这条天路",
    "endMs": 40000
  },
  {
    "startMs": 40000,
    "text": "象巨龙飞在高原上",
    "endMs": 44200
  },
  {
    "startMs": 45000,
    "text": "穿过草原啊",
    "endMs": 48000
  },
  {
    "startMs": 48000,
    "text": "越过山川",
    "endMs": 50000
  },
  {
    "startMs": 50000,
    "text": "载着梦想和吉祥",
    "endMs": 54200
  },
  {
    "startMs": 55000,
    "text": "幸福的歌啊一路的唱",
    "endMs": 59200
  },
  {
    "startMs": 60000,
    "text": "唱到了唐古拉山",
    "endMs": 64200
  },
  {
    "startMs": 67000,
    "text": "坐上了火车去拉萨",
    "endMs": 71000
  },
  {
    "startMs": 71000,
    "text": "去看那神奇的布达拉",
    "endMs": 75200
  },
  {
    "startMs": 76000,
    "text": "去看那最美的格桑花呀",
    "endMs": 80200
  },
  {
    "startMs": 81000,
    "text": "盛开在雪山下",
    "endMs": 85200
  },
  {
    "startMs": 86000,
    "text": "坐上了火车去拉萨",
    "endMs": 90200
  },
  {
    "startMs": 91000,
    "text": "跳起那热烈的雪山朗玛",
    "endMs": 95200
  },
  {
    "startMs": 96000,
    "text": "喝下那最香浓的青稞酒呀",
    "endMs": 100000
  },
  {
    "startMs": 100000,
    "text": "醉在神话天堂",
    "endMs": 104200
  },
  {
    "startMs": 117000,
    "text": "山有多高啊",
    "endMs": 120000
  },
  {
    "startMs": 120000,
    "text": "水有多长",
    "endMs": 122000
  },
  {
    "startMs": 122000,
    "text": "通往天堂的路太难",
    "endMs": 126200
  },
  {
    "startMs": 127000,
    "text": "终于盼来啊",
    "endMs": 129000
  },
  {
    "startMs": 129000,
    "text": "这条天路",
    "endMs": 132000
  },
  {
    "startMs": 132000,
    "text": "象巨龙飞在高原上",
    "endMs": 136000
  },
  {
    "startMs": 136000,
    "text": "穿过草原啊",
    "endMs": 139000
  },
  {
    "startMs": 139000,
    "text": "越过山川",
    "endMs": 141000
  },
  {
    "startMs": 141000,
    "text": "载着梦想和吉祥",
    "endMs": 145200
  },
  {
    "startMs": 146000,
    "text": "幸福的歌啊一路的唱",
    "endMs": 150200
  },
  {
    "startMs": 151000,
    "text": "唱到了唐古拉山",
    "endMs": 155200
  },
  {
    "startMs": 158000,
    "text": "坐上了火车去拉萨",
    "endMs": 162200
  },
  {
    "startMs": 163000,
    "text": "去看那神奇的布达拉",
    "endMs": 167200
  },
  {
    "startMs": 168000,
    "text": "去看那最美的格桑花呀",
    "endMs": 172000
  },
  {
    "startMs": 172000,
    "text": "盛开在雪山下",
    "endMs": 176200
  },
  {
    "startMs": 177000,
    "text": "坐上了火车去拉萨",
    "endMs": 181200
  },
  {
    "startMs": 182000,
    "text": "跳起那热烈的雪山朗玛",
    "endMs": 186200
  },
  {
    "startMs": 187000,
    "text": "喝下那最香浓的青稞酒呀",
    "endMs": 191200
  },
  {
    "startMs": 192000,
    "text": "醉在神话天堂",
    "endMs": 196200
  }
];

const lasaBarLyrics: Record<number, { lyric: string; lyricBeats: string[] }> = {
  12: { lyric: "山有多高啊", lyricBeats: ["", "山有", "多高", "啊"] },
  13: { lyric: "水有多长", lyricBeats: ["", "水有", "多长", ""] },
  14: { lyric: "通往天堂的路太难", lyricBeats: ["通往", "天堂", "的路", "太难"] },
  16: { lyric: "终于盼来啊", lyricBeats: ["终于", "盼来", "啊", ""] },
  17: { lyric: "这条天路", lyricBeats: ["这条", "天路", "", ""] },
  18: { lyric: "像巨龙飞在高原上", lyricBeats: ["像巨", "龙飞", "在高", "原上"] },
  20: { lyric: "穿过草原啊", lyricBeats: ["", "穿过", "草原", "啊"] },
  21: { lyric: "越过山川", lyricBeats: ["", "越过", "山川", ""] },
  22: { lyric: "载着梦想和吉祥", lyricBeats: ["载着", "梦想", "和吉", "祥"] },
  24: { lyric: "幸福的歌啊", lyricBeats: ["幸福", "的歌", "啊", ""] },
  25: { lyric: "一路的唱", lyricBeats: ["一路", "的唱", "", ""] },
  26: { lyric: "唱到了唐古拉山", lyricBeats: ["唱到", "了唐", "古拉", "山"] },
  27: { lyric: "咳 巴扎 嘿", lyricBeats: ["", "咳", "巴扎", "嘿"] },
  28: { lyric: "坐上了火车去拉萨", lyricBeats: ["坐上", "了火", "车去", "拉萨"] },
  29: { lyric: "去看那神奇的布达拉", lyricBeats: ["去看", "那神", "奇的", "布达拉"] },
  30: { lyric: "去看那最美的格桑花呀", lyricBeats: ["去看", "那最", "美的", "格桑花呀"] },
  31: { lyric: "盛开在雪山下", lyricBeats: ["盛开", "在雪", "山下", ""] },
  32: { lyric: "坐上了火车去拉萨", lyricBeats: ["坐上", "了火", "车去", "拉萨"] },
  33: { lyric: "跳起那热烈的雪山朗玛", lyricBeats: ["跳起", "那热", "烈的", "雪山朗玛"] },
  34: { lyric: "喝下那最香浓的青稞酒呀", lyricBeats: ["喝下", "那最", "香浓", "的青稞酒呀"] },
  35: { lyric: "醉在神话天堂", lyricBeats: ["醉在", "神话", "天堂", ""] },
  36: { lyric: "山有多高啊", lyricBeats: ["", "山有", "多高", "啊"] },
  37: { lyric: "水有多长", lyricBeats: ["", "水有", "多长", ""] },
  38: { lyric: "通往天堂的路太难", lyricBeats: ["通往", "天堂", "的路", "太难"] },
  39: { lyric: "终于盼来啊", lyricBeats: ["终于", "盼来", "啊", ""] },
  40: { lyric: "这条天路", lyricBeats: ["这条", "天路", "", ""] },
  41: { lyric: "像巨龙飞在高原上", lyricBeats: ["像巨", "龙飞", "在高", "原上"] },
  42: { lyric: "穿过草原啊", lyricBeats: ["", "穿过", "草原", "啊"] },
  43: { lyric: "越过山川", lyricBeats: ["", "越过", "山川", ""] },
  44: { lyric: "载着梦想和吉祥", lyricBeats: ["载着", "梦想", "和吉", "祥"] },
  46: { lyric: "幸福的歌啊", lyricBeats: ["幸福", "的歌", "啊", ""] },
  47: { lyric: "一路的唱", lyricBeats: ["一路", "的唱", "", ""] },
  48: { lyric: "唱到了唐古拉山", lyricBeats: ["唱到", "了唐", "古拉", "山"] },
  49: { lyric: "咳 巴扎 嘿", lyricBeats: ["", "咳", "巴扎", "嘿"] },
  50: { lyric: "坐上了火车去拉萨", lyricBeats: ["坐上", "了火", "车去", "拉萨"] },
  51: { lyric: "去看那神奇的布达拉", lyricBeats: ["去看", "那神", "奇的", "布达拉"] },
  52: { lyric: "去看那最美的格桑花呀", lyricBeats: ["去看", "那最", "美的", "格桑花呀"] },
  53: { lyric: "盛开在雪山下", lyricBeats: ["盛开", "在雪", "山下", ""] },
  54: { lyric: "坐上了火车去拉萨", lyricBeats: ["坐上", "了火", "车去", "拉萨"] },
  55: { lyric: "跳起那热烈的雪山朗玛", lyricBeats: ["跳起", "那热", "烈的", "雪山朗玛"] },
  56: { lyric: "喝下那最香浓的青稞酒呀", lyricBeats: ["喝下", "那最", "香浓", "的青稞酒呀"] },
  57: { lyric: "醉在神话天堂", lyricBeats: ["醉在", "神话", "天堂", ""] },
};

export const lasaBars: Bar[] = specs.map((spec, index) => {
  const barNum = index + 1;
  const barStart = Math.round(START_MS + index * BAR_MS);
  const barEnd = Math.round(START_MS + (index + 1) * BAR_MS);
  const sixteenthMs = (barEnd - barStart) / 16;

  const hits: HitEvent[] = [];
  const groups = patterns[spec.pattern];

  groups.forEach((group, beatIndex) => {
    for (let slot = 0; slot < 4; slot += 1) {
      const char = group[slot];
      if (char === "-" || char === "0") continue;
      const atMs = Math.round(barStart + (beatIndex * 4 + slot) * sixteenthMs);
      const isSoft = char === "b" || char === "s" || char === "t";
      const upper = char.toUpperCase();
      const stroke = upper === "B" ? "bass" : upper === "T" ? "tone" : "slap";
      const hand = (slot % 2 === 0) ? "R" : "L";
      hits.push({
        atMs,
        stroke,
        hand,
        ...(isSoft ? { dynamics: "soft" } : {}),
      });
    }
  });

  const lyricInfo = lasaBarLyrics[barNum];

  return {
    number: barNum,
    startMs: barStart,
    endMs: barEnd,
    beats: 4,
    hits,
    ...(spec.section ? { section: spec.section } : {}),
    ...(lyricInfo ? lyricInfo : {}),
  };
});

export const lasaSong: SongDefinition = {
  id: "lasa",
  title: "坐上火车去拉萨",
  artist: "徐千雅",
  bpm: 100,
  timeSignature: [4, 4],
  audioOffsetMs: START_MS,
  expectedDurationMs: 211513,
  bars: lasaBars,
  lyrics: lasaLyrics,
  rhythmPatterns: lasaPatterns,
};
