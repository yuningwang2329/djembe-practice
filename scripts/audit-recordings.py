"""Local-only recording/grid audit. No audio is uploaded. Outputs are diagnostic, not auto-approved."""
import argparse, hashlib, json, pathlib, subprocess, wave
import numpy as np

ROOT = pathlib.Path(__file__).resolve().parents[2]
SOURCES = {
 'qiao-bian-gu-niang': ('qiaobianguniang', '桥边姑娘-海伦.mp3'),
 'gu-lou-zhao-lei': ('gulou', '鼓楼-赵雷.mp3'),
 'da-yu-zhou-shen': ('dayu', '大鱼-周深.mp3'),
 'tongnian': ('tongnian', '童年-罗大佑.mp3'),
 'shuishou': ('shuishou', '水手-郑智化.mp3'),
 'lasa': ('lasa', '坐上火车去拉萨-徐千雅.mp3'),
 'ping-guo-xiang': ('pingguoxiang', '苹果香+(黑大婶版)-黑大婶回乡带娃.mp3'),
 'huo-hong-de-sa-ri-lang': ('sarilang', '火红的萨日朗+(原版)-乌兰托娅.mp3'),
 'zhan-zai-cao-yuan-wang-bei-jing': ('beijing', '站在草原望北京-乌兰图雅.mp3'),
 'wo-shi-ren-jian-chou-chang-ke': ('chouchangke', '我是人间惆怅客-空想之喵.mp3'),
}

def fluxes(path):
 with wave.open(str(path)) as w:
  sr=w.getframerate(); x=np.frombuffer(w.readframes(w.getnframes()),'<i2')/32768
 frame=1024;hop=110
 frames=np.lib.stride_tricks.sliding_window_view(x,frame)[::hop]
 mag=np.abs(np.fft.rfft(frames*np.hanning(frame),axis=1))
 freq=np.fft.rfftfreq(frame,1/sr); t=(np.arange(len(frames))*hop+frame/2)/sr
 bands=[]
 for lo,hi in [(35,180),(1800,8000)]:
  a=mag[:,(freq>=lo)&(freq<hi)]
  f=np.r_[0,np.maximum(0,np.diff(a,axis=0)).sum(axis=1)]
  f=np.convolve(f,[.1,.2,.4,.2,.1],mode='same')
  bands.append(np.minimum(f/(np.percentile(f,95)+1e-9),3))
 return t,bands,len(x)/sr

def audit(song,t,bands,duration):
 prior=song['bpm']; start=song['bars'][0]['startMs']/1000
 results=[]
 for label,flux in zip(['bass','high'],bands):
  best=(-1,0,0)
  train_end=min(duration*.6,160)
  for bpm in np.arange(prior-2,prior+2.001,.01):
   beat=60/bpm;offsets=np.arange(0,beat,.005)
   ts=offsets[:,None]+np.arange(int(train_end/beat)+1)[None,:]*beat
   use=(ts>=max(start,8))&(ts<train_end)
   scores=(np.interp(ts,t,flux)*use).sum(axis=1)/np.maximum(1,use.sum(axis=1))
   k=np.argmax(scores)
   if scores[k]>best[0]:best=(float(scores[k]),float(bpm),float(offsets[k]))
  score,bpm,phase=best; beat=60/bpm
  origin=phase+round((start-phase)/beat)*beat
  segments=[]
  for lo in np.arange(max(10,start),duration-10,25):
   hi=min(lo+25,duration-3)
   grid=origin+np.arange(int(duration/beat)+1)*beat;grid=grid[(grid>=lo)&(grid<hi)]
   shifts=np.arange(-beat*.49,beat*.49,.003)
   sc=np.interp(grid[None,:]+shifts[:,None],t,flux).mean(axis=1);k=np.argmax(sc)
   segments.append({'from':round(float(lo),2),'to':round(float(hi),2),'shiftMs':round(float(shifts[k]*1000)), 'strength':round(float(sc[k]),3)})
  results.append({'band':label,'bpm':round(bpm,5),'originMs':round(origin*1000),'score':round(score,4),'segments':segments})
 return results

if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--scores',required=True);p.add_argument('--out',required=True);p.add_argument('--ffmpeg',required=True)
 args=p.parse_args();out=pathlib.Path(args.out);out.mkdir(parents=True,exist_ok=True)
 report={}
 for song in json.loads(pathlib.Path(args.scores).read_text()):
  if song['id'] not in SOURCES:continue
  stem,name=SOURCES[song['id']];source=ROOT/'raw'/name;dest=out/(stem+'.wav')
  subprocess.run([args.ffmpeg,'-v','error','-y','-i',str(source),'-ac','1','-ar','22050','-c:a','pcm_s16le',str(dest)],check=True)
  t,bands,duration=fluxes(dest)
  np.savez(out/(stem+'-flux.npz'),t=t,bass=bands[0],high=bands[1])
  r={'sha256':hashlib.sha256(source.read_bytes()).hexdigest(),'durationMs':round(duration*1000),'oldBpm':song['bpm'],'oldStartMs':song['bars'][0]['startMs'],'analysis':audit(song,t,bands,duration)}
  report[song['id']]=r
  (out/'grid-audit.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
  print(song['title'],json.dumps(r,ensure_ascii=False),flush=True)
