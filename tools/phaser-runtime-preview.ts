import Phaser from 'phaser';
import {loadDungeon,registerDungeon} from '../src/assets';
import {playTowerProjectile,clearTowerProjectiles,towerProjectileEffectCount} from '../src/tower-projectiles';
import {TOWERS} from '../src/towers';

if(!import.meta.env.DEV)throw Error('Local verification only');
const proof={renderer:'pending',loaded:false,created:false,tween:false,clock:false,animation:false,pointer:false,mask:false,projectiles:0,projectilesCleaned:false,errors:[] as string[]};
const status=document.getElementById('runtime-proof')!;
const publish=()=>status.textContent=JSON.stringify(proof,null,2);
window.addEventListener('error',event=>{proof.errors.push(event.message);publish();});
window.addEventListener('unhandledrejection',event=>{proof.errors.push(String(event.reason));publish();});
class RuntimeScene extends Phaser.Scene{
 constructor(){super('custom-runtime-check');}
 preload(){loadDungeon(this,['slime']);this.load.on('complete',()=>{proof.loaded=true;publish();});}
 create(){
  registerDungeon(this);proof.renderer=this.game.renderer.type===Phaser.WEBGL?'WebGL':'Canvas';
  this.add.tileSprite(320,240,640,480,'dungeon-terrain','floor');
  this.anims.create({key:'runtime-slime-walk',frames:Array.from({length:4},(_,i)=>({key:'dungeon-slime',frame:'slime-'+i})),frameRate:8,repeat:-1});
  const root=this.add.container(320,230);
  root.add(this.add.image(0,0,'dungeon-icons','star').setDisplaySize(80,80));
  const sprite=this.add.sprite(140,140,'dungeon-slime','slime-0').setDisplaySize(76,76).play('runtime-slime-walk');
  this.time.delayedCall(400,()=>{proof.animation=sprite.anims.isPlaying&&sprite.anims.currentFrame!.index>0;publish();});
  this.add.graphics().fillStyle(0xd6aa68).fillCircle(430,140,28);
  const clip=this.make.graphics({},false).fillStyle(0xffffff).fillRect(10,10,620,450),mask=clip.createGeometryMask();sprite.setMask(mask);proof.mask=!!sprite.mask;
  this.add.rectangle(320,370,340,76,0x121a2a);
  if(this.game.renderer.type===Phaser.WEBGL)this.add.nineslice(320,370,'ui-panel_brown',undefined,340,76,14,14,14,14);
  this.add.text(320,370,'포인터 확인',{fontSize:24,color:'#fff0cc'}).setOrigin(.5);
  this.add.zone(320,370,340,76).setInteractive().on('pointerdown',()=>{proof.pointer=true;publish();});
  this.tweens.add({targets:root,angle:360,duration:300,onComplete:()=>{proof.tween=true;publish();}});
  this.time.delayedCall(350,()=>{proof.clock=true;publish();});
  TOWERS.forEach((tower,index)=>this.time.delayedCall(500+index*120,()=>playTowerProjectile(this,{typeId:tower.id,from:{x:100,y:240},to:{x:540,y:240},scale:.8,onImpact:()=>{proof.projectiles++;publish();}})));
  this.time.delayedCall(4500,()=>{clearTowerProjectiles(this);proof.projectilesCleaned=towerProjectileEffectCount(this)===0;publish();});
  proof.created=true;publish();
 }
}
new Phaser.Game({type:new URLSearchParams(location.search).get('renderer')==='canvas'?Phaser.CANVAS:Phaser.AUTO,width:640,height:480,parent:'runtime-field',backgroundColor:'#17191d',banner:false,audio:{noAudio:true},scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},scene:[RuntimeScene]});
