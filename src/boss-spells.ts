export type BossSpellId='haste'|'frost-ward'|'iron-will';
export interface BossSpell{readonly id:BossSpellId;readonly name:string;readonly taunt:string;readonly description:string;readonly color:number;}
export type BossSpellPhase='warning'|'active'|'rest';
export interface BossSpellState{sourceId:number;spell:BossSpell;cycle:number;phase:BossSpellPhase;remaining:number;}
export const BOSS_SPELL_WARNING_SECONDS=3,BOSS_SPELL_ACTIVE_SECONDS=5,BOSS_SPELL_REST_SECONDS=4;
export const BOSS_SPELL_CYCLE_SECONDS=BOSS_SPELL_WARNING_SECONDS+BOSS_SPELL_ACTIVE_SECONDS+BOSS_SPELL_REST_SECONDS;
export const BOSS_SPELLS:readonly BossSpell[]=[
 {id:'haste',name:'광폭 질주',taunt:'더 빨리 달려! 저 성을 무너뜨려!',description:'반경 3칸의 다른 몬스터 이동 속도 +25%',color:0xf28b63},
 {id:'frost-ward',name:'서리 파괴',taunt:'얼음으로 막겠다고? 그 정도로는 못 멈춰!',description:'반경 3칸의 다른 몬스터가 감속 중에도 속도 80% 유지',color:0x73d9f4},
 {id:'iron-will',name:'불굴의 의지',taunt:'정신 차려! 아직 싸움은 안 끝났어!',description:'반경 3칸의 다른 몬스터 기절 회복 속도 2배',color:0xd9b8ff},
];

/** Spell time follows the living boss's age, independent of the wave clock. */
export function bossSpellAt(age:number,sourceId:number):BossSpellState{
 const time=Number.isFinite(age)?Math.max(0,age):0,epsilon=1e-8;
 const cycle=Math.floor((time+epsilon)/BOSS_SPELL_CYCLE_SECONDS),local=Math.max(0,time-cycle*BOSS_SPELL_CYCLE_SECONDS);
 const activeEnd=BOSS_SPELL_WARNING_SECONDS+BOSS_SPELL_ACTIVE_SECONDS;
 const phase:BossSpellPhase=local<BOSS_SPELL_WARNING_SECONDS-epsilon?'warning':local<activeEnd-epsilon?'active':'rest';
 const end=phase==='warning'?BOSS_SPELL_WARNING_SECONDS:phase==='active'?activeEnd:BOSS_SPELL_CYCLE_SECONDS;
 const duration=phase==='warning'?BOSS_SPELL_WARNING_SECONDS:phase==='active'?BOSS_SPELL_ACTIVE_SECONDS:BOSS_SPELL_REST_SECONDS;
 return {sourceId,spell:BOSS_SPELLS[cycle%BOSS_SPELLS.length],cycle,phase,remaining:Math.min(duration,Math.max(0,end-local))};
}
