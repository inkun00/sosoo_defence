export type ComputerMood='idle'|'thinking'|'cast'|'hurt'|'victory'|'defeat';
export interface ComputerPortrait{level:number;id:string;name:string;mood:ComputerMood;phrase:string;moodSince:number;}
export interface ComputerOpponent{level:number;id:string;name:string;title:string;description:string;thinkMs:number;buildMs:number;fusionMs:number;hatchMs:number;maxTowers:number;heroLevel:number;}
const names=[
 ['moss-apprentice','이끼 견습생','첫 결투','천천히 계산하고 기본 포탑으로 불꽃을 지켜요.'],
 ['lantern-scout','등불 정찰병','길을 살피는 수호자','작은 공격을 섞고 낮은 레벨의 영웅을 부화시켜요.'],
 ['ember-smith','불씨 대장장이','돌과 불의 장인','타워를 넓게 배치하고 돌 알을 조금 더 성장시켜요.'],
 ['frost-sage','서리 현자','겨울의 결투사','감속 타워로 시간을 벌며 차근차근 공격해요.'],
 ['lightning-alchemist','번개 연금술사','푸른 섬광','여러 공격력을 섞어 남은 체력을 마무리해요.'],
 ['rune-knight','룬 기사','불꽃의 수호자','타워 종류를 바꾸고 성장한 영웅을 보내요.'],
 ['crystal-oracle','수정 예언자','별빛의 전략가','여러 구간을 지키며 적의 체력에 맞춰 준비해요.'],
 ['shadow-warden','그림자 파수꾼','어둠의 성문지기','빠른 합성과 균형 잡힌 타워 배치로 압박해요.'],
 ['storm-dragon-sage','폭풍 용 현자','폭풍을 부르는 자','감속과 기절, 긴 사거리를 함께 활용해요.'],
 ['archmage','대마법사','최후의 결투','빠르게 계산하고 강한 영웅과 다양한 타워를 조합해요.'],
] as const;
/** Difficulty changes decision time and strategy, never money, damage or flame health. */
export const COMPUTER_OPPONENTS:readonly ComputerOpponent[]=names.map(([id,name,title,description],i)=>({
 level:i+1,id,name,title,description,thinkMs:5200-i*440,buildMs:i>=7?[3600,2900,2200][i-7]:14500-i*1050,
 fusionMs:i>=7?[6000,5800,5150][i-7]:24500-i*2150,hatchMs:32000-i*1350,maxTowers:i>=7?5+i:2+i,heroLevel:1+i,
}));
export function computerOpponent(level:number){return COMPUTER_OPPONENTS[Math.max(0,Math.min(9,Math.floor(level||1)-1))];}

const PROGRESS_KEY='sosoo-computer-duel-progress-v1';
export interface ComputerProgress{wins:number[];played:number[];}
const fresh=():ComputerProgress=>({wins:Array(10).fill(0),played:Array(10).fill(0)});
export function loadComputerProgress():ComputerProgress{
 try{const p=JSON.parse(localStorage.getItem(PROGRESS_KEY)||'null');if(!p)return fresh();
  const sanitize=(rows:unknown)=>Array.from({length:10},(_,i)=>Array.isArray(rows)&&Number.isSafeInteger(rows[i])&&rows[i]>=0?rows[i]:0);
  return {wins:sanitize(p.wins),played:sanitize(p.played)};
 }catch{return fresh();}
}
export function recordComputerResult(level:number,won:boolean){
 const p=loadComputerProgress(),i=computerOpponent(level).level-1;p.played[i]++;if(won)p.wins[i]++;
 try{localStorage.setItem(PROGRESS_KEY,JSON.stringify(p));}catch{}
 return p;
}
