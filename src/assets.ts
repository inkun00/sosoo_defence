import Phaser from 'phaser';
import {MONSTER_KINDS,MONSTERS} from './monsters';
import {TOWERS} from './towers';
import {AMBIENT_TEXTURES,registerAmbientFrames} from './ambient-props';

// Every illustrated texture in this skin is an original built-in imagegen output.
// Atlas cells are registered at runtime; the original PNG pixels and alpha are preserved.
export function loadDungeon(scene:Phaser.Scene){
 for(const name of ['terrain','ui','props','icons','slime','turret-parts-v1','fx-impact-v1','fx-utility-v1','tower-heads-a-v1','tower-heads-b-v1',...AMBIENT_TEXTURES])scene.load.image('dungeon-'+name,`/assets/dungeon/${name}.png`);
 for(const kind of MONSTER_KINDS.filter(k=>k!=='slime')){const atlas=MONSTERS[kind].atlas;scene.load.image('dungeon-'+atlas,`/assets/dungeon/${atlas}.png`);}
}
function cells(scene:Phaser.Scene,atlas:string,cols:number,rows:number,names:string[],trim=0){
 const texture=scene.textures.get('dungeon-'+atlas),source=texture.getSourceImage();
 names.forEach((name,i)=>{const cw=source.width/cols,ch=source.height/rows;
  const col=i%cols,row=Math.floor(i/cols),x=Math.round(col*cw),y=Math.round(row*ch),w=Math.round((col+1)*cw)-x,h=Math.round((row+1)*ch)-y;
  const topGuard=atlas==='props'&&name==='brick'?Math.round(ch*.08):0;
  texture.add(name,0,x+Math.round(cw*trim),y+Math.round(ch*trim)+topGuard,w-Math.round(cw*trim)*2,h-Math.round(ch*trim)*2-topGuard);
 });
}
export function registerDungeon(scene:Phaser.Scene){
 registerAmbientFrames(scene);
 cells(scene,'terrain',2,2,['floor','path','floor-alt','path-alt']);
 cells(scene,'ui',2,2,['panel','button','active','disabled']);
 cells(scene,'props',3,3,['rock','wall','base','portal','brick','torch','crate','plant','rubble']);
 cells(scene,'icons',4,4,['coin','heart','star','shield','menu','pause','play','close','hammer','book','sound','speed','shot-basic','shot-slow','shot-stun','shot-range']);
 cells(scene,'turret-parts-v1',3,2,['base','head-basic','head-slow','head-stun','head-range','muzzle-flash']);
 for(const sheet of ['a','b'])cells(scene,'tower-heads-'+sheet+'-v1',3,2,TOWERS.filter(t=>t.sheet===sheet).sort((a,b)=>a.frame-b.frame).map(t=>t.id));
 cells(scene,'fx-impact-v1',6,4,['basic','slow','stun','range'].flatMap(effect=>Array.from({length:6},(_,i)=>effect+'-'+i)));
 cells(scene,'fx-utility-v1',6,4,[...['muzzle','defeat','shockwave'].flatMap(effect=>Array.from({length:6},(_,i)=>effect+'-'+i)),'projectile-basic','projectile-slow','projectile-stun','projectile-range','particle-stone','particle-spark']);
 for(const kind of MONSTER_KINDS)cells(scene,MONSTERS[kind].atlas,4,4,Array.from({length:16},(_,i)=>kind+'-'+i));
 // Align every skin to its visible opaque frame, rather than the atlas cell's
 // uneven transparent margins. Original source images remain untouched.
 const aliases:Record<string,string>={panel_brown:'panel',panel_brown_dark:'panel',panel_brown_corners_a:'panel',button_brown:'button',button_red:'active',button_grey:'disabled'};
 const ui=scene.textures.get('dungeon-ui'),source=ui.getSourceImage() as HTMLImageElement;
 const bounds=new Map<string,{x:number;y:number;w:number;h:number}>();
 for(const [name,frameName]of Object.entries(aliases)){
  if(scene.textures.exists('ui-'+name))continue;const f=ui.get(frameName),canvas=document.createElement('canvas');canvas.width=canvas.height=128;
  let b=bounds.get(frameName);if(!b){
   const probe=document.createElement('canvas');probe.width=f.cutWidth;probe.height=f.cutHeight;
   const context=probe.getContext('2d',{willReadFrequently:true})!;context.drawImage(source,f.cutX,f.cutY,f.cutWidth,f.cutHeight,0,0,f.cutWidth,f.cutHeight);
   const pixels=context.getImageData(0,0,probe.width,probe.height).data;let left=probe.width,top=probe.height,right=-1,bottom=-1;
   for(let y=0;y<probe.height;y++)for(let x=0;x<probe.width;x++)if(pixels[(y*probe.width+x)*4+3]>180){left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y);}
   b=right<left?{x:0,y:0,w:f.cutWidth,h:f.cutHeight}:{x:left,y:top,w:right-left+1,h:bottom-top+1};bounds.set(frameName,b);
  }
  canvas.getContext('2d')!.drawImage(source,f.cutX+b.x,f.cutY+b.y,b.w,b.h,0,0,128,128);scene.textures.addCanvas('ui-'+name,canvas);
 }
}
