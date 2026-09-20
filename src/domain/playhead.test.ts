import {expect,it} from 'vitest';
import {getPlayheadPosition} from './playhead';
import type {Bar} from './song';
import {songLibrary} from '../data/demoSong';
import {getCachedBeatPairs} from './scoreLayout';
const bar:Bar={number:1,startMs:1000,endMs:3000,beats:4,hits:[0,500,750,1000,1250,1375,1500].map(t=>({atMs:1000+t,stroke:'bass',hand:'R'}))};
it('centres every rendered hit in the catalogue, including variable tempo and meter',()=>{
  for(const song of songLibrary) for(const bar of song.bars){
    let slot=0;
    for(const note of getCachedBeatPairs(bar).flat()){
      if(note.hit){
        const position=getPlayheadPosition(song.bars,note.hit.atMs)!;
        expect(position.bar.number,`${song.title} ${note.hit.atMs}`).toBe(bar.number);
        expect(position.percent).toBeCloseTo((slot+note.duration/2)/(bar.beats*4)*100,7);
      }
      slot+=note.duration;
    }
  }
});
it('passes through actual quarter, eighth and sixteenth glyph centres at their sounding times',()=>{
  const bars=[bar];
  expect(bars[0].hits.map(h=>getPlayheadPosition(bars,h.atMs)?.percent)).toEqual([12.5,31.25,43.75,56.25,65.625,71.875,87.5]);
});
it('interpolates monotonically across a bar seam without a fixed anticipation offset',()=>{
  const bars=[bar,{...bar,number:2,startMs:3000,endMs:5000,hits:bar.hits.map(h=>({...h,atMs:h.atMs+2000}))}];
  let previous=-1;
  for(let t=2400;t<=3200;t++){
    const pos=getPlayheadPosition(bars,t)!;
    const x=pos.bar.number-1+pos.percent/100;
    expect(x).toBeGreaterThanOrEqual(previous);
    if(previous>=0)expect(x-previous).toBeLessThan(.01);
    previous=x;
  }
  expect(getPlayheadPosition(bars,3000)).toMatchObject({bar:{number:2},percent:12.5});
});
