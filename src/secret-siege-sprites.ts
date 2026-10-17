import {artURL} from './art';
import {heroSpriteSheet,HERO_SPRITE_CELL} from './hero-sprite';

export const SIEGE_ARMY_WALK='siege-human-army-walk-v1';
export const SIEGE_ARMY_ATTACK='siege-human-army-attack-v1';
export const SIEGE_FORTIFICATIONS='siege-corrupted-fortifications-v1';
type Frame=ReturnType<typeof heroSpriteSheet>['rows'][number][number];
const viewports=new Map<string,{scale:number;x:number;y:number}>();
let portraitSerial=0;

/** One cell-space viewport spans both human sheets, including weapon reach. */
export function siegeSpriteViewport(sheet:string,row:number){
 const family=sheet===SIEGE_ARMY_WALK||sheet===SIEGE_ARMY_ATTACK?[SIEGE_ARMY_WALK,SIEGE_ARMY_ATTACK]:[sheet],key=family.join('|')+':'+row;
 let viewport=viewports.get(key);if(viewport)return viewport;
 let left=Infinity,top=Infinity,right=-Infinity,bottom=-Infinity;
 for(const name of family){
  const source=heroSpriteSheet(name),unit=768/source.width,column=source.width/4,line=source.height/3;
  source.rows[row].forEach((frame,index)=>{
   left=Math.min(left,(frame.x-index*column)*unit);top=Math.min(top,(frame.y-row*line)*unit);
   right=Math.max(right,(frame.x+frame.width-index*column)*unit);bottom=Math.max(bottom,(frame.y+frame.height-row*line)*unit);
  });
 }
 const width=right-left,height=bottom-top,side=Math.max(width,height)+8;
 viewport={scale:HERO_SPRITE_CELL/side,x:(side-width)/2-left,y:(side-height)/2-top};viewports.set(key,viewport);return viewport;
}

function trace(context:CanvasRenderingContext2D,frame:Frame){
 context.beginPath();
 if(frame.polygon){frame.polygon.forEach(([x,y],index)=>index?context.lineTo(x,y):context.moveTo(x,y));context.closePath();}
 else context.rect(frame.x,frame.y,frame.width,frame.height);
 context.clip();
}

/** Audited silhouettes retain their source pixels; no neighbouring row leaks. */
export function drawSiegeSpriteAtlas(context:CanvasRenderingContext2D,sheet:string,image:CanvasImageSource){
 const source=heroSpriteSheet(sheet),column=source.width/4,line=source.height/3,unit=768/source.width;
 context.clearRect(0,0,HERO_SPRITE_CELL*4,HERO_SPRITE_CELL*3);
 source.rows.forEach((frames,row)=>{
  const viewport=siegeSpriteViewport(sheet,row),scale=viewport.scale*unit;
  frames.forEach((frame,index)=>{
   context.save();context.translate(index*HERO_SPRITE_CELL,row*HERO_SPRITE_CELL);
   context.scale(scale,scale);context.translate(viewport.x/unit-index*column,viewport.y/unit-row*line);
   trace(context,frame);context.drawImage(image,0,0,source.width,source.height);context.restore();
  });
 });
}

export function siegeArmySpriteHTML(row:number,className:string){
 const sheet=SIEGE_ARMY_WALK,source=heroSpriteSheet(sheet),frame=source.rows[row][0],viewport=siegeSpriteViewport(sheet,row),unit=768/source.width,scale=viewport.scale*unit,id='siege-human-clip-'+(++portraitSerial);
 const points=frame.polygon??[[frame.x,frame.y],[frame.x+frame.width,frame.y],[frame.x+frame.width,frame.y+frame.height],[frame.x,frame.y+frame.height]],path='M'+points.map(point=>point.join(' ')).join('L')+'Z';
 return `<span class="${className}" aria-hidden="true"><svg class="hero-sprite siege-army-sprite" data-hero-sheet="${sheet}" data-hero-row="${row}" viewBox="0 0 ${HERO_SPRITE_CELL} ${HERO_SPRITE_CELL}" xmlns="http://www.w3.org/2000/svg"><defs><clipPath id="${id}" clipPathUnits="userSpaceOnUse"><path d="${path}"/></clipPath></defs><g transform="matrix(${scale} 0 0 ${scale} ${viewport.x*viewport.scale} ${(viewport.y/unit-row*source.height/3)*scale})"><image href="${artURL(sheet)}" x="0" y="0" width="${source.width}" height="${source.height}" clip-path="url(#${id})"/></g></svg></span>`;
}
