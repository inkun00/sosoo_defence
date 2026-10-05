export type StoryKind='opening'|'ending';
export interface StoryBeat{duration:number;art:'title-castle-v1'|'story-rift-v1'|'story-dawn-v1';title:string;subtitle:string;voice:string;formula?:string;accent:string;}
export const STORY:Record<StoryKind,StoryBeat[]>={
 opening:[
  {duration:5,art:'title-castle-v1',title:'마지막 불꽃',subtitle:'작은 빛 하나가, 성을 지키고 있었다.',voice:'수호의 불꽃이 소수의 성을 지켜 왔어요.',accent:'#ffc66b'},
  {duration:6,art:'story-rift-v1',title:'균열이 열렸다',subtitle:'흩어진 숫자들이 돌왕을 깨웠다.',voice:'균열이 열리고, 돌왕과 돌 몬스터들이 깨어났어요.',accent:'#cf9aff'},
  {duration:6,art:'title-castle-v1',title:'더해서, 성벽을 세우고',subtitle:'작은 조각도 모이면 든든한 힘이 된다.',voice:'소수 조각을 더하고 빼서, 든든한 성벽을 만들어요.',formula:'0.3 + 0.4 = 0.7',accent:'#ffd68b'},
  {duration:6,art:'story-rift-v1',title:'빼서, 정확히 0으로',subtitle:'남은 힘을 살피는 것이 수호자의 지혜.',voice:'남은 힘에 맞는 공격으로 정확히 영을 만들어요.',formula:'0.6 − 0.2 = 0.4',accent:'#aee7ff'},
  {duration:5,art:'title-castle-v1',title:'이제, 당신이 수호자',subtitle:'열 번의 도전. 마지막 불꽃을 지켜라.',voice:'여러분이 수호자예요. 마지막 불꽃을 지켜 주세요.',accent:'#ffe4a9'}
 ],
 ending:[
  {duration:5,art:'story-rift-v1',title:'마침내, 정확히 0',subtitle:'균열의 돌왕에게서 어둠이 사라졌다.',voice:'돌왕의 힘이 영이 되었어요. 어둠이 사라졌어요.',formula:'남은 힘 = 0',accent:'#d9bbff'},
  {duration:6,art:'story-dawn-v1',title:'불꽃이 다시 타오르고',subtitle:'작은 빛이, 새로운 아침을 열었다.',voice:'불꽃이 다시 밝게 타올라요. 새로운 아침이 왔어요.',accent:'#ffd783'},
  {duration:6,art:'story-dawn-v1',title:'작은 조각이 만든 큰 용기',subtitle:'더하고 빼며 쌓은 지혜가 성을 구했다.',voice:'더하고 빼며 쌓은 지혜가 소수의 성을 구했어요.',formula:'0.3 + 0.4 = 0.7',accent:'#fff0c7'},
  {duration:5,art:'story-dawn-v1',title:'소수의 성 수호자',subtitle:'이 성의 이야기는, 당신 덕분에 계속된다.',voice:'축하해요! 여러분은 소수의 성 수호자예요.',accent:'#ffdc92'}
 ]
};
export function storyDuration(kind:StoryKind){return STORY[kind].reduce((s,b)=>s+b.duration,0);}
export function storyFrame(kind:StoryKind,time:number){
 let start=0;const beats=STORY[kind];
 for(let index=0;index<beats.length;index++){const beat=beats[index];if(time<start+beat.duration||index===beats.length-1)return {beat,index,local:Math.max(0,Math.min(beat.duration,time-start)),start};start+=beat.duration;}
 throw Error('Empty story');
}
