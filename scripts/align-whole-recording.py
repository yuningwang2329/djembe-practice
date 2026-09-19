"""Offline ordered whole-recording CTC: LRC supplies text, never the search window.

20-second contextual chunks bound RAM. Keep only blank and transcript vocabulary
after log_softmax: forced alignment needs no other labels. The model is local-only.
Results are candidates, not listening-verified measurements.
"""
import argparse, hashlib, importlib.util, json, pathlib, re
import numpy as np
import torch
torch.set_num_threads(2)
torch.set_num_interop_threads(1)
import torchaudio
import soundfile as sf
from transformers import Wav2Vec2ForCTC, Wav2Vec2Processor

ROOT=pathlib.Path(__file__).resolve().parents[2]
spec=importlib.util.spec_from_file_location('audit',pathlib.Path(__file__).with_name('audit-recordings.py'))
audit=importlib.util.module_from_spec(spec);spec.loader.exec_module(audit)

def read_lines(path):
 result=[]
 for raw in path.read_text(encoding='utf-8-sig').splitlines():
  m=re.match(r'\[(\d+):(\d+(?:\.\d+)?)\](.*)',raw)
  if not m:continue
  text=m[3].strip();start=round((int(m[1])*60+float(m[2]))*1000)
  if not text or ':' in text or '：' in text or '纯音乐' in text or ' - ' in text:continue
  # Current supplied files have their title at time zero. Never discard an actual early vocal merely for being <8s.
  if start==0:continue
  text=text.replace('107','一零七')
  chars=re.findall(r'[一-鿿]',text)
  if chars:result.append({'text':text,'lrcStartMs':start,'letters':chars})
 return result

def main():
 p=argparse.ArgumentParser();p.add_argument('--work',required=True);p.add_argument('--only');p.add_argument('--device',choices=['cpu','mps'],default='cpu');a=p.parse_args()
 work=pathlib.Path(a.work);work.mkdir(parents=True,exist_ok=True)
 proc=Wav2Vec2Processor.from_pretrained('jonatasgrosman/wav2vec2-large-xlsr-53-chinese-zh-cn',local_files_only=True)
 model=None
 sources=list(audit.SOURCES.items())
 sources.sort(key=lambda row: row[1][0]!='beijing')
 for sid,(stem,filename) in sources:
  if a.only and stem not in a.only.split(','):continue
  lrc=next(p for p in (ROOT/'raw').glob('*.lrc') if filename.split('-')[0].replace('+',' ') in p.name)
  lines=read_lines(lrc)
  original_ids=[];occurrences=[]
  for i,line in enumerate(lines):
   for j,ch in enumerate(line['letters']):
    tid=proc.tokenizer.convert_tokens_to_ids(ch)
    if tid!=proc.tokenizer.unk_token_id:
     original_ids.append(tid);occurrences.append((i,j,ch))
  labels=[proc.tokenizer.pad_token_id]+sorted(set(original_ids))
  remap={tid:i for i,tid in enumerate(labels)}
  targets=[remap[tid] for tid in original_ids]
  source=ROOT/'tools/sync-fix/stems/htdemucs'/stem/'vocals.wav'
  fingerprint=hashlib.sha256(source.read_bytes()).hexdigest()
  cache=work/(stem+'-whole-emissions.npz')
  if cache.exists():
   z=np.load(cache)
   cached_labels=z['labels'].tolist()
   if str(z['sha256'])!=fingerprint or not set(labels)<=set(cached_labels):raise ValueError('stale emissions '+stem)
   emission=z['emission'][:,[cached_labels.index(label) for label in labels]].astype(np.float32)
  else:
   if model is None:
    model=Wav2Vec2ForCTC.from_pretrained('jonatasgrosman/wav2vec2-large-xlsr-53-chinese-zh-cn',local_files_only=True).eval()
    if a.device=='mps':model=model.to('mps')
    else:
     torch.backends.quantized.engine='qnnpack'
     model=torch.ao.quantization.quantize_dynamic(model,{torch.nn.Linear},dtype=torch.qint8)
   x,sr=sf.read(source,always_2d=True);x=x.mean(axis=1).astype(np.float32)
   if sr!=16000:x=torchaudio.functional.resample(torch.from_numpy(x),sr,16000).numpy()
   frames=(len(x)-400)//320+1
   emission=np.empty((frames,len(labels)),dtype=np.float32)
   chunk=400 if a.device=='mps' else 1000
   for begin in range(0,frames,chunk):
    end=min(frames,begin+chunk);left=max(0,begin-50);right=min(frames,end+50)
    inputs=proc(x[left*320:(right-1)*320+400],sampling_rate=16000,return_tensors='pt')
    with torch.inference_mode():
     lp=model(**inputs.to(a.device)).logits[0].log_softmax(-1)
     emission[begin:end]=lp[begin-left:end-left,labels].cpu().numpy()
    print(stem,'emissions',round(end*.02,1),'seconds',flush=True)
   np.savez_compressed(cache,emission=emission.astype(np.float16),labels=labels,sha256=fingerprint)
  path,scores=torchaudio.functional.forced_align(torch.from_numpy(emission)[None],torch.tensor([targets],dtype=torch.int32),blank=0)
  spans=torchaudio.functional.merge_tokens(path[0],scores[0],blank=0)
  assert len(spans)==len(occurrences)
  result=[{k:v for k,v in line.items() if k!='letters'}|{'chars':[],'method':'ctc-whole-ordered','fallback':False} for line in lines]
  for span,target,(i,j,ch) in zip(spans,targets,occurrences):
   assert int(span.token)==target
   result[i]['chars'].append({'text':ch,'charIndex':j,'startMs':int(span.start)*20+13,'endMs':int(span.end)*20+13,'score':round(float(span.score),4)})
  for line in result:
   line['startMs']=line['chars'][0]['startMs'];line['endMs']=line['chars'][-1]['endMs']+120
  dest=work/(stem+'-whole-lyrics.json')
  dest.write_text(json.dumps({'id':sid,'source':lrc.name,'vocalSha256':fingerprint,'lines':result},ensure_ascii=False,indent=1)+'\n')
  print(stem,'DONE',len(lines),flush=True)
if __name__=='__main__':main()
