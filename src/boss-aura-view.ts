import Phaser from 'phaser';
import {BOSS_AURA_RADIUS,type Defense} from './model';
import {FIELD_WIDTH,FIELD_HEIGHT} from './layout';
import {BossSpellWarning} from './boss-spell-warning';

/** The visible boundary follows the same live boss and radius as combat. */
export class BossAuraView{
 private range:Phaser.GameObjects.Graphics;
 private label:Phaser.GameObjects.Text;
 private badges=new Map<number,Phaser.GameObjects.Text>();
 private warning:BossSpellWarning;
 private disposed=false;
 private clearState=true;
 constructor(private scene:Phaser.Scene,private reducedMotion:boolean){
  this.range=scene.add.graphics().setDepth(2.8).setName('boss-aura-range').setData({sourceId:null,radius:BOSS_AURA_RADIUS,empoweredIds:[],phase:'none',spellId:null,countdown:0}).setVisible(false);
  this.label=scene.add.text(0,0,'',{fontFamily:'Malgun Gothic, system-ui, sans-serif',fontSize:13,fontStyle:'bold',color:'#eedbff',align:'center',backgroundColor:'#21132ce6',padding:{x:7,y:4},wordWrap:{width:220,useAdvancedWrap:true}}).setOrigin(.5).setDepth(6).setName('boss-aura-label').setVisible(false);
  this.warning=new BossSpellWarning(scene);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>this.destroy());
 }
 sync(model:Defense){
  if(this.disposed)return;
  const boss=model.bossAuraSource,state=model.bossSpellState;
  if(!boss||!state||!['ready','playing','paused'].includes(model.phase)){this.clear();return;}
  this.clearState=false;
  const active=state.phase==='active',empowered=active?model.enemies.filter(enemy=>model.isBossEmpowered(enemy)):[],ids=new Set(empowered.map(enemy=>enemy.id));
  const countdown=Math.max(0,Math.ceil(state.remaining-1e-8)),color=state.spell.color,cssColor='#'+color.toString(16).padStart(6,'0'),data={sourceId:boss.id,radius:BOSS_AURA_RADIUS,empoweredIds:[...ids],phase:state.phase,spellId:state.spell.id,cycle:state.cycle,color,remaining:state.remaining,countdown};
  const rotation=this.reducedMotion?0:boss.age*.35,pulse=this.reducedMotion?.5:(Math.sin(boss.age*1.7)+1)/2;
  this.warning.sync(state);this.range.clear().setVisible(state.phase!=='rest').setData(data);this.label.setData(data);
  if(active){
   this.range.fillStyle(color,.035+.02*pulse).fillCircle(boss.x,boss.y,BOSS_AURA_RADIUS);
   this.range.lineStyle(2,color,.6).strokeCircle(boss.x,boss.y,BOSS_AURA_RADIUS);
   this.range.lineStyle(5,color,.08+.05*pulse).strokeCircle(boss.x,boss.y,BOSS_AURA_RADIUS+5);
   for(let i=0;i<8;i++){
    const angle=rotation+i*Math.PI/4,x=boss.x+Math.cos(angle)*BOSS_AURA_RADIUS,y=boss.y+Math.sin(angle)*BOSS_AURA_RADIUS;
    this.range.lineStyle(1.5,color,.8).lineBetween(x-5,y,x,y-7).lineBetween(x,y-7,x+5,y).lineBetween(x+5,y,x,y+7).lineBetween(x,y+7,x-5,y);
   }
  }else if(state.phase==='warning')this.range.lineStyle(1,color,.22).strokeCircle(boss.x,boss.y,BOSS_AURA_RADIUS);
  this.label.setVisible(state.phase!=='rest').setColor(cssColor).setText(active?`${state.spell.name}\n${state.spell.description}`:`시전 예고 · ${state.spell.name}\n${countdown}초 뒤 발동 · 강화 없음`).setPosition(Phaser.Math.Clamp(boss.x+BOSS_AURA_RADIUS*.7,115,FIELD_WIDTH-115),Phaser.Math.Clamp(boss.y+BOSS_AURA_RADIUS*.75,52,FIELD_HEIGHT-48));
  for(const enemy of empowered){
   this.range.lineStyle(2,color,.75).strokeEllipse(enemy.x,enemy.y+8,44,17);
   let badge=this.badges.get(enemy.id);
   if(!badge){badge=this.scene.add.text(0,0,'',{fontFamily:'Malgun Gothic, system-ui, sans-serif',fontSize:12,fontStyle:'bold',color:cssColor,backgroundColor:'#22192beb',padding:{x:5,y:2}}).setOrigin(.5).setDepth(6).setName('boss-empowered-'+enemy.id);this.badges.set(enemy.id,badge);}
   badge.setText(state.spell.name).setColor(cssColor).setData(data).setPosition(enemy.x,enemy.y+29);
  }
  for(const [id,badge]of this.badges)if(!ids.has(id)){badge.destroy();this.badges.delete(id);}
 }
 clear(){
  if(this.disposed||this.clearState)return;this.clearState=true;
  this.warning.clear();this.range.clear().setVisible(false).setData({sourceId:null,radius:BOSS_AURA_RADIUS,empoweredIds:[],phase:'none',spellId:null,color:null,remaining:0,countdown:0,cycle:0});this.label.setVisible(false).setData({sourceId:null,phase:'none',spellId:null,color:null,remaining:0,countdown:0,cycle:0});
  for(const badge of this.badges.values())badge.destroy();this.badges.clear();
 }
 private destroy(){if(this.disposed)return;this.disposed=true;this.warning.destroy();for(const badge of this.badges.values())badge.destroy();this.badges.clear();this.range.destroy();this.label.destroy();}
}
