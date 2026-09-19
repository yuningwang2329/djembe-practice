"""Re-decode cached whole-track emissions with broad, reviewed LRC bounds.
No model inference, network, or audio modification. All outputs retain provenance.
"""
import argparse, importlib.util, json, pathlib, re
import numpy as np
from ctc_windowed import align
p=argparse.ArgumentParser();p.add_argument('--work',required=True);p.add_argument('--only');a=p.parse_args()
work=pathlib.Path(a.work)
# Demonstrated LRC typo: same verse repeated 96 s later; whole-recording CTC 116.113 s.
reference_overrides={'beijing':{16:116000}}
for source in sorted(work.glob('*-whole-lyrics.json')):
 stem=source.name.replace('-whole-lyrics.json','')
 if a.only and stem not in a.only.split(','):continue
 rec=json.loads(source.read_text());lines=[l for l in rec['lines'] if ' - ' not in l['text']]
 explicit_refs=None
 if stem=='shuishou':
  # The supplied LRC drifts against this recording and omits two final chorus cycles.
  # Nine cycles are supported by the repeated 16-quarter phrases at 217.4..294.6 s.
  # Keep the first 47 globally ordered lines; expand only the recorded repeated refrain.
  base=lines[:47];refs=[l['startMs'] for l in base]
  for cycle in range(9):
   start=217413+cycle*(16*60000/99.47)
   template=lines[47:50] if cycle%2==0 else lines[50:53]
   for offset,line in zip([0,4800,7240],template):
    base.append({**line,'referenceMethod':'recorded-refrain-repeat'})
    refs.append(round(start+offset))
  lines=base;explicit_refs=refs
 if stem=='gulou':
  # Six supplied repetitions, not six uniformly spaced repetitions: the third is held.
  # Strong "在" emissions: 204833,208913,212953,221113,225193,229253 ms.
  # Split pairs into phrases so the sustained third "楼" cannot steal another line.
  originals=lines;lines=lines[:21];refs=[l['lrcStartMs'] for l in lines]
  for j,start in enumerate([204353,208433,212533,220633,224713,228773]):
   lines.append({**originals[21+j//2],'text':'我在鼓楼','referenceMethod':'repeated-word-acoustic-anchor'})
   refs.append(start)
  explicit_refs=refs
 z=np.load(work/(stem+'-whole-emissions.npz'));emission=z['emission'].astype(np.float32)
 # Original vocabulary IDs are not needed: original whole path occurrences retain text.
 # Fetch tokenizer locally (no model) to match vocabulary columns reliably.
 from transformers import Wav2Vec2Processor
 proc=Wav2Vec2Processor.from_pretrained('jonatasgrosman/wav2vec2-large-xlsr-53-chinese-zh-cn',local_files_only=True)
 labels=z['labels'].tolist();targets=[];windows=[];occurrences=[]
 refs=explicit_refs or [reference_overrides.get(stem,{}).get(i,l['lrcStartMs']) for i,l in enumerate(lines)]
 for i,line in enumerate(lines):
  text=re.findall(r'[一-鿿]',line['text']);start=refs[i]
  next_start=refs[i+1] if i+1<len(refs) else len(emission)*20
  lo=max(0,int((start-1000)/20));hi=min(len(emission),int(min(next_start+1000,start+max(5000,len(text)*900)+2000)/20))
  for j,ch in enumerate(text):
   tid=proc.tokenizer.convert_tokens_to_ids(ch)
   if tid==proc.tokenizer.unk_token_id:continue
   targets.append(labels.index(tid));windows.append((lo,hi));occurrences.append((i,j,ch))
 spans=align(emission,targets,windows)
 result=[{'text':l['text'],'lrcStartMs':l['lrcStartMs'],'referenceMs':refs[i],'referenceMethod':l.get('referenceMethod','lrc-with-reviewed-corrections'),'chars':[],
          'method':'ctc-ordered-bounded','fallback':False} for i,l in enumerate(lines)]
 for s,(i,j,ch) in zip(spans,occurrences):
  result[i]['chars'].append({'text':ch,'charIndex':j,'startMs':s['start']*20+13,'endMs':s['end']*20+13,'score':round(s['score'],4)})
 for line in result:
  line['startMs']=line['chars'][0]['startMs'];line['endMs']=line['chars'][-1]['endMs']+120
 (work/(stem+'-bounded-lyrics.json')).write_text(json.dumps({**rec,'lines':result},ensure_ascii=False,indent=1)+'\n')
 print(stem,len(lines),'bounded candidates',flush=True)
