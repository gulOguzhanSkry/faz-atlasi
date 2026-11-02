/* SPDX-License-Identifier: MIT — reproducible 7-composition section review data. */
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {createModel} from '../../web/mikroyapi/model.js';
import {renderSlicePixels} from '../../web/mikroyapi/kesit2d.js';
const root=fileURLToPath(new URL('../../',import.meta.url)),out=path.join(root,'private','kesit-paftasi');mkdirSync(out,{recursive:true});
const read=p=>readFileSync(path.join(root,p),'utf8'),data=JSON.parse(read('web/veri/fe_c.json'));
const ctx={window:{FE_C_DATA:data},document:{addEventListener(){}},console,t:k=>k,DIL:'tr',YEREL:'tr-TR'};
runInNewContext(read('web/app.js').split('/* ---------- çizim ---------- */')[0]+';globalThis.solver=durum;',ctx);
const pure={console};runInNewContext(read('web/bilesen.js'),pure);const engine=pure.FazBilesenMotoru.create(data,ctx.solver);
const model=createModel({quality:'balanced',seed:20261101,eutectoidTemperature:data.invariants.otektoid.T,invariants:data.invariants});
const cases=[],resolution=256;
for(const carbon of [.2,.45,.76,1.2,3,4.38,5]){
 const state=engine.calculate(carbon,650);model.setState(state,carbon,650);
 const raw=model.slice('z',1,resolution);
 for(const mode of ['phases','constituents','etched'])for(const magnification of ['low','medium','high']){
  const file=`c${carbon}-${mode}-${magnification}.rgba`,render=renderSlicePixels(raw,{mode,magnification,effects:true,phaseColours:raw.colors.phases,partColours:raw.colors.constituents});
  writeFileSync(path.join(out,file),render.pixels);cases.push({carbon,temperature:650,mode,magnification,file});
 }
}
writeFileSync(path.join(out,'manifest.json'),JSON.stringify({resolution,seed:20261101,cases},null,2));
console.log(out);
