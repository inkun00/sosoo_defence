export type HeroEffect='haste'|'vitality'|'shield'|'enemy-slow'|'tower-haste';
export interface HeroEffectStats{amount:number;radius:number;shieldHits:number;}
export function heroEffectStats(level:number):HeroEffectStats{
 const safe=Math.max(1,Math.min(10,Number.isFinite(level)?Math.floor(level):1));
 return {amount:Math.round((.1+(safe-1)*.04)*100)/100,radius:2+Math.floor((safe-1)/3),shieldHits:safe>=8?2:1};
}
export interface HeroSpec{id:string;name:string;level:number;variant:number;hp:number;effect:HeroEffect;effects?:readonly HeroEffect[];description:string;sheet:string;row:number;}
const names=[['이끼 전령','조약돌 산란충','새싹 수호자'],['청동 북지기','바위 둥지새','점판암 방패병'],['수정 사슴','현무암 거미왕','철갑 돌거북'],['불씨 사자','용암 알지기','화강암 코뿔소'],['천둥 그리핀','호박 벌집왕','빙정 기사'],['청옥 용사','운석 번식룡','마노 성채병'],['흑요석 지휘관','자수정 둥지왕','태양석 파수꾼'],['고대 바람룡','심연 돌군주','룬 요새 거인'],['별빛 키메라','성운 수정여왕','황금 지각왕'],['천공 거석신','원시 분화왕','영원의 성채왕']];
const hp=[800,1450,2600,3650,4800,5650,6600,7450,8350,9100];
const effects:HeroEffect[]=['haste','vitality','shield','enemy-slow','tower-haste'];
function description(effect:HeroEffect,level:number):string{
 const {amount,radius,shieldHits}=heroEffectStats(level),percent=Math.round(amount*100),area=`반경 ${radius}칸`;
 switch(effect){
  case 'haste':return `${area} · 아군 몬스터 이동 속도 +${percent}%`;
  case 'vitality':return `${area} · 아군 몬스터 최대 체력 +${percent}%`;
  case 'shield':return `${area} · 아군 몬스터 공격 ${shieldHits}회 방어 · 소진 후 재충전 없음`;
  case 'enemy-slow':return `${area} · 상대 포탑 공격 속도 −${percent}%`;
  case 'tower-haste':return `${area} · 내 포탑 공격 속도 +${percent}%`;
 }
}
export const HEROES:HeroSpec[]=names.flatMap((row,i)=>row.map((name,v)=>{
 const level=i+1,effect=effects[(i+v*2)%effects.length];
 return {id:`hero-${level}-${v}`,name,level,variant:v,hp:hp[i]+(v===2?level*80:0),effect,description:description(effect,level),sheet:`heroes-level-${level}-v1`,row:v};
}));
export const heroSpec=(id:string)=>HEROES.find(h=>h.id===id);
export const heroesAtLevel=(level:number)=>HEROES.filter(h=>h.level===level);

const worksheetNames=[
 ['별빛 견습 마도사','달빛 수련 기사','새벽 아기 불사조'],
 ['별빛 수호 마도사','달빛 방패 기사','새벽 날개 불사조'],
 ['별빛 지혜 마도사','달빛 은빛 기사','새벽 불꽃 불사조'],
 ['별빛 비전 마도사','달빛 맹세 기사','새벽 광휘 불사조'],
 ['별빛 현자 마도사','달빛 성채 기사','새벽 태양 불사조'],
 ['별빛 천문 마도사','달빛 왕실 기사','새벽 성화 불사조'],
 ['별빛 성운 마도사','달빛 영광 기사','새벽 영원의 불사조'],
 ['별빛 천공 마도사','달빛 성왕 기사','새벽 승천 불사조'],
 ['별빛 운명 마도사','달빛 천명 기사','새벽 창세 불사조'],
 ['별빛 태초 마도사','달빛 영원의 기사','새벽 불멸 불사조'],
];
const worksheetEffects:readonly (readonly HeroEffect[])[]=[
 ['haste','vitality','tower-haste'],
 ['vitality','shield','enemy-slow'],
 ['haste','shield','enemy-slow'],
];
/** Saved worksheet collections retain their IDs while gaining a separate reward identity. */
export const WORKSHEET_HEROES:HeroSpec[]=HEROES.map(base=>{
 const effects=worksheetEffects[base.variant];
 return {...base,name:worksheetNames[base.level-1][base.variant],effect:effects[0],effects,description:effects.map(effect=>description(effect,base.level)).join(' · '),sheet:'worksheet-heroes-v1',row:base.variant};
});
export const worksheetHeroSpec=(id:string)=>WORKSHEET_HEROES.find(hero=>hero.id===id);
