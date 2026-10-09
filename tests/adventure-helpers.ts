import assert from 'node:assert/strict';
import {Defense,type Inventory} from '../src/model';
import {LEVELS} from '../src/levels';
import type {Difficulty} from '../src/difficulty';
import {numberText} from '../src/math';

// Legal fixed formations found during the gameplay audit. This runner uses
// only purchases before battle, automatic fire, earned brick fusion and walls.
// It deliberately never calls toggleTower, which is unavailable in the UI.
const formations=[
 'double@2,6;basic@10,2;basic@10,3;double@6,6',
 'double@2,5;frost@6,6;basic@11,3;pebble@11,2;needle@13,3',
 'catapult@2,2;catapult@7,3;frost@5,2;basic@11,5;pebble@11,6;needle@13,5',
 'catapult@2,6;catapult@3,6;frost@2,5;basic@13,4;pebble@13,6;needle@13,3',
 'catapult@2,6;catapult@7,4;crystal@2,5;basic@8,4;pebble@11,1;needle@13,3',
 'catapult@2,6;catapult@5,4;crystal@2,5;basic@11,7;pebble@14,6;needle@11,3',
 'catapult@2,6;catapult@5,4;crystal@1,3;basic@10,4;pebble@7,4;needle@10,2',
 'catapult@4,4;catapult@8,5;crystal@2,3;basic@8,2;pebble@8,4;needle@12,3',
 'catapult@2,3;catapult@7,4;needle@11,5;frost@4,2;pebble@9,2;basic@9,5;double@2,5',
 'catapult@2,2;catapult@5,2;crystal@2,5;basic@8,2;pebble@9,5;needle@10,2',
 'rune@3,2;rune@5,2;catapult@2,5;catapult@5,5;crystal@1,2;frost@3,3;basic@7,2;pebble@9,2;needle@10,5',
];
const challengeFinal='rune@3,2;rune@6,2;catapult@2,5;catapult@6,5;crystal@1,2;frost@5,2;basic@9,2;pebble@9,5;needle@11,2';

export function playAutomaticStage(stage:number,difficulty:Difficulty,inventory:Inventory){
 const m=new Defense(LEVELS[stage-1],inventory,difficulty);
 const placement=stage===11&&difficulty==='challenge'?challengeFinal:formations[stage-1];
 for(const entry of placement.split(';').slice(0,m.balance.towerLimit)){
  const [typeId,coordinates]=entry.split('@'),[x,y]=coordinates.split(',').map(Number);
  assert.ok(m.requestPurchase({x,y},typeId),`${difficulty} stage ${stage}: ${entry}`);
  const purchase=m.pendingPurchase!;
  assert.ok(m.answerPurchase(numberText(purchase.before-purchase.cost)));
 }
 const original=m.towers.map(t=>({...t}));assert.ok(m.start());
 for(let frame=0;frame<3001&&m.phase==='playing';frame++){
  m.step(.1);
   // A stage can end with two unused drops. Find an actual addition recipe
   // among carried and newly earned bricks, rather than assuming the first
   // three still belong to one drop group after a tighter wave.
   let fused=true;
   while(fused){
    fused=false;
    for(let a=0;a<m.bricks.length&&!fused;a++)for(let b=a+1;b<m.bricks.length&&!fused;b++){
     const result=m.bricks.find((brick,c)=>c!==a&&c!==b&&brick.value===m.bricks[a].value+m.bricks[b].value);
     if(result){assert.ok(m.fuse([m.bricks[a].id,m.bricks[b].id,result.id]));fused=true;}
    }
   }
  if(m.wallStock&&m.walls.length<m.balance.wallLimit){
   const cell=m.path()!.slice(1,-1).reverse().find(c=>m.previewWall(c).valid);
   if(cell)assert.ok(m.placeWall(cell));
  }
  m.events=[];
 }
 assert.equal(m.phase,'won',`${difficulty} stage ${stage}: ${m.goals.filter(g=>!g.done).map(g=>g.label)}`);
 assert.ok(m.castle>0);assert.ok(m.goals.every(g=>g.done));assert.equal(m.enemies.length,0);
 assert.equal(m.switches,0);assert.equal(m.purchases,original.length);assert.ok(m.towers.every(t=>t.enabled));
 assert.deepEqual(m.towers.map(({cooldown,...t})=>t),original.map(({cooldown,...t})=>t));
 assert.ok(Number.isSafeInteger(m.money)&&m.money>=0&&m.money%10===0);
 assert.ok((m.inventory.wallDurabilities??[]).every(h=>h>=1&&h<=3));
 if(m.level.boss)assert.ok(m.bossSpawned&&m.bossDefeated);
 return Object.assign(m,{formation:original.map(t=>({id:t.id,x:t.x,y:t.y,typeId:t.typeId}))});
}
