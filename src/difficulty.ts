export type Difficulty='practice'|'standard'|'challenge';
export const DEFAULT_SPAWN_INTERVAL=8.4;
export const DIFFICULTIES:Record<Difficulty,{name:string;description:string}>={
 practice:{name:'연습',description:'천천히 계산하고 배치를 익혀요'},
 standard:{name:'표준',description:'한정된 타워로 공격 단위를 골라요'},
 challenge:{name:'도전',description:'빠른 몬스터와 적은 타워로 방어해요'}
};
export function isDifficulty(value:unknown):value is Difficulty{return value==='practice'||value==='standard'||value==='challenge';}
export function balanceFor(stage:number,difficulty:Difficulty){
 const tier=stage===1?0:stage===2?1:stage<=5?2:3;
 const towers={practice:[4,8,12,17],standard:[3,6,10,14],challenge:[2,5,9,13]};
 const speed=difficulty==='practice'?(stage<=4?27:24):difficulty==='challenge'&&stage<=5?35:(27+(stage-1)*.8)*(difficulty==='challenge'?1.12:1);
 // Early standard lessons introduce overlapping enemies; challenge tests
 // small, incomplete formations sooner. Later stages retain their existing
 // pacing because their HP, new learning goals and bosses already add pressure.
 const spawnInterval=difficulty==='practice'?DEFAULT_SPAWN_INTERVAL:difficulty==='standard'?(stage===3?6.4:stage===4||stage===5?4.4:DEFAULT_SPAWN_INTERVAL):stage===1?3.2:stage===2?2.8:stage<=5?4.4:DEFAULT_SPAWN_INTERVAL;
 return {speed,spawnInterval,towerLimit:towers[difficulty][tier],precisionLimit:difficulty==='practice'?4:difficulty==='standard'?3:2,wallLimit:difficulty==='practice'?6:difficulty==='standard'?4:3};
}
