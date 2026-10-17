/** Enemy statistics use integer thousandths, just like the exact-decimal model. */
export interface SiegeStage{
 readonly id:number;readonly name:string;readonly subtitle:string;readonly darkness:number;
 readonly towerHp:readonly [number,number,number,number];readonly castleHp:number;
 readonly towerAttack:readonly [number,number,number,number];readonly castleAttack:number;
 readonly cooldownScale:number;readonly towerRanges:readonly [number,number,number,number];readonly castleRange:number;
}
export const SIEGE_STAGE_COUNT=10;
const titles=[
 ['잿빛 변두리','왕국의 병사들과 첫 번째 오염 성채를 돌파하세요.'],
 ['침묵의 숲','숲을 뒤덮은 저주를 끊고 길을 되찾으세요.'],
 ['부서진 협곡','무너진 길 너머의 수호탑을 무너뜨리세요.'],
 ['그림자 성문','어둠의 성문을 지키는 마력탑을 돌파하세요.'],
 ['독안개 습지','더 멀리 날아오는 독의 마력을 견뎌 내세요.'],
 ['망각의 계곡','단단해진 수비진을 병사들의 힘으로 뚫으세요.'],
 ['검은 첨탑','끊이지 않는 마력탄에 맞서 병력을 지키세요.'],
 ['저주받은 내성','어둠의 중심에 들어서는 마지막 길을 여세요.'],
 ['황혼의 왕좌','강력한 수비탑을 넘어 저주의 근원에 다가가세요.'],
 ['어둠의 심장','부활한 저주 마법사를 쓰러뜨리고 마지막 성을 무너뜨리세요.'],
] as const;
export const SIEGE_STAGES:readonly SiegeStage[]=Object.freeze(titles.map(([name,subtitle],index)=>{
 const hp=(base:number,step:number)=>base+step*index;
 return Object.freeze({id:index+1,name,subtitle,darkness:Number((.32+index*.075).toFixed(3)),
  towerHp:Object.freeze([hp(2400,450),hp(3600,450),hp(4500,450),hp(5400,450)]) as SiegeStage['towerHp'],castleHp:9990,
  towerAttack:Object.freeze([hp(100,10),hp(150,10),hp(200,20),hp(250,20)]) as SiegeStage['towerAttack'],castleAttack:300+index*20,
  cooldownScale:Number((1-index*.018).toFixed(3)),towerRanges:Object.freeze([175+index*4,185+index*4,195+index*4,205+index*4]) as SiegeStage['towerRanges'],castleRange:240+index*4,
 });
}));
export function siegeStage(id:number):SiegeStage{
 if(!Number.isInteger(id)||id<1||id>SIEGE_STAGE_COUNT)throw new RangeError('Siege stage must be an integer from 1 to '+SIEGE_STAGE_COUNT);
 return SIEGE_STAGES[id-1];
}
