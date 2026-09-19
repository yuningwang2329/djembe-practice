"""Local CTC line alignment with ordered repeated tokens and explicit fallback provenance.
Never exports unvalidated per-character interpolation as measured timing.
Requires local Chinese wav2vec2 model, numpy, torch, torchaudio, transformers, soundfile, scipy.
"""
import argparse, json, pathlib, re, sys
import numpy as np
import torch
torch.set_num_threads(2)
torch.set_num_interop_threads(1)
import torchaudio
import soundfile as sf
from transformers import Wav2Vec2ForCTC, Wav2Vec2Processor
from math import gcd

ROOT=pathlib.Path(__file__).resolve().parents[2]
sys.path.insert(0,str(pathlib.Path(__file__).parent))
from importlib.util import spec_from_file_location, module_from_spec
spec=spec_from_file_location('audit',pathlib.Path(__file__).with_name('audit-recordings.py'));audit=module_from_spec(spec);spec.loader.exec_module(audit)

def read_lines(path):
 lines=[]
 for line in path.read_text(encoding='utf-8-sig').splitlines():
  m=re.match(r'\[(\d+):(\d+(?:\.\d+)?)\](.*)',line)
  if not m:continue
  text=m[3].strip();start=int(m[1])*60+float(m[2])
  if not text or ':' in text or '：' in text or start<8 or '纯音乐' in text:continue
  text=text.replace('107','一零七')
  chars=''.join(re.findall(r'[一-鿿]',text))
  if chars:lines.append({'text':text,'chars':chars,'start':start})
 return lines

def ordered_spans(spans, targets):
 # Occurrences, NOT a token-id dictionary: repeated characters must remain distinct.
 if len(spans)!=len(targets) or any(int(s.token)!=t for s,t in zip(spans,targets)):
  raise ValueError('CTC token occurrence order mismatch')
 return spans

def main():
 p=argparse.ArgumentParser();p.add_argument('--out',required=True);p.add_argument('--only');p.add_argument('--retry-fallback',action='store_true');p.add_argument('--quantize',action='store_true');p.add_argument('--limit',type=int);args=p.parse_args()
 out=pathlib.Path(args.out);out.mkdir(parents=True,exist_ok=True)
 model_id='jonatasgrosman/wav2vec2-large-xlsr-53-chinese-zh-cn'
 proc=Wav2Vec2Processor.from_pretrained(model_id,local_files_only=True)
 model=Wav2Vec2ForCTC.from_pretrained(model_id,local_files_only=True).eval()
 if args.quantize:
  torch.backends.quantized.engine='qnnpack'
  model=torch.ao.quantization.quantize_dynamic(model,{torch.nn.Linear},dtype=torch.qint8)
 blank=proc.tokenizer.pad_token_id
 print('MODEL READY; normalized inputs; ordered occurrences; blank',blank,flush=True)
 for sid,(stem,filename) in audit.SOURCES.items():
  if args.only and stem not in args.only.split(','):continue
  dest=out/(stem+'-lyrics.json')
  cached=json.loads(dest.read_text())['lines'] if dest.exists() else []
  if cached and not args.retry_fallback:print('existing result retained',stem,flush=True);continue
  lrc=next((p for p in (ROOT/'raw').glob('*.lrc') if filename.split('-')[0].replace('+',' ') in p.name),None)
  if not lrc:raise ValueError('Missing LRC '+filename)
  source=ROOT/'tools/sync-fix/stems/htdemucs'/stem/'vocals.wav'
  x,sr=sf.read(source,always_2d=True);x=x.mean(axis=1).astype(np.float32)
  if sr!=16000:x=torchaudio.functional.resample(torch.from_numpy(x),sr,16000).numpy()
  lines=read_lines(lrc);result=[]
  if args.limit:lines=lines[:args.limit]
  for i,line in enumerate(lines):
   if i<len(cached) and not cached[i]['fallback']:
    result.append(cached[i]);continue
   begin=line['start'];next_start=lines[i+1]['start'] if i+1<len(lines) else len(x)/16000
   a=max(0,begin-2);b=min(len(x)/16000,next_start+.6,begin+max(5,len(line['chars'])*.65)+2)
   chars=list(line['chars']);ids=[proc.tokenizer.convert_tokens_to_ids(ch) for ch in chars]
   rec={'text':line['text'],'lrcStartMs':round(begin*1000),'method':'ctc-ordered','fallback':False}
   try:
    covered=[k for k,tid in enumerate(ids) if tid!=proc.tokenizer.unk_token_id]
    if len(covered)<len(ids)*.8 or covered[0]!=0:raise ValueError('insufficient/start vocabulary coverage')
    ids=[ids[k] for k in covered]
    inputs=proc(x[int(a*16000):int(b*16000)],sampling_rate=16000,return_tensors='pt')
    with torch.inference_mode():lp=model(**inputs).logits.log_softmax(-1)
    aligned,scores=torchaudio.functional.forced_align(lp,torch.tensor([ids],dtype=torch.int32),blank=blank)
    spans=ordered_spans(torchaudio.functional.merge_tokens(aligned[0],scores[0],blank=blank),ids)
    times=[a+int(s.start)*.02 for s in spans];ends=[a+int(s.end)*.02 for s in spans]
    conf=[float(s.score) for s in spans]
    # last emissions can collapse in silence if the words are absent; don't promote such output.
    if times[-1]-times[0]<len(chars)*.06 or times[0]<a+.04 or ends[-1]>b-.06:raise ValueError('boundary/compression failure')
    rec.update(startMs=round(times[0]*1000),endMs=round((ends[-1]+.12)*1000),
      chars=[{'text':chars[k],'charIndex':k,'startMs':round(t*1000),'endMs':round(e*1000),'score':round(c,4)} for k,t,e,c in zip(covered,times,ends,conf)],
      uncovered=[k for k in range(len(chars)) if k not in covered])
   except Exception as error:
    rec.update(method='lrc-reference',fallback=True,reason=str(error),startMs=round(begin*1000),
      endMs=round(min(next_start-.1,begin+max(2,len(chars)*.38))*1000),chars=[])
   result.append(rec)
   print(stem,i+1,len(lines),rec['startMs'],rec['method'],line['text'][:12],flush=True)
   dest.with_suffix('.partial.json').write_text(json.dumps(result,ensure_ascii=False,indent=1))
  dest.write_text(json.dumps({'id':sid,'lines':result,'source':lrc.name},ensure_ascii=False,indent=1))
if __name__=='__main__':main()
