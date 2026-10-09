import {TOWERS,towerType,towerPrice,parseMoney,PurchaseVariation} from '../towers';
import {heroSpec} from './heroes';
import {hit,numberText,recipe,reward,purchaseCoins,learningValue} from '../math';
import type {WrongQuestion} from './records';
import {decimalBoard,normalizedAccountLevel} from './decimal-boards';
export {decimalBoard} from './decimal-boards';
export type Side=0|1;
export interface DuelTower{id:number;typeId:string;x:number;y:number;unit:number;cost:number;enabled:boolean;cooldown:number;}
export interface DuelEnemy{id:number;owner:Side;target:Side;hero:string|null;level:number;hp:number;max:number;x:number;slow:number;stun:number;hits:number;}
export interface Quote{x:number;y:number;typeId:string;before:number;wallet:number;cost:number;digits:number;nonce:string;expires:number;}
export interface RewardLoadout{rewardHeroes?:string[];rewardHero?:string|null;}
export interface DuelPlayer{uid:string;name:string;accountLevel:number;rewardRoster:string[];rewardHero:string|null;rewardUsed:boolean;ready:boolean;flame:number;money:number;escrow:number;egg:number;solved:number;purchases:number;wrongQuestions:WrongQuestion[];round:number;purchaseVariation?:PurchaseVariation;board:number[];towers:DuelTower[];quote:Quote|null;lastSeen:number;lastRequest:number;lastHeartbeat:number;recent:string[];}
export interface DuelShot{id:number;time:number;towerId:number;typeId?:string;fromX?:number;fromY?:number;owner:Side;enemyId:number;x:number;before:number;unit:number;after:number;effect:string;}
export interface DuelState{version:1;seed:number;learningLevel:number;createdAt:number;startedAt:number;updatedAt:number;elapsed:number;wave:number;nextId:number;revision:number;status:'waiting'|'playing'|'finished';players:[DuelPlayer,DuelPlayer|null];enemies:DuelEnemy[];shots:DuelShot[];winner:Side|null;reason:string;log:string[];}
export type DuelAction={type:'ready'}|{type:'tick'}|{type:'select-reward';heroId:string|null}|{type:'summon-reward'}|{type:'quote';x:number;y:number;typeId:string}|{type:'answer';nonce:string;answer:string}|{type:'cancel'}|{type:'toggle';towerId:number}|{type:'sell';towerId:number}|{type:'fuse';round:number;slots:number[];operation:'+'|'-'}|{type:'hatch';heroId:string}|{type:'surrender'};
export const DUEL_SECONDS=300,DUEL_COLUMNS=24,DUEL_ROWS=7,DUEL_ROAD=3,FLAME_MAX=9000,DUEL_START_MONEY=8800;
export function duelLevel(s:DuelState){return Math.min(10,1+Math.floor(s.elapsed/30));}
// The room freezes one shared learning level when the second player joins.
function player(uid:string,name:string,seed:number,now:number,accountLevel:number,loadout:RewardLoadout):DuelPlayer{const rewardRoster=[...new Set(loadout.rewardHeroes??[])].filter(id=>!!heroSpec(id)).slice(0,30);return {uid,name,accountLevel:normalizedAccountLevel(accountLevel),rewardRoster,rewardHero:loadout.rewardHero&&rewardRoster.includes(loadout.rewardHero)?loadout.rewardHero:null,rewardUsed:false,ready:false,flame:FLAME_MAX,money:DUEL_START_MONEY,escrow:0,egg:0,solved:0,purchases:0,wrongQuestions:[],round:0,board:decimalBoard(seed,0,accountLevel),towers:[],quote:null,lastSeen:now,lastRequest:0,lastHeartbeat:0,recent:[]};}
export function createDuel(uid:string,name:string,seed:number,now:number,accountLevel=1,loadout:RewardLoadout={}):DuelState{return {version:1,seed,learningLevel:Math.min(10,normalizedAccountLevel(accountLevel)),createdAt:now,startedAt:0,updatedAt:now,elapsed:0,wave:0,nextId:1,revision:0,status:'waiting',players:[player(uid,name,seed,now,accountLevel,loadout),null],enemies:[],shots:[],winner:null,reason:'',log:[]};}
export function joinDuel(s:DuelState,uid:string,name:string,now:number,accountLevel=1,loadout:RewardLoadout={}){
 if(s.players.some(p=>p?.uid===uid))return;
 if(s.status!=='waiting'||s.players[1]||now-s.createdAt>600000)throw Error('참가할 수 없는 방이에요. 새 방을 만들어 주세요.');
 s.players[1]=player(uid,name,s.seed,now,accountLevel,loadout);
 s.learningLevel=Math.min(10,s.players[0].accountLevel??1,s.players[1].accountLevel);
 for(const p of s.players)p!.board=decimalBoard(s.seed,p!.round,s.learningLevel);
 s.revision++;
}
export function duelSide(s:DuelState,uid:string):Side{const i=s.players.findIndex(p=>p?.uid===uid);if(i<0)throw Error('이 대전에 참가한 계정이 아니에요.');return i as Side;}
function note(s:DuelState,text:string){s.log.push(text);s.log=s.log.slice(-6);}
function end(s:DuelState,winner:Side|null,reason:string){s.status='finished';s.winner=winner;s.reason=reason;note(s,reason);}
function owns(side:Side,x:number){return side===0?x>=1&&x<=10:x>=13&&x<=22;}
export function validDuelCell(s:DuelState,side:Side,x:number,y:number){
 const p=s.players[side];return !!p&&Number.isInteger(x)&&Number.isInteger(y)&&owns(side,x)&&y>=0&&y<DUEL_ROWS&&y!==DUEL_ROAD&&!p.towers.some(t=>t.x===x&&t.y===y);
}
function release(p:DuelPlayer){p.quote=null;p.money+=p.escrow;p.escrow=0;}
function income(p:DuelPlayer,n:number){if(p.quote)p.escrow+=n;else p.money+=n;}
function wrong(s:DuelState,p:DuelPlayer,q:Omit<WrongQuestion,'level'|'elapsed'|'attempts'>,level=duelLevel(s)){
 const old=p.wrongQuestions.find(o=>o.id===q.id);
 if(old){old.submitted=q.submitted;old.attempts++;return;}
 p.wrongQuestions.push({...q,level,elapsed:s.elapsed,attempts:1});
}
function spawn(s:DuelState,owner:Side,target:Side,level:number,hp:number,hero:string|null,x:number){
 if(s.enemies.length>=100)return false;
 s.enemies.push({id:s.nextId++,owner,target,hero,level,hp,max:hp,x,slow:0,stun:0,hits:0});return true;
}
export function advanceDuel(s:DuelState,now:number){
 if(!Number.isFinite(now)||now<s.updatedAt)return;
 if(s.status==='playing'){
  const disconnected=s.players.map(p=>!p||now-p.lastSeen>45000);
  if(disconnected.every(Boolean)){end(s,null,'양쪽의 연결이 종료되어 대전을 마쳤어요.');s.updatedAt=now;s.revision++;return;}
  if(disconnected.some(Boolean)){end(s,disconnected[0]?1:0,'상대의 연결이 오래 끊겨 대전이 종료됐어요.');s.updatedAt=now;s.revision++;return;}
  let remaining=Math.min(DUEL_SECONDS-s.elapsed,(now-s.updatedAt)/1000);
  while(remaining>1e-7&&s.status==='playing'){
   const dt=Math.min(.1,remaining);remaining-=dt;s.elapsed+=dt;const lv=duelLevel(s);
   if(s.elapsed+1e-8>=8+s.wave*8.4){
    const quantum=lv===1?100:10,hp=Math.round((200+lv*320+(s.wave%3)*130)/quantum)*quantum;
    spawn(s,1,0,lv,hp,null,11.5);spawn(s,0,1,lv,hp,null,11.5);s.wave++;
   }
   for(const e of s.enemies){
    if(e.hp<=0)continue;e.slow=Math.max(0,e.slow-dt);e.stun=Math.max(0,e.stun-dt);if(e.stun>0)continue;
    const spec=e.hero?heroSpec(e.hero):null;
    const leader=s.enemies.filter(o=>o.owner===e.owner&&o.hp>0&&o.hero&&heroSpec(o.hero)?.effect==='haste'&&Math.abs(o.x-e.x)<=3).reduce((a,o)=>Math.max(a,1.12+o.level*.025),1);
    const resistance=spec?.effect==='steadfast'?Math.min(.8,.2+spec.level*.06):0;
    const speed=(.24+e.level*.009)*leader*(e.slow>0?.6+.4*resistance:1);
    e.x+=(e.target===0?-1:1)*speed*dt;
    if(e.x<=0||e.x>=23){const p=s.players[e.target]!;p.flame=Math.max(0,p.flame-(e.hero?1000+e.level*300:1000));e.hp=0;note(s,`${p.name}의 불꽃 체력 ${numberText(p.flame)} · ${e.hero?'영웅':'돌 몬스터'} 도착`);}
   }
   for(const side of [0,1] as Side[]){const p=s.players[side]!;
    for(const t of p.towers){
     t.cooldown=Math.max(0,t.cooldown-dt);if(!t.enabled||t.cooldown>0)continue;
     const spec=towerType(t.typeId)!,radius=spec.effect==='range'?4:3;
     const e=s.enemies.filter(e=>e.hp>0&&e.target===side&&Math.hypot(t.x-e.x,t.y-DUEL_ROAD)<=radius).sort((a,b)=>Number(b.hp>=t.unit)-Number(a.hp>=t.unit)||(side===0?a.x-b.x:b.x-a.x)||a.id-b.id)[0];
     if(!e)continue;t.cooldown=spec.cooldown;const result=hit(e.hp,t.unit);if(!result.valid){note(s,`${p.name}: 공격력이 남은 체력보다 커요`);continue;}
     const before=e.hp;e.hp=result.hp;e.hits++;(s.shots??=[]).push({id:s.nextId++,time:s.elapsed,towerId:t.id,typeId:t.typeId,fromX:t.x,fromY:t.y,owner:side,enemyId:e.id,x:e.x,before,unit:t.unit,after:e.hp,effect:spec.effect});note(s,`${p.name}: ${numberText(before)} − ${numberText(t.unit)} = ${numberText(e.hp)}`);
     if(spec.effect==='slow')e.slow=3;
     if(spec.effect==='stun'&&((Math.imul(e.id+e.hits,1103515245)+s.seed)>>>0)%100<25)e.stun=1.5;
     if(e.hp===0)income(p,reward(e.max,e.hits,TOWERS.filter(t=>t.unlock<=lv).map(t=>t.unit),lv));
    }
   }
   s.enemies=s.enemies.filter(e=>e.hp>0);s.shots=(s.shots??[]).filter(e=>s.elapsed-e.time<2.4).slice(-48);
   const [a,b]=s.players as [DuelPlayer,DuelPlayer];
   if(a.flame===0||b.flame===0)end(s,a.flame===0&&b.flame===0?null:a.flame===0?1:0,'불꽃이 파괴되어 대전이 끝났어요.');
   else if(s.elapsed>=DUEL_SECONDS-1e-7){s.elapsed=DUEL_SECONDS;end(s,a.flame===b.flame?null:a.flame>b.flame?0:1,'5분 종료 · 남은 불꽃 체력으로 승부를 결정했어요.');}
  }
 }
 for(const p of s.players)if(p?.quote&&p.quote.expires<=now)release(p);
 s.updatedAt=now;s.revision++;
}
export function applyDuel(s:DuelState,side:Side,action:DuelAction,now:number,nonce:string):{ok:boolean;message:string}{
 const p=s.players[side];if(!p)throw Error('참가자 정보가 없어요.');
 const bad=(message:string)=>({ok:false,message}),ok=(message:string)=>({ok:true,message});
 if(s.status==='finished')return bad(s.reason);
 if(action.type==='tick')return ok('');
 if(action.type==='surrender'){end(s,(1-side) as Side,'상대가 대전을 나갔어요.');release(p);return ok('대전을 마쳤어요.');}
 if(action.type==='select-reward'){
  if(s.status!=='waiting'||p.ready)return bad('준비하기 전에 학습지 몬스터를 선택해요.');
  if(action.heroId!==null&&(!(p.rewardRoster??[]).includes(action.heroId)||!heroSpec(action.heroId)))return bad('이 방을 만들거나 참가할 때 보유한 몬스터만 선택할 수 있어요.');
  p.rewardHero=action.heroId;return ok('학습지 몬스터를 선택했어요.');
 }
 if(action.type==='summon-reward'){
  if(s.status!=='playing')return bad('대전이 시작된 뒤 원하는 때에 소환해요.');
  if(p.rewardUsed)return bad('학습지 몬스터는 대전마다 한 번만 소환할 수 있어요.');
  const hero=p.rewardHero?heroSpec(p.rewardHero):null;
  if(!hero||!(p.rewardRoster??[]).includes(hero.id))return bad('준비하기 전에 획득한 학습지 몬스터를 선택해요.');
  const escorts=hero.effect==='brood'?1+Math.floor(hero.level/3):0;
  if(s.enemies.length+1+escorts>100)return bad('길이 붐벼요. 잠시 뒤 소환해 주세요.');
  spawn(s,side,(1-side) as Side,hero.level,hero.hp,hero.id,side===0?1:22);
  for(let i=0;i<escorts;i++)spawn(s,side,(1-side) as Side,hero.level,200+hero.level*100,null,side===0?1+(i+1)*1.25:22-(i+1)*1.25);
  p.rewardUsed=true;note(s,`${p.name} · 학습지 영웅 ${hero.name} Lv.${hero.level} 소환!`);return ok(`${hero.name} 출발! 다음 대전에서도 선택할 수 있어요.`);
 }
 if(action.type==='ready'){
  if(s.status!=='waiting')return bad('이미 대전이 시작됐어요.');p.ready=true;
  if(s.players.every(p=>p?.ready)){s.status='playing';s.startedAt=now;s.updatedAt=now;for(const a of s.players)a!.lastSeen=now;note(s,'양쪽 준비 완료 · 불꽃을 지켜요!');}return ok('준비했어요.');
 }
 if(!['playing','waiting'].includes(s.status))return bad('대전을 시작해 주세요.');
 if(action.type==='cancel'){release(p);return ok('구매를 취소했어요.');}
 if(action.type==='quote'){
  if(p.quote)return bad('열린 구매 문제를 먼저 풀거나 취소해요.');
  const type=towerType(action.typeId),lv=duelLevel(s);if(!type||type.unlock>lv)return bad('아직 해금되지 않은 타워예요.');
  if(!validDuelCell(s,side,action.x,action.y))return bad('내 쪽의 비어 있는 바닥에 설치해요.');
  if(p.towers.length>=14||(type.unit===10&&p.towers.filter(t=>t.unit===10).length>=3))return bad('설치 제한이에요. 전체 14개, 바늘탑 3개까지예요.');
  const variation=p.purchaseVariation??{round:0},cost=towerPrice(type,p.money,lv,variation);if(cost>p.money)return bad('코인이 부족해요.');
  const before=purchaseCoins(p.money);p.quote={x:action.x,y:action.y,typeId:type.id,before,wallet:p.money,cost,digits:lv===1?1:2,nonce,expires:now+60000};
  p.purchaseVariation={round:variation.round+1,lastBefore:before,lastCost:cost};return ok('구매에 사용할 코인에서 남는 코인을 계산해요. 대전은 계속 진행돼요.');
 }
 if(action.type==='answer'){
  const q=p.quote;if(!q||q.nonce!==action.nonce)return bad('새 구매 문제를 열어 주세요.');
  if(typeof action.answer!=='string'||action.answer.length>12)return bad('답을 12글자 이내로 입력해 주세요.');
  if(parseMoney(action.answer)!==q.before-q.cost){wrong(s,p,{id:q.nonce,kind:'tower',a:q.before,b:q.cost,operation:'-',submitted:action.answer,correct:q.before-q.cost});return bad('소수점을 맞추고 다시 빼 보세요. 돈은 그대로예요.');}
  if(!validDuelCell(s,side,q.x,q.y))return bad('설치 공간이 바뀌었어요. 취소하고 다시 골라요.');
  const type=towerType(q.typeId)!;p.money=q.wallet-q.cost;p.towers.push({id:s.nextId++,typeId:type.id,x:q.x,y:q.y,unit:type.unit,cost:q.cost,enabled:true,cooldown:0});
  p.purchases++;note(s,`${p.name}: ${numberText(q.before)} − ${numberText(q.cost)} = ${numberText(q.before-q.cost)} · ${type.name}`);release(p);return ok('정답! 타워를 설치했어요.');
 }
 if(action.type==='toggle'||action.type==='sell'){
  if(p.quote)return bad('구매 문제를 먼저 닫아 주세요.');const t=p.towers.find(t=>t.id===action.towerId);if(!t)return bad('내 타워를 선택해 주세요.');
  if(action.type==='toggle'){t.enabled=!t.enabled;return ok(`발사 ${t.enabled?'켜짐':'멈춤'}`);}
  p.money+=t.cost;p.towers=p.towers.filter(o=>o.id!==t.id);return ok(`${numberText(t.cost)} 코인을 회수했어요.`);
 }
 if(action.type==='fuse'){
  if(action.operation!=='+')return bad('돌 알은 덧셈으로 만들어요. 두 블럭의 합을 골라 주세요.');
  if(s.status!=='playing')return bad('양쪽이 준비한 뒤 합성할 수 있어요.');
  if(p.egg>=10)return bad('알은 10레벨이에요. 먼저 부화시켜 주세요.');
  if(action.round!==p.round||!Array.isArray(action.slots)||action.slots.length!==3||new Set(action.slots).size!==3||action.slots.some(i=>!Number.isInteger(i)||i<0||i>15)||!['+','-'].includes(action.operation))return bad('서로 다른 블럭 세 개를 다시 골라요.');
  const [a,b,c]=action.slots.map(i=>p.board[i]);
  if(![a,b,c,a+b].every(learningValue))return bad('소수는 두 자리까지, 자연수 부분은 한 자리로 계산해요. 다른 블럭 조합을 골라 주세요.');
  if(!recipe(a,b,c,'+')){wrong(s,p,{id:`fusion-${p.round}-+-${a}-${b}`,kind:'fusion',a,b,operation:'+',submitted:numberText(c),correct:a+b},s.learningLevel??1);return bad('식이 맞지 않아요. 블럭과 알은 그대로예요.');}
  p.egg++;p.solved++;p.round++;p.board=decimalBoard(s.seed,p.round,s.learningLevel??1);return ok(`정답! 돌 알 ${p.egg}레벨 · 지금 부화하거나 더 성장시켜요.`);
 }
 if(action.type==='hatch'){
  if(s.status!=='playing')return bad('양쪽이 준비한 뒤 부화할 수 있어요.');const hero=heroSpec(action.heroId);
  if(!hero||p.egg<1||hero.level!==p.egg)return bad('현재 알 레벨의 영웅을 골라 주세요.');
  const escorts=hero.effect==='brood'?1+Math.floor(hero.level/3):0;if(s.enemies.length+1+escorts>100)return bad('길이 붐벼요. 잠시 뒤 부화해 주세요.');
  spawn(s,side,(1-side) as Side,hero.level,hero.hp,hero.id,side===0?1:22);
  // Escort soldiers form a column ahead of the hero so sprites and health
  // values are visible independently; every unit still uses the same road.
  for(let i=0;i<escorts;i++)spawn(s,side,(1-side) as Side,hero.level,(200+hero.level*100),null,side===0?1+(i+1)*1.25:22-(i+1)*1.25);
  p.egg=0;note(s,`${p.name} · ${hero.name} Lv.${hero.level} 부화!`);return ok(`${hero.name}이 상대 불꽃을 향해 출발했어요.`);
 }
 return bad('지원하지 않는 조작이에요.');
}
