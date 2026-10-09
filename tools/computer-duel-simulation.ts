import {pathToFileURL} from 'node:url';
import {ComputerPeer,additionSlots} from '../src/multiplayer/computer-peer';
import {DuelAction,applyDuel,duelLevel,validDuelCell} from '../src/multiplayer/duel';
import {TOWERS,towerPrice} from '../src/towers';
import {numberText} from '../src/math';
import {heroesAtLevel} from '../src/multiplayer/heroes';

type Strategy='baseline'|'burst';
/** Fixed legal player policies for regression checks, not claims about real children. */
export function simulateComputerDuel(level:number,seed:number,strategy:Strategy='baseline'){
 let now=100000;const peer=new ComputerPeer({uid:'baseline',name:'기준 수호자'},level,{seed,clock:()=>now,autoTick:false}),s=peer.state,p=s.players[0];
 const burst=strategy==='burst',think=burst?2000:3000,build=burst?7000:10000,fuse=burst?3000:10000,hatch=burst?30000:26000,max=burst?14:8;
 let nonce=0,nextBuild=now+1800,answerAt=0,nextFuse=now+fuse,nextHatch=now+hatch;
 const act=(action:DuelAction)=>{const reply=applyDuel(s,0,action,now,'baseline-'+(++nonce));s.revision++;return reply;};act({type:'ready'});
 while(s.status==='playing'&&s.elapsed<300){
  now+=100;peer.step(now);if(s.status!=='playing')break;const wave=duelLevel(s);
  if(p.quote&&now>=answerAt){act({type:'answer',nonce:p.quote.nonce,answer:numberText(p.quote.before-p.quote.cost)});nextBuild=now+build;}
  else if(!p.quote&&now>=nextBuild&&p.towers.length<max){
   nextBuild=now+build;const preferences=['basic','double','needle','pebble','frost','catapult','lightning','sniper'];
   const types=TOWERS.filter(t=>preferences.includes(t.id)&&t.unlock<=wave&&towerPrice(t,p.money,wave,p.purchaseVariation)<=p.money&&!(t.id==='needle'&&p.towers.filter(t=>t.typeId==='needle').length>=3));
   const count=(id:string)=>p.towers.filter(t=>t.typeId===id).length;types.sort((a,b)=>count(a.id)-count(b.id)||preferences.indexOf(a.id)-preferences.indexOf(b.id));
   const type=types[0],cell=[2,4].flatMap(y=>[9,6,3,7,4,1,8,5].map(x=>({x,y}))).find(c=>validDuelCell(s,0,c.x,c.y));
   if(type&&cell&&act({type:'quote',typeId:type.id,...cell}).ok)answerAt=now+think;
  }
  const desired=burst?10:Math.min(3,wave+1);
  if(p.egg>=desired&&now>=nextHatch){const hero=heroesAtLevel(p.egg)[burst?1:(p.solved+1)%3];if(act({type:'hatch',heroId:hero.id}).ok)nextHatch=now+hatch;}
  else if(p.egg<desired&&now>=nextFuse){nextFuse=now+fuse;const slots=additionSlots(p.board);if(slots)act({type:'fuse',round:p.round,slots,operation:'+'});}
 }
 const result={level,seed,strategy,winner:s.winner,seconds:Math.round(s.elapsed),playerFlame:p.flame,computerFlame:s.players[1]!.flame,computerSolved:s.players[1]!.solved,computerPurchased:s.players[1]!.purchases};peer.dispose();return result;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const seeds=[17,91,203,912,1027],baseline=Array.from({length:10},(_,i)=>{
  const matches=seeds.map(seed=>simulateComputerDuel(i+1,seed));return {level:i+1,computerWins:matches.filter(m=>m.winner===1).length,playerWins:matches.filter(m=>m.winner===0).length,draws:matches.filter(m=>m.winner===null).length,matches};
 });
 console.log(JSON.stringify({description:'동일한 합법적 기준 전략으로 레벨별 5개 시드 비교. 실제 학생의 승률 예측이 아닌 회귀 검증.',baseline,level10Burst:seeds.map(seed=>simulateComputerDuel(10,seed,'burst'))},null,2));
}
