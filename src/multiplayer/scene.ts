import {artURL} from '../art';
import Phaser from 'phaser';
import {loadDungeon,registerDungeon} from '../assets';
import {TOWERS,towerType,towerPrice,GRADE_NAMES} from '../towers';
import {MONSTERS,MONSTER_KINDS,MonsterKind} from '../monsters';
import {numberText} from '../math';
import {DuelState,Side,DuelTower,DUEL_ROAD,duelLevel,validDuelCell} from './duel';
import {HEROES,heroSpec,heroesAtLevel} from './heroes';
import {HitEquationPopups} from '../hit-equations';
import {learningDescription} from './decimal-boards';
import {AmbientProps} from '../ambient-props';
const X=37,Y=132,T=38;
export interface DuelView{state:DuelState|null;side:Side;room:string;selectedType:string;shopPage:number;slots:number[];operation:'+'|'-';selectedTower:number;message:string;busy:boolean;connected:boolean;}
export class DuelScene extends Phaser.Scene{
 ready=false;controls=new Map<string,{x:number;y:number;w:number;h:number;enabled:boolean;label:string;run:()=>void}>();
 onAction:(key:string)=>void=()=>{};onCell:(x:number,y:number)=>void=()=>{};onControls:()=>void=()=>{};
 onSound:(type:string)=>void=()=>{};
 private terrain!:Phaser.GameObjects.Container;private units!:Phaser.GameObjects.Container;private ui!:Phaser.GameObjects.Container;private guides!:Phaser.GameObjects.Graphics;
 private enemies=new Map<number,{sprite:Phaser.GameObjects.Sprite;hp:Phaser.GameObjects.Text;name:Phaser.GameObjects.Text;last:number}>();
 private towerViews=new Map<number,{head:Phaser.GameObjects.Image;tower:DuelTower}>();private signature='';private uiSignature='';private seenShots=new Set<number>();private revision=-1;private receivedAt=0;
 private reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 private hitEquations?:HitEquationPopups;
 private ambient?:AmbientProps;
 private loadingHeroes=new Set<number>();private heroRetry=new Map<number,number>();
 constructor(public view:()=>DuelView){super('duel');}
 preload(){loadDungeon(this,MONSTER_KINDS.filter(k=>k!=='warden'));this.load.image('duel-eggs',artURL('hero-eggs-v1'));}
 create(){
  registerDungeon(this);
  this.ambient=new AmbientProps(this,this.reduced);
  for(const kind of MONSTER_KINDS.filter(k=>this.textures.exists('dungeon-'+MONSTERS[k].atlas)))for(const [name,start]of [['walk',0],['frozen',8]] as const)this.anims.create({key:kind+'-'+name,frames:Array.from({length:4},(_,i)=>({key:'dungeon-'+MONSTERS[kind].atlas,frame:kind+'-'+(start+i)})),frameRate:5,repeat:-1});
  for(const effect of ['basic','slow','stun','range'])this.anims.create({key:'impact-'+effect,frames:Array.from({length:6},(_,i)=>({key:'dungeon-fx-impact-v1',frame:effect+'-'+i})),frameRate:22,repeat:0});
  for(const effect of ['muzzle','defeat'])this.anims.create({key:'fx-'+effect,frames:Array.from({length:6},(_,i)=>({key:'dungeon-fx-utility-v1',frame:effect+'-'+i})),frameRate:effect==='muzzle'?36:18,repeat:0});
  const egg=this.textures.get('duel-eggs'),source=egg.getSourceImage();for(let i=0;i<10;i++){const x=Math.round(i%5*source.width/5),y=Math.round(Math.floor(i/5)*source.height/2);egg.add('egg-'+(i+1),0,x,y,Math.round((i%5+1)*source.width/5)-x,Math.round(source.height/2));}
  this.terrain=this.add.container(0,0);this.units=this.add.container(0,0);this.guides=this.add.graphics().setDepth(8);this.ui=this.add.container(0,0).setDepth(10);this.hitEquations=new HitEquationPopups(this,{left:X+4,right:X+24*T-4,top:Y+4,bottom:Y+7*T-4});this.ready=true;this.redraw();
  this.input.on('pointerdown',(p:Phaser.Input.Pointer)=>{if(p.x>=X&&p.x<X+24*T&&p.y>=Y&&p.y<Y+7*T)this.onCell(Math.floor((p.x-X)/T),Math.floor((p.y-Y)/T));});
  this.input.on('pointermove',(p:Phaser.Input.Pointer)=>this.preview(Math.floor((p.x-X)/T),Math.floor((p.y-Y)/T)));
 }
 private text(g:Phaser.GameObjects.Container,x:number,y:number,value:string,size=20,color='#f6ecdf',center=true){
  const o=this.add.text(x,y,value,{fontFamily:'Malgun Gothic, sans-serif',fontSize:size,fontStyle:'bold',color,padding:{x:2,y:2}});if(center){
   const c=o.canvas,pixels=o.context.getImageData(0,0,c.width,c.height).data;let l=c.width,r=-1,t=c.height,b=-1;
   for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++)if(pixels[(y*c.width+x)*4+3]>90){l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y);}
   o.setOrigin(r>=l?(l+r+1)/2/c.width:.5,b>=t?(t+b+1)/2/c.height:.5);
  }g.add(o);return o;
 }
 private panel(g:Phaser.GameObjects.Container,x:number,y:number,w:number,h:number,active=false){const tex=active?'ui-button_red':'ui-panel_brown';const o=this.game.renderer.type===Phaser.WEBGL?this.add.nineslice(x,y,tex,undefined,w,h,14,14,14,14):this.add.image(x,y,tex).setDisplaySize(w,h);g.add(o);return o;}
 private button(key:string,x:number,y:number,w:number,h:number,label:string,enabled=true,active=false,size=19){
  const c=this.add.container(x,y);this.ui.add(c);this.panel(c,0,0,w,h,active);this.text(c,0,0,label,size);c.setAlpha(enabled?1:.5);
  const run=()=>{if(enabled)this.onAction(key);};const zone=this.add.zone(0,0,w,h).setInteractive({useHandCursor:enabled});c.add(zone);zone.on('pointerdown',run);
  this.controls.set(key,{x,y,w,h,enabled,label,run});return c;
 }
 private towerIcon(g:Phaser.GameObjects.Container,x:number,y:number,id:string,size:number){const spec=towerType(id)!;g.add(this.add.image(x,y,'dungeon-turret-parts-v1','base').setDisplaySize(size,size));const head=this.add.image(x,y-size*.06,'dungeon-tower-heads-'+spec.sheet+'-v1',id).setOrigin(.5,.64).setDisplaySize(size*.84,size*.84);g.add(head);return head;}
 redraw(){if(!this.ready)return;const v=this.view(),s=v.state,p=s?.players[v.side];if(s&&s.revision!==this.revision){this.revision=s.revision;this.receivedAt=performance.now();}
  const signature=JSON.stringify([v.side,v.room,v.selectedType,v.shopPage,v.slots,v.operation,v.selectedTower,v.message,v.busy,v.connected,s?.status,s?.learningLevel,Math.ceil(s?.elapsed??0),s?.log,s?.enemies.filter(e=>e.hero).length,s?.players.map(p=>p&&[p.name,p.flame,p.money,p.egg,p.ready,p.rewardHero,p.rewardUsed,p.board,p.towers.map(t=>[t.id,t.enabled,t.typeId,t.x,t.y])])]);
  if(signature===this.uiSignature){this.syncShots();this.syncEnemies();this.onControls();return;}this.uiSignature=signature;this.ui.removeAll(true);this.controls.clear();
  this.panel(this.ui,640,44,1264,76);this.text(this.ui,136,40,'소수의 성 · 1:1',24);this.text(this.ui,359,25,(v.side===0?'호스트 ':'참가자 ')+(v.room||'대기실'),16,'#bcb4aa');this.text(this.ui,359,56,`대전 Lv.${s?duelLevel(s):1}`,18,'#ffca7e');
  const seconds=Math.max(0,Math.ceil(300-(s?.elapsed??0)));this.text(this.ui,615,41,p?numberText(p.money)+' 코인':'돌 알을 깨워 상대 불꽃을 공격해요',p?28:19,'#ffcb7b');this.text(this.ui,879,41,`${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`,26);this.button('settings',963,42,76,55,'설정',true,false,18);
  this.button('lobby',1070,42,115,55,'대기실',!v.busy);this.button('leave',1200,42,115,55,'나가기',!v.busy);
  const terrainSig=(s?s.players.map(p=>p?.towers.map(t=>`${t.id}:${t.enabled}`).join(',')).join('|'):'')+v.side;
  if(terrainSig!==this.signature){this.signature=terrainSig;this.drawTerrain();}
  this.text(this.ui,265,104,(s?.players[0]?.name||'왼쪽 수호자')+(v.side===0?' · 나':'')+'  🔥 '+numberText(s?.players[0]?.flame??9000),21,'#9adbea');
  this.text(this.ui,734,104,(s?.players[1]?.name||'상대 기다리는 중')+(v.side===1?' · 나':'')+'  🔥 '+numberText(s?.players[1]?.flame??9000),21,'#f7bd85');
  this.panel(this.ui,1130,370,266,572);this.text(this.ui,1130,113,'타워 제작소',23);this.text(this.ui,1130,144,`내 타워 ${p?.towers.length??0}/14 · 코인 뺄셈으로 설치`,13,'#c3b8a8');
  TOWERS.slice(v.shopPage*6,v.shopPage*6+6).forEach((type,i)=>{
   const cost=towerPrice(type,p?.money??8800,s?duelLevel(s):1),open=!!p&&type.unlock<=duelLevel(s!)&&p.money>=cost&&!v.busy&&s?.status!=='finished';
   const c=this.button('type:'+type.id,1130,195+i*70,228,66,'',open,v.selectedType===type.id);this.towerIcon(c,-83,0,type.id,53);
   this.text(c,-49,-20,type.name+' · '+GRADE_NAMES[type.grade],15,'#f6ecdf',false).setOrigin(0,.5);this.text(c,-49,1,'공격 '+numberText(type.unit),14,'#c9bbaa',false).setOrigin(0,.5);this.text(c,-49,21,type.unlock<=duelLevel(s??({elapsed:0} as DuelState))?numberText(cost)+' 코인':`대전 Lv.${type.unlock} 해금`,16,'#ffca7e',false).setOrigin(0,.5);
   this.controls.get('type:'+type.id)!.label=type.name+' 공격 '+numberText(type.unit)+' 가격 '+numberText(cost);
  });
  this.button('page:prev',1045,622,64,54,'◀',v.shopPage>0);this.text(this.ui,1130,622,`${v.shopPage+1}/2`,19);this.button('page:next',1215,622,64,54,'▶',v.shopPage<1);
  this.panel(this.ui,240,607,467,324);this.text(this.ui,240,457,'동일한 순서의 소수 블럭 16개',20);
  this.text(this.ui,240,479,`학습 Lv.${s?.learningLevel??1} · ${learningDescription(s?.learningLevel??1)}`,12,'#ffca7e');
  (p?.board??Array(16).fill(0)).forEach((n,i)=>this.button('block:'+i,76+i%4*110,518+Math.floor(i/4)*61,99,56,p?numberText(n):'?',!!p&&s?.status==='playing'&&!v.busy&&!v.slots.includes(i),v.slots.includes(i),23));
  this.panel(this.ui,738,607,505,324);this.text(this.ui,738,468,'세 블럭으로 돌 알 성장',23);
  this.button('op:+',539,521,63,56,'+',true,v.operation==='+',29);this.button('op:-',612,521,63,56,'−',true,v.operation==='-',29);
  [540,667,794].forEach((x,i)=>this.button('slot:'+i,x,586,103,58,p&&v.slots[i]!==undefined?numberText(p.board[v.slots[i]]):'?',true,false,27));this.text(this.ui,605,586,v.operation==='+'?'+':'−',25);this.text(this.ui,733,586,'=',25);
  this.button('fuse',922,586,105,59,'합성',!!p&&v.slots.length===3&&p.egg<10&&s?.status==='playing'&&!v.busy,true,22);
  const eggLevel=p?.egg??0;const egg=this.add.image(551,684,'duel-eggs','egg-'+Math.max(1,eggLevel)).setDisplaySize(62,98).setAlpha(eggLevel?1:.3);this.ui.add(egg);this.text(this.ui,639,648,eggLevel?`돌 알 Lv.${eggLevel}`:'합성 정답으로 알 획득',19,'#ffca7e');
  this.text(this.ui,730,692,eggLevel?'지금 부화하거나 정답을 더 맞혀요':'정답 1회당 1레벨 · 최고 10레벨',17,'#c1b7aa');this.button('hatch',863,737,229,56,'영웅 부화 ▶',eggLevel>0&&s?.status==='playing'&&!v.busy,true,22);
  const selected=p?.towers.find(t=>t.id===v.selectedTower);
  if(selected){this.button('toggle',1085,696,137,57,selected.enabled?'발사 끄기':'발사 켜기',!v.busy);this.button('sell',1220,696,105,57,'회수',!v.busy);}
  else this.text(this.ui,1130,697,v.selectedType?'한 칸 띄워 내 쪽에 설치':'타워를 누르면 발사 조절',16,'#c1b7aa');
  const reserve=p?.rewardHero?heroSpec(p.rewardHero):null;
  this.text(this.ui,1130,657,reserve?`학습지 · ${reserve.name} Lv.${reserve.level}`:'학습지 암호를 풀면 영웅 획득',12,'#ffca7e');
  this.button('heroes',1069,756,113,57,'영웅 도감',true,false,16);
  this.button('reserve',1192,756,113,57,s?.status==='waiting'?'영웅 선택':p?.rewardUsed?'사용 완료':reserve?`Lv.${reserve.level} 소환`:'영웅 없음',!!p&&!v.busy&&(s?.status==='waiting'&&!p.ready||s?.status==='playing'&&!!reserve&&!p.rewardUsed),!!reserve&&!p?.rewardUsed,16);
  this.controls.get('reserve')!.label=s?.status==='waiting'?'학습지 몬스터 선택':p?.rewardUsed?'학습지 몬스터 사용 완료':reserve?`학습지 ${reserve.name} 레벨 ${reserve.level} 한 번 소환`:'학습지 몬스터 없음';
  if(s?.status==='waiting')this.button('ready',485,424,240,57,p?.ready?'상대 준비 기다리는 중':'준비 완료',!!s.players[1]&&!p?.ready&&!v.busy,true,19);
  else {const message=v.busy?'호스트가 조작을 확인하고 있어요':v.message||(!v.connected?'연결을 다시 확인하는 중이에요':s?.log.at(-1)||'성벽 없이 곧은 길 · 내 영웅은 상대 불꽃으로!');const m=this.text(this.ui,493,424,message,18,'#ffcf8c');m.setScale(Math.min(1,925/Math.max(1,m.width)));}
  this.syncShots();this.syncEnemies();this.onControls();
 }
 private drawTerrain(){this.ambient?.prepareRedraw();this.terrain.removeAll(true);this.units.removeAll(true);this.towerViews.clear();const s=this.view().state;
  this.panel(this.terrain,493,266,970,299);this.terrain.add(this.add.tileSprite(X+456,Y+133,912,266,'dungeon-terrain','floor').setTileScale(.35));
  const grid=this.add.graphics();for(let x=0;x<24;x++)for(let y=0;y<7;y++){
   const cx=X+(x+.5)*T,cy=Y+(y+.5)*T;if(y===DUEL_ROAD)this.terrain.add(this.add.image(cx,cy,'dungeon-terrain','path').setDisplaySize(T,T));
   else{grid.lineStyle(1,x<12?0x55aec3:0xe2a569,.18).strokeRect(cx-T/2,cy-T/2,T,T);}
  }this.terrain.add(grid);
  for(const side of [0,1] as Side[]){const x=X+(side===0?.5:23.5)*T;this.ambient?.add(this.terrain,'guardian-'+side,'flame',x,Y+3.5*T-10,94,92).setTint(side===0?0xa6e8ff:0xffc382);
   for(const t of s?.players[side]?.towers??[]){const x=X+(t.x+.5)*T,y=Y+(t.y+.5)*T,c=this.add.container(x,y-4);this.units.add(c);c.setAlpha(t.enabled?1:.5);const head=this.towerIcon(c,0,0,t.typeId,47);this.text(c,0,30,numberText(t.unit),15,'#ffe4a6').setBackgroundColor('#11131be8');this.towerViews.set(t.id,{head,tower:t});}
  }
 }
 private ensureHero(level:number){
  const key='heroes-'+level;if(this.textures.exists(key)||this.loadingHeroes.has(level)||performance.now()<(this.heroRetry.get(level)??0))return;this.loadingHeroes.add(level);
  const event='filecomplete-image-'+key,complete=()=>{this.load.off('loaderror',failed);const texture=this.textures.get(key),source=texture.getSourceImage();
   for(let row=0;row<3;row++)for(let frame=0;frame<4;frame++){const y=Math.round(row*source.height/3),end=Math.round((row+1)*source.height/3);texture.add(`hero-${level}-${row}-${frame}`,0,Math.round(frame*source.width/4),y,Math.round(source.width/4),end-y);}
   for(const h of heroesAtLevel(level))this.anims.create({key:h.id,frames:Array.from({length:4},(_,i)=>({key,frame:h.id+'-'+i})),frameRate:5,repeat:-1});this.loadingHeroes.delete(level);this.syncEnemies();
  };
  const failed=(file:Phaser.Loader.File)=>{if(file.key!==key)return;this.load.off(event,complete);this.load.off('loaderror',failed);this.loadingHeroes.delete(level);this.heroRetry.set(level,performance.now()+30000);};
  this.load.once(event,complete);this.load.on('loaderror',failed);this.load.image(key,artURL(`heroes-level-${level}-v1`));if(!this.load.isLoading())this.load.start();
 }
 private syncEnemies(){const s=this.view().state,live=new Set(s?.enemies.map(e=>e.id));for(const [id,v]of this.enemies)if(!live.has(id)){v.sprite.destroy();v.hp.destroy();v.name.destroy();this.enemies.delete(id);}
  for(const e of s?.enemies??[]){let v=this.enemies.get(e.id);const hero=e.hero?heroSpec(e.hero):null,kind:MonsterKind=e.level>=8?'king':e.level>=6?'crystal':e.level>=4?'golem':e.level>=2?'beetle':'slime',size=hero?44+hero.level*2.6:39+e.level*1.4;
   const x=X+(e.x+.5)*T,y=Y+3.5*T-4;
   if(hero)this.ensureHero(hero.level);const heroReady=hero&&this.textures.exists('heroes-'+hero.level),texture=heroReady?'heroes-'+hero.level:'dungeon-'+MONSTERS[kind].atlas,frame=heroReady?hero.id+'-0':kind+'-0';
   if(!v){const sprite=this.add.sprite(x,y,texture,frame);sprite.setDisplaySize(size,size).setDepth(4).setFlipX(e.target===0);if(!this.reduced)sprite.play(heroReady?hero.id:kind+'-walk');
    const hp=this.add.text(x,y-size*.5-11,'',{fontFamily:'Malgun Gothic',fontSize:18,fontStyle:'bold',color:'#fff2d6',backgroundColor:'#11131dea',padding:{x:3,y:1}}).setOrigin(.5).setDepth(7);
    const name=this.add.text(x,y-size*.5-31,hero?`★ ${hero.name}`:'',{fontFamily:'Malgun Gothic',fontSize:11,color:e.owner===0?'#9fe8ff':'#ffcc8a',backgroundColor:'#11131dea'}).setOrigin(.5).setDepth(7);v={sprite,hp,name,last:e.hp};this.enemies.set(e.id,v);
   }else if(v.last!==e.hp){if(!this.reduced)this.tweens.add({targets:v.sprite,alpha:.4,yoyo:true,duration:90,repeat:1});v.last=e.hp;}
   if(v.sprite.texture.key!==texture){v.sprite.stop().setTexture(texture,frame).setDisplaySize(size,size);}
   if(!this.reduced){const anim=heroReady?hero.id:kind+'-'+(e.slow>0||e.stun>0?'frozen':'walk');if(v.sprite.anims.currentAnim?.key!==anim)v.sprite.play(anim);}
   const aura=(s?.enemies??[]).filter(o=>o.owner===e.owner&&o.hp>0&&o.hero&&heroSpec(o.hero)?.effect==='haste'&&Math.abs(o.x-e.x)<=3).reduce((a,o)=>Math.max(a,1.12+o.level*.025),1),resistance=hero?.effect==='steadfast'?Math.min(.8,.2+hero.level*.06):0;
   v.hp.setText(numberText(e.hp));v.sprite.setData('x',x);v.sprite.setData('y',y);v.sprite.setData('vx',e.stun>0?0:(e.target===0?-1:1)*(.24+e.level*.009)*aura*(e.slow>0?.6+.4*resistance:1)*T);v.hp.setData('y',y-size*.5-11);v.name.setData('y',y-size*.5-31);
  }
 }
 private syncShots(){
  const s=this.view().state;if(!s){this.seenShots.clear();this.hitEquations?.clear();return;}const shots=s.shots??[],fresh=shots.filter(e=>!this.seenShots.has(e.id));this.seenShots=new Set(shots.map(e=>e.id));
  fresh.slice(-12).forEach((hit,i)=>this.time.delayedCall(this.reduced?0:i*70,()=>{
   this.onSound('shot');
   const t=s.players[hit.owner]?.towers.find(t=>t.id===hit.towerId),x=X+(hit.x+.5)*T,y=Y+3.5*T-4,bodySize=this.enemies.get(hit.enemyId)?.sprite.displayHeight??53;
   const impact=()=>{
    this.onSound(hit.before===hit.after?'invalid':hit.after===0?'kill':'hit');
    if(!this.reduced){const fx=this.add.sprite(x,y,'dungeon-fx-impact-v1',hit.effect+'-0').setDisplaySize(70,70).setDepth(6);fx.play('impact-'+hit.effect).once('animationcomplete',()=>fx.destroy());if(hit.after===0){const fall=this.add.sprite(x,y,'dungeon-fx-utility-v1','defeat-0').setDisplaySize(76,76).setDepth(6);fall.play('fx-defeat').once('animationcomplete',()=>fall.destroy());}}
    this.hitEquations?.show(hit.enemyId,hit.before,hit.unit,hit.after,()=>{const v=this.enemies.get(hit.enemyId);return{x:v?.sprite.x??x,y:v?(v.name.text?v.name.y-40:v.hp.y-42):y-bodySize*.5-63};},1,hit.owner===0?'#b5f4ff':'#ffe1a0',hit.id);
   };
   if(!t||this.reduced){impact();return;}const fromX=X+(t.x+.5)*T,fromY=Y+(t.y+.5)*T-8,angle=Math.atan2(y-fromY,x-fromX)+Math.PI/2;
   const muzzle=this.add.sprite(fromX,fromY,'dungeon-fx-utility-v1','muzzle-0').setDisplaySize(45,45).setRotation(angle).setDepth(6);muzzle.play('fx-muzzle').once('animationcomplete',()=>muzzle.destroy());
   const shot=this.add.image(fromX,fromY,'dungeon-fx-utility-v1','projectile-'+hit.effect).setDisplaySize(18,25).setRotation(angle).setDepth(6);this.tweens.add({targets:shot,x,y,duration:220,onComplete:()=>{shot.destroy();impact();}});
  }));
 }
 preview(x:number,y:number){this.guides.clear();const v=this.view(),s=v.state;if(!s||!v.selectedType)return;
  for(const t of s.players[v.side]!.towers)for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++){const nx=t.x+dx,ny=t.y+dy;if(nx<0||nx>23||ny<0||ny>=7||(!dx&&!dy))continue;this.guides.fillStyle(0xdd6c50,.2).fillRect(X+nx*T,Y+ny*T,T,T);}
  if(x>=0&&x<24&&y>=0&&y<7)this.guides.lineStyle(3,validDuelCell(s,v.side,x,y)?0xffdf94:0xdd6c50).strokeRect(X+x*T+2,Y+y*T+2,T-4,T-4);
 }
 update(_time:number,delta:number){const s=this.view().state;if(!s)return;const smooth=1-Math.exp(-delta/100);
  // Predict movement between host snapshots for smooth art; HP and outcomes
  // always come from the host. Prediction stops during a connection outage.
  const age=s.status==='playing'?Math.min(1.5,(performance.now()-this.receivedAt)/1000):0;
  for(const e of s.enemies){const v=this.enemies.get(e.id);if(!v)continue;const targetX=Phaser.Math.Clamp(Number(v.sprite.getData('x'))+Number(v.sprite.getData('vx'))*age,X+T*.5,X+23.5*T),targetY=Number(v.sprite.getData('y'));v.sprite.x+= (targetX-v.sprite.x)*smooth;v.sprite.y+=(targetY-v.sprite.y)*smooth;v.hp.setPosition(v.sprite.x,Number(v.hp.getData('y')));v.name.setPosition(v.sprite.x,Number(v.name.getData('y')));}
  for(const {head,tower:t}of this.towerViews.values()){if(!t.enabled)continue;const p=s.players.findIndex(p=>p?.towers.some(o=>o.id===t.id)),radius=towerType(t.typeId)!.effect==='range'?4:3,e=s.enemies.filter(e=>e.target===p&&Math.hypot(e.x-t.x,DUEL_ROAD-t.y)<=radius).sort((a,b)=>Number(b.hp>=t.unit)-Number(a.hp>=t.unit))[0];if(e){const angle=Math.atan2(DUEL_ROAD-t.y,e.x-t.x)+Math.PI/2;head.rotation+=Phaser.Math.Angle.Wrap(angle-head.rotation)*Math.min(1,delta/90);}}
 }
}
