import {ARMY,type ArmyId} from './secret-siege-types';

export const INITIAL_COINS=9900,STARTER_BUDGET=7480,SIEGE_COIN_LIMIT=1000000000;
export const SIEGE_TRAINING_RESERVE=STARTER_BUDGET;
export interface SiegeEconomy{coins:number;researched:readonly ArmyId[];revision?:number;}
export function validSiegeCoins(value:unknown):value is number{return typeof value==='number'&&Number.isSafeInteger(value)&&value>=0&&value<=SIEGE_COIN_LIMIT&&value%10===0;}
export function siegeResearched(value:unknown):ArmyId[]{
 const ids=new Set(Array.isArray(value)?value.filter(id=>typeof id==='string'):[]);
 return ARMY.filter(army=>army.researchCost>0&&ids.has(army.id)).map(army=>army.id);
}
/** An explicit malformed balance never creates free starting coins. */
export function normalizeSiegeEconomy(value?:SiegeEconomy):Required<SiegeEconomy>{
 const revision=value?.revision;
 return {coins:value===undefined?INITIAL_COINS:validSiegeCoins(value.coins)?value.coins:0,researched:siegeResearched(value?.researched),revision:typeof revision==='number'&&Number.isSafeInteger(revision)&&revision>=0?revision:0};
}
