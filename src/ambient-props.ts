import type Phaser from 'phaser';
import atlas from './ambient-atlas.json';

export type AmbientKind=keyof typeof atlas;
export const AMBIENT_TEXTURES=Object.values(atlas).map(spec=>spec.texture);

// Source PNGs stay untouched. Trim offsets align the stationary stone base
// of every generated frame to one shared canvas, so only the magic/fire moves.
export function registerAmbientFrames(scene:Phaser.Scene){
 for(const [kind,spec]of Object.entries(atlas)){
  const texture=scene.textures.get('dungeon-'+spec.texture);
  spec.frames.forEach((f,i)=>{
   const name=kind+'-'+i;if(texture.has(name))return;
   texture.add(name,0,f.x,f.y,f.width,f.height)?.setTrim(spec.canvasWidth,spec.canvasHeight,f.offsetX,f.offsetY,f.width,f.height);
  });
  const key='ambient-'+kind;
  if(!scene.anims.exists(key))scene.anims.create({key,frames:spec.frames.map((_,i)=>({key:'dungeon-'+spec.texture,frame:kind+'-'+i})),frameRate:spec.fps,repeat:-1});
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
  const spec=atlas[kind],sprite=this.scene.add.sprite(x,y,'dungeon-'+spec.texture,kind+'-0').setDisplaySize(width,height).setName('ambient-'+id);
  parent.add(sprite);this.sprites.set(id,sprite);
  if(!this.reducedMotion){sprite.play({key:'ambient-'+kind,startFrame:this.phases.get(id)??0});if(this.paused)sprite.anims.pause();}
  return sprite;
 }
 setPaused(paused:boolean){
  if(this.reducedMotion||this.paused===paused)return;this.paused=paused;
  for(const sprite of this.sprites.values()){if(paused)sprite.anims.pause();else sprite.anims.resume();}
 }
}
