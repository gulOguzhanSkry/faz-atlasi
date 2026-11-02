import cementite from '../../data/crystals/cementite-phase.json';
import type {PhaseCode} from './equilibrium.ts';
export type Position=readonly[number,number,number];
export interface CrystalAtom {element:'Fe'|'C';position:Position;role:'lattice'|'example'}
export interface PhaseCrystal {
 code:PhaseCode;name:string;system:string;cell:Position;atoms:CrystalAtom[];interstices:Position[];
 periodic:boolean;metalAtomsPerCell:number;carbonAtomsPerCell:number;description:string;scope:string;source:string;
}
const IRON_SOURCE='https://www.phase-trans.msm.cam.ac.uk/2003/Lattices/iron.html';
const BCC:Position[]=[[0,0,0],[.5,.5,.5]],FCC:Position[]=[[0,0,0],[0,.5,.5],[.5,0,.5],[.5,.5,0]];
export const OCTAHEDRAL={BCC:[[.5,0,0],[0,.5,0],[0,0,.5],[.5,.5,0],[.5,0,.5],[0,.5,.5]] as Position[],FCC:[[.5,.5,.5],[.5,0,0],[0,.5,0],[0,0,.5]] as Position[]};
export function phaseCrystal(code:PhaseCode):PhaseCrystal {
 const base={code,cell:[1,1,1] as Position,periodic:true,carbonAtomsPerCell:0,source:IRON_SOURCE};
 if(code==='A'||code==='D')return {...base,name:code==='A'?'α-ferrit':'δ-ferrit',system:'HMK / BCC · Im3̅m (#229)',atoms:BCC.map(position=>({element:'Fe',position,role:'lattice'})),interstices:OCTAHEDRAL.BCC,metalAtomsPerCell:2,
  description:'Fe köşelerde ve gövde merkezinde. Çözünmüş C, çarpık oktahedral arayerlerde bulunur: iki yakın ve dört daha uzak Fe komşusu.',scope:'α ve δ aynı kafes türüne sahiptir. C bir yerleşim örneğidir; seçili karbon yüzdesini temsil etmez. Boyut normalize edilmiştir; sıcaklıkla genleşme veya C kaynaklı yerel gevşeme hesaplanmaz.'};
 if(code==='G')return {...base,name:'γ-östenit',system:'YMK / FCC · Fm3̅m (#225)',atoms:FCC.map(position=>({element:'Fe',position,role:'lattice'})),interstices:OCTAHEDRAL.FCC,metalAtomsPerCell:4,
  description:'Fe köşelerde ve yüz merkezlerinde. C gövde merkezindeki ve kenar ortalarındaki oktahedral arayerlere yerleşebilir; altı eş uzaklıklı Fe komşusu bulunur.',scope:'Gösterilen C yalnız bir yerleşim örneğidir; bütün arayerler dolu değildir ve seçili ağ.% C oranını temsil etmez.'};
 if(code==='C')return {...base,name:'θ-sementit · Fe₃C',system:'Ortorombik · Pnma (#62) · oP16',cell:[cementite.cell.a,cementite.cell.b,cementite.cell.c],atoms:cementite.atoms.map(a=>({element:a.element as 'Fe'|'C',position:a.position as unknown as Position,role:'lattice'})),interstices:[],metalAtomsPerCell:12,carbonAtomsPerCell:4,source:cementite.source.url,
  description:'Fe: 4c ve 8d; C: 4c konumları. Bir hücrede 12 Fe + 4 C, yani dört Fe₃C formül birimi bulunur. C çevresindeki altı Fe yaklaşık trigonal prizma oluşturur.',scope:'Kaynak AFLOW prototipidir; a=5,090 Å, b=6,748 Å, c=4,523 Å. Bu sabit referans geometri seçili sıcaklığın ölçülmüş yapısı değildir.'};
 if(code!=='L')throw new RangeError('Unsupported phase crystal');
 let state=19631101;const random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
 const atoms:CrystalAtom[]=[];for(let tries=0;atoms.length<38&&tries<10000;tries++){const position:Position=[random(),random(),random()];if(atoms.every(a=>a.position.reduce((s,x,i)=>s+(x-position[i])**2,0)>.12**2))atoms.push({element:atoms.length<36?'Fe':'C',position,role:'example'});}
 return {...base,name:'Sıvı · Fe–C',system:'Periyodik kristal kafesi yok',periodic:false,metalAtomsPerCell:0,atoms,interstices:[],source:'https://www.phase-trans.msm.cam.ac.uk/2003/Lattices/cementite.html',description:'Atomların uzun menzilli periyodik dizilimi yoktur. Bu düzensiz anlık yerleşim yalnız sıvı ile kristal ayrımını anlatır.',scope:'Bu bir moleküler dinamik simülasyonu değildir. Komşuluk istatistiği, atom hareketi veya seçili bileşim modellenmez.'};
}
/** Periodic images in a closed cell box, for teaching shared corner/face atoms. */
export function crystalImages(crystal:PhaseCrystal,repetitions:number):CrystalAtom[] {
 if(!Number.isInteger(repetitions)||repetitions<1||repetitions>8)throw new RangeError('One to eight cells per axis');
 if(!crystal.periodic)return crystal.atoms.map(a=>({...a}));
 const atoms:CrystalAtom[]=[];
 for(const atom of crystal.atoms)for(let x=0;x<=repetitions;x++)for(let y=0;y<=repetitions;y++)for(let z=0;z<=repetitions;z++){
  const position:Position=[atom.position[0]+x,atom.position[1]+y,atom.position[2]+z];
  if(position.every(c=>c<=repetitions+1e-10))atoms.push({...atom,position});
 }
 return atoms;
}
export function exampleCarbon(crystal:PhaseCrystal,repetitions:number):Position|null {
 if(crystal.code==='C')return crystal.atoms.find(a=>a.element==='C')!.position;
 if(crystal.code==='L')return null;
 return crystal.code==='G'?[.5,.5,.5]:repetitions>=2?[.5,.5,1]:[.5,.5,0];
}
/** Six nearest Fe images in Cartesian metric, including atoms across cell walls. */
export function carbonNeighbours(crystal:PhaseCrystal,carbon:Position):{position:Position;distance:number}[] {
 if(!crystal.periodic)return [];
 const candidates:{position:Position;distance:number}[]=[];
 const origin=carbon.map(Math.floor);
 for(const atom of crystal.atoms.filter(a=>a.element==='Fe'))for(let x=origin[0]-1;x<=origin[0]+1;x++)for(let y=origin[1]-1;y<=origin[1]+1;y++)for(let z=origin[2]-1;z<=origin[2]+1;z++){
  const position:Position=[atom.position[0]+x,atom.position[1]+y,atom.position[2]+z];
  const distance=Math.sqrt(position.reduce((s,p,i)=>s+((p-carbon[i])*crystal.cell[i])**2,0));candidates.push({position,distance});
 }
 return candidates.sort((a,b)=>a.distance-b.distance).slice(0,6);
}

/* ---------- Teaching geometry (ideal hard-sphere model, cell units) ---------- */
/** Tetrahedral interstices, half-open cell listing (each site once per cell). */
export const TETRAHEDRAL={
 FCC:[[.25,.25,.25],[.75,.25,.25],[.25,.75,.25],[.25,.25,.75],[.75,.75,.25],[.75,.25,.75],[.25,.75,.75],[.75,.75,.75]] as Position[],
 BCC:[[0,.5,.25],[0,.5,.75],[0,.25,.5],[0,.75,.5],[.5,0,.25],[.5,0,.75],[.25,0,.5],[.75,0,.5],[.5,.25,0],[.5,.75,0],[.25,.5,0],[.75,.5,0]] as Position[],
};
export type SiteClass='corner'|'edge'|'face'|'body';
const SHARE:Record<SiteClass,number>={corner:1/8,edge:1/4,face:1/2,body:1};
const onWall=(v:number)=>Math.abs(v)<1e-9||Math.abs(v-1)<1e-9;
/** Position inside one closed unit cell: how many coordinates lie on a wall. */
export function classifySite(p:Position):SiteClass{const n=p.filter(onWall).length;return n===3?'corner':n===2?'edge':n===1?'face':'body';}
export function siteShare(p:Position):number{return SHARE[classifySite(p)];}
/** Net atoms per unit cell from the closed-box images, counted by sharing class. */
export function cellShareCount(crystal:PhaseCrystal):{element:'Fe'|'C';byClass:Record<SiteClass,number>;total:number}[]{
 if(!crystal.periodic)return [];
 const images=crystalImages(crystal,1);
 return (['Fe','C'] as const).map(element=>{
  const byClass:Record<SiteClass,number>={corner:0,edge:0,face:0,body:0};
  for(const atom of images)if(atom.element===element)byClass[classifySite(atom.position)]++;
  const total=(Object.keys(byClass) as SiteClass[]).reduce((s,k)=>s+byClass[k]*SHARE[k],0);
  return {element,byClass,total};
 }).filter(row=>row.total>0);
}
function cubicFamily(crystal:PhaseCrystal):'FCC'|'BCC'|null{return crystal.code==='G'?'FCC':crystal.code==='A'||crystal.code==='D'?'BCC':null;}
/** Ideal hard-sphere Fe radius as a fraction of the cubic lattice parameter (touching along the close-packed direction). */
export function ironRadius(crystal:PhaseCrystal):number|null{const f=cubicFamily(crystal);return f==='FCC'?Math.SQRT2/4:f==='BCC'?Math.sqrt(3)/4:null;}
export function packingFraction(crystal:PhaseCrystal):number|null{
 const R=ironRadius(crystal);if(R===null)return null;
 const fe=cellShareCount(crystal).find(r=>r.element==='Fe')!.total;
 return fe*4/3*Math.PI*R**3/(crystal.cell[0]*crystal.cell[1]*crystal.cell[2]);
}
/** Fe images around a point (periodic), sorted by Cartesian distance in cell units. */
function ironDistances(crystal:PhaseCrystal,p:Position):number[]{
 const out:number[]=[];const o=p.map(Math.floor);
 for(const atom of crystal.atoms)if(atom.element==='Fe')for(let x=o[0]-1;x<=o[0]+1;x++)for(let y=o[1]-1;y<=o[1]+1;y++)for(let z=o[2]-1;z<=o[2]+1;z++){
  const d=Math.sqrt([atom.position[0]+x,atom.position[1]+y,atom.position[2]+z].reduce((s,v,i)=>s+((v-p[i])*crystal.cell[i])**2,0));if(d>1e-9)out.push(d);
 }
 return out.sort((a,b)=>a-b);
}
/** Number of equidistant nearest Fe neighbours of a lattice Fe atom (12 for FCC, 8 for BCC). */
export function coordinationNumber(crystal:PhaseCrystal):number|null{
 if(!crystal.periodic||cubicFamily(crystal)===null)return null;
 const fe=crystal.atoms.find(a=>a.element==='Fe')!.position,d=ironDistances(crystal,fe);
 return d.filter(v=>v<d[0]*(1+1e-6)).length;
}
export type InterstitialKind='octa'|'tetra';
export interface InterstitialSite {kind:InterstitialKind;position:Position;neighbours:number;ratio:number;nearest:number}
/** Octahedral and tetrahedral sites with ideal free radius r/R = (nearest Fe distance − R)/R. */
export function interstitialSites(crystal:PhaseCrystal):InterstitialSite[]{
 const f=cubicFamily(crystal),R=ironRadius(crystal);if(!f||R===null)return [];
 const out:InterstitialSite[]=[];
 for(const [kind,list,neighbours] of [['octa',OCTAHEDRAL[f],6],['tetra',TETRAHEDRAL[f],4]] as const)for(const position of list){
  const nearest=ironDistances(crystal,position)[0];out.push({kind,position,neighbours,ratio:(nearest-R)/R,nearest});
 }
 return out;
}
/** Per-kind summary: net sites per cell and ideal r/R. */
export function interstitialSummary(crystal:PhaseCrystal):{kind:InterstitialKind;perCell:number;ratio:number;neighbours:number}[]{
 const sites=interstitialSites(crystal);
 return (['octa','tetra'] as const).map(kind=>{const s=sites.filter(x=>x.kind===kind);return {kind,perCell:s.length,ratio:s[0]?.ratio??NaN,neighbours:s[0]?.neighbours??0};}).filter(x=>x.perCell>0);
}
/** Closed-box images of half-open site positions inside an n³ block. */
export function siteImages(positions:readonly Position[],n=1):Position[]{
 const out:Position[]=[];
 for(let x=0;x<n;x++)for(let y=0;y<n;y++)for(let z=0;z<n;z++)for(const p of positions){
  const q:Position=[p[0]+x,p[1]+y,p[2]+z];
  for(const a of Math.abs(q[0])<1e-9?[0,n]:[q[0]])for(const b of Math.abs(q[1])<1e-9?[0,n]:[q[1]])for(const c of Math.abs(q[2])<1e-9?[0,n]:[q[2]])out.push([a,b,c]);
 }
 const seen=new Set<string>();return out.filter(p=>{const k=p.map(v=>v.toFixed(6)).join();if(seen.has(k))return false;seen.add(k);return true;});
}
/**
 * Reference lattice parameters at the α/γ transformation (≈912 °C), used only to put both
 * cells on one Å scale. Basinski, Hume-Rothery & Sutton, Proc. R. Soc. A 229 (1955) 459.
 */
export const REFERENCE_LATTICE={A:{a:2.904,temperature:912},G:{a:3.647,temperature:912}} as const;
/** Approximate covalent radius of carbon, Å (comparison only; not a solute size in the lattice). */
export const CARBON_RADIUS_ANGSTROM=.77;
export function radiiAngstrom(code:'A'|'G'):{iron:number;octa:number;tetra:number;a:number;temperature:number}{
 const crystal=phaseCrystal(code),{a,temperature}=REFERENCE_LATTICE[code],R=ironRadius(crystal)!*a,s=interstitialSummary(crystal);
 return {a,temperature,iron:R,octa:s.find(x=>x.kind==='octa')!.ratio*R,tetra:s.find(x=>x.kind==='tetra')!.ratio*R};
}
