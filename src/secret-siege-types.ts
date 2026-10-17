export type ArmyId='guard'|'striker'|'scout';
export type SiegePhase='ready'|'playing'|'paused'|'won'|'lost';
export interface ArmySpec{id:ArmyId;name:string;cost:number;hp:number;attack:number;speed:number;range:number;cooldown:number;sheet:string;row:number;description:string;}
export const ARMY:readonly ArmySpec[]=[
 {id:'guard',name:'왕국 방패병',cost:1200,hp:5400,attack:200,speed:48,range:40,cooldown:1.5,sheet:'siege-human-army-walk-v1',row:0,description:'튼튼한 선봉 · 공격 0.2'},
 {id:'striker',name:'왕국 돌격병',cost:900,hp:2400,attack:750,speed:60,range:65,cooldown:1.4,sheet:'siege-human-army-walk-v1',row:1,description:'성문을 깨는 주력 · 공격 0.75'},
 {id:'scout',name:'왕국 정찰병',cost:450,hp:1200,attack:10,speed:70,range:95,cooldown:.55,sheet:'siege-human-army-walk-v1',row:2,description:'작은 나머지 마무리 · 공격 0.01'},
];
export const SIEGE_PATH_LENGTH=1000,SIEGE_DURATION=180,SIEGE_ARMY_LIMIT=12;
export interface SiegeUnit{id:string;typeId:ArmyId;distance:number;hp:number;maxHp:number;reload:number;lastHit:number;attacking:boolean;deployedAt:number;}
export interface SiegeTarget{id:string;kind:'tower'|'castle';name:string;distance:number;hp:number;maxHp:number;attack:number;cooldown:number;range:number;reload:number;lastHit:number;towerKind?:'arcane'|'venom';placement?:{x:number;y:number};lastShot?:number;}
export interface SiegeProjectile{id:number;source:'army'|'enemy';fromDistance:number;toDistance:number;age:number;duration:number;damage:number;targetId:string;sourceId?:string;}
export interface SiegeQuestion{id:number;kind:'recruit'|'rally';armyId?:ArmyId;a:number;b:number;operation:'+'|'-';answer:number;}
export interface SiegeEvent{type:'recruit'|'deploy'|'shot'|'hit'|'destroy'|'rally'|'won'|'lost';message:string;targetId?:string;damage?:number;friendly?:boolean;}
