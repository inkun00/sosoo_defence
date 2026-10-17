/** Existing masked monster illustrations are reused without changing their pixels. */
export const SIEGE_MONSTER_ART={
 imp:{texture:'heroes-level-1-v1',row:0,height:58,stride:55},
 warg:{texture:'heroes-level-4-v1',row:0,height:72,stride:78},
 golem:{texture:'heroes-level-6-v1',row:2,height:88,stride:90},
} as const;
export function siegeMonsterArt(id:string){return SIEGE_MONSTER_ART[id as keyof typeof SIEGE_MONSTER_ART]??SIEGE_MONSTER_ART.imp;}
export function siegeMonsterArtTextures(stage:number){
 return [...new Set([SIEGE_MONSTER_ART.imp.texture,...(stage>=4?[SIEGE_MONSTER_ART.warg.texture]:[]),...(stage>=7?[SIEGE_MONSTER_ART.golem.texture]:[])])];
}

/** Walking follows actual travel; a real attack produces one restrained lunge. */
export function siegeMonsterMotion(monster:{distance:number;attacking:boolean;lastShot?:number;cooldown:number},elapsed:number,stride=70,reduced=false){
 if(reduced)return {frame:0,lunge:0};
 if(monster.attacking){
  const age=elapsed-(monster.lastShot??-Infinity),duration=Math.min(.65,monster.cooldown*.7);
  if(age>=0&&age<duration){const phase=age/duration;return {frame:Math.min(3,Math.floor(phase*4)),lunge:Math.sin(phase*Math.PI)*3};}
  return {frame:0,lunge:0};
 }
 const travelled=Math.max(0,950-monster.distance);
 return {frame:Math.floor(travelled/stride*4)%4,lunge:0};
}
