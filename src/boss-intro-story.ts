/** The encounter uses visible, unpaused seconds rather than the defense clock. */
export const BOSS_INTRO_STORY=[
 {duration:3.8,title:'마지막 관문',line:'여기까지 용케 왔구나. 하지만 내 마법까지 막을 수 있을 것 같으냐?'},
 {duration:6,title:'저주의 힘',line:'깨어나라, 나의 군대여! 내 마법으로 힘을 주겠다. 저 성을 무너뜨려라!'},
 {duration:4.2,title:'마지막 경고',line:'네가 지키는 불꽃도 곧 꺼질 거다. 어디 한번 끝까지 버텨 보거라!'},
] as const;
export const BOSS_INTRO_DURATION=BOSS_INTRO_STORY.reduce((sum,beat)=>sum+beat.duration,0);
export const BOSS_INTRO_MECHANICS=['3초 예고 → 5초 발동 → 4초 휴식','3칸 안 · 세 마법을 하나씩 순환','광폭 질주 · 속도 +25%','서리 파괴 · 감속 중 속도 60% → 80%','불굴의 의지 · 기절 회복 2배'] as const;

export function bossIntroFrame(seconds:number,reduced=false){
 const time=Math.max(0,Math.min(BOSS_INTRO_DURATION,Number.isFinite(seconds)?seconds:0));
 let index=0,local=time;
 while(index<BOSS_INTRO_STORY.length-1&&local>=BOSS_INTRO_STORY[index].duration){local-=BOSS_INTRO_STORY[index].duration;index++;}
 const beat=BOSS_INTRO_STORY[index],letters=Array.from(beat.line),revealed=reduced?letters.length:Math.max(0,Math.min(letters.length,Math.floor((local-.2)*20)));
 return {time,index,local,beat,dialogue:letters.slice(0,revealed).join(''),speaking:!reduced&&revealed>0&&revealed<letters.length,progress:time/BOSS_INTRO_DURATION,complete:time>=BOSS_INTRO_DURATION};
}

/** Resets its baseline on pause/visibility changes so hidden time never catches up. */
export class BossIntroClock{
 private previous:number|null=null;
 elapsed=0;
 resetBaseline(){this.previous=null;}
 tick(now:number,blocked:boolean){
  if(this.previous!==null&&!blocked)this.elapsed=Math.min(BOSS_INTRO_DURATION,this.elapsed+Math.max(0,Math.min(.1,(now-this.previous)/1000)));
  this.previous=blocked?null:now;return this.elapsed;
 }
}
