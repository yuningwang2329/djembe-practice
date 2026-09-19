import numpy as np,json,argparse
from pathlib import Path
p=argparse.ArgumentParser(description='Recording-specific beat maps; candidate output requires review.')
p.add_argument('--work',required=True)
out=Path(p.parse_args().work)
configs={'qiaobianguniang':(77.329,3.111),'gulou':(118,10.610),'dayu':(70,25.94),'tongnian':(116.3,.335),'shuishou':(99.47,.275),'lasa':(100,.365),'pingguoxiang':(68,1.765),'sarilang':(106,21.565),'beijing':(100,.33),'chouchangke':(65,1.465)}
res={}
for stem,(bpm,start) in configs.items():
 z=np.load(out/(stem+'-flux.npz'));t=z['t'];f=z['high'];train=z['bass'];beat=60/bpm
 n=int((t[-1]-start)/beat)+2
 if stem!='chouchangke':
  # Smooth bounded corrections from independent local peaks; stable recordings need no per-beat jitter.
  anchors=[]
  for k in range(0,n,16):
   shifts=[]
   for j in range(max(0,k-8),min(n,k+8)):
    if j%2:continue
    p=start+j*beat;idx=np.flatnonzero(abs(t-p)<.07)
    if not len(idx):continue
    i=idx[np.argmax(train[idx])]
    if train[i]>.6 and abs(t[i]-p)<.06:shifts.append(t[i]-p)
   shift=float(np.median(shifts)) if len(shifts)>=3 else None
   if shift is not None:anchors.append((k,shift))
  if not anchors:raise ValueError(stem)
  # Large 16-beat gaps stay interpolated, not alleged measurements.
  times=[round((start+i*beat+float(np.interp(i,[a[0] for a in anchors],[a[1] for a in anchors])))*1000) for i in range(n)]
 else:
  # Viterbi tracking of tempo-varying quarters; phase may not jump by an eighth to chase louder offbeats.
  offsets=np.arange(-1.2,1.201,.005);size=len(offsets);j0=np.argmin(abs(offsets))
  previous=np.full(size,-1e9);previous[abs(offsets)<.04]=0
  paths=[]
  for k in range(n):
   positions=start+k*beat+offsets
   strength=np.interp(positions,t,train,left=0,right=0)
   options=[];indices=[]
   for d in range(-16,17):
    ix=np.arange(size)-d;valid=(ix>=0)&(ix<size)
    v=np.full(size,-1e9);v[valid]=previous[ix[valid]]-.22*(d*.005/.025)**2
    options.append(v);indices.append(np.clip(ix,0,size-1))
   options=np.array(options);best=np.argmax(options,axis=0)
   previous=options[best,np.arange(size)]+np.minimum(strength,2.5)
   paths.append(np.array(indices)[best,np.arange(size)])
  idx=int(np.argmax(previous));track=[]
  for k in range(n-1,-1,-1):track.append(start+k*beat+offsets[idx]);idx=int(paths[k][idx])
  track=track[::-1]
  times=[round(x*1000) for x in track];anchors=[]
  print('varying',[(i,round(track[i],3),round(60/(track[i+1]-track[i]),2)) for i in range(0,n-1,16)])
 # Hold-out every other beat: residual vs independently picked transient in local window.
 rows=[]
 for lo in range(0,int(t[-1]),30):
  errors=[]
  for p in np.array(times)[1::2]/1000:
   if not lo<=p<lo+30:continue
   ids=np.flatnonzero(abs(t-p)<.12)
   if not len(ids):continue
   i=ids[np.argmax(f[ids])]
   if f[i]>.6:errors.append((t[i]-p)*1000)
  rows.append({'from':lo,'n':len(errors),'medianMs':round(float(np.median(errors)),1) if errors else None,'p90Ms':round(float(np.quantile(abs(np.array(errors)),.9)),1) if errors else None})
 res[stem]={'bpm':bpm,'beatTimesMs':times,'segments':rows,'anchors':anchors}
 print(stem,rows,flush=True)
(out/'beat-tracks.json').write_text(json.dumps(res,indent=1))
