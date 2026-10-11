import Phaser from 'phaser';
import {artURL} from '../art';

export type OpponentMood='idle'|'thinking'|'cast'|'hurt'|'victory'|'defeat';
export interface ComputerView {level:number;id:string;name:string;mood:OpponentMood;phrase:string;moodSince:number;}
export const OPPONENT_FRAMES:Record<OpponentMood,readonly number[]>={idle:[0,1],thinking:[2,3],cast:[4,5],hurt:[6,7],victory:[8,9],defeat:[10,11]};

/** Lives outside the rebuilt HUD so snapshots never restart the opponent's action. */
export class OpponentPortrait {
 private sprite?:Phaser.GameObjects.Sprite;
 private aura?:Phaser.GameObjects.Graphics;
 private bubble?:Phaser.GameObjects.Graphics;
 private speech?:Phaser.GameObjects.Text;
 private pending=new Map<number,()=>void>();
 private retryAt=new Map<number,number>();
 private last='';private spoken='';private changedAt=0;private spokenAt=0;
 private opponent?:ComputerView;private destroyed=false;
 private x=953;private y=403;private size=78;
 constructor(private scene:Phaser.Scene,private reduced=false){scene.events.once('destroy',this.destroy,this);}
 setPosition(x:number,y:number){this.x=x;this.y=y;this.update();}
 private hide(){this.sprite?.setVisible(false);this.aura?.setVisible(false);this.bubble?.setVisible(false);this.speech?.setVisible(false);}
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
  for(const [mood,frames]of Object.entries(OPPONENT_FRAMES))if(!this.scene.anims.exists(key+'-'+mood))this.scene.anims.create({
   key:key+'-'+mood,frames:frames.map(i=>({key,frame:'pose-'+i})),frameRate:mood==='cast'||mood==='hurt'?5:mood==='victory'?4:2,repeat:-1,
  });
 }
 sync(opponent?:ComputerView){
  if(this.destroyed)return;
  this.opponent=opponent;
  if(!opponent){this.hide();this.last='';this.spoken='';return;}
  const key='cpu-opponent-'+opponent.level;
  if(!this.scene.textures.exists(key)){this.hide();this.load(opponent.level,key);return;}
  if(!this.scene.textures.get(key).has('pose-0'))this.register(key);
  if(!this.sprite){
   this.aura=this.scene.add.graphics().setDepth(11).setName('cpu-opponent-aura');
   this.sprite=this.scene.add.sprite(this.x,this.y,key,'pose-0').setDepth(12).setFlipX(true).setName('cpu-opponent-character');
   this.bubble=this.scene.add.graphics().setDepth(12).setName('cpu-opponent-bubble');
   this.speech=this.scene.add.text(0,0,'',{fontFamily:'Malgun Gothic, sans-serif',fontSize:14,fontStyle:'bold',color:'#ffe9b9',padding:{x:2,y:2}})
    .setOrigin(1,.5).setDepth(13).setName('cpu-opponent-speech');
  }
  // The default pose is an attacking gesture, with movement even between actions.
  const pose=opponent.mood==='idle'?'cast':opponent.mood,token=key+'-'+pose;
  const event=key+'-'+opponent.mood+'-'+opponent.moodSince;
  if(event!==this.sprite.getData('event')){this.changedAt=this.scene.time.now;this.sprite.setData('event',event);}
  if(token!==this.last){
   this.last=token;this.sprite.stop().setTexture(key,'pose-'+OPPONENT_FRAMES[pose][0]).setDisplaySize(this.size,this.size);
   if(!this.reduced)this.sprite.play(token);
  }
  this.sprite.setVisible(true).setData('mood',opponent.mood).setData('level',opponent.level);this.aura!.setVisible(true);
  const spoken=event+'-'+opponent.phrase;
  if(spoken!==this.spoken){this.spoken=spoken;this.spokenAt=this.scene.time.now;this.speech!.setText(opponent.phrase);}
  this.update();
 }
 update(){
  const sprite=this.sprite,opponent=this.opponent;if(this.destroyed||!sprite?.visible||!opponent)return;
  const now=this.scene.time.now,age=Math.max(0,now-this.changedAt),mood=opponent.mood;
  let dx=0,dy=0,angle=0;
  if(!this.reduced){
   if(mood==='hurt'){const fade=Math.exp(-age/700);dx=Math.sin(age/38)*2*fade;dy=2;angle=Math.sin(age/65)*6*fade;}
   else if(mood==='victory'){dy=-Math.abs(Math.sin(age/175))*5;angle=Math.sin(age/200)*3;}
   else if(mood==='defeat'){dy=3;angle=-3;}
   else{dx=Math.sin(now/260)*1.2;dy=Math.sin(now/(mood==='thinking'?420:190))*1.8;angle=Math.sin(now/350)*(mood==='thinking'?1:2);}
  }
  sprite.setPosition(this.x+dx,this.y+dy).setDisplaySize(this.size,this.size).setAngle(angle);
  if(mood==='hurt'&&age<300&&!this.reduced)sprite.setTint(0xffb29d);else sprite.clearTint();
  const color=mood==='hurt'?0xff8b75:mood==='victory'?0xffdf81:0xe6b66c;
  this.aura!.clear().fillStyle(0x080b12,.6).fillEllipse(this.x,this.y+32,45,8).lineStyle(1,color,.65).strokeEllipse(this.x,this.y+32,48,10);
  if(!this.reduced&&(mood==='hurt'||mood==='victory')&&age<2000){
   const pulse=(Math.sin(age/140)+1)/2;this.aura!.lineStyle(2,color,.4+pulse*.5);
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
  for(const cleanup of [...this.pending.values()])cleanup();this.pending.clear();
  this.sprite?.destroy();this.aura?.destroy();this.bubble?.destroy();this.speech?.destroy();
  this.sprite=undefined;this.aura=undefined;this.bubble=undefined;this.speech=undefined;this.opponent=undefined;
 }
}
