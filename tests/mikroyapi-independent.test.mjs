import test from 'node:test';
import assert from 'node:assert/strict';
import {data,motor} from './source-solver.mjs';
import {createModel} from '../web/mikroyapi/model.js';
import {GrainVolume,generateGrainSeeds,extractGridSlice} from '../web/mikroyapi/tane-hacmi.js';
import {renderSlicePixels,renderSlice} from '../web/mikroyapi/kesit2d.js';

const engine=motor();
const options={quality:'economy',seed:491,eutectoidTemperature:data.invariants.otektoid.T};
const point=(axis,depth,u,v)=>axis==='x'?[depth,u,v]:axis==='y'?[u,depth,v]:[u,v,depth];
const count=labels=>labels.reduce((a,id)=>(a[id]=(a[id]||0)+1,a),{});

test('weighted grain ownership is deterministic, tie-stable and agrees with independent distance oracle',()=>{
 const seeds=[{id:2,position:[1,.5,.5],weight:0},{id:1,position:[0,.5,.5],weight:0}];
 const volume=new GrainVolume(seeds);
 assert.equal(volume.sample([.5,.5,.5]),1);
 for(const x of [.1,.49,.51,.9])assert.equal(volume.sample([x,.2,.8]),x<.5?1:2);
 const weighted=new GrainVolume([{...seeds[0],weight:.8},seeds[1]]);
 assert.equal(weighted.sample([.3,.5,.5]),2,'power weights must alter the boundary');
 const generated=generateGrainSeeds({seed:491,count:18,minimumDistance:.1,maxAttempts:5000});
 assert.deepEqual(generated,generateGrainSeeds({seed:491,count:18,minimumDistance:.1,maxAttempts:5000}));
 const v=new GrainVolume(generated.seeds);
 for(let i=0;i<50;i++){
  const p=[((i*17)%53)/53,((i*23)%59)/59,((i*7)%61)/61];
  const expected=[...generated.seeds].sort((a,b)=>a.position.reduce((s,x,j)=>s+(x-p[j])**2,0)-a.weight-(b.position.reduce((s,x,j)=>s+(x-p[j])**2,0)-b.weight)||a.id-b.id)[0].id;
  assert.equal(v.sample(p),expected);
 }
 const grid=v.rasterize([7,9,11]);
 for(const [axis,index] of [['x',3],['y',4],['z',5]]){
  const cut=extractGridSlice(grid,axis,index);
  assert.deepEqual(v.slice(axis,cut.coordinate,cut.width,cut.height).labels,cut.labels);
 }
 assert.throws(()=>v.sample([NaN,0,0]),RangeError);
});

test('seven requested compositions preserve voxel budgets and continuous samples agree at every voxel centre',()=>{
 const m=createModel(options),n=m.config.occupancy,total=n**3;
 for(const carbon of [.2,.45,.76,1.2,3,4.38,5]){
  const result=engine.calculate(carbon,650);assert.equal(result.status,'resolved');m.setState(result,carbon,650);
  const a=m.active,parts=count(a.partLabels),phases=count(a.labels);
  assert.equal(a.partBudgets.reduce((s,b)=>s+b.cells,0),total);
  for(let k=0;k<result.parts.length;k++){
   const q=result.parts[k],cells=parts[k]||0;
   assert.ok(Math.abs(cells-q.fraction*total)<1,`${carbon} ${q.id}: largest-remainder budget`);
   assert.equal(a.partBudgets[k].cells,cells);
  }
  for(let k=0;k<a.phases.length;k++){
   assert.equal(a.budgets.find(b=>b.code===a.phases[k]).cells,phases[k]||0);
   const source=result.phases.find(p=>p.f===a.phases[k]).oran;
   assert.ok(Math.abs((phases[k]||0)-source*total)<=result.parts.length,`${carbon}: independently bounded phase quantization`);
  }
  for(let z=0;z<n;z++)for(let y=0;y<n;y++)for(let x=0;x<n;x++){
   const i=x+n*(y+n*z),p=[(x+.5)/n,(y+.5)/n,(z+.5)/n];
   assert.equal(a.sample(p),a.phases[a.labels[i]],`${carbon}: phase at ${i}`);
   assert.equal(a.samplePart(p).id,result.parts[a.partLabels[i]].id,`${carbon}: constituent at ${i}`);
  }
 }
});

test('shared slice uses the same 3D points on all axes and updates after state changes',()=>{
 const m=createModel(options);m.setState(engine.calculate(.45,650),.45,650);
 for(const axis of ['x','y','z']){
  const cut=m.slice(axis,.375,16);
  for(let v=0;v<16;v++)for(let u=0;u<16;u++){
   const i=u+16*v,p=m.sample(point(axis,.375,(u+.5)/16,(v+.5)/16));
   assert.equal(cut.phaseCodes[cut.phaseLabels[i]],p.phase);
   assert.equal(cut.partIds[cut.partLabels[i]],p.part);
   assert.equal(cut.grainLabels[i],p.grain);
  }
 }
 const before=m.slice('z',1,16);
 m.setState(engine.calculate(.45,1000),.45,1000);
 const after=m.slice('z',1,16);
 assert.notDeepEqual(after.phaseLabels,before.phaseLabels);
 assert.equal(after.temperature,1000);
 m.setState({status:'needs-progress',parts:[],phases:[]},.45,data.invariants.otektoid.T);
 assert.equal(m.valid,false);assert.ok(m.slice('z',1,16).phaseLabels.every(v=>v===255));
});

test('slice rendering preserves identity in every mode and zoom; effects and seed only affect appearance',()=>{
 const m=createModel(options);m.setState(engine.calculate(3,650),3,650);
 const cut=m.slice('y',.45,24),copy=cut.phaseLabels.slice();
 for(const magnification of ['low','medium','high'])for(const mode of ['phases','constituents','grains','etched']){
  const a=renderSlicePixels(cut,{mode,magnification,effects:false}),b=renderSlicePixels(cut,{mode,magnification,effects:true});
  for(const field of ['phaseLabels','partLabels','grainLabels','sourceIndices'])assert.deepEqual(a[field],b[field]);
  for(let i=0;i<a.phaseLabels.length;i++){
   const s=a.sourceIndices[i];assert.equal(a.phaseLabels[i],cut.phaseLabels[s]);assert.equal(a.partLabels[i],cut.partLabels[s]);
   if(magnification==='low')assert.equal(s,i);
  }
  assert.deepEqual(b.pixels,renderSlicePixels(cut,{mode,magnification,effects:true}).pixels);
 }
 assert.deepEqual(cut.phaseLabels,copy,'rendering must not mutate the shared model');
});

test('etched tones order cementite > ferrite > pearlite and hot or residual-gamma sections fail to phase colours',()=>{
 const raw={width:3,height:1,phaseCodes:['A','C','G'],partIds:['ferrite','primary-cementite','pearlite'],phaseLabels:Uint8Array.of(0,1,0),partLabels:Uint16Array.of(0,1,2),grainLabels:Uint32Array.of(1,1,1),temperature:650,eutectoidTemperature:data.invariants.otektoid.T};
 const a=renderSlicePixels(raw,{mode:'etched',magnification:'low',effects:false});
 assert.ok(a.pixels[4]>a.pixels[0]&&a.pixels[0]>a.pixels[8]);
 for(const cut of [{...raw,temperature:900},{...raw,phaseLabels:Uint8Array.of(0,1,2)}]){
  const hot=renderSlicePixels(cut,{mode:'etched',magnification:'low',lang:'en'});
  assert.equal(hot.mode,'phases');assert.match(hot.warning,/Hot state/);
 }
});

test('canvas export includes composition, temperature and scientific scope in both languages',()=>{
 const texts=[],context={createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),putImageData(){},fillRect(){},strokeRect(){},fillText:(s,x,y)=>texts.push({s,x,y}),measureText:s=>({width:s.length*5})};
 const canvas={getContext:()=>context};
 const m=createModel(options);m.setState(engine.calculate(.45,650),.45,650);
 for(const lang of ['tr','en']){
  texts.length=0;const rendered=renderSlice(canvas,m,{resolution:192,lang,magnification:'low'}),text=texts.map(x=>x.s).join(' ');
  assert.equal(rendered.available,true);assert.ok(canvas.height>192);assert.match(text,/650/);
  assert.match(text,lang==='en'?/Assumed slow equilibrium cooling/:/Yavaş denge soğuması/);
  assert.match(text,lang==='en'?/not a measured micrograph/:/ölçülmüş mikrograf değildir/);
  assert.ok(texts.every(t=>t.y<canvas.height),'information strip must contain every line');
 }
 m.setState(engine.calculate(.45,1000),.45,1000);
 for(const resolution of [128,192,256])for(const lang of ['tr','en']){
  texts.length=0;const rendered=renderSlice(canvas,m,{resolution,lang,mode:'etched'});
  assert.equal(rendered.mode,'phases');assert.ok(rendered.warning);
  assert.ok(texts.every(t=>t.y<canvas.height),`${lang} hot warning clipped at ${resolution}px`);
  assert.match(texts.map(t=>t.s).join(' '),lang==='en'?/phase colours/:/Faz renkleri/);
 }
});
