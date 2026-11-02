/* SPDX-License-Identifier: MIT
 * Offline preparation only. Runtime web/ needs neither Node nor a build.
 * Uses the atlas's actual solver, constituent engine and shared 3D model.
 */
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {runInNewContext} from 'node:vm';
import {createModel} from '../../web/mikroyapi/model.js';
import {renderSlicePixels} from '../../web/mikroyapi/kesit2d.js';

const root=fileURLToPath(new URL('../../',import.meta.url));
const destination=path.resolve(process.argv[2]||path.join(root,'private','animasyon-kareleri'));
mkdirSync(destination,{recursive:true});
const data=JSON.parse(readFileSync(path.join(root,'web/veri/fe_c.json'),'utf8'));
const read=p=>readFileSync(path.join(root,p),'utf8');
const context={window:{FE_C_DATA:data},document:{addEventListener(){}},console,t:k=>k,DIL:'tr',YEREL:'tr-TR'};
runInNewContext(read('web/app.js').split('/* ---------- çizim ---------- */')[0]+';globalThis.solver=durum;',context);
const pure={console};runInNewContext(read('web/bilesen.js'),pure);
const engine=pure.FazBilesenMotoru.create(data,context.solver);
const e=data.invariants.otektoid;
const model=createModel({quality:'balanced',seed:20261101,eutectoidTemperature:e.T,invariants:data.invariants});
const timeline=[];
const ramp=(from,to,count)=>{for(let i=0;i<count;i++)timeline.push({temperature:from+(to-from)*i/(count-1)});};
ramp(900,e.T+.2,24);
for(let i=0;i<17;i++)timeline.push({temperature:e.T,xi:i/16});
ramp(e.T-.2,650,15);
const manifest={schema:1,carbon:.45,seed:20261101,quality:'balanced',resolution:192,invariants:data.invariants,
 source:'web/app.js durum + web/bilesen.js + web/mikroyapi/model.js',frames:[]};
for(let i=0;i<timeline.length;i++){
 const state=timeline[i],result=engine.calculate(.45,state.temperature,state.xi);
 if(result.status!=='resolved')throw new Error(`Frame ${i}: ${result.status}`);
 model.setState(result,.45,state.temperature);
 const files={};
 for(const [name,axis,depth] of [['top','z',1],['left','x',0],['right','y',0]]){
  const slice=model.slice(axis,depth,manifest.resolution);
  const pixels=renderSlicePixels(slice,{mode:'phases',magnification:'low',effects:false,phaseColours:slice.colors.phases});
  const file=`${String(i).padStart(3,'0')}-${name}.rgba`;
  writeFileSync(path.join(destination,file),pixels.pixels);files[name]=file;
 }
 manifest.frames.push({...state,files,phases:result.phases,parts:result.parts.map(p=>({id:p.id,fraction:p.fraction}))});
 if(i%10===0)process.stdout.write(`Prepared ${i+1}/${timeline.length}\n`);
}
writeFileSync(path.join(destination,'manifest.json'),JSON.stringify(manifest,null,2));
process.stdout.write(`Prepared ${timeline.length} source-computed frames in ${destination}\n`);
