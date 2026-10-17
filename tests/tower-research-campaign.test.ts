import assert from 'node:assert/strict';
import {test} from 'node:test';
import {Defense,type Inventory} from '../src/model';
import {LEVELS} from '../src/levels';
import type {Difficulty} from '../src/difficulty';
import {numberText} from '../src/math';
import {developTower,dismissTowerResearchShop,freshTowerResearchProgress,recordTowerResearchReward,researchProgress} from '../src/tower-research';

// Independent campaign proof: only three starter designs, actual earned coin
// drops, research purchases between battles, and legal fixed preparations.
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
const pressureFinal='rune@5,6;rune@7,6;catapult@5,5;catapult@7,5;crystal@5,3;frost@7,3;basic@11,6;pebble@11,5;needle@11,3';

function fuseAvailable(model:Defense){
 let fused=true;
 while(fused){
  fused=false;
  for(let a=0;a<model.bricks.length&&!fused;a++)for(let b=a+1;b<model.bricks.length&&!fused;b++){
   const sum=model.bricks[a].value+model.bricks[b].value;
   const result=model.bricks.find((brick,c)=>c!==a&&c!==b&&brick.value===sum);
   if(result){assert.ok(model.fuse([model.bricks[a].id,model.bricks[b].id,result.id]));fused=true;}
  }
 }
}

for(const difficulty of ['practice','standard','challenge'] as Difficulty[])test(`three starter designs and earned research coins can legally clear all 11 stages (${difficulty})`,()=>{
 const save={level:1,towerResearch:freshTowerResearchProgress()};
 assert.deepEqual(save.towerResearch.developed,['basic','double','needle']);
 assert.equal(save.towerResearch.coins,0);
 let inventory:Inventory={bricks:[],walls:0},totalEarned=0,totalSpent=0;
 for(const level of LEVELS){
  const placement=level.id===11&&difficulty!=='practice'?pressureFinal:formations[level.id-1];
  const needed=[...new Set(placement.split(';').map(entry=>entry.split('@')[0]))];
  for(const id of needed){
   if(researchProgress(save).developed.includes(id))continue;
   assert.equal(save.towerResearch.pendingShop?.stage,level.id-1,'development happens in the preceding stage shop');
   const before=save.towerResearch.coins;
   assert.ok(developTower(save,id),`${difficulty} stage ${level.id}: research ${id} must be affordable from prior drops`);
   totalSpent+=before-save.towerResearch.coins;
  }
  if(save.towerResearch.pendingShop)assert.ok(dismissTowerResearchShop(save));
  const model=new Defense(level,inventory,difficulty,researchProgress(save).developed);
  assert.equal(model.canUseTower('needle'),level.id!==1,'one-place introduction cannot fire hundredths');
  for(const entry of placement.split(';').slice(0,model.balance.towerLimit)){
   const [id,coordinates]=entry.split('@'),[x,y]=coordinates.split(',').map(Number);
   assert.ok(model.isTowerDeveloped(id));
   assert.ok(model.requestPurchase({x,y},id),`${difficulty} stage ${level.id}: ${entry}`);
   const quote=model.pendingPurchase!;assert.ok(model.answerPurchase(numberText(quote.before-quote.cost)));
  }
  fuseAvailable(model);
  while(model.wallStock&&model.walls.length<model.balance.wallLimit){
   const cell=model.path()!.slice(1,-1).reverse().find(candidate=>model.previewWall(candidate).valid);
   if(!cell)break;assert.ok(model.placeWall(cell));
  }
  const originalPurchases=model.purchases,originalWalls=model.wallPlacements;
  assert.ok(model.start());
  for(let frame=0;frame<3001&&model.phase==='playing';frame++){
   model.step(.1);fuseAvailable(model);model.events=[];
  }
  assert.equal(model.phase,'won',`${difficulty} stage ${level.id}: ${model.goals.filter(goal=>!goal.done).map(goal=>goal.label)}`);
  assert.ok(model.goals.every(goal=>goal.done));assert.ok(model.castle>0);
  assert.equal(model.purchases,originalPurchases);assert.equal(model.wallPlacements,originalWalls);
  assert.equal(model.switches,0,'combat needs no unavailable tower toggling');
  assert.equal(model.earnedCoins,model.money-level.budget+model.towers.reduce((sum,tower)=>sum+tower.cost,0));
  totalEarned+=model.earnedCoins;
  assert.ok(recordTowerResearchReward(save,`research-campaign-${difficulty}-${level.id}`,model));
  assert.equal(save.towerResearch.coins,totalEarned-totalSpent);
  const once=JSON.stringify(save.towerResearch);
  assert.equal(recordTowerResearchReward(save,`research-campaign-${difficulty}-${level.id}`,model),false);
  assert.equal(JSON.stringify(save.towerResearch),once);
  assert.equal(save.towerResearch.pendingShop?.nextStage,Math.min(11,level.id+1));
  inventory=model.inventory;save.level=Math.min(11,level.id+1);
 }
 assert.equal(save.towerResearch.receipts.length,11);
 assert.ok(save.towerResearch.coins>0);
 assert.ok(save.towerResearch.developed.includes('rune'));
 assert.equal(save.towerResearch.pendingShop?.stage,11);
});
