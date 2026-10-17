import {numberText} from './math';
import type {SecretSiege} from './secret-siege-model';
import type {SiegeTarget,SiegeUnit} from './secret-siege-types';

type Point={x:number;y:number};
type Projection=(distance:number)=>Point;
const VIOLET='#d5a1ff',FIRE='#ffb077';
const circle=(context:CanvasRenderingContext2D,x:number,y:number,radius:number)=>{context.beginPath();context.arc(x,y,Math.max(.1,radius),0,Math.PI*2);};
const clamp=(value:number)=>Math.max(0,Math.min(1,value));
export function siegeBossMuzzle(point:Point):Point{return{x:point.x-43,y:point.y-82};}

/** Presentation reads the boss clock; it never resolves a hit or advances a spell. */
export class SiegeBossPainter{
 private defeatedAt?:number;
 reset(){this.defeatedAt=undefined;}
 private pill(context:CanvasRenderingContext2D,x:number,y:number,text:string,color=VIOLET,size=15){
  context.save();context.font=`700 ${size}px system-ui,sans-serif`;context.textAlign='center';context.textBaseline='middle';
  const width=context.measureText(text).width+20;context.fillStyle='#100b1ce8';context.strokeStyle=color+'80';context.lineWidth=1;
  context.beginPath();context.roundRect(x-width/2,y-13,width,26,5);context.fill();context.stroke();context.fillStyle=color;context.fillText(text,x,y);context.restore();
 }
 private rune(context:CanvasRenderingContext2D,x:number,y:number,radius:number,color:string,rotation=0){
  context.save();context.translate(x,y);context.rotate(rotation);context.strokeStyle=color;context.lineWidth=2;circle(context,0,0,radius);context.stroke();
  context.beginPath();for(let index=0;index<6;index++){const angle=index*Math.PI/3-Math.PI/2,px=Math.cos(angle)*radius*.73,py=Math.sin(angle)*radius*.73;index?context.lineTo(px,py):context.moveTo(px,py);}context.closePath();context.stroke();
  context.beginPath();context.moveTo(-radius*.55,0);context.lineTo(radius*.55,0);context.moveTo(0,-radius*.55);context.lineTo(0,radius*.55);context.stroke();context.restore();
 }
 warning(context:CanvasRenderingContext2D,model:SecretSiege,project:Projection,time:number,reduced:boolean){
  const state=model.bossState,spell=state?.spell;if(!spell||state.phase==='defeated')return;
  const warning=spell.phase==='warning',chain=spell.kind==='soul-chain',color=chain?'#bf94ff':'#ff9a7f';
  const progress=warning?clamp((model.elapsed-spell.startedAt)/(spell.resolvesAt-spell.startedAt)):clamp((model.elapsed-spell.resolvesAt)/Math.max(.1,spell.endsAt-spell.resolvesAt));
  const begin=Math.max(0,spell.centerDistance-spell.radius),end=Math.min(1000,spell.centerDistance+spell.radius),center=project(spell.centerDistance);
  context.save();context.lineCap='round';context.lineJoin='round';context.beginPath();
  for(let distance=begin;distance<end;distance+=7){const point=project(distance);distance===begin?context.moveTo(point.x,point.y):context.lineTo(point.x,point.y);}const last=project(end);context.lineTo(last.x,last.y);
  context.strokeStyle=warning?chain?'#8c59bc36':'#d35b3d36':chain?'#ad79ed62':'#ff8a665f';context.lineWidth=86;context.stroke();
  context.strokeStyle=color;context.lineWidth=warning?3:4;context.globalAlpha=warning?.58+progress*.35:.78*(1-progress*.6);context.setLineDash(warning?[10,7]:[]);context.stroke();context.setLineDash([]);
  if(warning){this.rune(context,center.x,center.y,30,color,reduced?0:time*.2);context.fillStyle='#100b1ee8';circle(context,center.x,center.y,13);context.fill();context.font='800 18px system-ui,sans-serif';context.textAlign='center';context.textBaseline='middle';context.fillStyle=color;context.fillText('!',center.x,center.y+1);}
  else{context.lineWidth=3;circle(context,center.x,center.y,reduced?42:18+progress*72);context.stroke();if(chain)this.chain(context,center.x,center.y-11,color,1.7);}
  context.restore();
 }
 body(context:CanvasRenderingContext2D,model:SecretSiege,boss:SiegeTarget,point:Point,image:HTMLImageElement|undefined,time:number,reduced:boolean){
  const state=model.bossState;if(!state)return;
  const dead=boss.hp<=0;if(dead&&this.defeatedAt===undefined)this.defeatedAt=model.elapsed;
  const deathAge=dead?Math.max(0,model.elapsed-(this.defeatedAt??model.elapsed)):0;
  if(dead&&deathAge>3)return;
  const enraged=state.phase==='enraged',spell=state.spell,warning=spell?.phase==='warning',shotAge=model.elapsed-(boss.lastShot??-999),hurtAge=model.elapsed-boss.lastHit;
  const casting=!dead&&(warning||shotAge>=0&&shotAge<.7),hurt=!dead&&hurtAge>=0&&hurtAge<.4;
  const frame=dead?12+Math.min(3,Math.floor(deathAge*4)):reduced?0:casting?4+Math.min(3,Math.floor((warning?model.elapsed-spell.startedAt:shotAge)*4)%4):hurt?4+Math.min(3,Math.floor(hurtAge*8)):[0,1,2,1,0,3][Math.floor(time*2.2)%6];
  const size=164,hover=dead||reduced?0:Math.sin(time*1.05)*1.4,alpha=dead?1-clamp((deathAge-1.25)/1.5):1,color=enraged?FIRE:VIOLET;
  context.save();context.globalAlpha=alpha;
  const glow=context.createRadialGradient(point.x,point.y-65,4,point.x,point.y-65,115);glow.addColorStop(0,enraged?'#cd4e4a40':'#9f54dd38');glow.addColorStop(1,'#44245a00');context.fillStyle=glow;context.fillRect(point.x-115,point.y-180,230,230);
  context.save();context.translate(point.x,point.y+4);context.scale(1,.29);this.rune(context,0,0,65,enraged?'#ff9777aa':'#bf8cf6aa',reduced?0:time*.1);context.restore();
  context.fillStyle='#08061099';context.beginPath();context.ellipse(point.x,point.y+4,46,12,0,0,Math.PI*2);context.fill();
  if(image){const width=image.width/4,height=image.height/4;context.drawImage(image,frame%4*width,Math.floor(frame/4)*height,width,height,point.x-size*.5,point.y-size+hover,size,size);}
  else{context.fillStyle='#352341';context.strokeStyle=color;context.lineWidth=2;context.beginPath();context.moveTo(point.x,point.y-140);context.lineTo(point.x+45,point.y-6);context.lineTo(point.x-45,point.y-6);context.closePath();context.fill();context.stroke();context.fillStyle=color;circle(context,point.x,point.y-105,10);context.fill();}
  if(casting){const hand=siegeBossMuzzle(point),charge=warning?clamp((model.elapsed-spell.startedAt)/(spell.resolvesAt-spell.startedAt)):1-shotAge/.7;context.fillStyle='#ead1ff';context.shadowColor=color;context.shadowBlur=reduced?0:16;circle(context,hand.x,hand.y+hover,5+charge*8);context.fill();context.shadowBlur=0;}
  if(dead){this.pill(context,point.x,point.y-164,'부활한 마법사 · 소멸',VIOLET,17);context.restore();return;}
  const hudX=point.x-20;
  this.pill(context,hudX,point.y-210,enraged?'부활한 마법사 · 격노':'부활한 마법사',color,18);
  this.pill(context,hudX,point.y-183,`${numberText(boss.hp)} / ${numberText(boss.maxHp)}  ·  공격 ${numberText(boss.attack)}`,color,15);
  context.fillStyle='#0b0712';context.strokeStyle=color;context.lineWidth=1.5;context.beginPath();context.roundRect(hudX-71,point.y-164,142,12,3);context.fill();context.stroke();context.fillStyle=enraged?'#e88a69':'#b77ce9';const fill=clamp(boss.hp/boss.maxHp)*138;if(fill>0)context.fillRect(hudX-69,point.y-162,fill,8);
  if(spell)this.spellIcon(context,point.x-111,point.y-157,model);
  if(spell){const remaining=Math.max(0,spell.resolvesAt-model.elapsed),name=spell.kind==='shadow-wave'?'암흑 파동':'영혼 속박';this.pill(context,point.x,point.y+31,warning?`${name} · ${remaining.toFixed(1)}초`:name,spell.kind==='shadow-wave'?FIRE:VIOLET,16);}
  else if(state.phase==='dormant')this.pill(context,point.x,point.y+31,'성채를 지키는 저주',VIOLET,15);
  if(enraged&&model.elapsed-state.enragedAt<4)this.bubble(context,point.x-150,point.y-248,'끝까지 버틸 수 있을 것 같으냐!',FIRE);
  else if(warning){const lines=spell.kind==='shadow-wave'?['어둠이 너희를 삼킬 것이다!','한 발짝도 더 다가오지 마라!','이 성에서 살아 나갈 수 없다!']:['그 발을 묶어 주마!','내 마법에서 벗어날 수 없다!','너희의 진격은 여기까지다!'];this.bubble(context,point.x-150,point.y-248,lines[Math.floor(state.spellCount/2)%lines.length],color);}
  else if(model.phase==='ready'&&time<6)this.bubble(context,point.x-150,point.y-248,'내가 이대로 끝날 줄 알았느냐?',VIOLET);
  context.restore();
 }
 private bubble(context:CanvasRenderingContext2D,x:number,y:number,text:string,color:string){
  context.save();context.font='600 16px system-ui,sans-serif';context.textAlign='center';context.textBaseline='middle';const width=context.measureText(text).width+26;
  context.fillStyle='#100b1ef0';context.strokeStyle=color;context.lineWidth=1.5;context.beginPath();context.roundRect(x-width/2,y-17,width,34,7);context.fill();context.stroke();context.beginPath();context.moveTo(x-7,y+17);context.lineTo(x,y+24);context.lineTo(x+7,y+17);context.fill();context.stroke();context.fillStyle='#f1dfff';context.fillText(text,x,y);context.restore();
 }
 castleWard(context:CanvasRenderingContext2D,model:SecretSiege,point:Point,time:number,reduced:boolean){
  if(!model.boss||model.boss.hp<=0)return;
  context.save();context.strokeStyle='#cb9cff90';context.lineWidth=2;context.setLineDash([13,8]);context.beginPath();context.ellipse(point.x,point.y-80,93,122,0,0,Math.PI*2);context.stroke();context.setLineDash([]);
  const alpha=reduced?.12:.11+Math.sin(time*.9)*.025;context.fillStyle=`rgba(157,98,224,${alpha})`;context.fill();this.pill(context,point.x,point.y+58,'마법사의 결계',VIOLET,16);context.restore();
 }
 private chain(context:CanvasRenderingContext2D,x:number,y:number,color:string,scale=1){
  context.save();context.translate(x,y);context.rotate(-Math.PI/4);context.scale(scale,scale);context.strokeStyle=color;context.lineWidth=2.7;
  for(const offset of [-4.5,4.5]){context.beginPath();context.roundRect(offset-5,-8,10,16,5);context.stroke();}context.restore();
 }
 private spellIcon(context:CanvasRenderingContext2D,x:number,y:number,model:SecretSiege){
  const spell=model.bossState?.spell;if(!spell)return;const warning=spell.phase==='warning',color=spell.kind==='shadow-wave'?FIRE:VIOLET;
  context.save();context.fillStyle='#180d20ee';context.strokeStyle=color;context.lineWidth=2;circle(context,x,y,15);context.fill();context.stroke();
  if(spell.kind==='soul-chain')this.chain(context,x,y,color,.9);
  else{context.strokeStyle=color;context.lineWidth=2;for(const offset of [-4,3]){context.beginPath();context.moveTo(x-9,y+offset);context.quadraticCurveTo(x-4,y+offset-7,x,y+offset);context.quadraticCurveTo(x+4,y+offset+7,x+9,y+offset);context.stroke();}}
  if(warning){const progress=clamp((model.elapsed-spell.startedAt)/(spell.resolvesAt-spell.startedAt));context.lineWidth=3;context.strokeStyle='#ffe5b7';context.beginPath();context.arc(x,y,19,-Math.PI/2,-Math.PI/2+Math.PI*2*progress);context.stroke();}context.restore();
 }
 unitStatus(context:CanvasRenderingContext2D,model:SecretSiege,unit:SiegeUnit,point:Point,top:number){
  if(!unit.hexUntil||unit.hexUntil<=model.elapsed)return;context.save();context.fillStyle='#1d0c2cea';circle(context,point.x+36,top-9,12);context.fill();this.chain(context,point.x+36,top-9,'#d0a7ff');context.restore();
 }
}
