# SPDX-License-Identifier: MIT — experimental, not accepted.
"""Refine traced binary branches with direct equilibria, including missing ends.
Interpolation envelopes are sampled numerical estimates, not experimental errors.
EXPERIMENTAL / NOT ACCEPTED. The original attempt stalled near dilute endpoints.
Use an explicitly provisioned research environment and --experimental.
"""
from pathlib import Path
import argparse
from _paths import ROOT, RAW_DEFAULT, CANDIDATE_DEFAULT, database_path, research_output
parser=argparse.ArgumentParser(description='EXPERIMENTAL adaptive refinement; previous endpoint run did not complete and is NOT accepted.')
parser.add_argument('--name',choices=['source','reference'],default='source')
parser.add_argument('--raw-dir',type=Path,default=RAW_DEFAULT)
parser.add_argument('--database',type=Path)
parser.add_argument('--output-dir',type=Path,default=CANDIDATE_DEFAULT)
parser.add_argument('--max-calls',type=int,default=3000)
parser.add_argument('--max-depth',type=int,default=12)
parser.add_argument('--experimental',action='store_true')
args=parser.parse_args()
if not args.experimental: parser.error('This unfinished research method requires --experimental; it is not an accepted data-production path')
if args.max_calls<1 or args.max_depth<1: parser.error('Invalid research budget')
import json,sys,hashlib
import numpy as np
from scipy.optimize import brentq
import pycalphad
from pycalphad import Database,equilibrium,variables as v

name=args.name
raw=json.loads((args.raw_dir/f'{name}-map.json').read_text())
pure=json.loads((args.raw_dir/f'{name}-pure.json').read_text())
path=database_path(name,args.database)
db=Database(str(path));phases=['BCC_A2','FCC_A1','CEMENTITE_D011','LIQUID']
MC,MF=12.011,55.847
def weight(x):return float(100*x*MC/(x*MC+(1-x)*MF))
def mole(c):return (c/MC)/(c/MC+(100-c)/MF)
theta=weight(.25)
def code(p,t):return {'FCC_A1':'G','CEMENTITE_D011':'C','LIQUID':'L'}.get(p,'A' if t<1200 else 'D')
events=[]
for entries in raw['invariants']:
 t=entries[0]['T'][0]-273.15;c={code(p['phase'],t):weight(p['x'][0]) for p in entries}
 if 'A' in c:e={'id':'eutectoid','below':[['A','C']],'above':[['A','G'],['G','C']]}
 elif 'D' in c:e={'id':'peritectic','below':[['D','G'],['G','L']],'above':[['D','L']]}
 else:e={'id':'eutectic','below':[['G','C']],'above':[['G','L'],['L','C']]}
 events.append({**e,'temperature':t,'temperatureError':1e-5,'compositions':c})

# Cementite congruent melting: compare homogeneous free energies at xC=1/4.
def gm(p,t):
 q=equilibrium(db,['FE','C','VA'],[p],{v.X('C'):.25,v.T:t+273.15,v.P:100000,v.N:1})
 return float(q.GM.values.squeeze())
tm=brentq(lambda t:gm('CEMENTITE_D011',t)-gm('LIQUID',t),1200,1250,xtol=1e-8)
groups={}
for branch in raw['branches']:
 if len(branch)!=2:raise RuntimeError('Nonbinary branch')
 for i,tK in enumerate(branch[0]['T']):
  t=tK-273.15;items=sorted([(code(p['phase'],t),weight(p['x'][i])) for p in branch],key=lambda x:x[1]);key=tuple(p[0] for p in items)
  cs=[theta if k=='C' else c for k,c in items]
  groups.setdefault(key,[]).append((t,cs))

for key,pts in groups.items():
 for e in events:
  if list(key) in e['below']+e['above']:
   # All branches touching this reaction terminate at the exact same node.
   pts[:]=[(t,c) for t,c in pts if abs(t-e['temperature'])>1e-5]
   pts.append((e['temperature'],[e['compositions'][k] for k in key]))
 if key==('A','C'):pts.append((400,[pts[-1][1][0],theta])) # recalculated below
 if key==('A','G'):pts.append((pure[0]['temperature'],[0,0]))
 if key==('D','G'):pts.append((pure[1]['temperature'],[0,0]))
 if key==('D','L'):pts.append((pure[2]['temperature'],[0,0]))
 if key==('L','C'):pts.append((tm,[theta,theta]))
 groups[key]=sorted({round(t,10):(t,c) for t,c in pts}.values())

calls=0;cache={};unresolved=[];convergence=[]
def solve(key,t,guess):
 global calls
 ck=(key,t)
 if ck in cache:return cache[ck]
 target=sum(guess)/2
 solutions=[]
 for density in [100,300,900]:
  if calls>=args.max_calls: raise RuntimeError('Direct-equilibrium call budget exhausted; no acceptance')
  eq=equilibrium(db,['FE','C','VA'],phases,{v.X('C'):mole(target),v.T:t+273.15,v.P:100000,v.N:1},calc_opts={'pdens':density})
  found={}
  for p,x,n in zip(eq.Phase.values.flatten(),eq.X.sel(component='C').values.flatten(),eq.NP.values.flatten()):
   if p and np.isfinite(n) and n>0:found[code(str(p),t)]=theta if p=='CEMENTITE_D011' else weight(x)
  if set(found)!=set(key):raise RuntimeError(f'Unresolved {key} at {t}: {found}, guess {guess}')
  solutions.append([found[k] for k in key]);calls+=1
 a=np.array(solutions);err=np.ptp(a,axis=0)+64*np.finfo(float).eps*np.maximum(1,np.abs(a[-1]));err=[0 if k=='C' else float(err[i]) for i,k in enumerate(key)]
 convergence.append({'branch':'+'.join(key),'temperature':t,'pdens':[100,300,900],'carbon':solutions,'spread':err})
 cache[ck]=(solutions[-1],err);return cache[ck]

boundaries=[]
for key,pts in groups.items():
 print(name,key,'start',len(pts),flush=True)
 # Fix lower domain end by equilibrium with a known two-phase bulk composition.
 if key==('A','C'):pts[0]=(400,solve(key,400,[.0002,theta])[0])
 accepted=[]
 def refine(a,b,depth=0):
  ta,ca=a;tb,cb=b
  if tb-ta<1e-8:return
  samples=[];errors=[0.,0.]
  for u in [.25,.5,.75]:
   t=ta+u*(tb-ta);guess=[ca[i]+u*(cb[i]-ca[i]) for i in range(2)]
   try:actual,nerr=solve(key,t,guess)
   except RuntimeError as ex:
    unresolved.append(str(ex));raise
   samples.append((t,actual))
   for i in range(2):errors[i]=max(errors[i],2*abs(actual[i]-guess[i])+nerr[i])
  width=min([p[1][1]-p[1][0] for p in samples]);tol=min(2e-6+2e-5*max(ca+cb),max(1e-12,width*.0005))
  if max(errors)>tol:
   if depth>=args.max_depth:raise RuntimeError('Refinement depth budget exhausted; no acceptance')
   refine(a,samples[1],depth+1);refine(samples[1],b,depth+1)
  else:accepted.append((a,b,errors))
 for a,b in zip(pts,pts[1:]):refine(a,b)
 packed=[]
 for a,b,err in accepted:
  if not packed:packed.append({'temperature':a[0],'carbon':a[1],'error':err})
  else:packed[-1]['error']=[max(packed[-1]['error'][i],err[i]) for i in range(2)]
  packed.append({'temperature':b[0],'carbon':b[1],'error':err})
 boundaries.append({'id':'+'.join(key),'phases':list(key),'points':packed})
 print(name,key,'refined',len(packed),'calls',calls,flush=True)

out={'schema':1,'revision':'fei-brosh-adaptive-r01' if name=='source' else 'hallstedt-comparison-r01','databaseSha256':raw['sha256'],'pressurePa':100000,
 'bounds':{'carbon':[0,theta],'temperature':[400,1600]},'evidence':{'comparison':'pending','acceptance':'experimental-not-accepted','numerical':'adaptive direct equilibrium, three pdens levels; sampled error envelopes','experimental':'not performed'},
 'boundaries':boundaries,'invariants':events,'pureIron':[{'temperature':p['temperature'],'below':a,'above':b,'error':1e-7} for p,a,b in zip(pure,['A','G','D'],['G','D','L'])],
 'cementiteMelting':{'temperature':tm,'carbon':theta,'error':1e-7},
 'method':{'solver':pycalphad.__version__,'calls':calls,'densityLevels':[100,300,900],'errorBasis':'twice maximum quarter/midpoint interpolation residual plus pdens spread and floating point allowance; not rigorous interval proof or physical uncertainty','graphite':'suppressed'}}
research_output(args.output_dir/f'{name}-adaptive.json').write_text(json.dumps(out,indent=2),encoding='utf-8')
research_output(args.output_dir/f'{name}-convergence.json').write_text(json.dumps(convergence),encoding='utf-8')
print('COMPLETE',name,'calls',calls,flush=True)
