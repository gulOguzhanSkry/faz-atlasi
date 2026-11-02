import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
export const data=JSON.parse(readFileSync(new URL('../web/veri/fe_c.json',import.meta.url),'utf8'));
export function realSolver(){
 const context={window:{FE_C_DATA:data},document:{addEventListener(){}},t:key=>key,DIL:'tr',YEREL:'tr-TR'};
 const source=readFileSync(new URL('../web/app.js',import.meta.url),'utf8').split('/* ---------- çizim ---------- */')[0];
 runInNewContext(source+';globalThis.sourceSolver=durum;',context);return context.sourceSolver;
}
export function motor(){const context={window:{},console};runInNewContext(readFileSync(new URL('../web/bilesen.js',import.meta.url),'utf8'),context);return context.FazBilesenMotoru.create(data,realSolver());}

