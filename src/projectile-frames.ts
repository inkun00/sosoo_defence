import type Phaser from 'phaser';
import {PROJECTILE_SHEETS,type ProjectilePoint,type ProjectileTypeId,type TowerProjectileProfile} from './projectile-profiles';

export interface ProjectileFrameCrop{x:number;y:number;width:number;height:number;}
const COLUMNS=6,ROWS=4,ALPHA_THRESHOLD=8,PADDING=2;
const frameCrops=new WeakMap<Phaser.Textures.Texture,Map<ProjectileTypeId,Readonly<ProjectileFrameCrop>>>();

/** All six poses share one crop, so their illustrated core never changes axes. */
export function projectileRowCrop(pixels:ArrayLike<number>,width:number,height:number,row:number):ProjectileFrameCrop{
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<=0||height<=0||width%COLUMNS||height%ROWS||!Number.isInteger(row)||row<0||row>=ROWS||pixels.length<width*height*4)throw Error('Invalid projectile pixels');
 const cellWidth=width/COLUMNS,cellHeight=height/ROWS;
 let left=cellWidth,top=cellHeight,right=-1,bottom=-1;
 for(let column=0;column<COLUMNS;column++)for(let y=0;y<cellHeight;y++)for(let x=0;x<cellWidth;x++){
  // Tiny WebP alpha fringes extend across the entire otherwise empty cell.
  if(pixels[((row*cellHeight+y)*width+column*cellWidth+x)*4+3]<=ALPHA_THRESHOLD)continue;
  left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y);
 }
 if(right<left)return {x:0,y:0,width:cellWidth,height:cellHeight};
 left=Math.max(0,left-PADDING);top=Math.max(0,top-PADDING);
 right=Math.min(cellWidth,right+PADDING+1);bottom=Math.min(cellHeight,bottom+PADDING+1);
 return {x:left,y:top,width:right-left,height:bottom-top};
}

export function registerProjectileFrames(scene:Phaser.Scene):void{
 for(const sheet of PROJECTILE_SHEETS){
  if(!scene.textures.exists(sheet.key))continue;
  const texture=scene.textures.get(sheet.key);if(frameCrops.has(texture))continue;
  const source=texture.getSourceImage(),width=source.width,height=source.height;
  const crops=new Map<ProjectileTypeId,Readonly<ProjectileFrameCrop>>();frameCrops.set(texture,crops);
  let pixels:Uint8ClampedArray|undefined;
  try{
   const probe=document.createElement('canvas');probe.width=width;probe.height=height;
   const context=probe.getContext('2d',{willReadFrequently:true});
   if(context&&width%COLUMNS===0&&height%ROWS===0){
    context.drawImage(source as CanvasImageSource,0,0);
    pixels=context.getImageData(0,0,width,height).data;
   }
  }catch{/* Unreadable canvas retains the original cells and their core origins. */}
  for(const [row,id]of sheet.rows.entries()){
   // Existing frames belong to their original registration and keep its origin.
   const existing=Array.from({length:COLUMNS},(_,column)=>texture.has(id+'-'+column)).some(Boolean);
   const crop=pixels&&!existing?projectileRowCrop(pixels,width,height,row):undefined;
   for(let column=0;column<COLUMNS;column++){
    const name=id+'-'+column;if(texture.has(name))continue;
    const left=Math.round(column*width/COLUMNS),top=Math.round(row*height/ROWS);
    const cellWidth=Math.round((column+1)*width/COLUMNS)-left,cellHeight=Math.round((row+1)*height/ROWS)-top;
    texture.add(name,0,left+(crop?.x??0),top+(crop?.y??0),crop?.width??cellWidth,crop?.height??cellHeight);
   }
   if(crop)crops.set(id,Object.freeze({x:crop.x/(width/COLUMNS),y:crop.y/(height/ROWS),width:crop.width/(width/COLUMNS),height:crop.height/(height/ROWS)}));
  }
 }
}

export function projectileFrameOrigin(scene:Phaser.Scene,profile:TowerProjectileProfile):Readonly<ProjectilePoint>{
 if(profile.beam)return {x:.5,y:.5};
 if(!scene.textures.exists(profile.atlas))return profile.core;
 const crop=frameCrops.get(scene.textures.get(profile.atlas))?.get(profile.id);
 return crop?{x:(profile.core.x-crop.x)/crop.width,y:(profile.core.y-crop.y)/crop.height}:profile.core;
}
