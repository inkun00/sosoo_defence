import {artURL} from './art';
import {HERO_SPRITE_CELL} from './hero-sprite';
import {drawSiegeSpriteAtlas,SIEGE_ARMY_WALK,SIEGE_ARMY_ATTACK,SIEGE_FORTIFICATIONS} from './secret-siege-sprites';
import {drawStationaryAmbientAtlas} from './ambient-animation';
import ambientAtlas from './ambient-atlas.json';
import packedCollapseAtlas from './secret-siege-collapse-atlas.json';
import {decodeSpriteFrames} from './sprite-frame-packing';
import {numberText} from './math';
import {ARMY,SIEGE_PATH_LENGTH,type SiegeTarget,type SiegeUnit,type SiegeProjectile} from './secret-siege-types';
import type {SecretSiege} from './secret-siege-model';
import {secretSiegeWorldLight} from './secret-siege-ending-state';
import {SiegeBossPainter,siegeBossMuzzle} from './secret-siege-boss-field';

const WIDTH=1200,HEIGHT=620,CITADEL_SIZE=220;
const ROAD=[{x:82,y:402},{x:242,y:402},{x:242,y:266},{x:478,y:266},{x:478,y:414},{x:756,y:414},{x:756,y:266},{x:1110,y:266}];
const LENGTHS=ROAD.slice(1).map((point,index)=>Math.hypot(point.x-ROAD[index].x,point.y-ROAD[index].y));
const ROAD_LENGTH=LENGTHS.reduce((sum,length)=>sum+length,0);
const GOLD='#edcb86',BLUE='#9ceeff',ORANGE='#ffbd83';
type Point={x:number;y:number};
type SpriteGround=Point&{top:number};
interface CollapseCrop{x:number;y:number;width:number;height:number;offsetX:number;offsetY:number;polygon?:number[][];}
interface CollapseAtlas{texture:string;sourceWidth:number;sourceHeight:number;canvasWidth:number;canvasHeight:number;groundX:number;groundY:number;reference:{canvasSize:number;scale:number;groundX:number;groundY:number};frames:CollapseCrop[];}
const collapseAtlas=decodeSpriteFrames(packedCollapseAtlas) as CollapseAtlas;

/** One route is shared by troops, structures and both projectile directions. */
export function siegeFieldPoint(distance:number):Point{
 let remaining=Math.max(0,Math.min(SIEGE_PATH_LENGTH,distance))/SIEGE_PATH_LENGTH*ROAD_LENGTH;
 for(let index=0;index<LENGTHS.length;index++){
  const length=LENGTHS[index];
  if(remaining<=length||index===LENGTHS.length-1){const ratio=Math.min(1,remaining/length),from=ROAD[index],to=ROAD[index+1];return{x:from.x+(to.x-from.x)*ratio,y:from.y+(to.y-from.y)*ratio};}
  remaining-=length;
 }
 return ROAD[ROAD.length-1];
}

/** Logical stops stay on the road; towers occupy their own firing platforms. */
export function siegeTargetPoint(target:SiegeTarget):Point{
 const point=siegeFieldPoint(target.distance);return{x:point.x+(target.placement?.x??0),y:point.y+(target.placement?.y??0)};
}

function identity(id:string){let value=0;for(const character of id)value=(value*31+character.charCodeAt(0))>>>0;return value;}
function canvas(width:number,height:number){const result=document.createElement('canvas');result.width=width;result.height=height;return result;}

/** Lightweight, same-origin story renderer. Gameplay never depends on image loading. */
export class SecretSiegeField{
 private context:CanvasRenderingContext2D;
 private images=new Map<string,HTMLImageElement>();
 private sprites=new Map<string,HTMLCanvasElement>();
 private grounds=new Map<string,SpriteGround>();
 private backdrop?:HTMLCanvasElement;
 private restoredBackdrop?:HTMLCanvasElement;
 private worldLight=0;
 private flame?:HTMLCanvasElement;
 private collapse?:HTMLCanvasElement;
 private disposed=false;
 private loadTask?:Promise<void>;
 private previousPhase='';
 private victoryTime=0;
 private lastDraw=0;
 private animationTime=0;
 private previousWallTime?:number;
 private bossPainter=new SiegeBossPainter();
 private bossImageTask?:Promise<void>;
 constructor(private element:HTMLCanvasElement,private model:SecretSiege){
  element.width=WIDTH;element.height=HEIGHT;
  const context=element.getContext('2d');if(!context)throw Error('Canvas 2D is unavailable');this.context=context;
 }
 setModel(model:SecretSiege){this.model=model;this.previousPhase='';this.previousWallTime=undefined;this.animationTime=0;this.backdrop=undefined;this.restoredBackdrop=undefined;this.worldLight=0;this.bossPainter.reset();if(model.stageId===10)void this.loadBossImage();}
 load():Promise<void>{
  return this.loadTask??=this.loadImages();
 }
 private async loadImages(){
  const names=['terrain','props','flame-loop-v1',collapseAtlas.texture,SIEGE_ARMY_WALK,SIEGE_ARMY_ATTACK,SIEGE_FORTIFICATIONS];
  await Promise.allSettled(names.map(name=>new Promise<void>(resolve=>{
   const image=new Image();let finished=false;
   const finish=(success:boolean)=>{if(finished)return;finished=true;clearTimeout(timeout);image.onload=image.onerror=null;if(success&&!this.disposed)this.images.set(name,image);resolve();};
   const timeout=setTimeout(()=>finish(false),12000);image.onload=()=>finish(true);image.onerror=()=>finish(false);image.src=artURL(name);
  })));
  if(this.disposed)return;
  for(const sheet of [SIEGE_ARMY_WALK,SIEGE_ARMY_ATTACK,SIEGE_FORTIFICATIONS]){
   const source=this.images.get(sheet);if(!source)continue;
   const atlas=canvas(HERO_SPRITE_CELL*4,HERO_SPRITE_CELL*3),context=atlas.getContext('2d');
   if(context){drawSiegeSpriteAtlas(context,sheet,source);this.sprites.set(sheet,atlas);for(let row=0;row<3;row++)this.grounds.set(sheet+':'+row,this.measureGround(context,row));}
  }
  const source=this.images.get('flame-loop-v1');
  if(source){
   try{
    const spec=ambientAtlas.flame,normalized=canvas(spec.sourceWidth,spec.sourceHeight);normalized.getContext('2d')!.drawImage(source,0,0,normalized.width,normalized.height);
    const output=canvas(spec.canvasWidth*3,spec.canvasHeight*3);drawStationaryAmbientAtlas(output.getContext('2d')!,'flame',normalized,spec);this.flame=output;
   }catch{this.flame=undefined;}
  }
  const demise=this.images.get(collapseAtlas.texture);
  if(demise){
   const spec=collapseAtlas,atlas=canvas(spec.canvasWidth*4,spec.canvasHeight*4),context=atlas.getContext('2d')!;
   spec.frames.forEach((frame,index)=>{
    context.save();context.translate(index%4*spec.canvasWidth+frame.offsetX-frame.x,Math.floor(index/4)*spec.canvasHeight+frame.offsetY-frame.y);
    context.beginPath();context.rect(frame.x,frame.y,frame.width,frame.height);context.clip();
    if(frame.polygon){context.beginPath();frame.polygon.forEach(([x,y],i)=>i?context.lineTo(x,y):context.moveTo(x,y));context.closePath();context.clip();}
    context.drawImage(demise,0,0,spec.sourceWidth,spec.sourceHeight);context.restore();
   });this.collapse=atlas;
  }
  this.backdrop=this.createBackdrop();
  if(this.model.stageId===10)await this.loadBossImage();
 }
 private loadBossImage():Promise<void>{
  return this.bossImageTask??=new Promise(resolve=>{
   const name='monster-wizard-v1',image=new Image();let finished=false;
   const finish=(success:boolean)=>{if(finished)return;finished=true;clearTimeout(timeout);image.onload=image.onerror=null;if(success&&!this.disposed)this.images.set(name,image);resolve();};
   const timeout=setTimeout(()=>finish(false),12000);image.onload=()=>finish(true);image.onerror=()=>finish(false);image.src=artURL(name);
  });
 }
 private measureGround(context:CanvasRenderingContext2D,row:number):SpriteGround{
  const data=context.getImageData(0,row*HERO_SPRITE_CELL,HERO_SPRITE_CELL,HERO_SPRITE_CELL).data;
  let left=HERO_SPRITE_CELL,right=-1,top=HERO_SPRITE_CELL,bottom=-1;
  for(let y=0;y<HERO_SPRITE_CELL;y++)for(let x=0;x<HERO_SPRITE_CELL;x++)if(data[(y*HERO_SPRITE_CELL+x)*4+3]>=32){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
  return bottom<0?{x:HERO_SPRITE_CELL/2,y:HERO_SPRITE_CELL,top:0}:{x:(left+right+1)/2,y:bottom+1,top};
 }
 private ground(sheet:string,row:number){return this.grounds.get(sheet+':'+row)??{x:HERO_SPRITE_CELL/2,y:HERO_SPRITE_CELL,top:0};}
 draw(timeSeconds:number,reducedMotion=false){
  if(this.disposed)return;
  const delta=this.previousWallTime===undefined?0:Math.max(0,Math.min(.1,timeSeconds-this.previousWallTime));this.previousWallTime=timeSeconds;
  if(this.model.phase!=='paused')this.animationTime+=delta;
  if(this.model.phase==='won'&&this.previousPhase!=='won')this.victoryTime=timeSeconds;
  this.previousPhase=this.model.phase;this.lastDraw=timeSeconds;
  this.worldLight=this.model.phase==='won'&&this.model.stageId===10?secretSiegeWorldLight(timeSeconds-this.victoryTime,reducedMotion):0;
  const context=this.context;context.clearRect(0,0,WIDTH,HEIGHT);
  this.backdrop??=this.createBackdrop();context.drawImage(this.backdrop,0,0);
  if(this.worldLight>0){this.restoredBackdrop??=this.createBackdrop(true);context.save();context.globalAlpha=this.worldLight;context.drawImage(this.restoredBackdrop,0,0);context.restore();}
  this.camp(reducedMotion);
  this.bossPainter.warning(context,this.model,siegeFieldPoint,this.animationTime,reducedMotion);
  const units=[...this.model.units].filter(unit=>unit.hp>0),targets=this.model.targets;
  const objects=[...targets.map(target=>({y:siegeTargetPoint(target).y,draw:()=>this.target(target,reducedMotion)})),...units.map(unit=>({y:this.unitPoint(unit).y,draw:()=>this.unit(unit,reducedMotion)}))];
  objects.sort((left,right)=>left.y-right.y).forEach(object=>object.draw());
  for(const projectile of this.model.projectiles)this.projectile(projectile,reducedMotion);
  this.embers(reducedMotion);
  context.save();context.strokeStyle='#c1aa7960';context.lineWidth=2;context.strokeRect(10,10,WIDTH-20,HEIGHT-20);context.restore();
 }
 private createBackdrop(restored=false){
  const output=canvas(WIDTH,HEIGHT),context=output.getContext('2d')!;context.fillStyle='#182026';context.fillRect(0,0,WIDTH,HEIGHT);
  const terrain=this.images.get('terrain');
  if(restored)context.filter='brightness(1.9) saturate(.85)';
  if(terrain)for(let y=0;y<HEIGHT;y+=120)for(let x=0;x<WIDTH;x+=120)context.drawImage(terrain,0,0,terrain.width/2,terrain.height/2,x,y,120,120);
  context.filter='none';context.fillStyle=restored?'#7da16a3b':`rgba(9,16,28,${.48+this.model.stage.darkness*.18})`;context.fillRect(0,0,WIDTH,HEIGHT);
  if(restored){for(const[x,y,radius]of [[110,115,210],[430,570,260],[870,100,230],[1160,520,240]]){const growth=context.createRadialGradient(x,y,10,x,y,radius);growth.addColorStop(0,'#8eaf6466');growth.addColorStop(1,'#57875600');context.fillStyle=growth;context.fillRect(x-radius,y-radius,radius*2,radius*2);}}
  const path=()=>{context.beginPath();ROAD.forEach((point,index)=>index?context.lineTo(point.x,point.y):context.moveTo(point.x,point.y));};
  context.lineJoin='round';context.lineCap='round';path();context.lineWidth=84;context.strokeStyle='#05090cb3';context.stroke();path();context.lineWidth=68;context.strokeStyle='#9c81564d';context.stroke();
  for(let index=0;index<ROAD.length-1;index++){
   const first=ROAD[index],second=ROAD[index+1],x=Math.min(first.x,second.x)-29,y=Math.min(first.y,second.y)-29,width=Math.abs(first.x-second.x)+58,height=Math.abs(first.y-second.y)+58;
   context.save();context.beginPath();context.rect(x,y,width,height);context.clip();context.fillStyle='#645035';context.fillRect(x,y,width,height);
   if(restored)context.filter='brightness(1.55) saturate(.9)';
   if(terrain)for(let ty=y;ty<y+height;ty+=72)for(let tx=x;tx<x+width;tx+=72)context.drawImage(terrain,terrain.width/2,0,terrain.width/2,terrain.height/2,tx,ty,72,72);
   context.filter='none';context.fillStyle=restored?'#c1a45619':'#3b2d1d4d';context.fillRect(x,y,width,height);context.restore();
  }
  const props=this.images.get('props');
  if(props){
   const decorations=[[160,162,0,58],[545,135,8,55],[870,475,0,72],[1134,451,8,82],[322,518,7,64],[65,183,8,72],[640,230,7,58],[1002,520,0,50],[148,486,6,54],[834,156,8,45]];
   context.save();context.globalAlpha=.75;
   for(const[x,y,index,size]of decorations)this.cell(context,props,3,3,index,x-size/2,y-size/2,size,size);
   context.restore();
  }
  const vignette=context.createRadialGradient(600,320,170,600,320,710);vignette.addColorStop(0,restored?'#fff3af18':'#02061200');vignette.addColorStop(1,restored?'#b6ca7710':`rgba(2,6,18,${.52+this.model.stage.darkness*.2})`);context.fillStyle=vignette;context.fillRect(0,0,WIDTH,HEIGHT);
  context.strokeStyle='#bb9d654d';context.lineWidth=1;context.beginPath();context.moveTo(34,68);context.lineTo(310,68);context.moveTo(890,548);context.lineTo(1166,548);context.stroke();
  context.font='600 17px system-ui,sans-serif';context.fillStyle=restored?'#ffe6a9':'#c6b28a';context.fillText(restored?'세계를 구하는 원정대':'새벽 원정대',34,51);context.textAlign='right';context.fillStyle=restored?'#fff3c6':'#d4afca';context.fillText(restored?'빛을 되찾은 왕국':`${this.model.stageId} · ${this.model.stage.name}`,1166,576);
  return output;
 }
 private cell(context:CanvasRenderingContext2D,image:CanvasImageSource,columns:number,rows:number,index:number,x:number,y:number,width:number,height:number){
  const source=image as HTMLImageElement,cw=source.width/columns,ch=source.height/rows;context.drawImage(image,index%columns*cw,Math.floor(index/columns)*ch,cw,ch,x,y,width,height);
 }
 private label(x:number,y:number,text:string,color=GOLD,size=19){
  const context=this.context;context.save();context.font=`700 ${size}px system-ui,sans-serif`;context.textAlign='center';context.textBaseline='middle';const width=context.measureText(text).width+18;context.fillStyle='#080d14de';context.beginPath();context.roundRect(x-width/2,y-14,width,28,5);context.fill();context.fillStyle=color;context.fillText(text,x,y);context.restore();
 }
 private health(x:number,y:number,width:number,hp:number,maxHp:number,friendly=false){
  const context=this.context;context.save();context.fillStyle='#080c12';context.strokeStyle=friendly?'#6ac8dd':'#c49261';context.lineWidth=1.5;context.beginPath();context.roundRect(x-width/2,y,width,11,3);context.fill();context.stroke();context.fillStyle=friendly?'#5cc1d6':'#d69757';const fill=Math.max(0,Math.min(1,hp/maxHp))*(width-4);if(fill>0)context.fillRect(x-width/2+2,y+2,fill,7);context.restore();
 }
 private flameImage(x:number,y:number,width:number,height:number,reducedMotion:boolean){
  const context=this.context;
  if(this.flame){const frame=reducedMotion?0:Math.floor(this.animationTime*5)%9,spec=ambientAtlas.flame;context.drawImage(this.flame,frame%3*spec.canvasWidth,Math.floor(frame/3)*spec.canvasHeight,spec.canvasWidth,spec.canvasHeight,x-width/2,y-height,width,height);}
  else{const source=this.images.get('props');if(source)this.cell(context,source,3,3,2,x-width/2,y-height,width,height);else{context.fillStyle='#57616d';context.fillRect(x-width*.3,y-height*.65,width*.6,height*.65);context.fillStyle='#f7ac55';context.beginPath();context.ellipse(x,y-height*.7,width*.13,height*.22,0,0,Math.PI*2);context.fill();}}
 }
 private camp(reducedMotion:boolean){
  const context=this.context,point=siegeFieldPoint(0);context.save();const glow=context.createRadialGradient(point.x,point.y-20,5,point.x,point.y-20,100);glow.addColorStop(0,'#68cde237');glow.addColorStop(1,'#68cde200');context.fillStyle=glow;context.fillRect(point.x-100,point.y-120,200,200);this.flameImage(point.x,point.y+4,116,122,reducedMotion);context.restore();this.label(point.x,point.y+31,'원정대',BLUE,18);
 }
 private target(target:SiegeTarget,reducedMotion:boolean){
  const point=siegeTargetPoint(target),context=this.context,castle=target.kind==='castle',venom=target.towerKind==='venom',color=venom?'#a7ea61':'#dca1ff';
  if(target.kind==='boss'){this.bossPainter.body(context,this.model,target,point,this.images.get('monster-wizard-v1'),this.animationTime,reducedMotion);this.impact(point.x,point.y-76,target.lastHit,false,reducedMotion);return;}
  context.save();
  if(target.hp<=0){
   if(castle){
    const age=Math.max(0,this.lastDraw-this.victoryTime),sheet=collapseAtlas,frame=reducedMotion?15:Math.min(15,Math.floor(age*10));
    if(this.collapse){const reference=sheet.reference,ratio=CITADEL_SIZE/reference.canvasSize,scale=reference.scale*ratio;context.drawImage(this.collapse,frame%4*sheet.canvasWidth,Math.floor(frame/4)*sheet.canvasHeight,sheet.canvasWidth,sheet.canvasHeight,point.x-sheet.groundX*scale,point.y-sheet.groundY*scale,sheet.canvasWidth*scale,sheet.canvasHeight*scale);}
    else this.rubble(point.x,point.y,100);
    this.label(point.x,point.y+36,'마법사의 성 · 함락',GOLD,20);
   }else{this.rubble(point.x,point.y,76);this.label(point.x,point.y+31,'돌파',BLUE,17);}
   context.restore();return;
  }
  const size=castle?CITADEL_SIZE:142,row=castle?2:venom?1:0,age=this.model.elapsed-target.lastHit,pose=castle&&!reducedMotion&&age>=0&&age<.48?Math.min(3,1+Math.floor(age/.16)):0;
  context.fillStyle='#08051280';context.beginPath();context.ellipse(point.x,point.y+5,size*.38,size*.11,0,0,Math.PI*2);context.fill();
  if(!castle){context.strokeStyle=venom?'#a7ea6159':'#dca1ff59';context.lineWidth=2;context.beginPath();context.ellipse(point.x,point.y+4,size*.42,17,0,0,Math.PI*2);context.stroke();}
  const aura=reducedMotion?1:1+Math.sin(this.animationTime*1.3)*.08,glow=context.createRadialGradient(point.x,point.y-size*.42,3,point.x,point.y-size*.42,size*.68);
  glow.addColorStop(0,`rgba(158,60,227,${.16*aura})`);glow.addColorStop(1,'#ad54e700');context.fillStyle=glow;context.fillRect(point.x-size*.7,point.y-size*1.12,size*1.4,size*1.4);
  const atlas=this.sprites.get(SIEGE_FORTIFICATIONS),ground=this.ground(SIEGE_FORTIFICATIONS,row),reference=collapseAtlas.reference,groundX=castle?reference.groundX:ground.x,groundY=castle?reference.groundY:ground.y,scale=size/HERO_SPRITE_CELL;
  if(atlas)context.drawImage(atlas,pose*HERO_SPRITE_CELL,row*HERO_SPRITE_CELL,HERO_SPRITE_CELL,HERO_SPRITE_CELL,point.x-groundX*scale,point.y-groundY*scale,size,size);
  else{context.fillStyle='#43364b';context.fillRect(point.x-size*.29,point.y-size*.62,size*.58,size*.62);context.fillStyle='#b16bef';context.beginPath();context.arc(point.x,point.y-size*.7,size*.12,0,Math.PI*2);context.fill();}
  this.magicCore(target,size,reducedMotion);
  if(castle)this.bossPainter.castleWard(context,this.model,point,this.animationTime,reducedMotion);
  const top=point.y-(groundY-ground.top)*scale-18;this.health(point.x,top,castle?158:116,target.hp,target.maxHp);this.label(point.x,top-18,`${numberText(target.hp)} / ${numberText(target.maxHp)}`,ORANGE,castle?20:17);this.label(point.x,point.y+30,target.name,ORANGE,castle?21:17);
  if(!castle)this.label(point.x,point.y+60,`마력탄 ${numberText(target.attack)}`,color,16);
  this.impact(point.x,point.y-size*.4,target.lastHit,false,reducedMotion);
  context.restore();
 }
 private muzzle(target:SiegeTarget){const point=siegeTargetPoint(target);if(target.kind==='boss')return siegeBossMuzzle(point);const castle=target.kind==='castle',size=castle?CITADEL_SIZE:142,row=castle?2:target.towerKind==='venom'?1:0,ground=this.ground(SIEGE_FORTIFICATIONS,row),height=((castle?collapseAtlas.reference.groundY:ground.y)-ground.top)*size/HERO_SPRITE_CELL;return{x:point.x,y:point.y-height*(castle?.56:.76)};}
 private magicCore(target:SiegeTarget,size:number,reducedMotion:boolean){
  const context=this.context,point=this.muzzle(target),venom=target.towerKind==='venom',color=venom?'#a6ff60':'#d282ff',active=this.model.phase==='playing',charge=active?Math.max(0,Math.min(1,1-target.reload/target.cooldown)):0,ambient=reducedMotion?0:Math.sin(this.animationTime*1.6+target.distance)*.05,radius=size*(.1+charge*.035),glow=context.createRadialGradient(point.x,point.y,1,point.x,point.y,radius*2.4);
  glow.addColorStop(0,venom?`rgba(170,255,85,${.24+charge*.18+ambient})`:`rgba(205,125,255,${.24+charge*.18+ambient})`);glow.addColorStop(1,venom?'#a6ff6000':'#d282ff00');context.fillStyle=glow;context.fillRect(point.x-radius*2.4,point.y-radius*2.4,radius*4.8,radius*4.8);
  const shotAge=this.model.elapsed-(target.lastShot??-Infinity);
  if(shotAge>=0&&shotAge<.36){context.save();context.globalAlpha=(1-shotAge/.36)*.9;context.strokeStyle=color;context.lineWidth=3;context.beginPath();context.arc(point.x,point.y,reducedMotion?15:9+shotAge*48,0,Math.PI*2);context.stroke();context.fillStyle='#fff5d5';context.beginPath();context.arc(point.x,point.y,5,0,Math.PI*2);context.fill();context.restore();}
 }
 private rubble(x:number,y:number,size:number){const image=this.images.get('props');if(image)this.cell(this.context,image,3,3,8,x-size/2,y-size*.5,size,size*.7);else{this.context.fillStyle='#635967';this.context.beginPath();this.context.ellipse(x,y,size/2,size/5,0,0,Math.PI*2);this.context.fill();}}
 private unitPoint(unit:SiegeUnit){const point=siegeFieldPoint(unit.distance),seed=identity(unit.id);return{x:point.x-(seed%4)*9,y:point.y+(Math.floor(seed/4)%5-2)*12};}
 private unit(unit:SiegeUnit,reducedMotion:boolean){
  const spec=ARMY.find(value=>value.id===unit.typeId)!;if(!spec)return;const context=this.context,point=this.unitPoint(unit),seed=identity(unit.id),moving=this.model.phase==='playing'&&!unit.attacking&&!reducedMotion,size=unit.typeId==='guard'?83:76;
  const cycle=this.animationTime*2.6+seed%11,attackAge=this.model.elapsed-(unit.lastShot??-Infinity),attacking=unit.attacking&&attackAge>=0&&attackAge<Math.min(.7,spec.cooldown),sheet=attacking?SIEGE_ARMY_ATTACK:SIEGE_ARMY_WALK,pose=reducedMotion?0:attacking?Math.min(3,Math.max(0,Math.floor(attackAge/Math.min(.175,spec.cooldown/4)))):moving?Math.floor(cycle)%4:0,bob=moving?Math.sin(cycle*Math.PI*.5)*.7:0;
  context.save();context.fillStyle='#050b0e80';context.beginPath();context.ellipse(point.x,point.y+5,size*.32,9,0,0,Math.PI*2);context.fill();context.strokeStyle='#70e2ef95';context.lineWidth=2;context.beginPath();context.ellipse(point.x,point.y+3,size*.32,10,0,0,Math.PI*2);context.stroke();
  const atlas=this.sprites.get(sheet),ground=this.ground(SIEGE_ARMY_WALK,spec.row),scale=size/HERO_SPRITE_CELL,top=point.y-(ground.y-ground.top)*scale;
  if(atlas){const target=this.model.targets.find(value=>value.hp>0),left=unit.attacking&&target&&siegeTargetPoint(target).x<point.x;context.save();context.translate(point.x,0);if(left)context.scale(-1,1);context.drawImage(atlas,pose*HERO_SPRITE_CELL,spec.row*HERO_SPRITE_CELL,HERO_SPRITE_CELL,HERO_SPRITE_CELL,-ground.x*scale,point.y-ground.y*scale+bob,size,size);context.restore();}
  else{context.fillStyle=unit.typeId==='guard'?'#c2c8ca':unit.typeId==='striker'?'#51c7b7':'#89b8ff';context.beginPath();context.arc(point.x,point.y-31,17,0,Math.PI*2);context.fill();context.fillRect(point.x-13,point.y-29,26,28);}
  this.health(point.x,top-12,57,unit.hp,unit.maxHp,true);
  this.bossPainter.unitStatus(context,this.model,unit,point,top);
  if(this.model.units.filter(value=>value.hp>0).length<=4||this.model.elapsed-unit.lastHit<1.5)this.label(point.x,top-27,numberText(unit.hp),BLUE,15);
  this.impact(point.x,point.y-32,unit.lastHit,true,reducedMotion);context.restore();
 }
 private impact(x:number,y:number,lastHit:number,friendly:boolean,reducedMotion:boolean){
  const age=this.model.elapsed-lastHit;if(lastHit<=0||age<0||age>.6)return;const context=this.context;context.save();context.strokeStyle=friendly?'#ffbd9a':'#a4f1ff';context.lineWidth=3;context.globalAlpha=(1-age/.6)*.8;context.beginPath();context.arc(x,y,reducedMotion?30:18+age*58,0,Math.PI*2);context.stroke();context.restore();
 }
 private projectile(projectile:SiegeProjectile,reducedMotion:boolean){
  const context=this.context,from=siegeFieldPoint(projectile.fromDistance),to=siegeFieldPoint(projectile.toDistance),friendly=projectile.source==='army',unit=!friendly?this.model.units.find(value=>value.id===projectile.targetId):undefined,sourceUnit=friendly?this.model.units.find(value=>value.id===projectile.sourceId):undefined,target=friendly?this.model.targets.find(value=>value.id===projectile.targetId):undefined,source=!friendly?this.model.targets.find(value=>value.id===projectile.sourceId)??this.model.targets.find(value=>value.distance===projectile.fromDistance):undefined,venom=source?.towerKind==='venom';
  from.y-=friendly?32:76;to.y-=friendly?72:32;
  if(unit){const visual=this.unitPoint(unit);to.x=visual.x;to.y=visual.y-32;}
  if(sourceUnit){const visual=this.unitPoint(sourceUnit);from.x=visual.x;from.y=visual.y-32;}
  if(target){const visual=siegeTargetPoint(target);to.x=visual.x;to.y=visual.y-(target.kind==='boss'?82:(target.kind==='castle'?CITADEL_SIZE:142)*.4);}
  if(source){const visual=this.muzzle(source);from.x=visual.x;from.y=visual.y;}
  const ratio=Math.max(0,Math.min(1,projectile.age/projectile.duration)),arc=Math.min(74,Math.abs(to.x-from.x)*.2+28),sample=(progress:number)=>({x:from.x+(to.x-from.x)*progress,y:from.y+(to.y-from.y)*progress-Math.sin(progress*Math.PI)*arc});
  const point=sample(ratio),tail=sample(Math.max(0,ratio-.19));context.save();context.lineCap='round';context.strokeStyle=friendly?'#9ef7e4':venom?'#b5f46f':'#eea1ff';context.shadowColor=friendly?'#37e7e6':venom?'#9be241':'#d669ff';context.shadowBlur=reducedMotion?0:15;context.lineWidth=friendly?5:7;context.beginPath();context.moveTo(tail.x,tail.y);context.lineTo(point.x,point.y);context.stroke();context.fillStyle='#fff8de';context.beginPath();context.arc(point.x,point.y,friendly?6:8,0,Math.PI*2);context.fill();context.strokeStyle=friendly?'#53dce5':venom?'#80c943':'#be66e8';context.lineWidth=2;context.stroke();context.restore();
 }
 private embers(reducedMotion:boolean){
  if(reducedMotion)return;const context=this.context;context.save();
  for(let index=0;index<10;index++){const x=930+(index*67)%220,y=130+(index*43+this.animationTime*11)%150,alpha=(.13+Math.sin(this.animationTime*.8+index)*.09)*(1-this.worldLight);context.fillStyle=`rgba(215,145,255,${alpha})`;context.beginPath();context.arc(x,y,1.5,0,Math.PI*2);context.fill();}
  if(this.worldLight>0){context.globalAlpha=this.worldLight;const dawn=context.createRadialGradient(1050,100,10,1000,140,950);dawn.addColorStop(0,'#ffe4a53b');dawn.addColorStop(1,'#ffe4a500');context.fillStyle=dawn;context.fillRect(0,0,WIDTH,HEIGHT);for(let index=0;index<14;index++){const x=(index*193+this.animationTime*9)%WIDTH,y=80+(index*71)%450+Math.sin(this.animationTime*.5+index)*8;context.fillStyle='#ffe8af88';context.beginPath();context.ellipse(x,y,3.5,1.5,index,0,Math.PI*2);context.fill();}}
  context.restore();
 }
 dispose(){this.disposed=true;this.images.clear();this.sprites.clear();this.grounds.clear();this.backdrop=undefined;this.restoredBackdrop=undefined;this.flame=undefined;this.collapse=undefined;}
}
