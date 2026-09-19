"""Occurrence-preserving CTC Viterbi with optional per-occurrence time bounds.
Bounds are broad recording references, not output timestamps. Blank states remain
unbounded so a long instrumental break never needs invented lyric tokens.
"""
import numpy as np

def align(emission, targets, windows=None):
 labels=np.zeros(2*len(targets)+1,dtype=np.int64);labels[1::2]=targets
 frames,states=len(emission),len(labels)
 if not targets:return []
 low=np.zeros(states,dtype=int);high=np.full(states,frames,dtype=int)
 if windows is not None:
  low[1::2]=[w[0] for w in windows];high[1::2]=[w[1] for w in windows]
 skip=np.zeros(states,dtype=bool)
 skip[2:]=(labels[2:]!=0)&(labels[2:]!=labels[:-2])
 previous=np.full(states,-np.inf,dtype=np.float32);previous[0]=0
 back=np.empty((frames,states),dtype=np.uint8)
 for t in range(frames):
  one=np.r_[-np.inf,previous[:-1]];two=np.r_[-np.inf,-np.inf,previous[:-2]]
  two[~skip]=-np.inf
  candidates=np.stack((previous,one,two))
  choice=np.argmax(candidates,axis=0);back[t]=choice
  previous=candidates[choice,np.arange(states)]+emission[t,labels]
  previous[(t<low)|(t>=high)]=-np.inf
 end=states-2+int(previous[-1]>previous[-2])
 if not np.isfinite(previous[end]):raise ValueError('No valid CTC path inside reference windows')
 path=np.empty(frames,dtype=np.int32)
 for t in range(frames-1,-1,-1):
  path[t]=end;end-=int(back[t,end])
 result=[]
 for i,tid in enumerate(targets):
  positions=np.flatnonzero(path==2*i+1)
  if not len(positions):raise ValueError('Missing target occurrence')
  result.append({'start':int(positions[0]),'end':int(positions[-1]+1),'score':float(emission[positions,tid].mean())})
 return result
