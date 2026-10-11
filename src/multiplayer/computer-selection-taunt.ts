export const COMPUTER_SELECTION_DELAY_MS=1800;

/** Each opponent keeps their own voice, with a shuffled bag across selections. */
export const COMPUTER_SELECTION_TAUNTS:readonly (readonly string[])[]=[
 ['내가 처음이라고 얕보면 안 돼! 이끼처럼 끈질기게 버텨 주지!', '작은 포탑도 정확히 쏘면 무섭다고!', '내 성의 불꽃은 쉽게 안 꺼져. 덤벼 봐!', '계산은 천천히, 방어는 단단하게! 준비됐어?', '이끼 아래 숨은 내 전략을 보여 줄게!', '첫 결투라고 봐주지는 않을 거야!'],
 ['네 방어선의 빈틈, 이미 내 등불로 찾아냈어!', '등불이 비추는 길은 내가 먼저 차지한다!', '정찰은 끝났다. 이제 네 성을 노려 볼까?', '작은 틈 하나면 충분해. 잘 막아 봐!', '내 영웅은 어둠 속에서도 길을 찾지!', '등불을 들어라! 상대 성까지 전진한다!'],
 ['불씨 하나가 네 성문을 녹일 수도 있지!', '내 포탑은 뜨겁게 달궈 뒀다. 덤벼라!', '쇠를 두드리듯 네 방어선도 두드려 주마!', '불과 돌로 벼린 내 전략을 감당해 보겠나?', '대장간은 쉬지 않는다. 공격도 멈추지 않아!', '이번 결투에 쓸 무기는 이미 완성됐다!'],
 ['네 돌진은 내 서리 앞에서 얼어붙을 거다.', '차갑게 계산하고, 정확히 맞혀 주지.', '내 성에 닿기 전에 겨울을 견뎌 봐라!', '서두를수록 내 덫에 걸리기 쉽지.', '전장의 흐름까지 얼려 주겠다. 준비됐나?', '내 서리는 느리게 와도 끝까지 남는다.'],
 ['눈 깜짝할 사이에 네 빈틈을 찌를 거다!', '번개보다 빨리 계산할 자신은 있나?', '한 번의 섬광이 승부를 바꾼다. 잘 지켜 봐!', '푸른 번개여, 상대의 성문을 겨눠라!', '숫자와 번개를 섞으면 어떤 힘이 나오는지 보여 주지!', '내 다음 수는 번쩍이는 순간 이미 끝나 있다!'],
 ['룬에 새긴 맹세로 이 성을 끝까지 지킨다!', '기사의 방어선을 넘을 용기는 있나?', '검과 포탑, 어느 쪽이 먼저 네 길을 막을까?', '내 영웅들이 출격을 기다린다. 준비해라!', '룬의 힘을 깨워라! 결투를 시작한다!', '한 걸음도 물러서지 않겠다. 정면으로 와라!'],
 ['수정에 비친 네 다음 수가 보이는군.', '별빛이 알려 준 빈틈을 놓치지 않겠다!', '네 방어가 흔들릴 순간을 기다리고 있지.', '미래를 바꾸고 싶다면 나부터 넘어 봐라!', '수정이 빛난다. 내 전략도 준비됐군!', '이 결투의 흐름, 내가 먼저 읽어 주지.'],
 ['네 성문에 드리운 그림자, 바로 내 영웅이다.', '어둠 속 빈틈은 내 눈에 더 잘 보이지.', '조용히 다가가 가장 약한 곳을 찌르겠다.', '성문을 굳게 닫아라. 난 이미 길을 찾았다!', '내 파수는 밤에도 쉬지 않는다. 덤벼라!', '그림자가 닿기 전에 방어를 끝내는 게 좋을걸.'],
 ['폭풍 앞에서 네 타워가 얼마나 버틸까?', '용의 힘을 모았다. 전장을 흔들어 주마!', '바람도 번개도 내 편이다. 준비됐나?', '내 영웅들이 폭풍처럼 몰아칠 거다!', '불꽃을 단단히 지켜라. 거센 공격이 온다!', '폭풍의 길을 막을 수 있다면 증명해 봐라!'],
 ['내 마법과 계산, 둘 다 넘어서야 이길 수 있다.', '마지막 결투다. 네 모든 전략을 보여 봐라!', '단 하나의 소수점도 내겐 무기가 된다!', '포탑과 영웅의 힘을 모두 펼쳐 주겠다!', '대마법사의 성문을 열 실력이 있는지 보자!', '긴 준비는 끝났다. 이제 진짜 승부를 시작하지!'],
];

export class ComputerSelectionDialogue{
 private bags=new Map<number,number[]>();
 private last=new Map<number,number>();
 constructor(private random=()=>Math.random()){}
 next(level:number){
  const index=Math.max(0,Math.min(9,Math.floor(level||1)-1)),lines=COMPUTER_SELECTION_TAUNTS[index];
  let bag=this.bags.get(index);
  if(!bag?.length){
   bag=lines.map((_,i)=>i);
   for(let i=bag.length-1;i>0;i--){const j=Math.floor(this.random()*(i+1));[bag[i],bag[j]]=[bag[j],bag[i]];}
   this.bags.set(index,bag);
  }
  const available=bag.findIndex(i=>i!==this.last.get(index)),chosen=bag.splice(available<0?0:available,1)[0];
  this.last.set(index,chosen);return lines[chosen];
 }
}

type SelectionScheduler=(callback:()=>void,delayMs:number)=>()=>void;

/** A canceled screen must never create a peer, even if its callback was queued. */
export class ComputerSelectionDelay{
 private pending=false;
 private revision=0;
 private cancelTimer:(()=>void)|undefined;
 constructor(private schedule:SelectionScheduler=(callback,delayMs)=>{const timer=setTimeout(callback,delayMs);return()=>clearTimeout(timer);}){}
 get active(){return this.pending;}
 start(onReady:()=>void,delayMs=COMPUTER_SELECTION_DELAY_MS){
  if(this.pending)return false;
  this.pending=true;const revision=++this.revision;
  this.cancelTimer=this.schedule(()=>{
   if(!this.pending||revision!==this.revision)return;
   this.pending=false;this.cancelTimer=undefined;onReady();
  },delayMs);
  return true;
 }
 cancel(){this.revision++;this.pending=false;this.cancelTimer?.();this.cancelTimer=undefined;}
}
