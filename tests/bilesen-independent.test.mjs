import test from 'node:test';import assert from 'node:assert/strict';import {data,motor,realSolver} from './source-solver.mjs';
const M=motor(),solver=realSolver(),codes=['A','G','C','D','L'];
function check(q,w,T){assert.equal(q.status,'resolved',`${w},${T}: ${q.reason}`);assert.ok(Math.abs(q.phases.reduce((s,p)=>s+p.oran,0)-1)<1e-8);assert.ok(Math.abs(q.phases.reduce((s,p)=>s+p.oran*p.w,0)-w)<1e-8);for(const f of codes){const source=q.phases.find(p=>p.f===f)?.oran??0;const parts=q.parts.reduce((s,p)=>s+(p.phases[f]??0),0);assert.ok(Math.abs(source-parts)<1e-8,`${w},${T},${f}`);}assert.ok(q.parts.every(p=>p.fraction>=0&&Math.abs(p.fraction-Object.values(p.phases).reduce((s,x)=>s+x,0))<1e-10));}
test('dense source grid conserves each phase and mass; source phases are not replaced',()=>{let resolved=0,unavailable=0;for(let i=0;i<=80;i++)for(let j=0;j<=80;j++){const w=data.meta.W_Fe3C*i/80,T=400+1200*j/80,q=M.calculate(w,T);if(q.status==='unavailable'){unavailable++;continue;}check(q,w,T);const src=solver(w,T).fazlar;assert.equal(JSON.stringify(q.phases),JSON.stringify(src));resolved++;}assert.ok(resolved>5000,`resolved ${resolved}, unavailable ${unavailable}`);});
test('steel and cast-iron textbook examples use source invariant coordinates',()=>{const e=data.invariants.otektoid,u=data.invariants.otektik,c=data.meta.W_Fe3C;
 const a=M.calculate(.45,650),b=M.calculate(1.2,650),d=M.calculate(3,650);for(const [q,w] of [[a,.45],[b,1.2],[d,3]])check(q,w,650);
 const part=(q,id)=>q.parts.find(p=>p.id===id)?.fraction??0;assert.ok(Math.abs(part(a,'proeutectoid-ferrite')-(e.G-.45)/(e.G-e.A))<.005);assert.ok(Math.abs(part(b,'secondary-cementite')-(1.2-e.G)/(c-e.G))<1e-10);assert.ok(Math.abs(part(d,'transformed-ledeburite')-(3-u.G)/(u.L-u.G))<.03);
 assert.equal(M.calculate(.45,800).parts.some(p=>p.id==='pearlite'),false);assert.equal(M.calculate(1.2,650).parts.some(p=>p.id.includes('ledeburite')),false);
});
test('invariant progress preserves each phase and reacts in expected direction',()=>{for(const [inv,w,reactant,product] of [[data.invariants.otektoid,data.invariants.otektoid.G,'G','A'],[data.invariants.otektik,data.invariants.otektik.L,'L','G'],[data.invariants.peritektik,data.invariants.peritektik.G,'L','G']]){assert.equal(M.calculate(w,inv.T).status,'needs-progress');let lastR=Infinity,lastP=-Infinity;for(const xi of [0,.1,.5,.9,1]){const q=M.calculate(w,inv.T,xi);check(q,w,inv.T);const r=q.phases.find(p=>p.f===reactant)?.oran??0,p=q.phases.find(p=>p.f===product)?.oran??0;assert.ok(r<=lastR+1e-12);assert.ok(p>=lastP-1e-12);lastR=r;lastP=p;}}});

test('invariant endpoints and both neighboring composition ranges conserve at every progress',()=>{
 for(const [inv,keys] of [[data.invariants.otektoid,['A','G','C']],[data.invariants.otektik,['G','L','C']],[data.invariants.peritektik,['D','G','L']]]){const cs=keys.map(k=>inv[k]);for(const w of [cs[0],(cs[0]+cs[1])/2,cs[1],(cs[1]+cs[2])/2,cs[2]])for(const xi of [0,.25,.5,.75,1])check(M.calculate(w,inv.T,xi),w,inv.T);}
});
test('invalid inputs and progress fail closed',()=>{for(const [w,T,xi] of [[-1,700],[7,700],[.5,399],[.5,1601],[NaN,700],[.5,NaN],[.5,data.invariants.otektoid.T,-.1],[.5,data.invariants.otektoid.T,1.1]])assert.equal(M.calculate(w,T,xi).status,'unavailable');});

test('invariant reaction amounts match independent stoichiometric endpoints, not only monotonicity',()=>{
 const e=data.invariants.otektoid,u=data.invariants.otektik,r=data.invariants.peritektik,c=data.meta.W_Fe3C;
 const cases=[
  {inv:e,w:e.G,before:{G:1},after:{A:(c-e.G)/(c-e.A),C:(e.G-e.A)/(c-e.A)}},
  {inv:u,w:u.L,before:{L:1},after:{G:(c-u.L)/(c-u.G),C:(u.L-u.G)/(c-u.G)}},
  {inv:r,w:r.G,before:{D:(r.L-r.G)/(r.L-r.D),L:(r.G-r.D)/(r.L-r.D)},after:{G:1}}
 ];
 for(const {inv,w,before,after} of cases)for(const xi of [0,.25,.75,1]){
  const q=M.calculate(w,inv.T,xi);check(q,w,inv.T);
  for(const code of codes)assert.ok(Math.abs((q.phases.find(p=>p.f===code)?.oran??0)-((1-xi)*(before[code]??0)+xi*(after[code]??0)))<1e-12,`${inv.T} ${code} ${xi}`);
 }
 for(const {inv,w} of cases)for(const offset of [-.001,.001])assert.notEqual(M.calculate(w,inv.T+offset).status,'needs-progress');
});

test('rounded cementite endpoint fallback preserves source phases without inventing tertiary ancestry',()=>{
 const w=data.meta.W_Fe3C,q=M.calculate(w,650);
 check(q,w,650);assert.ok(q.notes.includes('fallback'));assert.equal(q.basis,'phases');
 assert.equal(JSON.stringify(q.phases),JSON.stringify(solver(w,650).fazlar));
 const cementite=q.parts.find(p=>(p.phases.C??0)>.99);
 assert.equal(cementite.id,'cementite');
});

test('all source-row boundaries and narrow neighbouring fields conserve phase inventories',()=>{
 let examined=0;
 for(const row of data.rows)for(const region of row.r)for(const w of [region.x[0]-1e-6,region.x[0],region.x[0]+1e-6,(region.x[0]+region.x[1])/2,region.x[1]-1e-6,region.x[1],region.x[1]+1e-6]){
  if(w<0||w>data.meta.W_Fe3C||row.T<data.meta.T_min||row.T>data.meta.T_max)continue;
  const q=M.calculate(w,row.T);check(q,w,row.T);
  assert.equal(JSON.stringify(q.phases),JSON.stringify(solver(w,row.T).fazlar));examined++;
 }
 assert.ok(examined>18000);
});
