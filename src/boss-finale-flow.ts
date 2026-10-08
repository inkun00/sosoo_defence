import {FINAL_STAGE} from './levels';

export type BossFinalePhase='idle'|'waiting'|'playing'|'complete';

/** Model damage settles before its projectile arrives. Keep the result behind
 * the final impact and its presentation without altering combat or goals. */
export class BossFinaleFlow{
 private current:BossFinalePhase='idle';
 get phase(){return this.current;}
 hold(stageId:number,bossDefeated:boolean):boolean{
  if(stageId!==FINAL_STAGE||!bossDefeated||this.current==='complete')return false;
  if(this.current==='idle')this.current='waiting';
  return true;
 }
 begin():boolean{
  if(this.current!=='waiting')return false;
  this.current='playing';return true;
 }
 finish():boolean{
  if(this.current!=='playing')return false;
  this.current='complete';return true;
 }
}
