import Phaser from 'phaser';
import {artURL} from '../art';
import {sampleOpponentMotion,smoothPose,type OpponentMood,type OpponentMotion} from './opponent-motion';

export type {OpponentMood} from './opponent-motion';
export interface ComputerView {level:number;id:string;name:string;mood:OpponentMood;phrase:string;moodSince:number;}
export const OPPONENT_FRAMES:Record<OpponentMood,readonly number[]>={idle:[0,1],thinking:[2,3],cast:[4,5],hurt:[6,7],victory:[8,9],defeat:[10,11]};

/** Lives outside the rebuilt HUD so snapshots never restart the opponent's action. */
export class OpponentPortrait {
 private sprite?:Phaser.GameObjects.Sprite;
 private blendSprite?:Phaser.GameObjects.Sprite;
 private aura?:Phaser.GameObjects.Graphics;
 private bubble?:Phaser.GameObjects.Graphics;
 private speech?:Phaser.GameObjects.Text;
 private pending=new Map<number,()=>void>();
 private retryAt=new Map<number,number>();
 private last='';private spoken='';private changedAt=0;private spokenAt=0;
 private motionTime=0;private lastTick?:number;private paused=false;
 private lastMotion?:OpponentMotion;private enteringFrom?:number;
 private opponent?:ComputerView;private destroyed=false;
 private x=953;private y=403;private size=78;
 private pause=()=>{this.paused=true;this.lastTick=undefined;};
 private resume=()=>{this.paused=false;this.lastTick=undefined;this.sync(this.opponent);};
 private visibility=()=>{this.lastTick=undefined;if(!document.hidden&&!this.paused)this.sync(this.opponent);};
 constructor(private scene:Phaser.Scene,private reduced=false){scene.events.once('destroy',this.destroy,this);scene.events.on('pause',this.pause);scene.events.on('resume',this.resume);document.addEventListener('visibilitychange',this.visibility);}
 setPosition(x:number,y:number){this.x=x;this.y=y;this.update();}
 private hide(){this.sprite?.setVisible(false);this.blendSprite?.setVisible(false);this.aura?.setVisible(false);this.bubble?.setVisible(false);this.speech?.setVisible(false);this.lastTick=undefined;}
 private load(level:number,key:string){
  if(this.pending.has(level)||performance.now()<(this.retryAt.get(level)??0))return;
  const event='filecomplete-image-'+key;
  const cleanup=()=>{this.scene.load.off(event,complete);this.scene.load.off('loaderror',failed);this.pending.delete(level);};
  const failed=(file:Phaser.Loader.File)=>{if(file.key!==key)return;cleanup();this.retryAt.set(level,performance.now()+30000);};
  const complete=()=>{cleanup();if(this.destroyed)return;this.register(key);};
  this.pending.set(level,cleanup);this.scene.load.once(event,complete);this.scene.load.on('loaderror',failed);
  this.scene.load.image(key,artURL('cpu-opponent-'+level+'-v1'));if(!this.scene.load.isLoading())this.scene.load.start();
 }
 private register(key:string){
  const texture=this.scene.textures.get(key),source=texture.getSourceImage();
  for(let i=0;i<12;i++)if(!texture.has('pose-'+i)){
   const col=i%4,row=Math.floor(i/4),x=Math.round(col*source.width/4),y=Math.round(row*source.height/3);
   texture.add('pose-'+i,0,x,y,Math.round((col+1)*source.width/4)-x,Math.round((row+1)*source.height/3)-y);
  }
 }
 sync(opponent?:ComputerView){
  if(this.destroyed)return;
  this.opponent=opponent;
  if(!opponent){this.hide();this.last='';this.spoken='';this.lastMotion=undefined;this.enteringFrom=undefined;return;}
  if(this.paused||document.hidden){this.lastTick=undefined;return;}
  const key='cpu-opponent-'+opponent.level;
  if(!this.scene.textures.exists(key)){this.hide();this.load(opponent.level,key);return;}
  if(!this.scene.textures.get(key).has('pose-0'))this.register(key);
  if(!this.sprite){
   this.aura=this.scene.add.graphics().setDepth(11).setName('cpu-opponent-aura');
   this.sprite=this.scene.add.sprite(this.x,this.y,key,'pose-0').setDepth(12).setFlipX(true).setOrigin(.5,1).setName('cpu-opponent-character');
   this.blendSprite=this.scene.add.sprite(this.x,this.y,key,'pose-0').setDepth(12).setFlipX(true).setOrigin(.5,1).setName('cpu-opponent-character-blend');
   this.bubble=this.scene.add.graphics().setDepth(12).setName('cpu-opponent-bubble');
   this.speech=this.scene.add.text(0,0,'',{fontFamily:'Malgun Gothic, sans-serif',fontSize:14,fontStyle:'bold',color:'#ffe9b9',padding:{x:2,y:2}})
    .setOrigin(1,.5).setDepth(13).setName('cpu-opponent-speech');
  }
  // Repeated idle speech never restarts the long breathing/stance sequence.
  const token=key+'-'+opponent.mood+(opponent.mood==='idle'?'':'-'+opponent.moodSince);
  const event=key+'-'+opponent.mood+'-'+opponent.moodSince;
  if(token!==this.last){
   const sameCharacter=this.last.startsWith(key+'-');
   this.enteringFrom=sameCharacter&&this.lastMotion?(this.lastMotion.blend>.5?this.lastMotion.nextFrame:this.lastMotion.frame):undefined;
   this.last=token;this.changedAt=this.motionTime;
  }
  this.sprite.setVisible(true).setData('event',event).setData('mood',opponent.mood).setData('level',opponent.level);this.aura!.setVisible(true);
  const spoken=event+'-'+opponent.phrase;
  if(spoken!==this.spoken){this.spoken=spoken;this.spokenAt=this.motionTime;this.speech!.setText(opponent.phrase);}
  this.update();
 }
 update(){
  const sprite=this.sprite,opponent=this.opponent;if(this.destroyed||!sprite||(!sprite.visible&&!this.blendSprite?.visible)||!opponent)return;
  if(this.paused||document.hidden){this.lastTick=undefined;return;}
  const tick=this.scene.time.now;
  if(this.lastTick!==undefined)this.motionTime+=Math.max(0,Math.min(80,tick-this.lastTick));
  this.lastTick=tick;
  const now=this.motionTime,age=Math.max(0,now-this.changedAt),mood=opponent.mood,key='cpu-opponent-'+opponent.level;
  const motion=sampleOpponentMotion(mood,age,now,opponent.level,this.reduced);
  let {frame,nextFrame,blend}=motion;
  if(!this.reduced&&this.enteringFrom!==undefined&&age<160){
   frame=this.enteringFrom;nextFrame=motion.frame;blend=smoothPose(age/160);
  }
  if(frame===nextFrame)blend=0;
  this.lastMotion={...motion,frame,nextFrame,blend};
  for(const [image,pose,alpha]of [[sprite,frame,1-blend],[this.blendSprite!,nextFrame,blend]] as const){
   if(image.texture.key!==key||image.frame.name!=='pose-'+pose)image.setTexture(key,'pose-'+pose);
   // Breathing stretches gently above planted feet rather than bouncing the cell.
   image.setPosition(this.x+motion.dx,this.y+this.size/2+motion.dy).setDisplaySize(this.size*motion.scaleX,this.size*motion.scaleY).setAngle(motion.angle).setAlpha(alpha).setVisible(alpha>0);
   if(mood==='hurt'&&age<220&&!this.reduced)image.setTint(0xffc0af);else image.clearTint();
  }
  sprite.setData('motionTime',now).setData('motionFrame',frame).setData('motionNextFrame',nextFrame).setData('motionBlend',blend);
  const color=mood==='hurt'?0xff8b75:mood==='victory'?0xffdf81:0xe6b66c;
  this.aura!.clear().fillStyle(0x080b12,.6).fillEllipse(this.x,this.y+32,45,8).lineStyle(1,color,.65).strokeEllipse(this.x,this.y+32,48,10);
  if(!this.reduced&&(mood==='hurt'||mood==='victory')&&age<1200){
   const pulse=Math.sin(Math.PI*age/1200);this.aura!.lineStyle(2,color,pulse*.65);
   for(const direction of [-1,1])this.aura!.lineBetween(this.x+direction*23,this.y-25,this.x+direction*29,this.y-32-pulse*3);
  }
  const speech=this.speech!,visible=!!opponent.phrase&&now-this.spokenAt<4600;
  speech.setVisible(visible);this.bubble!.setVisible(visible);if(!visible)return;
  // A single short line stays inside the non-playable lane divider.
  speech.setScale(Math.min(1,280/Math.max(1,speech.width))).setPosition(this.x-this.size/2-14,this.y);
  const width=speech.displayWidth+16,height=Math.min(34,speech.displayHeight+8),right=speech.x+7;
  this.bubble!.clear().fillStyle(0x141922,.96).fillRoundedRect(right-width,this.y-height/2,width,height,5)
   .lineStyle(1,color,.85).strokeRoundedRect(right-width,this.y-height/2,width,height,5)
   .fillStyle(0x141922,.96).fillTriangle(right,this.y-4,right+7,this.y,right,this.y+4);
 }
 destroy(){
  if(this.destroyed)return;this.destroyed=true;this.scene.events.off('destroy',this.destroy,this);
  this.scene.events.off('pause',this.pause);this.scene.events.off('resume',this.resume);
  document.removeEventListener('visibilitychange',this.visibility);
  for(const cleanup of [...this.pending.values()])cleanup();this.pending.clear();
  this.sprite?.destroy();this.blendSprite?.destroy();this.aura?.destroy();this.bubble?.destroy();this.speech?.destroy();
  this.sprite=undefined;this.blendSprite=undefined;this.aura=undefined;this.bubble=undefined;this.speech=undefined;this.opponent=undefined;
 }
}
