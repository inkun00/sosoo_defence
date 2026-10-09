import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {prepare,battle,summarize} from './audit-campaign-difficulty';
import {LEVELS} from '../src/levels';
import type {Difficulty} from '../src/difficulty';

// Isolated parameter probes, never edits the game's HP or production balance.
// Override this model instance's balance only; actual purchase/attack/wall rules
// and the production model's spawnInterval scheduling remain in force.
const results=[];
const quick=process.argv.includes('--quick'),count=quick?8:4;
const modes:Difficulty[]=quick?['challenge']:['standard','challenge'];
for(const difficulty of modes)for(const stage of quick?[1,2]:difficulty==='standard'?[3,4,5]:[1,2,3,4,5]){
 const speedCandidates=quick?[35]:difficulty==='standard'?[undefined,32,35]:stage===1?[32,35,38]:stage===2?[33,36,39]:[undefined,35,38];
 for(const speed of speedCandidates)for(const spawnInterval of quick?[3.8,3.2,2.8]:[8.4,6.4,5.2,4.4])for(const strategy of ['mixed','cheap','few'] as const){
  const samples=[],seen=new Set<string>();let actualSpeed=0;
  for(let layout=0;layout<64&&samples.length<count;layout++){
   const prepared=prepare(stage,difficulty,strategy,LEVELS[stage-1].budget,layout);
   if(seen.has(prepared.signature))continue;seen.add(prepared.signature);
   const base=prepared.m.balance;
   actualSpeed=speed??base.speed;
   Object.defineProperty(prepared.m,'balance',{get:()=>({...base,speed:speed??base.speed,spawnInterval})});
   samples.push(battle(prepared,strategy,'auto',layout,'tuning-probe',1));
  }
  assert.equal(samples.length,count);
  const {runIndices,...summary}=summarize(samples);
  results.push({difficulty,stage,speed:actualSpeed,spawnInterval,...summary,samples});
 }
 console.log(`Tuning probes ${difficulty} stage ${stage}: ${results.reduce((n,r)=>n+r.attempts,0)} battles`);
}
await mkdir('test-results',{recursive:true});
await writeFile(`test-results/difficulty-tuning-${quick?'early-challenge':'campaign'}.json`,JSON.stringify({totalRuns:results.reduce((n,r)=>n+r.attempts,0),results},null,2)+'\n');
console.log(JSON.stringify({totalRuns:results.reduce((n,r)=>n+r.attempts,0)}));
