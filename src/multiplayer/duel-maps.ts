export interface DuelMapPoint{x:number;y:number;}
export interface DuelPathPosition extends DuelMapPoint{dx:number;dy:number;}
export interface DuelMap{id:string;name:string;description:string;points:readonly DuelMapPoint[];roadCells:readonly DuelMapPoint[];length:number;}

const COLUMNS=24,BASE_LENGTH=COLUMNS-1;
function map(id:string,name:string,description:string,left:readonly (readonly [number,number])[]):DuelMap{
 const tuples=[...left,[12,3] as const,...left.slice(0,-1).reverse().map(([x,y])=>[BASE_LENGTH-x,y] as const)];
 const points=tuples.map(([x,y])=>Object.freeze({x,y})),roadCells:DuelMapPoint[]=[];let length=0;
 for(let i=0;i<points.length-1;i++){
  const a=points[i],b=points[i+1],distance=Math.hypot(b.x-a.x,b.y-a.y),dx=Math.sign(b.x-a.x),dy=Math.sign(b.y-a.y);
  if(dx&&dy)throw Error('대전 길은 가로·세로로 이어져야 해요.');
  length+=distance;
  for(let n=0;n<distance;n++)roadCells.push(Object.freeze({x:a.x+dx*n,y:a.y+dy*n}));
 }
 roadCells.push(points[points.length-1]);
 return Object.freeze({id,name,description,points:Object.freeze(points),roadCells:Object.freeze(roadCells),length});
}

/** Each path is reflected around the central gate, giving both guardians the same road. */
export const DUEL_MAPS:readonly DuelMap[]=Object.freeze([
 map('ember-bend','불꽃 굽잇길','위쪽으로 돌아가는 넓은 굽이',[[0,3],[7,3],[7,1],[9,1],[9,3],[11,3]]),
 map('moon-meander','달빛 굽잇길','아래쪽으로 휘어지는 긴 굽이',[[0,3],[4,3],[4,5],[8,5],[8,3],[11,3]]),
 map('frost-serpent','서리 뱀길','상하를 오가는 두 번의 큰 굽이',[[0,3],[3,3],[3,5],[6,5],[6,1],[9,1],[9,3],[11,3]]),
 map('thorn-coil','가시 덩굴길','양끝을 감싸는 깊은 굴곡',[[0,3],[2,3],[2,1],[5,1],[5,5],[8,5],[8,3],[11,3]]),
 map('storm-step','폭풍 계단길','가장자리를 오르는 계단 모양 길',[[0,3],[2,3],[2,0],[4,0],[4,2],[6,2],[6,6],[9,6],[9,3],[11,3]]),
 map('crystal-twin','수정 물결길','반복되는 위아래 물결',[[0,3],[1,3],[1,5],[4,5],[4,1],[7,1],[7,5],[10,5],[10,3],[11,3]]),
 map('ruin-switchback','폐허 회랑','뒤로 돌아 나오는 긴 회랑',[[0,3],[1,3],[1,0],[9,0],[9,2],[3,2],[3,4],[10,4],[10,3],[11,3]]),
 map('vault-zigzag','별빛 지그재그','작은 굽이가 연달아 이어지는 길',[[0,3],[2,3],[2,5],[4,5],[4,1],[6,1],[6,5],[8,5],[8,2],[10,2],[10,3],[11,3]]),
 map('dragon-neck','용의 꼬리길','큰 고리에서 좁은 목으로 이어지는 길',[[0,3],[1,3],[1,6],[5,6],[5,4],[3,4],[3,1],[9,1],[9,3],[11,3]]),
 map('eclipse-labyrinth','일식 미로','세 구간을 돌아 나오는 깊은 미로',[[0,3],[1,3],[1,0],[9,0],[9,2],[4,2],[4,6],[8,6],[8,4],[10,4],[10,3],[11,3]]),
]);
export const DEFAULT_DUEL_MAP_ID=DUEL_MAPS[0].id;
const LEGACY_MAP=map('legacy-straight','기존 직선 길','이전 대전의 직선 길',[[0,3],[11,3]]);
export function isDuelMapId(value:unknown):value is string{return typeof value==='string'&&DUEL_MAPS.some(map=>map.id===value);}
export function duelMap(mapId?:string):DuelMap{
 if(mapId===undefined)return LEGACY_MAP;
 const result=DUEL_MAPS.find(map=>map.id===mapId);if(!result)throw Error('선택한 대전 맵을 찾을 수 없어요.');return result;
}
export function duelRoadCell(mapId:string|undefined,x:number,y:number){return duelMap(mapId).roadCells.some(cell=>cell.x===x&&cell.y===y);}
/** Distance runs from the left flame to the right flame, irrespective of travel direction. */
export function duelPathPosition(mapId:string|undefined,distance:number):DuelPathPosition{
 const {points,length}=duelMap(mapId);let remaining=Math.max(0,Math.min(length,distance));
 for(let i=0;i<points.length-1;i++){
  const a=points[i],b=points[i+1],segment=Math.hypot(b.x-a.x,b.y-a.y);
  if(remaining<segment||i===points.length-2){const dx=(b.x-a.x)/segment,dy=(b.y-a.y)/segment;return{x:a.x+dx*remaining,y:a.y+dy*remaining,dx,dy};}
  remaining-=segment;
 }
 return{x:0,y:3,dx:1,dy:0};
}
/** Project a grid/world point onto the route; used by legacy snapshots and tower planning. */
export function duelPathDistance(mapId:string|undefined,x:number,y:number):number{
 const {points}=duelMap(mapId);let traveled=0,bestDistance=Infinity,best=0;
 for(let i=0;i<points.length-1;i++){
  const a=points[i],b=points[i+1],vx=b.x-a.x,vy=b.y-a.y,squared=vx*vx+vy*vy,length=Math.sqrt(squared),t=Math.max(0,Math.min(1,((x-a.x)*vx+(y-a.y)*vy)/squared));
  const distance=Math.hypot(x-a.x-vx*t,y-a.y-vy*t);
  if(distance<bestDistance){bestDistance=distance;best=traveled+length*t;}
  traveled+=length;
 }
 return best;
}
/** Units start one cell beyond their castle, so normalize their remaining trip. */
export function duelMapSpeedScale(mapId?:string){return (duelMap(mapId).length-1)/(BASE_LENGTH-1);}
