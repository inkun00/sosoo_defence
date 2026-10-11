import frames from './hero-sprite-frames.json';
import {artURL} from './art';

export const HERO_SPRITE_CELL=224;
interface HeroFrame{x:number;y:number;width:number;height:number;polygon?:number[][];}
interface HeroSheet{width:number;height:number;rows:HeroFrame[][];}
let portraitSerial=0;

export function heroSpriteSheet(sheet:string):HeroSheet{
 const result=(frames as Record<string,HeroSheet>)[sheet];
 if(!result)throw Error('Unknown hero sprite sheet: '+sheet);
 return result;
}

export function heroSpriteViewport(sheet:string,row:number){
 const source=heroSpriteSheet(sheet),poses=source.rows[row];
 if(!poses)throw Error('Unknown hero sprite row: '+row);
 // Keep one viewport across all poses, preserving the original movement and
 // aspect ratio instead of separately centering each animation frame.
 const column=source.width/4,left=Math.min(...poses.map((f,i)=>f.x-i*column)),top=Math.min(...poses.map(f=>f.y));
 const width=Math.max(...poses.map((f,i)=>f.x+f.width-i*column))-left,height=Math.max(...poses.map(f=>f.y+f.height))-top;
 const side=Math.max(width,height)+8;
 return {scale:HERO_SPRITE_CELL/side,x:(side-width)/2-left,y:(side-height)/2-top,column};
}

function framePath(frame:HeroFrame){
 const points=frame.polygon??[[frame.x,frame.y],[frame.x+frame.width,frame.y],[frame.x+frame.width,frame.y+frame.height],[frame.x,frame.y+frame.height]];
 return 'M'+points.map(point=>point.join(' ')).join('L')+'Z';
}

export function heroSpriteHTML(sheet:string,row:number,className:string,animated=false){
 const source=heroSpriteSheet(sheet),viewport=heroSpriteViewport(sheet,row),id='hero-clip-'+(++portraitSerial),poses=animated?source.rows[row]:source.rows[row].slice(0,1);
 const clips=poses.map((frame,i)=>`<clipPath id="${id}-${i}" clipPathUnits="userSpaceOnUse"><path d="${framePath(frame)}"/></clipPath>`).join('');
 const images=poses.map((frame,i)=>`<g class="hero-sprite-frame" style="--hero-frame:${i}" transform="matrix(${viewport.scale} 0 0 ${viewport.scale} ${(viewport.x-i*viewport.column)*viewport.scale} ${viewport.y*viewport.scale})"><image href="${artURL(sheet)}" x="0" y="0" width="${source.width}" height="${source.height}" clip-path="url(#${id}-${i})"/></g>`).join('');
 return `<span class="${className}" aria-hidden="true"><svg class="hero-sprite${animated?' hero-sprite-animated':''}" data-hero-sheet="${sheet}" data-hero-row="${row}" viewBox="0 0 ${HERO_SPRITE_CELL} ${HERO_SPRITE_CELL}" xmlns="http://www.w3.org/2000/svg"><defs>${clips}</defs>${images}</svg></span>`;
}

/** Render audited vector masks once, then use ordinary cached Phaser frames. */
export function drawHeroSpriteAtlas(context:CanvasRenderingContext2D,sheet:string,image:CanvasImageSource){
 const source=heroSpriteSheet(sheet);
 context.clearRect(0,0,HERO_SPRITE_CELL*4,HERO_SPRITE_CELL*3);
 source.rows.forEach((poses,row)=>{
  const viewport=heroSpriteViewport(sheet,row);
  poses.forEach((frame,i)=>{
   context.save();context.translate(i*HERO_SPRITE_CELL,row*HERO_SPRITE_CELL);
   context.scale(viewport.scale,viewport.scale);context.translate(viewport.x-i*viewport.column,viewport.y);
   context.beginPath();context.rect(frame.x,frame.y,frame.width,frame.height);context.clip();
   if(frame.polygon){context.beginPath();frame.polygon.forEach(([x,y],index)=>index?context.lineTo(x,y):context.moveTo(x,y));context.closePath();context.clip();}
   context.drawImage(image,0,0,source.width,source.height);context.restore();
  });
 });
}
