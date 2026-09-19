import type { Bar, HitEvent, SongDefinition } from "../domain/song";
import { tongnianPatterns } from "./rhythmPatterns";

/**
 * 《童年》罗大佑 · 马丁非洲鼓教学谱（4/4 拍 · 标称速度 116 · 实测 116.2 BPM）
 * 转录自 raw/童年.jpeg，鼓点节奏与录音及歌词毫秒级对齐。
 */
const BPM = 116.2;
const START_MS = 384;
const BEAT_MS = 60000 / BPM;
const BAR_MS = BEAT_MS * 4;

const patterns = {
  // 前奏
  intro1: ["B-s-", "S-B-", "B-s-", "S-s-"],
  intro2: ["B-s-", "S-B-", "B-S-", "S---"],
  intro3: ["B-s-", "S-B-", "B-B-", "S-B-"],
  intro4: ["0-B-", "0-B-", "B-B-", "B---"],
  intro5: ["B-s-", "S-B-", "B-B-", "S-B-"],
  intro6: ["B-s-", "S-B-", "B-s-", "S-s-"],
  // 常用型
  patA: ["B-s-", "S-B-", "B-s-", "S-s-"],
  patB: ["B-s-", "S-B-", "B-B-", "S-B-"],
  fillC: ["B-s-", "S-B-", "B-S-", "SSSS"],
  fillD: ["B-s-", "S-B-", "B-B-", "S-s-"],
  final: ["s-B-", "0---", "0---", "0---"],
  rest: ["0---", "0---", "0---", "0---"],
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

// 前奏 7 小节
add("intro1", 1, "前奏");
add("intro2");
add("intro3");
add("intro4");
add("intro5");
add("intro6", 2);

// 主歌一：池塘边的榕树上... (16 小节)
add("patA", 3, "主歌一");
add("patB", 4);
add("fillC", 1);
add("patA", 3);
add("patB", 4);
add("fillD", 1);

// 主歌二：福利社里面什么都有... (16 小节)
add("patA", 3, "主歌二");
add("patB", 4);
add("fillC", 1);
add("patA", 3);
add("patB", 4);
add("fillD", 1);

// 主歌三：总是要等到睡觉前... (16 小节)
add("patA", 3, "主歌三");
add("patB", 4);
add("fillC", 1);
add("patA", 3);
add("patB", 4);
add("fillD", 1);

// 间奏 Solo (18 小节)
add("patA", 4, "间奏");
add("patB", 8);
add("patA", 4);
add("fillD", 2);

// 主歌四：没有人知道为什么... (16 小节)
add("patA", 3, "主歌四");
add("patB", 4);
add("fillC", 1);
add("patA", 3);
add("patB", 4);
add("fillD", 1);

// 副歌五：阳光下蜻蜓飞过来... (16 小节)
add("patA", 3, "副歌");
add("patB", 4);
add("fillC", 1);
add("patA", 3);
add("patB", 4);
add("fillD", 1);

// 尾奏加花与收束 (7 小节)
add("patA", 4, "尾奏");
add("patB", 2);
add("final", 1);

export const tongnianLyrics = [
  {
    "startMs": 15000,
    "text": "池塘边的榕树上",
    "endMs": 18000
  },
  {
    "startMs": 18000,
    "text": "知了在声声叫着夏天",
    "endMs": 22200
  },
  {
    "startMs": 23000,
    "text": "操场边的秋千上",
    "endMs": 26000
  },
  {
    "startMs": 26000,
    "text": "只有蝴蝶停在上面",
    "endMs": 30200
  },
  {
    "startMs": 31000,
    "text": "黑板上老师的粉笔",
    "endMs": 34000
  },
  {
    "startMs": 34000,
    "text": "还在拼命叽叽喳喳写个不停",
    "endMs": 38200
  },
  {
    "startMs": 39000,
    "text": "等待着下课等待着放学",
    "endMs": 43000
  },
  {
    "startMs": 43000,
    "text": "等待游戏的童年",
    "endMs": 47200
  },
  {
    "startMs": 50000,
    "text": "福利社里面什么都有",
    "endMs": 53000
  },
  {
    "startMs": 53000,
    "text": "就是口袋里没有半毛钱",
    "endMs": 57200
  },
  {
    "startMs": 58000,
    "text": "诸葛四郎和魔鬼党",
    "endMs": 61000
  },
  {
    "startMs": 61000,
    "text": "到底谁抢到那支宝剑",
    "endMs": 65200
  },
  {
    "startMs": 66000,
    "text": "隔壁班的那个女孩",
    "endMs": 69000
  },
  {
    "startMs": 69000,
    "text": "怎么还没经过我的窗前",
    "endMs": 73200
  },
  {
    "startMs": 74000,
    "text": "嘴里的零食手里的漫画",
    "endMs": 78000
  },
  {
    "startMs": 78000,
    "text": "心里初恋的童年",
    "endMs": 82200
  },
  {
    "startMs": 83000,
    "text": "总是要等到睡觉前",
    "endMs": 86000
  },
  {
    "startMs": 86000,
    "text": "才知道功课只做了一点点",
    "endMs": 90200
  },
  {
    "startMs": 91000,
    "text": "总是要等到考试后",
    "endMs": 94000
  },
  {
    "startMs": 94000,
    "text": "才知道该念的书都没有念",
    "endMs": 98000
  },
  {
    "startMs": 98000,
    "text": "一寸光阴一寸金",
    "endMs": 101000
  },
  {
    "startMs": 101000,
    "text": "老师说过寸金难买寸光阴",
    "endMs": 105200
  },
  {
    "startMs": 107000,
    "text": "一天又一天一年又一年",
    "endMs": 111000
  },
  {
    "startMs": 111000,
    "text": "迷迷糊糊的童年",
    "endMs": 115200
  },
  {
    "startMs": 153000,
    "text": "没有人知道为什么",
    "endMs": 156000
  },
  {
    "startMs": 156000,
    "text": "太阳总下到山的那一边",
    "endMs": 160200
  },
  {
    "startMs": 161000,
    "text": "没有人能够告诉我",
    "endMs": 164000
  },
  {
    "startMs": 164000,
    "text": "山里面有没有住着神仙",
    "endMs": 168200
  },
  {
    "startMs": 169000,
    "text": "多少的日子里总是",
    "endMs": 172000
  },
  {
    "startMs": 172000,
    "text": "一个人面对着天空发呆",
    "endMs": 176200
  },
  {
    "startMs": 177000,
    "text": "就这么好奇就这么幻想",
    "endMs": 181000
  },
  {
    "startMs": 181000,
    "text": "这么孤单的童年",
    "endMs": 185200
  },
  {
    "startMs": 188000,
    "text": "阳光下蜻蜓飞过来",
    "endMs": 191000
  },
  {
    "startMs": 191000,
    "text": "一片片绿油油的稻田",
    "endMs": 195200
  },
  {
    "startMs": 196000,
    "text": "水彩蜡笔和万花筒",
    "endMs": 199000
  },
  {
    "startMs": 199000,
    "text": "画不出天边那一条彩虹",
    "endMs": 203200
  },
  {
    "startMs": 204000,
    "text": "什么时候才能像高年级的同学",
    "endMs": 208000
  },
  {
    "startMs": 208000,
    "text": "有张成熟与长大的脸",
    "endMs": 212000
  },
  {
    "startMs": 212000,
    "text": "盼望着假期盼望着明天",
    "endMs": 216000
  },
  {
    "startMs": 216000,
    "text": "盼望长大的童年",
    "endMs": 220000
  },
  {
    "startMs": 220000,
    "text": "一天又一天一年又一年",
    "endMs": 224200
  },
  {
    "startMs": 225000,
    "text": "盼望长大的童年",
    "endMs": 229200
  }
];

const tongnianBarLyrics: Record<number, { lyric: string; lyricBeats: string[] }> = {
  8: { lyric: "池塘边的", lyricBeats: ["池", "塘边", "的", ""] },
  9: { lyric: "榕树上 知了在", lyricBeats: ["榕树", "上", "知了", "在"] },
  10: { lyric: "声声叫着夏天", lyricBeats: ["声声", "叫着", "夏", "天"] },
  11: { lyric: "", lyricBeats: ["", "", "", ""] },
  12: { lyric: "操场边的", lyricBeats: ["", "操场", "边", "的"] },
  13: { lyric: "秋千上 只有", lyricBeats: ["秋千", "上", "只有", "蝴"] },
  14: { lyric: "蝴蝶停在上面", lyricBeats: ["蝶停", "在", "上面", ""] },
  15: { lyric: "", lyricBeats: ["", "", "", ""] },
  16: { lyric: "黑板上 老师的", lyricBeats: ["黑板", "上老", "师的", ""] },
  17: { lyric: "粉笔还 在拼命", lyricBeats: ["粉笔", "还在", "拼命", ""] },
  18: { lyric: "叽叽喳喳写个不停", lyricBeats: ["叽叽", "喳喳", "写个", "不停"] },
  19: { lyric: "", lyricBeats: ["", "", "", ""] },
  20: { lyric: "等待着下课", lyricBeats: ["等待", "着下", "课", ""] },
  21: { lyric: "等待着放学", lyricBeats: ["等待", "着放", "学", ""] },
  22: { lyric: "等待游戏的童", lyricBeats: ["等待", "游戏", "的童", ""] },
  23: { lyric: "年", lyricBeats: ["年", "", "", ""] },
  24: { lyric: "福利社里面", lyricBeats: ["福利", "社里", "面", ""] },
  25: { lyric: "什么都有 就是口", lyricBeats: ["什么", "都有", "就是", "口"] },
  26: { lyric: "袋里没有半毛钱", lyricBeats: ["袋里", "没有", "半毛", "钱"] },
  27: { lyric: "", lyricBeats: ["", "", "", ""] },
  28: { lyric: "诸葛四郎和", lyricBeats: ["", "诸葛", "四郎", "和"] },
  29: { lyric: "魔鬼党 到底谁", lyricBeats: ["魔鬼", "党到", "底谁", "抢"] },
  30: { lyric: "抢到那只宝剑", lyricBeats: ["到那", "只宝", "剑", ""] },
  31: { lyric: "", lyricBeats: ["", "", "", ""] },
  32: { lyric: "隔壁班的那个", lyricBeats: ["隔壁", "班的", "那个", ""] },
  33: { lyric: "女孩 怎么还没", lyricBeats: ["女孩", "怎么", "还没", ""] },
  34: { lyric: "经过我的窗前", lyricBeats: ["经过", "我的", "窗前", ""] },
  35: { lyric: "", lyricBeats: ["", "", "", ""] },
  36: { lyric: "嘴里的零食", lyricBeats: ["嘴里", "的零", "食", ""] },
  37: { lyric: "手里的漫画", lyricBeats: ["手里", "的漫", "画", ""] },
  38: { lyric: "心里初恋的童", lyricBeats: ["心里", "初恋", "的童", ""] },
  39: { lyric: "年", lyricBeats: ["年", "", "", ""] },
  40: { lyric: "总是要等到", lyricBeats: ["总是", "要等", "到", ""] },
  41: { lyric: "睡觉前 才知道功", lyricBeats: ["睡觉", "前才", "知道", "功"] },
  42: { lyric: "课只做了一点点", lyricBeats: ["课只", "做了", "一点", "点"] },
  43: { lyric: "", lyricBeats: ["", "", "", ""] },
  44: { lyric: "总是要等到", lyricBeats: ["", "总是", "要等", "到"] },
  45: { lyric: "考试以后 才知道", lyricBeats: ["考试", "以后", "才知", "道"] },
  46: { lyric: "该念的书都没有念", lyricBeats: ["该念", "的书", "都没", "有念"] },
  47: { lyric: "", lyricBeats: ["", "", "", ""] },
  48: { lyric: "一寸光阴一寸金", lyricBeats: ["一寸", "光阴", "一寸", "金"] },
  49: { lyric: "老师说过寸金难买", lyricBeats: ["老师", "说过", "寸金", "难买"] },
  50: { lyric: "寸光阴", lyricBeats: ["寸光", "阴", "", ""] },
  51: { lyric: "", lyricBeats: ["", "", "", ""] },
  52: { lyric: "一天又一天", lyricBeats: ["一天", "又一", "天", ""] },
  53: { lyric: "一年又一年", lyricBeats: ["一年", "又一", "年", ""] },
  54: { lyric: "迷迷糊糊的童", lyricBeats: ["迷迷", "糊糊", "的童", ""] },
  55: { lyric: "年", lyricBeats: ["年", "", "", ""] },
  74: { lyric: "没有人知道", lyricBeats: ["没有", "人知", "道", ""] },
  75: { lyric: "为什么 太阳总下", lyricBeats: ["为什", "么太", "阳总", "下"] },
  76: { lyric: "到山的那一边", lyricBeats: ["到山", "的那", "一边", ""] },
  77: { lyric: "", lyricBeats: ["", "", "", ""] },
  78: { lyric: "没有人能够", lyricBeats: ["", "没有", "人能", "够"] },
  79: { lyric: "告诉我 山里面有", lyricBeats: ["告诉", "我山", "里面", "有"] },
  80: { lyric: "没有住着神仙", lyricBeats: ["没有", "住着", "神仙", ""] },
  81: { lyric: "", lyricBeats: ["", "", "", ""] },
  82: { lyric: "多少的日子里", lyricBeats: ["多少", "的日", "子里", ""] },
  83: { lyric: "总是一个人面", lyricBeats: ["总是", "一个", "人面", ""] },
  84: { lyric: "对着天空发呆", lyricBeats: ["对着", "天空", "发呆", ""] },
  85: { lyric: "", lyricBeats: ["", "", "", ""] },
  86: { lyric: "就这么好奇", lyricBeats: ["就这", "么好", "奇", ""] },
  87: { lyric: "就这么幻想", lyricBeats: ["就这", "么幻", "想", ""] },
  88: { lyric: "这么孤单的童", lyricBeats: ["这么", "孤单", "的童", ""] },
  89: { lyric: "年", lyricBeats: ["年", "", "", ""] },
  90: { lyric: "阳光下蜻蜓", lyricBeats: ["阳光", "下蜻", "蜓", ""] },
  91: { lyric: "飞过来 一片片绿", lyricBeats: ["飞过", "来一", "片片", "绿"] },
  92: { lyric: "油油的稻田", lyricBeats: ["油油", "的稻", "田", ""] },
  93: { lyric: "", lyricBeats: ["", "", "", ""] },
  94: { lyric: "水彩蜡笔和", lyricBeats: ["", "水彩", "蜡笔", "和"] },
  95: { lyric: "万花筒 画不出天", lyricBeats: ["万花", "筒画", "不出", "天"] },
  96: { lyric: "边那一条彩虹", lyricBeats: ["边那", "一条", "彩虹", ""] },
  97: { lyric: "", lyricBeats: ["", "", "", ""] },
  98: { lyric: "什么时候才能", lyricBeats: ["什么", "时候", "才能", ""] },
  99: { lyric: "像高年级的同学", lyricBeats: ["像高", "年级", "的同", "学"] },
  100: { lyric: "有张成熟与长大的脸", lyricBeats: ["有张", "成熟", "与长", "大的脸"] },
  101: { lyric: "", lyricBeats: ["", "", "", ""] },
  102: { lyric: "盼望着假期", lyricBeats: ["盼望", "着假", "期", ""] },
  103: { lyric: "盼望着明天", lyricBeats: ["盼望", "着明", "天", ""] },
  104: { lyric: "盼望长大的童", lyricBeats: ["盼望", "长大", "的童", ""] },
  105: { lyric: "年", lyricBeats: ["年", "", "", ""] },
  106: { lyric: "一天又一天", lyricBeats: ["一天", "又一", "天", ""] },
  107: { lyric: "一年又一年", lyricBeats: ["一年", "又一", "年", ""] },
  108: { lyric: "盼望长大的童", lyricBeats: ["盼望", "长大", "的童", ""] },
  109: { lyric: "年", lyricBeats: ["年", "", "", ""] },
};

export const tongnianBars: Bar[] = specs.map((spec, index) => {
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

  const lyricInfo = tongnianBarLyrics[barNum];

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

export const tongnianSong: SongDefinition = {
  id: "tongnian",
  title: "童年",
  artist: "罗大佑",
  bpm: BPM,
  timeSignature: [4, 4],
  audioOffsetMs: 0,
  expectedDurationMs: 233220,
  bars: tongnianBars,
  lyrics: tongnianLyrics,
  rhythmPatterns: tongnianPatterns,
};
