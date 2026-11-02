/* SPDX-License-Identifier: MIT — reproducible section sheet and magnification series.
 * Uses the shared runtime model and renderer; magnification resamples the window (realism 2).
 * Run: node hesap/animasyon/kesit-paftasi.mjs && python hesap/animasyon/kesit-paftasi.py */
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {createModel} from '../../web/mikroyapi/model.js';
import {renderSlicePixels,MAGNIFICATION_ZOOM} from '../../web/mikroyapi/kesit2d.js';
const root=fileURLToPath(new URL('../../',import.meta.url)),out=path.join(root,'private','kesit-paftasi');mkdirSync(out,{recursive:true});
const read=p=>readFileSync(path.join(root,p),'utf8'),data=JSON.parse(read('web/veri/fe_c.json'));
const ctx={window:{FE_C_DATA:data},document:{addEventListener(){}},console,t:k=>k,DIL:'tr',YEREL:'tr-TR'};
runInNewContext(read('web/app.js').split('/* ---------- çizim ---------- */')[0]+';globalThis.solver=durum;',ctx);
const pure={console};runInNewContext(read('web/bilesen.js'),pure);const engine=pure.FazBilesenMotoru.create(data,ctx.solver);
const model=createModel({quality:'maximum',seed:20261101,eutectoidTemperature:data.invariants.otektoid.T,invariants:data.invariants});
const N=320,meta=[];
const set=(c,t)=>{const r=engine.calculate(c,t);if(r.status!=='resolved'||!model.setState(r,c,t))throw new Error(`Unresolved ${c} ${t}`);};
for(const c of [.2,.45,.76,1.2,3,4.38,5]){
 set(c,650);
 for(const mag of ['low','medium','high']){const raw=model.slice('z',.5,N,{u:1,v:1},MAGNIFICATION_ZOOM[mag]);
  for(const mode of ['phases','constituents','etched']){
   const img=renderSlicePixels(raw,{mode,magnification:mag,effects:true,phaseColours:raw.colors.phases,partColours:raw.colors.constituents});
   const name=`${c}-${mag}-${mode}`;writeFileSync(path.join(out,`${name}.rgba`),img.pixels);meta.push({name,carbon:c,mag,mode,pixelUm:img.pixelUm,n:N});}}
 console.log(`Section sheet: ${c}% C`);
}
set(.45,650);
for(const z of [1,2.5,6,15]){const raw=model.slice('z',.5,512,{u:1,v:1},z);
 for(const mode of ['etched','phases']){const img=renderSlicePixels(raw,{mode,magnification:'low',effects:true,phaseColours:raw.colors.phases,partColours:raw.colors.constituents});
  const name=`zoom-${z}-${mode}`;writeFileSync(path.join(out,`${name}.rgba`),img.pixels);meta.push({name,zoom:z,pixelUm:raw.pixelUm,n:512});}}
writeFileSync(path.join(out,'meta.json'),JSON.stringify({N,meta,unitUm:model.active.unitUm},null,1));
console.log('Magnification series: 0.45% C');
