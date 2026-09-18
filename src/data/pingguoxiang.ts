import type { Bar, Hand, HitEvent, SongDefinition, Stroke } from "../domain/song";
import { pingguoPatterns } from "./rhythmPatterns";

/**
 * 《苹果香》狼戈 词曲 · 黑大婶回乡带娃 演唱
 * 原谱：用户提供的完整手写谱（raw/苹果香.jpeg）及简谱（raw/苹果香-简谱.jpg）
 * 录音速度：实测 67.84 BPM（每拍 884.43ms，前奏音频自 1740ms 鼓点进入）
 */

const BPM = 67.84;
const BEAT_MS = 60000 / BPM;
const AUDIO_OFFSET_MS = 1740;
const EXPECTED_DURATION_MS = 230963;

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
  | "intro_rest"
  | "intro_fill"
  | "intro_groove"
  | "b_2_4"
  | "bbs_sbb_2_4"
  | "verse_a"
  | "verse_sbb"
  | "verse_xsb"
  | "chorus_b"
  | "chorus_sbbb"
  | "chorus_sbob"
  | "fill_bbs_sbb"
  | "rest_4"
  | "ending_b";

/**
 * 对应手写谱中每拍音符：
 * 4 拍小节用 16 个字符（每拍 4 个十六分槽位），2 拍小节用 8 个字符。
 */
const PATTERN_SLOTS: Record<PatternId, string> = {
  // 全休止
  intro_rest: "0000000000000000",
  // 前奏第 2 小节后半段加花：- - BBS SBB
  intro_fill: "00000000BbS0SbB0",
  // 前奏经典律动：Bs SsB BB Ss
  intro_groove: "Bs00SsBbBb00Ss00",
  // 2/4 拍过渡：B 0
  b_2_4: "B0000000",
  // 2/4 拍过渡加花：BBS SBB
  bbs_sbb_2_4: "BbS0SbB0",
  // A段（主歌）：Bs Xs BB Xss
  verse_a: "Bs00Xs00Bb00Xss0",
  // A段乐句推进：Bs Xs BB SBB
  verse_sbb: "Bs00Xs00Bb00SbB0",
  // A段乐句收尾：Bs Xs BB XsB
  verse_xsb: "Bs00Xs00Bb00XsBb",
  // B段（副歌）：Bs SsB BB Sss
  chorus_b: "Bs00SsBbBb00Sss0",
  // B段高潮推进：Bs SsB BSB SBBB
  chorus_sbbb: "Bs00SsBbBsBbSbBb",
  // B段转出过渡：Bs SsB BB SBOB
  chorus_sbob: "Bs00SsBbBb00Sb0b",
  // 间奏乐句收束加花：Bs SsB BBS SBB
  fill_bbs_sbb: "Bs00SsBbBbS0SbB0",
  // 4 拍休止
  rest_4: "0000000000000000",
  // 尾奏收音
  ending_b: "B000000000000000",
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
  // 前奏 1–5（含第 5 小节 2/4 拍变拍）
  { pattern: "intro_rest", section: "前奏" },
  { pattern: "intro_fill" },
  { pattern: "intro_groove" },
  { pattern: "intro_groove" },
  { pattern: "b_2_4", beats: 2, timeSignature: [2, 4] },

  // A段·主歌一 6–14（8 小节 4/4 + 1 小节 2/4 BBS SBB）
  { pattern: "verse_a", section: "主歌", lyric: "红嘴雁啊飞回", lyricBeats: ["红嘴", "雁啊", "飞", "回"] },
  { pattern: "verse_a", lyric: "芦苇随风摆", lyricBeats: ["芦苇", "随风", "摆", ""] },
  { pattern: "verse_a", lyric: "河对面的莎吾烈泰", lyricBeats: ["河对", "面的", "莎吾", "烈泰"] },
  { pattern: "verse_sbb", lyric: "今天在不在", lyricBeats: ["今天", "在不", "在", ""] },
  { pattern: "verse_a", lyric: "那年我饮马来到了", lyricBeats: ["那年", "我饮", "马来", "到了"] },
  { pattern: "verse_a", lyric: "你的白毡房", lyricBeats: ["你的", "白毡", "房", "我曾"] },
  { pattern: "verse_a", lyric: "我曾看到你弹着冬布拉", lyricBeats: ["看到", "你弹", "着冬", "布拉"] },
  { pattern: "verse_xsb", lyric: "听过你把歌唱", lyricBeats: ["听过", "你把", "歌", "唱"] },
  { pattern: "bbs_sbb_2_4", beats: 2, timeSignature: [2, 4] },

  // B段·副歌一 15–23（8 小节 4/4 + 1 小节 2/4 B 0）
  { pattern: "chorus_b", section: "副歌", lyric: "单纯的相逢", lyricBeats: ["单纯", "的相", "逢", ""] },
  { pattern: "chorus_b", lyric: "平凡的晚上", lyricBeats: ["平凡", "的晚", "上", ""] },
  { pattern: "chorus_b", lyric: "我就在那个时候啊", lyricBeats: ["我就", "在那个", "时候", "啊"] },
  { pattern: "chorus_sbbb", lyric: "傻傻的等到了天亮", lyricBeats: ["傻傻", "的等", "到了", "天亮"] },
  { pattern: "chorus_b", lyric: "月亮作证", lyricBeats: ["月亮", "作证", "", ""] },
  { pattern: "chorus_b", lyric: "你毡帽上的羽毛", lyricBeats: ["你毡", "帽上", "的羽", "毛"] },
  { pattern: "chorus_b", lyric: "亲吻着晚风飘啊飘", lyricBeats: ["亲吻", "着晚", "风飘", "啊飘"] },
  { pattern: "chorus_sbob", lyric: "啊飘到了我的心上", lyricBeats: ["飘到", "了我", "的心", "上"] },
  { pattern: "b_2_4", beats: 2, timeSignature: [2, 4] },

  // 间奏一 24–25
  { pattern: "chorus_b", section: "间奏" },
  { pattern: "fill_bbs_sbb" },

  // A段·主歌二 26–34
  { pattern: "verse_a", section: "主歌", lyric: "六星街里还传来", lyricBeats: ["六星", "街里", "还传", "来"] },
  { pattern: "verse_a", lyric: "巴扬琴声吗", lyricBeats: ["巴扬", "琴声", "吗", ""] },
  { pattern: "verse_a", lyric: "阿力克桑德的面包房", lyricBeats: ["阿力", "克桑", "德的面", "包房"] },
  { pattern: "verse_sbb", lyric: "列巴出炉了吗", lyricBeats: ["列巴", "出炉", "了吗", ""] },
  { pattern: "verse_a", lyric: "南苑卤香是舌尖上的故事啊", lyricBeats: ["南苑", "卤香", "是舌", "尖上"] },
  { pattern: "verse_a", lyric: "的故事啊", lyricBeats: ["的故事", "啊", "你让", "浪迹"] },
  { pattern: "verse_a", lyric: "你让浪迹天涯的孩子啊", lyricBeats: ["天涯", "的孩", "子啊", "梦中"] },
  { pattern: "verse_xsb", lyric: "梦中回家吧", lyricBeats: ["回家", "吧", "", ""] },
  { pattern: "bbs_sbb_2_4", beats: 2, timeSignature: [2, 4] },

  // B段·副歌二 35–43
  { pattern: "chorus_b", section: "副歌", lyric: "儿时的万花筒里", lyricBeats: ["儿时", "的万", "花筒", "里"] },
  { pattern: "chorus_b", lyric: "有野鸽在飞翔", lyricBeats: ["有野", "鸽在", "飞翔", ""] },
  { pattern: "chorus_b", lyric: "这让我想起二哥", lyricBeats: ["这让", "我想", "起二", "哥"] },
  { pattern: "chorus_sbbb", lyric: "和他心爱的弹弓叉", lyricBeats: ["和他", "心爱", "的弹", "弓叉"] },
  { pattern: "chorus_b", lyric: "湖蓝色的院墙", lyricBeats: ["湖蓝", "色的", "院墙", ""] },
  { pattern: "chorus_b", lyric: "我生命里的院落", lyricBeats: ["我生", "命里", "的院", "落"] },
  { pattern: "chorus_b", lyric: "我的妈妈在那里给我的爱", lyricBeats: ["我的", "妈妈", "在那里", "给我的爱"] },
  { pattern: "chorus_sbob", lyric: "叫我永生不忘啊", lyricBeats: ["叫我", "永生", "不忘", "啊"] },
  { pattern: "b_2_4", beats: 2, timeSignature: [2, 4] },

  // 间奏二 44–52（手写谱：8 小节 4/4 + 1 小节 2/4）
  { pattern: "chorus_b", section: "间奏" },
  { pattern: "chorus_b" },
  { pattern: "chorus_b" },
  { pattern: "fill_bbs_sbb" },
  { pattern: "chorus_b" },
  { pattern: "chorus_b" },
  { pattern: "chorus_b" },
  { pattern: "fill_bbs_sbb" },
  { pattern: "b_2_4", beats: 2, timeSignature: [2, 4] },

  // C段·副歌升华 53–60（手写谱：4 小节留白 + 加花，4 小节副歌推进）
  { pattern: "rest_4", section: "副歌", lyric: "心中有个地方", lyricBeats: ["心中", "有个", "地方", ""] },
  { pattern: "rest_4", lyric: "刻进了你的名字", lyricBeats: ["刻进", "了你", "的名", "字"] },
  { pattern: "rest_4", lyric: "草原 河谷 月季花香", lyricBeats: ["草原", "河谷", "月季", "花香"] },
  { pattern: "fill_bbs_sbb", lyric: "都是我的歌", lyricBeats: ["都是", "我的", "歌", ""] },
  { pattern: "chorus_b", lyric: "儿时离开你 正逢花开时", lyricBeats: ["儿时", "离开", "你正", "逢花开时"] },
  { pattern: "chorus_b", lyric: "如今往事 远了 模糊了", lyricBeats: ["如今", "往事", "远了", "模糊了"] },
  { pattern: "chorus_b", lyric: "我却忘不了苹果香", lyricBeats: ["我却", "忘不", "了苹", "果香"] },
  { pattern: "chorus_sbbb", lyric: "我却忘不了苹果香", lyricBeats: ["我却", "忘不", "了苹", "果香"] },

  // 尾奏 61–64
  { pattern: "chorus_b", section: "尾奏" },
  { pattern: "chorus_b" },
  { pattern: "chorus_b" },
  { pattern: "ending_b" },
];

export const pingguoBars: Bar[] = [];
let currentBarStartMs = AUDIO_OFFSET_MS;

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

  pingguoBars.push({
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

const pingguoLyrics = [
  { startMs: 17660, endMs: 24730, text: "红嘴雁啊飞回 芦苇随风摆" },
  { startMs: 24730, endMs: 31800, text: "河对面的莎吾烈泰 今天在不在" },
  { startMs: 31800, endMs: 38870, text: "那年我饮马来到了 你的白毡房" },
  { startMs: 38870, endMs: 46830, text: "我曾看到你弹着冬布拉 听过你把歌唱" },
  { startMs: 46830, endMs: 53900, text: "单纯的相逢 平凡的晚上" },
  { startMs: 53900, endMs: 60970, text: "我就在那个时候啊 傻傻的等到了天亮" },
  { startMs: 60970, endMs: 68040, text: "月亮作证 你毡帽上的羽毛" },
  { startMs: 68040, endMs: 76000, text: "亲吻着晚风飘啊飘 啊飘到了我的心上" },
  { startMs: 84840, endMs: 91910, text: "六星街里还传来 巴扬琴声吗" },
  { startMs: 91910, endMs: 98980, text: "阿力克桑德的面包房 列巴出炉了吗" },
  { startMs: 98980, endMs: 106050, text: "南苑卤香是舌尖上的故事啊" },
  { startMs: 106050, endMs: 114010, text: "你让浪迹天涯的孩子啊 梦中回家吧" },
  { startMs: 114010, endMs: 121080, text: "儿时的万花筒里 有野鸽在飞翔" },
  { startMs: 121080, endMs: 128150, text: "这让我想起二哥 和他心爱的弹弓叉" },
  { startMs: 128150, endMs: 135220, text: "湖蓝色的院墙 我生命里的院落" },
  { startMs: 135220, endMs: 143180, text: "我的妈妈在那里给我的爱 叫我永生不忘啊" },
  { startMs: 174120, endMs: 181190, text: "心中有个地方 刻进了你的名字" },
  { startMs: 181190, endMs: 188260, text: "草原 河谷 月季花香 都是我的歌" },
  { startMs: 188260, endMs: 195330, text: "儿时离开你 正逢花开时" },
  { startMs: 195330, endMs: 202400, text: "如今往事 远了 模糊了 我却忘不了苹果香" },
  { startMs: 202400, endMs: 211240, text: "如今往事 远了 模糊了 我却忘不了苹果香" },
];

export const pingguoxiang: SongDefinition = {
  id: "ping-guo-xiang",
  title: "苹果香",
  artist: "黑大婶回乡带娃",
  bpm: BPM,
  timeSignature: [4, 4],
  audioOffsetMs: 0,
  expectedDurationMs: EXPECTED_DURATION_MS,
  bars: pingguoBars,
  lyrics: pingguoLyrics,
  rhythmPatterns: pingguoPatterns,
};
