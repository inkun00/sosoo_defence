import type Phaser from 'phaser';
import atlas from './ambient-atlas.json';
import {drawStationaryAmbientAtlas} from './ambient-animation';

export type AmbientKind=keyof typeof atlas;
export const AMBIENT_TEXTURES=Object.values(atlas).map(spec=>spec.texture);

// Ambient sheets have measured, nonuniform crops. Scale both crop boundaries
// and their shared trim canvas when the published texture is resized.
export function scaledAmbientAtlas(kind:AmbientKind,width:number,height:number){
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<=0||height<=0)throw Error('Invalid ambient texture dimensions');
 const spec=atlas[kind],sx=width/spec.sourceWidth,sy=height/spec.sourceHeight;
 const canvasWidth=Math.max(1,Math.round(spec.canvasWidth*sx)),canvasHeight=Math.max(1,Math.round(spec.canvasHeight*sy));
 const frames=spec.frames.map(f=>{
  const x=Math.min(width-1,Math.round(f.x*sx)),y=Math.min(height-1,Math.round(f.y*sy));
  const right=Math.min(width,Math.round((f.x+f.width)*sx)),bottom=Math.min(height,Math.round((f.y+f.height)*sy));
  const frameWidth=Math.max(1,right-x),frameHeight=Math.max(1,bottom-y);
  return {x,y,width:frameWidth,height:frameHeight,
   offsetX:Math.max(0,Math.min(canvasWidth-frameWidth,Math.round(f.offsetX*sx))),
   offsetY:Math.max(0,Math.min(canvasHeight-frameHeight,Math.round(f.offsetY*sy)))};
 });
 return {...spec,sourceWidth:width,sourceHeight:height,canvasWidth,canvasHeight,frames};
}

export function ambientTexture(kind:AmbientKind){return 'dungeon-'+atlas[kind].texture+(kind==='torch'?'':'-stationary');}

// Source PNGs stay untouched. Portal and flame frames share the exact same
// stone image, while only their inner energy comes from the animated source.
export function registerAmbientFrames(scene:Phaser.Scene){
 for(const kind of Object.keys(atlas) as AmbientKind[]){
  const texture=scene.textures.get('dungeon-'+atlas[kind].texture),source=texture.getSourceImage();
  const spec=scaledAmbientAtlas(kind,source.width,source.height);
  spec.frames.forEach((f,i)=>{
   const name=kind+'-'+i;if(texture.has(name))return;
   texture.add(name,0,f.x,f.y,f.width,f.height)?.setTrim(spec.canvasWidth,spec.canvasHeight,f.offsetX,f.offsetY,f.width,f.height);
  });
  const renderedKey=ambientTexture(kind);
  if(kind!=='torch'&&!scene.textures.exists(renderedKey)){
   try{
    const rendered=scene.textures.createCanvas(renderedKey,spec.canvasWidth*3,spec.canvasHeight*3);
    if(rendered){
     drawStationaryAmbientAtlas(rendered.getContext(),kind,source as HTMLImageElement,spec);
     spec.frames.forEach((_,i)=>rendered.add(kind+'-'+i,0,i%3*spec.canvasWidth,Math.floor(i/3)*spec.canvasHeight,spec.canvasWidth,spec.canvasHeight));
     rendered.refresh();
    }
   }catch{if(scene.textures.exists(renderedKey))scene.textures.remove(renderedKey);}
  }
  // A canvas failure holds the original first pose instead of reintroducing
  // the full-body loop. No network request or extra animation clock is needed.
  const canAnimate=scene.textures.exists(renderedKey),animationTexture=canAnimate?renderedKey:'dungeon-'+spec.texture;
  const key='ambient-'+kind;
  if(canAnimate&&!scene.anims.exists(key))scene.anims.create({key,frames:spec.frames.map((_,i)=>({key:animationTexture,frame:kind+'-'+i})),frameRate:spec.fps,repeat:-1});
 }
}

export class AmbientProps{
 private sprites=new Map<string,Phaser.GameObjects.Sprite>();
 private phases=new Map<string,number>();private paused=false;
 constructor(private scene:Phaser.Scene,private reducedMotion:boolean){}
 prepareRedraw(){
  for(const [id,sprite]of this.sprites)this.phases.set(id,Math.max(0,(sprite.anims.currentFrame?.index??1)-1));
  this.sprites.clear();
 }
 add(parent:Phaser.GameObjects.Container,id:string,kind:AmbientKind,x:number,y:number,width:number,height:number){
  const key=ambientTexture(kind),texture=this.scene.textures.exists(key)?key:'dungeon-'+atlas[kind].texture;
  const sprite=this.scene.add.sprite(x,y,texture,kind+'-0').setDisplaySize(width,height).setName('ambient-'+id);
  parent.add(sprite);this.sprites.set(id,sprite);
  if(texture===key&&!this.reducedMotion&&this.scene.anims.exists('ambient-'+kind)){sprite.play({key:'ambient-'+kind,startFrame:this.phases.get(id)??0});if(this.paused)sprite.anims.pause();}
  return sprite;
 }
 setPaused(paused:boolean){
  if(this.reducedMotion||this.paused===paused)return;this.paused=paused;
  for(const sprite of this.sprites.values()){if(paused)sprite.anims.pause();else sprite.anims.resume();}
 }
}
