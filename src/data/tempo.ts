import type { Bar, SongDefinition } from "../domain/song";
import { tempoCorrections } from "./tempoCorrections";

/**
 * 速度校正：按实测 BPM 重新给整首谱面计时。
 *
 * 由来：谱面标称 BPM 若与录音实际速度不符，误差会随歌曲累积。例如《水手》标称
 * 98.5、实测 99.546，316 秒里累积漂移 3.3 秒——开头还对得上，越往后越偏。
 * 这正是"整体早晚一截 + 累积漂移"的成因。
 *
 * 做法：每小节按"拍数 × 实测每拍时长"重算长度，小节内鼓点按比例缩放，
 * 再顺次重新计时。小节编号、拍数、词块摆放都不变，只改时间轴。
 */
export function applyTempoCorrection(song: SongDefinition): SongDefinition {
  const bpm = tempoCorrections[song.id];
  if (!bpm || song.bars.length === 0) return song;

  const beatMs = 60_000 / bpm;
  let cursor = song.bars[0].startMs;

  const bars: Bar[] = song.bars.map((bar) => {
    const duration = Math.round(bar.beats * beatMs);
    const scale = duration / (bar.endMs - bar.startMs);
    const startMs = cursor;
    const endMs = startMs + duration;
    cursor = endMs;
    return {
      ...bar,
      startMs,
      endMs,
      hits: bar.hits.map((hit) => ({
        ...hit,
        atMs: Math.round(startMs + (hit.atMs - bar.startMs) * scale),
      })),
    };
  });

  return { ...song, bars, bpm };
}
