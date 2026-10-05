import type {Effect} from './levels';
export interface TowerType{id:string;name:string;unit:number;effect:Effect;grade:1|2|3|4;unlock:number;cost:number;cooldown:number;sheet:'a'|'b';frame:number;}
export const TOWERS:TowerType[]=[
 {id:'basic',name:'기본 포탑',unit:100,effect:'basic',grade:1,unlock:1,cost:2100,cooldown:2,sheet:'a',frame:0},
 {id:'double',name:'쌍석포',unit:200,effect:'basic',grade:1,unlock:1,cost:3200,cooldown:2.6,sheet:'a',frame:1},
 {id:'needle',name:'바늘탑',unit:10,effect:'basic',grade:1,unlock:2,cost:1300,cooldown:.9,sheet:'a',frame:2},
 {id:'pebble',name:'조약돌포',unit:50,effect:'basic',grade:1,unlock:2,cost:1500,cooldown:1.2,sheet:'a',frame:3},
 {id:'frost',name:'서리탑',unit:150,effect:'slow',grade:2,unlock:2,cost:4450,cooldown:2.5,sheet:'a',frame:4},
 {id:'ice',name:'빙창탑',unit:250,effect:'slow',grade:2,unlock:3,cost:5650,cooldown:2.9,sheet:'a',frame:5},
 {id:'catapult',name:'투석기',unit:1200,effect:'basic',grade:2,unlock:3,cost:7750,cooldown:3.1,sheet:'b',frame:0},
 {id:'lightning',name:'번개탑',unit:350,effect:'stun',grade:3,unlock:4,cost:8785,cooldown:2.3,sheet:'b',frame:1},
 {id:'crystal',name:'수정포',unit:750,effect:'stun',grade:3,unlock:5,cost:10865,cooldown:2.7,sheet:'b',frame:2},
 {id:'sniper',name:'망원포',unit:1000,effect:'range',grade:3,unlock:6,cost:11965,cooldown:2.5,sheet:'b',frame:3},
 {id:'siege',name:'수호 대포',unit:1500,effect:'basic',grade:3,unlock:6,cost:12875,cooldown:3.4,sheet:'b',frame:4},
 {id:'rune',name:'룬 쇠뇌',unit:2350,effect:'range',grade:4,unlock:8,cost:17985,cooldown:3.8,sheet:'b',frame:5}
];
export const towerType=(id:string)=>TOWERS.find(t=>t.id===id);
export const towersForStage=(stage:number)=>TOWERS.filter(t=>t.unlock<=stage);
export const GRADE_NAMES=['','기본','희귀','영웅','전설'];
// Three/four grid cells keep separated towers useful along the winding road.
export const TOWER_RANGE=174,LONG_TOWER_RANGE=232;
// Prices are quoted against the real wallet. Basic prices avoid borrowing in
// decimal places; advanced prices favor it, within the stage's money precision.
export function towerPrice(type:TowerType,money:number,stage:number){
 const places=stage===1?1:stage<4?2:3;
 const before=[Math.floor(money/100)%10,Math.floor(money/10)%10,money%10];
 const nominal=[Math.floor(type.cost/100)%10,Math.floor(type.cost/10)%10,type.cost%10];
 const fraction=[0,0,0];
 if(type.grade===1)fraction[0]=Math.min(before[0],Math.max(1,nominal[0]));
 else if(type.grade===2){
  for(let i=0;i<Math.min(2,places);i++)fraction[i]=nominal[i]||5;
  const i=before[1]<9&&places>=2?1:before[0]<9?0:-1;
  if(i>=0)fraction[i]=Math.max(fraction[i],before[i]+1);
 }else{
  for(let i=0;i<places;i++)fraction[i]=before[i]<9?Math.max(nominal[i],before[i]+1):nominal[i];
 }
 // Every new stage adds one whole coin to each type. The shared increment
 // preserves the disjoint grade bands even when wallet-dependent digits vary.
 return (Math.floor(type.cost/1000)+stage-1)*1000+fraction[0]*100+fraction[1]*10+fraction[2];
}
export function borrowingPlaces(before:number,cost:number):number[]{
 const result:number[]=[];let borrow=0;
 for(let place=1;place<=1000;place*=10){
  const a=Math.floor(before/place)%10-borrow,b=Math.floor(cost/place)%10;
  borrow=a<b?1:0;if(borrow)result.push(place);
 }
 return result;
}
export function parseMoney(text:string):number|null{
 const match=/^(\d+)(?:\.(\d{0,3}))?$/.exec(text.trim());if(!match)return null;
 const value=Number(match[1])*1000+Number((match[2]||'').padEnd(3,'0'));
 return Number.isSafeInteger(value)&&value>=0?value:null;
}
