import Phaser from 'phaser';
import {loadDungeon,registerDungeon} from '../src/assets';
import {TOWERS} from '../src/towers';
import {projectileProfile} from '../src/projectile-profiles';
import {playTowerProjectile,clearTowerProjectiles,towerProjectileEffectCount} from '../src/tower-projectiles';
import {Sound} from '../src/audio';
const sound=new Sound(),status=document.querySelector('#status')!,metrics=document.querySelector('#metrics')!;
const descriptions=['불꽃 꼬리 철포탄','65ms 간격 쌍석탄','빠른 은빛 바늘','회전하는 자갈','눈꽃이 도는 서리 구체','긴 얼음창','중력 포물선 돌덩이','타워와 연결되는 전기','회전하는 수정탄','가늘고 긴 빛의 탄도','무거운 불꽃 포탄','마법진과 룬 화살'];
class Preview extends Phaser.Scene {
 reduced=false;loop=false;impacts=0;launches=0;private repeatTimer?:Phaser.Time.TimerEvent;private comparisonTimers:Phaser.Time.TimerEvent[]=[];
 preload(){loadDungeon(this,['slime']);}
 create(){registerDungeon(this);TOWERS.forEach((type,i)=>{
 const x=(i%4)*300,y=Math.floor(i/4)*220;
 this.add.rectangle(x+150,y+110,286,208,0x141c29).setStrokeStyle(1,0x514739);
 this.add.text(x+16,y+12,type.name,{fontFamily:'Malgun Gothic',fontSize:22,color:'#f6dfb4',fontStyle:'bold'});
 this.add.text(x+16,y+42,descriptions[i],{fontFamily:'Malgun Gothic',fontSize:14,color:'#bcb9b6'});
 this.add.graphics().lineStyle(1,0x666153,.35).lineBetween(x+44,y+154,x+261,y+154);
 this.add.image(x+43,y+154,'dungeon-turret-parts-v1','base').setDisplaySize(60,60);
 this.add.image(x+43,y+148,'dungeon-tower-heads-'+type.sheet+'-v1',type.id).setDisplaySize(55,55).setOrigin(.5,.64).setRotation(Math.PI/2);
 this.add.sprite(x+260,y+151,'dungeon-slime','slime-0').setDisplaySize(58,58);
 const button=document.createElement('button');button.textContent=type.name;button.onclick=async()=>{this.unpause();sound.resume();button.disabled=true;try{await sound.preloadTowerShots([type.id]);if(!document.hidden)this.fire(i,true);}finally{button.disabled=false;}};document.querySelector('#weapons')!.append(button);
 });
 document.querySelectorAll('button').forEach(b=>b.disabled=false);
 status.textContent='12종 · 72프레임 준비됨';
 document.querySelector<HTMLButtonElement>('#all')!.onclick=()=>{this.unpause();this.fireAll();};
 document.querySelector<HTMLButtonElement>('#compare')!.onclick=()=>{this.stopLoop();this.cancelComparison();clearTowerProjectiles(this);this.tweens.timeScale=.4;TOWERS.forEach((type,i)=>{if(projectileProfile(type.id).duration<=125)this.comparisonTimers.push(this.time.delayedCall(70,()=>this.fire(i)));else this.fire(i);});this.comparisonTimers.push(this.time.delayedCall(190,()=>{this.tweens.timeScale=0;document.querySelector('#pause')!.textContent='계속 재생';status.textContent='동작 비교: 발사 중간 프레임';}));};
 document.querySelector<HTMLButtonElement>('#pause')!.onclick=()=>{this.tweens.timeScale=this.tweens.timeScale===0?1:0;document.querySelector('#pause')!.textContent=this.tweens.timeScale===0?'계속 재생':'일시정지';};
 document.querySelector<HTMLButtonElement>('#repeat')!.onclick=()=>{if(this.loop)this.stopLoop();else{this.unpause();this.loop=true;document.querySelector('#repeat')!.textContent='반복 발사 끄기';this.fireAll();this.repeatTimer=this.time.addEvent({delay:1100,loop:true,callback:()=>{if(this.tweens.timeScale>0)this.fireAll();}});}};
 document.querySelector<HTMLButtonElement>('#reduced')!.onclick=()=>{this.reduced=!this.reduced;document.querySelector('#reduced')!.textContent='모션 줄이기 '+(this.reduced?'ON':'OFF');clearTowerProjectiles(this);};
 document.querySelector<HTMLButtonElement>('#clear')!.onclick=()=>{this.stopLoop();clearTowerProjectiles(this);this.unpause();status.textContent='효과 0개 · 대기 중';};
 }
 fire(i:number,audible=false){const type=TOWERS[i],x=(i%4)*300,y=Math.floor(i/4)*220;this.launches++;
 if(audible)sound.play('shot',type.id);
 playTowerProjectile(this,{typeId:type.id,from:{x:x+75,y:y+151},to:{x:x+254,y:y+151},scale:1.4,reducedMotion:this.reduced,onImpact:()=>{this.impacts++;if(audible)sound.play('hit');status.textContent=type.name+' 명중 · '+this.impacts+'회';}});
 }
 fireAll(){TOWERS.forEach((_,i)=>this.fire(i));}
 cancelComparison(){for(const timer of this.comparisonTimers)timer.remove(false);this.comparisonTimers=[];}
 unpause(){this.cancelComparison();this.tweens.timeScale=1;document.querySelector('#pause')!.textContent='일시정지';}
 stopLoop(){this.loop=false;this.repeatTimer?.remove(false);this.repeatTimer=undefined;document.querySelector('#repeat')!.textContent='반복 발사 켜기';}
 update(){metrics.textContent='시각효과 '+towerProjectileEffectCount(this)+'개 / 발사 '+this.launches+'회 / 명중 '+this.impacts+'회 / 재생 '+(this.tweens.timeScale===0?'정지':'진행');}
}
document.querySelector<HTMLButtonElement>('#sound')!.onclick=()=>{sound.sfx=!sound.sfx;document.querySelector('#sound')!.textContent='효과음 '+(sound.sfx?'ON':'OFF');};
new Phaser.Game({type:Phaser.CANVAS,width:1200,height:660,parent:'canvas',backgroundColor:'#090d16',scene:new Preview(),audio:{noAudio:true},scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH}});

