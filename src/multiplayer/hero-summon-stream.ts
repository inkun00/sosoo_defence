import {duelEnemyPosition,type DuelState,type Side} from './duel';
import {heroSpec} from './heroes';

export interface HeroSummonEvent{enemyId:number;owner:Side;heroId:string;level:number;name:string;x:number;y?:number;}

/** A reserve hero is a one-time transition, rather than a live enemy count. */
export class HeroSummonStream{
 private roomIdentity='';private revision=-1;private phase:DuelState['status']|null=null;private phaseTime=0;
 private used:[boolean,boolean]=[false,false];private enemyIds=new Set<number>();
 get identity():string{return this.roomIdentity;}
 reset():void{this.roomIdentity='';this.revision=-1;this.phase=null;this.phaseTime=0;this.used=[false,false];this.enemyIds.clear();}
 take(room:string,state:DuelState|null):HeroSummonEvent[]{
  if(!state){this.reset();return [];}
  const identity=`${room}:${state.seed}:${state.createdAt}`;
  if(identity===this.roomIdentity&&state.revision<this.revision)return [];
  const first=identity!==this.roomIdentity;
  if(first){this.reset();this.roomIdentity=identity;}
  const fresh:HeroSummonEvent[]=[];
  // An initial/reconnected snapshot is the baseline. A long snapshot gap also
  // consumes the transition without celebrating a summon that happened earlier.
  const phaseTime=state.status==='preparing'?state.preparationElapsed:state.elapsed;
  const active=state.status==='preparing'||state.status==='playing';
  // Collected heroes enter when preparation begins. Each phase owns a clock:
  // switching to battle must not turn a minute-old entrance into a new event.
  const samePhase=state.status===this.phase&&phaseTime>=this.phaseTime&&phaseTime-this.phaseTime<=2.4;
  const preparationEntry=this.phase==='waiting'&&state.status==='preparing'&&phaseTime<=2.4;
  const recent=!first&&active&&(samePhase||preparationEntry);
  for(const owner of [0,1] as Side[]){
   const player=state.players[owner],used=!!player?.rewardUsed;
   if(recent&&!this.used[owner]&&used&&player?.rewardHero){
    const hero=heroSpec(player.rewardHero);
    const candidates=state.enemies.filter(e=>e.owner===owner&&e.hero===player.rewardHero&&e.rewardSummon!==false&&!this.enemyIds.has(e.id)).sort((a,b)=>a.id-b.id);
    // New hosts explicitly identify the reserve; a compatibility fallback is
    // only needed for hosts that predate the optional wire marker.
    const enemy=candidates.find(e=>e.rewardSummon)??candidates[0];
    if(hero&&enemy){const point=duelEnemyPosition(state,enemy);fresh.push({enemyId:enemy.id,owner,heroId:hero.id,level:hero.level,name:hero.name,x:point.x,y:point.y});}
   }
   // A stale flag in an equal/older snapshot must not re-arm a used reserve.
   this.used[owner]=this.used[owner]||used;
  }
  this.revision=state.revision;this.phase=state.status;this.phaseTime=phaseTime;
  this.enemyIds=new Set(state.enemies.map(e=>e.id));
  return fresh;
 }
}
