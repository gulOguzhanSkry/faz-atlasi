import test from 'node:test';
import assert from 'node:assert/strict';
import {motor,data} from './source-solver.mjs';
import {createModel} from '../web/mikroyapi/model.js';
import {renderSlicePixels} from '../web/mikroyapi/kesit2d.js';
const engine=motor();
function realCut(temperature){
 const result=engine.calculate(.45,temperature),model=createModel({quality:'economy',seed:491,invariants:data.invariants});
 assert.equal(result.status,'resolved');model.setState(result,.45,temperature);
 return {result,model,cut:model.slice('z',1,64)};
}
const rgba=(rendered,i)=>Array.from(rendered.pixels.subarray(i*4,i*4+4));
const rgb=hex=>[parseInt(hex.slice(1,3),16),parseInt(hex.slice(3,5),16),parseInt(hex.slice(5,7),16),255];
const draw=(cut,mode,boundaries)=>renderSlicePixels(cut,{mode,magnification:'low',effects:false,boundaries,phaseColours:cut.colors.phases,partColours:cut.colors.constituents});

test('real 100% austenite has visible same-phase grain outlines while interiors, identity maps and source budgets remain intact',()=>{
 const {result,model,cut}=realCut(900),before=JSON.stringify({result,budgets:model.active.budgets}),n=cut.width;
 assert.equal(result.phases.length,1);assert.equal(result.phases[0].f,'G');assert.equal(result.phases[0].oran,1);assert.ok(new Set(cut.grainLabels).size>1);
 for(const mode of ['phases','constituents','grains']){
  const off=draw(cut,mode,false),on=draw(cut,mode,true);let edges=0,interiors=0;
  for(const field of ['phaseLabels','partLabels','grainLabels','sourceIndices'])assert.deepEqual(on[field],off[field]);
  const expectedBase=mode==='phases'?rgb(cut.colors.phases.G):mode==='constituents'?rgb(cut.colors.constituents[result.parts[0].id]):null;
  for(let i=0;i<cut.phaseLabels.length;i++){
   const x=i%n,y=Math.floor(i/n),near=[];if(x>0)near.push(i-1);if(x+1<n)near.push(i+1);if(y>0)near.push(i-n);if(y+1<n)near.push(i+n);
   const touchingOtherGrain=near.some(j=>cut.grainLabels[j]!==cut.grainLabels[i]),changed=on.pixels.subarray(i*4,i*4+3).some((v,k)=>v!==off.pixels[i*4+k]);
   if(changed){assert.ok(touchingOtherGrain,'an outline must touch an existing ownership boundary');assert.ok(on.pixels[i*4]<off.pixels[i*4],'outline darkens the presentation');edges++;}
   if(!touchingOtherGrain){assert.deepEqual(rgba(on,i),rgba(off,i));if(expectedBase)assert.deepEqual(rgba(on,i),expectedBase);interiors++;}
   if(expectedBase)assert.deepEqual(rgba(off,i),expectedBase,'the base single-phase image must retain its declared colour');
  }
  assert.ok(edges>30,mode+' must visibly separate multiple grains');assert.ok(interiors>100,mode+' must retain unmodified grain interiors');
 }
 assert.equal(JSON.stringify({result,budgets:model.active.budgets}),before);
 assert.ok(cut.phaseLabels.every(id=>cut.phaseCodes[id]==='G'));
});

test('a real fully liquid state does not acquire an artificial solid-grain network',()=>{
 const {result,cut}=realCut(1600);assert.equal(result.phases.length,1);assert.equal(result.phases[0].f,'L');assert.equal(result.phases[0].oran,1);
 assert.ok(new Set(cut.grainLabels).size>1,'the underlying schematic ownership field remains available');
 const on=draw(cut,'phases',true),off=draw(cut,'phases',false);assert.deepEqual(on.pixels,off.pixels);
 const base=rgb(cut.colors.phases.L);for(let i=0;i<cut.phaseLabels.length;i++)assert.deepEqual(rgba(on,i),base);
 assert.deepEqual(on.phaseLabels,off.phaseLabels);assert.deepEqual(on.grainLabels,off.grainLabels);
});

test('hot etched fallback retains the visible austenite grain outlines of the phase-colour view',()=>{
 const {cut}=realCut(900),etched=draw(cut,'etched',true),phases=draw(cut,'phases',true),flat=draw(cut,'etched',false);
 assert.equal(etched.mode,'phases');assert.ok(etched.warning);assert.deepEqual(etched.pixels,phases.pixels);assert.notDeepEqual(etched.pixels,flat.pixels);
 for(const field of ['phaseLabels','partLabels','grainLabels','sourceIndices'])assert.deepEqual(etched[field],flat[field]);
});
