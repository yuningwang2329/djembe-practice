import type { Bar, HitEvent, SongDefinition } from "../domain/song";
import { shuishouPatterns } from "./rhythmPatterns";

/**
 * 《水手》郑智化 · 马丁非洲鼓教学谱（4/4 拍 · 速度 97 · 录音网格校准 98.5 BPM）
 * 转录自 raw/水手1.jpeg, raw/水手2.jpg, raw/水手3.jpeg。
 */
const BPM = 98.5;
const START_MS = 120; // 录音起点
const BEAT_MS = 60000 / BPM;
const BAR_MS = BEAT_MS * 4;

const patterns = {
  rest: ["0---", "0---", "0---", "0---"],
  patA: ["BBs-", "S-B-", "BBs-", "SSs-"], // 节奏 A
  patB: ["BBs-", "S-B-", "B-S-", "S-SB"], // 节奏 B
  patC: ["BBs-", "S-B-", "s-SB", "SSSS"], // 节奏 C
  final: ["B---", "0---", "0---", "0---"],
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

// 空 4 小节前奏吉他与海浪声
add("rest", 4, "前奏引子");
// 前奏鼓点：A*3 + B + A*3 + B*2 (9 小节)
add("patA", 3, "前奏鼓声");
add("patB", 1);
add("patA", 3);
add("patB", 2);

// 主歌一：苦涩的沙... (16 小节)
add("patA", 2, "主歌一");
add("patA", 1); add("patC", 1);
add("patA", 2);
add("patA", 1); add("patC", 1);
add("patA", 2);
add("patA", 1); add("patC", 1);
add("patA", 2);
add("patA", 1); add("patC", 1);

// 副歌一：他说风雨中这点痛算什么... (11 小节)
add("patA", 2, "副歌一");
add("patA", 1); add("patB", 1);
add("patA", 2);
add("patA", 1); add("patB", 2);

// 间奏一：A*3 + B + A*3 + B*2 + A + B (11 小节)
add("patA", 3, "间奏一");
add("patB", 1);
add("patA", 3);
add("patB", 2);
add("patA", 1);
add("patB", 1);

// 主歌二：长大以后 为了理想而努力... (16 小节)
add("patA", 2, "主歌二");
add("patA", 1); add("patC", 1);
add("patA", 2);
add("patA", 1); add("patC", 1);
add("patA", 2);
add("patA", 1); add("patC", 1);
add("patA", 2);
add("patA", 1); add("patC", 1);

// 副歌二：他说风雨中这点痛算什么... (11 小节)
add("patA", 2, "副歌二");
add("patA", 1); add("patB", 1);
add("patA", 2);
add("patA", 1); add("patB", 2);

// 间奏二：A*3 + B + A*3 + B*2 + A + B (11 小节)
add("patA", 3, "间奏二");
add("patB", 1);
add("patA", 3);
add("patB", 2);
add("patA", 1);
add("patB", 1);

// 主歌三：寻寻觅觅 寻不到活着的证据... (16 小节)
add("patA", 2, "主歌三");
add("patA", 1); add("patC", 1);
add("patA", 2);
add("patA", 1); add("patC", 1);
add("patA", 2);
add("patA", 1); add("patC", 1);
add("patA", 2);
add("patA", 1); add("patC", 1);

// 副歌三与尾奏连击 (24 小节)
add("patA", 2, "副歌三");
add("patA", 1); add("patB", 1);
add("patA", 2);
add("patA", 1); add("patB", 1);
add("patA", 2);
add("patA", 1); add("patB", 1);
add("patA", 2);
add("patA", 1); add("patB", 2);
add("patA", 6, "尾奏渐弱");
add("final", 1);

export const shuishouLyrics = [
  {
    "startMs": 32000,
    "text": "苦涩的沙",
    "endMs": 34000
  },
  {
    "startMs": 34000,
    "text": "吹痛脸庞的感觉",
    "endMs": 37000
  },
  {
    "startMs": 37000,
    "text": "像父亲的责骂",
    "endMs": 38000
  },
  {
    "startMs": 38000,
    "text": "母亲的哭泣",
    "endMs": 40000
  },
  {
    "startMs": 40000,
    "text": "永远难忘记",
    "endMs": 42000
  },
  {
    "startMs": 42000,
    "text": "年少的我",
    "endMs": 44000
  },
  {
    "startMs": 44000,
    "text": "喜欢一个人在海边",
    "endMs": 47000
  },
  {
    "startMs": 47000,
    "text": "卷起裤管光着脚丫踩在沙滩上",
    "endMs": 51200
  },
  {
    "startMs": 52000,
    "text": "总是幻想海洋的尽头有另一个世界",
    "endMs": 56200
  },
  {
    "startMs": 57000,
    "text": "总是以为勇敢的水手是真正的男儿",
    "endMs": 61200
  },
  {
    "startMs": 62000,
    "text": "总是一副弱不禁风孬种的样子",
    "endMs": 66200
  },
  {
    "startMs": 67000,
    "text": "在受人欺负的时候总是听见水手说",
    "endMs": 71000
  },
  {
    "startMs": 71000,
    "text": "他说风雨中这点痛算什么",
    "endMs": 75200
  },
  {
    "startMs": 76000,
    "text": "擦干泪不要怕",
    "endMs": 79000
  },
  {
    "startMs": 79000,
    "text": "至少我们还有梦",
    "endMs": 81000
  },
  {
    "startMs": 81000,
    "text": "他说风雨中这点痛算什么",
    "endMs": 85200
  },
  {
    "startMs": 86000,
    "text": "擦干泪不要问",
    "endMs": 89000
  },
  {
    "startMs": 89000,
    "text": "为什么",
    "endMs": 93200
  },
  {
    "startMs": 94000,
    "text": "长大以后",
    "endMs": 96000
  },
  {
    "startMs": 96000,
    "text": "为了理想而努力",
    "endMs": 99000
  },
  {
    "startMs": 99000,
    "text": "渐渐的忽略了",
    "endMs": 100000
  },
  {
    "startMs": 100000,
    "text": "父亲母亲和故乡的消息",
    "endMs": 104000
  },
  {
    "startMs": 104000,
    "text": "如今的我",
    "endMs": 106000
  },
  {
    "startMs": 106000,
    "text": "生活就像在演戏",
    "endMs": 109000
  },
  {
    "startMs": 109000,
    "text": "说着言不由衷的话",
    "endMs": 111000
  },
  {
    "startMs": 111000,
    "text": "戴着伪善的面具",
    "endMs": 114000
  },
  {
    "startMs": 114000,
    "text": "总是拿着微不足道的成就来骗自己",
    "endMs": 118200
  },
  {
    "startMs": 119000,
    "text": "总是莫名其妙感到一阵的空虚",
    "endMs": 123200
  },
  {
    "startMs": 124000,
    "text": "总是靠一点酒精的麻醉才能够睡去",
    "endMs": 128200
  },
  {
    "startMs": 129000,
    "text": "在半睡半醒之间仿佛又听见水手说",
    "endMs": 133000
  },
  {
    "startMs": 133000,
    "text": "他说风雨中这点痛算什么",
    "endMs": 137200
  },
  {
    "startMs": 138000,
    "text": "擦干泪不要怕",
    "endMs": 141000
  },
  {
    "startMs": 141000,
    "text": "至少我们还有梦",
    "endMs": 143000
  },
  {
    "startMs": 143000,
    "text": "他说风雨中这点痛算什么",
    "endMs": 147200
  },
  {
    "startMs": 148000,
    "text": "擦干泪不要问",
    "endMs": 151000
  },
  {
    "startMs": 151000,
    "text": "为什么",
    "endMs": 155200
  },
  {
    "startMs": 181000,
    "text": "寻寻觅觅寻不到",
    "endMs": 184000
  },
  {
    "startMs": 184000,
    "text": "活着的证据",
    "endMs": 186000
  },
  {
    "startMs": 186000,
    "text": "都市的柏油路太硬",
    "endMs": 189000
  },
  {
    "startMs": 189000,
    "text": "踩不出足迹",
    "endMs": 191000
  },
  {
    "startMs": 191000,
    "text": "骄傲无知的现代人",
    "endMs": 194000
  },
  {
    "startMs": 194000,
    "text": "不知道珍惜",
    "endMs": 196000
  },
  {
    "startMs": 196000,
    "text": "那一片被文明糟蹋过的海洋和天地",
    "endMs": 200200
  },
  {
    "startMs": 201000,
    "text": "只有远离人群才能找回我自己",
    "endMs": 205200
  },
  {
    "startMs": 206000,
    "text": "在带着咸味的空气中自由的呼吸",
    "endMs": 210200
  },
  {
    "startMs": 211000,
    "text": "耳畔又传来汽笛声和水手的笑语",
    "endMs": 215200
  },
  {
    "startMs": 216000,
    "text": "永远在内心的最深处听见水手说",
    "endMs": 220000
  },
  {
    "startMs": 220000,
    "text": "他说风雨中这点痛算什么",
    "endMs": 224200
  },
  {
    "startMs": 225000,
    "text": "擦干泪不要怕",
    "endMs": 228000
  },
  {
    "startMs": 228000,
    "text": "至少我们还有梦",
    "endMs": 230000
  },
  {
    "startMs": 230000,
    "text": "他说风雨中这点痛算什么",
    "endMs": 234200
  },
  {
    "startMs": 235000,
    "text": "擦干泪不要问",
    "endMs": 238000
  },
  {
    "startMs": 238000,
    "text": "为什么",
    "endMs": 240000
  },
  {
    "startMs": 240000,
    "text": "他说风雨中这点痛算什么",
    "endMs": 244200
  },
  {
    "startMs": 245000,
    "text": "擦干泪不要怕",
    "endMs": 248000
  },
  {
    "startMs": 248000,
    "text": "至少我们还有梦",
    "endMs": 250000
  },
  {
    "startMs": 250000,
    "text": "他说风雨中这点痛算什么",
    "endMs": 254200
  },
  {
    "startMs": 255000,
    "text": "擦干泪不要问",
    "endMs": 258000
  },
  {
    "startMs": 258000,
    "text": "为什么",
    "endMs": 260000
  },
  {
    "startMs": 260000,
    "text": "他说风雨中这点痛算什么",
    "endMs": 264200
  },
  {
    "startMs": 265000,
    "text": "擦干泪不要怕",
    "endMs": 268000
  },
  {
    "startMs": 268000,
    "text": "至少我们还有梦",
    "endMs": 270000
  },
  {
    "startMs": 270000,
    "text": "他说风雨中这点痛算什么",
    "endMs": 274200
  },
  {
    "startMs": 275000,
    "text": "擦干泪不要问",
    "endMs": 277000
  },
  {
    "startMs": 277000,
    "text": "为什么",
    "endMs": 280000
  },
  {
    "startMs": 280000,
    "text": "他说风雨中这点痛算什么",
    "endMs": 284200
  },
  {
    "startMs": 285000,
    "text": "擦干泪不要怕",
    "endMs": 287000
  },
  {
    "startMs": 287000,
    "text": "至少我们还有梦",
    "endMs": 291200
  }
];

export const shuishouBars: Bar[] = specs.map((spec, index) => {
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

  return {
    number: index + 1,
    startMs: barStart,
    endMs: barEnd,
    beats: 4,
    hits,
    ...(spec.section ? { section: spec.section } : {}),
  };
});

export const shuishouSong: SongDefinition = {
  id: "shuishou",
  title: "水手",
  artist: "郑智化",
  bpm: 97,
  timeSignature: [4, 4],
  audioOffsetMs: START_MS,
  expectedDurationMs: 316865,
  bars: shuishouBars,
  lyrics: shuishouLyrics,
  rhythmPatterns: shuishouPatterns,
};
