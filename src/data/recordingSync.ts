import type { Bar, SongDefinition } from '../domain/song';

export interface RecordingGrid {
  sha256: string;
  durationMs: number;
  bpm: number;
  /** Absolute recording times of successive musical beats, including the final boundary. */
  beatTimesMs: number[];
}

export function timeAtBeat(grid: RecordingGrid, beat: number): number {
  const index = Math.floor(beat);
  const times = grid.beatTimesMs;
  const last = times.length - 1;
  if (index >= last) return Math.round(times[last] + (beat - last) * (times[last] - times[last - 1]));
  return Math.round(times[index] + (beat - index) * (times[index + 1] - times[index]));
}

/** Replace timing, never add another offset to already timed events. */
export function alignScoreToRecording(song: SongDefinition, grid: RecordingGrid): SongDefinition {
  let beat = 0;
  const bars: Bar[] = [];
  for (const bar of song.bars) {
    const startBeat = beat;
    beat += bar.beats;
    const startMs = timeAtBeat(grid, startBeat);
    if (startMs >= grid.durationMs) break;
    const endMs = timeAtBeat(grid, beat);
    bars.push({ ...bar, startMs, endMs, hits: bar.hits.map(hit => ({
      ...hit,
      atMs: timeAtBeat(grid, startBeat + (hit.atMs - bar.startMs) / (bar.endMs - bar.startMs) * bar.beats),
    })).filter(hit => hit.atMs < grid.durationMs) });
  }
  return { ...song, bars, bpm: grid.bpm, audioOffsetMs: 0, expectedDurationMs: grid.durationMs, recordingSha256:grid.sha256 };
}

export interface RecordingLyrics {
  sha256: string;
  cues: NonNullable<SongDefinition['lyrics']>;
}

export function attachRecordingLyrics(song: SongDefinition, data: RecordingLyrics, grid?: RecordingGrid): SongDefinition {
  if (song.recordingSha256 !== data.sha256) throw new Error('Lyrics belong to a different recording');
  const bars=[...song.bars];
  const lyricEnd=data.cues.at(-1)?.endMs ?? 0;
  let beats=bars.reduce((sum,bar)=>sum+bar.beats,0);
  // Some printed scores stop while the recording still sings. Show the tail,
  // but never invent extra drum strokes to fill missing score material.
  while (grid && bars.length && bars.at(-1)!.endMs < lyricEnd) {
    const startMs=bars.at(-1)!.endMs;
    beats+=4;
    const endMs=timeAtBeat(grid,beats);
    bars.push({number:bars.length+1,startMs,endMs,beats:4,hits:[],section:'谱外尾声 · 休止'});
  }
  return {...song,bars,lyrics:data.cues,lyricTiming:'recording'};
}
