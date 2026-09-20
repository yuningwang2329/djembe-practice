import type {Bar} from './song';
import {getCachedBeatPairs} from './scoreLayout';

interface Anchor { time:number; x:number }
const cache=new WeakMap<Bar[],Anchor[]>();
function anchorsFor(bars:Bar[]):Anchor[] {
  const cached=cache.get(bars);if(cached)return cached;
  const anchors:Anchor[]=[];
  bars.forEach((bar,index)=>{
    let slot=0;
    const units=bar.beats*4;
    const slotMs=(bar.endMs-bar.startMs)/units;
    for(const note of getCachedBeatPairs(bar).flat()){
      anchors.push({time:note.hit?.atMs??bar.startMs+slot*slotMs,x:index+(slot+note.duration/2)/units});
      slot+=note.duration;
    }
  });
  if(anchors.length){
    const first=anchors[0],bar=bars[0];
    anchors.unshift({time:first.time-first.x*(bar.endMs-bar.startMs),x:0});
    anchors.push({time:bars.at(-1)!.endMs,x:bars.length});
  }
  cache.set(bars,anchors);return anchors;
}

/** A visual projection, not an audio offset: connect actual note onsets to their
 * rendered cell centres. Interpolation also crosses bar boundaries continuously. */
export function getPlayheadPosition(bars:Bar[],time:number):{bar:Bar;percent:number}|null {
  const anchors=anchorsFor(bars);
  if(!anchors.length||time<anchors[0].time||time>=anchors.at(-1)!.time)return null;
  let low=0,high=anchors.length-1;
  while(high-low>1){const mid=(low+high)>>1;if(anchors[mid].time<=time)low=mid;else high=mid;}
  const a=anchors[low],b=anchors[high];
  const x=a.x+(b.x-a.x)*(time-a.time)/(b.time-a.time);
  const index=Math.min(bars.length-1,Math.floor(x));
  return {bar:bars[index],percent:(x-index)*100};
}
