import {test} from 'node:test';
import assert from 'node:assert/strict';
import {SecretSiege} from '../src/secret-siege-model';
import {ARMY,type ArmyId,type SiegePhase} from '../src/secret-siege-types';
import {INITIAL_COINS,STARTER_BUDGET,SIEGE_COIN_LIMIT,normalizeSiegeEconomy,siegeResearched,validSiegeCoins,type SiegeEconomy} from '../src/secret-siege-research';
import {numberText} from '../src/math';
import {simulateSecretSiegeCampaign} from '../tools/simulate-secret-siege';

const advanced=ARMY.filter(army=>army.researchCost>0).map(army=>army.id);
function recruit(game:SecretSiege,id:ArmyId){assert.ok(game.requestRecruit(id),id);const q=game.pendingQuestion!;assert.ok(game.answer(numberText(q.answer,2)));return q;}
function trainBasicArmy(game:SecretSiege){for(const [id,count] of [['guard',3],['striker',3],['scout',2]] as const)for(let index=0;index<count;index++)recruit(game,id);}

test('research prices are one-time development costs, separately from each soldier training price',()=>{
 assert.deepEqual(ARMY.map(army=>[army.id,army.researchCost]),[['guard',0],['striker',0],['scout',0],['knight',8000],['ranger',12000],['champion',24000],['priest',16000]]);
 for(const army of ARMY.filter(army=>army.researchCost>0))assert.ok(army.researchCost>=army.cost*4);
 const fresh=new SecretSiege('standard');assert.equal(fresh.money,INITIAL_COINS);assert.deepEqual(fresh.researched,[]);
 for(const army of ARMY)assert.equal(fresh.armyUnlocked(army.id),army.researchCost===0);
 const game=new SecretSiege('standard',1,{coins:15480,researched:[],revision:2});
 assert.ok(game.canResearch('knight'));assert.ok(game.research('knight'));assert.equal(game.money,7480);
 assert.equal(game.canResearch('knight'),false);assert.equal(game.research('knight'),false);assert.equal(game.money,7480);
 assert.equal(game.canResearch('guard'),false);assert.equal(game.research('guard'),false);
 assert.ok(game.armyUnlocked('knight'));assert.equal(game.recruitCost('knight'),1800);assert.equal(game.reserve.knight,0);assert.equal(game.recruited,0);assert.equal(game.correctAnswers,0);
 assert.deepEqual(game.initialEconomy,{coins:7480,researched:['knight'],revision:2});
});

test('research protects the full basic training budget and credits already paid preparation training toward it',()=>{
 const fresh=new SecretSiege('standard');assert.equal(fresh.canResearch('knight'),false);assert.equal(fresh.research('knight'),false);assert.equal(fresh.money,9900);
 const below=new SecretSiege('standard',1,{coins:15470,researched:[]});assert.equal(below.canResearch('knight'),false);
 const game=new SecretSiege('standard',1,{coins:15480,researched:[],revision:7});trainBasicArmy(game);assert.equal(game.money,8000);
 assert.equal(game.recruited,8);assert.equal(game.canResearch('knight'),true);assert.ok(game.research('knight'));assert.equal(game.money,0);
 assert.equal(game.armyCount,8);assert.equal(game.recruited,8);assert.ok(game.start(),'a trained army is not charged a second reserve');
 const checkpoint=game.initialEconomy;assert.deepEqual(checkpoint,{coins:STARTER_BUDGET,researched:['knight'],revision:7});
 game.phase='lost';const retry=new SecretSiege('standard',1,checkpoint);assert.equal(retry.money,STARTER_BUDGET);assert.equal(retry.recruited,0);assert.equal(retry.armyCount,0);assert.ok(retry.armyUnlocked('knight'));
 trainBasicArmy(retry);assert.equal(retry.money,0);assert.ok(retry.start(),'rollback buys exactly the same basic eight troops without free coins');
});

test('research requires preparation with no active question, and terminal, battle and paused states never debit coins',()=>{
 const game=new SecretSiege('standard',1,{coins:50000,researched:[]});
 assert.ok(game.requestRecruit('guard'));const q=game.pendingQuestion!;assert.equal(game.canResearch('knight'),false);assert.equal(game.research('knight'),false);assert.equal(game.pendingQuestion,q);assert.equal(game.money,50000);game.cancelQuestion();
 for(const phase of ['playing','paused','won','lost'] as SiegePhase[]){game.phase=phase;assert.equal(game.canResearch('knight'),false);assert.equal(game.research('knight'),false);assert.equal(game.money,50000);assert.deepEqual(game.researched,[]);}
 game.phase='ready';assert.equal(game.canResearch('unknown' as ArmyId),false);assert.equal(game.research('unknown' as ArmyId),false);assert.ok(game.research('knight'));
});

test('economy snapshots filter and copy permanent research, validate hundredth precision, and never turn corrupt balances into free money',()=>{
 assert.equal(INITIAL_COINS,9900);assert.equal(STARTER_BUDGET,7480);
 for(const coins of [0,10,7480,9900,123450,SIEGE_COIN_LIMIT])assert.ok(validSiegeCoins(coins));
 for(const coins of [-10,1,123.5,NaN,Infinity,SIEGE_COIN_LIMIT+10,Number.MAX_SAFE_INTEGER,'9900',null,undefined])assert.equal(validSiegeCoins(coins),false);
 assert.deepEqual(siegeResearched(['guard','knight','knight','bogus','priest',null]),['knight','priest']);
 for(const coins of [-10,1,Infinity])assert.equal(normalizeSiegeEconomy({coins,researched:[],revision:-1}).coins,0);
 assert.deepEqual(normalizeSiegeEconomy(),{coins:9900,researched:[],revision:0});
 const input:SiegeEconomy={coins:40000,researched:['knight'],revision:4},game=new SecretSiege('standard',5,input);
 (input.researched as ArmyId[]).push('champion');assert.equal(game.armyUnlocked('champion'),false);
 const snapshot=game.initialEconomy;(snapshot.researched as ArmyId[]).push('priest');snapshot.coins=0;assert.equal(game.money,40000);assert.equal(game.armyUnlocked('priest'),false);
 game.economyRevision=5;assert.equal(game.initialEconomy.revision,5);assert.equal(game.initialEconomy.coins,40000);
});

test('late training can spend only funds that preserve the next-stage budget after all remaining real tower rewards',()=>{
 const game=new SecretSiege('standard',1,{coins:STARTER_BUDGET,researched:[]});trainBasicArmy(game);assert.equal(game.money,0);assert.equal(game.remainingTowerRewards,18000);
 assert.ok(game.start());assert.equal(game.canRecruit('scout'),false,'promised tower rewards cannot pay a training cost before they arrive');assert.equal(game.money,0);
 // A late-battle fixture has already banked the four tower rewards. Test the
 // exact spending boundary without changing troop prices or granting credit.
 const late=new SecretSiege('standard',1,{coins:STARTER_BUDGET+450,researched:[]});late.phase='playing';for(const target of late.targets)if(target.kind==='tower')target.hp=0;
 assert.equal(late.remainingTowerRewards,0);assert.ok(late.canRecruit('scout'));recruit(late,'scout');assert.equal(late.money,STARTER_BUDGET);assert.equal(late.canRecruit('scout'),false);
 const conditional=new SecretSiege('standard',1,{coins:4930,researched:[]});conditional.phase='playing';for(const target of conditional.targets.slice(1,4))target.hp=0;
 assert.equal(conditional.remainingTowerRewards,3000);assert.ok(conditional.canRecruit('scout'));recruit(conditional,'scout');assert.equal(conditional.money,4480);assert.equal(conditional.money+conditional.remainingTowerRewards,STARTER_BUDGET);assert.equal(conditional.canRecruit('scout'),false);
});

test('real tower income saturates at the persisted wallet ceiling while all tower rewards remain auditable',()=>{
 const game=new SecretSiege('standard',1,{coins:SIEGE_COIN_LIMIT,researched:[]});recruit(game,'guard');recruit(game,'scout');assert.ok(game.start());assert.ok(game.deploy('scout'));
 const scout=game.units[0];for(const target of game.targets)target.reload=999;
 for(const tower of game.targets.filter(target=>target.kind==='tower')){
  tower.hp=10;scout.distance=tower.distance-95;scout.reload=0;for(let tick=0;tick<40;tick++)game.step(.01);
  assert.equal(tower.hp,0);assert.ok(validSiegeCoins(game.money));
 }
 assert.equal(game.money,SIEGE_COIN_LIMIT);assert.equal(game.earnedCoins,18000);
});

for(const difficulty of ['practice','standard','challenge'] as const)test(`${difficulty}: a fresh 9.90 wallet finances all ten stages and all permanent research without coin injection`,()=>{
 for(const dt of [.1,.05,1/60]){
  const campaign=simulateSecretSiegeCampaign(difficulty,dt);assert.equal(campaign.results.length,10);
  let coins=INITIAL_COINS,researchTotal=0,trainingTotal=0,rewardTotal=0;const researched=new Set<ArmyId>();
  for(const result of campaign.results){
   assert.equal(result.phase,'won',`stage=${result.stageId}, dt=${dt}`);assert.equal(result.bankBeforeResearch,coins);
   assert.equal(result.startingCoins,coins-result.researchSpent);assert.ok(result.startingCoins>=STARTER_BUDGET);
   for(const id of result.researchPurchases){assert.equal(researched.has(id),false);researched.add(id);}
   assert.equal(result.researchSpent,result.researchPurchases.reduce((sum,id)=>sum+ARMY.find(army=>army.id===id)!.researchCost,0));
   assert.equal(result.remainingMoney,result.startingCoins+result.earnedCoins-result.spent);assert.ok(result.remainingMoney>=STARTER_BUDGET);assert.equal(result.earnedCoins,18000);
   assert.ok(result.peakArmyCount<=12);assert.equal(result.towersDestroyed,4);assert.equal(result.boss,0);assert.equal(result.castle,0);
   coins=result.remainingMoney;researchTotal+=result.researchSpent;trainingTotal+=result.spent;rewardTotal+=result.earnedCoins;
  }
  assert.deepEqual([...researched],['knight','ranger','priest','champion']);assert.equal(researchTotal,60000);
  assert.deepEqual(campaign.results.filter(result=>result.researchPurchases.length).map(result=>[result.stageId,result.researchPurchases]),[[2,['knight']],[4,['ranger']],[6,['priest']],[9,['champion']]]);
  assert.equal(coins,INITIAL_COINS+rewardTotal-researchTotal-trainingTotal);assert.equal(campaign.economy.coins,coins);assert.deepEqual(new Set(campaign.economy.researched),new Set(advanced));
 }
});
