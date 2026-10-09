import Phaser from 'phaser';
import {artURL} from '../art';

export type OpponentMood='idle'|'thinking'|'cast'|'hurt'|'victory'|'defeat';
export interface ComputerView {level:number;id:string;name:string;mood:OpponentMood;phrase:string;moodSince:number;}
export const OPPONENT_FRAMES:Record<OpponentMood,readonly number[]>={idle:[0,1],thinking:[2,3],cast:[4,5],hurt:[6,7],victory:[8,9],defeat:[10,11]};

/** A separate HUD sprite survives UI redraws, so live snapshots don't restart its pose. */
export class OpponentPortrait {
 private sprite?:Phaser.GameObjects.Sprite;
 private loading=new Set<number>();
 private retryAt=new Map<number,number>();
 private last='';
 constructor(private scene:Phaser.Scene,private reduced=false){}
 sync(opponent?:ComputerView){
  if(!opponent){this.sprite?.setVisible(false);this.last='';return;}
  const level=opponent.level,key='cpu-opponent-'+level;
  if(!this.scene.textures.exists(key)){
   this.sprite?.setVisible(false);
   if(this.loading.has(level)||performance.now()<(this.retryAt.get(level)??0))return;this.loading.add(level);
   const event='filecomplete-image-'+key;
   const failed=(file:Phaser.Loader.File)=>{if(file.key!==key)return;this.scene.load.off(event,complete);this.scene.load.off('loaderror',failed);this.loading.delete(level);this.retryAt.set(level,performance.now()+30000);};
   const complete=()=>{
    this.scene.load.off('loaderror',failed);
    this.loading.delete(level);const texture=this.scene.textures.get(key),source=texture.getSourceImage();
    for(let i=0;i<12;i++){const col=i%4,row=Math.floor(i/4),x=Math.round(col*source.width/4),y=Math.round(row*source.height/3);texture.add('pose-'+i,0,x,y,Math.round((col+1)*source.width/4)-x,Math.round((row+1)*source.height/3)-y);}
    for(const [mood,frames]of Object.entries(OPPONENT_FRAMES))this.scene.anims.create({key:key+'-'+mood,frames:frames.map(i=>({key,frame:'pose-'+i})),frameRate:mood==='cast'||mood==='hurt'?5:2,repeat:-1});
    this.last='';
   };
   this.scene.load.once(event,complete);this.scene.load.on('loaderror',failed);
   this.scene.load.image(key,artURL('cpu-opponent-'+level+'-v1'));if(!this.scene.load.isLoading())this.scene.load.start();return;
  }
  if(!this.sprite)this.sprite=this.scene.add.sprite(1045,747,key,'pose-0').setDepth(15);
  const token=key+'-'+opponent.mood;
  this.sprite.setVisible(true);
  if(token===this.last)return;this.last=token;
  this.sprite.stop().setTexture(key,'pose-'+OPPONENT_FRAMES[opponent.mood][0]).setDisplaySize(96,98);
  if(!this.reduced)this.sprite.play(token);
 }
 destroy(){this.sprite?.destroy();this.sprite=undefined;}
}
