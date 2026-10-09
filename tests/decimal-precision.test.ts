import test from 'node:test';
import assert from 'node:assert/strict';
import {LEVELS} from '../src/levels';
import {TOWERS,towerPrice,parseMoney} from '../src/towers';
import {learningValue,numberText,purchaseCoins,reward,hit} from '../src/math';
import {Defense,type Tower} from '../src/model';
import {createDuel,joinDuel,applyDuel} from '../src/multiplayer/duel';

const decimals=(text:string)=>[...text.matchAll(/\d+\.(\d+)/g)].every(match=>match[1].length<=2);

test('all purchase operands, answers and variation prices remain exact hundredths across the campaign',()=>{
 for(const level of LEVELS)for(const tower of TOWERS.filter(t=>t.unlock<=level.id)){
  for(const wallet of [level.budget,6540,9820,23980])for(let round=0;round<18;round++){
   const before=purchaseCoins(wallet),cost=towerPrice(tower,wallet,level.id,{round});
   assert.ok([before,cost,before-cost].every(learningValue));
   const text=`${numberText(before,3)} − ${numberText(cost,3)} = ${numberText(before-cost,3)}`;
   assert.ok(decimals(text),text);assert.equal(parseMoney(numberText(before-cost)),before-cost);
  }
 }
 assert.equal(learningValue(301),false);
 assert.throws(()=>hit(301,100),/Invalid damage/);
 assert.throws(()=>hit(300,101),/Invalid damage/);
});

test('combat rewards and their actual wallet updates never introduce thousandths',()=>{
 for(const level of LEVELS){
  const m=new Defense(level);m.kills=3;
  for(const hp of [...level.hp,...(level.boss?[level.boss.hp]:[])]){
   for(const hits of [1,3,17,50])assert.equal(reward(hp,hits,level.units,level.id)%10,0);
   if(hp===level.boss?.hp)m.spawnBoss();else m.spawn();
   const enemy=m.enemies.at(-1);if(!enemy||!enemy.hp)continue;
   m.damage(enemy,{unit:enemy.hp,effect:'basic'} as Tower);
   assert.equal(m.money%10,0);assert.ok(m.events.every(event=>decimals(event.message)));
  }
 }
});

test('tower quotes in every duel phase use at most two places and subtraction fusion cannot award an egg',()=>{
 const now=100000,s=createDuel('a','가',13,now,10);joinDuel(s,'b','나',now,10);
 applyDuel(s,0,{type:'ready'},now,'r0');applyDuel(s,1,{type:'ready'},now,'r1');
 for(let level=1;level<=10;level++){
  s.elapsed=(level-1)*30;s.players[0].money=9980;
  for(const tower of TOWERS.filter(t=>t.unlock<=level)){
   assert.ok(applyDuel(s,0,{type:'quote',x:3,y:2,typeId:tower.id},now,'quote').ok);
   const q=s.players[0].quote!;assert.ok(q.digits<=2);assert.ok([q.before,q.cost,q.before-q.cost].every(learningValue));
   applyDuel(s,0,{type:'cancel'},now,'cancel');
  }
 }
 s.players[0].board=[1300,700,600,...Array(13).fill(100)];
 const board=[...s.players[0].board];
 assert.equal(applyDuel(s,0,{type:'fuse',operation:'-',round:0,slots:[0,1,2]},now,'sub').ok,false);
 assert.equal(s.players[0].egg,0);assert.deepEqual(s.players[0].board,board);
});
