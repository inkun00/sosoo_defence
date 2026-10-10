import {towerType,towerPrice,parseMoney,PurchaseVariation} from '../towers';
import {heroSpec,heroEffectStats,HeroEffect,HeroSpec} from './heroes';
import {hit,numberText,recipe,purchaseCoins,learningValue} from '../math';
import type {WrongQuestion} from './records';
import {decimalBoard,learningLevel,normalizedAccountLevel} from './decimal-boards';
import {duelMap,duelMapSpeedScale,duelPathDistance,duelPathPosition,duelRoadCell} from './duel-maps';
export {decimalBoard} from './decimal-boards';
export type Side=0|1;
export interface DuelTower{id:number;typeId:string;x:number;y:number;unit:number;cost:number;enabled:boolean;cooldown:number;prepared?:boolean;}
export interface DuelEnemy{id:number;owner:Side;target:Side;hero:string|null;level:number;hp:number;max:number;x:number;y?:number;pathDistance?:number;slow:number;stun:number;hits:number;rewardSummon?:boolean;sourceHeroId?:string;vitalityBaseMax?:number;vitalityBonus?:number;vitalitySpent?:number;shieldSpent?:number;}
export interface Quote{x:number;y:number;typeId:string;before:number;wallet:number;cost:number;digits:number;nonce:string;expires:number;purpose?:'preparation';wrongAttempts?:number;}
export interface RewardLoadout{rewardHeroes?:string[];rewardHero?:string|null;}
export interface DuelPlayer{uid:string;name:string;accountLevel:number;rewardRoster:string[];rewardHero:string|null;rewardUsed:boolean;ready:boolean;flame:number;money:number;escrow:number;stock:Record<string,number>;heroStock?:Record<string,number>;egg:number;solved:number;purchases:number;wrongQuestions:WrongQuestion[];round:number;purchaseVariation?:PurchaseVariation;board:number[];towers:DuelTower[];quote:Quote|null;lastSeen:number;lastRequest:number;lastHeartbeat:number;recent:string[];combatScore?:number;questionScore?:number;kills?:number;answeredQuestions?:number;towerWrongAttempts?:number;fusionWrongAttempts?:number;}
export interface DuelShot{id:number;time:number;towerId:number;typeId?:string;fromX?:number;fromY?:number;owner:Side;enemyId:number;x:number;y?:number;before:number;unit:number;after:number;effect:string;shielded?:boolean;}
export interface DuelState{version:1;seed:number;mapId?:string;learningLevel:number;createdAt:number;startedAt:number;preparationStartedAt:number;preparationElapsed:number;updatedAt:number;elapsed:number;wave:number;nextId:number;revision:number;status:'waiting'|'preparing'|'playing'|'finished';buildAfterStart?:boolean;players:[DuelPlayer,DuelPlayer|null];enemies:DuelEnemy[];shots:DuelShot[];winner:Side|null;reason:string;log:string[];}
export type DuelAction={type:'ready';heroId?:string|null}|{type:'tick'}|{type:'select-reward';heroId:string|null}|{type:'summon-reward'}|{type:'summon';heroId:string}|{type:'prepare-quote';typeId:string}|{type:'build';x:number;y:number;typeId:string}|{type:'quote';x:number;y:number;typeId:string}|{type:'answer';nonce:string;answer:string}|{type:'cancel'}|{type:'toggle';towerId:number}|{type:'sell';towerId:number}|{type:'fuse';round:number;slots:number[];operation:'+'}|{type:'hatch';heroId:string}|{type:'surrender'};
export const DUEL_PREPARATION_SECONDS=120,DUEL_SECONDS=180,DUEL_TOTAL_SECONDS=DUEL_PREPARATION_SECONDS+DUEL_SECONDS,DUEL_COLUMNS=24,DUEL_ROWS=7,DUEL_ROAD=3,FLAME_MAX=9000,DUEL_START_MONEY=8800;
export const DUEL_KILL_BASE_SCORE=100,DUEL_KILL_EFFICIENCY_SCORE=100,DUEL_QUESTION_BASE_SCORE=25;
/** Every kill rewards defense; fewer hits and fewer wrong answers add more points. */
export function duelKillScore(hits:number){return DUEL_KILL_BASE_SCORE+Math.floor(DUEL_KILL_EFFICIENCY_SCORE/Math.max(1,Math.floor(Number.isFinite(hits)?hits:1)));}
export function duelQuestionScore(wrongAttempts:number){return Math.floor(DUEL_QUESTION_BASE_SCORE/(Math.max(0,Number.isFinite(wrongAttempts)?Math.floor(wrongAttempts):0)+1));}
export function duelScore(p:Pick<DuelPlayer,'combatScore'|'questionScore'>|null|undefined){return (p?.combatScore??0)+(p?.questionScore??0);}
function awardQuestion(p:DuelPlayer,wrongAttempts:number){p.questionScore=(p.questionScore??0)+duelQuestionScore(wrongAttempts);p.answeredQuestions=(p.answeredQuestions??0)+1;}
export function duelLevel(s:DuelState){return Math.min(10,1+Math.floor((Math.max(0,s.elapsed)+1e-8)/(DUEL_SECONDS/10)));}
export function duelHeroLearningLevel(p:Pick<DuelPlayer,'accountLevel'>){return learningLevel(p.accountLevel??1);}
export function duelTowerLevel(s:DuelState){return s.status==='preparing'?Math.min(10,s.learningLevel??1):duelLevel(s);}
export function canPurchaseDuelTower(s:DuelState){return s.status==='preparing'||s.status==='playing';}
export function canUseDuelTower(s:DuelState,side:Side,typeId:string){
 const p=s.players[side],type=towerType(typeId);return !!p&&!!type&&(s.status==='preparing'||s.status==='playing'&&(p.stock?.[typeId]??0)>0);
}
/** Battle placement consumes only the stock earned during preparation. */
export function duelBuildCost(s:DuelState,side:Side,typeId:string){
 const p=s.players[side],type=towerType(typeId);if(!p||!type)return Infinity;
 if(s.status==='playing')return (p.stock?.[typeId]??0)>0?0:Infinity;
 return towerPrice(type,p.money,duelTowerLevel(s),p.purchaseVariation);
}
// Tower preparation shares one room level; hero addition uses each player's account level.
function player(uid:string,name:string,seed:number,now:number,accountLevel:number,loadout:RewardLoadout):DuelPlayer{const rewardRoster=[...new Set(loadout.rewardHeroes??[])].filter(id=>!!heroSpec(id)).slice(0,30),personalLevel=normalizedAccountLevel(accountLevel);return {uid,name,accountLevel:personalLevel,rewardRoster,rewardHero:loadout.rewardHero&&rewardRoster.includes(loadout.rewardHero)?loadout.rewardHero:null,rewardUsed:false,ready:false,flame:FLAME_MAX,money:DUEL_START_MONEY,escrow:0,stock:{},heroStock:{},egg:0,solved:0,purchases:0,wrongQuestions:[],round:0,board:decimalBoard(seed,0,duelHeroLearningLevel({accountLevel:personalLevel})),towers:[],quote:null,lastSeen:now,lastRequest:0,lastHeartbeat:0,recent:[],combatScore:0,questionScore:0,kills:0,answeredQuestions:0,towerWrongAttempts:0,fusionWrongAttempts:0};}
export function createDuel(uid:string,name:string,seed:number,now:number,accountLevel=1,loadout:RewardLoadout={},mapId?:string):DuelState{duelMap(mapId);return {version:1,seed,...(mapId===undefined?{}:{mapId}),learningLevel:Math.min(10,normalizedAccountLevel(accountLevel)),createdAt:now,startedAt:0,preparationStartedAt:0,preparationElapsed:0,updatedAt:now,elapsed:0,wave:0,nextId:1,revision:0,status:'waiting',players:[player(uid,name,seed,now,accountLevel,loadout),null],enemies:[],shots:[],winner:null,reason:'',log:[]};}
export function joinDuel(s:DuelState,uid:string,name:string,now:number,accountLevel=1,loadout:RewardLoadout={}){
 if(s.players.some(p=>p?.uid===uid))return;
 if(s.status!=='waiting'||s.players[1]||now-s.createdAt>600000)throw Error('참가할 수 없는 방이에요. 새 방을 만들어 주세요.');
 s.players[1]=player(uid,name,s.seed,now,accountLevel,loadout);
 s.learningLevel=Math.min(10,s.players[0].accountLevel??1,s.players[1].accountLevel);
 for(const p of s.players)p!.board=decimalBoard(s.seed,p!.round,duelHeroLearningLevel(p!));
 s.revision++;
}
export function duelSide(s:DuelState,uid:string):Side{const i=s.players.findIndex(p=>p?.uid===uid);if(i<0)throw Error('이 대전에 참가한 계정이 아니에요.');return i as Side;}
function note(s:DuelState,text:string){s.log.push(text);s.log=s.log.slice(-6);}
function end(s:DuelState,winner:Side|null,reason:string){s.status='finished';s.winner=winner;s.reason=reason;note(s,reason);}
function endByScore(s:DuelState){const [a,b]=s.players as [DuelPlayer,DuelPlayer],left=duelScore(a),right=duelScore(b);s.elapsed=DUEL_SECONDS;end(s,left===right?null:left>right?0:1,`5분 종료 · 점수 ${left} : ${right}${left===right?' · 무승부':' · 높은 점수로 승부를 결정했어요.'}`);}
function owns(side:Side,x:number){return side===0?x>=1&&x<=10:x>=13&&x<=22;}
export function validDuelCell(s:DuelState,side:Side,x:number,y:number){
 const p=s.players[side];return !!p&&Number.isInteger(x)&&Number.isInteger(y)&&owns(side,x)&&y>=0&&y<DUEL_ROWS&&!duelRoadCell(s.mapId,x,y)&&!p.towers.some(t=>t.x===x&&t.y===y);
}
export function duelEnemyDistance(s:DuelState,e:DuelEnemy){return e.pathDistance??duelPathDistance(s.mapId,e.x,e.y??DUEL_ROAD);}
/** All auras measure the rendered two-dimensional position, including turns. */
interface AuraSource{owner:Side;effect:HeroEffect;amount:number;radius:number;shieldHits:number;x:number;y:number;}
function auraSources(s:DuelState):AuraSource[]{
 const sources:AuraSource[]=[];
 for(const source of s.enemies){
  if(source.hp<=0||!source.hero)continue;
  const hero=heroSpec(source.hero);if(!hero)continue;
  sources.push({owner:source.owner,effect:hero.effect,...heroEffectStats(hero.level),...duelPathPosition(s.mapId,duelEnemyDistance(s,source))});
 }
 return sources;
}
function nearbyHeroStats(s:DuelState,owner:Side,effect:HeroEffect,x:number,y:number,sources=auraSources(s)){
 let amount=0,shieldHits=0;
 for(const source of sources){
  if(source.effect!==effect||source.owner!==owner||Math.hypot(source.x-x,source.y-y)>source.radius+1e-9)continue;
  amount=Math.max(amount,source.amount);shieldHits=Math.max(shieldHits,source.shieldHits);
 }
 return {amount,shieldHits};
}
function enemyAura(s:DuelState,e:DuelEnemy,effect:HeroEffect,sources=auraSources(s)){
 const position=duelPathPosition(s.mapId,duelEnemyDistance(s,e));
 return nearbyHeroStats(s,e.owner,effect,position.x,position.y,sources);
}
function vitalityCapacity(e:DuelEnemy,amount:number){
 // HP is stored in thousandths; quantizing to tens keeps every subtraction
 // and displayed health value within the unit's two-decimal learning limit.
 return Math.round((e.vitalityBaseMax??e.max)*amount/10)*10;
}
/** Icons share authoritative range checks and never change room state. */
export function activeDuelHeroEffects(s:DuelState,e:DuelEnemy):HeroEffect[]{
 if(e.hp<=0)return [];
 const effects:HeroEffect[]=[],sources=auraSources(s);
 if(enemyAura(s,e,'haste',sources).amount>0)effects.push('haste');
 if(vitalityCapacity(e,enemyAura(s,e,'vitality',sources).amount)>(e.vitalitySpent??0))effects.push('vitality');
 if(enemyAura(s,e,'shield',sources).shieldHits>(e.shieldSpent??0))effects.push('shield');
 return effects;
}
export function activeDuelTowerHeroEffects(s:DuelState,side:Side,t:DuelTower):HeroEffect[]{
 const effects:HeroEffect[]=[],sources=auraSources(s);
 if(nearbyHeroStats(s,(1-side) as Side,'enemy-slow',t.x,t.y,sources).amount>0)effects.push('enemy-slow');
 if(nearbyHeroStats(s,side,'tower-haste',t.x,t.y,sources).amount>0)effects.push('tower-haste');
 return effects;
}
function towerAttackRate(s:DuelState,side:Side,t:DuelTower,sources=auraSources(s)){
 const haste=nearbyHeroStats(s,side,'tower-haste',t.x,t.y,sources).amount,slow=nearbyHeroStats(s,(1-side) as Side,'enemy-slow',t.x,t.y,sources).amount;
 return (1+haste)*(1-slow);
}
function syncHeroAuras(s:DuelState,sources=auraSources(s)){
 for(const e of s.enemies){
  if(e.hp<=0)continue;
  const oldBonus=e.vitalityBonus??0,baseMax=e.vitalityBaseMax??e.max,capacity=vitalityCapacity(e,enemyAura(s,e,'vitality',sources).amount);
  const bonus=Math.max(0,capacity-(e.vitalitySpent??0));
  // Removing an aura strips only its remaining buffer. Re-entry restores
  // unspent buffer, never damage already absorbed or damage to base health.
  if(capacity>0||e.vitalityBaseMax!==undefined){
   e.vitalityBaseMax=baseMax;e.vitalityBonus=bonus;e.hp=Math.max(0,e.hp-oldBonus)+bonus;e.max=baseMax+capacity;
  }
 }
}
function damageEnemy(e:DuelEnemy,hp:number){
 const damage=e.hp-hp,absorbed=Math.min(e.vitalityBonus??0,damage);
 if(absorbed>0){e.vitalityBonus=(e.vitalityBonus??0)-absorbed;e.vitalitySpent=(e.vitalitySpent??0)+absorbed;}
 e.hp=hp;
}
function enemySpeed(s:DuelState,e:DuelEnemy,sources=auraSources(s)){
 return (.24+e.level*.009)*(1+enemyAura(s,e,'haste',sources).amount)*(e.slow>0?.6:1)*duelMapSpeedScale(s.mapId);
}
/** Shared path sampling keeps rendered turns and host-authoritative movement identical. */
export function duelEnemyPosition(s:DuelState,e:DuelEnemy,seconds=0){
 const direction=e.target===0?-1:1,distance=duelEnemyDistance(s,e)+(s.status==='playing'&&seconds>0&&e.stun<=0?direction*enemySpeed(s,e)*seconds:0),position=duelPathPosition(s.mapId,distance);
 // At a corner, the negative direction enters the preceding segment rather
 // than facing back along the segment used for positive-distance sampling.
 const facing=direction<0?duelPathPosition(s.mapId,distance-1e-8):position;
 return {...position,dx:facing.dx*direction||0,dy:facing.dy*direction||0};
}
function release(p:DuelPlayer){p.quote=null;p.money+=p.escrow;p.escrow=0;}
function wrong(s:DuelState,p:DuelPlayer,q:Omit<WrongQuestion,'level'|'elapsed'|'attempts'>,level=duelLevel(s)){
 const old=p.wrongQuestions.find(o=>o.id===q.id);
 if(old){old.submitted=q.submitted;old.attempts++;return;}
 p.wrongQuestions.push({...q,level,elapsed:s.elapsed,attempts:1});
}
function spawn(s:DuelState,owner:Side,target:Side,level:number,hp:number,hero:string|null,pathDistance:number,rewardSummon=false,sourceHeroId?:string){
 if(s.enemies.length>=100)return false;
 const {x,y}=duelPathPosition(s.mapId,pathDistance);
 s.enemies.push({id:s.nextId++,owner,target,hero,level,hp,max:hp,x,y,pathDistance,slow:0,stun:0,hits:0,...(rewardSummon?{rewardSummon:true}:{}),...(sourceHeroId?{sourceHeroId}:{})});return true;
}
function summonReward(s:DuelState,side:Side,hero:HeroSpec){
 const p=s.players[side]!,length=duelMap(s.mapId).length;
 spawn(s,side,(1-side) as Side,hero.level,hero.hp,hero.id,side===0?1:length-1,true);
 p.rewardUsed=true;note(s,`${p.name} · 수집 영웅 ${hero.name} Lv.${hero.level} 출전!`);
}
/** Each scheduled wave shortens its next interval from 8.4 to about 3 seconds. */
function waveSpawnTime(wave:number){
 const decrease=5.4/(DUEL_SECONDS-8);
 return 8+8.4*(1-Math.pow(1-decrease,wave))/decrease;
}
export function advanceDuel(s:DuelState,now:number){
 if(!Number.isFinite(now)||now<s.updatedAt)return;
 if(s.status==='preparing'){
  const disconnected=s.players.map(p=>!p||now-p.lastSeen>45000);
  if(disconnected.some(Boolean)){end(s,disconnected.every(Boolean)?null:disconnected[0]?1:0,'연결이 오래 끊겨 대전이 종료됐어요.');s.updatedAt=now;s.revision++;return;}
  s.preparationElapsed=Math.min(DUEL_PREPARATION_SECONDS,Math.max(0,(now-s.preparationStartedAt)/1000));
  if(s.preparationElapsed>=DUEL_PREPARATION_SECONDS){
   s.status='playing';s.startedAt=s.preparationStartedAt+DUEL_PREPARATION_SECONDS*1000;s.updatedAt=s.startedAt;s.elapsed=0;s.wave=0;
   for(const p of s.players){if(!p)continue;p.money=0;p.escrow=0;p.quote=null;}
   note(s,'2분 문제풀이 완료 · 3분 동안 모은 타워를 배치하고 영웅을 소환해요!');
   syncHeroAuras(s);
  }
 }
 if(s.status==='playing'){
  const disconnected=s.players.map(p=>!p||now-p.lastSeen>45000);
  if(disconnected.every(Boolean)){end(s,null,'양쪽의 연결이 종료되어 대전을 마쳤어요.');s.updatedAt=now;s.revision++;return;}
  if(disconnected.some(Boolean)){end(s,disconnected[0]?1:0,'상대의 연결이 오래 끊겨 대전이 종료됐어요.');s.updatedAt=now;s.revision++;return;}
  let remaining=Math.min(DUEL_SECONDS-s.elapsed,(now-s.updatedAt)/1000);
  while(remaining>1e-7&&s.status==='playing'){
   const dt=Math.min(.1,remaining);remaining-=dt;s.elapsed+=dt;const lv=duelLevel(s);
   if(s.elapsed+1e-8>=waveSpawnTime(s.wave)){
    const quantum=lv===1?100:10,hp=Math.round((200+lv*320+(s.wave%3)*130)/quantum)*quantum;
    // A wave always arrives as a pair. Skip a full road's scheduled wave
    // without queuing a burst or giving either player the final free slot.
    if(s.enemies.length<=98){const length=duelMap(s.mapId).length;spawn(s,1,0,lv,hp,null,length-1);spawn(s,0,1,lv,hp,null,1);}
    s.wave++;
   }
   const movementSources=auraSources(s);syncHeroAuras(s,movementSources);
   for(const e of s.enemies){
    if(e.hp<=0)continue;e.slow=Math.max(0,e.slow-dt);e.stun=Math.max(0,e.stun-dt);if(e.stun>0)continue;
    e.pathDistance=duelEnemyDistance(s,e)+(e.target===0?-1:1)*enemySpeed(s,e,movementSources)*dt;
    const position=duelPathPosition(s.mapId,e.pathDistance);e.x=position.x;e.y=position.y;
    if(e.pathDistance<=0||e.pathDistance>=duelMap(s.mapId).length){const p=s.players[e.target]!;p.flame=Math.max(0,p.flame-(e.hero?1000+e.level*300:1000));e.hp=0;note(s,`${p.name}의 불꽃 체력 ${numberText(p.flame)} · ${e.hero?'영웅':'돌 몬스터'} 도착`);}
   }
   let towerSources=auraSources(s);syncHeroAuras(s,towerSources);
   for(const side of [0,1] as Side[]){const p=s.players[side]!;
    for(const t of p.towers){
     t.cooldown=Math.max(0,t.cooldown-dt*towerAttackRate(s,side,t,towerSources));if(!t.enabled||t.cooldown>0)continue;
     const spec=towerType(t.typeId)!,radius=spec.effect==='range'?4:3;
     const e=s.enemies.filter(e=>{const position=duelEnemyPosition(s,e);return e.hp>0&&e.target===side&&Math.hypot(t.x-position.x,t.y-position.y)<=radius;}).sort((a,b)=>Number(b.hp>=t.unit)-Number(a.hp>=t.unit)||(side===0?duelEnemyDistance(s,a)-duelEnemyDistance(s,b):duelEnemyDistance(s,b)-duelEnemyDistance(s,a))||a.id-b.id)[0];
     if(!e)continue;t.cooldown=spec.cooldown;
     if(enemyAura(s,e,'shield',towerSources).shieldHits>(e.shieldSpent??0)){
      e.shieldSpent=(e.shieldSpent??0)+1;(s.shots??=[]).push({id:s.nextId++,time:s.elapsed,towerId:t.id,typeId:t.typeId,fromX:t.x,fromY:t.y,owner:side,enemyId:e.id,x:e.x,y:e.y??DUEL_ROAD,before:e.hp,unit:t.unit,after:e.hp,effect:spec.effect,shielded:true});
      note(s,`${p.name}: 영웅의 보호막이 공격을 막았어요`);continue;
     }
     const result=hit(e.hp,t.unit);if(!result.valid){note(s,`${p.name}: 공격력이 남은 체력보다 커요`);continue;}
     const before=e.hp;damageEnemy(e,result.hp);e.hits++;(s.shots??=[]).push({id:s.nextId++,time:s.elapsed,towerId:t.id,typeId:t.typeId,fromX:t.x,fromY:t.y,owner:side,enemyId:e.id,x:e.x,y:e.y??DUEL_ROAD,before,unit:t.unit,after:e.hp,effect:spec.effect});note(s,`${p.name}: ${numberText(before)} − ${numberText(t.unit)} = ${numberText(e.hp)}`);
     if(spec.effect==='slow')e.slow=3;
     if(spec.effect==='stun'&&((Math.imul(e.id+e.hits,1103515245)+s.seed)>>>0)%100<25)e.stun=1.5;
     if(e.hp===0){p.combatScore=(p.combatScore??0)+duelKillScore(e.hits+(e.shieldSpent??0));p.kills=(p.kills??0)+1;}
     if(e.hp===0&&e.hero){towerSources=auraSources(s);syncHeroAuras(s,towerSources);}
    }
   }
   s.enemies=s.enemies.filter(e=>e.hp>0);s.shots=(s.shots??[]).filter(e=>s.elapsed-e.time<2.4).slice(-48);
   const [a,b]=s.players as [DuelPlayer,DuelPlayer];
   if(a.flame===0||b.flame===0)end(s,a.flame===0&&b.flame===0?null:a.flame===0?1:0,'불꽃이 파괴되어 대전이 끝났어요.');
   else if(s.elapsed>=DUEL_SECONDS-1e-7)endByScore(s);
  }
  if(s.status==='playing'&&s.elapsed>=DUEL_SECONDS-1e-7)endByScore(s);
 }
 for(const p of s.players)if(p?.quote&&p.quote.expires<=now)release(p);
 s.updatedAt=now;s.revision++;
}
export function applyDuel(s:DuelState,side:Side,action:DuelAction,now:number,nonce:string):{ok:boolean;message:string}{
 const p=s.players[side];if(!p)throw Error('참가자 정보가 없어요.');
 const bad=(message:string)=>({ok:false,message}),ok=(message:string)=>({ok:true,message});
 if(!Number.isFinite(now))return bad('요청 시간을 확인할 수 없어요. 다시 시도해 주세요.');
 // Requests cannot extend either phase or award points after its deadline,
 // even when called directly instead of through the usual host tick.
 if(s.status==='preparing'&&now>=s.preparationStartedAt+DUEL_PREPARATION_SECONDS*1000||s.status==='playing'&&now>=s.startedAt+DUEL_SECONDS*1000)advanceDuel(s,now);
 if(s.status==='finished')return bad(s.reason);
 if(action.type==='tick')return ok('');
 if(action.type==='surrender'){end(s,(1-side) as Side,'상대가 대전을 나갔어요.');release(p);return ok('대전을 마쳤어요.');}
 if(action.type==='select-reward'){
  if(s.status!=='waiting'||p.ready)return bad('준비하기 전에 학습지 영웅을 선택해요.');
  if(action.heroId!==null&&(!(p.rewardRoster??[]).includes(action.heroId)||!heroSpec(action.heroId)))return bad('이 방을 만들거나 참가할 때 보유한 영웅만 선택할 수 있어요.');
  p.rewardHero=action.heroId;return ok('학습지 영웅을 선택했어요.');
 }
 if(action.type==='summon-reward'){
  if(s.status!=='playing')return bad('대전이 시작된 뒤 원하는 때에 소환해요.');
  if(p.rewardUsed)return bad('학습지 영웅은 대전마다 한 번만 소환할 수 있어요.');
  const hero=p.rewardHero?heroSpec(p.rewardHero):null;
  if(!hero||!(p.rewardRoster??[]).includes(hero.id))return bad('준비하기 전에 획득한 학습지 영웅을 선택해요.');
  if(s.enemies.length+1>100)return bad('길이 붐벼요. 잠시 뒤 소환해 주세요.');
  summonReward(s,side,hero);syncHeroAuras(s);return ok(`${hero.name} 출발! 다음 대전에서도 선택할 수 있어요.`);
 }
 if(action.type==='summon'){
  if(s.status!=='playing')return bad('전투가 시작되면 모아 둔 영웅을 원하는 때에 소환해요.');
  const hero=heroSpec(action.heroId);if(!hero||(p.heroStock?.[hero.id]??0)<1)return bad('모아 둔 영웅을 선택해 주세요.');
  const length=duelMap(s.mapId).length;
  if(!spawn(s,side,(1-side) as Side,hero.level,hero.hp,hero.id,side===0?1:length-1))return bad('길이 붐벼요. 잠시 뒤 소환해 주세요.');
  p.heroStock![hero.id]--;syncHeroAuras(s);note(s,`${p.name} · ${hero.name} Lv.${hero.level} 소환!`);return ok(`${hero.name}이 아군 성에서 출발했어요.`);
 }
 if(action.type==='ready'){
  if(s.status!=='waiting')return bad('이미 대전이 시작됐어요.');
  if(p.ready)return bad('이미 시작을 준비했어요. 상대의 준비를 기다려요.');
  const roster=(p.rewardRoster??[]).filter(id=>!!heroSpec(id));
  const heroId=action.heroId===undefined?(p.rewardHero&&roster.includes(p.rewardHero)?p.rewardHero:roster[0]??null):action.heroId;
  if(heroId!==null&&!roster.includes(heroId))return bad('보유한 수집 영웅 중 하나를 선택해요.');
  if(roster.length>0&&heroId===null)return bad('함께 출전할 수집 영웅을 선택해요.');
  const readyTogether=s.players.every((a,i)=>i===side||a?.ready);
  p.rewardHero=heroId;p.ready=true;
  if(readyTogether){
   s.status='preparing';s.preparationStartedAt=now;s.preparationElapsed=0;s.updatedAt=now;
   for(const a of s.players)if(a)a.lastSeen=now;
   note(s,'양쪽 준비 완료 · 2분 동안 타워 구매와 영웅 부화 문제를 자유롭게 풀어요!');
  }
  return ok('준비했어요.');
 }
 if(!['playing','preparing'].includes(s.status))return bad('게임을 시작하면 2분 동안 타워와 영웅 문제를 풀어요.');
 if(action.type==='cancel'){release(p);return ok('구매를 취소했어요.');}
 if(action.type==='prepare-quote'||action.type==='quote'){
  if(s.status!=='preparing')return bad('전투 중에는 문제를 풀지 않고 타워를 바로 설치해요.');
  if(p.quote)return bad('열린 구매 문제를 먼저 풀거나 취소해요.');
  const type=towerType(action.typeId),lv=duelTowerLevel(s);if(!type||!canUseDuelTower(s,side,action.typeId))return bad('타워를 다시 선택해 주세요.');
  const variation=p.purchaseVariation??{round:0},cost=towerPrice(type,p.money,lv,variation);if(cost>p.money)return bad('코인이 부족해요.');
  // Cancelling and rerolling a quote cannot erase mistakes before the next correct answer.
  const before=purchaseCoins(p.money);p.quote={x:-1,y:-1,typeId:type.id,before,wallet:p.money,cost,digits:lv===1?1:2,nonce,expires:s.preparationStartedAt+DUEL_PREPARATION_SECONDS*1000,purpose:'preparation',wrongAttempts:p.towerWrongAttempts??0};
  p.purchaseVariation={round:variation.round+1,lastBefore:before,lastCost:cost};return ok('남는 코인을 계산하면 선택한 타워를 한 개 모아요.');
 }
 if(action.type==='answer'){
  if(s.status!=='preparing')return bad('문제풀이 시간이 끝났어요. 모은 타워를 설치해요.');
  const q=p.quote;if(!q||q.nonce!==action.nonce)return bad('새 구매 문제를 열어 주세요.');
  if(typeof action.answer!=='string'||action.answer.length>12)return bad('답을 12글자 이내로 입력해 주세요.');
  if(parseMoney(action.answer)!==q.before-q.cost){q.wrongAttempts=(p.towerWrongAttempts??q.wrongAttempts??0)+1;p.towerWrongAttempts=q.wrongAttempts;wrong(s,p,{id:q.nonce,kind:'tower',a:q.before,b:q.cost,operation:'-',submitted:action.answer,correct:q.before-q.cost},duelTowerLevel(s));return bad('소수점을 맞추고 다시 빼 보세요. 돈은 그대로예요.');}
  const type=towerType(q.typeId);if(!type)return bad('타워를 다시 선택해 주세요.');p.money=q.wallet-q.cost;(p.stock??={})[type.id]=(p.stock[type.id]??0)+1;
  p.purchases++;awardQuestion(p,p.towerWrongAttempts??q.wrongAttempts??0);p.towerWrongAttempts=0;note(s,`${p.name}: ${numberText(q.before)} − ${numberText(q.cost)} = ${numberText(q.before-q.cost)} · ${type.name} +1`);release(p);return ok('정답! 설치할 타워를 한 개 모았어요.');
 }
 if(action.type==='build'){
  if(s.status!=='playing')return bad('2분 문제풀이가 끝나면 모은 타워를 설치할 수 있어요.');
  const type=towerType(action.typeId);
  if(!type||!canUseDuelTower(s,side,action.typeId))return bad('전반부에 모아 둔 타워만 설치할 수 있어요.');
  if(!validDuelCell(s,side,action.x,action.y))return bad('내 쪽의 비어 있는 바닥에 설치해요.');
  if(p.towers.length>=14||(type.unit===10&&p.towers.filter(t=>t.unit===10).length>=3))return bad('설치 제한이에요. 전체 14개, 바늘탑 3개까지예요.');
  p.stock[type.id]--;
  p.towers.push({id:s.nextId++,typeId:type.id,x:action.x,y:action.y,unit:type.unit,cost:0,enabled:true,cooldown:0,prepared:true});
  return ok('모아 둔 타워를 설치했어요.');
 }
 if(action.type==='toggle'||action.type==='sell'){
  if(s.status!=='playing')return bad('전투가 시작된 뒤 타워를 선택해요.');
  if(p.quote)return bad('구매 문제를 먼저 닫아 주세요.');const t=p.towers.find(t=>t.id===action.towerId);if(!t)return bad('내 타워를 선택해 주세요.');
  if(action.type==='toggle'){t.enabled=!t.enabled;return ok(`발사 ${t.enabled?'켜짐':'멈춤'}`);}
  p.towers=p.towers.filter(o=>o.id!==t.id);
  (p.stock??={})[t.typeId]=(p.stock[t.typeId]??0)+1;return ok('타워를 회수했어요. 다시 설치할 수 있어요.');
 }
 if(action.type==='fuse'){
  // Keep the runtime check for network messages from older clients.
  if(action.operation!=='+')return bad('영웅 알은 덧셈으로 만들어요. 두 블럭의 합을 골라 주세요.');
  if(s.status!=='preparing')return bad('문제풀이 시간이 끝났어요. 모아 둔 영웅을 소환해요.');
  if(p.egg>=10)return bad('알은 10레벨이에요. 먼저 부화시켜 주세요.');
  if(action.round!==p.round||!Array.isArray(action.slots)||action.slots.length!==3||new Set(action.slots).size!==3||action.slots.some(i=>!Number.isInteger(i)||i<0||i>15))return bad('서로 다른 블럭 세 개를 다시 골라요.');
  const [a,b,c]=action.slots.map(i=>p.board[i]);
  // Mistakes belong to the whole board round, even if the player changes operands.
  if(![a,b,c].every(learningValue))return bad('소수는 두 자리까지, 자연수 부분은 한 자리로 계산해요. 다른 블럭 조합을 골라 주세요.');
  if(!learningValue(a+b)){p.fusionWrongAttempts=(p.fusionWrongAttempts??0)+1;return bad('소수는 두 자리까지, 자연수 부분은 한 자리로 계산해요. 다른 블럭 조합을 골라 주세요.');}
  if(!recipe(a,b,c,'+')){p.fusionWrongAttempts=(p.fusionWrongAttempts??0)+1;wrong(s,p,{id:`fusion-${p.round}-+-${a}-${b}`,kind:'fusion',a,b,operation:'+',submitted:numberText(c),correct:a+b},duelHeroLearningLevel(p));return bad('식이 맞지 않아요. 블럭과 알은 그대로예요.');}
  awardQuestion(p,p.fusionWrongAttempts??0);p.fusionWrongAttempts=0;p.egg++;p.solved++;p.round++;p.board=decimalBoard(s.seed,p.round,duelHeroLearningLevel(p));return ok(`덧셈 정답! 영웅 알 ${p.egg}레벨 · 지금 부화하거나 더 성장시켜요.`);
 }
 if(action.type==='hatch'){
  const hero=heroSpec(action.heroId);
  if(!hero||p.egg<1||hero.level!==p.egg)return bad('현재 알 레벨의 영웅을 골라 주세요.');
  if(s.status==='preparing'){
   (p.heroStock??={})[hero.id]=(p.heroStock[hero.id]??0)+1;p.egg=0;note(s,`${p.name} · ${hero.name} Lv.${hero.level} 비축!`);return ok(`${hero.name}을 모았어요. 전투에서 원하는 때에 소환해요.`);
  }
  const length=duelMap(s.mapId).length;
  if(!spawn(s,side,(1-side) as Side,hero.level,hero.hp,hero.id,side===0?1:length-1))return bad('길이 붐벼요. 잠시 뒤 부화해 주세요.');
  syncHeroAuras(s);
  p.egg=0;note(s,`${p.name} · ${hero.name} Lv.${hero.level} 부화!`);return ok(`${hero.name}이 상대 불꽃을 향해 출발했어요.`);
 }
 return bad('지원하지 않는 조작이에요.');
}
