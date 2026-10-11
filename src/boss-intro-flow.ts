import {FINAL_STAGE} from './levels';
export type BossIntroPhase='idle'|'waiting'|'playing'|'complete';

/** A fresh stage visit owns its presentation; an old callback cannot release it. */
export class BossIntroFlow{
 private generation=0;
 private current:BossIntroPhase='idle';
 get phase(){return this.current;}
 get held(){return this.current==='waiting'||this.current==='playing';}
 enter(stageId:number,tutorial=false):number|null{
  this.generation++;this.current=stageId===FINAL_STAGE&&!tutorial?'waiting':'idle';
  return this.current==='waiting'?this.generation:null;
 }
 begin(token:number):boolean{if(token!==this.generation||this.current!=='waiting')return false;this.current='playing';return true;}
 finish(token:number):boolean{if(token!==this.generation||this.current!=='playing')return false;this.current='complete';return true;}
 cancel(){this.generation++;this.current='idle';}
}
