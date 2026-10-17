import {artURL} from './art';
import {drawHeroSpriteAtlas,HERO_SPRITE_CELL} from './hero-sprite';
import {drawStationaryAmbientAtlas} from './ambient-animation';
import ambientAtlas from './ambient-atlas.json';
import damageAtlas from './castle-damage-atlas.json';
import {numberText} from './math';
import {ARMY,SIEGE_PATH_LENGTH,type SiegeTarget,type SiegeUnit,type SiegeProjectile} from './secret-siege-types';
import type {SecretSiege} from './secret-siege-model';

const WIDTH=1200,HEIGHT=620;
const ROAD=[{x:82,y:402},{x:242,y:402},{x:242,y:266},{x:478,y:266},{x:478,y:414},{x:756,y:414},{x:756,y:266},{x:1110,y:266}];
const LENGTHS=ROAD.slice(1).map((point,index)=>Math.hypot(point.x-ROAD[index].x,point.y-ROAD[index].y));
const ROAD_LENGTH=LENGTHS.reduce((sum,length)=>sum+length,0);
const GOLD='#edcb86',BLUE='#9ceeff',ORANGE='#ffbd83';
type Point={x:number;y:number};

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

function identity(id:string){let value=0;for(const character of id)value=(value*31+character.charCodeAt(0))>>>0;return value;}
function canvas(width:number,height:number){const result=document.createElement('canvas');result.width=width;result.height=height;return result;}

/** Lightweight, same-origin story renderer. Gameplay never depends on image loading. */
export class SecretSiegeField{
 private context:CanvasRenderingContext2D;
 private images=new Map<string,HTMLImageElement>();
 private heroes=new Map<string,HTMLCanvasElement>();
 private backdrop?:HTMLCanvasElement;
 private flame?:HTMLCanvasElement;
 private disposed=false;
 private loadTask?:Promise<void>;
 private previousPhase='';
 private victoryTime=0;
 private lastDraw=0;
 private animationTime=0;
 private previousWallTime?:number;
 constructor(private element:HTMLCanvasElement,private model:SecretSiege){
  element.width=WIDTH;element.height=HEIGHT;
  const context=element.getContext('2d');if(!context)throw Error('Canvas 2D is unavailable');this.context=context;
 }
 setModel(model:SecretSiege){this.model=model;this.previousPhase='';this.previousWallTime=undefined;this.animationTime=0;}
 load():Promise<void>{
  return this.loadTask??=this.loadImages();
 }
 private async loadImages(){
  const names=['terrain','props','turret-parts-v1','tower-heads-a-v1','flame-loop-v1','castle-collapse-v1','heroes-level-6-v1','heroes-level-3-v1'];
  await Promise.allSettled(names.map(name=>new Promise<void>(resolve=>{
   const image=new Image();let finished=false;
   const finish=(success:boolean)=>{if(finished)return;finished=true;clearTimeout(timeout);image.onload=image.onerror=null;if(success&&!this.disposed)this.images.set(name,image);resolve();};
   const timeout=setTimeout(()=>finish(false),12000);image.onload=()=>finish(true);image.onerror=()=>finish(false);image.src=artURL(name);
  })));
  if(this.disposed)return;
  for(const sheet of ['heroes-level-6-v1','heroes-level-3-v1']){
   const source=this.images.get(sheet);if(!source)continue;
   const atlas=canvas(HERO_SPRITE_CELL*4,HERO_SPRITE_CELL*3),context=atlas.getContext('2d');
   if(context){drawHeroSpriteAtlas(context,sheet,source);this.heroes.set(sheet,atlas);}
  }
  const source=this.images.get('flame-loop-v1');
  if(source){
   try{
    const spec=ambientAtlas.flame,normalized=canvas(spec.sourceWidth,spec.sourceHeight);normalized.getContext('2d')!.drawImage(source,0,0,normalized.width,normalized.height);
    const output=canvas(spec.canvasWidth*3,spec.canvasHeight*3);drawStationaryAmbientAtlas(output.getContext('2d')!,'flame',normalized,spec);this.flame=output;
   }catch{this.flame=undefined;}
  }
  this.backdrop=this.createBackdrop();
 }
 draw(timeSeconds:number,reducedMotion=false){
  if(this.disposed)return;
  const delta=this.previousWallTime===undefined?0:Math.max(0,Math.min(.1,timeSeconds-this.previousWallTime));this.previousWallTime=timeSeconds;
  if(this.model.phase!=='paused')this.animationTime+=delta;
  if(this.model.phase==='won'&&this.previousPhase!=='won')this.victoryTime=timeSeconds;
  this.previousPhase=this.model.phase;this.lastDraw=timeSeconds;
  const context=this.context;context.clearRect(0,0,WIDTH,HEIGHT);
  this.backdrop??=this.createBackdrop();context.drawImage(this.backdrop,0,0);
  this.camp(reducedMotion);
  const units=[...this.model.units].filter(unit=>unit.hp>0),targets=this.model.targets;
  const objects=[...targets.map(target=>({y:siegeFieldPoint(target.distance).y,draw:()=>this.target(target,reducedMotion)})),...units.map(unit=>({y:this.unitPoint(unit).y,draw:()=>this.unit(unit,reducedMotion)}))];
  objects.sort((left,right)=>left.y-right.y).forEach(object=>object.draw());
  for(const projectile of this.model.projectiles)this.projectile(projectile,reducedMotion);
  this.embers(reducedMotion);
  context.save();context.strokeStyle='#c1aa7960';context.lineWidth=2;context.strokeRect(10,10,WIDTH-20,HEIGHT-20);context.restore();
 }
 private createBackdrop(){
  const output=canvas(WIDTH,HEIGHT),context=output.getContext('2d')!;context.fillStyle='#182026';context.fillRect(0,0,WIDTH,HEIGHT);
  const terrain=this.images.get('terrain');
  if(terrain)for(let y=0;y<HEIGHT;y+=120)for(let x=0;x<WIDTH;x+=120)context.drawImage(terrain,0,0,terrain.width/2,terrain.height/2,x,y,120,120);
  context.fillStyle='#09101cb3';context.fillRect(0,0,WIDTH,HEIGHT);
  const path=()=>{context.beginPath();ROAD.forEach((point,index)=>index?context.lineTo(point.x,point.y):context.moveTo(point.x,point.y));};
  context.lineJoin='round';context.lineCap='round';path();context.lineWidth=84;context.strokeStyle='#05090cb3';context.stroke();path();context.lineWidth=68;context.strokeStyle='#9c81564d';context.stroke();
  for(let index=0;index<ROAD.length-1;index++){
   const first=ROAD[index],second=ROAD[index+1],x=Math.min(first.x,second.x)-29,y=Math.min(first.y,second.y)-29,width=Math.abs(first.x-second.x)+58,height=Math.abs(first.y-second.y)+58;
   context.save();context.beginPath();context.rect(x,y,width,height);context.clip();context.fillStyle='#645035';context.fillRect(x,y,width,height);
   if(terrain)for(let ty=y;ty<y+height;ty+=72)for(let tx=x;tx<x+width;tx+=72)context.drawImage(terrain,terrain.width/2,0,terrain.width/2,terrain.height/2,tx,ty,72,72);
   context.fillStyle='#3b2d1d4d';context.fillRect(x,y,width,height);context.restore();
  }
  const props=this.images.get('props');
  if(props){
   const decorations=[[160,162,0,58],[545,135,8,55],[870,475,0,72],[1134,451,8,82],[322,518,7,64],[65,183,8,72],[640,230,7,58],[1002,520,0,50],[148,486,6,54],[834,156,8,45]];
   context.save();context.globalAlpha=.75;
   for(const[x,y,index,size]of decorations)this.cell(context,props,3,3,index,x-size/2,y-size/2,size,size);
   context.restore();
  }
  const vignette=context.createRadialGradient(600,320,170,600,320,710);vignette.addColorStop(0,'#02061200');vignette.addColorStop(1,'#020612b3');context.fillStyle=vignette;context.fillRect(0,0,WIDTH,HEIGHT);
  context.strokeStyle='#bb9d654d';context.lineWidth=1;context.beginPath();context.moveTo(34,68);context.lineTo(310,68);context.moveTo(890,548);context.lineTo(1166,548);context.stroke();
  context.font='600 17px system-ui,sans-serif';context.fillStyle='#c6b28a';context.fillText('새벽 원정대',34,51);context.textAlign='right';context.fillStyle='#d4afca';context.fillText('마법사의 마지막 요새',1166,576);
  return output;
 }
 private fortressWalls(context:CanvasRenderingContext2D,x:number,y:number,reducedMotion=false){
  context.save();context.fillStyle='#0a0812a6';context.beginPath();context.ellipse(x,y+10,128,36,0,0,Math.PI*2);context.fill();
  const props=this.images.get('props');
  for(const offset of [-72,72]){
   if(props)this.cell(context,props,3,3,1,x+offset-48,y-78,96,78);
   if(this.flame){const frame=reducedMotion?0:Math.floor(this.animationTime*5)%9,spec=ambientAtlas.flame;context.drawImage(this.flame,frame%3*spec.canvasWidth,Math.floor(frame/3)*spec.canvasHeight,spec.canvasWidth,spec.canvasHeight,x+offset-61,y-134,122,134);}
   else if(props)this.cell(context,props,3,3,2,x+offset-61,y-134,122,134);
   context.strokeStyle='#a9916a';context.lineWidth=2;context.beginPath();context.moveTo(x+offset,y-105);context.lineTo(x+offset,y-153);context.stroke();
   context.fillStyle='#5e365e';context.strokeStyle='#b990aa';context.lineWidth=1;context.beginPath();context.moveTo(x+offset,y-150);context.lineTo(x+offset+24,y-145);context.lineTo(x+offset+19,y-124);context.lineTo(x+offset,y-129);context.closePath();context.fill();context.stroke();
  }
  context.restore();
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
  const point=siegeFieldPoint(target.distance),context=this.context,castle=target.kind==='castle';
  context.save();
  if(target.hp<=0){
   if(castle){
    const age=Math.max(0,this.lastDraw-this.victoryTime),sheet=damageAtlas.collapse,image=this.images.get(sheet.texture),frame=sheet.frames[reducedMotion?15:Math.min(15,Math.floor(age*10))];
    if(!reducedMotion&&age<1){context.save();context.globalAlpha=1-age;this.fortressWalls(context,point.x,point.y);context.restore();}
    if(image){const scale=.53;context.drawImage(image,frame.x*image.width/sheet.sourceWidth,frame.y*image.height/sheet.sourceHeight,frame.width*image.width/sheet.sourceWidth,frame.height*image.height/sheet.sourceHeight,point.x-sheet.canvasWidth*scale/2+frame.offsetX*scale,point.y-sheet.canvasHeight*scale+frame.offsetY*scale,frame.width*scale,frame.height*scale);}
    else this.rubble(point.x,point.y,100);
    this.label(point.x,point.y+36,'마법사의 성 · 함락',GOLD,20);
   }else{this.rubble(point.x,point.y,76);this.label(point.x,point.y+31,'돌파',BLUE,17);}
   context.restore();return;
  }
  if(castle){
   this.fortressWalls(context,point.x,point.y,reducedMotion);const glow=context.createRadialGradient(point.x,point.y-70,5,point.x,point.y-70,140);glow.addColorStop(0,'#ad54e728');glow.addColorStop(1,'#ad54e700');context.fillStyle=glow;context.fillRect(point.x-140,point.y-210,280,280);this.flameImage(point.x,point.y+10,176,187,reducedMotion);
  }else{
   context.fillStyle='#05080a80';context.beginPath();context.ellipse(point.x,point.y+8,58,20,0,0,Math.PI*2);context.fill();const base=this.images.get('turret-parts-v1'),head=this.images.get('tower-heads-a-v1');
   if(base)this.cell(context,base,3,2,0,point.x-49,point.y-72,98,98);else{context.fillStyle='#4a4452';context.fillRect(point.x-37,point.y-65,74,80);}
   if(head)this.cell(context,head,3,2,target.distance<400?1:5,point.x-47,point.y-111,94,94);else{context.fillStyle='#c0855f';context.fillRect(point.x-11,point.y-109,22,65);}
  }
  const top=point.y-(castle?188:130);this.health(point.x,top,castle?158:116,target.hp,target.maxHp);this.label(point.x,top-18,`${numberText(target.hp)} / ${numberText(target.maxHp)}`,ORANGE,castle?20:17);this.label(point.x,point.y+36,target.name,ORANGE,castle?21:18);this.impact(point.x,point.y-55,target.lastHit,false,reducedMotion);
  context.restore();
 }
 private rubble(x:number,y:number,size:number){const image=this.images.get('props');if(image)this.cell(this.context,image,3,3,8,x-size/2,y-size*.5,size,size*.7);else{this.context.fillStyle='#635967';this.context.beginPath();this.context.ellipse(x,y,size/2,size/5,0,0,Math.PI*2);this.context.fill();}}
 private unitPoint(unit:SiegeUnit){const point=siegeFieldPoint(unit.distance),seed=identity(unit.id);return{x:point.x-(seed%4)*9,y:point.y+(Math.floor(seed/4)%5-2)*12};}
 private unit(unit:SiegeUnit,reducedMotion:boolean){
  const spec=ARMY.find(value=>value.id===unit.typeId)!;if(!spec)return;const context=this.context,point=this.unitPoint(unit),seed=identity(unit.id),moving=this.model.phase==='playing'&&!unit.attacking&&!reducedMotion,size=unit.typeId==='guard'?83:76;
  const cycle=this.animationTime*(unit.attacking ? .75 : 1.15)+seed%11,pose=reducedMotion?0:Math.floor(cycle)%4,bob=moving?Math.sin(cycle*Math.PI*2)*1.3:0;
  context.save();context.fillStyle='#050b0e80';context.beginPath();context.ellipse(point.x,point.y+5,size*.32,9,0,0,Math.PI*2);context.fill();context.strokeStyle='#70e2ef95';context.lineWidth=2;context.beginPath();context.ellipse(point.x,point.y+3,size*.32,10,0,0,Math.PI*2);context.stroke();
  const atlas=this.heroes.get(spec.sheet);
  if(atlas)context.drawImage(atlas,pose*HERO_SPRITE_CELL,spec.row*HERO_SPRITE_CELL,HERO_SPRITE_CELL,HERO_SPRITE_CELL,point.x-size/2,point.y-size+bob,size,size);
  else{context.fillStyle=unit.typeId==='guard'?'#c2c8ca':unit.typeId==='striker'?'#51c7b7':'#89b8ff';context.beginPath();context.arc(point.x,point.y-31,17,0,Math.PI*2);context.fill();context.fillRect(point.x-13,point.y-29,26,28);}
  this.health(point.x,point.y-size-2,57,unit.hp,unit.maxHp,true);
  if(this.model.units.filter(value=>value.hp>0).length<=4||this.model.elapsed-unit.lastHit<1.5)this.label(point.x,point.y-size-17,numberText(unit.hp),BLUE,15);
  this.impact(point.x,point.y-32,unit.lastHit,true,reducedMotion);context.restore();
 }
 private impact(x:number,y:number,lastHit:number,friendly:boolean,reducedMotion:boolean){
  const age=this.model.elapsed-lastHit;if(lastHit<=0||age<0||age>.6)return;const context=this.context;context.save();context.strokeStyle=friendly?'#ffbd9a':'#a4f1ff';context.lineWidth=3;context.globalAlpha=(1-age/.6)*.8;context.beginPath();context.arc(x,y,reducedMotion?30:18+age*58,0,Math.PI*2);context.stroke();context.restore();
 }
 private projectile(projectile:SiegeProjectile,reducedMotion:boolean){
  const context=this.context,from=siegeFieldPoint(projectile.fromDistance),to=siegeFieldPoint(projectile.toDistance),friendly=projectile.source==='army',unit=!friendly?this.model.units.find(value=>value.id===projectile.targetId):undefined;
  if(unit){const visual=this.unitPoint(unit);to.x=visual.x;to.y=visual.y;}
  from.y-=friendly?32:76;to.y-=friendly?72:32;
  const ratio=Math.max(0,Math.min(1,projectile.age/projectile.duration)),arc=Math.min(74,Math.abs(to.x-from.x)*.2+28),sample=(progress:number)=>({x:from.x+(to.x-from.x)*progress,y:from.y+(to.y-from.y)*progress-Math.sin(progress*Math.PI)*arc});
  const point=sample(ratio),tail=sample(Math.max(0,ratio-.19));context.save();context.lineCap='round';context.strokeStyle=friendly?'#9ef7e4':'#eea1ff';context.shadowColor=friendly?'#37e7e6':'#d669ff';context.shadowBlur=reducedMotion?0:15;context.lineWidth=5;context.beginPath();context.moveTo(tail.x,tail.y);context.lineTo(point.x,point.y);context.stroke();context.fillStyle='#fff8de';context.beginPath();context.arc(point.x,point.y,friendly?6:7,0,Math.PI*2);context.fill();context.strokeStyle=friendly?'#53dce5':'#be66e8';context.lineWidth=2;context.stroke();context.restore();
 }
 private embers(reducedMotion:boolean){
  if(reducedMotion)return;const context=this.context;context.save();
  for(let index=0;index<10;index++){const x=930+(index*67)%220,y=130+(index*43+this.animationTime*11)%150,alpha=.13+Math.sin(this.animationTime*.8+index)*.09;context.fillStyle=`rgba(215,145,255,${alpha})`;context.beginPath();context.arc(x,y,1.5,0,Math.PI*2);context.fill();}
  context.restore();
 }
 dispose(){this.disposed=true;this.images.clear();this.heroes.clear();this.backdrop=undefined;this.flame=undefined;}
}
