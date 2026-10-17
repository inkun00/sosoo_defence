export type ArmyId='guard'|'striker'|'scout'|'knight'|'ranger'|'champion'|'priest';
export type SiegePhase='ready'|'playing'|'paused'|'won'|'lost';
export interface ArmySpec{id:ArmyId;name:string;cost:number;hp:number;attack:number;speed:number;range:number;cooldown:number;sheet:string;row:number;description:string;researchCost:number;supportHeal?:number;supportCooldown?:number;supportRange?:number;}
export const ARMY:readonly ArmySpec[]=[
 {id:'guard',name:'왕국 방패병',cost:1200,hp:5400,attack:200,speed:48,range:40,cooldown:1.5,sheet:'siege-human-guard-v2',row:0,description:'튼튼한 선봉',researchCost:0},
 {id:'striker',name:'왕국 돌격병',cost:900,hp:2400,attack:750,speed:60,range:65,cooldown:1.4,sheet:'siege-human-striker-v2',row:1,description:'성문을 깨는 주력',researchCost:0},
 {id:'scout',name:'왕국 정찰병',cost:450,hp:1200,attack:10,speed:70,range:95,cooldown:.55,sheet:'siege-human-scout-v2',row:2,description:'작은 나머지 마무리',researchCost:0},
 {id:'knight',name:'왕국 기사',cost:1800,hp:7800,attack:400,speed:46,range:42,cooldown:1.6,sheet:'siege-human-knight-v1',row:3,description:'중갑 방패로 전선을 지켜요',researchCost:8000},
 {id:'ranger',name:'장궁 명사수',cost:1500,hp:2400,attack:250,speed:54,range:150,cooldown:.7,sheet:'siege-human-ranger-v1',row:4,description:'후방에서 빠른 원거리 사격',researchCost:12000},
 {id:'champion',name:'해방군 검투사',cost:2400,hp:6000,attack:1500,speed:48,range:48,cooldown:1.5,sheet:'siege-human-champion-v1',row:5,description:'강력한 일격으로 수비진 돌파',researchCost:24000},
 {id:'priest',name:'왕국 사제',cost:2000,hp:3600,attack:100,speed:50,range:125,cooldown:1.8,sheet:'siege-human-priest-v1',row:6,description:'부상한 아군을 자동 회복',researchCost:16000,supportHeal:200,supportCooldown:3,supportRange:180},
];
export const SIEGE_PATH_LENGTH=1000,SIEGE_DURATION=180,SIEGE_ARMY_LIMIT=12;
export interface SiegeUnit{id:string;typeId:ArmyId;distance:number;hp:number;maxHp:number;reload:number;lastHit:number;attacking:boolean;deployedAt:number;hexUntil?:number;lastShot?:number;targetId?:string;lastHeal?:number;healReload?:number;}
export type SiegeMonsterId='imp'|'warg'|'golem';
export interface SiegeMonster{kind:'monster';id:string;typeId:SiegeMonsterId;name:string;distance:number;hp:number;maxHp:number;attack:number;speed:number;range:number;cooldown:number;reload:number;lastHit:number;lastShot?:number;attacking:boolean;targetId?:string;spawnedAt:number;}
export interface SiegeTarget{id:string;kind:'tower'|'boss'|'castle';name:string;distance:number;hp:number;maxHp:number;attack:number;cooldown:number;range:number;reload:number;lastHit:number;towerKind?:'arcane'|'venom';placement?:{x:number;y:number};lastShot?:number;}
export interface SiegeProjectile{id:number;source:'army'|'enemy';fromDistance:number;toDistance:number;age:number;duration:number;damage:number;targetId:string;sourceId?:string;}
export interface SiegeQuestion{id:number;kind:'recruit'|'rally';armyId?:ArmyId;a:number;b:number;operation:'+'|'-';answer:number;}
export interface SiegeEvent{type:'recruit'|'deploy'|'shot'|'hit'|'destroy'|'rally'|'spell'|'won'|'lost'|'reward'|'heal'|'monster-spawn';message:string;targetId?:string;damage?:number;friendly?:boolean;}
