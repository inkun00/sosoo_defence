import Phaser from 'phaser';
import {BOSS_AURA_RADIUS,type Defense} from './model';
import {FIELD_WIDTH,FIELD_HEIGHT} from './layout';
import {monsterSize} from './monsters';
import type {BossSpellId} from './boss-spells';
import {hitEquationsEnabled} from './combat-preferences';
import {BossSpellWarning,type BossSpeechAnchor} from './boss-spell-warning';

export type BossAuraAnchor=(enemyId:number)=>BossSpeechAnchor|null;
interface EffectBadge{graphic:Phaser.GameObjects.Graphics;spellId:BossSpellId;}

/** The visible boundary follows the same live boss and radius as combat. */
export class BossAuraView{
 private range:Phaser.GameObjects.Graphics;
 private badges=new Map<number,EffectBadge>();
 private warning:BossSpellWarning;
 private disposed=false;
 private clearState=true;
 constructor(private scene:Phaser.Scene,private reducedMotion:boolean,private overheadAnchor?:BossAuraAnchor){
  this.range=scene.add.graphics().setDepth(2.8).setName('boss-aura-range').setData({sourceId:null,radius:BOSS_AURA_RADIUS,empoweredIds:[],phase:'none',spellId:null,countdown:0}).setVisible(false);
  this.warning=new BossSpellWarning(scene);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>this.destroy());
 }
 get speechBounds(){return this.warning.speechBounds;}
 sync(model:Defense){
  if(this.disposed)return;
  const boss=model.bossAuraSource,state=model.bossSpellState;
  if(!boss||!state||!['ready','playing','paused'].includes(model.phase)){this.clear();return;}
  this.clearState=false;
  const active=state.phase==='active',empowered=active?model.enemies.filter(enemy=>model.isBossEmpowered(enemy)):[],ids=new Set(empowered.map(enemy=>enemy.id));
  const countdown=Math.max(0,Math.ceil(state.remaining-1e-8)),color=state.spell.color,data={sourceId:boss.id,radius:BOSS_AURA_RADIUS,empoweredIds:[...ids],phase:state.phase,spellId:state.spell.id,cycle:state.cycle,color,remaining:state.remaining,countdown};
  const rotation=this.reducedMotion?0:boss.age*.35,pulse=this.reducedMotion?.5:(Math.sin(boss.age*1.7)+1)/2;
  const bossSize=monsterSize(boss.kind,model.level.id),bossAnchor=this.overheadAnchor?.(boss.id)??{x:Phaser.Math.Clamp(boss.x,69,FIELD_WIDTH-69),y:Math.max(hitEquationsEnabled()?106:86,boss.y+32-bossSize*.86)-59};
  this.warning.sync(state,bossAnchor);this.range.clear().setVisible(state.phase!=='rest').setData(data);
  if(active){
   this.range.fillStyle(color,.035+.02*pulse).fillCircle(boss.x,boss.y,BOSS_AURA_RADIUS);
   this.range.lineStyle(2,color,.6).strokeCircle(boss.x,boss.y,BOSS_AURA_RADIUS);
   this.range.lineStyle(5,color,.08+.05*pulse).strokeCircle(boss.x,boss.y,BOSS_AURA_RADIUS+5);
   for(let i=0;i<8;i++){
    const angle=rotation+i*Math.PI/4,x=boss.x+Math.cos(angle)*BOSS_AURA_RADIUS,y=boss.y+Math.sin(angle)*BOSS_AURA_RADIUS;
    this.range.lineStyle(1.5,color,.8).lineBetween(x-5,y,x,y-7).lineBetween(x,y-7,x+5,y).lineBetween(x+5,y,x,y+7).lineBetween(x,y+7,x-5,y);
   }
  }else if(state.phase==='warning')this.range.lineStyle(1,color,.22).strokeCircle(boss.x,boss.y,BOSS_AURA_RADIUS);
  for(const enemy of empowered){
   this.range.lineStyle(2,color,.75).strokeEllipse(enemy.x,enemy.y+8,44,17);
   let badge=this.badges.get(enemy.id);
   if(!badge){badge={graphic:this.scene.add.graphics().setDepth(9.6).setName('boss-empowered-'+enemy.id),spellId:state.spell.id};this.drawBadge(badge.graphic,state.spell.id,color);this.badges.set(enemy.id,badge);}
   else if(badge.spellId!==state.spell.id){this.drawBadge(badge.graphic,state.spell.id,color);badge.spellId=state.spell.id;}
   const size=monsterSize(enemy.kind,model.level.id),anchor=this.overheadAnchor?.(enemy.id)??{x:enemy.x,y:Math.max(hitEquationsEnabled()?106:86,enemy.y+32-size*.86)-59};
   badge.graphic.setPosition(Phaser.Math.Clamp(anchor.x,20,FIELD_WIDTH-20),Phaser.Math.Clamp(anchor.y,23,FIELD_HEIGHT-23)).setData({...data,enemyId:enemy.id,effectName:state.spell.name,description:state.spell.description,icon:true});
  }
  for(const [id,badge]of this.badges)if(!ids.has(id)){badge.graphic.destroy();this.badges.delete(id);}
 }
 private drawBadge(g:Phaser.GameObjects.Graphics,id:BossSpellId,color:number){
  // Compact metal medallions use silhouettes as well as spell colors.
  g.clear().fillStyle(0x05080e,.92).fillCircle(0,1,17).fillStyle(0x44464c,1).fillCircle(0,0,15);
  g.lineStyle(1.5,0xe5cc9a,.95).strokeCircle(0,0,15).fillStyle(0x131722,1).fillCircle(0,0,12);
  g.lineStyle(1,color,.65).strokeCircle(0,0,11).fillStyle(0xe5cc9a,1).fillTriangle(-3,15,3,15,0,19);
  if(id==='haste'){
   g.lineStyle(3,color,1);
   for(const y of [-4,4])g.lineBetween(-6,y+3,0,y-3).lineBetween(0,y-3,6,y+3);
  }else if(id==='frost-ward'){
   g.lineStyle(2,color,1);
   for(let i=0;i<6;i++){
    const a=i*Math.PI/3,x=Math.cos(a),y=Math.sin(a);
    g.lineBetween(x*4,y*4,x*9,y*9).lineBetween(x*7,y*7,x*6-y*2,y*6+x*2).lineBetween(x*7,y*7,x*6+y*2,y*6-x*2);
   }
   g.lineStyle(3,0xfff0ce,1).lineBetween(3,-7,-2,-1).lineBetween(-2,-1,2,2).lineBetween(2,2,-3,7);
  }else{
   g.fillStyle(color,1).beginPath().moveTo(0,-8).lineTo(7,-5).lineTo(6,2).lineTo(0,9).lineTo(-6,2).lineTo(-7,-5).closePath().fillPath();
   g.lineStyle(2,0x201a31,1).lineBetween(0,-4,0,4).lineBetween(-3,0,3,0);
  }
 }
 clear(){
  if(this.disposed||this.clearState)return;this.clearState=true;
  this.warning.clear();this.range.clear().setVisible(false).setData({sourceId:null,radius:BOSS_AURA_RADIUS,empoweredIds:[],phase:'none',spellId:null,color:null,remaining:0,countdown:0,cycle:0});
  for(const badge of this.badges.values())badge.graphic.destroy();this.badges.clear();
 }
 private destroy(){if(this.disposed)return;this.disposed=true;this.warning.destroy();for(const badge of this.badges.values())badge.graphic.destroy();this.badges.clear();this.range.destroy();}
}
