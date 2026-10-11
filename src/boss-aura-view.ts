import Phaser from 'phaser';
import {BOSS_AURA_RADIUS,type Defense} from './model';
import {FIELD_WIDTH,FIELD_HEIGHT} from './layout';

/** The visible boundary follows the same live boss and radius as combat. */
export class BossAuraView{
 private range:Phaser.GameObjects.Graphics;
 private label:Phaser.GameObjects.Text;
 private badges=new Map<number,Phaser.GameObjects.Text>();
 constructor(private scene:Phaser.Scene,private reducedMotion:boolean){
  this.range=scene.add.graphics().setDepth(2.8).setName('boss-aura-range').setData({sourceId:null,radius:BOSS_AURA_RADIUS,empoweredIds:[]}).setVisible(false);
  this.label=scene.add.text(0,0,'저주 오라\n속도↑ · 감속/기절 저항',{fontFamily:'Malgun Gothic, system-ui, sans-serif',fontSize:13,fontStyle:'bold',color:'#eedbff',align:'center',backgroundColor:'#21132ce6',padding:{x:7,y:4}}).setOrigin(.5).setDepth(6).setName('boss-aura-label').setVisible(false);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>this.destroy());
 }
 sync(model:Defense){
  const boss=model.bossAuraSource;
  if(!boss){this.clear();return;}
  const empowered=model.enemies.filter(enemy=>model.isBossEmpowered(enemy)),ids=new Set(empowered.map(enemy=>enemy.id));
  const phase=this.reducedMotion?0:model.elapsed*.35,pulse=this.reducedMotion?.5:(Math.sin(model.elapsed*1.7)+1)/2;
  this.range.clear().setVisible(true).setData({sourceId:boss.id,radius:BOSS_AURA_RADIUS,empoweredIds:[...ids]});
  this.range.fillStyle(0x9860cf,.035+.02*pulse).fillCircle(boss.x,boss.y,BOSS_AURA_RADIUS);
  this.range.lineStyle(2,0xcd9aff,.48).strokeCircle(boss.x,boss.y,BOSS_AURA_RADIUS);
  this.range.lineStyle(5,0xa464dc,.08+.05*pulse).strokeCircle(boss.x,boss.y,BOSS_AURA_RADIUS+5);
  for(let i=0;i<8;i++){
   const angle=phase+i*Math.PI/4,x=boss.x+Math.cos(angle)*BOSS_AURA_RADIUS,y=boss.y+Math.sin(angle)*BOSS_AURA_RADIUS;
   this.range.lineStyle(1.5,0xe6bbff,.7).lineBetween(x-5,y,x,y-7).lineBetween(x,y-7,x+5,y).lineBetween(x+5,y,x,y+7).lineBetween(x,y+7,x-5,y);
  }
  this.label.setVisible(true).setPosition(Phaser.Math.Clamp(boss.x+BOSS_AURA_RADIUS*.7,115,FIELD_WIDTH-115),Phaser.Math.Clamp(boss.y+BOSS_AURA_RADIUS*.75,42,FIELD_HEIGHT-28));
  for(const enemy of empowered){
   this.range.lineStyle(2,0xdeacff,.65).strokeEllipse(enemy.x,enemy.y+8,44,17);
   let badge=this.badges.get(enemy.id);
   if(!badge){badge=this.scene.add.text(0,0,'강화',{fontFamily:'Malgun Gothic, system-ui, sans-serif',fontSize:12,fontStyle:'bold',color:'#f3dcff',backgroundColor:'#54276c',padding:{x:5,y:2}}).setOrigin(.5).setDepth(6).setName('boss-empowered-'+enemy.id);this.badges.set(enemy.id,badge);}
   badge.setPosition(enemy.x,enemy.y+29);
  }
  for(const [id,badge]of this.badges)if(!ids.has(id)){badge.destroy();this.badges.delete(id);}
 }
 clear(){
  if(!this.range.visible&&this.badges.size===0)return;
  this.range.clear().setVisible(false).setData({sourceId:null,radius:BOSS_AURA_RADIUS,empoweredIds:[]});this.label.setVisible(false);
  for(const badge of this.badges.values())badge.destroy();this.badges.clear();
 }
 private destroy(){this.clear();this.range.destroy();this.label.destroy();}
}
