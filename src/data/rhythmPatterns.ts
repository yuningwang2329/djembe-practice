import type { Bar, HitEvent, RhythmPattern, Stroke, Hand } from "../domain/song";

function parseSlotsToBar(
  slotsStr: string,
  bpm: number,
  barNumber = 1,
  beats = 4,
  timeSignature?: [number, number],
): Bar {
  const clean = slotsStr.replace(/\s+/g, "");
  const beatMs = 60000 / bpm;
  const barMs = beatMs * beats;
  const slotCount = clean.length;
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
      case "M":
        stroke = "tone";
        hand = "R";
        break;
      case "t":
      case "m":
        stroke = "tone";
        hand = "L";
        dynamics = "soft";
        break;
      case "X":
        stroke = "tone";
        hand = "R";
        dynamics = "soft";
        break;
      case "x":
        stroke = "slap";
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
    ...(timeSignature ? { timeSignature } : {}),
  };
}

export function createRhythmPattern(
  id: string,
  name: string,
  patternText: string,
  slots: string,
  bpm: number,
  description?: string,
  beats = 4,
  timeSignature?: [number, number],
): RhythmPattern {
  return {
    id,
    name,
    patternText,
    description,
    bars: [parseSlotsToBar(slots, bpm, 1, beats, timeSignature)],
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
    "节奏 A（前奏/主歌）",
    "B ｜ SB ｜ B ｜ S",
    "B0SbB0S0",
    77.329,
    "民谣慢摇基础型，前八后八稳健律动",
  ),
  createRhythmPattern(
    "qiaobian-b",
    "节奏 B（主歌/副歌）",
    "B ｜ SB ｜ BB ｜ S",
    "B0SbBbS0",
    77.329,
    "第 3 拍双低音下沉，托衬舒缓人声",
  ),
  createRhythmPattern(
    "qiaobian-c",
    "节奏 C（前奏 2/4 拍过渡）",
    "2/4 拍  B ｜ 0",
    "B000",
    77.329,
    "前奏第 5 小节两拍留白变节拍，蓄势起唱",
    2,
    [2, 4],
  ),
  createRhythmPattern(
    "qiaobian-d",
    "节奏 D（副歌双掌击）",
    "B ｜ SB ｜ BB ｜ SS",
    "B0SbBbSs",
    77.329,
    "第 4 拍双掌击提速，推动情绪升华",
  ),
  createRhythmPattern(
    "qiaobian-e",
    "节奏 E（主歌收尾过渡）",
    "B ｜ B ｜ B ｜ 0",
    "B0B0B000",
    77.329,
    "三连四分音符留白，准备切入副歌",
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

export const pingguoPatterns: RhythmPattern[] = [
  createRhythmPattern(
    "pingguo-a",
    "节奏 A（主歌叙事）",
    "Bs ｜ Xs ｜ BB ｜ Xss",
    "Bs.Xs.BbXss.",
    67.84,
    "主歌温婉律动，轻柔托底",
  ),
  createRhythmPattern(
    "pingguo-b",
    "节奏 B（主歌加花推进）",
    "Bs ｜ Xs ｜ BB ｜ SBB",
    "Bs.Xs.BbSB.B",
    67.84,
    "主歌乐句收尾推进型，第 4 拍掌击引出低音",
  ),
  createRhythmPattern(
    "pingguo-c",
    "节奏 C（副歌深情）",
    "Bs ｜ SsB ｜ BB ｜ Sss",
    "Bs.S.sBB.bSss.",
    67.84,
    "副歌律动，柔和轻击富有歌唱感",
  ),
  createRhythmPattern(
    "pingguo-d",
    "节奏 D（前奏/过渡变拍）",
    "2/4 拍  B ｜ 0",
    "B000",
    67.84,
    "两拍留白过度，为起唱与进副歌留足呼吸",
    2,
    [2, 4],
  ),
];

export const sarilangPatterns: RhythmPattern[] = [
  createRhythmPattern(
    "sarilang-a",
    "节奏 A（全曲基石）",
    "B ｜ SB ｜ B ｜ S",
    "B0SbB0S0",
    105.263,
    "草原欢快律动，手序清晰有力",
  ),
  createRhythmPattern(
    "sarilang-b",
    "节奏 B（乐句过渡加花）",
    "B ｜ SB ｜ 0B ｜ S SS",
    "B0Sb0bS0Ss",
    105.263,
    "第 3 拍后半拍切入低音，第 4 拍双掌击加花",
  ),
  createRhythmPattern(
    "sarilang-c",
    "节奏 C（推进加重）",
    "BB ｜ SB ｜ 0 ｜ SS SB",
    "BbSb00SsSb",
    105.263,
    "第 1 拍双低音下潜，第 4 拍切分连击",
  ),
  createRhythmPattern(
    "sarilang-d",
    "节奏 D（副歌收束变奏）",
    "B ｜ SB ｜ SB ｜ S SS",
    "B0SbSbS0Ss",
    105.263,
    "副歌乐句结尾变奏，双重掌击与后半拍弹响",
  ),
];

export const beijingPatterns: RhythmPattern[] = [
  createRhythmPattern(
    "beijing-a",
    "节奏 A（主歌经典律动）",
    "Bs ｜ SB ｜ Bs ｜ Ss",
    "BsSbBsSs",
    102.8,
    "欢快跳跃的草原马蹄律动",
  ),
  createRhythmPattern(
    "beijing-b",
    "节奏 B（乐句推进变奏）",
    "Bs ｜ SB ｜ BS ｜ SB",
    "BsSbBSSb",
    102.8,
    "后半段双重重音交替，推动旋律上行",
  ),
  createRhythmPattern(
    "beijing-c",
    "节奏 C（主歌切分加花）",
    "Bs ｜ SB ｜ BS ｜ SBS",
    "BsSbBS.SBS.",
    102.8,
    "第 4 拍十六分密集切分，动感极强",
  ),
  createRhythmPattern(
    "beijing-d",
    "节奏 D（前奏引子 2/4 拍）",
    "2/4 拍  S ｜ S",
    "S0S0",
    102.8,
    "前奏两声清脆掌击起拍",
    2,
    [2, 4],
  ),
];

export const chouchangkePatterns: RhythmPattern[] = [
  createRhythmPattern(
    "chouchangke-a",
    "节奏 A（主歌中音叙事）",
    "BbM ｜ XB ｜ bM ｜ X",
    "BbM.XB.bM.X0",
    65.0,
    "中音开音与轻音交融，如诉如泣",
  ),
  createRhythmPattern(
    "chouchangke-b",
    "节奏 B（副歌深情律动）",
    "BbB ｜ sSB ｜ bBbB ｜ Sbb",
    "BbBsSbbBbBSbb.",
    65.0,
    "原谱红笔标注的高难度多层次弹击",
  ),
  createRhythmPattern(
    "chouchangke-c",
    "节奏 C（副歌高潮滚奏）",
    "BbB ｜ shB ｜ bBbB ｜ Sssss",
    "BbBshbbBbBSSSSS",
    65.0,
    "第 4 拍掌击细密滚奏，情感爆发",
  ),
  createRhythmPattern(
    "chouchangke-d",
    "节奏 D（间奏强力加花）",
    "BBtB ｜ SSB ｜ tB ｜ S",
    "BBtBSS.BtB.S0",
    65.0,
    "开音与掌击互锁，间奏推进型",
  ),
];

