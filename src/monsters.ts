export type MonsterKind='slime'|'beetle'|'golem'|'crystal'|'king';
export interface MonsterArt{name:string;atlas:string;size:number;speed:number;color:number;boss:boolean;}
// Size affects art only: every enemy follows the same legal one-cell route.
export const MONSTERS:Record<MonsterKind,MonsterArt>={
 slime:{name:'돌 슬라임',atlas:'slime',size:82,speed:1,color:0xe5aa57,boss:false},
 beetle:{name:'바위 갑충',atlas:'monster-beetle',size:104,speed:.94,color:0xf0b565,boss:false},
 golem:{name:'철갑 골렘',atlas:'monster-golem',size:132,speed:.86,color:0x6bdce8,boss:false},
 crystal:{name:'수정 거인',atlas:'monster-crystal',size:166,speed:.78,color:0xc89aff,boss:false},
 king:{name:'고대 돌왕',atlas:'monster-king',size:202,speed:.68,color:0xffcc68,boss:true}
};
export const MONSTER_KINDS=Object.keys(MONSTERS) as MonsterKind[];
export function monsterKind(stage:number,index:number,hp:number):MonsterKind{
 if(stage>=8&&index===11)return 'king';
 if(stage>=5&&hp>=7500)return 'crystal';
 if(stage>=3&&hp>=2000)return 'golem';
 if(stage>=2&&hp>=900)return 'beetle';
 return 'slime';
}
export function monsterSize(kind:MonsterKind,stage:number){return MONSTERS[kind].size*(kind==='king'?1+Math.max(0,stage-8)*.04:1);}
