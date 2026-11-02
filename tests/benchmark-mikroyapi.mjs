// Manual diagnostic, deliberately excluded from npm test: timings are machine-dependent.
// Run: node tests/benchmark-mikroyapi.mjs
import {performance} from 'node:perf_hooks';
import {data,motor} from './source-solver.mjs';
import {createModel} from '../web/mikroyapi/model.js';
const engine=motor(),model=createModel({quality:'balanced',seed:20261101,eutectoidTemperature:data.invariants.otektoid.T});
console.log(JSON.stringify({node:process.version,quality:model.quality,resolution:128,note:'First update includes occupancy setup; times exclude WebGL and canvas drawing.'}));
for(const carbon of [.2,.45,.76,1.2,3,4.38,5]){
 const result=engine.calculate(carbon,650),start=performance.now();
 model.setState(result,carbon,650);const afterUpdate=performance.now();
 model.slice('z',1,128);const afterSection=performance.now();
 console.log(JSON.stringify({carbon,temperature:650,updateMs:+(afterUpdate-start).toFixed(2),sectionMs:+(afterSection-afterUpdate).toFixed(2)}));
}
