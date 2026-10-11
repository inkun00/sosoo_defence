export type OpponentMood='idle'|'thinking'|'cast'|'hurt'|'victory'|'defeat';
type PoseStep=readonly [frame:number,duration:number];
export interface OpponentMotion {frame:number;nextFrame:number;blend:number;dx:number;dy:number;angle:number;scaleX:number;scaleY:number;}
export const OPPONENT_IDLE_CYCLE=18000;
// Long holds alternate breathing, watching the battlefield and an occasional
// staff gesture. The three cycles avoid a repeated two-pose attack loop.
const IDLE:readonly (readonly PoseStep[])[]=[
 [[0,5000],[1,4300],[2,1900],[3,1500],[1,2500],[0,2800]],
 [[0,5000],[1,3500],[4,1600],[5,1900],[1,2700],[0,3300]],
 [[0,5100],[2,2200],[3,1800],[0,3300],[1,3200],[0,2400]],
];
const ACTIONS:Record<Exclude<OpponentMood,'idle'>,readonly PoseStep[]>={
 thinking:[[2,3600],[3,3100]],cast:[[4,650],[5,900],[4,500]],
 hurt:[[6,1050],[7,650],[6,700]],victory:[[8,700],[9,950],[8,750]],
 defeat:[[10,1000],[11,1000]],
};
const clamp=(value:number)=>Math.max(0,Math.min(1,value));
export const smoothPose=(value:number)=>{const t=clamp(value);return t*t*(3-2*t);};
const finiteTime=(value:number)=>Number.isFinite(value)?Math.max(0,value):0;
function sequence(age:number,steps:readonly PoseStep[],loop:boolean){
 const duration=steps.reduce((sum,step)=>sum+step[1],0);
 let remaining=loop?age%duration:Math.min(age,duration);
 for(let i=0;i<steps.length;i++){
  const [frame,hold]=steps[i];
  if(remaining<hold){
   const nextFrame=steps[i+1]?.[0]??(loop?steps[0][0]:frame),fade=Math.min(180,hold*.3);
   return {frame,nextFrame,blend:frame===nextFrame?0:smoothPose((remaining-(hold-fade))/fade)};
  }
  remaining-=hold;
 }
 const frame=steps.at(-1)![0];return {frame,nextFrame:frame,blend:0};
}

/** Time-based choreography; reactions play once, then hold rather than loop. */
export function sampleOpponentMotion(mood:OpponentMood,age:number,time:number,level=1,reduced=false):OpponentMotion{
 const elapsed=finiteTime(age),clock=finiteTime(time),rank=Math.max(1,Math.min(10,Math.floor(Number.isFinite(level)?level:1)));
 if(reduced){const frame=mood==='idle'?0:ACTIONS[mood][0][0];return{frame,nextFrame:frame,blend:0,dx:0,dy:0,angle:0,scaleX:1,scaleY:1};}
 const cycle=Math.floor(elapsed/OPPONENT_IDLE_CYCLE);
 const pose=mood==='idle'?sequence(elapsed%OPPONENT_IDLE_CYCLE,IDLE[(cycle+rank-1)%IDLE.length],true):sequence(elapsed,ACTIONS[mood],mood==='thinking');
 const breath=Math.sin(clock/(4200+rank*43)*Math.PI*2),weight=Math.sin(clock/(7400+rank*137)*Math.PI*2);
 let dx=weight*.65,dy=0,angle=weight*.55,scaleX=1-breath*.006,scaleY=1+breath*.009;
 if(mood==='idle'||mood==='thinking'){
  const watch=(frame:number)=>frame===2||frame===3?1:0;
  const looking=watch(pose.frame)*(1-pose.blend)+watch(pose.nextFrame)*pose.blend;
  dx-=looking*.7;angle-=looking*.65;
 }else if(mood==='hurt'){
  const recoil=Math.sin(Math.PI*clamp(elapsed/900))**2;
  dx+=recoil*2.8;dy+=recoil*1.1;angle-=recoil*3.2;
 }else if(mood==='victory'){
  const cheer=Math.sin(Math.PI*clamp(elapsed/1300))**2;
  dy-=cheer*3.8;angle+=cheer*1.3;
 }else if(mood==='defeat'){
  const slump=smoothPose(elapsed/1100);dy+=slump*1.5;angle-=slump*2;
 }else{
  const gesture=Math.sin(Math.PI*clamp(elapsed/1700))**2;
  dx-=gesture*.8;angle-=gesture*1.2;scaleX+=gesture*.006;
 }
 return {...pose,dx,dy,angle,scaleX,scaleY};
}
