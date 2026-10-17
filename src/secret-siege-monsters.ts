import type {Difficulty} from './difficulty';
import type {SiegeMonster,SiegeMonsterId} from './secret-siege-types';

export interface SiegeMonsterSpec{id:SiegeMonsterId;name:string;firstStage:number;hp:number;attack:number;speed:number;range:number;cooldown:number;}
export const SIEGE_MONSTER_ALIVE_LIMIT=8;
export const SIEGE_MONSTERS:readonly SiegeMonsterSpec[]=Object.freeze([
 {id:'imp',name:'저주받은 임프',firstStage:1,hp:600,attack:80,speed:28,range:34,cooldown:2.2},
 {id:'warg',name:'그림자 야수',firstStage:4,hp:1200,attack:120,speed:40,range:40,cooldown:1.7},
 {id:'golem',name:'오염된 골렘',firstStage:7,hp:2400,attack:200,speed:22,range:46,cooldown:2.4},
]);
export function siegeMonster(stage:number,index:number,difficulty:Difficulty,elapsed:number):SiegeMonster{
 const available=SIEGE_MONSTERS.filter(type=>stage>=type.firstStage),type=available[index%available.length];
 const round=(value:number)=>Math.round(value/10)*10,hp=round(type.hp*(1+(stage-1)*.1)),attack=round(type.attack*(1+(stage-1)*.06));
 return {kind:'monster',id:`monster-${index+1}`,typeId:type.id,name:type.name,distance:950,hp,maxHp:hp,attack,speed:type.speed,range:type.range,cooldown:type.cooldown*{practice:1.15,standard:1,challenge:.88}[difficulty],reload:0,lastHit:-999,lastShot:-999,attacking:false,spawnedAt:elapsed};
}
