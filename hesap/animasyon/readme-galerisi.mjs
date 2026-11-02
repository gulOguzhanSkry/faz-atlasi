/* MIT — README gallery from the actual source model, maximum detail. */
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {createModel} from '../../web/mikroyapi/model.js';
import {renderSlicePixels} from '../../web/mikroyapi/kesit2d.js';
const root=fileURLToPath(new URL('../../',import.meta.url)),out=path.join(root,'private','readme-galerisi');mkdirSync(out,{recursive:true});
const read=p=>readFileSync(path.join(root,p),'utf8'),data=JSON.parse(read('web/veri/fe_c.json'));
const ctx={window:{FE_C_DATA:data},document:{addEventListener(){}},console,t:k=>k,DIL:'tr',YEREL:'tr-TR'};
runInNewContext(read('web/app.js').split('/* ---------- çizim ---------- */')[0]+';globalThis.solver=durum;',ctx);
const pure={console};runInNewContext(read('web/bilesen.js'),pure);const engine=pure.FazBilesenMotoru.create(data,ctx.solver);
const model=createModel({quality:'maximum',seed:20261101,eutectoidTemperature:data.invariants.otektoid.T,invariants:data.invariants});
const inputs=[{carbon:.2,temperature:650},{carbon:.45,temperature:650},{carbon:data.invariants.otektoid.G,temperature:650},{carbon:1.2,temperature:650},{carbon:3,temperature:650},{carbon:data.invariants.otektik.L,temperature:650},{carbon:5,temperature:650},{carbon:data.invariants.otektik.L,temperature:900}];
const manifest={schema:1,scope:'Offline schematic renders of the actual shared runtime model, not UI screenshots or measured micrographs',quality:'maximum',grains:model.config.grains,seed:20261101,resolution:512,invariants:data.invariants,cases:[]};
for(let i=0;i<inputs.length;i++){
 const item=inputs[i],result=engine.calculate(item.carbon,item.temperature);
 if(result.status!=='resolved'||!model.setState(result,item.carbon,item.temperature))throw new Error(`Unresolved gallery case ${i}`);
 const files={phases:{},constituents:{},etched:{}};
 for(const [name,axis,depth] of [['top','z',1],['left','x',0],['right','y',0]]){
  const slice=model.slice(axis,depth,manifest.resolution);
  for(const mode of ['phases','constituents',...(name==='top'?['etched']:[])]){
   const rendered=renderSlicePixels(slice,{mode,magnification:'low',effects:mode==='etched',phaseColours:slice.colors.phases,partColours:slice.colors.constituents});
   const file=`${i}-${mode}-${name}.rgba`;writeFileSync(path.join(out,file),rendered.pixels);files[mode][name]=file;
  }
 }
 manifest.cases.push({...item,files,phases:result.phases,parts:result.parts.map(p=>({id:p.id,fraction:p.fraction})),thetaMassFraction:result.phases.find(p=>p.f==='C')?.oran||0});
 console.log(`Maximum-detail gallery ${i+1}/${inputs.length}: ${item.carbon}% C, ${item.temperature}°C`);
}
writeFileSync(path.join(out,'manifest.json'),JSON.stringify(manifest,null,2));
writeFileSync(path.join(root,'web/gorseller/readme-microstructures.manifest.json'),JSON.stringify(manifest,null,2));
