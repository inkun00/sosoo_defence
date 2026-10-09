import type Phaser from 'phaser';
import {artURL} from '../art';
import type {HeroEffect} from './heroes';

export const HERO_EFFECT_BADGE_SPECS:Record<HeroEffect,{label:string;description:string;color:number}>={
 haste:{label:'이동 가속',description:'영웅의 범위 안에서 이동 속도 증가',color:0xace565},
 vitality:{label:'체력 강화',description:'영웅의 범위 안에서 추가 체력 적용',color:0xff8494},
 shield:{label:'보호막',description:'남아 있는 보호막으로 공격 방어',color:0x75dcff},
 'enemy-slow':{label:'포탑 감속',description:'상대 영웅의 영향으로 공격 속도 감소',color:0xc4a0ff},
 'tower-haste':{label:'포탑 가속',description:'내 영웅의 영향으로 공격 속도 증가',color:0xffd267},
};
export function loadDuelHeroEffectBadges(scene:Phaser.Scene){
 scene.load.image('hero-effect-haste',artURL('hero-effect-haste-v1'));
}

/** Small vector glyphs stay sharp without introducing another downloaded atlas. */
export function registerDuelHeroEffectBadges(scene:Phaser.Scene){
 for(const effect of ['vitality','shield','enemy-slow','tower-haste'] as HeroEffect[]){
  const key='hero-effect-'+effect;if(scene.textures.exists(key))continue;
  const color=HERO_EFFECT_BADGE_SPECS[effect].color,g=scene.make.graphics({},false);
  g.fillStyle(0x060a16,.96).fillCircle(16,16,15);
  g.fillStyle(color,.18).fillCircle(16,16,12);
  g.lineStyle(1.5,0xdfb67a,.95).strokeCircle(16,16,14);
  g.lineStyle(.7,color,.75).strokeCircle(16,16,11.5);
  g.fillStyle(color).lineStyle(2.5,color);
  if(effect==='vitality'){
   g.fillCircle(11.5,13,4.5).fillCircle(19.5,13,4.5).fillTriangle(7,14,24,14,15.5,25);
   g.fillStyle(0xfff2d1).fillRect(14.5,10,2,9).fillRect(11,13.5,9,2);
  }else if(effect==='shield'){
   const shield=[{x:16,y:6},{x:25,y:10},{x:23,y:20},{x:16,y:27},{x:9,y:20},{x:7,y:10}];
   g.fillStyle(color,.28).fillPoints(shield,true);g.strokePoints(shield,true);
   g.lineStyle(1.5,0xe2faff).lineBetween(16,10,16,21).lineBetween(12,17,16,21).lineBetween(20,17,16,21);
  }else if(effect==='enemy-slow'){
   g.lineStyle(2.3,color).lineBetween(8,8,20,8).lineBetween(8,23,20,23)
    .lineBetween(9,9,19,22).lineBetween(19,9,9,22);
   g.fillStyle(color,.8).fillTriangle(11,10,17,10,14,14).fillTriangle(11,21,17,21,14,17);
   g.lineStyle(2,0xf7e6ff).lineBetween(24,10,24,23).lineBetween(21,20,24,23).lineBetween(27,20,24,23);
  }else{
   g.fillStyle(color,.28).fillTriangle(10,6,24,14,16,27).fillTriangle(8,17,10,6,16,27);
   g.lineStyle(1.5,color).lineBetween(10,6,24,14).lineBetween(24,14,16,27).lineBetween(16,27,8,17).lineBetween(8,17,10,6);
   g.fillStyle(0xfff3be).fillTriangle(17,8,12,18,17,18).fillTriangle(15,24,21,14,16,14);
   g.lineStyle(1.5,color).lineBetween(25,24,25,17).lineBetween(22,20,25,17).lineBetween(28,20,25,17);
  }
  g.generateTexture(key,32,32);g.destroy();
 }
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
    .setDisplaySize(23,23).setName('hero-effect-'+effect).setData('heroEffect',effect).setInteractive();
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
  this.hideTooltip();const spec=HERO_EFFECT_BADGE_SPECS[effect];
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
