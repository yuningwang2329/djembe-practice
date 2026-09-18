export type Stroke = "bass" | "tone" | "slap";
export type Hand = "R" | "L";

export interface HitEvent {
  atMs: number;
  stroke: Stroke;
  hand: Hand;
  /** 小写鼓音表示轻击；与 R/L 手序无关。省略为正常力度。 */
  dynamics?: "soft";
}

export interface Bar {
  number: number;
  startMs: number;
  endMs: number;
  beats: number;
  hits: HitEvent[];
  /** 段落标签（前奏/进唱/副歌/间奏/尾奏），标在该小节左上角 */
  section?: string;
  /** 该行谱面对应的歌词，渲染在这一行谱面下方 */
  lyric?: string;
  /** 歌词跨越的小节数（从本小节起，默认 1），用于词组对位 */
  lyricSpan?: number;
  /** 拍号变化标记（如 [2, 4]），标在该小节起始处 */
  timeSignature?: [number, number];
}

export interface SongDefinition {
  id: string;
  title: string;
  artist?: string;
  bpm: number;
  timeSignature: [number, number];
  audioOffsetMs: number;
  expectedDurationMs: number;
  builtInAudioUrl?: string;
  bars: Bar[];
  /** 独立于鼓谱小节的逐句歌词时间，使用与鼓点相同的时间轴。 */
  lyrics?: Array<{ startMs: number; endMs: number; text: string }>;
  /** 同一首歌的可选谱面版本（如扒谱版、教材版），练习时可切换 */
  variants?: ScoreVariant[];
  /** 歌曲的核心常用节奏型，供专项节奏型循环练习 */
  rhythmPatterns?: RhythmPattern[];
}

export interface ScoreVariant {
  id: string;
  name: string;
  bars: Bar[];
}

export interface RhythmPattern {
  id: string;
  name: string;
  patternText: string;
  description?: string;
  bars: Bar[];
}

const strokes = new Set<unknown>(["bass", "tone", "slap"]);
const hands = new Set<unknown>(["R", "L"]);

export function validateSong(song: SongDefinition): string[] {
  const errors: string[] = [];

  if (!song.id.trim()) errors.push("曲目 id 不能为空");
  if (!song.title.trim()) errors.push("曲目名称不能为空");
  if (!Number.isFinite(song.bpm) || song.bpm <= 0) errors.push("BPM 必须大于 0");
  if (!Number.isFinite(song.expectedDurationMs) || song.expectedDurationMs <= 0) {
    errors.push("曲目时长必须大于 0");
  }
  if (song.bars.length === 0) errors.push("曲目至少需要一个小节");

  song.bars.forEach((bar, barIndex) => {
    const label = `第 ${bar.number} 小节`;
    if (bar.number !== barIndex + 1) errors.push(`${label}编号不连续`);
    if (bar.startMs < 0 || bar.endMs <= bar.startMs) errors.push(`${label}时间范围无效`);
    if (barIndex > 0 && bar.startMs < song.bars[barIndex - 1].endMs) {
      errors.push(`${label}与前一小节重叠`);
    }
    if (!Number.isInteger(bar.beats) || bar.beats <= 0) errors.push(`${label}拍数无效`);

    let previousHitTime = Number.NEGATIVE_INFINITY;
    bar.hits.forEach((hit, hitIndex) => {
      const hitLabel = `${label}第 ${hitIndex + 1} 个鼓点`;
      if (!hands.has(hit.hand)) errors.push(`${hitLabel}左右手无效`);
      if (!strokes.has(hit.stroke)) errors.push(`${hitLabel}音色无效`);
      if (hit.dynamics !== undefined && hit.dynamics !== "soft") errors.push(`${hitLabel}力度无效`);
      if (hit.atMs < bar.startMs || hit.atMs >= bar.endMs) {
        errors.push(`${hitLabel}不在小节范围内`);
      }
      if (hit.atMs < previousHitTime) errors.push(`${hitLabel}时间顺序无效`);
      previousHitTime = hit.atMs;
    });
  });

  return errors;
}

export const strokeLabels: Record<Stroke, { letter: string; name: string }> = {
  bass: { letter: "B", name: "低音" },
  tone: { letter: "T", name: "开音" },
  slap: { letter: "S", name: "掌击" },
};
