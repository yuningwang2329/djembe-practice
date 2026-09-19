import { expect, it } from 'vitest';
import { alignScoreToRecording, timeAtBeat, attachRecordingLyrics } from './recordingSync';
import { makeSong } from '../test/fixtures';
import { songLibrary } from './demoSong';
import { validateSong } from '../domain/song';

it('every recording has complete, ordered notation anchors without losing repeated characters',()=>{
  for(const song of songLibrary.filter(s=>s.lyricTiming==='recording')){
    expect(validateSong(song),song.title).toEqual([]);
    expect(song.lyrics!.every(c=>c.layoutTimesMs?.length===Array.from(c.text.replace(/\s/g,'')).length)).toBe(true);
  }
});

it('uses individual measured beat intervals, not a whole-bar linear stretch', () => {
  const grid={sha256:'fixture', durationMs:5000, bpm:120, beatTimesMs:[100,600,1200,1700,2200,2700,3200,3700,4200]};
  expect(timeAtBeat(grid,1.5)).toBe(900);
  const song=makeSong();
  song.bars=[{number:1,startMs:0,endMs:2000,beats:4,hits:[{atMs:750,stroke:'bass',hand:'R'}]}];
  const result=alignScoreToRecording(song,grid);
  expect(result.bars[0].hits[0].atMs).toBe(900);
  expect(result.audioOffsetMs).toBe(0);
});

it('does not accumulate rounding drift or schedule drum hits past recording end', () => {
  const grid={sha256:'fixture',durationMs:2000,bpm:120,beatTimesMs:[50,550,1050,1550,2050,2550]};
  const result=alignScoreToRecording(makeSong(),grid);
  expect(result.bars.every(b=>b.startMs<2000)).toBe(true);
  expect(result.bars.flatMap(b=>b.hits).every(h=>h.atMs<2000)).toBe(true);
});

it('uses the recording grid in the real catalogue, including the corrected Beijing tempo', () => {
  const beijing = songLibrary.find(s=>s.id==='zhan-zai-cao-yuan-wang-bei-jing')!;
  expect(beijing.bpm).toBe(100);
  // First bar is 2/4: 158 quarter notes, not 160, precede bar 41.
  expect(beijing.bars[40].startMs).toBeGreaterThan(95000);
  expect(beijing.bars[40].startMs).toBeLessThan(95300);
  const lasa = songLibrary.find(s=>s.id==='lasa')!;
  expect(lasa.audioOffsetMs).toBe(0);
  expect(lasa.bars[3].startMs).toBeGreaterThan(7500);
});

it('loads independent recording lyrics for every real song, including the missing late refrain', () => {
  for (const song of songLibrary.filter(s=>!s.builtInAudioUrl)) {
    expect(song.lyricTiming,song.title).toBe('recording');
    expect(song.lyrics!.every((c,i,a)=>c.startMs<c.endMs && (!i || a[i-1].endMs<=c.startMs))).toBe(true);
    expect(song.lyrics!.at(-1)!.endMs).toBeLessThanOrEqual(song.bars.at(-1)!.endMs);
  }
  const shui=songLibrary.find(s=>s.id==='shuishou')!;
  expect(shui.lyrics).toHaveLength(74);
  expect(shui.lyrics!.at(-1)!.startMs).toBeGreaterThan(301000);
  const beijing=songLibrary.find(s=>s.id==='zhan-zai-cao-yuan-wang-bei-jing')!;
  expect(beijing.lyrics![16].startMs).toBeGreaterThan(115900);
  expect(beijing.lyrics![16].startMs).toBeLessThan(116300);
});

it('rejects lyric data for a different recording instead of mixing version timelines', () => {
  expect(()=>attachRecordingLyrics({...makeSong(),recordingSha256:'a'}, {sha256:'b',cues:[]})).toThrow(/different recording/);
});
