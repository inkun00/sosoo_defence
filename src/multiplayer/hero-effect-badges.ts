import type Phaser from 'phaser';
import {artURL} from '../art';
import type {HeroEffect} from './heroes';

const EFFECTS:Record<HeroEffect,{label:string;description:string}>={
 haste:{label:'이동 가속',description:'주변 아군 영웅의 가속 효과'},
 brood:{label:'영웅 동반 병사',description:'영웅과 함께 등장한 돌 병사'},
 steadfast:{label:'감속 저항',description:'이 영웅이 받는 감속 감소'},
};
export function loadDuelHeroEffectBadges(scene:Phaser.Scene){
 for(const effect of Object.keys(EFFECTS) as HeroEffect[])scene.load.image('hero-effect-'+effect,artURL('hero-effect-'+effect+'-v1'));
}

export class DuelHeroEffectBadges{
 private container:Phaser.GameObjects.Container;
 private signature='';private count=0;private tooltip?:Phaser.GameObjects.Container;
 constructor(private scene:Phaser.Scene,private reducedMotion:boolean){this.container=scene.add.container(0,0).setDepth(9);}
 sync(effects:HeroEffect[]){
  const signature=effects.join(',');if(signature===this.signature)return;
  this.signature=signature;this.count=effects.length;this.hideTooltip();
  for(const icon of this.container.list)this.scene.tweens.killTweensOf(icon);
  this.container.removeAll(true);
  effects.forEach((effect,index)=>{
   const icon=this.scene.add.image((index-(effects.length-1)/2)*24,0,'hero-effect-'+effect)
    .setDisplaySize(23,23).setName('hero-effect-'+effect).setInteractive();
   this.container.add(icon);
   icon.on('pointerover',()=>this.showTooltip(effect));icon.on('pointerout',()=>this.hideTooltip());
   if(!this.reducedMotion)this.scene.tweens.add({targets:icon,alpha:{from:0,to:1},y:{from:-5,to:0},duration:220,ease:'Cubic.Out'});
  });
 }
 position(x:number,y:number,left:number,right:number,top:number){
  const half=Math.max(12,(this.count-1)*12+12);
  this.container.setPosition(Math.max(left+half,Math.min(right-half,x)),Math.max(top+14,y));
  this.positionTooltip();
 }
 get visible(){return this.count>0;}
 private showTooltip(effect:HeroEffect){
  this.hideTooltip();const spec=EFFECTS[effect];
  const text=this.scene.add.text(0,0,`${spec.label}\n${spec.description}`,{fontFamily:'Malgun Gothic, sans-serif',fontSize:13,fontStyle:'bold',color:'#ffe6b3',align:'center',backgroundColor:'#111622f5',padding:{x:8,y:5}}).setOrigin(.5,0);
  this.tooltip=this.scene.add.container(0,0,[text]).setDepth(11);this.positionTooltip();
 }
 private positionTooltip(){
  if(!this.tooltip)return;const text=this.tooltip.list[0] as Phaser.GameObjects.Text,half=text.width/2;
  this.tooltip.setPosition(Math.max(half+8,Math.min(986-half,this.container.x)),this.container.y+16);
 }
 private hideTooltip(){this.tooltip?.destroy();this.tooltip=undefined;}
 destroy(){this.hideTooltip();for(const icon of this.container.list)this.scene.tweens.killTweensOf(icon);this.container.destroy();}
}
