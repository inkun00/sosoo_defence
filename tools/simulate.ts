import {Defense,Event,Inventory} from '../src/model';
import {LEVELS} from '../src/levels';
import {world,Cell} from '../src/path';
import {Difficulty} from '../src/difficulty';
import {towerType,TOWER_RANGE,LONG_TOWER_RANGE} from '../src/towers';
import {numberText} from '../src/math';

// Prepare a fixed formation, answer the real purchase questions, then only
// control firing and use earned walls. No purchases, movement or sales in battle.
export function playLevel(level:number,difficulty:Difficulty='standard',checkEvents?:(events:Event[])=>void,layout=0,rosterOverride?:string[],inventory?:Inventory){
 const m=new Defense(LEVELS[level-1],inventory,difficulty),road=m.path()!;
 const cells=Array.from({length:16*9},(_,i)=>({x:i%16,y:Math.floor(i/16)}));
 const roster=rosterOverride??(level===11?['rune','rune','catapult','catapult','crystal','frost','basic','pebble','needle']:level===1?['double','basic','basic','double']:level===2?['double','frost','basic','pebble','needle']:level===9?['catapult','catapult','needle','frost','pebble','basic','double']:level<=4?['catapult','catapult','frost','basic','pebble','needle']:['catapult','catapult',level===9?'catapult':'crystal','basic','pebble','needle']);
 const used:Record<string,number>={};
 for(const id of roster){
  const type=towerType(id)!;if(type.unlock>level)continue;
  const copy=used[id]??0;used[id]=copy+1;
  const focus=(id==='needle'?.82:id==='pebble'?.72:id==='basic'?.66:type.effect==='slow'?.36:.18+copy*.28)+(layout%5-2)*.06;
  const radius=type.effect==='range'?LONG_TOWER_RANGE:TOWER_RANGE;
  const score=(c:Cell)=>layout===-1?-Math.hypot(c.x-2,c.y-3):road.reduce((s,p,i)=>s+(Math.hypot(world(p).x-world(c).x,world(p).y-world(c).y)<=radius?Math.exp(-Math.pow((i/(road.length-1)-focus)*3,2)):0),0)/m.reloadFactor(c);
  const c=cells.filter(c=>m.candidate(c)).sort((a,b)=>score(b)-score(a)||(layout<5?a.y-b.y:b.y-a.y)||a.x-b.x)[0];
  if(c&&m.requestPurchase(c,id)){const q=m.pendingPurchase!;m.answerPurchase(numberText(q.before-q.cost,3));}
 }
 const formation=m.towers.map(t=>({id:t.id,x:t.x,y:t.y,typeId:t.typeId}));let simulationSeconds=0;m.start();
 for(let i=0;i<3001&&m.phase==='playing';i++){
  for(const t of m.towers){
   const target=m.targetFor(t);let desired=!!target&&target.hp>=t.unit&&(t.unit!==10||target.hp<=50)&&(t.unit!==50||target.hp<=750);
   if(target&&level===8&&!m.borrowTenths&&target.hp===1000&&t.unit!==100)desired=false;
   if(target&&level===9&&!m.borrowHundredths&&target.hp===100&&t.unit!==10)desired=false;
   if(t.enabled!==desired)m.toggleTower(t.id);
  }
  m.step(.1);simulationSeconds+=.1;
  if(m.bricks.length>=3)m.fuse(m.bricks.slice(0,3).map(b=>b.id));
  if(m.wallStock&&m.walls.length<m.balance.wallLimit){const c=m.path()!.slice().reverse().find(c=>m.candidate(c,true));if(c)m.placeWall(c);}
  checkEvents?.(m.events);m.events=[];
 }
 return Object.assign(m,{formation,simulationSeconds:Number(simulationSeconds.toFixed(1))});
}
if(typeof process!=='undefined'&&process.argv[1]?.endsWith('simulate.ts'))for(const difficulty of ['practice','standard','challenge'] as const)for(const l of LEVELS){const m=playLevel(l.id,difficulty);console.log(`${difficulty} ${l.id}: ${m.phase}, kills=${m.kills}, leaks=${m.leaks}, boss=${m.bossDefeated}, towers=${m.towers.map(t=>t.typeId+'@'+t.x+','+t.y).join(';')}, goals=${m.goals.filter(g=>!g.done).map(g=>g.label).join(',')}`);}
