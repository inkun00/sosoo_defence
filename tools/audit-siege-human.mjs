import sharp from 'sharp';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),output=resolve(root,'test-results/siege-human-v2'),metadata={},reports=[];
const checkOnly=process.argv.includes('--check');
await mkdir(output,{recursive:true});
for(const role of ['guard','striker','scout']){
const name='siege-human-'+role+'-v2',path=resolve(root,'public/assets/dungeon/'+name+'.png'),threshold=32;
const {data,info}=await sharp(path).ensureAlpha().raw().toBuffer({resolveWithObject:true});
const {width,height}=info;
function components(data,width,height){
const labels=new Int32Array(width*height).fill(-1),parts=[];
for(let p=0;p<labels.length;p++){
 if(labels[p]>=0||data[p*4+3]<threshold)continue;
 const pixels=[p],id=parts.length;labels[p]=id;let sumX=0,sumY=0,minX=width,minY=height,maxX=-1,maxY=-1;
 for(let index=0;index<pixels.length;index++){
  const at=pixels[index],x=at%width,y=Math.floor(at/width);sumX+=x;sumY+=y;minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);
  for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
   const nx=x+dx,ny=y+dy;if(nx<0||nx>=width||ny<0||ny>=height)continue;
   const next=ny*width+nx;if(labels[next]>=0||data[next*4+3]<threshold)continue;labels[next]=id;pixels.push(next);
  }
 }
 parts.push({id,pixels,x:sumX/pixels.length,y:sumY/pixels.length,minX,minY,maxX,maxY});
}
return parts;
}
const parts=components(data,width,height),primary=[...parts].sort((a,b)=>b.pixels.length-a.pixels.length).slice(0,16);
if(primary.length!==16||primary.at(-1).pixels.length<primary[0].pixels.length/8)throw Error(name+': expected sixteen isolated human poses');
primary.sort((a,b)=>a.y-b.y);
for(let row=0;row<4;row++)primary.splice(row*4,4,...primary.slice(row*4,row*4+4).sort((a,b)=>a.x-b.x));
function spread(seeds){
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
const first=spread(primary.map((part,id)=>({pixels:part.pixels,id}))),mainIds=new Map(primary.map((part,id)=>[part.id,id]));
const seeds=parts.map(part=>{
 if(mainIds.has(part.id))return{pixels:part.pixels,id:mainIds.get(part.id)};
 const votes=new Uint32Array(16);for(const p of part.pixels)votes[first[p]]++;
 return{pixels:part.pixels,id:votes.indexOf(Math.max(...votes))};
});
const owner=spread(seeds);

function area(points){let sum=0;for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length];sum+=a[0]*b[1]-b[0]*a[1];}return sum/2;}
function boundary(id,rect){
 const edges=[],starts=new Map(),key=(x,y)=>y*(width+1)+x;
 const owned=(x,y)=>x>=rect.x&&x<rect.x+rect.width&&y>=rect.y&&y<rect.y+rect.height&&owner[y*width+x]===id;
 function add(x1,y1,x2,y2,direction){const index=edges.push({a:[x1,y1],b:[x2,y2],direction,used:false})-1,k=key(x1,y1);if(!starts.has(k))starts.set(k,[]);starts.get(k).push(index);}
 for(let y=rect.y;y<rect.y+rect.height;y++)for(let x=rect.x;x<rect.x+rect.width;x++)if(owned(x,y)){
  if(!owned(x,y-1))add(x,y,x+1,y,0);if(!owned(x+1,y))add(x+1,y,x+1,y+1,1);if(!owned(x,y+1))add(x+1,y+1,x,y+1,2);if(!owned(x-1,y))add(x,y+1,x,y,3);
 }
 const contours=[];
 for(let start=0;start<edges.length;start++){
  if(edges[start].used)continue;const points=[];let current=start;
  while(true){
   const edge=edges[current];if(edge.used)throw Error('Repeated mask edge');edge.used=true;points.push(edge.a);
   if(edge.b[0]===edges[start].a[0]&&edge.b[1]===edges[start].a[1])break;
   const candidates=(starts.get(key(...edge.b))??[]).filter(index=>!edges[index].used),directions=[(edge.direction+1)%4,edge.direction,(edge.direction+3)%4,(edge.direction+2)%4];
   current=candidates.sort((a,b)=>directions.indexOf(edges[a].direction)-directions.indexOf(edges[b].direction))[0];if(current===undefined)throw Error('Open mask');
  }
  contours.push(points);
 }
 const outer=contours.filter(points=>area(points)>0).sort((a,b)=>area(b)-area(a));if(outer.length!==1)throw Error('Expected one connected ownership mask');return outer[0];
}
function inside(points,x,y){
 let result=false;for(let i=0,j=points.length-1;i<points.length;j=i++){
  const a=points[i],b=points[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])result=!result;
 }return result;
}
function distance(point,a,b){const dx=b[0]-a[0],dy=b[1]-a[1],length=dx*dx+dy*dy,t=length?Math.max(0,Math.min(1,((point[0]-a[0])*dx+(point[1]-a[1])*dy)/length)):0;return(point[0]-a[0]-t*dx)**2+(point[1]-a[1]-t*dy)**2;}
function simplify(points,tolerance){
 if(points.length<=2)return points;let furthest=0,index=0;for(let i=1;i<points.length-1;i++){const d=distance(points[i],points[0],points.at(-1));if(d>furthest){furthest=d;index=i;}}
 if(furthest<=tolerance*tolerance)return[points[0],points.at(-1)];return[...simplify(points.slice(0,index+1),tolerance).slice(0,-1),...simplify(points.slice(index),tolerance)];
}
function simplifyClosed(points,tolerance){
 let split=1,furthest=0;for(let i=1;i<points.length;i++){const d=(points[i][0]-points[0][0])**2+(points[i][1]-points[0][1])**2;if(d>furthest){furthest=d;split=i;}}
 return[...simplify(points.slice(0,split+1),tolerance).slice(0,-1),...simplify([...points.slice(split),points[0]],tolerance).slice(0,-1)];
}
function check(id,rect,polygon){
 let retained=0,lost=0,adjacent=0,alphaSum=0;
 for(let y=rect.y;y<rect.y+rect.height;y++)for(let x=rect.x;x<rect.x+rect.width;x++){
  const p=y*width+x,alpha=data[p*4+3];if(!alpha)continue;const include=!polygon||inside(polygon,x+.5,y+.5);
  if(owner[p]===id){if(include){retained++;alphaSum+=alpha;}else lost++;}else if(include)adjacent++;
 }
 return{retained,lost,adjacent,alphaSum};
}
const bounds=primary.map((part,id)=>{
 let minX=width,minY=height,maxX=-1,maxY=-1;
 for(let p=0;p<owner.length;p++)if(owner[p]===id&&data[p*4+3]>0){const x=p%width,y=Math.floor(p/width);minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);}
 const x=Math.max(0,minX-2),y=Math.max(0,minY-2);
 // Register the body to its original column; weapon reach never recenters it.
 // The opaque foot baseline excludes faint detached antialiasing specks.
 return{x,y,width:Math.min(width,maxX+3)-x,height:Math.min(height,maxY+3)-y,anchorX:(id%4+.5)*width/4,anchorY:part.maxY+1};
});
const scale=Number(Math.min(...bounds.flatMap(f=>[110/Math.max(1,f.anchorX-f.x),110/Math.max(1,f.x+f.width-f.anchorX),204/Math.max(1,f.anchorY-f.y),15/Math.max(1,f.y+f.height-f.anchorY)])).toFixed(8));
const frames=[],audit=[],images=[];
for(let id=0;id<16;id++){
 const rect=bounds[id];let polygon;
 if(check(id,rect).adjacent){
  const exact=boundary(id,rect);
  for(const tolerance of [4,2,1,.5,.35,.175,0]){const candidate=simplifyClosed(exact,tolerance),result=check(id,rect,candidate);if(!result.lost&&!result.adjacent){polygon=candidate;break;}}
  if(!polygon)throw Error(name+': cannot isolate frame '+id);
 }
 const result=check(id,rect,polygon);if(result.lost||result.adjacent)throw Error('Unsafe human crop');
 frames.push({...rect,...(polygon?{polygon}:{})});audit.push({frame:id,...result,polygonPoints:polygon?.length??0});
 const pixels=Buffer.alloc(width*height*4);
 for(let y=rect.y;y<rect.y+rect.height;y++)for(let x=rect.x;x<rect.x+rect.width;x++)if(owner[y*width+x]===id){const p=(y*width+x)*4;data.copy(pixels,p,p,p+4);}
 const normal=await sharp(pixels,{raw:{width,height,channels:4}}).extract({left:rect.x,top:rect.y,width:rect.width,height:rect.height}).resize({width:Math.max(1,Math.round(rect.width*scale)),height:Math.max(1,Math.round(rect.height*scale))}).png().toBuffer();
 images.push({input:normal,left:id%4*240+8+Math.round(112+(rect.x-rect.anchorX)*scale),top:Math.floor(id/4)*240+8+Math.round(206.08+(rect.y-rect.anchorY)*scale)});
}
let visible=0,alphaSum=0;for(let p=0;p<owner.length;p++){if(data[p*4+3])visible++;alphaSum+=data[p*4+3];}
if(audit.reduce((sum,f)=>sum+f.retained,0)!==visible||audit.reduce((sum,f)=>sum+f.alphaSum,0)!==alphaSum)throw Error('Source alpha must be retained once');
metadata[role]={texture:name,sourceWidth:width,sourceHeight:height,scale,frames};
reports.push({role,width,height,frames:16,visible,alphaSum,scale,lost:0,neighborPixels:0,walkBodyHeight:(frames[0].anchorY-frames[0].y)*scale,audit});
await sharp({create:{width:960,height:960,channels:4,background:'#24272f'}}).composite(images).png().toFile(resolve(output,role+'-contact-sheet.png'));
}
const json=JSON.stringify(metadata,null,2)+'\n',destination=resolve(root,'src/secret-siege-human-atlas.json');
if(checkOnly){if(await readFile(destination,'utf8')!==json)throw Error('Human sprite metadata is stale');}else await writeFile(destination,json);
await writeFile(resolve(output,'audit.json'),JSON.stringify(reports,null,2)+'\n');
console.log(JSON.stringify(reports.map(({audit,...report})=>report)));
