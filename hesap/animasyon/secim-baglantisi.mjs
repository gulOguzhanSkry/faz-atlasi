/* MIT — source-calculated diagram → phase/constituent → cube explanation. */
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {createModel} from '../../web/mikroyapi/model.js';
import {renderSlicePixels} from '../../web/mikroyapi/kesit2d.js';
const root=fileURLToPath(new URL('../../',import.meta.url));
const read=p=>readFileSync(path.join(root,p),'utf8');
const data=JSON.parse(read('web/veri/fe_c.json')),context={};
runInNewContext(read('web/faz-durumu.js'),context);
runInNewContext(read('web/bilesen.js'),context);
const solver=context.FazDurumuMotoru.create(data),engine=context.FazBilesenMotoru.create(data,solver.durum);
const out=path.join(root,'private/secim-baglantisi');mkdirSync(out,{recursive:true});
const model=createModel({quality:'maximum',seed:20261101,invariants:data.invariants,eutectoidTemperature:data.invariants.otektoid.T});
const manifest={schema:1,scope:'Source-calculated explanatory diagram, not a captured web interface or kinetic simulation',carbon:.45,grains:384,resolution:512,states:[]};
for(const temperature of [900,780,740,650]){
 const result=engine.calculate(.45,temperature);if(result.status!=='resolved'||!model.setState(result,.45,temperature))throw new Error('Unresolved state');
 const files={};
 for(const [name,axis,depth] of [['top','z',1],['left','x',0],['right','y',0]]){
  const slice=model.slice(axis,depth,512),render=renderSlicePixels(slice,{mode:'phases',effects:false,magnification:'low',phaseColours:slice.colors.phases,partColours:slice.colors.constituents});
  files[name]=`${temperature}-${name}.rgba`;writeFileSync(path.join(out,files[name]),render.pixels);
 }
 manifest.states.push({temperature,phases:result.phases,parts:result.parts,files});console.log(`Selection link: .45% C / ${temperature} °C`);
}
writeFileSync(path.join(out,'manifest.json'),JSON.stringify(manifest,null,2));
writeFileSync(path.join(root,'web/gorseller/secim-mikroyapi.manifest.json'),JSON.stringify(manifest,null,2));
