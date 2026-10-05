import {Level,Effect} from './levels';
import {Cell,COLS,ROWS,START,END,TILE,OX,OY,key,route,world,naturalBlocks} from './path';
import {decimal,numberText,hit,recipe,reward,regroupMessage,minimumHits,FusionOperation} from './math';
import {MonsterKind,MONSTERS,monsterKind} from './monsters';
import {Difficulty,balanceFor,isDifficulty,DIFFICULTIES} from './difficulty';
import {towerType,towerPrice,parseMoney,borrowingPlaces,TowerType,TOWER_RANGE,LONG_TOWER_RANGE} from './towers';
export interface Tower extends Cell{id:number;typeId:string;unit:number;effect:Effect;enabled:boolean;cooldown:number;cost:number;}
export interface Purchase extends Cell{typeId:string;before:number;cost:number;digits:number;borrowing:number[];}
export interface Enemy{id:number;kind:MonsterKind;hp:number;max:number;x:number;y:number;path:Cell[];next:number;hits:number;slow:number;stun:number;hitFlash:number;age:number;}
export interface Brick{id:number;value:number;}
export interface Inventory{bricks:number[];walls:number;}
export interface Event{type:'notice'|'hit'|'invalid'|'kill'|'shot'|'money'|'brick'|'wall'|'leak';message:string;x?:number;y?:number;color?:string;data?:unknown;}
export type Phase='ready'|'playing'|'paused'|'won'|'lost';
export const STAGE_DURATION=120,FIRST_SPAWN_DELAY=8,SPAWN_INTERVAL=8.4;
export class Defense{
 level:Level;money:number;castle=5;phase:Phase='ready';elapsed=0;duration=STAGE_DURATION;spawned=0;kills=0;leaks=0;successfulHits=0;invalidHits=0;fusions=0;purchases=0;switches=0;borrowTenths=0;borrowHundredths=0;usedUnits=new Set<number>();
 towers:Tower[]=[];enemies:Enemy[]=[];bricks:Brick[]=[];walls:Cell[]=[];blocks=naturalBlocks();events:Event[]=[];
 private nextId=1;private randomState=17;private droppedRecipe=0;
 private carriedWalls=0;
 pendingPurchase:Purchase|null=null;purchaseAnswers=0;
 constructor(level:Level,inventory:Inventory={bricks:[],walls:0},public difficulty:Difficulty='standard'){this.level=level;this.money=level.budget;this.randomState=level.id*131+17;this.carriedWalls=inventory.walls;this.bricks=inventory.bricks.map(value=>({id:this.nextId++,value}));}
 get balance(){return balanceFor(this.level.id,this.difficulty);}
 get canChangeDifficulty(){return this.phase==='ready'&&!this.towers.length&&!this.walls.length;}
 setDifficulty(difficulty:Difficulty){
  if(!isDifficulty(difficulty)||!this.canChangeDifficulty)return this.notice('방어 시작 전에 타워와 성벽을 회수하면 난이도를 바꿀 수 있어요.');
  this.difficulty=difficulty;this.emit({type:'notice',message:`${DIFFICULTIES[difficulty].name} 난이도 · 타워 ${this.balance.towerLimit}개까지 설치할 수 있어요.`});return true;
 }
 towerAvailable(unit:number){return this.towers.length<this.balance.towerLimit&&(unit!==10||this.towers.filter(t=>t.unit===10).length<this.balance.precisionLimit);}
 get inventory():Inventory{return {bricks:this.bricks.map(b=>b.value),walls:this.carriedWalls+this.fusions};}
 emit(e:Event){this.events.push(e);if(this.events.length>80)this.events.shift();}
 notice(message:string){this.emit({type:'notice',message});return false;}
 random(){this.randomState=(Math.imul(this.randomState,1664525)+1013904223)>>>0;return this.randomState/4294967296;}
 start(){if(this.phase==='ready'){if(!this.towers.length)return this.notice('먼저 타워를 선택해 빈 칸에 설치하세요.');this.phase='playing';this.emit({type:'notice',message:'돌 몬스터가 다가와요! 체력을 보고 타워의 발사를 조절해요.'});return true;}return false;}
 togglePause(){if(this.phase==='playing')this.phase='paused';else if(this.phase==='paused')this.phase='playing';}
 towerTooClose(c:Cell){return this.towers.some(t=>Math.abs(t.x-c.x)<=1&&Math.abs(t.y-c.y)<=1);}
 candidate(c:Cell,wall=false):Set<string>|null{
  if(c.x<0||c.y<0||c.x>=COLS||c.y>=ROWS||key(c)===key(START)||key(c)===key(END)||this.blocks.has(key(c))||this.towers.some(t=>key(t)===key(c)))return null;
  if(this.enemies.some(e=>Math.hypot(e.x-world(c).x,e.y-world(c).y)<TILE*.8))return null;
  if(!wall){
   if(this.towerTooClose(c))return null;
   if(route(this.blocks)?.some(p=>key(p)===key(c)))return null;
   const b=new Set(this.blocks);b.add(key(c));return b;
  }
  const b=new Set(this.blocks);b.add(key(c));if(!route(b))return null;
  for(const e of this.enemies){const here={x:Math.floor((e.x-OX)/TILE),y:Math.floor((e.y-OY)/TILE)};if(!route(b,here)||!route(b,e.path[Math.min(e.next,e.path.length-1)]))return null;}
  return b;
 }
 private canPurchase(c:Cell,type:TowerType):boolean{
  if(!['ready','playing','paused'].includes(this.phase))return false;
  if(type.unlock>this.level.id)return this.notice('아직 해금되지 않은 타워예요.');
  if(this.towers.length>=this.balance.towerLimit)return this.notice(`타워는 ${this.balance.towerLimit}개까지 설치할 수 있어요. 타워를 회수해 위치나 종류를 바꿔 보세요.`);
  if(type.unit===10&&this.towers.filter(t=>t.unit===10).length>=this.balance.precisionLimit)return this.notice(`바늘탑은 ${this.balance.precisionLimit}개까지 설치해요. 다른 타워로 먼저 체력을 줄여요.`);
  if(this.towerTooClose(c))return this.notice('타워 사이를 한 칸 이상 띄워 주세요. 대각선도 바로 붙여 설치할 수 없어요.');
  if(!this.candidate(c))return this.notice('길 옆의 빈 바닥을 골라 주세요. 타워는 길 위에 설치할 수 없어요.');
  return true;
 }
 requestPurchase(c:Cell,typeId:string):boolean{
  const type=towerType(typeId);if(!type||!this.canPurchase(c,type))return false;
  const cost=towerPrice(type,this.money,this.level.id);if(this.money<cost)return this.notice('돈이 부족해요. 다른 타워를 고르거나 보상을 모아 보세요.');
  this.pendingPurchase={...c,typeId,before:this.money,cost,digits:this.level.id>=4?3:this.level.digits,borrowing:borrowingPlaces(this.money,cost)};return true;
 }
 cancelPurchase(){this.pendingPurchase=null;}
 answerPurchase(text:string):boolean{
  const q=this.pendingPurchase;if(!q)return false;const type=towerType(q.typeId)!;
  if(this.money!==q.before||!this.canPurchase(q,type)){this.pendingPurchase=null;return this.notice('돈이나 설치할 칸이 바뀌었어요. 타워를 다시 선택해 주세요.');}
  const answer=parseMoney(text);if(answer===null)return this.notice('소수점을 사용해 남는 코인을 적어 주세요. 최대 소수 세 자리까지 입력해요.');
  if(answer!==q.before-q.cost)return this.notice('아직 맞지 않아요. 소수점을 맞추고 같은 자리끼리 다시 빼 보세요.');
  const blocks=this.candidate(q)!;this.money=answer;this.blocks=blocks;this.purchases++;this.purchaseAnswers++;
  this.towers.push({x:q.x,y:q.y,id:this.nextId++,typeId:type.id,unit:type.unit,effect:type.effect,enabled:true,cooldown:0,cost:q.cost});this.pendingPurchase=null;
  this.emit({type:'money',message:`${numberText(q.before,q.digits)} − ${numberText(q.cost,q.digits)} = ${numberText(answer,q.digits)} · ${type.name} 설치`,data:{reason:'purchase',grade:type.grade,borrowing:q.borrowing}});return true;
 }
 placeTower(c:Cell,typeId:string,answer:string):boolean{
  return this.requestPurchase(c,typeId)&&this.answerPurchase(answer);
 }
 toggleTower(id:number){const t=this.towers.find(t=>t.id===id);if(!t||this.phase==='won'||this.phase==='lost')return;t.enabled=!t.enabled;this.switches++;this.emit({type:'notice',message:`${decimal(t.unit,this.level.digits)} 타워 · 발사 ${t.enabled?'켜짐':'멈춤'}`});}
 sellTower(id:number){const t=this.towers.find(t=>t.id===id);if(!t||!['ready','playing','paused'].includes(this.phase))return;const before=this.money;const back=t.cost;this.money+=back;this.blocks.delete(key(t));this.towers=this.towers.filter(x=>x.id!==id);this.emit({type:'money',message:`${numberText(before)} + ${numberText(back)} = ${numberText(this.money)} · 타워 회수`});}
 fuse(ids:number[],operation:FusionOperation='+'):boolean{
  if(ids.length!==3||new Set(ids).size!==3)return this.notice('서로 다른 벽돌 세 개를 골라 주세요.');
  const b=ids.map(id=>this.bricks.find(b=>b.id===id));if(b.some(b=>!b))return this.notice('벽돌을 다시 골라 주세요.');
  const [a,c,d]=b as Brick[];
  if(!recipe(a.value,c.value,d.value,operation))return this.notice(`왼쪽 두 벽돌의 ${operation==='-'?'차':'합'}이 오른쪽 벽돌과 같아야 해요. 소수점을 맞춰 생각해 보세요.`);
  this.bricks=this.bricks.filter(b=>!ids.includes(b.id));this.fusions++;
  this.emit({type:'wall',message:`${numberText(a.value,this.level.digits)} ${operation==='-'?'−':'+'} ${numberText(c.value,this.level.digits)} = ${numberText(d.value,this.level.digits)} · 성벽 +1`,data:{operation}});return true;
 }
 get wallStock(){return this.carriedWalls+this.fusions-this.walls.length;}
 placeWall(c:Cell):boolean{
  if(this.phase==='won'||this.phase==='lost')return false;
  if(!this.wallStock)return this.notice('벽돌 세 개를 먼저 합성해 성벽을 얻어요.');
  if(this.walls.length>=this.balance.wallLimit)return this.notice(`성벽은 ${this.balance.wallLimit}개까지 배치해요. 설치한 성벽을 회수해 옮겨 보세요.`);
  const blocks=this.candidate(c,true);if(!blocks)return this.notice('여기는 성벽을 놓을 수 없어요. 모든 몬스터가 성까지 갈 길을 남겨 주세요.');
  this.blocks=blocks;this.walls.push(c);
  for(const e of this.enemies){const anchor=e.path[Math.min(e.next,e.path.length-1)];const p=route(blocks,anchor)!;e.path=p;e.next=0;}
  this.emit({type:'wall',message:'성벽 설치! 몬스터가 새 길을 찾아 돌아가요.'});return true;
 }
 recoverWall(c:Cell):boolean{
  if(!['ready','playing','paused'].includes(this.phase))return false;
  const index=this.walls.findIndex(w=>key(w)===key(c));if(index<0)return false;
  this.walls.splice(index,1);this.blocks.delete(key(c));
  for(const e of this.enemies){const anchor=e.path[Math.min(e.next,e.path.length-1)];e.path=route(this.blocks,anchor)!;e.next=0;}
  this.emit({type:'wall',message:'성벽을 회수했어요. 재고로 돌아온 성벽을 다른 칸에 다시 놓을 수 있어요.'});return true;
 }
 spawn(){
  if(this.spawned>=this.level.hp.length)return;
  const p=route(this.blocks)!,xy=world(START),hp=this.level.hp[this.spawned],kind=monsterKind(this.level.id,this.spawned,hp);
  this.enemies.push({id:this.nextId++,kind,hp,max:hp,...xy,path:p,next:1,hits:0,slow:0,stun:0,hitFlash:0,age:0});this.spawned++;
  if(MONSTERS[kind].boss)this.emit({type:'notice',message:`보스 ${MONSTERS[kind].name} 등장! 체력 ${decimal(hp,this.level.digits)} · 1로 줄이고 작은 포탄으로 마무리해요.`});
 }
 get goals(){return [
  {label:'정확히 0으로 만들어 6마리 이상 방어',done:this.kills>=6},
  ...(this.level.goal==='wall'||this.level.goal==='both'?[{label:`성벽 ${this.level.requiredFusions??1}개 준비하고 1개 설치`,done:this.carriedWalls+this.fusions>=(this.level.requiredFusions??1)&&this.walls.length>=1}]:[]),
  ...(this.level.goal==='money'?[{label:'소수 뺄셈 정답으로 타워 2개 이상 구매',done:this.purchaseAnswers>=2}]:[]),
  ...(this.level.id===8?[{label:'1을 0.1 열 개로 바꾸어 빼는 공격 경험',done:this.borrowTenths>=1}]:[]),
  ...(this.level.id===9?[{label:'0.1을 0.01 열 개로 바꾸어 빼는 공격 경험',done:this.borrowHundredths>=1}]:[]),
  ...(this.level.goal==='switch'||this.level.goal==='both'?[{label:'서로 다른 공격 단위 2종 사용',done:this.usedUnits.size>=2}]:[])
 ];}
 damage(e:Enemy,t:Tower){
  const before=e.hp,r=hit(before,t.unit);
  if(!r.valid){this.invalidHits++;this.emit({type:'invalid',message:'공격력이 남은 체력보다 커요',x:e.x,y:e.y});return;}
  if(Math.floor(before/100)%10<Math.floor(t.unit/100)%10)this.borrowTenths++;
  if(Math.floor(before/10)%10<Math.floor(t.unit/10)%10)this.borrowHundredths++;
  e.hp=r.hp;e.hits++;this.successfulHits++;this.usedUnits.add(t.unit);e.hitFlash=.5;
  if(t.effect==='slow')e.slow=3;
  if(t.effect==='stun'&&this.random()<.25)e.stun=1.5;
  const eq=`${decimal(before,this.level.digits)} − ${decimal(t.unit,this.level.digits)} = ${decimal(e.hp,this.level.digits)}`;
  this.emit({type:'hit',message:eq,x:e.x,y:e.y,data:{before,damage:t.unit,after:e.hp,hint:regroupMessage(before,t.unit,this.level.digits)}});
  if(!r.killed)return;
  this.kills++;const earn=reward(e.max,e.hits,this.level.units,this.level.id);
  // One recipe per three drops: one guaranteed initial set, then additional sets.
  const brickDrop=this.level.id>=2&&(this.kills<=3||this.kills>=7&&this.kills<=9);
  if(brickDrop){const values=this.droppedRecipe>=3?(this.level.extraBricks??this.level.bricks):this.level.bricks;const value=values[this.droppedRecipe%3];this.droppedRecipe++;this.bricks.push({id:this.nextId++,value});this.emit({type:'brick',message:`${MONSTERS[e.kind].name}이 ${decimal(value,this.level.digits)} 벽돌을 남겼어요!`,x:e.x,y:e.y});}
  else {const beforeMoney=this.money;this.money+=earn;this.emit({type:'money',message:`${numberText(beforeMoney,this.level.id>=4?3:1)} + ${numberText(earn,this.level.id>=4?3:1)} = ${numberText(this.money,this.level.id>=4?3:1)} · ${e.hits}번 타격 보상`,x:e.x,y:e.y});}
  this.emit({type:'kill',message:`정확히 0! ${e.hits}번 타격`,x:e.x,y:e.y,data:{hits:e.hits,best:minimumHits(e.max,this.level.units),brick:brickDrop}});
 }
 step(dt:number){
  if(this.phase!=='playing')return;dt=Math.max(0,Math.min(dt,.1));this.elapsed=Math.min(this.duration,this.elapsed+dt);
  if(this.spawned<this.level.hp.length&&this.elapsed+1e-9>=FIRST_SPAWN_DELAY+this.spawned*SPAWN_INTERVAL)this.spawn();
  for(const e of this.enemies){
   if(e.hp===0)continue;e.age+=dt;e.hitFlash=Math.max(0,e.hitFlash-dt);e.slow=Math.max(0,e.slow-dt);e.stun=Math.max(0,e.stun-dt);
   if(e.stun)continue;
   let travel=this.balance.speed*MONSTERS[e.kind].speed*(e.slow?.6:1)*dt;
   while(travel>0&&e.next<e.path.length){const target=world(e.path[e.next]),dx=target.x-e.x,dy=target.y-e.y,d=Math.hypot(dx,dy);
    if(d<=travel){e.x=target.x;e.y=target.y;e.next++;travel-=d;}else{e.x+=dx/d*travel;e.y+=dy/d*travel;travel=0;}
   }
   if(e.next>=e.path.length){e.hp=0;this.castle--;this.leaks++;this.emit({type:'leak',message:'몬스터가 성에 도착했어요. 다음 몬스터는 정확히 0으로!',x:e.x,y:e.y});}
  }
  this.enemies=this.enemies.filter(e=>e.hp>0);
  for(const t of this.towers){
   t.cooldown=Math.max(0,t.cooldown-dt);if(!t.enabled||t.cooldown)continue;const xy=world(t),e=this.targetFor(t);
   if(!e)continue;t.cooldown=towerType(t.typeId)!.cooldown;
   this.emit({type:'shot',message:'',x:xy.x,y:xy.y,data:{towerId:t.id,targetId:e.id,toX:e.x,toY:e.y,kind:e.kind,effect:t.effect,unit:t.unit,before:e.hp,after:e.hp>=t.unit?e.hp-t.unit:e.hp,valid:e.hp>=t.unit,killed:e.hp===t.unit}});this.damage(e,t);
  }
  this.enemies=this.enemies.filter(e=>e.hp>0);
  if(this.castle<=0){this.phase='lost';this.emit({type:'notice',message:'성이 무너졌어요. 배치를 바꾸어 같은 웨이브에 다시 도전해요.'});}
  else if(this.elapsed>=this.duration){this.phase=this.spawned===this.level.hp.length&&this.enemies.length===0&&this.goals.every(g=>g.done)?'won':'lost';this.emit({type:'notice',message:this.phase==='won'?'방어와 학습 목표를 모두 달성했어요!':'방어 시간 종료. 남은 몬스터와 학습 목표를 확인하고 다시 도전해요.'});}
 }
 get stars(){if(this.phase!=='won')return 0;const best=this.level.hp.reduce((s,h)=>s+minimumHits(h,this.level.units),0);return this.leaks===0&&this.successfulHits<=best*1.3?3:this.leaks<=1?2:1;}
 targetFor(t:Tower):Enemy|undefined{
  const xy=world(t),radius=t.effect==='range'?LONG_TOWER_RANGE:TOWER_RANGE;
  return this.enemies.filter(e=>e.hp>0&&Math.hypot(xy.x-e.x,xy.y-e.y)<=radius).sort((a,b)=>Number(b.hp>=t.unit)-Number(a.hp>=t.unit)||b.next-a.next||a.id-b.id)[0];
 }
}
