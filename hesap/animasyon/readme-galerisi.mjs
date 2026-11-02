/* SPDX-License-Identifier: MIT — README gallery from the actual shared runtime model, maximum detail.
 * Faces for the isometric cubes (top z=1, x=1, y=1) in phase, constituent and hybrid colours, plus an
 * etched section (medium magnification, resampled). Run:
 *   node hesap/animasyon/readme-galerisi.mjs && python hesap/animasyon/readme-galerisi.py */
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {createModel} from '../../web/mikroyapi/model.js';
import {renderSlicePixels,lamellarPhaseWeight,MAGNIFICATION_ZOOM} from '../../web/mikroyapi/kesit2d.js';
const root=fileURLToPath(new URL('../../',import.meta.url)),out=path.join(root,'private','readme-galerisi');mkdirSync(out,{recursive:true});
const read=p=>readFileSync(path.join(root,p),'utf8'),data=JSON.parse(read('web/veri/fe_c.json'));
const ctx={window:{FE_C_DATA:data},document:{addEventListener(){}},console,t:k=>k,DIL:'tr',YEREL:'tr-TR'};
runInNewContext(read('web/app.js').split('/* ---------- çizim ---------- */')[0]+';globalThis.solver=durum;',ctx);
const pure={console};runInNewContext(read('web/bilesen.js'),pure);const engine=pure.FazBilesenMotoru.create(data,ctx.solver);
const model=createModel({quality:'maximum',seed:20261101,eutectoidTemperature:data.invariants.otektoid.T,invariants:data.invariants});
const inputs=[{carbon:.2,temperature:650},{carbon:.45,temperature:650},{carbon:data.invariants.otektoid.G,temperature:650},{carbon:1.2,temperature:650},{carbon:3,temperature:650},{carbon:data.invariants.otektik.L,temperature:650},{carbon:5,temperature:650},{carbon:data.invariants.otektik.L,temperature:900}];
const manifest={schema:2,scope:'Offline schematic renders of the actual shared runtime model, not UI screenshots or measured micrographs',quality:'maximum',grains:model.config.grains,seed:20261101,resolution:512,invariants:data.invariants,cases:[]};
const F=384,dark=[63,43,61],multi=new Set(['pearlite','ledeburite','transformed-ledeburite']);
const rgbOf=(pixels,n,flip)=>{const o=new Uint8Array(n*n*3);for(let y=0;y<n;y++)for(let x=0;x<n;x++){const s=4*(x+n*(flip?n-1-y:y)),d=3*(x+n*y);o[d]=pixels[s];o[d+1]=pixels[s+1];o[d+2]=pixels[s+2];}return o;};
/** Constituent colours with θ inside pearlite/ledeburite darker (box-filtered lamellae when unresolved). */
function hybrid(raw){
 const n=raw.width,img=renderSlicePixels(raw,{mode:'constituents',magnification:'low',effects:false,phaseColours:raw.colors.phases,partColours:raw.colors.constituents}),px=img.pixels;
 for(let i=0;i<n*n;i++){const part=raw.partIds[raw.partLabels[i]],phase=raw.phaseCodes[raw.phaseLabels[i]];let w=0;
  if(Number.isFinite(raw.coverage[i]))w=lamellarPhaseWeight(i%n,(i/n)|0,raw.coverage[i],raw.thetaShare[i],raw.periodsPerPixel[i],raw.lamellaAngle[i]);
  else if(multi.has(part)&&phase==='C')w=1;
  if(w>0)for(let k=0;k<3;k++)px[4*i+k]=Math.round(px[4*i+k]*(1-.65*w)+dark[k]*.65*w);}
 return px;
}
export {hybrid};
for(let i=0;i<inputs.length;i++){
 const item=inputs[i],result=engine.calculate(item.carbon,item.temperature);
 if(result.status!=='resolved'||!model.setState(result,item.carbon,item.temperature))throw new Error(`Unresolved gallery case ${i}`);
 const files={};
 // Visible faces seen from (+x,+y,+z); x and y faces are flipped so that image rows run downwards in z.
 for(const [face,axis,flip] of [['top','z',false],['x','x',true],['y','y',true]]){
  const raw=model.slice(axis,1,F);
  for(const mode of ['phases','constituents','hybrid']){
   const px=mode==='hybrid'?hybrid(raw):renderSlicePixels(raw,{mode,magnification:'low',effects:false,phaseColours:raw.colors.phases,partColours:raw.colors.constituents}).pixels;
   const file=`${i}-${mode}-${face}.rgb`;writeFileSync(path.join(out,file),rgbOf(px,F,flip));files[`${mode}-${face}`]=file;
  }
 }
 const sec=model.slice('z',.5,manifest.resolution,{u:1,v:1},MAGNIFICATION_ZOOM.medium),etched=renderSlicePixels(sec,{mode:'etched',magnification:'medium',effects:true,phaseColours:sec.colors.phases,partColours:sec.colors.constituents});
 files.section=`${i}-section.rgb`;writeFileSync(path.join(out,files.section),rgbOf(etched.pixels,manifest.resolution,false));
 manifest.cases.push({...item,files,faceResolution:F,etchedValid:etched.mode==='etched',sectionPixelUm:etched.pixelUm,phases:result.phases,parts:result.parts.map(p=>({id:p.id,fraction:p.fraction})),thetaMassFraction:result.phases.find(p=>p.f==='C')?.oran||0});
 console.log(`Maximum-detail gallery ${i+1}/${inputs.length}: ${item.carbon}% C, ${item.temperature}°C`);
}
writeFileSync(path.join(out,'manifest.json'),JSON.stringify(manifest,null,2));
writeFileSync(path.join(root,'web/gorseller/readme-microstructures.manifest.json'),JSON.stringify(manifest,null,2));
