import type {Difficulty} from './difficulty';
import {hit,learningValue,numberText} from './math';
import {parseMoney} from './towers';
import {ARMY,SIEGE_ARMY_LIMIT,SIEGE_DURATION,type ArmyId,type SiegeEvent,type SiegePhase,type SiegeProjectile,type SiegeQuestion,type SiegeTarget,type SiegeUnit} from './secret-siege-types';

const EPSILON=1e-7,HEAL=600;
const spec=(id:ArmyId)=>ARMY.find(army=>army.id===id);
const enemyCooldowns:Record<Difficulty,readonly number[]>={practice:[2.1,1.75,1.65],standard:[1.6,1.35,1.2],challenge:[1.25,1.05,.95]};
interface ShotOwner{sourceId:string;}

/** An isolated, exact-decimal attack campaign. Rendering never owns damage. */
export class SecretSiege{
 phase:SiegePhase='ready';money=9900;reserve:Record<ArmyId,number>={guard:0,striker:0,scout:0};
 units:SiegeUnit[]=[];targets:SiegeTarget[];projectiles:SiegeProjectile[]=[];events:SiegeEvent[]=[];
 pendingQuestion?:SiegeQuestion;elapsed=0;correctAnswers=0;wrongAnswers=0;ralliesLeft=3;recruited=0;deployed=0;
 private unitSerial=0;private shotSerial=0;private questionSerial=0;private nextDeploy=0;
 private owners=new Map<number,ShotOwner>();private reservedDamage=new Map<string,number>();
 private quotes=new Map<string,SiegeQuestion>();
 constructor(readonly difficulty:Difficulty){
  const cooldowns=enemyCooldowns[difficulty];
  this.targets=[
   {id:'gate-tower',kind:'tower',name:'성문 감시탑',distance:280,hp:3600,maxHp:3600,attack:100,cooldown:cooldowns[0],range:210,reload:0,lastHit:-999},
   {id:'inner-tower',kind:'tower',name:'마법 경비탑',distance:580,hp:5400,maxHp:5400,attack:200,cooldown:cooldowns[1],range:240,reload:0,lastHit:-999},
   {id:'wizard-castle',kind:'castle',name:'마법사의 성',distance:950,hp:9990,maxHp:9990,attack:300,cooldown:cooldowns[2],range:270,reload:0,lastHit:-999},
  ];
 }
 get castle(){return this.targets.find(target=>target.kind==='castle')!.hp;}
 get armyCount(){return this.units.filter(unit=>unit.hp>0).length+Object.values(this.reserve).reduce((sum,count)=>sum+count,0);}
 get canRally(){return this.phase==='playing'&&!this.pendingQuestion&&this.ralliesLeft>0&&this.units.some(unit=>unit.hp>0&&unit.hp<unit.maxHp);}
 get stars(){return this.phase==='won'?this.elapsed<=105&&this.wrongAnswers===0?3:this.elapsed<=150?2:1:0;}
 private interactive(){return this.phase==='ready'||this.phase==='playing';}
 requestRecruit(id:ArmyId):boolean{
  const army=spec(id);
  if(!army||!this.interactive()||this.pendingQuestion||this.money<army.cost||this.armyCount>=SIEGE_ARMY_LIMIT)return false;
  // Keep a legal starting formation affordable. Otherwise spending the last
  // coin or filling every slot with scouts would strand the preparation UI.
  if(this.phase==='ready'){
   const scouts=this.reserve.scout+(id==='scout'?1:0),others=this.reserve.guard+this.reserve.striker+(id!=='scout'?1:0);
   const stillNeeded=(scouts?0:450)+(others?0:900),slotsNeeded=(scouts?0:1)+(others?0:1);
   if(this.money-army.cost<stillNeeded||SIEGE_ARMY_LIMIT-this.armyCount-1<slotsNeeded)return false;
  }
  const key=`recruit:${id}:${this.money}`,cached=this.quotes.get(key);
  const question=cached??{id:++this.questionSerial,kind:'recruit',armyId:id,a:this.money,b:army.cost,operation:'-',answer:this.money-army.cost} as const;
  this.quotes.set(key,question);this.pendingQuestion=question;return true;
 }
 requestRally():boolean{
  if(!this.canRally)return false;
  const injured=this.units.find(unit=>unit.hp>0&&unit.hp<=unit.maxHp-HEAL)??this.units.find(unit=>unit.hp>0&&unit.hp<unit.maxHp)!;
  const healing=Math.min(HEAL,injured.maxHp-injured.hp),key=`rally:${this.ralliesLeft}:${injured.id}:${injured.hp}`;
  const question=this.quotes.get(key)??{id:++this.questionSerial,kind:'rally',a:injured.hp,b:healing,operation:'+',answer:injured.hp+healing} as const;
  this.quotes.set(key,question);this.pendingQuestion=question;return true;
 }
 answer(text:string):boolean{
  const question=this.pendingQuestion,value=parseMoney(text);
  if(!question||!this.interactive())return false;
  if(value===null||!learningValue(value)||value!==question.answer){this.wrongAnswers++;return false;}
  if(question.kind==='recruit'){
   const army=question.armyId?spec(question.armyId):undefined;
   if(!army||this.money!==question.a||this.money<army.cost||this.armyCount>=SIEGE_ARMY_LIMIT)return false;
   this.money-=army.cost;this.reserve[army.id]++;this.recruited++;
   this.events.push({type:'recruit',message:`${army.name} 모집 완료`});
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
  this.reserve[id]--;this.units.push({id:'army-'+(++this.unitSerial),typeId:id,distance:0,hp:army.hp,maxHp:army.hp,reload:0,lastHit:-999,attacking:false,deployedAt:this.elapsed});
  this.deployed++;this.nextDeploy=this.elapsed+.65;this.events.push({type:'deploy',message:`${army.name} 출격!`});return true;
 }
 togglePause(){if(this.phase==='playing')this.phase='paused';else if(this.phase==='paused')this.phase='playing';}
 step(dt:number){
  if(this.phase!=='playing'||this.pendingQuestion||!Number.isFinite(dt)||dt<=0)return;
  dt=Math.min(dt,.1);this.elapsed=Math.min(SIEGE_DURATION,this.elapsed+dt);
  this.advanceProjectiles(dt);
  if(this.phase!=='playing')return;
  for(const unit of this.units){
   if(unit.hp<=0)continue;
   unit.reload=Math.max(0,unit.reload-dt);const army=spec(unit.typeId)!,target=this.targets.find(target=>target.hp>0);
   if(!target)continue;
   unit.distance=Math.min(target.distance-army.range,unit.distance+army.speed*dt);
   unit.attacking=target.distance-unit.distance<=army.range+EPSILON;
   if(!unit.attacking||unit.reload>EPSILON||target.hp-(this.reservedDamage.get(target.id)??0)<army.attack)continue;
   this.shoot('army',unit.id,unit.distance,target.distance,army.attack,target.id,unit.typeId==='scout'?.35:unit.typeId==='guard'?.5:.6);
   unit.reload=army.cooldown;
  }
  for(const target of this.targets){
   if(target.hp<=0)continue;
   target.reload=Math.max(0,target.reload-dt);
   const unit=this.units.filter(unit=>unit.hp>0&&target.distance-unit.distance<=target.range+EPSILON).sort((a,b)=>b.distance-a.distance||a.deployedAt-b.deployedAt)[0];
   if(!unit||target.reload>EPSILON)continue;
   this.shoot('enemy',target.id,target.distance,unit.distance,target.attack,unit.id,.5);target.reload=target.cooldown;
  }
  if(this.elapsed>=SIEGE_DURATION-EPSILON)this.lose('시간이 다 되었어요. 군대의 구성과 출격 순서를 바꿔 다시 도전해요.');
  else if(!this.units.some(unit=>unit.hp>0)&&Object.values(this.reserve).every(count=>count===0)&&this.money<Math.min(...ARMY.map(army=>army.cost)))this.lose('출격할 군대와 모집 코인이 모두 소진되었어요.');
 }
 private shoot(source:SiegeProjectile['source'],sourceId:string,fromDistance:number,toDistance:number,damage:number,targetId:string,duration:number){
  const shot:SiegeProjectile={id:++this.shotSerial,source,fromDistance,toDistance,damage,targetId,duration,age:0};
  this.projectiles.push(shot);this.owners.set(shot.id,{sourceId});
  if(source==='army')this.reservedDamage.set(targetId,(this.reservedDamage.get(targetId)??0)+damage);
  this.events.push({type:'shot',message:'',targetId,damage,friendly:source==='army'});
 }
 private sourceAlive(shot:SiegeProjectile){
  const id=this.owners.get(shot.id)?.sourceId;
  return shot.source==='army'?this.units.some(unit=>unit.id===id&&unit.hp>0):this.targets.some(target=>target.id===id&&target.hp>0);
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
   const target=shot.source==='army'?this.targets.find(target=>target.id===shot.targetId):this.units.find(unit=>unit.id===shot.targetId);
   if(!target||target.hp<=0||!this.sourceAlive(shot)){this.removeShot(shot);continue;}
   if(shot.age+EPSILON<shot.duration)continue;
   this.removeShot(shot);
   const before=target.hp;
   if(shot.source==='army')target.hp=hit(before,shot.damage).hp;
   else target.hp=Math.max(0,before-shot.damage);
   const actual=before-target.hp;
   if(actual===0)continue;
   target.lastHit=this.elapsed;
   this.events.push({type:'hit',message:`${numberText(before,2)} − ${numberText(actual,2)} = ${numberText(target.hp,2)}`,targetId:target.id,damage:actual,friendly:shot.source==='army'});
   if(target.hp===0){
    this.events.push({type:'destroy',message:shot.source==='army'?`${(target as SiegeTarget).name} 파괴!`:'아군이 쓰러졌어요.',targetId:target.id,friendly:shot.source==='army'});
    if(shot.source==='army'&&(target as SiegeTarget).kind==='castle'){
     this.phase='won';this.clearShots();this.events.push({type:'won',message:'마법사의 성을 무너뜨리고 마지막 저주를 없앴어요!'});return;
    }
   }
  }
 }
 private clearShots(){this.projectiles.length=0;this.owners.clear();this.reservedDamage.clear();}
 private lose(message:string){this.phase='lost';this.clearShots();this.events.push({type:'lost',message});}
}
