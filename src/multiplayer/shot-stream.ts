import type {DuelShot,DuelState} from './duel';

// Retain a shot watermark after the host removes its short-lived shot records.
// Returning to an older snapshot must never replay damage feedback.
export class DuelShotStream{
 private roomIdentity='';private revision=-1;private watermark=0;
 get identity():string{return this.roomIdentity;}

 reset():void{this.roomIdentity='';this.revision=-1;this.watermark=0;}

 take(room:string,state:DuelState|null):DuelShot[]{
  if(!state){this.reset();return [];}
  const identity=`${room}:${state.seed}:${state.createdAt}`;
  if(identity!==this.roomIdentity){this.reset();this.roomIdentity=identity;}
  if(state.revision<this.revision)return [];
  this.revision=state.revision;

  const previous=this.watermark,fresh=new Map<number,DuelShot>();
  for(const shot of state.shots??[]){
   if(!Number.isSafeInteger(shot.id)||shot.id<=0)continue;
   this.watermark=Math.max(this.watermark,shot.id);
   const age=state.elapsed-shot.time;
   if(shot.id>previous&&age>=0&&age<=2.4)fresh.set(shot.id,shot);
  }
  // Consume every received id, including expired records and omitted burst art.
  return [...fresh.values()].sort((a,b)=>a.id-b.id).slice(-12);
 }
}
