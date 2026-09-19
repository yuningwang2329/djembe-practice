import { describe, expect, it } from 'vitest';
import { getBeatNotes, getNoteBeams, layoutRecordingLyrics } from './scoreLayout';
import type { Bar } from './song';

const bar: Bar = {number:1,startMs:0,endMs:2000,beats:4,hits:[
  {atMs:0,stroke:'bass',hand:'R'}, {atMs:500,stroke:'slap',hand:'R'},
  {atMs:750,stroke:'bass',hand:'L'}, {atMs:1000,stroke:'bass',hand:'R'},
  {atMs:1500,stroke:'slap',hand:'R'},
]};
describe('notation geometry',()=>{
  it('places a small vocal pickup under the following note rather than the preceding rest',()=>{
    const bars=[bar,{...bar,number:2,startMs:2000,endMs:4000,hits:[{atMs:2000,stroke:'bass' as const,hand:'R' as const}]}];
    const result=layoutRecordingLyrics(bars,[{startMs:1900,endMs:2600,text:'暖',layoutTimesMs:[1900]}]);
    expect(result.get(1)).toEqual([]);
    expect(result.get(2)![0].leftPercent).toBe(12.5);
  });
  it('opens only crowded lyric clusters instead of letting multiple glyphs overlap in a short note',()=>{
    const dense={...bar,hits:[{atMs:0,stroke:'bass' as const,hand:'R' as const},{atMs:125,stroke:'slap' as const,hand:'L' as const}]};
    const chars=layoutRecordingLyrics([dense],[{startMs:0,endMs:1500,text:'甲乙丙丁',layoutTimesMs:[0,40,80,1000]}]).get(1)!;
    for(let i=1;i<chars.length;i++) expect(chars[i].leftPercent-chars[i-1].leftPercent).toBeGreaterThanOrEqual(7);
    expect(chars.at(-1)!.leftPercent).toBe(62.5);
  });
  it('places one lyric per note at exactly the same cell centre, not uniformly across a sentence',()=>{
    const cue={startMs:0,endMs:1900,text:'甲乙丙丁戊',layoutTimesMs:[0,500,750,1000,1500]};
    const chars=layoutRecordingLyrics([bar],[cue]).get(1)!;
    expect(chars.map(c=>c.leftPercent)).toEqual([12.5,31.25,43.75,62.5,87.5]);
  });
  it('keeps dense words ordered and centred as a group under their note',()=>{
    const chars=layoutRecordingLyrics([bar],[{startMs:0,endMs:450,text:'暖阳',layoutTimesMs:[0,200]}]).get(1)!;
    expect(chars.map(c=>c.leftPercent)).toEqual([6.25,18.75]);
  });
  it('retains every character across bars and uses estimates only without a valid timing array',()=>{
    const bars=[bar,{...bar,number:2,startMs:2000,endMs:4000,hits:[]}];
    const result=layoutRecordingLyrics(bars,[{startMs:1500,endMs:2800,text:'甲乙丙',layoutTimesMs:[1500,2050,2500]}]);
    expect([...result.values()].flat().map(c=>c.ch).join('')).toBe('甲乙丙');
    expect(result.get(2)!.map(c=>c.ch).join('')).toBe('乙丙');
  });
  it('draws a single connected secondary beam under adjacent sixteenths, after an eighth',()=>{
    const notes=getBeatNotes({...bar,hits:[{atMs:0,stroke:'bass',hand:'R'},{atMs:250,stroke:'slap',hand:'L'},{atMs:375,stroke:'slap',hand:'R'}]})[0];
    expect(notes.map(n=>n.duration)).toEqual([2,1,1]);
    expect(getNoteBeams(notes)).toEqual([{level:1,start:0,end:4},{level:2,start:2,end:4}]);
  });
});
