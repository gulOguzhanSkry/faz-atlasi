import test from 'node:test';import assert from 'node:assert/strict';import {data,realSolver} from './source-solver.mjs';
import {readFileSync} from 'node:fs';import {runInNewContext} from 'node:vm';
test('test harness invokes actual upstream solver',()=>{const q=realSolver()(.45,650);assert.ok(q.fazlar.length);assert.ok(Math.abs(q.fazlar.reduce((s,p)=>s+p.oran,0)-1)<1e-10);assert.equal(data.meta.basinc_Pa,100000);});

test('portable source-query extraction agrees with the real browser solver on the full acceptance grid and invariant neighbours',()=>{
 const context={};runInNewContext(readFileSync(new URL('../web/faz-durumu.js',import.meta.url),'utf8'),context);
 const portable=context.FazDurumuMotoru.create(data),source=realSolver(),points=[];
 for(let i=0;i<=80;i++)for(let j=0;j<=80;j++)points.push([data.meta.W_Fe3C*i/80,400+1200*j/80]);
 for(const inv of Object.values(data.invariants))for(const carbon of Object.entries(inv).filter(([key])=>key!=='T').map(([,v])=>v).filter(Number.isFinite))for(const offset of [-1e-5,0,1e-5])points.push([carbon,inv.T+offset]);
 for(const [w,T] of points)assert.equal(JSON.stringify(portable.durum(w,T)),JSON.stringify(source(w,T)),`${w}, ${T}`);
});
