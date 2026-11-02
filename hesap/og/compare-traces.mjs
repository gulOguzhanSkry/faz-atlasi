/** Compare a candidate traced pack to the shipped source table. No phase data
 * is changed. This is numerical comparison, not independent physical validation.
 * Usage: node hesap/og/compare-traces.mjs path/to/equilibrium-r01.json */
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
import {createHash} from 'node:crypto';
const root=new URL('../../',import.meta.url),read=async p=>(await readFile(new URL(p,root),'utf8')).replace(/\r\n/g,'\n');
const candidatePath=process.argv[2];if(!candidatePath)throw new Error('Provide a candidate traced pack path');
const raw=await readFile(candidatePath),candidate=JSON.parse(raw),data=JSON.parse(await read('web/veri/fe_c.json'));
const context={};runInNewContext(await read('web/faz-durumu.js'),context);const solver=context.FazDurumuMotoru.create(data);
const records=[],omitted=[];
for(const branch of candidate.boundaries){
  for(const point of branch.points){
    const region=solver.bolgeler(point.temperature).find(r=>r.p.join('+')===branch.phases.join('+'));
    if(!region){omitted.push({branch:branch.id,temperature:point.temperature,reason:'no matching source pair at this temperature'});continue;}
    records.push({branch:branch.id,temperature:point.temperature,source:region.x,candidate:point.carbon,deltaCarbon:point.carbon.map((v,i)=>v-region.x[i])});
  }
}
const names={eutectoid:'otektoid',eutectic:'otektik',peritectic:'peritektik'};
const invariants=candidate.invariants.map(event=>{
  const source=data.invariants[names[event.id]];if(!source)throw new Error('Unknown invariant');
  return {id:event.id,sourceTemperature:source.T,candidateTemperature:event.temperature,deltaTemperature:event.temperature-source.T,compositionDeltas:Object.fromEntries(Object.entries(event.compositions).map(([key,value])=>[key,{source:source[key],candidate:value,delta:value-source[key]}]))};
});
const branches=[...new Set(records.map(r=>r.branch))].map(branch=>{const rows=records.filter(r=>r.branch===branch);return {branch,points:rows.length,maxAbsCarbonDifference:Math.max(...rows.flatMap(r=>r.deltaCarbon.map(Math.abs)))};});
const report={schema:1,hashBasis:'UTF-8 text with LF line endings (Git text normalization)',scope:'Numerical source-table vs traced-pack comparison; same Fei–Brosh assessment, not experimental validation',sourceQuerySha256:createHash('sha256').update(await read('web/faz-durumu.js')).digest('hex'),sourceDataSha256:createHash('sha256').update(await read('web/veri/fe_c.json')).digest('hex'),candidateSha256:createHash('sha256').update(raw).digest('hex'),candidateRevision:candidate.revision,pressurePa:candidate.pressurePa,comparedPoints:records.length,omittedPoints:omitted.length,invariants,branches,candidateExclusions:candidate.exclusions??[],decision:'retain-source-data',reasons:['Invariant differences are small and do not establish physical superiority.','The L+C branch near 1223.47°C differs by up to 0.07752 weight-percentage points: the source nearest-topology-row choice is a material numerical limitation, not an accepted boundary there.','The traced candidate explicitly excludes dilute endpoints and the lower mapping edge.','No new independent experimental validation or complete endpoint acceptance is provided.','Replacing the source table would desynchronise the unchanged diagram and reference calculations.'],records,omitted};
const dir=new URL('hesap/rapor/og/',root);await mkdir(dir,{recursive:true});
await writeFile(new URL('trace-comparison.json',dir),JSON.stringify(report,null,2)+'\n');
const md=`# Stage 5 — trace comparison\n\nDecision: **retain the shipped source data**.\n\n${report.scope}.\n\nCompared ${records.length} paired-boundary points; ${omitted.length} candidate points had no matching source pair and are individually recorded.\n\n| Invariant | Source °C | Candidate °C | Difference °C |\n| --- | ---: | ---: | ---: |\n${invariants.map(e=>`| ${e.id} | ${e.sourceTemperature.toFixed(9)} | ${e.candidateTemperature.toFixed(9)} | ${e.deltaTemperature.toFixed(9)} |`).join('\n')}\n\n| Pair | Points | Maximum endpoint C difference (weight percentage points) |\n| --- | ---: | ---: |\n${branches.map(b=>`| ${b.branch} | ${b.points} | ${b.maxAbsCarbonDifference.toExponential(6)} |`).join('\n')}\n\n${report.reasons.map(r=>'- '+r).join('\n')}\n\nThe source query is extracted from app.js with a reproducible development command and tested against the original. This does not repair the source table's nearest-topology-row choice or certify narrow phase fields. Candidate boundary discrepancies are not rigorous physical uncertainty bounds. Raw experimental evidence remains absent.\n\nHashes, endpoint differences and omissions are in [trace-comparison.json](trace-comparison.json). No fe_c.json or fe_c.js data was overwritten.\n`;
await writeFile(new URL('TRACE_COMPARISON.md',dir),md);
console.log(JSON.stringify({comparedPoints:records.length,omittedPoints:omitted.length,branches,decision:report.decision},null,2));
