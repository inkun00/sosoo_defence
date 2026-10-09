import {towersForStage,towerPrice} from './towers';
export type Effect='basic'|'slow'|'stun'|'range';
export interface Level{ id:number;name:string;subtitle:string;hint:string;digits:1|2;units:number[];hp:number[];bricks:[number,number,number];goal:'kill'|'wall'|'switch'|'both'|'money';requiredFusions?:number;extraBricks?:[number,number,number];effects:Effect[];budget:number;boss?:{kind:'wizard';hp:number;spawnAt:number}; }
export const LEVELS:Level[]=[
 {id:1,name:'작은 한 걸음',subtitle:'준비 학습 · 0.1의 크기',hint:'체력 0.2는 0.1 포탄 두 번! 길 옆에 타워를 놓고 자동 공격으로 체력이 줄어드는 것을 살펴보세요.',digits:1,units:[100],hp:[200,200,300,200,400,300,200,500,300,400,200,600],bricks:[100,200,300],goal:'kill',effects:['basic'],budget:900},
 {id:2,name:'더 작은 조각',subtitle:'2~3차시 · 0.01과 소수 두 자리 수',hint:'0.1은 0.01 열 개와 같아요. 체력 0.24를 0.1 두 번과 0.01 네 번으로 줄여 보세요.',digits:2,units:[10,100],hp:[200,240,300,420,350,240,450,630,420,550,640,950],bricks:[100,200,300],goal:'kill',effects:['basic','slow'],budget:1400},
 {id:3,name:'큰 힘과 작은 힘',subtitle:'소수의 자릿값과 공격력 비교',hint:'체력이 0.3이면 1 포탄은 너무 커요. 서로 다른 공격력의 타워를 배치해 남은 체력에 알맞은 힘으로 마무리해요.',digits:2,units:[10,100,1000],hp:[1000,240,1200,350,2100,420,2300,530,1500,640,2800,3750],bricks:[200,300,500],goal:'switch',effects:['basic','slow'],budget:3300},
 {id:4,name:'소수로 계산하는 돈',subtitle:'4~5차시 · 소수 두 자리의 자릿값',hint:'0.31 코인은 0.30보다 0.01 많아요. 코인과 타워 가격의 소수점을 맞추어 빼 보세요.',digits:2,units:[10,100,1000],hp:[1000,300,2300,420,3200,530,4600,350,2400,640,3700,5680],bricks:[300,500,800],goal:'money',effects:['basic','slow','stun'],budget:4100},
 {id:5,name:'같은 값, 다른 조각',subtitle:'6~7차시 · 소수의 크기와 단위 관계',hint:'1은 0.1 열 개, 0.1은 0.01 열 개! 체력보다 큰 공격은 피해를 주지 못하니 작은 공격력의 타워도 함께 배치해요.',digits:2,units:[10,100,1000],hp:[1000,240,2300,420,3530,1240,2350,2650,5740,3420,6850,8950],bricks:[120,230,350],goal:'switch',effects:['basic','slow','stun'],budget:4800},
 {id:6,name:'열 개가 하나로',subtitle:'8차시 · 소수의 덧셈과 받아올림',hint:'벽돌의 소수점을 맞추고 같은 자리끼리 더해요. 0.01 열 개를 0.1로 받아올려 성벽을 만들어요.',digits:2,units:[10,100,1000],hp:[600,700,1300,2350,4680,3750,5420,6530,7860,5740,9450,9680],bricks:[600,700,1300],goal:'wall',effects:['basic','slow','stun','range'],budget:5500},
 {id:7,name:'소수점 나란히',subtitle:'9차시 · 두 자리 소수의 덧셈과 받아올림',hint:'새 벽돌로 한 번 받아올리는 덧셈과 연속으로 받아올리는 덧셈을 해 봐요. 보관한 성벽도 활용해 두 개를 준비하고 하나를 설치해요.',digits:2,units:[10,100,1000],hp:[1000,750,2560,1560,5310,3420,6750,8530,7310,7680,8750,9750],bricks:[420,530,950],extraBricks:[750,560,1310],requiredFusions:2,goal:'wall',effects:['basic','slow','stun','range'],budget:6300},
 {id:8,name:'빌려 온 열 조각',subtitle:'10차시 · 한 자리 소수의 뺄셈과 받아내림',hint:'체력 1.0에 기본 포탑 0.1을 먼저 쏘도록 타워를 배치해요. 1을 0.1 열 개로 바꾸어 빼는 공격을 경험해요.',digits:2,units:[10,100,1000],hp:[1000,2600,4500,3700,6600,5900,8500,7500,7800,8400,9600,9870],bricks:[300,500,800],goal:'switch',effects:['basic','slow','stun','range'],budget:7200},
 {id:9,name:'남은 힘을 살펴요',subtitle:'11차시 · 두 자리 소수의 뺄셈',hint:'첫 체력 0.10에 0.01 포탄을 쏘아요. 0.1을 0.01 열 개로 바꾸어 빼는 공격을 경험해요. 큰 타워는 잠시 꺼 두세요.',digits:2,units:[10,100,1000],hp:[100,3520,5640,4880,6780,8690,9540,7400,7950,8780,9380,9890],bricks:[1250,700,1950],goal:'both',effects:['basic','slow','stun','range'],budget:8100},
 {id:10,name:'소수의 성 수호자',subtitle:'12~14차시 · 소수 계산 종합 방어전',hint:'2.75 + 3.56 = 6.31! 포탄, 돈, 벽돌을 계획해요. 큰 포탄으로 줄이고 작은 포탄으로 정확히 0을 만들어요.',digits:2,units:[10,100,1000],hp:[2750,3560,6310,7520,7640,8880,8550,8490,9040,9290,9470,9990],bricks:[2750,3560,6310],goal:'both',effects:['basic','slow','stun','range'],budget:9500},
 {id:11,name:'마법사와의 결전',subtitle:'최종 스테이지 · 저주를 풀어라',hint:'체력 99.9의 저주 마법사가 몬스터와 함께 나타나요. 장거리 대포와 감속 타워를 길 전체에 나누어 배치하고, 작은 공격으로 정확히 0을 만들어요.',digits:2,units:[10,100,1000],hp:[3520,4680,5750,6420,7530,8140,8570,8940,9260,9540,9780,9990],bricks:[2750,3560,6310],goal:'switch',effects:['basic','slow','stun','range'],budget:19980,boss:{kind:'wizard',hp:99900,spawnAt:16}}
];
export const FINAL_STAGE=LEVELS.length;
const budgets=[8800,8750,8750,8840,8860,8760,8790,8950,8950,9760,19980];
for(const level of LEVELS){const types=towersForStage(level.id);level.budget=budgets[level.id-1];level.units=[...new Set(types.map(t=>t.unit))];level.effects=[...new Set(types.map(t=>t.effect))];}
LEVELS[2].hint='투석기는 공격력 1.2, 빙창탑은 0.25예요. 남은 체력에 맞는 타워를 골라 정확히 0으로 만들어요.';
LEVELS[3].hint='돈과 가격은 소수 두 자리까지 사용해요. 소수점을 맞추어 타워 가격을 빼고 남는 코인을 맞히면 설치돼요.';
LEVELS[4].hint='서리탑 0.15, 수정포 0.75! 서로 다른 공격력으로 체력을 줄이고 작은 포탄으로 마무리해요.';
LEVELS[7].hint='첫 체력 1.0에 기본 포탑 0.1을 쏘아요. 1을 0.1 열 개로 바꾸어 빼는 공격을 경험해요.';
LEVELS[8].hint='첫 체력 0.10에 바늘탑 0.01을 쏘아요. 0.1을 0.01 열 개로 바꾸어 빼요.';
LEVELS[9].name='균열의 돌왕';
LEVELS[9].hint='균열의 돌왕의 체력은 9.99! 정확히 0으로 처치하면 저주 마법사가 기다리는 최종 스테이지로 갈 수 있어요.';
export const EFFECTS:Record<Effect,{name:string;icon:string;color:number;description:string;unlock:number}>={
 basic:{name:'기본',icon:'●',color:0xe4ac61,description:'정확한 한 발',unlock:1},
 slow:{name:'서리',icon:'❄',color:0x8cd7ed,description:'3초 동안 이동 40% 느리게',unlock:2},
 stun:{name:'번개',icon:'ϟ',color:0xc7b3ed,description:'25% 확률로 1.5초 멈춤',unlock:4},
 range:{name:'망원',icon:'◎',color:0xa4d39a,description:'더 멀리, 1.6배 사거리',unlock:6}
};
export function price(unit:number,effect:Effect,level:number):number{const type=towersForStage(level).find(t=>t.unit===unit&&t.effect===effect);return type?towerPrice(type,LEVELS[level-1].budget,level):Infinity;}
