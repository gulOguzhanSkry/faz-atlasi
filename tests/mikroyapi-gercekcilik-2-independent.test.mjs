import test from 'node:test';
import assert from 'node:assert/strict';
import {motor,data} from './source-solver.mjs';
import {createModel} from '../web/mikroyapi/model.js';
import {renderSlicePixels,renderSlice,lamellarTone} from '../web/mikroyapi/kesit2d.js';
/* Realism 2: appearance layer of the section (boundary ownership, box-filtered pearlite,
 * true magnification). Identity maps must stay exactly as the occupancy model decides. */
const engine=motor();
function model(carbon,temperature=650){
 const result=engine.calculate(carbon,temperature),m=createModel({quality:'balanced',seed:20261101,invariants:data.invariants});
 assert.equal(result.status,'resolved');assert.ok(m.setState(result,carbon,temperature));return m;
}
const FERRITE=0x40000000;

test('ferrite has its own grains; the prior austenite boundary is not drawn through it',()=>{
 const m=model(.3),cut=m.slice('z',.5,128),n=cut.width,ferrite=cut.partIds.indexOf('proeutectoid-ferrite');
 assert.ok(ferrite>=0);let crossings=0,ferritePixels=0;
 for(let i=0;i<n*n;i++){
  const isFerrite=cut.partLabels[i]===ferrite;assert.equal(Boolean(cut.boundaryLabels[i]&FERRITE),isFerrite);
  if(!isFerrite)continue;ferritePixels++;
  const j=i+1;if(i%n<n-1&&cut.partLabels[j]===ferrite&&cut.grainLabels[j]!==cut.grainLabels[i]&&cut.boundaryLabels[j]===cut.boundaryLabels[i])crossings++;
 }
 assert.ok(ferritePixels>n*n*.2&&crossings>5,'ferrite grains straddle prior γ boundaries');
 const etched=renderSlicePixels(cut,{mode:'etched',magnification:'low',effects:true});
 const flat=renderSlicePixels(cut,{mode:'etched',magnification:'low',effects:false});
 for(let i=n;i<n*n;i++){
  // A ferrite pixel whose left and upper neighbours are the same ferrite grain is never darkened as a boundary.
  if(cut.partLabels[i]!==ferrite||i%n===0)continue;
  if(cut.boundaryLabels[i-1]===cut.boundaryLabels[i]&&cut.boundaryLabels[i-n]===cut.boundaryLabels[i])assert.ok(etched.pixels[i*4]>flat.pixels[i*4]*.75,'no line inside one ferrite grain');
 }
});

test('pearlite appearance is box-filtered: unresolved at low, resolved stripes at true high magnification',()=>{
 const m=model(.77),low=m.slice('z',.5,192),high=m.slice('z',.5,512,{u:1,v:1},2.5),pearlite=low.partIds.indexOf('pearlite');
 const stats=cut=>{let n=0,periods=0,bimodal=0;for(let i=0;i<cut.coverage.length;i++){if(!Number.isFinite(cut.coverage[i]))continue;assert.equal(cut.partLabels[i],pearlite);n++;periods+=cut.periodsPerPixel[i];if(cut.coverage[i]<.1||cut.coverage[i]>.9)bimodal++;}return {n,periods:periods/n,bimodal:bimodal/n};};
 const a=stats(low),b=stats(high);
 assert.ok(a.n>low.width**2*.8&&b.n>high.width**2*.8);
 assert.ok(a.periods>1,'≈1 µm pixels cannot resolve 0.5 µm lamellae');
 assert.ok(b.periods<.5&&b.bimodal>.6,'0.14 µm pixels resolve α and θ');
 assert.ok(Math.abs(high.pixelUm*2.5*512/192-low.pixelUm)<1e-9);
 // Low-magnification etched pearlite is a uniform dark constituent, not aliased stripes.
 // (Colonies whose lamellae lie nearly in the section plane may still resolve: apparent spacing λ/sin θ.)
 const tones=cut=>{const img=renderSlicePixels(cut,{mode:'etched',magnification:'low',effects:false}),t=[];
  for(let i=0;i<cut.coverage.length;i++)if(Number.isFinite(cut.coverage[i]))t.push(img.pixels[i*4]);return t.sort((x,y)=>x-y);};
 const tl=tones(low),th=tones(high),q=(t,f)=>t[Math.floor(t.length*f)];
 assert.ok(q(tl,.9)<110,`low: 90 % of pearlite is the dark unresolved tone (${q(tl,.9)})`);
 assert.ok(q(th,.5)>190&&q(th,.05)<170,`high: light ferrite with dark cementite lamellae (${q(th,.05)}–${q(th,.5)})`);
 assert.ok(lamellarTone(1,0,1)<lamellarTone(0,0,1)&&lamellarTone(1,5,1)===lamellarTone(0,5,1));
});

test('magnified sections are resampled, and identity maps still come from the model',()=>{
 const m=model(.45),texts=[],context={createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),putImageData(){},fillRect(){},strokeRect(){},fillText:t=>texts.push(t),measureText:s=>({width:s.length*5})};
 const canvas={getContext:()=>context};
 const high=renderSlice(canvas,m,{resolution:128,magnification:'high',info:false,effects:false}),raw=m.slice('z',1,128,undefined,2.5);
 for(let i=0;i<raw.phaseLabels.length;i++){assert.equal(high.sourceIndices[i],i);assert.equal(high.phaseLabels[i],raw.phaseLabels[i]);assert.equal(high.partLabels[i],raw.partLabels[i]);}
 const low=renderSlice(canvas,m,{resolution:128,magnification:'low',info:false,effects:false});
 assert.ok(Math.abs(low.pixelUm/high.pixelUm-2.5)<1e-9);
 // Legacy label maps without an appearance layer still render with the old crop zoom.
 const legacy={width:4,height:4,phaseCodes:['A'],partIds:['ferrite'],phaseLabels:new Uint8Array(16),partLabels:new Uint16Array(16),grainLabels:Uint32Array.from({length:16},(_,i)=>i),temperature:650,eutectoidTemperature:727};
 assert.notDeepEqual(Array.from(renderSlicePixels(legacy,{magnification:'high'}).sourceIndices),Array.from({length:16},(_,i)=>i));
});

test('above A1 (α + γ) ferrite uses the same rules: own grains, no prior γ boundary through it',()=>{
 const m=model(.209,737.6578),cut=m.slice('z',1,128),ferrite=cut.partIds.indexOf('proeutectoid-ferrite');
 assert.ok(ferrite>=0&&cut.phaseCodes.includes('G'),'intercritical state');
 let n=0;for(let i=0;i<cut.partLabels.length;i++)if(cut.partLabels[i]===ferrite){n++;assert.ok(cut.boundaryLabels[i]&FERRITE);}
 assert.ok(n>cut.partLabels.length*.4);
});
