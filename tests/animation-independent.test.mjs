import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,statSync} from 'node:fs';
import {data,motor} from './source-solver.mjs';
const asset=name=>new URL('../web/gorseller/'+name,import.meta.url);
const manifest=JSON.parse(readFileSync(asset('mikroyapi-sogume.manifest.json'),'utf8'));

test('intro manifest derives every phase and constituent amount from the live source cooling path',()=>{
 const engine=motor();assert.equal(manifest.carbon,.45);assert.equal(manifest.seed,20261101);assert.equal(manifest.frameStates.length,56);
 assert.deepEqual(manifest.invariants,data.invariants);assert.equal(manifest.display.physicalTime,false);
 assert.deepEqual(manifest.display.faceAxes,{top:['z',1],left:['x',0],right:['y',0]});
 let previous=Infinity,progress=-Infinity,steps=0;
 for(const frame of manifest.frameStates){
  assert.ok(frame.temperature<=previous);previous=frame.temperature;
  const q=engine.calculate(manifest.carbon,frame.temperature,frame.xi);assert.equal(q.status,'resolved');
  assert.equal(JSON.stringify(frame.phases),JSON.stringify(q.phases));
  assert.deepEqual(frame.parts,JSON.parse(JSON.stringify(q.parts.map(p=>({id:p.id,fraction:p.fraction})))));
  if(frame.xi!==undefined){assert.equal(frame.temperature,data.invariants.otektoid.T);assert.ok(frame.xi>=progress);progress=frame.xi;steps++;}
 }
 assert.equal(steps,17);assert.equal(progress,1);assert.equal(previous,650);
 assert.equal(manifest.frameStates[0].phases.find(p=>p.f==='G').oran,1);
 assert.ok(manifest.frameStates.at(-1).phases.some(p=>p.f==='A'));
});

test('both language intro assets and the requested contact sheet are nonempty native media files',()=>{
 for(const lang of ['','-en']){
  const video=readFileSync(asset('mikroyapi-sogume'+lang+'.mp4'));
  assert.equal(video.toString('ascii',4,8),'ftyp');assert.ok(video.includes(Buffer.from('moov')));assert.ok(video.includes(Buffer.from('mdat')));assert.ok(video.length>100000);
  const poster=readFileSync(asset('mikroyapi-sogume'+lang+'-poster.webp'));
  assert.equal(poster.toString('ascii',0,4),'RIFF');assert.equal(poster.toString('ascii',8,12),'WEBP');
 }
 const sheet=readFileSync(asset('kesit-paftasi.png'));
 assert.equal(sheet.subarray(0,8).toString('hex'),'89504e470d0a1a0a');assert.ok(sheet.readUInt32BE(16)>1000);assert.ok(sheet.readUInt32BE(20)>1000);
 assert.ok(statSync(asset('kesit-paftasi.png')).size>100000);
});

test('all eight maximum-detail README gallery cases retain actual source phase, constituent and cementite mass budgets',()=>{
 const gallery=JSON.parse(readFileSync(asset('readme-microstructures.manifest.json'),'utf8')),engine=motor();
 assert.equal(gallery.quality,'maximum');assert.equal(gallery.grains,384);assert.equal(gallery.resolution,512);assert.equal(gallery.seed,20261101);
 assert.equal(gallery.cases.length,8);assert.deepEqual(gallery.invariants,data.invariants);assert.match(gallery.scope,/not UI screenshots or measured micrographs/);
 const expected=[.2,.45,data.invariants.otektoid.G,1.2,3,data.invariants.otektik.L,5,data.invariants.otektik.L];
 gallery.cases.forEach((item,i)=>{
  assert.equal(item.carbon,expected[i]);assert.equal(item.temperature,i===7?900:650);
  const result=engine.calculate(item.carbon,item.temperature);assert.equal(result.status,'resolved');
  assert.equal(JSON.stringify(item.phases),JSON.stringify(result.phases));
  assert.deepEqual(item.parts,JSON.parse(JSON.stringify(result.parts.map(p=>({id:p.id,fraction:p.fraction})))));
  assert.equal(item.thetaMassFraction,result.phases.find(p=>p.f==='C')?.oran??0);
  assert.ok(Math.abs(item.phases.reduce((s,p)=>s+p.oran*p.w,0)-item.carbon)<1e-8);
 });
});
