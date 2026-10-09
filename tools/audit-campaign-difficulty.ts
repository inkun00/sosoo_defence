import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {Defense,type Inventory} from '../src/model';
import {LEVELS} from '../src/levels';
import {balanceFor,type Difficulty} from '../src/difficulty';
import {COLS,ROWS,world,type Cell} from '../src/path';
import {LONG_TOWER_RANGE,TOWER_RANGE,towerType,towerPriceBand,towersForStage} from '../src/towers';
import {numberText} from '../src/math';
import {playAutomaticStage} from '../tests/adventure-helpers';

// Read-only audit of the current production model. Existing simulation tools
// are deliberately not imported: their assisted firing is no longer in the UI.
const difficulties:Difficulty[]=['practice','standard','challenge'];
type Strategy='mixed'|'cheap'|'few'|'finishers-first';
type Walls='none'|'auto';
const cells:Cell[]=Array.from({length:COLS*ROWS},(_,i)=>({x:i%COLS,y:Math.floor(i/COLS)}));
const runs:ReturnType<typeof battle>[]=[];
const groups:ReturnType<typeof summarize>[]=[];
const layoutCandidates:Record<string,number>={};
const storage=new Map<string,string>();
const originalRandom=Math.random;
const originalStorage=Object.getOwnPropertyDescriptor(globalThis,'localStorage');
Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:(k:string)=>storage.get(k)??null,setItem:(k:string,v:string)=>storage.set(k,v),removeItem:(k:string)=>storage.delete(k),clear:()=>storage.clear()}});

export function roster(stage:number,difficulty:Difficulty,strategy:Strategy):string[]{
 if(strategy==='cheap')return Array.from({length:balanceFor(stage,difficulty).towerLimit},(_,i)=>(stage===1?['double','basic']:['double','basic','pebble','needle'])[i%(stage===1?2:4)]);
 if(strategy==='few')return stage===1?['basic']:stage===2?['basic','pebble','needle']:stage===11?['rune','catapult','needle']:['catapult','basic','needle'];
 if(strategy==='finishers-first')return stage===1?['double','basic']:stage===2?['double','basic','pebble','needle']:['needle','pebble','basic','frost','catapult','catapult','rune','rune','basic'];
 return stage===11?['rune','rune','catapult','catapult','crystal','frost','basic','pebble','needle']:stage===1?['double','basic','basic','double']:stage===2?['double','frost','basic','pebble','needle']:stage===9?['catapult','catapult','needle','frost','pebble','basic','double']:stage<=4?['catapult','catapult','frost','basic','pebble','needle']:['catapult','catapult','crystal','basic','pebble','needle'];
}
function noise(seed:number):number{let x=seed|0;x=Math.imul(x^(x>>>16),0x45d9f3b);x=Math.imul(x^(x>>>16),0x45d9f3b);return ((x^(x>>>16))>>>0)/4294967296;}
function fusionIds(m:Defense):number[]|undefined{
 for(let a=0;a<m.bricks.length;a++)for(let b=a+1;b<m.bricks.length;b++){
  const result=m.bricks.find((brick,c)=>c!==a&&c!==b&&brick.value===m.bricks[a].value+m.bricks[b].value);
  if(result)return [m.bricks[a].id,m.bricks[b].id,result.id];
 }
}
export function prepare(stage:number,difficulty:Difficulty,strategy:Strategy,budget:number,layout:number,inventory?:Inventory){
 const m=new Defense({...LEVELS[stage-1],budget},inventory,difficulty),road=m.path()!,used:Record<string,number>={};
 const purchaseQuestions:{before:number;cost:number;answer:number;digits:number}[]=[];
 for(const id of roster(stage,difficulty,strategy)){
  const type=towerType(id)!;if(type.unlock>stage)continue;
  const copy=used[id]??0;used[id]=copy+1;
  const focus=(id==='needle'?.82:id==='pebble'?.72:id==='basic'?.66:type.effect==='slow'?.36:.18+copy*.28)+(layout%7-3)*.035;
  const radius=type.effect==='range'?LONG_TOWER_RANGE:TOWER_RANGE;
  const score=(c:Cell)=>road.reduce((s,p,i)=>s+(Math.hypot(world(p).x-world(c).x,world(p).y-world(c).y)<=radius?Math.exp(-Math.pow((i/(road.length-1)-focus)*3,2)):0),0)/m.reloadFactor(c)*(1+.22*(noise((layout+1)*1231+(copy+1)*701+(c.y*COLS+c.x)*71+type.unit)-.5));
  const ranked=cells.filter(c=>m.candidate(c)).sort((a,b)=>score(b)-score(a)||a.y-b.y||a.x-b.x);
  const c=ranked[Math.floor(layout/7)%Math.min(8,ranked.length)];
  if(c&&m.requestPurchase(c,id)){
   const q=m.pendingPurchase!;
   assert.equal(q.cost%10,0);assert.equal(q.before%10,0);assert.ok(q.digits<=2);
   assert.ok(q.before<10000&&q.cost<10000&&q.before>=q.cost);
   assert.ok(m.answerPurchase(numberText(q.before-q.cost,q.digits)));
   purchaseQuestions.push({before:q.before,cost:q.cost,answer:q.before-q.cost,digits:q.digits});
  }
 }
 const formation=m.towers.map(t=>({typeId:t.typeId,x:t.x,y:t.y,cost:t.cost}));
 const signature=JSON.stringify(formation.map(({typeId,x,y})=>({typeId,x,y})).sort((a,b)=>a.typeId.localeCompare(b.typeId)||a.x-b.x||a.y-b.y));
 return {m,formation,signature,purchaseQuestions};
}
export function battle(prepared:ReturnType<typeof prepare>,strategy:Strategy,walls:Walls,layout:number,category:string,ratio:number,inventory?:Inventory){
 const {m,formation,signature,purchaseQuestions}=prepared;
 storage.clear();let recipeSeed=m.level.id*10007+layout*997+53;
 Math.random=()=>{recipeSeed=(Math.imul(recipeSeed,1664525)+1013904223)>>>0;return recipeSeed/4294967296;};
 const spent=m.towers.reduce((n,t)=>n+t.cost,0),remaining=m.money;
 const initialTowerIds=m.towers.map(t=>t.id);let shots=0,wallImpacts=0,wallBreaks=0,frames=0;
 m.events=[];
 const started=m.start();
 for(;started&&frames<3000&&m.phase==='playing';frames++){
  m.step(.1);
  if(walls==='auto'){
   // Recognize any genuine addition triple, including leftovers carried from
   // an earlier stage. No recipe/HP editing or wall generation without a sum.
   for(let ids=fusionIds(m);ids;ids=fusionIds(m))assert.ok(m.fuse(ids));
   if(m.wallStock&&m.walls.length<m.balance.wallLimit){const c=m.path()!.slice().reverse().find(c=>m.candidate(c,true));if(c)m.placeWall(c);}
  }
  for(const e of m.events){if(e.type==='shot')shots++;if(e.type==='wall-impact')wallImpacts++;if(e.type==='wall-break')wallBreaks++;}
  m.events=[];
 }
 assert.equal(m.switches,0);assert.ok(m.towers.every(t=>t.enabled));
 assert.deepEqual(m.towers.map(t=>t.id),initialTowerIds);assert.equal(m.purchases,formation.length);
 assert.equal(shots,m.successfulHits+m.invalidHits);assert.equal(m.level.budget,spent+remaining);
 assert.ok(m.towers.length<=m.balance.towerLimit);assert.ok(m.walls.length<=m.balance.wallLimit);
 assert.ok(m.towers.filter(t=>t.unit===10).length<=m.balance.precisionLimit);
 if(walls==='none'){assert.equal(m.fusions,0);assert.equal(m.wallPlacements,0);}
 const ended=m.phase==='won'||m.phase==='review';
 return {category,stage:m.level.id,difficulty:m.difficulty,strategy,walls,ratio,budget:m.level.budget,layout,signature,phase:m.phase,cleared:m.phase==='won',defended:ended&&m.castle>0,bossDefeated:m.bossDefeated,bossRequired:m.level.id===10||!!m.level.boss,castle:m.castle,kills:m.kills,leaks:m.leaks,spawned:m.spawned,enemiesLeft:m.enemies.length,seconds:Number((frames*.1).toFixed(1)),spent,remaining,finalMoney:m.money,purchases:m.purchases,purchaseQuestions,towers:formation.length,formation,shots,successfulHits:m.successfulHits,invalidHits:m.invalidHits,switches:m.switches,fusions:m.fusions,wallPlacements:m.wallPlacements,wallImpacts,wallBreaks,usedUnits:[...m.usedUnits].sort((a,b)=>a-b),borrowTenths:m.borrowTenths,borrowHundredths:m.borrowHundredths,goals:m.goals,stars:m.stars,initialInventory:inventory??{bricks:[],walls:0},inventory:m.inventory};
}
export function summarize(group:ReturnType<typeof battle>[]){
 const first=group[0],wins=group.filter(r=>r.cleared),defenses=group.filter(r=>r.defended);
 const range=(values:number[])=>values.length?[Math.min(...values),Math.max(...values)]:null;
 return {category:first.category,stage:first.stage,difficulty:first.difficulty,strategy:first.strategy,walls:first.walls,ratio:first.ratio,budget:first.budget,initialWalls:first.initialInventory.walls,attempts:group.length,uniqueFormations:new Set(group.map(r=>r.signature)).size,clears:wins.length,defenses:defenses.length,bossKills:group.filter(r=>r.bossDefeated).length,castle:range(group.map(r=>r.castle)),winningCastle:range(wins.map(r=>r.castle)),defendingCastle:range(defenses.map(r=>r.castle)),kills:range(group.map(r=>r.kills)),leaks:range(group.map(r=>r.leaks)),spent:range(group.map(r=>r.spent)),remaining:range(group.map(r=>r.remaining)),towers:range(group.map(r=>r.towers)),shots:range(group.map(r=>r.shots)),successfulHits:range(group.map(r=>r.successfulHits)),invalidHits:range(group.map(r=>r.invalidHits)),seconds:range(group.map(r=>r.seconds)),fusions:range(group.map(r=>r.fusions)),wallPlacements:range(group.map(r=>r.wallPlacements)),missingGoals:[...new Set(group.flatMap(r=>r.goals.filter(g=>!g.done).map(g=>g.label)))],runIndices:group.map(r=>runs.indexOf(r))};
}
function sample(stage:number,difficulty:Difficulty,strategy:Strategy,walls:Walls,ratio:number,count:number,category:string,budgetOverride?:number){
 const budget=budgetOverride??Math.floor(LEVELS[stage-1].budget*ratio/(stage===1?100:10))*(stage===1?100:10),seen=new Set<string>(),group:ReturnType<typeof battle>[]=[];
 let candidates=0;
 for(let layout=0;layout<512&&group.length<count;layout++){
  candidates++;const prepared=prepare(stage,difficulty,strategy,budget,layout);
  if(seen.has(prepared.signature))continue;seen.add(prepared.signature);
  const r=battle(prepared,strategy,walls,layout,category,ratio);runs.push(r);group.push(r);
 }
 assert.equal(group.length,count,`${category} ${stage}/${difficulty}/${strategy}/${walls}/${ratio}: not enough unique formations`);
 const summary=summarize(group);assert.equal(summary.uniqueFormations,count);groups.push(summary);
 layoutCandidates[`${category}:${stage}:${difficulty}:${strategy}:${walls}:${ratio}`]=candidates;
}

function addWitnesses(report:any){
 const witnesses=[];
 for(const carry of [false,true])for(const difficulty of difficulties){
  let inventory:Inventory={bricks:[],walls:0};
  for(const level of LEVELS){
   const m=playAutomaticStage(level.id,difficulty,carry?inventory:{bricks:[],walls:0});
   witnesses.push({carry,difficulty,stage:level.id,phase:m.phase,castle:m.castle,kills:m.kills,leaks:m.leaks,bossDefeated:m.bossDefeated,budget:m.level.budget,spent:m.towers.reduce((sum,t)=>sum+t.cost,0),formation:m.formation,goals:m.goals,switches:m.switches,inventory:m.inventory});
   if(carry)inventory=m.inventory;
  }
 }
 report.successfulWitnesses=witnesses;report.witnessFixture='tests/adventure-helpers.ts';
 report.countByCategory['automatic-campaign-witness']=witnesses.length;
 report.totalRuns=report.runs.length+witnesses.length;
 const dirtyGameFiles=execFileSync('git',['diff','--name-only','--','src/levels.ts','src/difficulty.ts','src/model.ts'],{encoding:'utf8'}).trim().split(/\r?\n/).filter(Boolean);
 report.sourceState={baseHead:report.revision,kind:dirtyGameFiles.length?'working-tree':'committed',dirtyGameFiles};
 return report;
}
const outputArgument=process.argv.indexOf('--output');
const output=outputArgument>=0?process.argv[outputArgument+1]:'test-results/difficulty-after-campaign.json';
if(!output)throw new Error('--output requires a filename');
export async function main(){try{
 for(const difficulty of difficulties)for(const level of LEVELS){
  for(const strategy of ['mixed','cheap','few'] as const)for(const walls of ['none','auto'] as const)sample(level.id,difficulty,strategy,walls,1,8,'current-budget');
  console.log(`Current-budget audit: ${difficulty} stage ${level.id}, ${runs.length} battles`);
 }
 for(const difficulty of difficulties)for(const level of LEVELS){
  for(const ratio of [.9,.75,.5])for(const strategy of ['mixed','finishers-first'] as const)sample(level.id,difficulty,strategy,'auto',ratio,4,'budget-probe');
  console.log(`Budget probes: ${difficulty} stage ${level.id}, ${runs.length} battles`);
 }
 for(const difficulty of difficulties)for(const [stage,budgets] of [[1,[300,900]],[2,[1800,3500]],[3,[6560]],[4,[6630]]] as const)for(const budget of budgets)for(const strategy of ['mixed','finishers-first'] as const)sample(stage,difficulty,strategy,'auto',budget/LEVELS[stage-1].budget,4,'early-budget-probe',budget);
 // Successful progression is required to carry inventory to the next stage.
 const campaigns=[];
 for(const difficulty of difficulties)for(let layout=0;layout<8;layout++){
  let inventory:Inventory={bricks:[],walls:0};const indices:number[]=[];
  for(const level of LEVELS){
   const prepared=prepare(level.id,difficulty,'mixed',level.budget,layout,inventory);
   const r=battle(prepared,'mixed','auto',layout,'inventory-campaign',1,inventory);
   runs.push(r);indices.push(runs.length-1);if(!r.cleared)break;inventory=r.inventory;
  }
  campaigns.push({difficulty,layout,stagesAttempted:indices.length,completed:indices.length===LEVELS.length&&runs[indices.at(-1)!].cleared,runIndices:indices});
 }
 // Late-stage paired placements test the strength of stock saved across retries.
 // Ten intact carried walls is an intentionally generous experiment, not the
 // starting inventory of a first-time student; actual wall limits still apply.
 for(const stage of [9,10,11]){
  const baseline=groups.find(g=>g.category==='current-budget'&&g.stage===stage&&g.difficulty==='standard'&&g.strategy==='mixed'&&g.walls==='auto')!;
  for(const wallStock of [0,10]){
   const inventory:Inventory={bricks:[],walls:wallStock};const group=[];
   for(const index of baseline.runIndices){
    const layout=runs[index].layout,prepared=prepare(stage,'standard','mixed',LEVELS[stage-1].budget,layout,inventory);
    const r=battle(prepared,'mixed','auto',layout,'retry-inventory-probe',1,inventory);runs.push(r);group.push(r);
   }
   groups.push(summarize(group));
  }
 }
 const revision=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
 const currentBudget=LEVELS.map(l=>({stage:l.id,name:l.name,budget:l.budget,maximumTowerPrice:Math.max(...towersForStage(l.id).map(t=>towerPriceBand(t,l.id).high)),limits:Object.fromEntries(difficulties.map(d=>[d,balanceFor(l.id,d)]))}));
 const report={generatedAt:new Date().toISOString(),revision,totalRuns:runs.length,countByCategory:Object.fromEntries(['current-budget','budget-probe','early-budget-probe','inventory-campaign','retry-inventory-probe'].map(c=>[c,runs.filter(r=>r.category===c).length])),frameSeconds:.1,maxSeconds:300,placements:'8 distinct spread formations per current-budget condition; 4 distinct formations per budget-probe condition; candidate preparation duplicates never counted as battles.',currentBudget,layoutCandidates,groups,campaigns,notes:['Perfect answers to actual purchase questions; no student response time, wrong answers, retries or unfamiliarity modeled. These are algorithmic examples, never student win rates.','All runs keep automatic firing enabled. Firing toggles, battle purchases, tower sales, tower movement and gameplay-value edits are absent.','Defense success means phase won/review with living castle after all enemies finish. Advance/clear means phase won and every learning objective. Boss kill is reported separately even where boss escape still leaves a surviving castle.','Current-budget no-wall controls distinguish tower strength from wall contribution; wall auto assumes instant correct recognition of dropped genuine addition recipes.','Empty-inventory stages are independent. Inventory campaigns advance only after won and stop at the first review/loss. Campaign formations may duplicate across seeds and are counted separately from unique samples.','Combat RNG and waves are the production deterministic stage seeds. Recipe RNG is seeded in this process and browser storage is emulated/reset each battle for reproducibility, without changing game source or user browser data. Recipe numeric variation does not alter tower attacks when every addition is answered perfectly.','Budget probes keep stage definitions cloned and round to current legal 0.1/0.01 increments. They test two purchase orders and four sampled placements, not global minimum budgets or recommended student budgets.','Wallet, cost, damage and HP integers use 1000 scale; every current amount/question is a multiple of 10. Displayed coin amounts are integers divided by 1000.','Prepared spending/remaining is captured before battle rewards. FinalMoney cannot measure available preparation margin.','Retry inventory probes compare the same 8 standard-stage 9/10/11 formations with 0 versus 10 intact carried walls; wall placement limits and physics are unchanged.'],runs};
 await mkdir('test-results',{recursive:true});
 await writeFile(output,JSON.stringify(addWitnesses(report),null,2)+'\n');
 console.log(JSON.stringify({totalRuns:report.totalRuns,countByCategory:report.countByCategory,campaignCompletions:difficulties.map(d=>({difficulty:d,completed:campaigns.filter(c=>c.difficulty===d&&c.completed).length,attempts:campaigns.filter(c=>c.difficulty===d).length}))},null,2));
}finally{
 Math.random=originalRandom;
 if(originalStorage)Object.defineProperty(globalThis,'localStorage',originalStorage);else Reflect.deleteProperty(globalThis,'localStorage');
}}
if(process.argv[1]?.endsWith('audit-campaign-difficulty.ts')){
 if(process.argv.includes('--witness-only')){
  const report=addWitnesses(JSON.parse(await readFile(output,'utf8')));
  await writeFile(output,JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({totalRuns:report.totalRuns,witnesses:report.successfulWitnesses.length}));
 }else await main();
}
