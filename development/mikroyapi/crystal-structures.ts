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
