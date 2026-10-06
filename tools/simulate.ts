import {Defense,Event} from '../src/model';
import {LEVELS} from '../src/levels';
import {route,world,Cell} from '../src/path';
import {Difficulty} from '../src/difficulty';
import {towerType,towerPrice,TOWER_RANGE,LONG_TOWER_RANGE} from '../src/towers';
import {numberText} from '../src/math';

// The automated learner answers the real wallet subtraction before each purchase.
// Repositioning preserves cooldowns; money and placement limits apply.
export function playLevel(level:number,difficulty:Difficulty='standard',checkEvents?:(events:Event[])=>void,roadSpan=16){
 const m=new Defense(LEVELS[level-1],undefined,difficulty);
 const cells=Array.from({length:16*9},(_,i)=>({x:i%16,y:Math.floor(i/16)}));
 function purchase(c:Cell,id:string){if(!m.requestPurchase(c,id))return false;const q=m.pendingPurchase!;return m.answerPurchase(numberText(q.before-q.cost,3));}
 function buy(id:string){
  const type=towerType(id)!;if(type.unlock>level||!m.towerAvailable(type.unit)||m.money<towerPrice(type,m.money,level))return false;
  const radius=type.effect==='range'?LONG_TOWER_RANGE:TOWER_RANGE,road=route(m.blocks)!.slice(0,roadSpan);
  const score=(c:Cell)=>road.filter(p=>Math.hypot(world(p).x-world(c).x,world(p).y-world(c).y)<=radius).length;
  const focus=m.elapsed>=100?m.enemies.filter(e=>e.hp>=type.unit).sort((a,b)=>b.next-a.next)[0]:undefined;
  const c=cells.filter(c=>m.candidate(c)).sort((a,b)=>focus?Math.hypot(world(a).x-focus.x,world(a).y-focus.y)-Math.hypot(world(b).x-focus.x,world(b).y-focus.y):score(b)-score(a)||a.x-b.x)[0];return !!c&&purchase(c,id);
 }
 const roster=level===1?['basic','double',...Array(6).fill('basic')]:level<=2?['basic','needle','pebble','double','frost','needle',...Array(8).fill('double')]:level<6?['catapult','needle','pebble','frost','catapult','double','ice','needle',...Array(12).fill('catapult')]:level<8?['sniper','needle','pebble','frost','sniper','siege','needle',...Array(14).fill('sniper')]:['rune','needle','basic','pebble','frost','rune','siege','needle',...Array(14).fill('rune')];
 const plan=difficulty==='practice'&&level>=8?['rune','needle','basic','pebble','catapult','crystal','rune','siege','lightning','needle',...Array(14).fill('rune')]:roster;
 const wanted=plan.filter((id,i)=>towerType(id)!.unlock<=level&&(id!=='needle'||plan.slice(0,i+1).filter(v=>v==='needle').length<=m.balance.precisionLimit)).slice(0,m.balance.towerLimit);
 function spend(){const remaining=m.towers.map(t=>t.typeId);for(const id of wanted){const i=remaining.indexOf(id);if(i>=0)remaining.splice(i,1);else if(!buy(id))break;}}
 spend();m.start();
 for(let i=0;i<Math.ceil(m.duration/.1)+1&&m.phase==='playing';i++){
  if(i%10===0&&m.spawned===m.level.hp.length){
   const small=m.enemies.filter(e=>e.hp<(level>=8?2350:level>=6?1500:1200)).sort((a,b)=>b.next-a.next)[0];
   if(small){
    const id=small.hp>=1500&&level>=6?'siege':small.hp>=1200&&level>=3?'catapult':small.hp>=1000&&level>=6?'sniper':small.hp>=750&&level>=5?'crystal':small.hp>=350&&level>=4?'lightning':small.hp>=250&&level>=3?'ice':small.hp>=150&&level>=2?'frost':small.hp>=100?'basic':small.hp>=50&&level>=2?'pebble':'needle';
    const copies=id==='needle'?Math.min(2,m.balance.precisionLimit):2;
    if(m.towers.filter(t=>t.typeId===id).length<copies){
     const obsolete=m.towers.filter(t=>t.unit>small.hp&&!m.enemies.some(e=>e.hp>=t.unit)).sort((a,b)=>b.cost-a.cost)[0];if(obsolete)m.sellTower(obsolete.id);buy(id);
    }
   }
  }
  if(i%10===0)for(const t of [...m.towers]){
   const target=m.enemies.filter(e=>e.hp>=t.unit&&(t.unit===10?e.hp<=50:t.unit>=750?e.hp>=750:e.hp<1200)).sort((a,b)=>b.next-a.next)[0];if(!target)continue;
   const radius=t.effect==='range'?LONG_TOWER_RANGE:TOWER_RANGE,type=towerType(t.typeId)!;
   if(Math.hypot(world(t).x-target.x,world(t).y-target.y)<=radius||m.money+t.cost<towerPrice(type,m.money+t.cost,level))continue;
   const nearest=()=>cells.filter(c=>m.candidate(c)).sort((a,b)=>Math.hypot(world(a).x-target.x,world(a).y-target.y)-Math.hypot(world(b).x-target.x,world(b).y-target.y))[0];
   let c=nearest();
   if(m.elapsed>=100&&(!c||Math.hypot(world(c).x-target.x,world(c).y-target.y)>radius)){
    // Reclaim an oversized idle tower to reserve a spaced finishing position.
    const idle=m.towers.filter(o=>o.id!==t.id&&o.unit>target.hp&&!m.enemies.some(e=>e.hp>=o.unit)).sort((a,b)=>Math.hypot(world(a).x-target.x,world(a).y-target.y)-Math.hypot(world(b).x-target.x,world(b).y-target.y))[0];
    if(idle){m.sellTower(idle.id);c=nearest();}
   }
   if(c&&Math.hypot(world(c).x-target.x,world(c).y-target.y)<=radius){m.sellTower(t.id);if(purchase(c,t.typeId))m.towers.at(-1)!.cooldown=t.cooldown;}
  }
  for(const t of m.towers){
   const target=m.targetFor(t);let desired=!!target&&target.hp>=t.unit&&(t.unit!==10||target.hp<=50)&&(t.unit!==50||target.hp<=750);
   if(target&&level===8&&!m.borrowTenths&&target.hp===1000&&t.unit!==100)desired=false;
   if(target&&level===9&&!m.borrowHundredths&&target.hp===100&&t.unit!==10)desired=false;
   if(t.enabled!==desired)m.toggleTower(t.id);
  }
  m.step(.1);
  if(m.bricks.length>=3)m.fuse(m.bricks.slice(0,3).map(b=>b.id));
  if(m.wallStock&&m.walls.length<m.balance.wallLimit){const c=route(m.blocks)!.slice().reverse().find(c=>m.candidate(c,true));if(c)m.placeWall(c);}
  if(m.spawned<m.level.hp.length||m.enemies.some(e=>e.hp>=(level>=8?2350:level>=6?1500:1200)))spend();checkEvents?.(m.events);m.events=[];
 }
 return m;
}
if(process.argv[1]?.endsWith('simulate.ts'))for(const l of LEVELS){const m=playLevel(l.id);console.log(`${l.id}: ${m.phase}, kills=${m.kills}, leaks=${m.leaks}, hits=${m.successfulHits}, towers=${m.towers.length}, goals=${m.goals.every(g=>g.done)}, remaining=${m.enemies.map(e=>numberText(e.hp)).join(',')}`);}
