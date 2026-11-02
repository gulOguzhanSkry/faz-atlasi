import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {runInNewContext} from 'node:vm';
import {data} from './source-solver.mjs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const report=JSON.parse(read('hesap/rapor/og/trace-comparison.json'));
const hashText=text=>createHash('sha256').update(text.replace(/\r\n/g,'\n'),'utf8').digest('hex');
const hashBasis='UTF-8 text with LF line endings (Git text normalization)';

test('stage 5 report hashes and every compared boundary agree with the unchanged original source query',()=>{
 assert.equal(report.hashBasis,hashBasis);
 const hash=path=>hashText(read(path));
 assert.equal(report.sourceDataSha256,hash('web/veri/fe_c.json'));assert.equal(report.sourceQuerySha256,hash('web/faz-durumu.js'));
 assert.equal(report.decision,'retain-source-data');assert.equal(report.comparedPoints,report.records.length);assert.equal(report.omittedPoints,report.omitted.length);
 const context={window:{FE_C_DATA:data},document:{addEventListener(){}},t:k=>k,DIL:'tr',YEREL:'tr-TR'};
 runInNewContext(read('web/app.js').split('/* ---------- çizim ---------- */')[0]+';globalThis.sourceRegions=bolgeler;',context);
 for(const r of report.records){
  const pair=context.sourceRegions(r.temperature).find(p=>p.p.join('+')===r.branch);
  assert.ok(pair,`${r.branch},${r.temperature}`);assert.equal(JSON.stringify(pair.x),JSON.stringify(r.source));
  r.deltaCarbon.forEach((delta,i)=>assert.equal(delta,r.candidate[i]-r.source[i]));
 }
 for(const b of report.branches){
  const rows=report.records.filter(r=>r.branch===b.branch);
  assert.equal(b.points,rows.length);assert.equal(b.maxAbsCarbonDifference,Math.max(...rows.flatMap(r=>r.deltaCarbon.map(Math.abs))));
 }
 assert.ok(report.candidateExclusions.length>0,'candidate exclusions remain visible rather than being treated as validated replacement data');
 assert.ok(report.branches.find(b=>b.branch==='L+C').maxAbsCarbonDifference>.07,'the material branch discrepancy must not disappear from the summary');
});

test('canonical text hashes survive CRLF/LF checkout conversion but detect actual numeric changes',()=>{
 for(const [path,before,after] of [['web/veri/fe_c.json','100000','100001'],['web/faz-durumu.js','1e-12','1e-11']]){
  const lf=read(path).replace(/\r\n/g,'\n'),crlf=lf.replace(/\n/g,'\r\n');
  assert.equal(hashText(lf),hashText(crlf));
  assert.ok(lf.includes(before));assert.notEqual(hashText(lf),hashText(lf.replace(before,after)),'a numeric content mutation must remain detectable');
 }
});

test('archived research JSON and preserved source-module provenance hashes use the declared LF text basis',()=>{
 for(const [manifestPath,folder,entries] of [['hesap/rapor/og/ham/SHA256SUMS.json','hesap/rapor/og/ham/','files'],['development/mikroyapi/PROVENANCE.json','development/mikroyapi/','modules']]){
  const manifest=JSON.parse(read(manifestPath));assert.equal(manifest.hashBasis,hashBasis,manifestPath);
  for(const entry of manifest[entries]){
   const name=entry.file??entry.input.split('/').at(-1),path=folder+name,canonical=read(path).replace(/\r\n/g,'\n');
   assert.equal(entry.sha256,hashText(canonical),path);
   if(entry.bytes!==undefined)assert.equal(entry.bytes,Buffer.byteLength(canonical,'utf8'),path+' canonical byte count');
  }
 }
});
