export type Difficulty='practice'|'standard'|'challenge';
export const DIFFICULTIES:Record<Difficulty,{name:string;description:string}>={
 practice:{name:'연습',description:'천천히 계산하고 배치를 익혀요'},
 standard:{name:'표준',description:'한정된 타워로 공격 단위를 골라요'},
 challenge:{name:'도전',description:'빠른 몬스터와 적은 타워로 방어해요'}
};
export function isDifficulty(value:unknown):value is Difficulty{return value==='practice'||value==='standard'||value==='challenge';}
export function balanceFor(stage:number,difficulty:Difficulty){
 const tier=stage===1?0:stage===2?1:stage<=5?2:3;
 const towers={practice:[4,8,12,17],standard:[3,6,10,14],challenge:[2,5,9,13]};
 const speed=difficulty==='practice'?(stage<=4?27:24):(27+(stage-1)*.8)*(difficulty==='challenge'?1.12:1);
 return {speed,towerLimit:towers[difficulty][tier],precisionLimit:difficulty==='practice'?4:difficulty==='standard'?3:2,wallLimit:difficulty==='practice'?6:difficulty==='standard'?4:3};
}
