"""MIT: package completed traces as an isolated candidate, never overwrite web data."""
from pathlib import Path
import argparse
from _paths import ROOT, RAW_DEFAULT, CANDIDATE_DEFAULT, database_path, research_output
parser=argparse.ArgumentParser(description='Package existing 8/4/2 K traces; empirical numerical envelopes, not physical uncertainty.')
parser.add_argument('--raw-dir',type=Path,default=RAW_DEFAULT)
parser.add_argument('--output',type=Path,default=CANDIDATE_DEFAULT/'equilibrium-r01.json')
parser.add_argument('--comparison-output',type=Path,default=CANDIDATE_DEFAULT/'scoped-comparison.json')
args=parser.parse_args()
import json,numpy as np
r=args.raw_dir;raw=json.loads((r/'source-map-2.json').read_text());coarse=json.loads((r/'source-map.json').read_text());mid=json.loads((r/'source-map-4.json').read_text());ref=json.loads((r/'reference-map.json').read_text())
M,F=12.011,55.847
w=lambda x:100*x*M/(x*M+(1-x)*F)
code=lambda p,t: {'FCC_A1':'G','CEMENTITE_D011':'C','LIQUID':'L'}.get(p,'A' if t<1200 else 'D')
def groups(d):
 g={}
 for b in d['branches']:
  for i,tk in enumerate(b[0]['T']):
   t=tk-273.15;a=sorted([(code(p['phase'],t),w(p['x'][i])) for p in b],key=lambda a:a[1]);k=tuple(x[0] for x in a)
   if k==('A','G') and t>900 or k==('D','G') and t<1400 or k==('D','L') and t>1537.7:continue
   g.setdefault(k,[]).append((t,[x[1] for x in a]))
 return {k: sorted({round(t,7):(t,c) for t,c in a}.values()) for k,a in g.items()}
g,gm,gc,gr=map(groups,[raw,mid,coarse,ref]);out=[];comparison=[]
for key,pts in g.items():
 other=gm[key];old=gc[key];rr=gr[key];packed=[]
 for t,c in pts:
  err=[]
  for j in range(2):
   vals=[]
   for src in [other,old]:
    if src[0][0]<=t<=src[-1][0]:vals.append(abs(c[j]-float(np.interp(t,[p[0] for p in src],[p[1][j] for p in src]))))
   err.append(0 if key[j]=='C' else max(vals+[1e-10])*2+1e-10)
  packed.append({'temperature':t,'carbon':c,'error':err})
  if rr[0][0]<=t<=rr[-1][0]:comparison.append({'branch':'+'.join(key),'temperature':t,'deltaCarbon':[float(np.interp(t,[p[0] for p in rr],[p[1][j] for p in rr]))-c[j] for j in range(2)]})
 out.append({'id':'+'.join(key),'phases':list(key),'points':packed})
events=[]
for b in raw['invariants']:
 t=b[0]['T'][0]-273.15;c={code(p['phase'],t):w(p['x'][0]) for p in b}
 if 'A' in c:e={'id':'eutectoid','below':[['A','C']],'above':[['A','G'],['G','C']]}
 elif 'D' in c:e={'id':'peritectic','below':[['D','G'],['G','L']],'above':[['D','L']]}
 else:e={'id':'eutectic','below':[['G','C']],'above':[['G','L'],['L','C']]}
 drift=max(abs(t-(min(x['T'][0] for x in b2)-273.15)) for d in [coarse,mid] for b2 in d['invariants'] if set(p['phase'] for p in b2)==set(p['phase'] for p in b))
 events.append({**e,'temperature':t,'temperatureError':max(1e-8,drift*2),'compositions':c})
 # Canonical invariant endpoints remove mapping traversal offsets.
 for b2 in out:
  if list(b2['phases']) in e['above']+e['below']:
   points=b2['points'];nearest=min(range(len(points)),key=lambda i:abs(points[i]['temperature']-t))
   if abs(points[nearest]['temperature']-t)<1e-4:points[nearest]['temperature']=t;points[nearest]['carbon']=[c[k] for k in b2['phases']]
pure=json.loads((r/'source-pure.json').read_text())
pack={'schema':1,'revision':'fei-brosh-traced-r01-scoped','databaseSha256':raw['sha256'],'pressurePa':100000,'bounds':{'carbon':[0,w(.25)],'temperature':[400,1600]},'evidence':{'comparison':'project-screening-only','acceptance':'pending-independent-physical-validation','numerical':'three mapping step sizes; conservative exclusions at unresolved ends','experimental':'not performed'},'boundaries':out,'invariants':events,'pureIron':[{'temperature':p['temperature'],'below':a,'above':b,'error':1e-7} for p,a,b in zip(pure,['A','G','D'],['G','D','L'])], 'exclusions':[
 {'carbon':[0,w(.25)],'temperature':[400,400.1],'reason':'lower mapping edge'},
 {'carbon':[0,.1],'temperature':[890,925],'reason':'dilute alpha gamma endpoint'},
 {'carbon':[0,.05],'temperature':[1390,1405],'reason':'dilute gamma delta endpoint'},
 {'carbon':[0,.01],'temperature':[1537.5,1537.82],'reason':'dilute melting endpoint'},
 {'carbon':[6.68,w(.25)],'temperature':[1223.9,1224.1],'reason':'cementite congruent melting endpoint'}],
 'method':{'solver':'pycalphad 0.11.2','mappingStepsK':[8,4,2],'errorBasis':'twice inter-map boundary discrepancy; empirical numerical envelope, not rigorous physical uncertainty','morphology':'illustrative mass occupancy, no density conversion'}}
research_output(args.output).write_text(json.dumps(pack,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
research_output(args.comparison_output).write_text(json.dumps(comparison,indent=2))
print('points',sum(len(b['points']) for b in out),'max carbon reference delta',max(abs(x) for c in comparison for x in c['deltaCarbon']))
