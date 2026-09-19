import importlib.util,pathlib,unittest
spec=importlib.util.spec_from_file_location('layout',pathlib.Path(__file__).with_name('package-lyric-layout.py'))
layout=importlib.util.module_from_spec(spec);spec.loader.exec_module(layout)
class LayoutTest(unittest.TestCase):
    def test_repeated_occurrences_and_low_score_interpolation(self):
        cue={'text':'我在我家','startMs':1000,'endMs':3000}
        raw={'chars':[{'text':c,'startMs':t,'score':s} for c,t,s in zip('我在我家',[1000,1300,1800,2400],[0,-9,0,0])]}
        times,rejected=layout.choose_times(cue,raw)
        self.assertEqual(times,[1000,1400,1800,2400]);self.assertEqual(rejected,[1])
    def test_mismatched_text_is_not_attached_to_wrong_letters(self):
        times,rejected=layout.choose_times({'text':'一零七','startMs':0,'endMs':900},{'chars':[]})
        self.assertEqual(times,[0,300,600]);self.assertEqual(rejected,[0,1,2])
if __name__=='__main__':unittest.main()
