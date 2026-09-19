import type { Bar, HitEvent, SongDefinition } from './song';

export interface BeatNote { hit: HitEvent | null; duration: number }
export function getBeatNotes(bar: Bar): BeatNote[][] {
  const slotMs=(bar.endMs-bar.startMs)/bar.beats/4;
  const hits=new Map<number,HitEvent>();
  for(const hit of bar.hits){
    const slot=Math.round((hit.atMs-bar.startMs)/slotMs);
    if(slot>=0 && slot<bar.beats*4) hits.set(slot,hit);
  }
  return Array.from({length:bar.beats},(_,beat)=>{
    const notes:BeatNote[]=[];
    for(let slot=0;slot<4;){
      let end=slot+1;
      while(end<4 && !hits.has(beat*4+end)) end++;
      notes.push({hit:hits.get(beat*4+slot)??null,duration:end-slot});
      slot=end;
    }
    return notes;
  });
}
const beatCache=new WeakMap<Bar,BeatNote[][]>();
export function getCachedBeatPairs(bar:Bar):BeatNote[][] {
  let result=beatCache.get(bar);
  if(!result){result=getBeatNotes(bar);beatCache.set(bar,result);}
  return result;
}

/** Beam coordinates share the beat's four-unit grid; neighbouring sixteenths join. */
export function getNoteBeams(notes:BeatNote[]):{level:number;start:number;end:number}[] {
  if(notes.length<2) return [];
  const beams=[{level:1,start:0,end:4}];
  let slot=0;
  for(const note of notes){
    if(note.duration===1){
      const last=beams.at(-1)!;
      if(last.level===2 && last.end===slot) last.end++;
      else beams.push({level:2,start:slot,end:slot+1});
    }
    slot+=note.duration;
  }
  return beams;
}

export interface NotatedLyricChar { ch:string; cueIndex:number; index:number; leftPercent:number }
/** Use vocal onsets to choose notation cells, never to move a drum or redefine the clock.
 * A single letter centres under its note; multiple letters share that note's space.
 * Interpolation is a labelled layout fallback, not phoneme recognition.
 */
export function layoutRecordingLyrics(bars:Bar[],cues:NonNullable<SongDefinition['lyrics']>):Map<number,NotatedLyricChar[]> {
  const result=new Map<number,NotatedLyricChar[]>();
  const cells=bars.flatMap(bar=>{
    let slot=0;
    return getCachedBeatPairs(bar).flat().map(note=>{
      const start=slot; slot+=note.duration;
      return {bar,startMs:bar.startMs+start/(bar.beats*4)*(bar.endMs-bar.startMs),
        endMs:bar.startMs+slot/(bar.beats*4)*(bar.endMs-bar.startMs),
        left:100*start/(bar.beats*4),width:100*note.duration/(bar.beats*4),
        chars:[] as Omit<NotatedLyricChar,'leftPercent'>[]};
    });
  });
  if(!cells.length) return result;
  let lastCell=0;
  cues.forEach((cue,cueIndex)=>{
    const chars=Array.from(cue.text.replace(/\s/g,''));
    const times=cue.layoutTimesMs;
    const usable=times?.length===chars.length && times.every((t,i)=>Number.isFinite(t)&&t>=cue.startMs&&t<cue.endMs&&(i===0||t>times[i-1]));
    chars.forEach((ch,index)=>{
      const at=usable ? times[index] : cue.startMs+index/chars.length*(cue.endMs-cue.startMs);
      let target=cells.findIndex(cell=>at<cell.endMs);
      if(target<0) target=cells.length-1;
      const next=cells[target+1];
      // Singing often anticipates a beat slightly: keep a small vocal pickup
      // under the following note instead of stranding it under the prior rest.
      if(next && next.startMs-at>=0 && next.startMs-at<=Math.min(120,(next.endMs-next.startMs)*.25)) target++;
      target=Math.max(lastCell,target); lastCell=target;
      cells[target].chars.push({ch,cueIndex,index});
    });
  });
  for(const cell of cells){
    const placed=cell.chars.map((char,i)=>({...char,leftPercent:cell.left+(i+.5)/cell.chars.length*cell.width}));
    result.set(cell.bar.number,[...(result.get(cell.bar.number)??[]),...placed]);
  }
  // Dense singing can put several letters in a sixteenth-note cell. Spread only
  // colliding clusters by the minimum distance; do not re-uniformise the phrase.
  for(const bar of bars){
    const chars=result.get(bar.number)??[];
    if(!chars.length) continue;
    const gap=Math.min(100/chars.length,28/bar.beats);
    const pools:{sum:number;count:number}[]=[];
    chars.forEach((c,i)=>{
      pools.push({sum:c.leftPercent-i*gap,count:1});
      while(pools.length>1){
        const right=pools.at(-1)!,left=pools.at(-2)!;
        if(left.sum/left.count<=right.sum/right.count) break;
        left.sum+=right.sum;left.count+=right.count;pools.pop();
      }
    });
    let i=0;
    for(const pool of pools){
      const centre=Math.max(gap/2,Math.min(100-gap/2-(chars.length-1)*gap,pool.sum/pool.count));
      for(let n=0;n<pool.count;n++,i++) chars[i].leftPercent=centre+i*gap;
    }
  }
  return result;
}
