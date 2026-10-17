import {FINAL_STAGE} from './levels';
import {TOWERS,towerType} from './towers';
import type {Defense} from './model';
import type {Save} from './save';

export const TOWER_RESEARCH_PRICES:Readonly<Record<string,number>>=Object.freeze({basic:0,double:0,needle:0,pebble:800,frost:1500,ice:2000,catapult:3500,lightning:4000,crystal:5000,sniper:6000,siege:7000,rune:10000});
export const TOWER_RESEARCH_COIN_LIMIT=1000000000,TOWER_RESEARCH_RECEIPT_LIMIT=128;
export type TowerResearchOutcome='won'|'review'|'lost';
export interface TowerResearchShop{battleId:string;stage:number;outcome:TowerResearchOutcome;earned:number;nextStage:number;}
export interface TowerResearchProgress{version:1;coins:number;developed:string[];receipts:string[];pendingShop?:TowerResearchShop;}
type ResearchSave=Pick<Save,'level'|'towerResearch'>;
const STARTER_TOWERS=['basic','double','needle'];
const whole=(value:unknown,min:number,max:number):value is number=>typeof value==='number'&&Number.isSafeInteger(value)&&value>=min&&value<=max;
const amount=(value:unknown):value is number=>whole(value,0,TOWER_RESEARCH_COIN_LIMIT);
const battleId=(value:unknown):value is string=>typeof value==='string'&&/^[A-Za-z0-9][A-Za-z0-9:._-]{0,159}$/.test(value);
const outcome=(value:unknown):value is TowerResearchOutcome=>value==='won'||value==='review'||value==='lost';
const nextStage=(stage:number,result:TowerResearchOutcome)=>result==='won'?Math.min(FINAL_STAGE,stage+1):stage;

export function freshTowerResearchProgress():TowerResearchProgress{return {version:1,coins:0,developed:[...STARTER_TOWERS],receipts:[]};}

/** Only saves with no research field receive the one-time legacy stage migration. */
export function restoreTowerResearchProgress(raw:unknown,legacyLevel=1):TowerResearchProgress{
 const progress=freshTowerResearchProgress();
 if(raw===undefined){
  const stage=whole(legacyLevel,1,FINAL_STAGE)?legacyLevel:1;
  progress.developed=TOWERS.filter(type=>type.unlock<=stage||STARTER_TOWERS.includes(type.id)).map(type=>type.id);
  return progress;
 }
 if(!raw||typeof raw!=='object'||Array.isArray(raw))return progress;
 const value=raw as Record<string,unknown>;
 if(value.version!==1)return progress;
 progress.coins=amount(value.coins)?value.coins:0;
 const developed=new Set(Array.isArray(value.developed)?value.developed.filter((id):id is string=>typeof id==='string'&&!!towerType(id)):[]);
 for(const id of STARTER_TOWERS)developed.add(id);
 progress.developed=TOWERS.filter(type=>developed.has(type.id)).map(type=>type.id);
 const receipts=Array.isArray(value.receipts)?value.receipts.filter(battleId):[];
 progress.receipts=[...new Set(receipts.slice().reverse())].reverse().slice(-TOWER_RESEARCH_RECEIPT_LIMIT);
 const pending=value.pendingShop;
 if(pending&&typeof pending==='object'&&!Array.isArray(pending)){
  const row=pending as Record<string,unknown>;
  if(battleId(row.battleId)&&progress.receipts.includes(row.battleId)&&whole(row.stage,1,FINAL_STAGE)&&outcome(row.outcome)&&amount(row.earned)&&row.nextStage===nextStage(row.stage,row.outcome)){
   progress.pendingShop={battleId:row.battleId,stage:row.stage,outcome:row.outcome,earned:row.earned,nextStage:row.nextStage};
  }
 }
 return progress;
}

/** Returns a detached, normalized snapshot; reading never changes the save. */
export function researchProgress(save:ResearchSave):TowerResearchProgress{return restoreTowerResearchProgress(save.towerResearch,save.level);}

/** Credit actual monster coin drops once; budgets, refunds and wall bricks are excluded by Defense. */
export function recordTowerResearchReward(save:ResearchSave,id:string,model:Pick<Defense,'phase'|'earnedCoins'|'level'>):boolean{
 if(!battleId(id)||!outcome(model.phase)||!whole(model.level.id,1,FINAL_STAGE)||!amount(model.earnedCoins))return false;
 const progress=researchProgress(save);
 if(progress.receipts.includes(id))return false;
 progress.coins=Math.min(TOWER_RESEARCH_COIN_LIMIT,progress.coins+model.earnedCoins);
 progress.receipts=[...progress.receipts,id].slice(-TOWER_RESEARCH_RECEIPT_LIMIT);
 progress.pendingShop={battleId:id,stage:model.level.id,outcome:model.phase,earned:model.earnedCoins,nextStage:nextStage(model.level.id,model.phase)};
 save.towerResearch=progress;
 return true;
}

/** Apply to a candidate save and persist it successfully before updating the live UI. */
export function developTower(save:ResearchSave,id:string):boolean{
 const type=towerType(id),progress=researchProgress(save),cost=TOWER_RESEARCH_PRICES[id];
 if(!type||!amount(cost)||progress.developed.includes(id)||progress.coins<cost)return false;
 progress.coins-=cost;progress.developed=TOWERS.filter(type=>type.id===id||progress.developed.includes(type.id)).map(type=>type.id);
 save.towerResearch=progress;return true;
}

export function dismissTowerResearchShop(save:ResearchSave):boolean{
 const progress=researchProgress(save);
 if(!progress.pendingShop)return false;
 delete progress.pendingShop;save.towerResearch=progress;return true;
}
