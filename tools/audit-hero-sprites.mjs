import sharp from 'sharp';
import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {packSpriteFrames} from './encode-sprite-frames.mjs';

// The sheets are illustrations, not an evenly spaced sprite grid. Keep their
// source files unchanged and describe the space belonging to each silhouette.
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const names=[...Array.from({length:10},(_,i)=>`heroes-level-${i+1}-v1`),'worksheet-heroes-v1'];
const threshold=32;
const output=resolve(root,'test-results/hero-crop-audit');
const manifest=JSON.parse(await readFile(resolve(root,'src/art-manifest.json'),'utf8'));
const metadata={},audit=[];
const checkOnly=process.argv.includes('--check');
await mkdir(output,{recursive:true});

function components(data,width,height){
 const labels=new Int32Array(width*height).fill(-1),parts=[];
 for(let p=0;p<labels.length;p++){
  if(labels[p]>=0||data[p*4+3]<threshold)continue;
  const pixels=[p],id=parts.length;labels[p]=id;let sumX=0,sumY=0;
  for(let index=0;index<pixels.length;index++){
   const at=pixels[index],x=at%width,y=Math.floor(at/width);sumX+=x;sumY+=y;
   for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
    const nx=x+dx,ny=y+dy;if(nx<0||nx>=width||ny<0||ny>=height)continue;
    const next=ny*width+nx;if(labels[next]>=0||data[next*4+3]<threshold)continue;
    labels[next]=id;pixels.push(next);
   }
  }
  parts.push({id,pixels,x:sumX/pixels.length,y:sumY/pixels.length});
 }
 return parts;
}

function silhouettes(parts,name){
 const primary=[...parts].sort((a,b)=>b.pixels.length-a.pixels.length).slice(0,12);
 if(primary.length!==12||primary.at(-1).pixels.length<primary[0].pixels.length/8)
  throw Error(`${name}: expected twelve distinct main silhouettes`);
 primary.sort((a,b)=>a.y-b.y);
 const ordered=[];
 for(let row=0;row<3;row++){
  const group=primary.slice(row*4,row*4+4).sort((a,b)=>a.x-b.x);
  group.forEach((part,frame)=>ordered.push({...part,row,frame}));
 }
 return ordered;
}

function spread(width,height,seeds){
 const owner=new Int16Array(width*height).fill(-1),queue=new Int32Array(owner.length);let tail=0;
 for(const {pixels,id}of seeds)for(const p of pixels){owner[p]=id;queue[tail++]=p;}
 for(let head=0;head<tail;head++){
  const p=queue[head],x=p%width,y=Math.floor(p/width);
  for(const next of [x+1<width?p+1:-1,y+1<height?p+width:-1,x>0?p-1:-1,y>0?p-width:-1]){
   if(next<0||owner[next]>=0)continue;owner[next]=owner[p];queue[tail++]=next;
  }
 }
 return owner;
}

function ownership(parts,primary,width,height){
 const first=spread(width,height,primary.map((part,id)=>({pixels:part.pixels,id})));
 const mainIds=new Map(primary.map((part,id)=>[part.id,id]));
 const seeds=parts.map(part=>{
  if(mainIds.has(part.id))return {pixels:part.pixels,id:mainIds.get(part.id)};
  // A detached spark, floating rock, or ring stays together. Give the entire
  // component to the main silhouette nearest to most of its visible pixels.
  const votes=new Uint32Array(12);for(const p of part.pixels)votes[first[p]]++;
  const id=votes.indexOf(Math.max(...votes));return {pixels:part.pixels,id};
 });
 return spread(width,height,seeds);
}

function visibleBounds(data,owner,id,width,height){
 let minX=width,minY=height,maxX=-1,maxY=-1;
 for(let p=0;p<owner.length;p++)if(owner[p]===id&&data[p*4+3]>0){
  const x=p%width,y=Math.floor(p/width);minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);
 }
 const x=Math.max(0,minX-2),y=Math.max(0,minY-2);
 return {x,y,width:Math.min(width,maxX+3)-x,height:Math.min(height,maxY+3)-y};
}

function signedArea(points){
 let value=0;for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length];value+=a[0]*b[1]-b[0]*a[1];}return value/2;
}

function boundary(owner,id,width,height,rect){
 const edges=[],starts=new Map();
 const owned=(x,y)=>x>=rect.x&&x<rect.x+rect.width&&y>=rect.y&&y<rect.y+rect.height&&owner[y*width+x]===id;
 const key=(x,y)=>y*(width+1)+x;
 function add(x1,y1,x2,y2,direction){const edge={a:[x1,y1],b:[x2,y2],direction,used:false};const index=edges.push(edge)-1,k=key(x1,y1);if(!starts.has(k))starts.set(k,[]);starts.get(k).push(index);}
 for(let y=rect.y;y<rect.y+rect.height;y++)for(let x=rect.x;x<rect.x+rect.width;x++)if(owned(x,y)){
  if(!owned(x,y-1))add(x,y,x+1,y,0);
  if(!owned(x+1,y))add(x+1,y,x+1,y+1,1);
  if(!owned(x,y+1))add(x+1,y+1,x,y+1,2);
  if(!owned(x-1,y))add(x,y+1,x,y,3);
 }
 const contours=[];
 for(let start=0;start<edges.length;start++){
  if(edges[start].used)continue;const points=[];let current=start;
  while(true){
   const edge=edges[current];if(edge.used)throw Error('Repeated contour edge');edge.used=true;points.push(edge.a);
   if(edge.b[0]===edges[start].a[0]&&edge.b[1]===edges[start].a[1])break;
   const candidates=(starts.get(key(...edge.b))??[]).filter(index=>!edges[index].used);
   const directions=[(edge.direction+1)%4,edge.direction,(edge.direction+3)%4,(edge.direction+2)%4];
   current=candidates.sort((a,b)=>directions.indexOf(edges[a].direction)-directions.indexOf(edges[b].direction))[0];
   if(current===undefined)throw Error('Open contour');
  }
  contours.push(points);
 }
 const outer=contours.filter(points=>signedArea(points)>0).sort((a,b)=>signedArea(b)-signedArea(a));
 if(outer.length!==1)throw Error(`Expected a connected ownership region, got ${outer.length}`);
 return outer[0];
}

function pointInside(points,x,y){
 let inside=false;for(let i=0,j=points.length-1;i<points.length;j=i++){
  const a=points[i],b=points[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])inside=!inside;
 }return inside;
}

function distanceSquared(point,a,b){
 const dx=b[0]-a[0],dy=b[1]-a[1],length=dx*dx+dy*dy;
 const t=length?Math.max(0,Math.min(1,((point[0]-a[0])*dx+(point[1]-a[1])*dy)/length)):0;
 return (point[0]-a[0]-t*dx)**2+(point[1]-a[1]-t*dy)**2;
}

function simplifyOpen(points,tolerance){
 if(points.length<=2)return points;let furthest=0,index=0;
 for(let i=1;i<points.length-1;i++){const distance=distanceSquared(points[i],points[0],points.at(-1));if(distance>furthest){furthest=distance;index=i;}}
 if(furthest<=tolerance*tolerance)return [points[0],points.at(-1)];
 return [...simplifyOpen(points.slice(0,index+1),tolerance).slice(0,-1),...simplifyOpen(points.slice(index),tolerance)];
}

function simplifyClosed(points,tolerance){
 let split=1,distance=0;for(let i=1;i<points.length;i++){const d=(points[i][0]-points[0][0])**2+(points[i][1]-points[0][1])**2;if(d>distance){distance=d;split=i;}}
 return [...simplifyOpen(points.slice(0,split+1),tolerance).slice(0,-1),...simplifyOpen([...points.slice(split),points[0]],tolerance).slice(0,-1)];
}

function checkFrame(data,owner,id,imageWidth,rect,polygon){
 let retained=0,lost=0,adjacent=0,excluded=0,alphaSum=0;
 for(let y=rect.y;y<rect.y+rect.height;y++)for(let x=rect.x;x<rect.x+rect.width;x++){
  const p=y*imageWidth+x,alpha=data[p*4+3];if(!alpha)continue;
  const inside=!polygon||pointInside(polygon,x+.5,y+.5);
  if(owner[p]===id){if(inside){retained++;alphaSum+=alpha;}else lost++;}
  else if(inside)adjacent++;else excluded++;
 }
 return {retainedVisiblePixels:retained,lostVisiblePixels:lost,adjacentVisiblePixels:adjacent,excludedAdjacentPixels:excluded,alphaSum};
}

for(const name of names){
 const path=resolve(root,'web-public'+manifest[name].url);
 const {data,info}=await sharp(path).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const parts=components(data,info.width,info.height),primary=silhouettes(parts,name),owner=ownership(parts,primary,info.width,info.height);
 const rows=[[],[],[]],images=[];
 for(let id=0;id<primary.length;id++){
  const part=primary[id],rect=visibleBounds(data,owner,id,info.width,info.height);let polygon;
  const rectangular=checkFrame(data,owner,id,info.width,rect);
  if(rectangular.adjacentVisiblePixels){
   const exact=boundary(owner,id,info.width,info.height,rect);
   for(const tolerance of [4,2,1,.5,.35,.175,0]){
    const candidate=simplifyClosed(exact,tolerance),result=checkFrame(data,owner,id,info.width,rect,candidate);
    if(!result.lostVisiblePixels&&!result.adjacentVisiblePixels){polygon=candidate;break;}
   }
   if(!polygon)throw Error(`${name} row ${part.row} frame ${part.frame}: no safe single polygon`);
  }
  const result=checkFrame(data,owner,id,info.width,rect,polygon);
  if(result.lostVisiblePixels||result.adjacentVisiblePixels)throw Error(`${name}: clipping audit failed`);
  for(const p of part.pixels)if(owner[p]!==id||polygon&&!pointInside(polygon,p%info.width+.5,Math.floor(p/info.width)+.5))throw Error(`${name}: main silhouette lost`);
  rows[part.row][part.frame]={...rect,...(polygon?{polygon}:{})};
  audit.push({sheet:name,row:part.row,frame:part.frame,...result,mainPixels:part.pixels.length,polygonPoints:polygon?.length??0});
  const pixels=Buffer.alloc(rect.width*rect.height*4);
  for(let y=0;y<rect.height;y++)for(let x=0;x<rect.width;x++){
   if(polygon&&!pointInside(polygon,rect.x+x+.5,rect.y+y+.5))continue;
   const p=((rect.y+y)*info.width+rect.x+x)*4;data.copy(pixels,(y*rect.width+x)*4,p,p+4);
  }
  images.push({input:await sharp(pixels,{raw:{width:rect.width,height:rect.height,channels:4}}).resize(220,220,{fit:'contain',background:'#272c39'}).flatten({background:'#272c39'}).png().toBuffer(),left:part.frame*240+10,top:part.row*246+24});
 }
 let visiblePixels=0,alphaSum=0;
 for(let p=0;p<info.width*info.height;p++){const alpha=data[p*4+3];if(alpha)visiblePixels++;alphaSum+=alpha;}
 const frames=audit.slice(-12);
 if(frames.reduce((sum,frame)=>sum+frame.retainedVisiblePixels,0)!==visiblePixels||frames.reduce((sum,frame)=>sum+frame.alphaSum,0)!==alphaSum)
  throw Error(`${name}: the frames must preserve every visible source pixel exactly once`);
 metadata[name]={width:info.width,height:info.height,rows};
 const captions=Buffer.from(`<svg width="960" height="738"><g fill="white" font-family="Arial" font-size="16">${[0,1,2].flatMap(row=>[0,1,2,3].map(frame=>`<text x="${frame*240+10}" y="${row*246+18}">${name.replace('heroes-level-','Lv ').replace('-v1','')} / v${row} f${frame}</text>`)).join('')}</g></svg>`);
 await sharp({create:{width:960,height:738,channels:4,background:'#272c39'}}).composite([...images,{input:captions}]).png().toFile(resolve(output,`${name}-audited.png`));
 const original=await sharp(resolve(root,`public/assets/dungeon/${name}.png`)).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 silhouettes(components(original.data,original.info.width,original.info.height),`${name} original`);
 console.log(`${name}: 12 complete frames; ${rows.flat().filter(frame=>frame.polygon).length} vector masks`);
}

const metadataPath=resolve(root,'src/hero-sprite-frames.generated.json');
const serialized=JSON.stringify(packSpriteFrames(metadata))+'\n';
if(checkOnly){
 if(await readFile(metadataPath,'utf8')!==serialized)throw Error('Hero frame metadata is stale; run node tools/audit-hero-sprites.mjs to regenerate it.');
 console.log('Checked-in hero frame metadata matches the audited sheets.');
}else await writeFile(metadataPath,serialized);
await writeFile(resolve(output,'frame-audit.json'),JSON.stringify(audit,null,2)+'\n');
console.log(`Audited ${audit.length} frames, lost visible pixels: ${audit.reduce((sum,frame)=>sum+frame.lostVisiblePixels,0)}, retained adjacent pixels: ${audit.reduce((sum,frame)=>sum+frame.adjacentVisiblePixels,0)}.`);
