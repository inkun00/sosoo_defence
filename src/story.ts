export type StoryKind='opening'|'ending';
export interface StoryBeat{duration:number;art:'title-castle-v1'|'story-rift-v1'|'story-dawn-v1'|'story-sorcerer-v2'|'story-invasion-v2';title:string;subtitle:string;caption:string;accent:string;}
export const STORY:Record<StoryKind,StoryBeat[]>={
 opening:[
  {duration:5,art:'story-dawn-v1',title:'평화롭던 세상',subtitle:'숲과 마을, 그리고 모두의 작은 일상.',caption:'숲과 마을이 어우러진 세상은 평화로웠다.',accent:'#ffdc92'},
  {duration:7,art:'story-dawn-v1',title:'온 세상이 소수로 변했다',subtitle:'어느 날, 저주가 세상 모든 것을 바꾸었다.',caption:'온 세상이 저주에 걸렸다. 나무도, 돌도, 마을도 모든 것이 소수로 변했다.',accent:'#d7a1ff'},
  {duration:6,art:'story-sorcerer-v2',title:'저주를 건 마법사',subtitle:'세상을 삼킬 어둠의 계획이 시작되었다.',caption:'저주를 건 마법사는 어둠의 마법으로 세상을 차지하려 했다.',accent:'#dcacff'},
  {duration:6,art:'story-sorcerer-v2',title:'소수 몬스터의 탄생',subtitle:'마법사의 손끝에서 새로운 위협이 깨어났다.',caption:'마법사가 소수 몬스터를 태어나게 했다. 저주의 힘을 품은 돌 몬스터들이 깨어났다.',accent:'#c6a1ff'},
  {duration:7,art:'story-invasion-v2',title:'세상을 향한 침공',subtitle:'소수 몬스터의 군대가 마을과 성을 덮쳤다.',caption:'소수 몬스터들이 진격했다. 마법사는 몬스터의 군대로 세상을 점령하기 시작했다.',accent:'#c695ff'},
  {duration:5,art:'title-castle-v1',title:'이제, 세상을 구할 시간',subtitle:'소수 몬스터를 막아내고 저주에 맞서라.',caption:'소수 몬스터를 막아내고 세상을 구해야 한다. 우리의 이야기는 지금 시작된다.',accent:'#ffe4a9'}
 ],
 ending:[
  {duration:6,art:'story-sorcerer-v2',title:'마침내, 마법사가 쓰러졌다',subtitle:'용기 끝에, 어둠의 지배가 끝났다.',caption:'마법사를 물리쳤다. 세상을 뒤덮던 어둠이 무너져 내렸다.',accent:'#d9bbff'},
  {duration:6,art:'story-dawn-v1',title:'저주가 걷히다',subtitle:'긴 밤을 지나, 새벽빛이 스며들었다.',caption:'마법사의 저주가 풀렸다. 세상은 천천히 원래의 모습을 되찾았다.',accent:'#ffd783'},
  {duration:6,art:'story-dawn-v1',title:'다시 살아난 세상',subtitle:'숲에는 바람이, 마을에는 웃음이 돌아왔다.',caption:'나무는 다시 푸르게 자라고, 마을에는 사람들의 웃음소리가 울려 퍼졌다.',accent:'#fff0c7'},
  {duration:6,art:'story-dawn-v1',title:'평화가 돌아왔다',subtitle:'당신이 지켜 낸 세상에, 새로운 아침이 밝았다.',caption:'세상은 다시 평화로워졌다. 모두가 함께 살아갈 새로운 이야기가 시작된다.',accent:'#ffdc92'}
 ]
};
export function storyDuration(kind:StoryKind){return STORY[kind].reduce((s,b)=>s+b.duration,0);}
export function storyFrame(kind:StoryKind,time:number){
 let start=0;const beats=STORY[kind];
 for(let index=0;index<beats.length;index++){const beat=beats[index];if(time<start+beat.duration||index===beats.length-1)return {beat,index,local:Math.max(0,Math.min(beat.duration,time-start)),start};start+=beat.duration;}
 throw Error('Empty story');
}
