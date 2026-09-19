"""Package reviewed recording grids; no audio is copied. Keep the diagnostics beside the report."""
import argparse, json, pathlib, importlib.util
p=argparse.ArgumentParser();p.add_argument('--work',required=True);p.add_argument('--output',required=True);p.add_argument('--report')
a=p.parse_args();work=pathlib.Path(a.work)
spec=importlib.util.spec_from_file_location('audit',pathlib.Path(__file__).with_name('audit-recordings.py'))
audit=importlib.util.module_from_spec(spec);spec.loader.exec_module(audit)
recordings=json.loads((work/'grid-audit.json').read_text())
tracks=json.loads((work/'beat-tracks.json').read_text())
result={};report={}
for sid,(stem,_) in audit.SOURCES.items():
 t=tracks[stem];r=recordings[sid]
 assert all(b>a for a,b in zip(t['beatTimesMs'],t['beatTimesMs'][1:]))
 result[sid]={'sha256':r['sha256'],'durationMs':r['durationMs'],'bpm':t['bpm'],'beatTimesMs':t['beatTimesMs']}
 report[sid]={'sha256':r['sha256'],'oldBpm':r['oldBpm'],'newBpm':t['bpm'],
  'oldStartMs':r['oldStartMs'],'newStartMs':t['beatTimesMs'][0],'durationMs':r['durationMs'],
  'validationMethod':'odd-beat high-band transient residuals within +/-120ms; not human-labelled ground truth',
  'humanListeningVerified':False,'segments':t['segments']}
pathlib.Path(a.output).write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
if a.report:pathlib.Path(a.report).write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
