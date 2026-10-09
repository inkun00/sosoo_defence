import Phaser from 'phaser';
import {artURL} from '../src/art';
import {heroSpec} from '../src/multiplayer/heroes';
import {HeroSummonEffects} from '../src/multiplayer/hero-summon-effects';
import {heroSummonStyle} from '../src/hero-summon-style';
const levels=[1,3,5,7,10],button=document.querySelector<HTMLButtonElement>('#play')!,freeze=document.querySelector<HTMLButtonElement>('#freeze')!,reduced=document.querySelector<HTMLInputElement>('#reduced')!,status=document.querySelector<HTMLParagraphElement>('#status')!;
class Preview extends Phaser.Scene{
 effects:HeroSummonEffects[]=[];sprites:Phaser.GameObjects.Sprite[]=[];private frozen=false;private until=0;
 preload(){for(const level of levels)this.load.image('hero-'+level,artURL('heroes-level-'+level+'-v1'));}
 create(){
  this.add.graphics().fillStyle(0x20232b).fillRoundedRect(18,60,1244,302,14).lineStyle(2,0xa18a58,.7).strokeRoundedRect(18,60,1244,302,14);
  this.add.graphics().fillStyle(0x5c4832).fillRect(19,209,1242,54);
  for(let i=0;i<5;i++){
   const x=136+i*250,level=levels[i],hero=heroSpec('hero-'+level+'-0')!,style=heroSummonStyle(level),texture=this.textures.get('hero-'+level),image=texture.getSourceImage();
   texture.add('hero',0,0,0,Math.round(image.width/4),Math.round(image.height/3));
   this.sprites.push(this.add.sprite(x,225,texture.key,'hero').setDisplaySize(69,69).setDepth(4));
   this.add.text(x,32,`${style.label} · Lv.${level}`,{fontFamily:'Malgun Gothic',fontSize:20,fontStyle:'bold',color:style.cssAccent}).setOrigin(.5);
   this.add.text(x,391,hero.name,{fontFamily:'Malgun Gothic',fontSize:17,color:'#e9d8b9'}).setOrigin(.5);
  }
  button.disabled=false;freeze.disabled=false;button.onclick=()=>this.play(false);freeze.onclick=()=>this.play(true);reduced.onchange=()=>this.play(this.frozen);this.play(false);
  this.events.once('shutdown',()=>this.effects.forEach(e=>e.destroy()));
 }
 play(hold:boolean){
  this.effects.forEach(e=>e.destroy());this.effects=[];this.frozen=hold;this.until=this.time.now+300;
  for(let i=0;i<5;i++){
   const x=136+i*250,level=levels[i],hero=heroSpec('hero-'+level+'-0')!,effects=new HeroSummonEffects(this,{left:24+i*250,right:248+i*250,top:65,bottom:357},reduced.checked);
   effects.play({enemyId:i+1,owner:0,heroId:hero.id,level,name:hero.name,x:1},x,225);this.effects.push(effects);this.sprites[i].setDisplaySize(69,69).setAlpha(1);
  }
  status.textContent=hold?'등급별 0.3초 장면 · 일반 → 고급 → 희귀 → 전설 → 신화':'등급이 높을수록 마법진·빛기둥·충격파·입자가 증가합니다.';
 }
 update(){
  if(this.frozen&&this.time.now>this.until)return;
  this.effects.forEach((effect,i)=>{effect.update();const pose=effect.pose(i+1);if(pose)this.sprites[i].setDisplaySize(69*pose.scale,69*pose.scale).setAlpha(pose.alpha).setY(225-pose.lift);else this.sprites[i].setDisplaySize(69,69).setAlpha(1).setY(225);});
 }
}
new Phaser.Game({type:Phaser.AUTO,parent:'field',width:1280,height:450,scene:[Preview],backgroundColor:'#0f121a',scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},audio:{noAudio:true}});
