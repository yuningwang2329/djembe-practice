"""Reuse local, occurrence-ordered CTC candidates for notation placement only.
No remote inference. Preserve sentence boundaries and explicitly report rejected anchors.
"""
import argparse, hashlib, importlib.util, json, pathlib, re

def choose_times(cue, candidate):
    letters=list(re.sub(r'\s','',cue['text']))
    raw=candidate['chars']
    # A mismatch (digits, missing vocabulary, repeated occurrence) must not silently shift indexes.
    matches=''.join(c['text'] for c in raw)==''.join(letters)
    anchors={}; rejected=[]
    if matches:
        for i,c in enumerate(raw):
            t=c['startMs']
            separated=(i==0 or t-raw[i-1]['startMs']>=60) and (i==len(raw)-1 or raw[i+1]['startMs']-t>=60)
            if c['score']>=-6 and separated and cue['startMs']<=t<cue['endMs']-40:
                anchors[i]=t
            else: rejected.append(i)
    else: rejected=list(range(len(letters)))
    # Reviewed sentence onset outranks an older character candidate at that boundary.
    if 0 not in anchors: anchors[0]=cue['startMs']
    anchors[len(letters)]=cue['endMs']
    times=[]
    for i in range(len(letters)):
        if i in anchors: times.append(anchors[i]); continue
        left=max(j for j in anchors if j<i); right=min(j for j in anchors if j>i)
        times.append(round(anchors[left]+(anchors[right]-anchors[left])*(i-left)/(right-left)))
    assert all(a<b for a,b in zip(times,times[1:])),cue['text']
    return times,rejected

def main():
    p=argparse.ArgumentParser();p.add_argument('--work',required=True);p.add_argument('--output',required=True);p.add_argument('--report',required=True);a=p.parse_args()
    work=pathlib.Path(a.work);output=pathlib.Path(a.output)
    spec=importlib.util.spec_from_file_location('audit',pathlib.Path(__file__).with_name('audit-recordings.py'))
    audit=importlib.util.module_from_spec(spec);spec.loader.exec_module(audit)
    songs=json.loads(output.read_text());report={}
    for sid,(stem,filename) in audit.SOURCES.items():
        song=songs[sid]
        assert hashlib.sha256((audit.ROOT/'raw'/filename).read_bytes()).hexdigest()==song['sha256']
        candidate=json.loads((work/(stem+'-bounded-lyrics.json')).read_text())
        vocal=audit.ROOT/'tools/sync-fix/stems/htdemucs'/stem/'vocals.wav'
        assert hashlib.sha256(vocal.read_bytes()).hexdigest()==candidate['vocalSha256']
        assert len(candidate['lines'])==len(song['cues'])
        details=[]
        for index,(cue,line) in enumerate(zip(song['cues'],candidate['lines'])):
            assert cue['text']==line['text']
            times,rejected=choose_times(cue,line)
            cue['layoutTimesMs']=times
            cue['layoutTiming']='mixed-estimates' if rejected else 'ctc-candidates'
            details.append({'line':index+1,'text':cue['text'],'rejectedCharacterIndices':rejected,
                            'method':cue['layoutTiming'],'modelScores':[c['score'] for c in line['chars']]})
        report[sid]={'sha256':song['sha256'],'vocalSha256':candidate['vocalSha256'],
                    'purpose':'notation-layout-only; not human-verified phoneme times','details':details}
        print(stem,sum(len(c['layoutTimesMs']) for c in song['cues']),'characters;',sum(len(d['rejectedCharacterIndices']) for d in details),'estimated')
    output.write_text(json.dumps(songs,ensure_ascii=False,indent=2)+'\n')
    pathlib.Path(a.report).write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')

if __name__=='__main__':main()
