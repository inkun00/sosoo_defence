import type {ArmyId} from './secret-siege-types';

export const SIEGE_HUMAN_STRIDES:Readonly<Record<ArmyId,number>>={guard:74,striker:68,scout:60,knight:82,ranger:64,champion:88,priest:68};
interface MovingHuman{distance:number;attacking:boolean;lastShot?:number;lastHeal?:number;}
export interface SiegeHumanMotion{frame:number;action:'walk'|'attack'|'idle';}

/** Read model distance/time only, so pause and question dialogs freeze the pose. */
export function siegeHumanMotion(unit:MovingHuman,elapsed:number,cooldown:number,stride=68,reducedMotion=false):SiegeHumanMotion{
 if(reducedMotion)return {frame:0,action:'idle'};
 const age=elapsed-Math.max(unit.lastShot??-Infinity,unit.lastHeal??-Infinity),duration=Math.min(.95,Math.max(.08,cooldown*.8));
 if(unit.attacking||unit.lastHeal!==undefined&&elapsed-unit.lastHeal>=0&&elapsed-unit.lastHeal<duration){
  if(age>=0&&age<duration)return {frame:8+Math.min(7,Math.floor(age/duration*8)),action:'attack'};
  // Being in range does not mean an attack fired: exact-damage troops may
  // wait for the correct remainder, and must not endlessly swing their weapon.
  return {frame:0,action:'idle'};
 }
 if(!Number.isFinite(unit.distance)||unit.distance<=0)return {frame:0,action:'idle'};
 const length=Number.isFinite(stride)&&stride>0?stride:68;
 return {frame:Math.floor(unit.distance%length/length*8),action:'walk'};
}

/** A vertical road or a target directly overhead keeps the previous direction. */
export function siegeHumanFacing(horizontalDelta:number,previous:1|-1=1):1|-1{
 return horizontalDelta>2?1:horizontalDelta< -2?-1:previous;
}
