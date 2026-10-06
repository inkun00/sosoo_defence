import {stageMap} from './maps';
export interface Cell{x:number;y:number}
export const COLS=16,ROWS=9,TILE=58,OX=30,OY=46;
export const START:Cell={x:0,y:4},END:Cell={x:15,y:4};
export const key=(p:Cell)=>`${p.x},${p.y}`;
export function world(c:Cell){return {x:OX+(c.x+.5)*TILE,y:OY+(c.y+.5)*TILE};}
export function cellAt(x:number,y:number):Cell{return {x:Math.floor((x-OX)/TILE),y:Math.floor((y-OY)/TILE)};}
export function naturalBlocks(stage=1):Set<string>{
 const s=new Set<string>();for(const [x,y,width,height] of stageMap(stage).rocks)for(let dy=0;dy<height;dy++)for(let dx=0;dx<width;dx++)s.add(`${x+dx},${y+dy}`);return s;
}
export function route(blocks:Set<string>,start=START,end=END):Cell[]|null {
 if(blocks.has(key(start))||blocks.has(key(end)))return null;
 const queue=[start],prev=new Map<string,Cell|null>([[key(start),null]]);
 for(let i=0;i<queue.length;i++){
  const p=queue[i];if(key(p)===key(end)){let c:Cell|null=p;const result:Cell[]=[];while(c){result.unshift(c);c=prev.get(key(c))??null;}return result;}
  for(const [dx,dy] of [[1,0],[0,-1],[0,1],[-1,0]]){
   const q={x:p.x+dx,y:p.y+dy},k=key(q);
   if(q.x<0||q.x>=COLS||q.y<0||q.y>=ROWS||blocks.has(k)||prev.has(k))continue;
   prev.set(k,p);queue.push(q);
  }
 }
 return null;
}
