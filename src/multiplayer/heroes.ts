export type HeroEffect='haste'|'brood'|'steadfast';
export interface HeroSpec{id:string;name:string;level:number;variant:number;hp:number;effect:HeroEffect;description:string;sheet:string;row:number;}
const names=[['이끼 전령','조약돌 산란충','새싹 수호자'],['청동 북지기','바위 둥지새','점판암 방패병'],['수정 사슴','현무암 거미왕','철갑 돌거북'],['불씨 사자','용암 알지기','화강암 코뿔소'],['천둥 그리핀','호박 벌집왕','빙정 기사'],['청옥 용사','운석 번식룡','마노 성채병'],['흑요석 지휘관','자수정 둥지왕','태양석 파수꾼'],['고대 바람룡','심연 돌군주','룬 요새 거인'],['별빛 키메라','성운 수정여왕','황금 지각왕'],['천공 거석신','원시 분화왕','영원의 성채왕']];
const hp=[800,1450,2600,3650,4800,5650,6600,7450,8350,9100];
export const HEROES:HeroSpec[]=names.flatMap((row,i)=>row.map((name,v)=>({id:`hero-${i+1}-${v}`,name,level:i+1,variant:v,hp:hp[i]+(v===2?(i+1)*80:0),effect:(['haste','brood','steadfast'] as const)[v],description:v===0?`주변 아군 이동 ${Math.round((.12+(i+1)*.025)*100)}% 가속`:v===1?`돌 병사 ${1+Math.floor((i+1)/3)}마리와 함께 등장`:`감속 저항 ${Math.min(80,20+(i+1)*6)}% · 더 단단한 체력`,sheet:`heroes-level-${i+1}-v1`,row:v})));
export const heroSpec=(id:string)=>HEROES.find(h=>h.id===id);
export const heroesAtLevel=(level:number)=>HEROES.filter(h=>h.level===level);
