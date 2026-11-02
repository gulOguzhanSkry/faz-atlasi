# SPDX-License-Identifier: MIT — OG research-tool port; see README.md for limits.
"""Research: trace phase boundaries with pycalphad's adaptive ZPF mapping.
Not experimental validation. All raw map branches and invariant nodes retained.
"""
from pathlib import Path
import argparse, time
from _paths import ROOT, RAW_DEFAULT, CANDIDATE_DEFAULT, database_path, research_output
parser=argparse.ArgumentParser(description='Trace binary boundaries with pycalphad ZPF mapping; numerical research, not experimental validation.')
parser.add_argument('--name',choices=['source','reference'],default='source')
parser.add_argument('--step',type=float,default=8)
parser.add_argument('--database',type=Path)
parser.add_argument('--output',type=Path)
parser.add_argument('--iterations',type=int,default=20000)
parser.add_argument('--max-seconds',type=float,default=600)
args=parser.parse_args()
if not 0<args.step<=20 or args.iterations<1 or args.max_seconds<=0: parser.error('Invalid mapping budget or step')
import json, hashlib, sys, warnings
import numpy as np
import pycalphad
from pycalphad import Database, variables as v
from pycalphad.mapping import BinaryStrategy

name=args.name
step=args.step
path=database_path(name,args.database)
db=Database(str(path))
strategy=BinaryStrategy(db,['FE','C','VA'],['BCC_A2','FCC_A1','CEMENTITE_D011','LIQUID'],
 {v.T:(673.15,1873.15,step),v.X('C'):(1e-8,0.2499999,step*.00025),v.P:100000,v.N:1}, MIN_DELTA_RATIO=0.01)
print('Mapping '+name,flush=True)
# Explicit two-phase seeds avoid a degenerate stoichiometric endpoint scan.
for temp,carbon in [(500,1),(800,.2),(900,2),(1200,3),(1200,5.5),(1450,.1),(1510,.2)]:
 x=(carbon/12.011)/(carbon/12.011+(100-carbon)/55.847)
 print('seed',temp,carbon,strategy.add_nodes_from_conditions({v.T:temp+273.15,v.X('C'):x,v.P:100000,v.N:1}),flush=True)
finished=False
started=time.monotonic()
for i in range(args.iterations):
 if time.monotonic()-started>args.max_seconds: raise RuntimeError('Mapping wall-time budget exhausted; no acceptance')
 finished=strategy.iterate()
 if i%100==0: print('step',i,'branches',len(strategy.zpf_lines),'nodes',strategy.node_queue.size(),flush=True)
 if finished:break
if not finished: raise RuntimeError('Mapping budget exhausted; no acceptance')
def pack(region):
 return [{'phase':d.phase,'x':np.atleast_1d(d.x).tolist(),'T':np.atleast_1d(d.y).tolist()} for d in region.data]
out={'database':path.name,'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'solver':pycalphad.__version__,
 'pressurePa':100000,'basis':'mole fraction carbon; kelvin','branches':[pack(r) for r in strategy.get_tieline_data(v.X('C'),v.T)],
 'invariants':[pack(r) for r in strategy.get_invariant_data(v.X('C'),v.T)]}
suffix='' if step==8 else f'-{step:g}'
dest=research_output(args.output or RAW_DEFAULT/f'{name}-map{suffix}.json');dest.write_text(json.dumps(out,indent=2),encoding='utf-8')
print(json.dumps({'name':name,'branches':len(out['branches']),'invariants':out['invariants']}),flush=True)
