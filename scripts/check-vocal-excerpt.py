"""Independent local ASR spot check. Supply an existing local Whisper model path; no downloads."""
import argparse,json,pathlib
import numpy as np
import soundfile as sf
import torch
torch.set_num_threads(2)
import torchaudio
import whisper
p=argparse.ArgumentParser();p.add_argument('--audio',required=True);p.add_argument('--model',required=True);p.add_argument('--start',type=float,required=True);p.add_argument('--end',type=float,required=True);p.add_argument('--out',required=True);a=p.parse_args()
with sf.SoundFile(a.audio) as f:
 sr=f.samplerate;f.seek(int(a.start*sr));x=f.read(int((a.end-a.start)*sr),always_2d=True).mean(axis=1).astype(np.float32)
x=torchaudio.functional.resample(torch.from_numpy(x),sr,16000).numpy()
m=whisper.load_model(a.model,device='cpu')
r=m.transcribe(x,language='zh',word_timestamps=True,condition_on_previous_text=False,fp16=False,temperature=0)
for s in r['segments']:
 s['start']+=a.start;s['end']+=a.start
 for w in s.get('words',[]):w['start']+=a.start;w['end']+=a.start
 print(round(s['start'],2),round(s['end'],2),s['text'],flush=True)
pathlib.Path(a.out).write_text(json.dumps(r,ensure_ascii=False,indent=1))
