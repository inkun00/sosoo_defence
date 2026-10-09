import {advanceDuel,applyDuel,createDuel,duelLevel,joinDuel,validDuelCell,DuelAction,DuelState,RewardLoadout,Side,DUEL_COLUMNS,DUEL_ROWS} from './duel';
import {duelMap,duelPathDistance,duelPathPosition} from './duel-maps';
import {ComputerMood,ComputerPortrait,ComputerOpponent,computerOpponent} from './computer-opponents';
import {heroesAtLevel} from './heroes';
import {TOWERS,towerPrice} from '../towers';
import {numberText,recipe} from '../math';
import type {PeerIdentity,Reply} from './peer';

export interface ComputerOptions{seed?:number;clock?:()=>number;autoTick?:boolean;mapId?:string;}
/** The same approach-to-flame policy is mirrored for either player's land. */
export function strategicDuelCells(s:DuelState,side:Side,unit:number,radius=3):{x:number;y:number}[]{
 const map=duelMap(s.mapId),half=map.length/2,preferred=unit>=1000?.2:unit<=50?.84:.52;
 const samples=Array.from({length:Math.ceil(half/.5)+1},(_,i)=>duelPathPosition(s.mapId,half+Math.min(half,i*.5)));
 const towers=s.players[side]?.towers??[],cells:{x:number;y:number;score:number;order:number}[]=[];
 // Score on the right half and mirror coordinates, avoiding floating point tie
 // differences and giving an identical legal placement policy to either side.
 for(const y of [2,4,1,5,0,6,3].filter(y=>y<DUEL_ROWS))for(let rightX=Math.floor(DUEL_COLUMNS/2)+1;rightX<=DUEL_COLUMNS-2;rightX++){
  const x=side===1?rightX:DUEL_COLUMNS-1-rightX;if(!validDuelCell(s,side,x,y))continue;
  const pathDistance=duelPathDistance(s.mapId,rightX,y),point=duelPathPosition(s.mapId,pathDistance),distance=Math.hypot(rightX-point.x,y-point.y);
  if(distance>radius-.2)continue;
  const progress=Math.max(0,Math.min(1,(pathDistance-half)/half)),coverage=samples.filter(p=>Math.hypot(rightX-p.x,y-p.y)<=radius).length;
  const crowding=towers.reduce((total,t)=>total+Math.max(0,2-Math.hypot(x-t.x,y-t.y)),0);
  cells.push({x,y,score:Math.abs(progress-preferred)*4+Math.max(0,distance-1)*.2-coverage/samples.length*.8+crowding*.1,order:cells.length});
 }
 return cells.sort((a,b)=>a.score-b.score||a.order-b.order).map(({x,y})=>({x,y}));
}
export function additionSlots(board:readonly number[]):number[]|null{
 for(let a=0;a<board.length;a++)for(let b=a+1;b<board.length;b++)for(let c=0;c<board.length;c++){
  if(c!==a&&c!==b&&recipe(board[a],board[b],board[c],'+'))return [a,b,c];
 }return null;
}
/** A local authoritative duel. All computer actions pass through the ordinary game rules. */
export class ComputerPeer{
 readonly side=0 as const;readonly id:string;readonly connected=true;readonly definition:ComputerOpponent;readonly state:DuelState;
 onState:(state:DuelState,connected:boolean)=>void=()=>{};onStatus:(message:string)=>void=()=>{};
 private timer:ReturnType<typeof setInterval>|undefined;private disposed=false;private clock:()=>number;private nonce=0;
 private strategyStarted=false;
 private nextBuild=0;private nextFusion=0;private nextHatch=0;private answeringAt=0;private seenFlame=9000;
 private portrait:ComputerPortrait;private moodUntil=0;
 constructor(readonly identity:PeerIdentity,level:number,options:ComputerOptions={}){
  this.definition=computerOpponent(level);const now=options.clock?.()??Date.now(),monotonic=performance.now();
  this.clock=options.clock??(()=>now+performance.now()-monotonic);
  const seed=options.seed??Math.floor(Math.random()*0xffffffff);this.id=`computer-${now}-${seed}`;
  const loadout:RewardLoadout={rewardHeroes:identity.rewardHeroes,rewardHero:identity.rewardHero};
  this.state=createDuel(identity.uid,identity.name,seed,now,this.definition.level,loadout,options.mapId);
  this.state.buildAfterStart=true;
  joinDuel(this.state,'computer-'+this.definition.id,this.definition.name,now,this.definition.level);
  this.portrait={level:this.definition.level,id:this.definition.id,name:this.definition.name,mood:'idle',phrase:'준비되면 불꽃을 지켜 볼까요?',moodSince:now};
  this.act({type:'ready'},now);
  if(options.autoTick!==false)this.timer=setInterval(()=>this.step(),100);
 }
 get opponent():ComputerPortrait{return {...this.portrait};}
 private mood(mood:ComputerMood,phrase:string,now:number,duration=1900){
  if(this.portrait.mood==='hurt'&&now<this.moodUntil&&!['hurt','victory','defeat'].includes(mood))return;
  if(this.portrait.mood===mood&&this.portrait.phrase===phrase)return;
  this.portrait={...this.portrait,mood,phrase,moodSince:now};this.moodUntil=now+duration;
 }
 private act(action:DuelAction,now:number):Reply{
  const r=applyDuel(this.state,1,action,now,'cpu-'+(++this.nonce));this.state.revision++;return r;
 }
 private build(now:number){
  const s=this.state,p=s.players[1]!,wave=duelLevel(s),max=Math.min(this.definition.maxTowers,2+wave+Math.floor(this.definition.level/3));let upgrading='';
  // Experienced opponents replace duplicate starting cannons instead of filling
  // every slot permanently. Selling and purchasing still use the same wallet.
  if(p.towers.length>=max){
   if(this.definition.level<6||wave<3)return;
   const old=p.towers.filter(t=>['basic','double'].includes(t.typeId)&&p.towers.filter(o=>o.typeId===t.typeId).length>(t.typeId==='basic'?2:1)).sort((a,b)=>s.mapId?duelPathDistance(s.mapId,b.x,b.y)-duelPathDistance(s.mapId,a.x,a.y):b.x-a.x)[0];
   const upgrade=old&&TOWERS.find(t=>t.grade>=2&&t.unlock<=wave&&!p.towers.some(o=>o.typeId===t.id)&&towerPrice(t,p.money+old.cost,wave,p.purchaseVariation)<=p.money+old.cost);
   if(!old||!upgrade)return;
   if(!this.act({type:'sell',towerId:old.id},now).ok)return;
   upgrading=upgrade.id;
  }
  const unlocked=TOWERS.filter(t=>t.unlock<=wave&&towerPrice(t,p.money,wave,p.purchaseVariation)<=p.money&&!(t.id==='needle'&&p.towers.filter(x=>x.typeId==='needle').length>=3));
  const preferences=this.definition.level<4?['basic','double','needle','pebble']:['basic','double','needle','frost','catapult','lightning','sniper','crystal','ice','rune','siege','pebble'];
  const count=(id:string)=>p.towers.filter(t=>t.typeId===id).length;
  const finishing=wave>=2&&count('needle')<(this.definition.level>=8?2:1)?unlocked.find(t=>t.id==='needle'):undefined;
  const pick=unlocked.find(t=>t.id===upgrading)??finishing??unlocked.sort((a,b)=>count(a.id)-count(b.id)||preferences.indexOf(a.id)-preferences.indexOf(b.id))[0];if(!pick)return;
  // Large projectiles strike first; hundredth finishers wait near the flame.
  // Otherwise a tiny early hit can make a later large projectile invalid.
  const columns=this.definition.level<4?[20,17,14,22,18,15]:pick.unit>=1000?[13,14,15,16,17,18,19,20,21,22]:pick.unit<=50?[21,22,20,19,18,17,16,15,14,13]:[16,18,20,14,17,19,15,22,21,13];
  const cells=s.mapId?strategicDuelCells(s,1,pick.unit,pick.effect==='range'?4:3):[2,4,1,5].flatMap(y=>columns.map(x=>({x,y}))),cell=cells.find(c=>validDuelCell(s,1,c.x,c.y));if(!cell)return;
  if(this.act({type:'quote',...cell,typeId:pick.id},now).ok){this.answeringAt=now+this.definition.thinkMs;this.mood('thinking','소수점을 맞추고 코인을 계산 중이에요.',now,this.definition.thinkMs);}
 }
 step(now=this.clock()){
  if(this.disposed||now<this.state.updatedAt)return;
  const s=this.state,p=s.players[1]!;s.players.forEach(player=>{if(player)player.lastSeen=now;});advanceDuel(s,now);
  if(s.status==='finished'){
   this.mood(s.winner===1?'victory':s.winner===0?'defeat':'idle',s.winner===1?'내 불꽃을 지켜 냈어요!':s.winner===0?'멋진 전략이에요. 다시 겨뤄요!':'두 불꽃 모두 잘 지켰어요.',now,Infinity);
   clearInterval(this.timer);this.timer=undefined;this.onState(s,true);return;
  }
  if(s.status!=='playing'){this.onState(s,true);return;}
  if(!this.strategyStarted){
   this.strategyStarted=true;this.nextBuild=s.startedAt+1800;this.nextFusion=s.startedAt+this.definition.fusionMs;this.nextHatch=s.startedAt+this.definition.hatchMs;
  }
  if(p.flame<this.seenFlame){this.mood('hurt','앗! 내 불꽃까지 도착했어요.',now);this.seenFlame=p.flame;}
  else if(now>=this.moodUntil)this.mood('idle','불꽃과 몬스터를 살피고 있어요.',now);
  if(p.quote){if(now>=this.answeringAt){const q=p.quote,r=this.act({type:'answer',nonce:q.nonce,answer:numberText(q.before-q.cost)},now);this.nextBuild=now+this.definition.buildMs;if(r.ok)this.mood('cast','새 타워로 불꽃을 지킬게요!',now);else this.act({type:'cancel'},now);}}
  else if(now>=this.nextBuild){this.nextBuild=now+this.definition.buildMs;this.build(now);}
  if(s.status==='playing'){
   const desired=Math.min(this.definition.heroLevel,duelLevel(s)+1);
   if(p.egg>=desired&&now>=this.nextHatch){
    const heroes=heroesAtLevel(p.egg),variant=this.definition.level<4||this.definition.level===9?0:(this.definition.level+p.solved)%3,hero=heroes.find(h=>h.variant===variant)??heroes[0];
    if(hero&&this.act({type:'hatch',heroId:hero.id},now).ok){this.nextHatch=now+this.definition.hatchMs;this.mood('cast','돌의 영웅이 출발해요!',now);}
   }else if(p.egg<desired&&now>=this.nextFusion){
    const slots=additionSlots(p.board);this.nextFusion=now+this.definition.fusionMs;
    if(slots&&this.act({type:'fuse',round:p.round,slots,operation:'+'},now).ok)this.mood('thinking','덧셈으로 돌 알을 성장시켰어요.',now);
   }
  }
  this.onState(s,true);
 }
 async send(action:DuelAction):Promise<Reply>{
  if(this.disposed)throw Error('컴퓨터 대전을 마쳤어요.');
  const now=this.clock();this.step(now);const p=this.state.players[0];p.lastSeen=now;
  const reply=applyDuel(this.state,0,action,now,'local-'+(++this.nonce));this.state.revision++;
  if(this.state.status==='finished'){this.mood(this.state.winner===1?'victory':this.state.winner===0?'defeat':'idle',this.state.winner===1?'다음에 다시 겨뤄요!':'멋진 전략이에요!',now,Infinity);clearInterval(this.timer);this.timer=undefined;}
  this.onState(this.state,true);return reply;
 }
 dispose(){this.disposed=true;clearInterval(this.timer);this.timer=undefined;this.onState=()=>{};this.onStatus=()=>{};}
}
