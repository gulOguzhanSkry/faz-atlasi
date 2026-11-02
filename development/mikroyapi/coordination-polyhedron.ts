import type {Position} from './crystal-structures.ts';
const sub=(a:Position,b:Position):Position=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]];
const dot=(a:Position,b:Position)=>a.reduce((s,v,i)=>s+v*b[i],0);
const cross=(a:Position,b:Position):Position=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
/** Convex hull of a small coordination shell; merges coplanar faces before triangulation. */
export function coordinationHull(vertices:readonly Position[]):number[] {
 if(vertices.length!==6||vertices.some(p=>p.length!==3||p.some(v=>!Number.isFinite(v))))throw new RangeError('Six finite coordination vertices required');
 const faces=new Map<string,{ids:number[];normal:Position}>(),centre=vertices.reduce((s,p)=>s.map((v,i)=>v+p[i]/6) as unknown as Position,[0,0,0] as Position);
 for(let i=0;i<6;i++)for(let j=i+1;j<6;j++)for(let k=j+1;k<6;k++){
  let normal=cross(sub(vertices[j],vertices[i]),sub(vertices[k],vertices[i]));const length=Math.sqrt(dot(normal,normal));if(length<1e-10)continue;
  normal=normal.map(v=>v/length) as unknown as Position;
  const d=vertices.map(p=>dot(normal,sub(p,vertices[i])));if(d.some(v=>v>1e-8)&&d.some(v=>v< -1e-8))continue;
  if(dot(normal,sub(centre,vertices[i]))>0)normal=normal.map(v=>-v) as unknown as Position;
  const ids=d.flatMap((v,id)=>Math.abs(v)<1e-8?[id]:[]);faces.set(ids.join(','),{ids,normal});
 }
 const triangles:number[]=[];
 for(const {ids,normal} of faces.values()){
  const c=ids.reduce((s,id)=>s.map((v,i)=>v+vertices[id][i]/ids.length) as unknown as Position,[0,0,0] as Position),u=sub(vertices[ids[0]],c),v=cross(normal,u);
  ids.sort((a,b)=>Math.atan2(dot(sub(vertices[a],c),v),dot(sub(vertices[a],c),u))-Math.atan2(dot(sub(vertices[b],c),v),dot(sub(vertices[b],c),u)));
  for(let i=1;i<ids.length-1;i++)triangles.push(ids[0],ids[i],ids[i+1]);
 }
 if(!triangles.length)throw new Error('Degenerate coordination shell');return triangles;
}
