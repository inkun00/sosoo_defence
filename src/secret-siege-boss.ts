import type {Difficulty} from './difficulty';
import type {SiegeTarget} from './secret-siege-types';

export type SiegeBossSpellKind='shadow-wave'|'soul-chain';
export interface SiegeBossSpell{
 kind:SiegeBossSpellKind;phase:'warning'|'active';startedAt:number;resolvesAt:number;endsAt:number;centerDistance:number;radius:number;
}
export interface SiegeBossState{
 phase:'dormant'|'dueling'|'enraged'|'defeated';spell?:SiegeBossSpell;nextSpellAt:number;spellCount:number;
 lastSpellAt:number;lastSpellKind?:SiegeBossSpellKind;enragedAt:number;
}
/** A separate combat enemy; its large health never becomes a learning operand. */
export const REVIVED_WIZARD=Object.freeze({hp:119900,attack:260,enragedAttack:340,range:240,enrageRatio:.4,warning:2.8,waveDamage:440,chainDamage:200,hexDuration:3.5,hexReloadScale:1.6});
export function revivedWizard(difficulty:Difficulty):SiegeTarget{
 const cooldown={practice:1.8,standard:1.55,challenge:1.3}[difficulty];
 return{id:'revived-wizard',kind:'boss',name:'부활한 저주 마법사',distance:885,placement:{x:-70,y:264},hp:REVIVED_WIZARD.hp,maxHp:REVIVED_WIZARD.hp,attack:REVIVED_WIZARD.attack,cooldown,range:REVIVED_WIZARD.range,reload:0,lastHit:-999,lastShot:-999};
}
export function newSiegeBossState():SiegeBossState{return{phase:'dormant',nextSpellAt:Infinity,spellCount:0,lastSpellAt:-999,enragedAt:-999};}
