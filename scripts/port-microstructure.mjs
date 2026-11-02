/* Development-only, MIT. Reproduce the plain JS geometry/atom modules from
 * the reviewed portfolio sources. No build is needed to use the web app.
 * Pass source checkout as argv[2]; all emitted modules are checked in. */
import {readFileSync,writeFileSync,mkdirSync,copyFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {createHash} from 'node:crypto';
import {transformSync} from 'esbuild';
const source=resolve(process.argv[2]||'../oguzhan-MME');
const files=[
 ['src/domain/phase-atlas/geometry/grain-volume.ts','tane-hacmi.js'],
 ['src/domain/phase-atlas/geometry/phase-occupancy.ts','faz-yerlesimi.js'],
 ['src/domain/phase-atlas/geometry/constituent-occupancy.ts','bilesen-yerlesimi.js'],
 ['src/domain/phase-atlas/crystal-structures.ts','kristal-yapilar.js'],
 ['src/domain/phase-atlas/carbon-population.ts','karbon-yerlesimi.js'],
 ['src/domain/phase-atlas/coordination-polyhedron.ts','koordinasyon.js'],
 ['src/scripts/phase-atlas/AtomicPhaseScene.ts','atom.js'],
];
const replacements={"'./grain-volume.ts'":"'./tane-hacmi.js'","'./crystal-structures.ts'":"'./kristal-yapilar.js'","'three'":"'../vendor/three/three.module.min.js'","'../../domain/phase-atlas/crystal-structures.ts'":"'./kristal-yapilar.js'","'../../domain/phase-atlas/carbon-population.ts'":"'./karbon-yerlesimi.js'","'../../domain/phase-atlas/coordination-polyhedron.ts'":"'./koordinasyon.js'"};
const manifest=[];
for(const [input,output] of files){
 let text=readFileSync(resolve(source,input),'utf8');
 copyFileSync(resolve(source,input),resolve('development/mikroyapi',input.split('/').at(-1)));
 if(output==='kristal-yapilar.js')text=text.replace("import cementite from '../../data/crystals/cementite-phase.json';",`const cementite=${readFileSync(resolve(source,'src/data/crystals/cementite-phase.json'),'utf8')};`);
 for(const [from,to] of Object.entries(replacements))text=text.replaceAll(from,to);
 const js=transformSync(text,{loader:'ts',format:'esm',target:'es2022',minify:false}).code;
 writeFileSync(resolve('web/mikroyapi',output),'/* SPDX-License-Identifier: MIT — port of OG portfolio geometry. See docs/STAGE3_DELIVERY.md. */\n'+js);
 manifest.push({input,output,sha256:createHash('sha256').update(readFileSync(resolve(source,input))).digest('hex')});
}
copyFileSync(resolve(source,'src/data/crystals/cementite-phase.json'),'development/mikroyapi/cementite-phase.json');
mkdirSync('web/vendor/three',{recursive:true});
for(const file of ['three.module.js','three.core.js']){
 const text=readFileSync(resolve(source,'node_modules/three/build',file),'utf8').replaceAll('./three.core.js','./three.core.min.js');
 writeFileSync(resolve('web/vendor/three',file.replace('.js','.min.js')),transformSync(text,{loader:'js',format:'esm',minify:true,target:'es2022',legalComments:'inline'}).code);
}
copyFileSync(resolve(source,'node_modules/three/LICENSE'),'web/vendor/three/LICENSE');
const controls=readFileSync(resolve(source,'node_modules/three/examples/jsm/controls/OrbitControls.js'),'utf8').replace("from 'three'","from './three.module.min.js'");
writeFileSync('web/vendor/three/OrbitControls.js',controls);
writeFileSync('development/mikroyapi/PROVENANCE.json',JSON.stringify({source:'oguzhan-MME',three:'0.186.1',modules:manifest},null,2)+'\n');
