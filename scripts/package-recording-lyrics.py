"""Package reviewed sentence boundaries, with diagnostic provenance and no fake character precision."""
import argparse,hashlib,importlib.util,json,pathlib
import numpy as np
p=argparse.ArgumentParser();p.add_argument('--work',required=True);p.add_argument('--output',required=True);p.add_argument('--report',required=True);a=p.parse_args()
work=pathlib.Path(a.work)
spec=importlib.util.spec_from_file_location('audit',pathlib.Path(__file__).with_name('audit-recordings.py'))
audit=importlib.util.module_from_spec(spec);spec.loader.exec_module(audit)
fingerprints=json.loads((work/'grid-audit.json').read_text())
overrides=json.loads(pathlib.Path(__file__).with_name('lyric-boundary-overrides.json').read_text())
result={};report={}
for sid,(stem,filename) in audit.SOURCES.items():
 sha=hashlib.sha256((audit.ROOT/'raw'/filename).read_bytes()).hexdigest()
 assert sha==fingerprints[sid]['sha256'], 'Recording changed; redo analysis: '+stem
 candidate=json.loads((work/(stem+'-bounded-lyrics.json')).read_text())
 lines=candidate['lines'];cues=[];details=[]
 for i,line in enumerate(lines):
  start=line['startMs'];end=line['endMs']
  # CTC emissions mark a token, not a sung vowel's release. Retain a conservative tail.
  next_start=lines[i+1]['startMs'] if i+1<len(lines) else fingerprints[sid]['durationMs']
  end=min(next_start-80,end+600)
  method='ordered-ctc-sentence';reason=[]
  for edit in overrides.get(stem,[]):
   if edit['line']!=i+1:continue
   assert edit['text']==line['text'], 'Override text mismatch: '+stem
   start=edit.get('startMs',start);end=edit.get('endMs',end);method=edit['method'];reason.append(edit['reason'])
  times=np.array([c['startMs'] for c in line['chars']]);gaps=np.diff(times)
  if any(gaps<50):reason.append('内部逐字有挤压，仅使用句级时间，不发布逐字时间。')
  if line['chars'][0]['score'] < -8:reason.append('首字模型分数较低，保留为听感复核点。')
  if method!='ordered-ctc-sentence':reason.append('边界为有来源的估计/交叉校验，不宣称精准逐字。')
  assert 0<=start<end<=fingerprints[sid]['durationMs'],(stem,i,start,end)
  assert not cues or cues[-1]['endMs']<=start,(stem,i,'overlap')
  cue={'text':line['text'],'startMs':start,'endMs':end,'timingMethod':method,'reviewRequired':bool(reason)}
  cues.append(cue)
  details.append({'line':i+1,**cue,'sourceLrcMs':line['lrcStartMs'],'referenceMs':line['referenceMs'],
    'ctcStartMs':line['startMs'],'ctcEndMs':line['endMs'],'firstTokenLogScore':line['chars'][0]['score'],'notes':reason})
 result[sid]={'sha256':sha,'cues':cues}
 report[sid]={'title':filename,'sha256':sha,'lines':len(cues),'reviewPoints':sum(c['reviewRequired'] for c in cues),
  'humanListeningVerified':False,'details':details}
 print(stem,len(cues),'lines;',report[sid]['reviewPoints'],'review points',flush=True)
pathlib.Path(a.output).write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
pathlib.Path(a.report).write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
