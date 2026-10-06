import type {Effect} from './levels';
import {purchaseCoins} from './math';
export interface TowerType{id:string;name:string;unit:number;effect:Effect;grade:1|2|3|4;unlock:number;cost:number;cooldown:number;sheet:'a'|'b';frame:number;}
export const TOWERS:TowerType[]=[
 {id:'basic',name:'기본 포탑',unit:100,effect:'basic',grade:1,unlock:1,cost:100,cooldown:2,sheet:'a',frame:0},
 {id:'double',name:'쌍석포',unit:200,effect:'basic',grade:1,unlock:1,cost:200,cooldown:2.6,sheet:'a',frame:1},
 {id:'needle',name:'바늘탑',unit:10,effect:'basic',grade:1,unlock:2,cost:100,cooldown:.9,sheet:'a',frame:2},
 {id:'pebble',name:'조약돌포',unit:50,effect:'basic',grade:1,unlock:2,cost:150,cooldown:1.2,sheet:'a',frame:3},
 {id:'frost',name:'서리탑',unit:150,effect:'slow',grade:2,unlock:2,cost:1450,cooldown:2.5,sheet:'a',frame:4},
 {id:'ice',name:'빙창탑',unit:250,effect:'slow',grade:2,unlock:3,cost:1650,cooldown:2.9,sheet:'a',frame:5},
 {id:'catapult',name:'투석기',unit:1200,effect:'basic',grade:2,unlock:3,cost:1750,cooldown:3.1,sheet:'b',frame:0},
 {id:'lightning',name:'번개탑',unit:350,effect:'stun',grade:3,unlock:4,cost:2785,cooldown:2.3,sheet:'b',frame:1},
 {id:'crystal',name:'수정포',unit:750,effect:'stun',grade:3,unlock:5,cost:2865,cooldown:2.7,sheet:'b',frame:2},
 {id:'sniper',name:'망원포',unit:1000,effect:'range',grade:3,unlock:6,cost:2965,cooldown:2.5,sheet:'b',frame:3},
 {id:'siege',name:'수호 대포',unit:1500,effect:'basic',grade:3,unlock:6,cost:2875,cooldown:3.4,sheet:'b',frame:4},
 {id:'rune',name:'룬 쇠뇌',unit:2350,effect:'range',grade:4,unlock:8,cost:3985,cooldown:3.8,sheet:'b',frame:5}
];
export const towerType=(id:string)=>TOWERS.find(t=>t.id===id);
export const towersForStage=(stage:number)=>TOWERS.filter(t=>t.unlock<=stage);
export const GRADE_NAMES=['','기본','희귀','영웅','전설'];
// Three/four grid cells reward covering successive sections of the road.
export const TOWER_RANGE=174,LONG_TOWER_RANGE=232;
// Non-overlapping stage bands make every tower progressively more expensive.
// Wallet-based selection favors easy basic questions and advanced borrowing.
export interface PurchaseVariation{round:number;lastBefore?:number;lastCost?:number;}
export function towerPriceBand(type:TowerType,stage:number){
 stage=Math.max(1,Math.min(10,Math.floor(stage)));
 const step=stage===1?100:type.grade<=2?10:1;
 let low:number;
 if(type.grade===1){
  const offset={basic:0,double:10,needle:0,pebble:10}[type.id]??0;
  low=stage===1?Math.ceil(type.cost/100)*100:420+offset+(stage-2)*50;
 }else {
  const opening=({catapult:1680,crystal:2825,sniper:2850,siege:2835,rune:3885} as Record<string,number>)[type.id]??type.cost;
  low=opening+Math.max(0,stage-type.unlock)*(type.grade===3?30:40);
  low=Math.ceil(low/step)*step;
 }
 return {low,high:low+(stage===1?200:20),step};
}
export function towerPrice(type:TowerType,money:number,stage:number,variation?:PurchaseVariation){
 const before=purchaseCoins(money),{low,high,step}=towerPriceBand(type,stage);
 const candidates:number[]=[];
 for(let cost=low;cost<=Math.min(high,before);cost+=step){
  candidates.push(cost);
 }
 // Quote the stage minimum even if unaffordable; never discount past its band.
 if(!candidates.length)return low;
 const count=(cost:number)=>borrowingPlaces(before,cost).filter(p=>p<1000).length;
 const wanted=type.grade===1?0:type.grade===2?1:2;
 const penalty=(cost:number)=>type.grade===1?count(cost):Math.max(0,wanted-count(cost));
 const ranked=candidates.slice().sort((a,b)=>penalty(a)-penalty(b)||a-b);
 if(!variation?.round)return ranked[0];
 const best=penalty(ranked[0]),preferred=ranked.filter(cost=>penalty(cost)===best);
 // Keep three different questions when the wallet allows it, even if its
 // digits leave fewer than three prices at the ideal borrowing difficulty.
 const practice=preferred.length>=3?preferred:ranked.slice(0,3);
 // Deterministic variety shared by the host and shop, independent of combat RNG.
 let stride=37;while(gcd(stride,practice.length)!==1)stride++;
 const start=((variation.round-1)*stride+TOWERS.indexOf(type))%practice.length;
 for(let i=0;i<practice.length;i++){
  const cost=practice[(start+i)%practice.length];
  if(before!==variation.lastBefore||cost!==variation.lastCost)return cost;
 }
 return practice[0];
}
function gcd(a:number,b:number):number{return b?gcd(b,a%b):a;}
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
