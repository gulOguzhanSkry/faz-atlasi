/* SPDX-License-Identifier: MIT — README morphology sections from the shared runtime model.
 * Constituent colours; θ inside pearlite and ledeburite drawn darker (box-filtered lamellae).
 * Run: node hesap/animasyon/readme-morfoloji.mjs && python hesap/animasyon/readme-morfoloji.py */
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {createModel} from '../../web/mikroyapi/model.js';
import {renderSlicePixels,lamellarPhaseWeight} from '../../web/mikroyapi/kesit2d.js';
const root=fileURLToPath(new URL('../../',import.meta.url)),out=path.join(root,'private','readme-morfoloji');mkdirSync(out,{recursive:true});
const read=p=>readFileSync(path.join(root,p),'utf8'),data=JSON.parse(read('web/veri/fe_c.json'));
const ctx={window:{FE_C_DATA:data},document:{addEventListener(){}},console,t:k=>k,DIL:'tr',YEREL:'tr-TR'};
runInNewContext(read('web/app.js').split('/* ---------- çizim ---------- */')[0]+';globalThis.solver=durum;',ctx);
const pure={console};runInNewContext(read('web/bilesen.js'),pure);const engine=pure.FazBilesenMotoru.create(data,ctx.solver);
const model=createModel({quality:'maximum',seed:20261101,eutectoidTemperature:data.invariants.otektoid.T,invariants:data.invariants});
const L=data.invariants.otektik.L,N=512,dark=[63,43,61],multi=new Set(['pearlite','ledeburite','transformed-ledeburite']);
const cases=[];
for(const [carbon,temperature] of [[.45,650],[1.2,650],[3.5,1000],[3,650],[L,1000],[5,650]]){
 const result=engine.calculate(carbon,temperature);if(result.status!=='resolved'||!model.setState(result,carbon,temperature))throw new Error(`Unresolved ${carbon} ${temperature}`);
 const raw=model.slice('z',.5,N),img=renderSlicePixels(raw,{mode:'constituents',magnification:'low',effects:false,phaseColours:raw.colors.phases,partColours:raw.colors.constituents});
 const px=img.pixels;
 for(let i=0;i<N*N;i++){
  const part=raw.partIds[raw.partLabels[i]],phase=raw.phaseCodes[raw.phaseLabels[i]];
  let w=0;
  if(Number.isFinite(raw.coverage[i]))w=lamellarPhaseWeight(i%N,(i/N)|0,raw.coverage[i],raw.thetaShare[i],raw.periodsPerPixel[i],raw.lamellaAngle[i]);
  else if(multi.has(part)&&phase==='C')w=1;
  if(w>0)for(let k=0;k<3;k++)px[4*i+k]=Math.round(px[4*i+k]*(1-.65*w)+dark[k]*.65*w);
 }
 const file=`${cases.length}.rgba`;writeFileSync(path.join(out,file),px);
 cases.push({carbon,temperature,file,phases:result.phases,parts:result.parts.filter(p=>p.fraction>0).map(p=>({id:p.id,fraction:p.fraction})),pixelUm:raw.pixelUm});
 console.log(`Morphology: ${carbon}% C, ${temperature} °C`);
}
writeFileSync(path.join(out,'manifest.json'),JSON.stringify({resolution:N,cases},null,1));
