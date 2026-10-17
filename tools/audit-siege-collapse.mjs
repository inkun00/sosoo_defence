import sharp from 'sharp';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {packSpriteFrames} from './encode-sprite-frames.mjs';

// Match the established hero audit: keep generated PNG pixels untouched and
// assign every visible pixel to exactly one measured silhouette, then mask it.
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const name='siege-corrupted-citadel-collapse-v1',output=resolve(root,'test-results/secret-siege-art/collapse');
const path=resolve(root,`public/assets/dungeon/${name}.png`),threshold=32;
const {data,info}=await sharp(path).ensureAlpha().raw().toBuffer({resolveWithObject:true});
const {width,height}=info;
await mkdir(output,{recursive:true});

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
const parts=components(data,width,height);
const primary=[...parts].sort((a,b)=>b.pixels.length-a.pixels.length).slice(0,16);
if(primary.length!==16||primary.at(-1).pixels.length<primary[0].pixels.length/8)throw Error('Expected sixteen distinct citadel silhouettes');
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
 return{x,y,width:Math.min(width,maxX+3)-x,height:Math.min(height,maxY+3)-y,centerX:Math.round((part.minX+part.maxX+1)/2),groundY:part.maxY+1};
});
// Dust below the structural foot stays on canvas without moving the masonry.
const groundX=Math.ceil(Math.max(...bounds.map(frame=>Math.max(frame.centerX-frame.x,frame.x+frame.width-frame.centerX))))+8;
const groundY=Math.ceil(Math.max(...bounds.map(frame=>frame.groundY-frame.y)))+8;
const canvasWidth=groundX*2,canvasHeight=groundY+Math.ceil(Math.max(...bounds.map(frame=>frame.y+frame.height-frame.groundY)))+8;
const frames=[],audit=[],images=[];
for(let id=0;id<16;id++){
 const rect=bounds[id];let polygon;
 if(check(id,rect).adjacent){
  const exact=boundary(id,rect);
  for(const tolerance of [4,2,1,.5,.35,.175,0]){const candidate=simplifyClosed(exact,tolerance),result=check(id,rect,candidate);if(!result.lost&&!result.adjacent){polygon=candidate;break;}}
  if(!polygon)throw Error(`Frame ${id}: could not isolate adjacent sprites`);
 }
 const result=check(id,rect,polygon);if(result.lost||result.adjacent)throw Error('Unsafe frame mask');
 const frame={x:rect.x,y:rect.y,width:rect.width,height:rect.height,offsetX:groundX-rect.centerX+rect.x,offsetY:groundY-rect.groundY+rect.y,...(polygon?{polygon}:{})};
 frames.push(frame);audit.push({index:id,...result,structuralGroundY:rect.groundY,registeredGroundY:frame.offsetY+rect.groundY-frame.y,structuralWidth:primary[id].maxX-primary[id].minX+1,structuralHeight:primary[id].maxY-primary[id].minY+1,polygonPoints:polygon?.length??0});
 const pixels=Buffer.alloc(canvasWidth*canvasHeight*4);
 for(let y=0;y<frame.height;y++)for(let x=0;x<frame.width;x++){
  if(polygon&&!inside(polygon,frame.x+x+.5,frame.y+y+.5))continue;
  const from=((frame.y+y)*width+frame.x+x)*4,to=((frame.offsetY+y)*canvasWidth+frame.offsetX+x)*4;data.copy(pixels,to,from,from+4);
 }
 const preview=await sharp(pixels,{raw:{width:canvasWidth,height:canvasHeight,channels:4}}).resize(224,224,{fit:'contain',background:'#252737'}).flatten({background:'#252737'}).png().toBuffer();
 images.push({input:preview,left:id%4*240+8,top:Math.floor(id/4)*240+16});
}
let visible=0,alphaSum=0;for(let p=0;p<owner.length;p++){const alpha=data[p*4+3];if(alpha)visible++;alphaSum+=alpha;}
if(audit.reduce((sum,frame)=>sum+frame.retained,0)!==visible||audit.reduce((sum,frame)=>sum+frame.alphaSum,0)!==alphaSum)throw Error('Source alpha pixels must be retained exactly once');
// Register against the intact fortification's measured masonry, not its haze
// bounds or the differently padded illustration canvas. The renderer uses this
// source-pixel scale inside the same 224-pixel canonical fortification viewport.
const fortName='siege-corrupted-fortifications-v1';
const manifest=JSON.parse(await readFile(resolve(root,'src/art-manifest.json'),'utf8'));
const fort=JSON.parse(await readFile(resolve(root,'src/hero-sprite-frames.generated.json'),'utf8'))[fortName];
const fortImage=await sharp(resolve(root,'web-public'+manifest[fortName].url)).ensureAlpha().raw().toBuffer({resolveWithObject:true});
const fortParts=components(fortImage.data,fortImage.info.width,fortImage.info.height).sort((a,b)=>b.pixels.length-a.pixels.length).slice(0,12).sort((a,b)=>a.y-b.y);
const masonry=fortParts.slice(8,12).sort((a,b)=>a.x-b.x)[0],poses=fort.rows[2],column=fort.width/4,line=fort.height/3,unit=768/fort.width;
const left=Math.min(...poses.map((frame,index)=>(frame.x-index*column)*unit)),top=Math.min(...poses.map(frame=>(frame.y-2*line)*unit));
const right=Math.max(...poses.map((frame,index)=>(frame.x+frame.width-index*column)*unit)),bottom=Math.max(...poses.map(frame=>(frame.y+frame.height-2*line)*unit));
const side=Math.max(right-left,bottom-top)+8,viewportScale=224/side,viewportX=(side-(right-left))/2-left,viewportY=(side-(bottom-top))/2-top;
const reference={canvasSize:224,scale:(masonry.maxX-masonry.minX+1)*unit*viewportScale/(primary[0].maxX-primary[0].minX+1),groundX:(Math.round((masonry.minX+masonry.maxX+1)/2)*unit+viewportX)*viewportScale,groundY:((masonry.maxY+1-2*line)*unit+viewportY)*viewportScale};
const metadata={texture:name,sourceWidth:width,sourceHeight:height,canvasWidth,canvasHeight,groundX,groundY,reference,frames};
const metadataPath=resolve(root,'src/secret-siege-collapse-atlas.json'),serialized=JSON.stringify(packSpriteFrames(metadata))+'\n';
if(process.argv.includes('--check')){if(await readFile(metadataPath,'utf8')!==serialized)throw Error('Collapse metadata is stale; run node tools/audit-siege-collapse.mjs');}
else await writeFile(metadataPath,serialized);
await sharp({create:{width:960,height:960,channels:4,background:'#252737'}}).composite(images).png().toFile(resolve(output,'registered-frames.png'));
const referenceMasonry={centerX:Math.round((masonry.minX+masonry.maxX+1)/2),groundY:masonry.maxY+1,width:masonry.maxX-masonry.minX+1};
await writeFile(resolve(output,'frame-audit.json'),JSON.stringify({sourceWidth:width,sourceHeight:height,canvasWidth,canvasHeight,groundX,groundY,reference,referenceMasonry,visible,alphaSum,audit},null,2)+'\n');
console.log(`Audited 16 collapse frames: ${visible} visible pixels, no alpha loss or adjacent pixels; registered ground ${groundX},${groundY} in ${canvasWidth}×${canvasHeight} canvas; canonical scale ${reference.scale.toFixed(6)}.`);
