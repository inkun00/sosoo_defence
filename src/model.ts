import {Level,Effect} from './levels';
import {Cell,COLS,ROWS,TILE,key,route,world,naturalBlocks} from './path';
import {stageMap,StageMap} from './maps';
import {decimal,numberText,hit,recipe,reward,regroupMessage,minimumHits,FusionOperation,purchaseCoins,creditMessage,learningValue} from './math';
import {MonsterKind,MONSTERS,monsterKind} from './monsters';
import {Difficulty,balanceFor,isDifficulty,DIFFICULTIES} from './difficulty';
import {towerType,towerPrice,parseMoney,borrowingPlaces,TowerType,TOWER_RANGE,LONG_TOWER_RANGE,PurchaseVariation} from './towers';
import {drawWallRecipe} from './wall-recipe-store';
import type {WallRecipe} from './wall-recipes';
export interface Tower extends Cell{id:number;typeId:string;unit:number;effect:Effect;enabled:boolean;cooldown:number;cost:number;}
export interface Purchase extends Cell{typeId:string;before:number;wallet:number;cost:number;digits:number;borrowing:number[];}
export interface Enemy{id:number;kind:MonsterKind;hp:number;max:number;x:number;y:number;path:Cell[];next:number;hits:number;slow:number;stun:number;hitFlash:number;age:number;recoil?:{vx:number;vy:number;remaining:number};wallCooldown?:number;}
export interface Brick{id:number;value:number;}
export interface Inventory{bricks:number[];walls:number;wallDurabilities?:number[];}
export const WALL_DURABILITY=3;
export interface Wall extends Cell{id:number;durability:number;offsetX:number;offsetY:number;vx:number;vy:number;}
export interface WallPreview extends Cell{valid:boolean;message:string;}
export interface WallImpact{wallId:number;enemyId:number;kind:MonsterKind;durability:number;dx:number;dy:number;force:number;}
export interface Event{type:'notice'|'hit'|'invalid'|'kill'|'shot'|'money'|'brick'|'wall'|'wall-impact'|'wall-break'|'leak';message:string;x?:number;y?:number;color?:string;data?:unknown;}
export type Phase='ready'|'playing'|'paused'|'won'|'review'|'lost';
export const CASTLE_HEALTH=5,STAGE_DURATION=120,FIRST_SPAWN_DELAY=8,SPAWN_INTERVAL=8.4;
export class Defense{
 level:Level;money:number;castle=CASTLE_HEALTH;phase:Phase='ready';elapsed=0;duration=STAGE_DURATION;spawned=0;kills=0;leaks=0;successfulHits=0;invalidHits=0;fusions=0;purchases=0;switches=0;borrowTenths=0;borrowHundredths=0;usedUnits=new Set<number>();
 towers:Tower[]=[];enemies:Enemy[]=[];bricks:Brick[]=[];walls:Wall[]=[];blocks:Set<string>;readonly map:StageMap;events:Event[]=[];
 private nextId=1;private randomState=17;private droppedRecipe=0;private brickRecipe:WallRecipe|null=null;
 private carriedWalls=0;
 private storedWallHealth:number[]=[];wallPlacements=0;
 bossDefeated=false;bossSpawned=false;
 pendingPurchase:Purchase|null=null;purchaseAnswers=0;
 pendingWall:WallPreview|null=null;
 purchaseVariation:PurchaseVariation={round:0};
 constructor(level:Level,inventory:Inventory={bricks:[],walls:0},public difficulty:Difficulty='standard'){this.level=level;this.map=stageMap(level.id);this.blocks=naturalBlocks(level.id);this.money=level.budget;this.randomState=level.id*131+17;this.carriedWalls=inventory.walls;this.storedWallHealth=Array.from({length:inventory.walls},(_,i)=>{const hp=inventory.wallDurabilities?.[i];return hp===1||hp===2?hp:WALL_DURABILITY;});this.bricks=inventory.bricks.filter(value=>learningValue(value)&&value>0&&value%10===0).map(value=>({id:this.nextId++,value}));}
 path(blocks=this.blocks,start=this.map.start){return route(blocks,start,this.map.end);}
 get balance(){return balanceFor(this.level.id,this.difficulty);}
 get canChangeDifficulty(){return this.phase==='ready'&&!this.towers.length&&!this.walls.length;}
 setDifficulty(difficulty:Difficulty){
  if(!isDifficulty(difficulty)||!this.canChangeDifficulty)return this.notice('방어 시작 전에 타워와 성벽을 회수하면 난이도를 바꿀 수 있어요.');
  this.difficulty=difficulty;this.emit({type:'notice',message:`${DIFFICULTIES[difficulty].name} 난이도 · 타워 ${this.balance.towerLimit}개까지 설치할 수 있어요.`});return true;
 }
 towerAvailable(unit:number){return this.towers.length<this.balance.towerLimit&&(unit!==10||this.towers.filter(t=>t.unit===10).length<this.balance.precisionLimit);}
 get inventory():Inventory{const health=[...this.storedWallHealth,...this.walls.map(w=>w.durability)];return {bricks:this.bricks.map(b=>b.value),walls:health.length,...(health.some(h=>h<WALL_DURABILITY)?{wallDurabilities:health}:{})};}
 emit(e:Event){this.events.push(e);if(this.events.length>80)this.events.shift();}
 notice(message:string){this.emit({type:'notice',message});return false;}
 random(){this.randomState=(Math.imul(this.randomState,1664525)+1013904223)>>>0;return this.randomState/4294967296;}
 start(){if(this.phase==='ready'){if(!this.towers.length)return this.notice('먼저 타워를 선택해 빈 칸에 설치하세요.');if(this.pendingPurchase)return this.notice('열린 설치 문제를 풀거나 취소한 뒤 방어를 시작해요.');this.phase='playing';this.emit({type:'notice',message:'타워 준비 완료! 전투 중에는 자동으로 공격해요. 몬스터의 체력 변화를 살펴보세요.'});return true;}return false;}
 togglePause(){if(this.phase==='playing')this.phase='paused';else if(this.phase==='paused')this.phase='playing';}
 get canBuild(){return this.phase==='ready';}
 // Adjacent towers are legal. Shared heat slows reload, leaving damage exact.
 reloadFactor(c:Cell){const nearby=this.towers.filter(t=>t!==c&&Math.abs(t.x-c.x)<=1&&Math.abs(t.y-c.y)<=1).length;return 1+Math.min(2,nearby*Math.min(.4,(this.level.id-1)*.05));}
 reloadTime(t:Tower){return towerType(t.typeId)!.cooldown*this.reloadFactor(t);}
 candidate(c:Cell,wall=false):Set<string>|null{
  if(!Number.isInteger(c.x)||!Number.isInteger(c.y)||c.x<0||c.y<0||c.x>=COLS||c.y>=ROWS||key(c)===key(this.map.start)||key(c)===key(this.map.end)||this.blocks.has(key(c))||this.towers.some(t=>key(t)===key(c))||this.walls.some(w=>key(w)===key(c)))return null;
  if(this.enemies.some(e=>Math.hypot(e.x-world(c).x,e.y-world(c).y)<TILE*.8))return null;
  if(!wall){
   if(this.path()?.some(p=>key(p)===key(c)))return null;
   const b=new Set(this.blocks);b.add(key(c));return b;
  }
  // Barricades occupy the existing road without entering the routing graph.
  return this.path()?.some(p=>key(p)===key(c))?new Set(this.blocks):null;
 }
 private canPurchase(c:Cell,type:TowerType):boolean{
  if(!this.canBuild)return this.notice('타워는 방어 시작 전에만 설치할 수 있어요. 전투 중에는 자동으로 공격해요.');
  if(type.unlock>this.level.id)return this.notice('아직 해금되지 않은 타워예요.');
  if(this.towers.length>=this.balance.towerLimit)return this.notice(`타워는 ${this.balance.towerLimit}개까지 설치할 수 있어요. 타워를 회수해 위치나 종류를 바꿔 보세요.`);
  if(type.unit===10&&this.towers.filter(t=>t.unit===10).length>=this.balance.precisionLimit)return this.notice(`바늘탑은 ${this.balance.precisionLimit}개까지 설치해요. 다른 타워로 먼저 체력을 줄여요.`);
  if(!this.candidate(c))return this.notice('길 옆의 빈 바닥을 골라 주세요. 타워는 길 위에 설치할 수 없어요.');
  return true;
 }
 requestPurchase(c:Cell,typeId:string):boolean{
  if(this.pendingPurchase)return false;
  const type=towerType(typeId);if(!type||!this.canPurchase(c,type))return false;
  const cost=towerPrice(type,this.money,this.level.id,this.purchaseVariation);if(this.money<cost)return this.notice('돈이 부족해요. 다른 타워를 고르거나 보상을 모아 보세요.');
  const before=purchaseCoins(this.money);
  this.pendingPurchase={...c,typeId,before,wallet:this.money,cost,digits:this.level.id>=4?3:this.level.digits,borrowing:borrowingPlaces(before,cost)};
  this.purchaseVariation={round:this.purchaseVariation.round+1,lastBefore:before,lastCost:cost};return true;
 }
 cancelPurchase(){this.pendingPurchase=null;}
 answerPurchase(text:string):boolean{
  const q=this.pendingPurchase;if(!q)return false;const type=towerType(q.typeId)!;
  if(this.money!==q.wallet||!this.canPurchase(q,type)){this.pendingPurchase=null;return this.notice('돈이나 설치할 칸이 바뀌었어요. 타워를 다시 선택해 주세요.');}
  const answer=parseMoney(text);if(answer===null)return this.notice('소수점을 사용해 남는 코인을 적어 주세요. 최대 소수 세 자리까지 입력해요.');
  if(answer!==q.before-q.cost)return this.notice('아직 맞지 않아요. 소수점을 맞추고 같은 자리끼리 다시 빼 보세요.');
  const blocks=this.candidate(q)!;this.money=q.wallet-q.cost;this.blocks=blocks;this.purchases++;this.purchaseAnswers++;
  this.towers.push({x:q.x,y:q.y,id:this.nextId++,typeId:type.id,unit:type.unit,effect:type.effect,enabled:true,cooldown:0,cost:q.cost});this.pendingPurchase=null;
  this.emit({type:'money',message:`${numberText(q.before,q.digits)} − ${numberText(q.cost,q.digits)} = ${numberText(answer,q.digits)} · ${type.name} 설치`,data:{reason:'purchase',grade:type.grade,borrowing:q.borrowing}});return true;
 }
 placeTower(c:Cell,typeId:string,answer:string):boolean{
  return this.requestPurchase(c,typeId)&&this.answerPurchase(answer);
 }
 toggleTower(id:number){const t=this.towers.find(t=>t.id===id);if(!t||!['ready','playing','paused'].includes(this.phase))return;t.enabled=!t.enabled;this.switches++;this.emit({type:'notice',message:`${decimal(t.unit,this.level.digits)} 타워 · 발사 ${t.enabled?'켜짐':'멈춤'}`});}
 sellTower(id:number){const t=this.towers.find(t=>t.id===id);if(!t||!['ready','playing','paused'].includes(this.phase))return;const before=this.money;const back=t.cost;this.money+=back;this.blocks.delete(key(t));this.towers=this.towers.filter(x=>x.id!==id);this.emit({type:'money',message:creditMessage(before,back,'타워 회수')});}
 fuse(ids:number[],operation:FusionOperation='+'):boolean{
  if(ids.length!==3||new Set(ids).size!==3)return this.notice('서로 다른 벽돌 세 개를 골라 주세요.');
  const b=ids.map(id=>this.bricks.find(b=>b.id===id));if(b.some(b=>!b))return this.notice('벽돌을 다시 골라 주세요.');
  const [a,c,d]=b as Brick[];
  if(!recipe(a.value,c.value,d.value,operation))return this.notice(`왼쪽 두 벽돌의 ${operation==='-'?'차':'합'}이 오른쪽 벽돌과 같아야 해요. 소수점을 맞춰 생각해 보세요.`);
  this.bricks=this.bricks.filter(b=>!ids.includes(b.id));this.fusions++;this.storedWallHealth.push(WALL_DURABILITY);
  this.emit({type:'wall',message:`${numberText(a.value,this.level.digits)} ${operation==='-'?'−':'+'} ${numberText(c.value,this.level.digits)} = ${numberText(d.value,this.level.digits)} · 성벽 +1`,data:{operation}});return true;
 }
 get wallStock(){return this.storedWallHealth.length;}
 previewWall(c:Cell):WallPreview{
  const reason=!['ready','playing','paused'].includes(this.phase)?'방어가 끝났어요. 다음 방어 전에 성벽을 준비해요.':!this.wallStock?'먼저 벽돌을 합성해 성벽을 준비해요.':this.walls.length>=this.balance.wallLimit?`성벽은 ${this.balance.wallLimit}개까지 설치해요. 다른 성벽을 회수해요.`:!this.candidate(c,true)?'몬스터가 없는 길 위의 칸을 골라요. 입구와 불꽃에는 설치할 수 없어요.':'';
  return {...c,valid:!reason,message:reason||`길 위에 설치 · 내구도 ${this.storedWallHealth[0]}/${WALL_DURABILITY} · 충돌할 때마다 1 감소`};
 }
 requestWall(c:Cell){this.pendingWall=this.previewWall(c);return this.pendingWall.valid;}
 cancelWall(){this.pendingWall=null;}
 confirmWall(){
  const shown=this.pendingWall;if(!shown)return false;const current=this.previewWall(shown);
  if(!current.valid){this.pendingWall=current;return this.notice(current.message);}
  if(!this.placeWall({x:shown.x,y:shown.y}))return false;this.pendingWall=null;return true;
 }
 placeWall(c:Cell):boolean{
  if(!['ready','playing','paused'].includes(this.phase))return false;
  if(!this.wallStock)return this.notice('벽돌 세 개를 먼저 합성해 성벽을 얻어요.');
  if(this.walls.length>=this.balance.wallLimit)return this.notice(`성벽은 ${this.balance.wallLimit}개까지 배치해요. 설치한 성벽을 회수해 옮겨 보세요.`);
  if(!this.candidate(c,true))return this.notice('성벽은 몬스터가 없는 길 위에만 놓을 수 있어요.');
  const durability=this.storedWallHealth.shift()!;this.walls.push({...c,id:this.nextId++,durability,offsetX:0,offsetY:0,vx:0,vy:0});this.wallPlacements++;
  this.emit({type:'wall',message:`성벽 설치! 내구도 ${durability}/${WALL_DURABILITY} · 충돌하면 몬스터가 뒤로 튕겨요.`});return true;
 }
 recoverWall(c:Cell):boolean{
  if(!['ready','playing','paused'].includes(this.phase))return false;
  const index=this.walls.findIndex(w=>key(w)===key(c));if(index<0)return false;
  const [wall]=this.walls.splice(index,1);this.storedWallHealth.push(wall.durability);
  this.emit({type:'wall',message:`성벽을 회수했어요. 내구도 ${wall.durability}/${WALL_DURABILITY}를 유지해서 다시 설치해요.`});return true;
 }
 spawn(){
  if(this.spawned>=this.level.hp.length)return;
  const p=this.path()!,xy=world(this.map.start),hp=this.level.hp[this.spawned],kind=monsterKind(this.level.id,this.spawned,hp);
  this.enemies.push({id:this.nextId++,kind,hp,max:hp,...xy,path:p,next:1,hits:0,slow:0,stun:0,hitFlash:0,age:0});this.spawned++;
  if(MONSTERS[kind].boss)this.emit({type:'notice',message:`보스 ${MONSTERS[kind].name} 등장! 체력 ${decimal(hp,this.level.digits)} · 1로 줄이고 작은 포탄으로 마무리해요.`});
 }
 get enemyCount(){return this.level.hp.length+(this.level.boss?1:0);}
 spawnBoss(){
  const boss=this.level.boss;if(!boss||this.bossSpawned)return false;
  const xy=world(this.map.start);this.enemies.push({id:this.nextId++,kind:boss.kind,hp:boss.hp,max:boss.hp,...xy,path:this.path()!,next:1,hits:0,slow:0,stun:0,hitFlash:0,age:0});this.bossSpawned=true;
  this.emit({type:'notice',message:`최종 보스 ${MONSTERS[boss.kind].name} 등장! 체력 ${numberText(boss.hp)} · 몬스터 웨이브도 계속돼요.`});return true;
 }
 get goals(){return [
  {label:'정확히 0으로 만들어 6마리 이상 방어',done:this.kills>=6},
  ...(this.level.goal==='wall'||this.level.goal==='both'?[{label:`성벽 ${this.level.requiredFusions??1}개 준비하고 1개 설치`,done:this.carriedWalls+this.fusions>=(this.level.requiredFusions??1)&&this.wallPlacements>=1}]:[]),
  ...(this.level.goal==='money'?[{label:'소수 뺄셈 정답으로 타워 2개 이상 구매',done:this.purchaseAnswers>=2}]:[]),
  ...(this.level.id===8?[{label:'1을 0.1 열 개로 바꾸어 빼는 공격 경험',done:this.borrowTenths>=1}]:[]),
  ...(this.level.id===9?[{label:'0.1을 0.01 열 개로 바꾸어 빼는 공격 경험',done:this.borrowHundredths>=1}]:[]),
  ...(this.level.goal==='switch'||this.level.goal==='both'?[{label:'서로 다른 공격 단위 2종 사용',done:this.usedUnits.size>=2}]:[]),
  ...(this.level.id===10?[{label:'균열의 돌왕을 정확히 0으로 처치',done:this.bossDefeated}]:[]),
  ...(this.level.boss?[{label:`최종 보스 저주 마법사 ${numberText(this.level.boss.hp)} → 0`,done:this.bossDefeated}]:[])
 ];}
 damage(e:Enemy,t:Tower){
  const before=e.hp,r=hit(before,t.unit);
  if(!r.valid){this.invalidHits++;this.emit({type:'invalid',message:'공격력이 남은 체력보다 커요',x:e.x,y:e.y});return;}
  if(Math.floor(before/100)%10<Math.floor(t.unit/100)%10)this.borrowTenths++;
  if(Math.floor(before/10)%10<Math.floor(t.unit/10)%10)this.borrowHundredths++;
  e.hp=r.hp;e.hits++;this.successfulHits++;this.usedUnits.add(t.unit);e.hitFlash=.5;
  if(t.effect==='slow')e.slow=3;
  if(t.effect==='stun'&&this.random()<.25)e.stun=1.5;
  const text=(hp:number)=>e.kind==='wizard'?numberText(hp):decimal(hp,this.level.digits);
  const eq=`${text(before)} − ${text(t.unit)} = ${text(e.hp)}`;
  this.emit({type:'hit',message:eq,x:e.x,y:e.y,data:{kind:e.kind,before,damage:t.unit,after:e.hp,hint:regroupMessage(before,t.unit,this.level.digits)}});
  if(!r.killed)return;
  if(this.level.id===10&&e.kind==='warden'){this.bossDefeated=true;this.emit({type:'notice',message:'균열의 돌왕의 힘이 정확히 0이 되었어요! 이제 저주 마법사에게 맞서요.'});}
  if(this.level.boss?.kind===e.kind){this.bossDefeated=true;this.emit({type:'notice',message:'저주 마법사의 힘이 정확히 0이 되었어요! 남은 몬스터를 막아 세상을 구해요.'});}
  this.kills++;const earn=reward(e.max,e.hits,this.level.units,this.level.id);
  // Each three-drop group has a new, correct addition/subtraction recipe.
  const brickDrop=this.level.id>=2&&(this.kills<=3||this.kills>=7&&this.kills<=9);
  if(brickDrop){const slot=this.droppedRecipe%3;if(slot===0)this.brickRecipe=drawWallRecipe(this.level.id,Math.floor(this.droppedRecipe/3));const value=this.brickRecipe![slot];this.droppedRecipe++;this.bricks.push({id:this.nextId++,value});this.emit({type:'brick',message:`${MONSTERS[e.kind].name}이 ${decimal(value,this.level.digits)} 벽돌을 남겼어요!`,x:e.x,y:e.y});}
  else {const beforeMoney=this.money;this.money+=earn;this.emit({type:'money',message:creditMessage(beforeMoney,earn,`${e.hits}번 타격 보상`,this.level.id>=4?3:1),x:e.x,y:e.y});}
  this.emit({type:'kill',message:`정확히 0! ${e.hits}번 타격`,x:e.x,y:e.y,data:{hits:e.hits,best:minimumHits(e.max,this.level.units),brick:brickDrop}});
 }
 private collideWall(e:Enemy,w:Wall,dx:number,dy:number,speed:number){
  // Normal impulse with restitution. Heavier stone creatures recoil less;
  // wall displacement is a damped spring, independent of decimal combat HP.
  const mass={slime:1,beetle:1.3,golem:2,crystal:2.6,king:3.2,warden:3.6,wizard:4}[e.kind];
  const wallMass=12,restitution=.65,relativeSpeed=Math.max(0,speed-w.vx*dx-w.vy*dy);
  const impulse=(1+restitution)*relativeSpeed/(1/mass+1/wallMass);
  const reflectedSpeed=Math.min(-speed*.1,speed-impulse/mass);
  e.recoil={vx:dx*reflectedSpeed,vy:dy*reflectedSpeed,remaining:.6};e.wallCooldown=.75;
  const force=impulse/wallMass;
  w.vx+=dx*force;w.vy+=dy*force;w.durability--;
  const xy=world(w),data:WallImpact={wallId:w.id,enemyId:e.id,kind:e.kind,durability:w.durability,dx,dy,force};
  this.emit({type:'wall-impact',message:`성벽 충돌 · 내구도 ${w.durability}/${WALL_DURABILITY}`,x:xy.x,y:xy.y,data});
  if(w.durability===0){this.walls=this.walls.filter(wall=>wall.id!==w.id);this.emit({type:'wall-break',message:'세 번째 충돌! 성벽이 부서졌어요.',x:xy.x,y:xy.y,data});}
 }
 private moveWalls(dt:number){
  // Small substeps keep the spring stable on slow tablets and 10 fps frames.
  const count=Math.max(1,Math.ceil(dt*120)),h=dt/count;
  for(const w of this.walls)for(let i=0;i<count;i++){
   w.vx+=(-60*w.offsetX-10*w.vx)*h;w.vy+=(-60*w.offsetY-10*w.vy)*h;
   w.offsetX+=w.vx*h;w.offsetY+=w.vy*h;
  }
 }
 step(dt:number){
  if(this.phase!=='playing')return;dt=Math.max(0,Math.min(dt,.1));this.elapsed=Math.min(this.duration,this.elapsed+dt);
  this.moveWalls(dt);
  if(this.spawned<this.level.hp.length&&this.elapsed+1e-9>=FIRST_SPAWN_DELAY+this.spawned*SPAWN_INTERVAL)this.spawn();
  if(this.level.boss&&!this.bossSpawned&&this.elapsed+1e-9>=this.level.boss.spawnAt)this.spawnBoss();
  for(const e of this.enemies){
   if(e.hp===0)continue;e.age+=dt;e.hitFlash=Math.max(0,e.hitFlash-dt);e.slow=Math.max(0,e.slow-dt);e.stun=Math.max(0,e.stun-dt);
   e.wallCooldown=Math.max(0,(e.wallCooldown??0)-dt);
   if(e.recoil&&e.recoil.remaining>0){const h=Math.min(dt,e.recoil.remaining),friction=1.2,decay=Math.exp(-friction*h);e.x+=e.recoil.vx*(1-decay)/friction;e.y+=e.recoil.vy*(1-decay)/friction;e.recoil.vx*=decay;e.recoil.vy*=decay;e.recoil.remaining=Math.max(0,e.recoil.remaining-dt);continue;}
   if(e.stun)continue;
   const next=e.path[e.next],approachingWall=next&&this.walls.some(w=>key(w)===key(next)),target=next?world(next):null;
   // Creatures accelerate into a short ram; the collision reflects that
   // actual approach velocity rather than creating extra bounce energy.
   const charge=approachingWall&&target?1+.8*Math.max(0,Math.min(1,(TILE-Math.hypot(target.x-e.x,target.y-e.y))/(TILE*.6))):1;
   const speed=this.balance.speed*MONSTERS[e.kind].speed*(e.slow?.6:1)*charge;
   let travel=speed*dt;
   while(travel>0&&e.next<e.path.length){const target=world(e.path[e.next]),dx=target.x-e.x,dy=target.y-e.y,d=Math.hypot(dx,dy);
    const wall=this.walls.find(w=>key(w)===key(e.path[e.next])),contact=TILE*.4;
    if(wall&&d-travel<=contact){const distance=Math.max(0,d-contact),nx=d?dx/d:1,ny=d?dy/d:0;e.x+=nx*distance;e.y+=ny*distance;travel=0;if(!e.wallCooldown)this.collideWall(e,wall,nx,ny,speed);break;}
    if(d<=travel){e.x=target.x;e.y=target.y;e.next++;travel-=d;}else{e.x+=dx/d*travel;e.y+=dy/d*travel;travel=0;}
   }
   if(e.next>=e.path.length){e.hp=0;this.castle=Math.max(0,this.castle-1);this.leaks++;this.emit({type:'leak',message:`몬스터가 성에 도착했어요. 성 체력 ${this.castle}/${CASTLE_HEALTH} · 다음 몬스터는 정확히 0으로!`,x:e.x,y:e.y});if(this.castle===0)break;}
  }
  this.enemies=this.enemies.filter(e=>e.hp>0);
  if(this.castle===0){this.phase='lost';this.emit({type:'notice',message:'성 체력 5개가 모두 소진됐어요. 배치를 바꾸어 같은 웨이브에 다시 도전해요.'});return;}
  for(const t of this.towers){
   t.cooldown=Math.max(0,t.cooldown-dt);if(!t.enabled||t.cooldown)continue;const xy=world(t),e=this.targetFor(t);
   if(!e)continue;t.cooldown=this.reloadTime(t);
   this.emit({type:'shot',message:'',x:xy.x,y:xy.y,data:{towerId:t.id,typeId:t.typeId,targetId:e.id,toX:e.x,toY:e.y,kind:e.kind,effect:t.effect,unit:t.unit,before:e.hp,after:e.hp>=t.unit?e.hp-t.unit:e.hp,valid:e.hp>=t.unit,killed:e.hp===t.unit}});this.damage(e,t);
  }
  this.enemies=this.enemies.filter(e=>e.hp>0);
  // The timer ends the wave schedule, not the castle's remaining lives.
  // Finish every monster before reviewing the separate learning objectives.
  if(this.elapsed>=this.duration&&this.spawned===this.level.hp.length&&(!this.level.boss||this.bossSpawned)&&this.enemies.length===0){this.phase=this.goals.every(g=>g.done)?'won':'review';this.emit({type:'notice',message:this.phase==='won'?'방어와 학습 목표를 모두 달성했어요!':'성은 지켰어요! 다음 단계에 가려면 남은 학습 목표를 연습해요.'});}
 }
 get stars(){if(this.phase!=='won')return 0;const best=this.level.hp.reduce((s,h)=>s+minimumHits(h,this.level.units),this.level.boss?minimumHits(this.level.boss.hp,this.level.units):0);return this.leaks===0&&this.successfulHits<=best*1.3?3:this.leaks<=1?2:1;}
 targetFor(t:Tower):Enemy|undefined{
  const xy=world(t),radius=t.effect==='range'?LONG_TOWER_RANGE:TOWER_RANGE;
  return this.enemies.filter(e=>e.hp>0&&Math.hypot(xy.x-e.x,xy.y-e.y)<=radius).sort((a,b)=>Number(b.hp>=t.unit)-Number(a.hp>=t.unit)||b.next-a.next||a.id-b.id)[0];
 }
}
