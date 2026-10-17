import type {Difficulty} from './difficulty';
import {projectileTravelTime} from './projectile-timing';
import {hit,learningValue,numberText} from './math';
import {parseMoney} from './towers';
import {SIEGE_STAGE_COUNT,siegeStage,type SiegeStage} from './secret-siege-stages';
import {REVIVED_WIZARD,revivedWizard,newSiegeBossState,type SiegeBossState} from './secret-siege-boss';
import {siegeMonster,SIEGE_MONSTER_ALIVE_LIMIT} from './secret-siege-monsters';
import {normalizeSiegeEconomy,STARTER_BUDGET,SIEGE_COIN_LIMIT,type SiegeEconomy,type SiegeEconomyCommit} from './secret-siege-research';
import {ARMY,SIEGE_ARMY_LIMIT,SIEGE_DURATION,type ArmyId,type SiegeEvent,type SiegePhase,type SiegeProjectile,type SiegeQuestion,type SiegeTarget,type SiegeUnit,type SiegeMonster} from './secret-siege-types';

const EPSILON=1e-7,HEAL=600;
export const SIEGE_RECRUIT_INCREMENT=10;
const spec=(id:ArmyId)=>ARMY.find(army=>army.id===id);
const enemyCooldowns:Record<Difficulty,readonly number[]>={practice:[2.1,2,1.9,1.8,1.65],standard:[1.6,1.55,1.5,1.4,1.2],challenge:[1.25,1.2,1.15,1.1,.95]};
interface ShotOwner{sourceId:string;}

/** An isolated, exact-decimal attack campaign. Rendering never owns damage. */
export class SecretSiege{
 phase:SiegePhase='ready';money=9900;reserve:Record<ArmyId,number>={guard:0,striker:0,scout:0,knight:0,ranger:0,champion:0,priest:0};
 units:SiegeUnit[]=[];targets:SiegeTarget[];monsters:SiegeMonster[]=[];projectiles:SiegeProjectile[]=[];events:SiegeEvent[]=[];
 pendingQuestion?:SiegeQuestion;elapsed=0;correctAnswers=0;wrongAnswers=0;ralliesLeft=3;recruited=0;deployed=0;
 private unitSerial=0;private shotSerial=0;private questionSerial=0;private nextDeploy=0;
 private owners=new Map<number,ShotOwner>();private reservedDamage=new Map<string,number>();
 private quotes=new Map<string,SiegeQuestion>();
 private spawnedMonsters=0;private rewardedTowers=new Set<string>();earnedCoins=0;
 private researchIds=new Set<ArmyId>();private readonly startingEconomy:Required<SiegeEconomy>;economyRevision=0;
 readonly stage:SiegeStage;
 readonly bossState?:SiegeBossState;
 constructor(readonly difficulty:Difficulty,readonly stageId=1,economy?:SiegeEconomy){
  const initial=normalizeSiegeEconomy(economy);this.startingEconomy=initial;this.money=initial.coins;this.researchIds=new Set(initial.researched);this.economyRevision=initial.revision;
  this.stage=siegeStage(stageId);const stage=this.stage;
  const cooldowns=enemyCooldowns[difficulty].map(cooldown=>cooldown*stage.cooldownScale);
  this.targets=[
   {id:'gate-tower',kind:'tower',towerKind:'arcane',name:'성문 마력탑',distance:240,placement:{x:-30,y:-76},hp:2400,maxHp:2400,attack:100,cooldown:cooldowns[0],range:175,reload:0,lastHit:-999,lastShot:-999},
   {id:'venom-tower',kind:'tower',towerKind:'venom',name:'맹독 수호탑',distance:430,placement:{x:-92,y:23},hp:3600,maxHp:3600,attack:150,cooldown:cooldowns[1],range:185,reload:0,lastHit:-999,lastShot:-999},
   {id:'inner-tower',kind:'tower',towerKind:'arcane',name:'내성 마력탑',distance:620,placement:{x:11,y:122},hp:4500,maxHp:4500,attack:200,cooldown:cooldowns[2],range:195,reload:0,lastHit:-999,lastShot:-999},
   {id:'citadel-tower',kind:'tower',towerKind:'venom',name:'성채 수호탑',distance:800,placement:{x:32,y:-76},hp:5400,maxHp:5400,attack:250,cooldown:cooldowns[3],range:205,reload:0,lastHit:-999,lastShot:-999},
   {id:'wizard-castle',kind:'castle',name:'마법사의 성',distance:950,hp:9990,maxHp:9990,attack:300,cooldown:cooldowns[4],range:240,reload:0,lastHit:-999,lastShot:-999},
  ];
  for(let index=0;index<this.targets.length;index++){
   const target=this.targets[index],tower=target.kind==='tower';
   target.hp=target.maxHp=tower?stage.towerHp[index]:stage.castleHp;
   target.attack=tower?stage.towerAttack[index]:stage.castleAttack;
   target.range=tower?stage.towerRanges[index]:stage.castleRange;
  }
  if(stageId===SIEGE_STAGE_COUNT){this.targets.splice(4,0,revivedWizard(difficulty));this.bossState=newSiegeBossState();}
 }
 get castle(){return this.targets.find(target=>target.kind==='castle')!.hp;}
 get boss(){return this.targets.find(target=>target.kind==='boss');}
 get destroyedTowers(){return this.targets.filter(target=>target.kind==='tower'&&target.hp<=0).length;}
 get monsterSpawned(){return this.spawnedMonsters;}
 get monsterLimit(){return this.stage.monsterLimit;}
 get monsterAliveLimit(){return SIEGE_MONSTER_ALIVE_LIMIT;}
 get nextMonsterIn(){return this.phase==='won'||this.phase==='lost'||this.spawnedMonsters>=this.monsterLimit||this.castle<=0?Infinity:Math.max(0,this.stage.monsterSpawnDelay+this.spawnedMonsters*this.stage.monsterSpawnInterval-this.elapsed);}
 get researched():readonly ArmyId[]{return ARMY.filter(army=>this.researchIds.has(army.id)).map(army=>army.id);}
 get remainingTowerRewards(){return this.targets.filter(target=>target.kind==='tower').reduce((sum,target,index)=>sum+(target.hp>0&&!this.rewardedTowers.has(target.id)?this.stage.towerRewards[index]:0),0);}
 /** The constructor snapshot is diagnostic only; persistence uses currentEconomy. */
 get initialEconomy():Required<SiegeEconomy>{return {...this.startingEconomy,researched:[...this.startingEconomy.researched]};}
 get currentEconomy():Required<SiegeEconomy>{return {coins:this.money,researched:this.researched,revision:this.economyRevision};}
 armyUnlocked(id:ArmyId){const army=spec(id);return !!army&&(army.researchCost===0||this.researchIds.has(id));}
 canResearch(id:ArmyId){const army=spec(id);return !!army&&army.researchCost>0&&!this.researchIds.has(id)&&this.phase==='ready'&&!this.pendingQuestion&&this.money-army.researchCost>=STARTER_BUDGET;}
 research(id:ArmyId,commit?:SiegeEconomyCommit):boolean{
  if(!this.canResearch(id))return false;const army=spec(id)!;
  if(commit&&!this.commitEconomy({...this.currentEconomy,coins:this.money-army.researchCost,researched:[...this.researched,id]},commit))return false;
  this.money-=army.researchCost;this.researchIds.add(id);if(commit)this.economyRevision++;return true;
 }
 private commitEconomy(proposed:Required<SiegeEconomy>,commit:SiegeEconomyCommit){try{return commit(proposed)===true;}catch{return false;}}
 get armyCount(){return this.units.filter(unit=>unit.hp>0).length+Object.values(this.reserve).reduce((sum,count)=>sum+count,0);}
 get canRally(){return this.phase==='playing'&&!this.pendingQuestion&&this.ralliesLeft>0&&this.units.some(unit=>unit.hp>0&&unit.hp<unit.maxHp);}
 get stars(){return this.phase==='won'?this.elapsed<=105&&this.wrongAnswers===0?3:this.elapsed<=150?2:1:0;}
 private interactive(){return this.phase==='ready'||this.phase==='playing';}
 recruitCost(id:ArmyId):number{const army=spec(id);return army&&Number.isSafeInteger(this.recruited)&&this.recruited>=0?Math.min(9990,army.cost+this.recruited*SIEGE_RECRUIT_INCREMENT):Infinity;}
 private recruitmentAllowed(id:ArmyId):boolean{
  const army=spec(id);
  const cost=this.recruitCost(id);
  if(!army||!this.armyUnlocked(id)||!this.interactive()||this.money<cost||this.armyCount>=SIEGE_ARMY_LIMIT)return false;
  // All four towers must fall to win. Reserve their real, unclaimed proceeds
  // for the next stage's basic training without advancing any money now.
  if(this.money-cost+this.remainingTowerRewards<STARTER_BUDGET)return false;
  // Keep a legal starting formation affordable. Otherwise spending the last
  // coin or filling every slot with scouts would strand the preparation UI.
  if(this.phase==='ready'){
   const scouts=this.reserve.scout+(id==='scout'?1:0),others=this.reserve.guard+this.reserve.striker+(id!=='scout'?1:0);
   const missing:ArmyId[]=[...(scouts?[]:['scout'] as const),...(others?[]:['striker'] as const)];
   const stillNeeded=missing.reduce((sum,next,index)=>sum+spec(next)!.cost+(this.recruited+1+index)*SIEGE_RECRUIT_INCREMENT,0);
   if(this.money-cost<stillNeeded||SIEGE_ARMY_LIMIT-this.armyCount-1<missing.length)return false;
  }
  return true;
 }
 canRecruit(id:ArmyId):boolean{return !this.pendingQuestion&&this.recruitmentAllowed(id);}
 requestRecruit(id:ArmyId):boolean{
  if(!this.canRecruit(id))return false;
  const cost=this.recruitCost(id),key=`recruit:${id}:${this.money}:${this.recruited}:${cost}`,cached=this.quotes.get(key);
  const question=cached??{id:++this.questionSerial,kind:'recruit',armyId:id,a:this.money,b:cost,operation:'-',answer:this.money-cost} as const;
  this.quotes.set(key,question);this.pendingQuestion=question;return true;
 }
 requestRally():boolean{
  if(!this.canRally)return false;
  const injured=this.units.find(unit=>unit.hp>0&&unit.hp<=unit.maxHp-HEAL)??this.units.find(unit=>unit.hp>0&&unit.hp<unit.maxHp)!;
  const healing=Math.min(HEAL,injured.maxHp-injured.hp),key=`rally:${this.ralliesLeft}:${injured.id}:${injured.hp}`;
  const question=this.quotes.get(key)??{id:++this.questionSerial,kind:'rally',a:injured.hp,b:healing,operation:'+',answer:injured.hp+healing} as const;
  this.quotes.set(key,question);this.pendingQuestion=question;return true;
 }
 answer(text:string,commit?:SiegeEconomyCommit):boolean{
  const question=this.pendingQuestion,value=parseMoney(text);
  if(!question||!this.interactive())return false;
  const valid=value!==null&&Number.isSafeInteger(value)&&value>=0&&value%10===0&&(question.kind==='recruit'||learningValue(value));
  if(!valid||value!==question.answer){this.wrongAnswers++;return false;}
  if(question.kind==='recruit'){
   const army=question.armyId?spec(question.armyId):undefined;
   if(!army||this.money!==question.a||question.b!==this.recruitCost(army.id)||question.answer!==question.a-question.b||!this.recruitmentAllowed(army.id))return false;
   if(commit&&!this.commitEconomy({...this.currentEconomy,coins:this.money-question.b},commit))return false;
   this.money-=question.b;this.reserve[army.id]++;this.recruited++;
   if(commit)this.economyRevision++;
   this.events.push({type:'recruit',message:`${army.name} 훈련 완료`});
  }else{
   if(this.ralliesLeft<=0||!this.units.some(unit=>unit.hp>0&&unit.hp<unit.maxHp))return false;
   this.ralliesLeft--;
   for(const unit of this.units)if(unit.hp>0)unit.hp=Math.min(unit.maxHp,unit.hp+HEAL);
   this.events.push({type:'rally',message:'집결! 살아 있는 아군의 체력을 최대 0.6 회복했어요.'});
  }
  this.correctAnswers++;this.pendingQuestion=undefined;this.quotes.clear();return true;
 }
 cancelQuestion(){this.pendingQuestion=undefined;}
 start():boolean{
  if(this.phase!=='ready'||this.pendingQuestion||this.reserve.scout<1||this.reserve.guard+this.reserve.striker<1)return false;
  this.phase='playing';return true;
 }
 deploy(id:ArmyId):boolean{
  const army=spec(id);
  if(!army||this.phase!=='playing'||this.pendingQuestion||this.reserve[id]<1||this.elapsed+EPSILON<this.nextDeploy)return false;
  this.reserve[id]--;this.units.push({id:'army-'+(++this.unitSerial),typeId:id,distance:0,hp:army.hp,maxHp:army.hp,reload:0,lastHit:-999,attacking:false,deployedAt:this.elapsed,healReload:0,lastHeal:-999});
  this.deployed++;this.nextDeploy=this.elapsed+.65;this.events.push({type:'deploy',message:`${army.name} 출격!`});return true;
 }
 togglePause(){if(this.phase==='playing')this.phase='paused';else if(this.phase==='paused')this.phase='playing';}
 step(dt:number){
  if(this.phase!=='playing'||this.pendingQuestion||!Number.isFinite(dt)||dt<=0)return;
  dt=Math.min(dt,.1);this.elapsed=Math.min(SIEGE_DURATION,this.elapsed+dt);
  this.advanceProjectiles(dt);
  if(this.phase!=='playing')return;
  if(this.castle>0&&this.spawnedMonsters<this.monsterLimit&&this.monsters.filter(monster=>monster.hp>0).length<this.monsterAliveLimit&&this.nextMonsterIn<=EPSILON){
   const monster=siegeMonster(this.stageId,this.spawnedMonsters++,this.difficulty,this.elapsed);this.monsters.push(monster);this.events.push({type:'monster-spawn',message:`${monster.name} 출격!`,targetId:monster.id,friendly:false});
  }
  this.advanceBoss();
  for(const unit of this.units){
   if(unit.hp<=0)continue;
   unit.reload=Math.max(0,unit.reload-dt);const army=spec(unit.typeId)!;
   this.support(unit,dt);
   const structure=this.targets.find(target=>target.hp>0);
   const monster=this.monsters.filter(enemy=>enemy.hp>0&&enemy.distance>=unit.distance-army.range&&(!structure||enemy.distance<=structure.distance||Math.abs(enemy.distance-unit.distance)<=army.range)).sort((a,b)=>Math.abs(a.distance-unit.distance)-Math.abs(b.distance-unit.distance))[0];
   const target=monster??structure;unit.targetId=target?.id;unit.attacking=false;
   if(!target)continue;
   if(target.distance-unit.distance>army.range)unit.distance=Math.min(target.distance-army.range,unit.distance+army.speed*dt);
   unit.attacking=Math.abs(target.distance-unit.distance)<=army.range+EPSILON;
   const remaining=target.hp-(this.reservedDamage.get(target.id)??0);
   if(!unit.attacking||unit.reload>EPSILON||(target.kind==='monster'?remaining<=0:remaining<army.attack))continue;
   this.shoot('army',unit.id,unit.distance,target.distance,army.attack,target.id,unit.typeId==='scout'?.35:unit.typeId==='guard'?.5:.6);
   unit.lastShot=this.elapsed;
   unit.reload=army.cooldown*((unit.hexUntil??0)>this.elapsed?REVIVED_WIZARD.hexReloadScale:1);
  }
  this.moveMonsters(dt);
  for(const target of this.targets){
   if(target.hp<=0)continue;
   if(target.kind==='boss'&&this.bossState?.phase==='dormant')continue;
   if(target.kind==='boss'&&this.bossState?.spell)continue;
   if(target.kind==='castle'&&this.boss&&this.boss.hp>0)continue;
   target.reload=Math.max(0,target.reload-dt);
   const unit=this.units.filter(unit=>unit.hp>0&&Math.abs(target.distance-unit.distance)<=target.range+EPSILON).sort((a,b)=>b.distance-a.distance||a.deployedAt-b.deployedAt)[0];
   if(!unit||target.reload>EPSILON)continue;
   const enraged=target.kind==='boss'&&this.bossState?.phase==='enraged';
   this.shoot('enemy',target.id,target.distance,unit.distance,target.attack,unit.id,.5);target.reload=target.cooldown*(enraged?.8:1);target.lastShot=this.elapsed;
  }
  if(this.elapsed>=SIEGE_DURATION-EPSILON)this.lose('시간이 다 되었어요. 군대의 구성과 출격 순서를 바꿔 다시 도전해요.');
  else if(!this.units.some(unit=>unit.hp>0)&&Object.values(this.reserve).every(count=>count===0)&&!ARMY.some(army=>this.canRecruit(army.id)))this.lose('출격할 군대와 모집 코인이 모두 소진되었어요.');
 }
 private support(unit:SiegeUnit,dt:number){
  const army=spec(unit.typeId)!;if(!army.supportHeal)return;
  unit.healReload=Math.max(0,(unit.healReload??0)-dt);if(unit.healReload>EPSILON)return;
  const injured=this.units.filter(friend=>friend.hp>0&&friend.hp<friend.maxHp&&Math.abs(friend.distance-unit.distance)<=army.supportRange!).sort((a,b)=>(b.maxHp-b.hp)-(a.maxHp-a.hp))[0];
  if(!injured)return;const healed=Math.min(army.supportHeal,injured.maxHp-injured.hp);injured.hp+=healed;unit.lastHeal=this.elapsed;unit.healReload=army.supportCooldown;
  this.events.push({type:'heal',message:`왕국 사제가 아군을 ${numberText(healed,2)} 회복했어요.`,targetId:injured.id,damage:healed,friendly:true});
 }
 private moveMonsters(dt:number){
  for(const monster of this.monsters){
   if(monster.hp<=0)continue;monster.reload=Math.max(0,monster.reload-dt);
   const unit=this.units.filter(friend=>friend.hp>0).sort((a,b)=>Math.abs(monster.distance-a.distance)-Math.abs(monster.distance-b.distance))[0];
   monster.targetId=unit?.id;monster.attacking=false;
   if(unit){const gap=unit.distance-monster.distance;if(Math.abs(gap)>monster.range){const movement=Math.min(Math.abs(gap)-monster.range,monster.speed*dt);monster.distance+=Math.sign(gap)*movement;}monster.attacking=Math.abs(unit.distance-monster.distance)<=monster.range+EPSILON;}
   else monster.distance=Math.max(0,monster.distance-monster.speed*dt);
   if(!unit||!monster.attacking||monster.reload>EPSILON)continue;
   this.shoot('enemy',monster.id,monster.distance,unit.distance,monster.attack,unit.id,.3);monster.reload=monster.cooldown;monster.lastShot=this.elapsed;
  }
 }
 private advanceBoss(){
  const boss=this.boss,state=this.bossState;if(!boss||!state)return;
  if(boss.hp<=0){state.phase='defeated';state.spell=undefined;return;}
  if(state.phase==='dormant'){
   if(this.targets.some(target=>target.kind==='tower'&&target.hp>0))return;
   state.phase='dueling';state.nextSpellAt=this.elapsed+4;
   this.events.push({type:'spell',message:'부활한 마법사가 성문을 막아섰어요!',targetId:boss.id});
  }
  if(state.phase!=='enraged'&&boss.hp<=boss.maxHp*REVIVED_WIZARD.enrageRatio){state.phase='enraged';state.enragedAt=this.elapsed;boss.attack=REVIVED_WIZARD.enragedAttack;}
  const spell=state.spell;
  if(spell?.phase==='warning'&&this.elapsed+EPSILON>=spell.resolvesAt){
   spell.phase='active';state.lastSpellAt=this.elapsed;state.lastSpellKind=spell.kind;state.spellCount++;
   for(const unit of this.units)if(unit.hp>0&&Math.abs(unit.distance-spell.centerDistance)<=spell.radius+EPSILON){
    const before=unit.hp,damage=spell.kind==='shadow-wave'?REVIVED_WIZARD.waveDamage:REVIVED_WIZARD.chainDamage;
    unit.hp=Math.max(0,before-damage);unit.lastHit=this.elapsed;
    if(spell.kind==='soul-chain')unit.hexUntil=this.elapsed+REVIVED_WIZARD.hexDuration;
    this.events.push({type:'hit',message:'',targetId:unit.id,damage:before-unit.hp,friendly:false});
    if(unit.hp===0)this.events.push({type:'destroy',message:'아군이 쓰러졌어요.',targetId:unit.id,friendly:false});
   }
  }
  if(spell&&this.elapsed+EPSILON>=spell.endsAt){state.spell=undefined;state.nextSpellAt=this.elapsed+(state.phase==='enraged'?3.8:5.2);}
  if(!state.spell&&this.elapsed+EPSILON>=state.nextSpellAt){
   const front=this.units.filter(unit=>unit.hp>0&&Math.abs(boss.distance-unit.distance)<=boss.range).sort((a,b)=>b.distance-a.distance)[0];
   if(!front)return;
   const kind=state.spellCount%2===0?'shadow-wave':'soul-chain',duration=kind==='shadow-wave'?1.4:REVIVED_WIZARD.hexDuration;
   state.spell={kind,phase:'warning',startedAt:this.elapsed,resolvesAt:this.elapsed+REVIVED_WIZARD.warning,endsAt:this.elapsed+REVIVED_WIZARD.warning+duration,centerDistance:front.distance-25,radius:80};
   this.events.push({type:'spell',message:kind==='shadow-wave'?'암흑 파동이 다가와요! 부상한 병력을 회복하세요.':'영혼의 속박을 준비해요! 추가 병력을 출격시키세요.',targetId:boss.id});
  }
 }
 private shoot(source:SiegeProjectile['source'],sourceId:string,fromDistance:number,toDistance:number,damage:number,targetId:string,duration:number){
  const shot:SiegeProjectile={id:++this.shotSerial,source,sourceId,fromDistance,toDistance,damage,targetId,duration:projectileTravelTime(duration),age:0};
  this.projectiles.push(shot);this.owners.set(shot.id,{sourceId});
  if(source==='army')this.reservedDamage.set(targetId,(this.reservedDamage.get(targetId)??0)+damage);
  this.events.push({type:'shot',message:'',targetId,damage,friendly:source==='army'});
 }
 private sourceAlive(shot:SiegeProjectile){
  const id=this.owners.get(shot.id)?.sourceId;
  return shot.source==='army'?this.units.some(unit=>unit.id===id&&unit.hp>0):this.targets.some(target=>target.id===id&&target.hp>0)||this.monsters.some(monster=>monster.id===id&&monster.hp>0);
 }
 private removeShot(shot:SiegeProjectile){
  const index=this.projectiles.findIndex(projectile=>projectile.id===shot.id);if(index<0)return;
  this.projectiles.splice(index,1);this.owners.delete(shot.id);
  if(shot.source==='army'){
   const remaining=(this.reservedDamage.get(shot.targetId)??0)-shot.damage;
   if(remaining>0)this.reservedDamage.set(shot.targetId,remaining);else this.reservedDamage.delete(shot.targetId);
  }
 }
 private advanceProjectiles(dt:number){
  for(const shot of this.projectiles)shot.age+=dt;
  const arrivals=this.projectiles.slice().sort((a,b)=>(b.age-b.duration)-(a.age-a.duration)||a.id-b.id);
  for(const shot of arrivals){
   const target=shot.source==='army'?this.targets.find(target=>target.id===shot.targetId)??this.monsters.find(monster=>monster.id===shot.targetId):this.units.find(unit=>unit.id===shot.targetId);
   if(!target||target.hp<=0||!this.sourceAlive(shot)){this.removeShot(shot);continue;}
   if(shot.source==='army'&&(target as SiegeTarget).kind==='castle'&&this.boss&&this.boss.hp>0){this.removeShot(shot);continue;}
   if(shot.age+EPSILON<shot.duration)continue;
   this.removeShot(shot);
   const before=target.hp;
   if(shot.source==='army'&&'kind'in target&&target.kind!=='monster')target.hp=hit(before,shot.damage).hp;
   else target.hp=Math.max(0,before-shot.damage);
   const actual=before-target.hp;
   if(actual===0)continue;
   target.lastHit=this.elapsed;
   this.events.push({type:'hit',message:`${numberText(before,2)} − ${numberText(actual,2)} = ${numberText(target.hp,2)}`,targetId:target.id,damage:actual,friendly:shot.source==='army'});
   if(target.hp===0){
    if(shot.source==='army'&&'kind'in target&&target.kind==='tower'&&!this.rewardedTowers.has(target.id)){
     this.rewardedTowers.add(target.id);const index=this.targets.filter(item=>item.kind==='tower').findIndex(item=>item.id===target.id),coins=this.stage.towerRewards[index];
     this.money=Math.min(SIEGE_COIN_LIMIT,this.money+coins);this.earnedCoins+=coins;this.events.push({type:'reward',message:`${target.name} 파괴 · ${numberText(coins,2)} 코인 획득!`,targetId:target.id,damage:coins,friendly:true});
    }
    this.events.push({type:'destroy',message:shot.source==='army'?(target as SiegeTarget).kind==='boss'?'부활한 마법사를 쓰러뜨렸어요!':`${(target as SiegeTarget).name} 파괴!`:'아군이 쓰러졌어요.',targetId:target.id,friendly:shot.source==='army'});
    if(shot.source==='army'&&(target as SiegeTarget).kind==='boss'&&this.bossState){this.bossState.phase='defeated';this.bossState.spell=undefined;}
    if(shot.source==='army'&&this.targets.every(target=>target.hp<=0)){
     this.phase='won';this.clearShots();for(const monster of this.monsters){monster.attacking=false;monster.targetId=undefined;monster.lastShot=-999;}this.events.push({type:'won',message:this.stageId===SIEGE_STAGE_COUNT?'마지막 저주 핵을 깨뜨리고 세상에 빛을 되찾았어요!':`${this.stage.name}의 저주를 걷어 냈어요. 다음 원정길이 열렸어요!`});return;
    }
   }
  }
 }
 private clearShots(){this.projectiles.length=0;this.owners.clear();this.reservedDamage.clear();}
 private lose(message:string){this.phase='lost';this.clearShots();this.events.push({type:'lost',message});}
}
