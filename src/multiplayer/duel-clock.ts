import {DUEL_PREPARATION_SECONDS,DUEL_SECONDS,type DuelState} from './duel';

export type DuelClockState='waiting'|'active'|'complete';
export type DuelClockInput=Pick<DuelState,'status'|'preparationElapsed'|'elapsed'>;
export interface DuelClocks{
 preparationSeconds:number;battleSeconds:number;
 preparationActive:boolean;battleActive:boolean;
 preparationState:DuelClockState;battleState:DuelClockState;
}

function elapsedWithin(value:number,total:number){return Number.isNaN(value)?0:Math.max(0,Math.min(total,value));}
// Authoritative ticks accumulate fractional seconds; do not display an extra
// second at an integer boundary because of insignificant floating-point drift.
function remaining(total:number,elapsed:number){return Math.max(0,Math.ceil(total-elapsedWithin(elapsed,total)-1e-8));}

/** Keep each phase's countdown separate, including a match ended before its timer expired. */
export function duelClocks(state:DuelClockInput|null|undefined):DuelClocks{
 const clocks:DuelClocks={preparationSeconds:DUEL_PREPARATION_SECONDS,battleSeconds:DUEL_SECONDS,preparationActive:false,battleActive:false,preparationState:'waiting',battleState:'waiting'};
 if(!state||state.status==='waiting')return clocks;
 if(state.status==='preparing')return {...clocks,preparationSeconds:remaining(DUEL_PREPARATION_SECONDS,state.preparationElapsed),preparationActive:true,preparationState:'active'};
 if(state.status==='playing')return {...clocks,preparationSeconds:0,battleSeconds:remaining(DUEL_SECONDS,state.elapsed),battleActive:true,preparationState:'complete',battleState:'active'};
 const enteredBattle=state.preparationElapsed>=DUEL_PREPARATION_SECONDS||state.elapsed>0;
 // A complete state means the phase has ended, even if surrender left time on it.
 return {...clocks,preparationSeconds:enteredBattle?0:remaining(DUEL_PREPARATION_SECONDS,state.preparationElapsed),battleSeconds:enteredBattle?remaining(DUEL_SECONDS,state.elapsed):DUEL_SECONDS,preparationState:enteredBattle||state.preparationElapsed>0?'complete':'waiting',battleState:enteredBattle?'complete':'waiting'};
}

export function formatDuelClock(seconds:number):string{
 const value=Number.isFinite(seconds)?Math.max(0,Math.ceil(seconds)):0;
 return `${Math.floor(value/60).toString().padStart(2,'0')}:${(value%60).toString().padStart(2,'0')}`;
}
