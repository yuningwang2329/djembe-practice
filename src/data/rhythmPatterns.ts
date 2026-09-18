import type { Bar, HitEvent, RhythmPattern, Stroke, Hand } from "../domain/song";

function parseSlotsToBar(
  slotsStr: string,
  bpm: number,
  barNumber = 1,
): Bar {
  const clean = slotsStr.replace(/\s+/g, "");
  const beats = 4;
  const beatMs = 60000 / bpm;
  const barMs = beatMs * beats;
  const isSixteenth = clean.length === 16;
  const slotCount = isSixteenth ? 16 : 8;
  const slotMs = barMs / slotCount;

  const hits: HitEvent[] = [];

  for (let i = 0; i < clean.length; i++) {
    const char = clean[i];
    if (char === "0" || char === ".") continue;

    let stroke: Stroke = "bass";
    let hand: Hand = "R";
    let dynamics: "soft" | undefined;

    switch (char) {
      case "B":
        stroke = "bass";
        hand = "R";
        break;
      case "b":
        stroke = "bass";
        hand = "L";
        dynamics = "soft";
        break;
      case "T":
        stroke = "tone";
        hand = "R";
        break;
      case "t":
        stroke = "tone";
        hand = "L";
        dynamics = "soft";
        break;
      case "S":
        stroke = "slap";
        hand = "R";
        break;
      case "s":
        stroke = "slap";
        hand = "L";
        dynamics = "soft";
        break;
      default:
        continue;
    }

    hits.push({
      atMs: Math.round(i * slotMs),
      stroke,
      hand,
      ...(dynamics ? { dynamics } : {}),
    });
  }

  return {
    number: barNumber,
    startMs: 0,
    endMs: Math.round(barMs),
    beats,
    hits,
  };
}

export function createRhythmPattern(
  id: string,
  name: string,
  patternText: string,
  slots: string,
  bpm: number,
  description?: string,
): RhythmPattern {
  return {
    id,
    name,
    patternText,
    description,
    bars: [parseSlotsToBar(slots, bpm, 1)],
  };
}

/** 各曲目的核心常用节奏型精选 */
export const gulouPatterns: RhythmPattern[] = [
  createRhythmPattern(
    "gulou-a",
    "节奏 A（主歌经典）",
    "B ｜ SB ｜ B ｜ S",
    "B0SbB0S0",
    118,
    "全曲基石，四分低音与后半拍掌击互锁",
  ),
  createRhythmPattern(
    "gulou-b",
    "节奏 B（副歌推进）",
    "B ｜ SB ｜ BSS ｜ SSB",
    "B0SbB.S.S.Sb",
    118,
    "副歌扫击，后半段十六分音符密集切分",
  ),
  createRhythmPattern(
    "gulou-c",
    "节奏 C（加花变奏）",
    "Bss ｜ SB ｜ Bss ｜ Sss",
    "B.s.SbB.s.S.s.",
    118,
    "轻重音交替加花，注意小写 s 弱掌击触感",
  ),
  createRhythmPattern(
    "gulou-d",
    "节奏 D（高潮爆发）",
    "BS ｜ Sss ｜ sSBs ｜ SsBB",
    "B.S.S.s.sSBsSsBB",
    118,
    "连续十六分音符高潮加花，极考查左右手协调",
  ),
];

export const qiaobianPatterns: RhythmPattern[] = [
  createRhythmPattern(
    "qiaobian-a",
    "节奏 A（前奏/过渡）",
    "B ｜ SB ｜ B ｜ S",
    "B0SbB0S0",
    77.329,
    "民谣慢摇基础型，前八后八稳健律动",
  ),
  createRhythmPattern(
    "qiaobian-b",
    "节奏 B（主歌摇摆）",
    "B ｜ SB ｜ BB ｜ S",
    "B0SbBbS0",
    77.329,
    "第 3 拍双低音下沉，托衬舒缓人声",
  ),
  createRhythmPattern(
    "qiaobian-c",
    "节奏 C（副歌推进）",
    "B ｜ SB ｜ BB ｜ SS",
    "B0SbBbSS",
    77.329,
    "第 4 拍双掌击提速，推动情绪升华",
  ),
  createRhythmPattern(
    "qiaobian-d",
    "节奏 D（前奏收尾）",
    "B ｜ B ｜ B ｜ 0",
    "B0B0B000",
    77.329,
    "小节渐收，为进唱留白",
  ),
];

export const tongnianPatterns: RhythmPattern[] = [
  createRhythmPattern(
    "tongnian-a",
    "节奏 A（全曲主干）",
    "Bs ｜ SB ｜ Bs ｜ Ss",
    "BsSbBsSs",
    116,
    "马丁谱核心律动，每拍带轻音点缀，欢快跳跃",
  ),
  createRhythmPattern(
    "tongnian-b",
    "节奏 B（副歌推进）",
    "Bs ｜ SB ｜ BB ｜ SB",
    "BsSbBbSb",
    116,
    "第 3 拍双低音增强动感，副歌推进专用",
  ),
  createRhythmPattern(
    "tongnian-c",
    "节奏 C（密集加花）",
    "Bs ｜ SB ｜ BS ｜ SSSS",
    "BsSbBS..SSSS",
    116,
    "第 4 拍十六分音符四连击爆发，注意右手起手",
  ),
  createRhythmPattern(
    "tongnian-d",
    "节奏 D（前奏切分）",
    "0B ｜ 0B ｜ BB ｜ B",
    "0B0BBbB0",
    116,
    "前半拍休止后半拍切入，考验拍点精准度",
  ),
];

export const shuishouPatterns: RhythmPattern[] = [
  createRhythmPattern(
    "shuishou-a",
    "节奏 A（全曲主干）",
    "Bss ｜ SB ｜ Bss ｜ Sss",
    "B.s.SbB.s.S.s.",
    97,
    "前十六后八律动，坚定有力的水手行进节奏",
  ),
  createRhythmPattern(
    "shuishou-b",
    "节奏 B（小节过渡）",
    "Bss ｜ SB ｜ BS ｜ SSB",
    "B.s.SbBS..S.Sb",
    97,
    "乐句句尾过渡型，第 4 拍十六分切分引出下句",
  ),
  createRhythmPattern(
    "shuishou-c",
    "节奏 C（副歌高潮）",
    "Bss ｜ SB ｜ sSB ｜ SSSS",
    "B.s.Sbs.SBSSSS",
    97,
    "副歌最高潮爆发，四连击掌击极具张力",
  ),
];

export const lasaPatterns: RhythmPattern[] = [
  createRhythmPattern(
    "lasa-a",
    "节奏 A（前奏/主歌）",
    "Bsb ｜ SsB ｜ Bsb ｜ Sss",
    "B.sbS.sBB.sbS.ss",
    100,
    "前八后十六细腻手序，欢快热烈的高原律动",
  ),
  createRhythmPattern(
    "lasa-b",
    "节奏 B（主歌过渡）",
    "Bsb ｜ SsB ｜ BBb ｜ SSS",
    "B.sbS.sBB.BbS.SS",
    100,
    "第 3 拍双低音加重，第 4 拍三击掌击有力托举",
  ),
  createRhythmPattern(
    "lasa-c",
    "节奏 C（副歌快推）",
    "Bsss ｜ SssB ｜ BsBs ｜ Ssss",
    "BsssSssBBsBsSsss",
    100,
    "十六分音符全开，极速弹击热烈奔放",
  ),
  createRhythmPattern(
    "lasa-d",
    "节奏 D（副歌加花）",
    "Bsss ｜ SssS ｜ sSBs ｜ SSSS",
    "BsssSssSsSBsSSSS",
    100,
    "副歌句尾加花变奏，掌击爆鸣动感十足",
  ),
];

export const dayuPatterns: RhythmPattern[] = [
  createRhythmPattern(
    "dayu-a",
    "节奏 A（空灵点缀）",
    "B 0 ｜ S 0 ｜ B 0 ｜ S 0",
    "B000S000B000S000",
    70.63,
    "每拍一音，空灵静谧，呼吸感极强",
  ),
  createRhythmPattern(
    "dayu-b",
    "节奏 B（主歌叙事）",
    "B ｜ SB ｜ B ｜ S",
    "B0SbB0S0",
    70.63,
    "慢板深情摇摆，低音下潜稳重柔和",
  ),
  createRhythmPattern(
    "dayu-c",
    "节奏 C（副歌柔美）",
    "Bs ｜ SB ｜ Bs ｜ Ss",
    "BsSbBsSs",
    70.63,
    "副歌轻声托音，小写字母轻抚鼓面",
  ),
  createRhythmPattern(
    "dayu-d",
    "节奏 D（高潮推进）",
    "Bs ｜ SB ｜ BSS ｜ SSB",
    "BsSbB.S.S.Sb",
    70.63,
    "深海波涛式密集切分，烘托空灵高音",
  ),
];
