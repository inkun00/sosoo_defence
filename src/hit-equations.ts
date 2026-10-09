import Phaser from 'phaser';
import {numberText,precision} from './math';
import {hitEquationsEnabled,onHitEquationsChange} from './combat-preferences';
type Anchor=()=>{x:number;y:number};
interface Popup{label:Phaser.GameObjects.Text;anchor:Anchor;age:number;equation:boolean;}
// One readable equation per monster; a new hit replaces that monster's previous
// equation. Live anchors keep the popup over moving monsters, including bosses.
export class HitEquationPopups{
 private popups=new Map<number,Popup>();private latest=new Map<number,number>();private unsubscribe:()=>void;
 private reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 constructor(private scene:Phaser.Scene,private bounds:{left:number;right:number;top:number;bottom:number},private paused=()=>false){
  this.unsubscribe=onHitEquationsChange(value=>{if(!value)for(const [id,popup]of this.popups)if(popup.equation){popup.label.destroy();this.popups.delete(id);}});
  const update=(_time:number,delta:number)=>this.update(delta);
  scene.events.on(Phaser.Scenes.Events.UPDATE,update);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>{scene.events.off(Phaser.Scenes.Events.UPDATE,update);this.unsubscribe();this.clear();});
 }
 show(id:number,before:number,damage:number,after:number,anchor:Anchor,digits=1,color='#fff0c4',order=0){
  if(!hitEquationsEnabled())return;
  const places=Math.max(digits,precision(before),precision(damage),precision(after));
  this.display(id,`${numberText(before,places)} − ${numberText(damage,places)} = ${numberText(after,places)}`,anchor,color,order,true);
 }
 showMessage(id:number,message:string,anchor:Anchor,color='#fff0c4',order=0){
  this.display(id,message,anchor,color,order,false);
 }
 private display(id:number,message:string,anchor:Anchor,color:string,order:number,equation:boolean){
  // Faster projectiles can arrive before an earlier shot's visual effect.
  // Never replace a newer calculation with that older damage record.
  if(order>0){if(order<(this.latest.get(id)??0))return;this.latest.set(id,order);}
  let popup=this.popups.get(id);
  if(!popup){const label=this.scene.add.text(0,0,'',{fontFamily:'Malgun Gothic, system-ui, sans-serif',fontSize:22,fontStyle:'bold',color,backgroundColor:'#11151ff2',padding:{x:9,y:5},stroke:'#0a1018',strokeThickness:2}).setOrigin(.5).setDepth(11).setName('hit-equation').setData('monsterId',id);popup={label,anchor,age:0,equation};this.popups.set(id,popup);}
  popup.label.setText(message).setColor(color).setAlpha(1);
  popup.anchor=anchor;popup.age=0;popup.equation=equation;this.position(popup);
 }
 private position(p:Popup){
  const at=p.anchor(),half=p.label.width/2+3;
  p.label.setPosition(Phaser.Math.Clamp(at.x,this.bounds.left+half,this.bounds.right-half),Phaser.Math.Clamp(at.y-(this.reduced?0:Math.min(16,p.age/100)),this.bounds.top+p.label.height/2,this.bounds.bottom-p.label.height/2));
 }
 private update(delta:number){
  if(this.paused())return;
  for(const [id,p]of this.popups){p.age+=delta;if(p.age>=2200){p.label.destroy();this.popups.delete(id);continue;}this.position(p);p.label.setAlpha(p.age<1700?1:(2200-p.age)/500);}
 }
 clear(){for(const p of this.popups.values())p.label.destroy();this.popups.clear();this.latest.clear();}
}
