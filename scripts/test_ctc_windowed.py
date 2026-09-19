import unittest
import numpy as np
from ctc_windowed import align

class OrderedAlignmentTests(unittest.TestCase):
 def test_repeated_tokens_have_distinct_occurrences(self):
  x=np.full((7,2),-20.,dtype=np.float32);x[:,0]=-.1;x[1,1]=0;x[5,1]=0
  spans=align(x,[1,1])
  self.assertEqual([s['start'] for s in spans],[1,5])
 def test_late_echo_cannot_steal_a_line_boundary(self):
  x=np.full((12,3),-20.,dtype=np.float32);x[:,0]=-.1
  x[2,1]=0;x[4,2]=-.5;x[10,2]=0
  self.assertEqual(align(x,[1,2])[-1]['start'],10)
  self.assertEqual(align(x,[1,2],[(0,7),(0,7)])[-1]['start'],4)
 def test_impossible_window_fails_instead_of_inventing_timestamps(self):
  with self.assertRaises(ValueError):align(np.zeros((3,2),dtype=np.float32),[1],[(4,6)])
if __name__=='__main__':unittest.main()
