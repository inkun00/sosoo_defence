import {artURL} from '../art';
import Phaser from 'phaser';
import {loadDungeon,registerDungeon,terrainTileScale} from '../assets';
import {TOWERS,towerType,towerPrice,GRADE_NAMES} from '../towers';
import {MONSTERS,MONSTER_KINDS,MonsterKind} from '../monsters';
import {numberText} from '../math';
import {DuelState,DuelPlayer,Side,DuelTower,DUEL_ROAD,FLAME_MAX,DUEL_SECONDS,DUEL_TOTAL_SECONDS,DUEL_PREPARATION_SECONDS,duelScore,duelLevel,duelBuildCost,canUseDuelTower,validDuelCell,canPurchaseDuelTower,duelEnemyPosition,duelEnemyDistance,activeDuelHeroEffects,activeDuelTowerHeroEffects,duelHeroLearningLevel} from './duel';
import {duelMap,duelRoadCell} from './duel-maps';
import {HEROES,heroSpec,heroesAtLevel} from './heroes';
import {HitEquationPopups} from '../hit-equations';
import {learningDescription} from './decimal-boards';
import {AmbientProps} from '../ambient-props';
import {playTowerProjectile,clearTowerProjectiles} from '../tower-projectiles';
import {DuelShotStream} from './shot-stream';
import {OpponentPortrait,ComputerView} from './opponent-portrait';
import {HeroSummonStream} from './hero-summon-stream';
import {HeroSummonEffects} from './hero-summon-effects';
import {DuelHeroEffectBadges,loadDuelHeroEffectBadges,registerDuelHeroEffectBadges} from './hero-effect-badges';
import type {GameScreenLayout} from '../responsive-game';
const X=37,T=38;
const HERO_EFFECT_LABELS={haste:'아군 이동 가속',vitality:'아군 체력 강화',shield:'아군 보호막', 'enemy-slow':'상대 타워 감속', 'tower-haste':'아군 타워 가속'};
export interface DuelPurchaseArea{x:number;y:number;width:number;height:number;compact:boolean;minimumTouch:number;}
export interface DuelView{state:DuelState|null;side:Side;room:string;selectedType:string;shopPage:number;slots:number[];selectedTower:number;message:string;busy:boolean;connected:boolean;computer?:ComputerView;}
export class DuelScene extends Phaser.Scene{
 ready=false;controls=new Map<string,{x:number;y:number;w:number;h:number;enabled:boolean;label:string;run:()=>void}>();
 onAction:(key:string)=>void=()=>{};onCell:(x:number,y:number)=>void=()=>{};onControls:()=>void=()=>{};
 onSound:(type:string,towerTypeId?:string)=>void=()=>{};
 private terrain!:Phaser.GameObjects.Container;private units!:Phaser.GameObjects.Container;private ui!:Phaser.GameObjects.Container;private guides!:Phaser.GameObjects.Graphics;
 private enemies=new Map<number,{sprite:Phaser.GameObjects.Sprite;hp:Phaser.GameObjects.Text;name:Phaser.GameObjects.Text;effects:DuelHeroEffectBadges;last:number;size:number;heroId:string|null;owner:Side}>();
 private towerViews=new Map<number,{head:Phaser.GameObjects.Image;tower:DuelTower;side:Side;effects:DuelHeroEffectBadges}>();private signature='';private uiSignature='';private revision=-1;private receivedAt=0;
 private shotStream=new DuelShotStream();private shotTimers=new Set<Phaser.Time.TimerEvent>();private shotEffects=new Set<Phaser.GameObjects.GameObject>();
 private reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 private hitEquations?:HitEquationPopups;
 private ambient?:AmbientProps;
 private opponentPortrait?:OpponentPortrait;
 private heroSummonStream=new HeroSummonStream();private heroSummonEffects?:HeroSummonEffects;
 private loadingHeroes=new Set<number>();private heroRetry=new Map<number,number>();
 private screenLayout:GameScreenLayout={width:1280,height:800,compact:false,scale:1,pixelWidth:1280,pixelHeight:800};
 private blockPage=0;private heroPage=0;
 private hitBounds={left:X+4,right:X+24*T-4,top:136,bottom:394};
 private get minimumTouch(){return this.screenLayout.compact?Math.max(68,Math.ceil(44/this.screenLayout.scale)):56;}
 private get boardY(){return this.screenLayout.compact?this.minimumTouch+45:132;}
 private get shopPageSize(){if(!this.screenLayout.compact)return 6;return Math.max(2,Math.min(6,Math.floor((this.screenLayout.height-this.minimumTouch*3-94)/(this.minimumTouch+6))));}
 private get compactBlockColumns(){return this.minimumTouch>114?2:this.minimumTouch>74?4:8;}
 private get blockPageCount(){return Math.ceil(16/(this.compactBlockColumns*2));}
 get shopPageCount(){return Math.ceil(TOWERS.length/this.shopPageSize);}
 getPurchaseArea():DuelPurchaseArea{return{x:8,y:this.screenLayout.compact?this.boardY+299:445,width:this.screenLayout.compact&&this.minimumTouch>114?1264:982,height:this.screenLayout.compact?this.screenLayout.height-this.boardY-307:332,compact:this.screenLayout.compact,minimumTouch:this.minimumTouch};}
 cycleBlockPage(){this.blockPage=(this.blockPage+1)%this.blockPageCount;this.uiSignature='';this.redraw();}
 changeHeroPage(change:number){this.heroPage=Math.max(0,this.heroPage+change);this.uiSignature='';this.redraw();}
 setScreenLayout(layout:GameScreenLayout){
  const previousY=this.boardY;this.screenLayout=layout;this.blockPage=Math.min(this.blockPage,this.blockPageCount-1);this.uiSignature='';this.signature='';
  Object.assign(this.hitBounds,{top:this.boardY+4,bottom:this.boardY+7*T-4});
  if(!this.ready)return;
  if(previousY!==this.boardY){this.clearShotEffects();this.guides.clear();this.heroSummonEffects?.destroy();this.heroSummonEffects=new HeroSummonEffects(this,{left:X,right:X+24*T,top:this.boardY,bottom:this.boardY+7*T},this.reduced);
   const state=this.view().state;for(const enemy of state?.enemies??[]){const visual=this.enemies.get(enemy.id),point=duelEnemyPosition(state!,enemy);if(visual)visual.sprite.setPosition(X+(point.x+.5)*T,this.boardY+(point.y+.5)*T-4).setDisplaySize(visual.size,visual.size).setAlpha(1);}
  }
  this.opponentPortrait?.setLayout(layout.compact,layout.height);this.redraw();
 }
 constructor(public view:()=>DuelView){super('duel');}
 preload(){loadDungeon(this,MONSTER_KINDS.filter(k=>k!=='warden'&&k!=='wizard'));this.load.image('duel-eggs',artURL('hero-eggs-v1'));loadDuelHeroEffectBadges(this);}
 create(){
  registerDungeon(this);registerDuelHeroEffectBadges(this);
  this.events.once('shutdown',()=>{this.clearShotEffects();this.shotStream.reset();this.opponentPortrait?.destroy();this.heroSummonEffects?.destroy();this.heroSummonEffects=undefined;this.heroSummonStream.reset();for(const enemy of this.enemies.values())enemy.effects.destroy();this.enemies.clear();for(const tower of this.towerViews.values())tower.effects.destroy();this.towerViews.clear();this.signature='';this.uiSignature='';this.revision=-1;this.ready=false;});
  this.opponentPortrait=new OpponentPortrait(this,this.reduced);
  this.opponentPortrait.setLayout(this.screenLayout.compact,this.screenLayout.height);
  this.ambient=new AmbientProps(this,this.reduced);
  for(const kind of MONSTER_KINDS.filter(k=>this.textures.exists('dungeon-'+MONSTERS[k].atlas)))for(const [name,start]of [['walk',0],['frozen',8]] as const)this.anims.create({key:kind+'-'+name,frames:Array.from({length:4},(_,i)=>({key:'dungeon-'+MONSTERS[kind].atlas,frame:kind+'-'+(start+i)})),frameRate:5,repeat:-1});
  for(const effect of ['basic','slow','stun','range'])this.anims.create({key:'impact-'+effect,frames:Array.from({length:6},(_,i)=>({key:'dungeon-fx-impact-v1',frame:effect+'-'+i})),frameRate:22,repeat:0});
  for(const effect of ['muzzle','defeat'])this.anims.create({key:'fx-'+effect,frames:Array.from({length:6},(_,i)=>({key:'dungeon-fx-utility-v1',frame:effect+'-'+i})),frameRate:effect==='muzzle'?36:18,repeat:0});
  const egg=this.textures.get('duel-eggs'),source=egg.getSourceImage();for(let i=0;i<10;i++){const x=Math.round(i%5*source.width/5),y=Math.round(Math.floor(i/5)*source.height/2);egg.add('egg-'+(i+1),0,x,y,Math.round((i%5+1)*source.width/5)-x,Math.round(source.height/2));}
  this.terrain=this.add.container(0,0);this.units=this.add.container(0,0);this.guides=this.add.graphics().setDepth(8);this.ui=this.add.container(0,0).setDepth(10);this.hitEquations=new HitEquationPopups(this,this.hitBounds);this.heroSummonEffects=new HeroSummonEffects(this,{left:X,right:X+24*T,top:this.boardY,bottom:this.boardY+7*T},this.reduced);this.ready=true;this.redraw();
  this.input.on('pointerdown',(p:Phaser.Input.Pointer)=>{if(p.x>=X&&p.x<X+24*T&&p.y>=this.boardY&&p.y<this.boardY+7*T)this.onCell(Math.floor((p.x-X)/T),Math.floor((p.y-this.boardY)/T));});
  this.input.on('pointermove',(p:Phaser.Input.Pointer)=>this.preview(Math.floor((p.x-X)/T),Math.floor((p.y-this.boardY)/T)));
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
 redraw(){if(!this.ready)return;const v=this.view(),s=v.state,p=s?.players[v.side];this.opponentPortrait?.sync(v.computer);if(s?.status!=='playing')this.guides.clear();if(s&&s.revision!==this.revision){this.revision=s.revision;this.receivedAt=performance.now();}
  const compact=this.screenLayout.compact,height=this.screenLayout.height,touch=this.minimumTouch,headerHeight=compact?touch+6:76;
  const signature=JSON.stringify([compact,height,this.blockPage,this.heroPage,v.side,v.room,v.selectedType,v.shopPage,v.slots,v.selectedTower,v.message,v.busy,v.connected,v.computer?.mood,v.computer?.phrase,s?.mapId,s?.status,s?.learningLevel,Math.ceil(s?.elapsed??0),Math.ceil(DUEL_PREPARATION_SECONDS-(s?.preparationElapsed??0)),s?.log,s?.enemies.filter(e=>e.hero).length,s?.players.map(p=>p&&[p.name,p.accountLevel,p.flame,p.money,p.combatScore,p.questionScore,p.kills,p.answeredQuestions,p.stock,p.heroStock,p.purchaseVariation?.round,p.egg,p.ready,p.rewardHero,p.rewardUsed,p.board,p.towers.map(t=>[t.id,t.enabled,t.typeId,t.x,t.y])])]);
  if(signature===this.uiSignature){this.syncShots();this.syncEnemies();this.syncTowerEffects();this.syncHeroSummons();this.onControls();return;}this.uiSignature=signature;this.ui.removeAll(true);this.controls.clear();
  this.panel(this.ui,640,compact?headerHeight/2+3:44,1264,headerHeight);this.text(this.ui,136,compact?headerHeight/2:40,'소수 디펜스 · 1:1',24);this.text(this.ui,359,compact?headerHeight/2-15:25,(v.side===0?'호스트 ':'참가자 ')+(v.room||'대기실'),16,'#bcb4aa');this.text(this.ui,359,compact?headerHeight/2+16:56,`Lv.${s?duelLevel(s):1} · ${duelMap(s?.mapId).name}`,15,'#ffca7e');
  const preparing=s?.status==='preparing',stockTotal=Object.values(p?.stock??{}).reduce((sum,count)=>sum+count,0),heroTotal=Object.values(p?.heroStock??{}).reduce((sum,count)=>sum+count,0),seconds=Math.max(0,Math.ceil((preparing?DUEL_PREPARATION_SECONDS-(s.preparationElapsed??0):DUEL_SECONDS-(s?.elapsed??0))-1e-7));
  const totalSeconds=preparing?seconds+DUEL_SECONDS:s?.status==='waiting'||!s?DUEL_TOTAL_SECONDS:seconds,clock=(value:number)=>`${String(Math.floor(value/60)).padStart(2,'0')}:${String(value%60).padStart(2,'0')}`;
  if(preparing){this.text(this.ui,615,compact?headerHeight/2-15:26,'준비 예산 '+numberText(p?.money??0)+' 코인',21,'#ffcb7b');this.text(this.ui,615,compact?headerHeight/2+17:58,`비축 타워 ${stockTotal}개 · 영웅 ${heroTotal}개`,14,'#f3dfb9');}
  else this.text(this.ui,615,compact?headerHeight/2:41,p?`비축 타워 ${stockTotal} · 영웅 ${heroTotal}`:'타워와 영웅을 준비해요',p?22:19,'#ffcb7b');
  this.text(this.ui,861,compact?headerHeight/2-25:17,'전체 남은 시간',12,'#f3dfb9');this.text(this.ui,861,compact?headerHeight/2:40,clock(totalSeconds),26,'#ffcb7b').setName('duel-total-timer');this.text(this.ui,861,compact?headerHeight/2+25:64,s?.status==='waiting'||!s?'문제 2분 + 전투 3분':`${preparing?'문제풀이':'전투'} ${clock(seconds)}`,12,'#f3dfb9').setName('duel-phase-timer');this.button('settings',compact?953:963,compact?headerHeight/2+3:42,compact?Math.max(80,touch):76,compact?touch:55,'설정',true,false,18);
  this.button('lobby',1070,compact?headerHeight/2+3:42,115,compact?touch:55,'대기실',!v.busy);this.button('leave',1200,compact?headerHeight/2+3:42,115,compact?touch:55,'나가기',!v.busy);
  const terrainSig=JSON.stringify([s?.mapId,s?.players.map(p=>p?.towers.map(t=>[t.id,t.typeId,t.x,t.y,t.enabled])),v.side]);
  if(terrainSig!==this.signature){this.signature=terrainSig;this.drawTerrain();}
  this.text(this.ui,265,compact?headerHeight+10:96,(s?.players[0]?.name||'왼쪽 수호자')+(v.side===0?' · 나':'')+'  🔥 '+numberText(s?.players[0]?.flame??9000),19,'#9adbea');
  this.text(this.ui,734,compact?headerHeight+10:96,(s?.players[1]?.name||'상대 기다리는 중')+(v.side===1?' · 나':'')+'  🔥 '+numberText(s?.players[1]?.flame??9000),19,'#f7bd85');
  for(const side of [0,1] as Side[]){const player=s?.players[side];this.text(this.ui,side===0?265:734,compact?headerHeight+28:117,`점수 ${duelScore(player).toLocaleString('ko-KR')} · 전투 ${(player?.combatScore??0).toLocaleString('ko-KR')} / 문제 ${(player?.questionScore??0).toLocaleString('ko-KR')}`,14,side===0?'#9adbea':'#f7bd85').setName('duel-score-'+side);}
  this.drawCastleHealth(s);
  const shopTop=compact?headerHeight+8:84,shopHeight=compact?height-shopTop-8:preparing?612:572,shopItems=this.shopPageSize,page=Math.min(v.shopPage,this.shopPageCount-1),cardHeight=compact?touch:66,cardTop=compact?headerHeight+60:162,cardGap=compact?6:4,pageY=compact?height-touch*1.5-28:preparing?609:622;
  this.panel(this.ui,1130,shopTop+shopHeight/2,266,shopHeight);this.text(this.ui,1130,compact?shopTop+18:113,preparing?'타워 구입 문제':'타워 배치',23);this.text(this.ui,1130,compact?shopTop+43:144,preparing?`타워 선택 → 뺄셈 정답 → 1개 비축`:s?.status==='waiting'?'문제풀이 2분 뒤 전투 3분':`설치 ${p?.towers.length??0}/14 · 비축 ${stockTotal}개`,13,'#c3b8a8');
  TOWERS.slice(page*shopItems,page*shopItems+shopItems).forEach((type,i)=>{
   const stored=p?.stock?.[type.id]??0,cost=preparing&&p?.quote?.typeId===type.id?p.quote.cost:s&&p?duelBuildCost(s,v.side,type.id):towerPrice(type,8800,1),unlocked=s?canUseDuelTower(s,v.side,type.id):type.unlock<=1,capacity=preparing||(p?.towers.length??0)<14&&(type.unit!==10||(p?.towers.filter(t=>t.unit===10).length??0)<3),open=!!s&&!!p&&!v.busy&&canPurchaseDuelTower(s)&&capacity&&unlocked&&p.money>=cost;
   const c=this.button('type:'+type.id,1130,cardTop+cardHeight/2+i*(cardHeight+cardGap),228,cardHeight,'',open,v.selectedType===type.id);this.towerIcon(c,-83,0,type.id,53);
   this.text(c,-49,-20,type.name+' · '+GRADE_NAMES[type.grade],15,'#f6ecdf',false).setOrigin(0,.5);this.text(c,-49,1,'공격 '+numberText(type.unit)+` · 비축 ${stored}개`,14,stored?'#a3e9dd':'#c9bbaa',false).setOrigin(0,.5);const priceLabel=s?.status==='playing'?(stored>0?'비축 · 무료 설치':'비축 없음'):unlocked?numberText(cost)+' 코인':`대전 Lv.${type.unlock} 해금`;this.text(c,-49,21,priceLabel,16,'#ffca7e',false).setOrigin(0,.5);
   this.controls.get('type:'+type.id)!.label=type.name+' 공격 '+numberText(type.unit)+` 비축 ${stored}개 `+(preparing?'뺄셈 문제로 비축 가격 '+numberText(cost):priceLabel);
  });
  this.button('page:prev',1045,pageY,compact?Math.max(64,touch):64,compact?touch:56,'◀',page>0);this.text(this.ui,1130,pageY,`${page+1}/${this.shopPageCount}`,19);this.button('page:next',1215,pageY,compact?Math.max(64,touch):64,compact?touch:56,'▶',page<this.shopPageCount-1);
  if(preparing&&p){if(compact)this.drawCompactCrafting(p,s,v);else this.drawPreparation(p,v,heroTotal);}
  else if(s?.status==='playing'&&p)this.drawBattleReserve(p,v);
  else this.drawInstructions(compact);
  const selected=p?.towers.find(t=>t.id===v.selectedTower);
  const shopBottomY=compact?height-touch/2-10:preparing?667:696;
  if(selected){this.text(this.ui,compact?1110:1085,shopBottomY,compact?'자동 공격':'타워 자동 공격',16,'#c1b7aa');this.button('sell',1220,shopBottomY,105,compact?touch:57,'회수',!v.busy);}
  else if(preparing)this.button('prepare:heroes',1130,shopBottomY,228,compact?touch:56,'영웅 부화 문제',!v.busy,true,18);
  else if(!compact)this.text(this.ui,1130,697,v.selectedType?'내 쪽 빈 바닥에 바로 설치':'타워는 회수 후 다시 배치해요',16,'#c1b7aa');
  const reserve=p?.rewardHero?heroSpec(p.rewardHero):null;
  // Prepare every reserved hero atlas before its manually timed entrance.
  for(const player of s?.players??[]){const companion=player?.rewardHero?heroSpec(player.rewardHero):null;if(companion)this.ensureHero(companion.level);for(const [id,count]of Object.entries(player?.heroStock??{})){const hero=count>0?heroSpec(id):null;if(hero)this.ensureHero(hero.level);}}
  if(!compact&&!preparing)this.text(this.ui,1130,657,reserve?`${p?.rewardUsed?'출전 영웅':'수집 영웅'} · ${reserve.name} Lv.${reserve.level}`:'학습지 암호를 풀면 영웅 획득',12,'#ffca7e');
  if(v.computer&&!compact){this.panel(this.ui,1130,748,266,100);const phrase=this.text(this.ui,1159,733,v.computer.phrase,13,'#f2d7a2');phrase.setWordWrapWidth(138).setOrigin(.5,.5);}
  else if(!v.computer&&!selected&&(!compact||!preparing))this.button('heroes',compact?1070:1069,compact?shopBottomY:756,113,compact?touch:57,'영웅 도감',true,false,16);
  const companionLabel=p?.rewardUsed?'영웅 출전 완료':s?.status==='waiting'&&p?.rewardRoster.length?'시작할 때 영웅 선택':reserve?'소환할 때까지 대기':'수집 영웅 없음';
  if(!selected&&(!compact||!preparing)){const label=this.text(this.ui,v.computer?1165:1192,compact?shopBottomY:v.computer?779:756,compact&&reserve?reserve.name:companionLabel,v.computer?13:12,p?.rewardUsed?'#a3e9dd':'#c1b7aa');if(compact)label.setWordWrapWidth(v.computer?150:125);}
  const messageY=compact?this.boardY+283:424;
  if(s?.status==='waiting')this.button('ready',485,compact?this.getPurchaseArea().y+touch/2+23:424,310,compact?touch:57,p?.ready?'상대 준비 기다리는 중':p?.rewardRoster.length?'영웅 선택 · 2분 준비 시작':'2분 준비 시작',!!s.players[1]&&!p?.ready&&!v.busy,true,19);
  else {const message=v.busy?'호스트가 조작을 확인하고 있어요':v.message||(!v.connected?'연결을 다시 확인하는 중이에요':s?.log.at(-1)||'굽이치는 길을 지켜요 · 내 영웅은 상대 불꽃으로!');const m=this.text(this.ui,493,messageY,message,compact?16:18,'#ffcf8c');m.setScale(Math.min(1,925/Math.max(1,m.width)));}
  this.syncShots();this.syncEnemies();this.syncTowerEffects();this.syncHeroSummons();this.onControls();
 }
 private drawCompactCrafting(p:DuelPlayer|null|undefined,s:DuelState|null,v:DuelView){
  const area=this.getPurchaseArea(),touch=area.minimumTouch,columns=this.compactBlockColumns,dense=columns<8,perPage=columns*2,boardWidth=dense?columns*(touch+6)+20:columns*(touch+2)+12,forgeLeft=8+boardWidth+6,forgeWidth=982-boardWidth-6;
  const rowHeight=Math.max(touch,Math.min(92,(area.height-25)/2)),firstY=area.y+21+rowHeight/2,secondY=firstY+rowHeight+4;
  this.panel(this.ui,8+boardWidth/2,area.y+area.height/2,boardWidth,area.height);this.panel(this.ui,forgeLeft+forgeWidth/2,area.y+area.height/2,forgeWidth,area.height);
  this.text(this.ui,8+boardWidth/2,area.y+12,`영웅 부화 문제 · 내 학습 Lv.${p?duelHeroLearningLevel(p):1}`,19,'#ffca7e');
  const board=p?.board??Array(16).fill(0),start=this.blockPage*perPage,cellWidth=(boardWidth-12)/columns;
  board.slice(start,start+perPage).forEach((n,index)=>{const i=start+index;this.button('block:'+i,14+cellWidth*(index%columns+.5),index<columns?firstY:secondY,cellWidth-2,rowHeight,p?numberText(n):'?',!!p&&s?.status==='preparing'&&!v.busy&&!v.slots.includes(i),v.slots.includes(i),Math.max(26,touch*.35));});
  this.text(this.ui,forgeLeft+forgeWidth/2,area.y+12,'첫째 + 둘째 = 셋째 · 영웅 알 성장',17,'#ffca7e');
  const slotWidth=Math.max(touch,Math.min(88,(forgeWidth-128)/3)),slotStart=forgeLeft+8+slotWidth/2;
  for(let i=0;i<3;i++)this.button('slot:'+i,slotStart+i*(slotWidth+3),firstY,slotWidth,rowHeight,p&&v.slots[i]!==undefined?numberText(p.board[v.slots[i]]):'?',true,false,Math.max(26,touch*.32));
  const fuseWidth=Math.max(104,touch),fuseX=forgeLeft+forgeWidth-fuseWidth/2-3;this.button('fuse',fuseX,firstY,fuseWidth,rowHeight,'합성',!!p&&v.slots.length===3&&(p.egg??0)<10&&s?.status==='preparing'&&!v.busy,true,24);
  const eggLevel=p?.egg??0,eggX=forgeLeft+45;this.ui.add(this.add.image(eggX,secondY,'duel-eggs','egg-'+Math.max(1,eggLevel)).setDisplaySize(45,Math.min(76,rowHeight)).setAlpha(eggLevel?1:.3));
  const hatchWidth=dense?Math.max(touch,forgeWidth-touch-106):forgeWidth-105,hatchX=forgeLeft+90+hatchWidth/2;
  this.button('hatch',hatchX,secondY,hatchWidth,rowHeight,eggLevel?`Lv.${eggLevel} 선택 · 비축 ▶`:'영웅 선택 · 비축 ▶',eggLevel>0&&s?.status==='preparing'&&!v.busy,true,22);
  if(dense)this.button('blocks:page',forgeLeft+forgeWidth-touch/2-5,secondY,touch,rowHeight,`${this.blockPage+1}/${this.blockPageCount} ▶`,true,false,20);
 }
 private drawPreparation(p:DuelPlayer,v:DuelView,total:number){
  const heroLevel=duelHeroLearningLevel(p);this.panel(this.ui,240,607,467,324);this.text(this.ui,240,457,'영웅 부화 문제 · 덧셈 블럭',20);
  this.text(this.ui,240,479,`내 학습 Lv.${heroLevel} · ${learningDescription(heroLevel)}`,12,'#ffca7e');
  p.board.forEach((n,i)=>this.button('block:'+i,76+i%4*110,518+Math.floor(i/4)*61,99,56,numberText(n),!v.busy&&!v.slots.includes(i),v.slots.includes(i),23));
  this.panel(this.ui,738,607,505,324);this.text(this.ui,738,468,'문제를 골라 타워와 영웅 준비',23);
  this.text(this.ui,738,508,'오른쪽 타워: 뺄셈 · 아래 영웅: 덧셈',17,'#ffca7e');
  [540,667,794].forEach((x,i)=>this.button('slot:'+i,x,574,103,58,v.slots[i]!==undefined?numberText(p.board[v.slots[i]]):'?',!v.busy,false,27));this.text(this.ui,605,574,'+',25);this.text(this.ui,733,574,'=',25);
  this.button('fuse',922,574,105,59,'합성',v.slots.length===3&&p.egg<10&&!v.busy,true,22);
  const eggLevel=p.egg;this.ui.add(this.add.image(551,674,'duel-eggs','egg-'+Math.max(1,eggLevel)).setDisplaySize(62,98).setAlpha(eggLevel?1:.3));
  this.text(this.ui,730,625,eggLevel?`영웅 알 Lv.${eggLevel} · 비축 영웅 ${total}개`:`정답마다 알 1레벨 · 비축 영웅 ${total}개`,18,'#ffca7e');
  this.text(this.ui,741,662,'부화할 영웅을 골라 비축해요',17,'#c1b7aa');this.text(this.ui,741,690,'전투 3분 동안 원하는 때 소환해요',16,'#a3e9dd');
  this.button('hatch',827,737,300,56,'영웅 선택 · 비축 ▶',eggLevel>0&&!v.busy,true,22);
 }
 private drawBattleReserve(p:DuelPlayer,v:DuelView){
  const area=this.getPurchaseArea(),compact=this.screenLayout.compact,touch=area.minimumTouch,mainWidth=670,sideLeft=690,sideWidth=300;
  const heroes=HEROES.filter(hero=>(p.heroStock?.[hero.id]??0)>0),total=heroes.reduce((sum,hero)=>sum+(p.heroStock?.[hero.id]??0),0),pageSize=compact?2:6,pages=Math.max(1,Math.ceil(heroes.length/pageSize));
  this.heroPage=Math.min(this.heroPage,pages-1);const page=this.heroPage;
  this.panel(this.ui,8+mainWidth/2,area.y+area.height/2,mainWidth,area.height);this.panel(this.ui,sideLeft+sideWidth/2,area.y+area.height/2,sideWidth,area.height);
  this.text(this.ui,8+mainWidth/2,area.y+15,`비축 영웅 ${total}개 · 원하는 때 소환`,compact?19:22,'#ffca7e');
  const columns=compact?2:3,cardWidth=(mainWidth-24)/columns,rowHeight=compact?Math.max(touch,(area.height-28)/2):122,firstY=area.y+28+rowHeight/2;
  heroes.slice(page*pageSize,page*pageSize+pageSize).forEach((hero,index)=>{
   const count=p.heroStock?.[hero.id]??0,x=20+cardWidth*(index%columns+.5),y=firstY+Math.floor(index/columns)*(rowHeight+8);
   this.ensureHero(hero.level);this.button('summon:'+hero.id,x,y,cardWidth-8,rowHeight,`${hero.name} · Lv.${hero.level}\n${HERO_EFFECT_LABELS[hero.effect]}\n비축 ${count}개 · 소환 ▶`,!v.busy,true,compact?20:17);
   this.controls.get('summon:'+hero.id)!.label=`${hero.name} 레벨 ${hero.level} 비축 ${count}개 소환 · ${hero.description}`;
  });
  if(!heroes.length){this.text(this.ui,8+mainWidth/2,firstY,'소환할 비축 영웅이 없어요',21,'#c1b7aa');this.text(this.ui,8+mainWidth/2,firstY+35,'오른쪽에서 타워를 골라 배치해요',18,'#a3e9dd');}
  const reward=p.rewardHero?heroSpec(p.rewardHero):null,readyReward=!!reward&&!p.rewardUsed;
  this.text(this.ui,sideLeft+sideWidth/2,area.y+15,'소환 대기',compact?19:22,'#ffca7e');
  const tacticHeight=compact?rowHeight:84,tacticFirstY=compact?firstY:area.y+77,tacticSecondY=compact?firstY+rowHeight+4:area.y+173;
  this.button('summon-reward',sideLeft+sideWidth/2,tacticFirstY,sideWidth-18,tacticHeight,readyReward?`${reward!.name}\n수집 영웅 소환 ▶`:p.rewardUsed?'수집 영웅 출전 완료':'수집 영웅 없음',readyReward&&!v.busy,true,compact?19:18);
  this.button('hatch',sideLeft+sideWidth/2,tacticSecondY,sideWidth-18,tacticHeight,p.egg?`남은 알 Lv.${p.egg}\n영웅 선택 · 소환 ▶`:'남은 영웅 알 없음',p.egg>0&&!v.busy,true,compact?19:18);
  const pageY=compact?firstY+rowHeight+4:area.y+280;
  const pageLeft=compact?24:sideLeft+12,pageWidth=compact?mainWidth-32:sideWidth-24,navWidth=compact?Math.max(touch,150):70;
  this.button('heroes:prev',pageLeft+navWidth/2,pageY,navWidth,compact?rowHeight:56,'◀',page>0&&!v.busy,false,21);
  this.text(this.ui,pageLeft+pageWidth/2,pageY,`${page+1}/${pages}`,20,'#ffca7e');
  this.button('heroes:next',pageLeft+pageWidth-navWidth/2,pageY,navWidth,compact?rowHeight:56,'▶',page<pages-1&&!v.busy,false,21);
 }
 private drawInstructions(compact:boolean){
  const area=this.getPurchaseArea();this.panel(this.ui,499,area.y+area.height/2,982,area.height);
  const center=compact?area.y+area.minimumTouch+74:area.y+area.height/2;this.text(this.ui,493,center-30,'전반부 2분 · 타워와 영웅 문제를 골라 비축',compact?21:25,'#ffca7e');
  this.text(this.ui,493,center+(compact?-2:16),'후반부 3분 · 타워 배치와 영웅 소환 타이밍으로 승부',compact?19:23,'#a3e9dd');
 }
 private drawCastleHealth(s:DuelState|null){
  const map=duelMap(s?.mapId),width=60,height=22;
  for(const side of [0,1] as Side[]){
   // Keep the gauge above its castle without covering adjacent build cells.
   const end=map.points[side===0?0:map.points.length-1],x=X+(end.x+.5)*T+(side===0?-18:18),y=this.boardY+(end.y+.5)*T-74;
   const player=s?.players[side],hp=Math.max(0,Math.min(FLAME_MAX,player?.flame??0)),ratio=hp/FLAME_MAX;
   const color=!player?0x77716b:ratio<=1/3?0xf06b5f:side===0?0x68cde7:0xf0b767;
   const bar=this.add.graphics().setName('castle-health-'+side);this.ui.add(bar);
   bar.fillStyle(0x090d16,.97).fillRoundedRect(x-width/2-2,y-height/2-2,width+4,height+4,5);
   bar.fillStyle(0x202733).fillRoundedRect(x-width/2,y-height/2,width,height,3);
   if(hp>0){
    const filled=(width-4)*ratio;
    bar.fillStyle(color,.9).fillRect(x-width/2+2,y-height/2+2,filled,height-4);
    bar.fillStyle(0xffffff,.2).fillRect(x-width/2+2,y-height/2+2,filled,3);
   }
   bar.lineStyle(1.5,color,.95).strokeRoundedRect(x-width/2,y-height/2,width,height,3);
   this.text(this.ui,x,y,player?`${numberText(hp)}/${numberText(FLAME_MAX)}`:'대기 중',12,'#fff6df')
    .setStroke('#080b12',3).setName('castle-health-label-'+side);
  }
 }
 private drawTerrain(){this.ambient?.prepareRedraw();for(const tower of this.towerViews.values())tower.effects.destroy();this.terrain.removeAll(true);this.units.removeAll(true);this.towerViews.clear();const s=this.view().state,map=duelMap(s?.mapId);
  const floorScale=terrainTileScale(this,.35);
  this.panel(this.terrain,493,this.boardY+134,970,299);this.terrain.add(this.add.tileSprite(X+456,this.boardY+133,912,266,'dungeon-terrain','floor').setTileScale(floorScale.x,floorScale.y));
  const grid=this.add.graphics();for(let x=0;x<24;x++)for(let y=0;y<7;y++){
   const cx=X+(x+.5)*T,cy=this.boardY+(y+.5)*T;if(duelRoadCell(s?.mapId,x,y))this.terrain.add(this.add.image(cx,cy,'dungeon-terrain','path').setDisplaySize(T,T));
   else{grid.lineStyle(1,x<12?0x55aec3:0xe2a569,.18).strokeRect(cx-T/2,cy-T/2,T,T);}
  }this.terrain.add(grid);
  // Joined stone tiles keep every turn readable and leave the surrounding
  // floor clear for towers. Outline only the exposed road edges, not its seams.
  const route=this.add.graphics();route.lineStyle(2,0xbaa17a,.48);
  for(const cell of map.roadCells){const left=X+cell.x*T,top=this.boardY+cell.y*T;
   if(!duelRoadCell(s?.mapId,cell.x-1,cell.y))route.lineBetween(left,top,left,top+T);
   if(!duelRoadCell(s?.mapId,cell.x+1,cell.y))route.lineBetween(left+T,top,left+T,top+T);
   if(!duelRoadCell(s?.mapId,cell.x,cell.y-1))route.lineBetween(left,top,left+T,top);
   if(!duelRoadCell(s?.mapId,cell.x,cell.y+1))route.lineBetween(left,top+T,left+T,top+T);
  }
  for(let i=0;i<map.points.length-1;i++){const a=map.points[i],b=map.points[i+1];route.lineStyle(1.5,(a.x+b.x)/2<11.5?0x98d6df:0xe8ba88,.28).lineBetween(X+(a.x+.5)*T,this.boardY+(a.y+.5)*T,X+(b.x+.5)*T,this.boardY+(b.y+.5)*T);}
  this.terrain.add(route);
  for(const side of [0,1] as Side[]){const end=map.points[side===0?0:map.points.length-1],x=X+(end.x+.5)*T,y=this.boardY+(end.y+.5)*T;
   this.ambient?.add(this.terrain,'guardian-'+side,'flame',x,y-10,94,92).setTint(side===0?0xa6e8ff:0xffc382);
   for(const t of s?.players[side]?.towers??[]){const x=X+(t.x+.5)*T,y=this.boardY+(t.y+.5)*T,c=this.add.container(x,y-4);this.units.add(c);c.setAlpha(t.enabled?1:.5);const head=this.towerIcon(c,0,0,t.typeId,47);this.text(c,0,30,numberText(t.unit),15,'#ffe4a6').setBackgroundColor('#11131be8');this.towerViews.set(t.id,{head,tower:t,side,effects:new DuelHeroEffectBadges(this,this.reduced)});}
  }
 }
 private syncTowerEffects(){
  const s=this.view().state;if(!s)return;
  for(const view of this.towerViews.values()){
   const tower=s.players[view.side]?.towers.find(t=>t.id===view.tower.id);if(!tower){view.effects.sync([]);continue;}
   view.tower=tower;view.effects.sync(activeDuelTowerHeroEffects(s,view.side,tower));
   const x=X+(tower.x+.5)*T,y=this.boardY+(tower.y+.5)*T-4;
   // On the top row, use the space below the attack value instead of the castle labels.
   view.effects.position(x,y-53<this.boardY+8?y+53:y-53,X+3,X+24*T-3,this.boardY);
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
 private syncEnemies(){const s=this.view().state,live=new Set(s?.enemies.map(e=>e.id));for(const [id,v]of this.enemies)if(!live.has(id)){v.sprite.destroy();v.hp.destroy();v.name.destroy();v.effects.destroy();this.enemies.delete(id);}
  for(const e of s?.enemies??[]){let v=this.enemies.get(e.id);const hero=e.hero?heroSpec(e.hero):null,kind:MonsterKind=e.level>=8?'king':e.level>=6?'crystal':e.level>=4?'golem':e.level>=2?'beetle':'slime',size=hero?44+hero.level*2.6:39+e.level*1.4;
   const point=duelEnemyPosition(s!,e),x=X+(point.x+.5)*T,y=this.boardY+(point.y+.5)*T-4;
   if(hero)this.ensureHero(hero.level);const heroReady=hero&&this.textures.exists('heroes-'+hero.level),texture=heroReady?'heroes-'+hero.level:'dungeon-'+MONSTERS[kind].atlas,frame=heroReady?hero.id+'-0':kind+'-0';
   if(!v){const sprite=this.add.sprite(x,y,texture,frame);sprite.setDisplaySize(size,size).setDepth(4).setFlipX(point.dx?point.dx<0:e.target===0);if(!this.reduced)sprite.play(heroReady?hero.id:kind+'-walk');
    const hp=this.add.text(x,y-size*.5-11,'',{fontFamily:'Malgun Gothic',fontSize:18,fontStyle:'bold',color:'#fff2d6',backgroundColor:'#11131dea',padding:{x:3,y:1}}).setOrigin(.5).setDepth(7);
    const name=this.add.text(x,y-size*.5-31,hero?`★ ${hero.name}`:'',{fontFamily:'Malgun Gothic',fontSize:11,color:e.owner===0?'#9fe8ff':'#ffcc8a',backgroundColor:'#11131dea'}).setOrigin(.5).setDepth(7);v={sprite,hp,name,effects:new DuelHeroEffectBadges(this,this.reduced),last:e.hp,size,heroId:e.hero,owner:e.owner};this.enemies.set(e.id,v);
   }else if(v.last!==e.hp){if(!this.reduced)this.tweens.add({targets:v.sprite,alpha:.4,yoyo:true,duration:90,repeat:1});v.last=e.hp;}
   const changed=v.heroId!==e.hero||v.size!==size||v.owner!==e.owner;
   if(changed){v.heroId=e.hero;v.owner=e.owner;v.size=size;v.name.setText(hero?`★ ${hero.name}`:'').setColor(e.owner===0?'#9fe8ff':'#ffcc8a');}
   if(changed||v.sprite.texture.key!==texture){v.sprite.stop().setTexture(texture,frame).setDisplaySize(size,size);}
   if(!this.reduced){const anim=heroReady?hero.id:kind+'-'+(e.slow>0||e.stun>0?'frozen':'walk');if(v.sprite.anims.currentAnim?.key!==anim)v.sprite.play(anim);}
   v.hp.setText(numberText(e.hp));
   v.effects.sync(activeDuelHeroEffects(s!,e));
  }
 }
 private syncHeroSummons(){
  const view=this.view(),identity=this.heroSummonStream.identity,events=this.heroSummonStream.take(view.room,view.state);
  if(identity!==this.heroSummonStream.identity){for(const [id,view]of this.enemies)if(this.heroSummonEffects?.pose(id))view.sprite.setDisplaySize(view.size,view.size).setAlpha(1);this.heroSummonEffects?.clear();}
  for(const event of events)this.heroSummonEffects?.play(event,X+(event.x+.5)*T,this.boardY+((event.y??DUEL_ROAD)+.5)*T-4);
 }
 private trackShotEffect<T extends Phaser.GameObjects.GameObject>(object:T):T{
  this.shotEffects.add(object);object.once('destroy',()=>this.shotEffects.delete(object));return object;
 }
 private clearShotEffects(){
  for(const timer of this.shotTimers)timer.remove(false);this.shotTimers.clear();clearTowerProjectiles(this);
  for(const object of [...this.shotEffects]){this.tweens.killTweensOf(object);object.destroy();}this.shotEffects.clear();this.hitEquations?.clear();
 }
 private syncShots(){
  const view=this.view(),s=view.state,previous=this.shotStream.identity,fresh=this.shotStream.take(view.room,s),identity=this.shotStream.identity;
  if(identity!==previous)this.clearShotEffects();if(!s)return;
  fresh.forEach((hit,i)=>{
   const timer=this.time.delayedCall(this.reduced?0:i*70,()=>{
    this.shotTimers.delete(timer);if(!this.ready||this.shotStream.identity!==identity)return;
    const t=s.players[hit.owner]?.towers.find(t=>t.id===hit.towerId),typeId=hit.typeId??t?.typeId??'basic';
    const x=X+(hit.x+.5)*T,y=this.boardY+((hit.y??DUEL_ROAD)+.5)*T-4,bodySize=this.enemies.get(hit.enemyId)?.sprite.displayHeight??53;
    this.onSound('shot',typeId);
    const impact=()=>{
     if(!this.ready||this.shotStream.identity!==identity)return;
     this.onSound(hit.shielded?'hit':hit.before===hit.after?'invalid':hit.after===0?'kill':'hit');
     const anchor=()=>{const v=this.enemies.get(hit.enemyId);return{x:v?.sprite.x??x,y:v?(v.name.text?v.name.y-40:v.hp.y-42):y-bodySize*.5-63};};
     if(hit.shielded){
      this.showShieldImpact(x,y,bodySize);
      this.hitEquations?.showMessage(hit.enemyId,'보호막 · 방어',anchor,'#b8f2ff',hit.id);
      return;
     }
     if(!this.reduced&&this.shotEffects.size<160){const fx=this.trackShotEffect(this.add.sprite(x,y,'dungeon-fx-impact-v1',hit.effect+'-0').setDisplaySize(70,70).setDepth(6));fx.play('impact-'+hit.effect).once('animationcomplete',()=>fx.destroy());if(hit.after===0){const fall=this.trackShotEffect(this.add.sprite(x,y,'dungeon-fx-utility-v1','defeat-0').setDisplaySize(76,76).setDepth(6));fall.play('fx-defeat').once('animationcomplete',()=>fall.destroy());}}
     this.hitEquations?.show(hit.enemyId,hit.before,hit.unit,hit.after,anchor,1,hit.owner===0?'#b5f4ff':'#ffe1a0',hit.id);
    };
    // The recorded launch cell survives a tower sale between host snapshots.
    // Older peers can still supply their live tower, or display the impact alone.
    const cellX=hit.fromX??t?.x,cellY=hit.fromY??t?.y;
    if(cellX===undefined||cellY===undefined){impact();return;}
    const centerX=X+(cellX+.5)*T,centerY=this.boardY+(cellY+.5)*T-8,bearing=Math.atan2(y-centerY,x-centerX);
    const from={x:centerX+Math.cos(bearing)*20,y:centerY+Math.sin(bearing)*20};
    if(!this.reduced&&this.shotEffects.size<160){const muzzle=this.trackShotEffect(this.add.sprite(from.x,from.y,'dungeon-fx-utility-v1','muzzle-0').setDisplaySize(45,45).setRotation(bearing+Math.PI/2).setDepth(6));muzzle.play('fx-muzzle').once('animationcomplete',()=>muzzle.destroy());}
    playTowerProjectile(this,{typeId,from,to:{x,y},scale:T/58,reducedMotion:this.reduced,
     track:object=>{this.trackShotEffect(object);},onImpact:impact});
   });this.shotTimers.add(timer);
  });
 }
 private showShieldImpact(x:number,y:number,size:number){
  if(this.shotEffects.size>=160)return;
  const ring=this.trackShotEffect(this.add.graphics().setPosition(x,y).setDepth(8)),radius=Math.max(22,size*.53);
  ring.fillStyle(0x80dbff,.16).fillCircle(0,0,radius).lineStyle(3,0xa5eeff,.95).strokeCircle(0,0,radius);
  ring.lineStyle(1,0xffffff,.8).strokeCircle(0,0,radius+5);
  for(let i=0;i<8;i++){const a=i*Math.PI/4;ring.lineStyle(2,0xa5eeff,.8).lineBetween(Math.cos(a)*(radius+8),Math.sin(a)*(radius+8),Math.cos(a)*(radius+15),Math.sin(a)*(radius+15));}
  this.tweens.add({targets:ring,scale:this.reduced?1:1.65,alpha:0,duration:this.reduced?450:650,ease:'Cubic.Out',onComplete:()=>ring.destroy()});
 }
 preview(x:number,y:number){this.guides.clear();const v=this.view(),s=v.state;if(!s||s.status!=='playing'||!v.selectedType||!canPurchaseDuelTower(s))return;
  const p=s.players[v.side],type=towerType(v.selectedType);if(!p||!type||v.busy||!canUseDuelTower(s,v.side,type.id)||p.money<duelBuildCost(s,v.side,type.id)||p.towers.length>=14||type.unit===10&&p.towers.filter(t=>t.unit===10).length>=3)return;
  if(x>=0&&x<24&&y>=0&&y<7)this.guides.lineStyle(3,validDuelCell(s,v.side,x,y)?0xffdf94:0xdd6c50).strokeRect(X+x*T+2,this.boardY+y*T+2,T-4,T-4);
 }
 update(_time:number,delta:number){const view=this.view(),s=view.state;this.opponentPortrait?.sync(view.computer);this.heroSummonEffects?.update();if(!s)return;const smooth=1-Math.exp(-delta/100);
  // Predict movement between host snapshots for smooth art; HP and outcomes
  // always come from the host. Prediction stops during a connection outage.
  const age=s.status==='playing'&&view.connected?Math.min(1.5,(performance.now()-this.receivedAt)/1000):0;
  for(const e of s.enemies){const v=this.enemies.get(e.id);if(!v)continue;const entrance=this.heroSummonEffects?.pose(e.id),point=duelEnemyPosition(s,e,age),targetX=X+(point.x+.5)*T,targetY=this.boardY+(point.y+.5)*T-4-(entrance?.lift??0),dx=targetX-v.sprite.x;v.sprite.x+=dx*smooth;v.sprite.y+=(targetY-v.sprite.y)*smooth;
   // Turn with the visible movement, once interpolation reaches the new segment.
   if(Math.abs(point.dx)>.01&&dx*point.dx>.01)v.sprite.setFlipX(point.dx<0);if(entrance)v.sprite.setDisplaySize(v.size*entrance.scale,v.size*entrance.scale).setAlpha(entrance.alpha);
   // On the uppermost bends, put labels below the walking sprite so the
   // guardian names and flame counters above the board stay readable.
   const below=v.sprite.y-v.size*.5-(v.name.text?31:11)<this.boardY+8,offset=(below?1:-1)*(v.size*.5+11);
   const effectsY=below?v.sprite.y+v.size*.5+15:v.sprite.y+offset-(v.name.text?20:0)-24;
   // At the top edge, use a row below the sprite so badges cannot hide its face.
   const hpY=v.sprite.y+offset+(below&&v.effects.visible?27:0);
   v.hp.setPosition(v.sprite.x,hpY);v.name.setPosition(v.sprite.x,hpY+(below?20:-20));
   v.effects.position(v.sprite.x,effectsY,X+3,X+24*T-3,this.boardY);
  }
  for(const {head,tower:t}of this.towerViews.values()){if(!t.enabled)continue;const side=s.players.findIndex(p=>p?.towers.some(o=>o.id===t.id)),radius=towerType(t.typeId)!.effect==='range'?4:3,e=s.enemies.filter(e=>{const point=duelEnemyPosition(s,e);return e.hp>0&&e.target===side&&Math.hypot(point.x-t.x,point.y-t.y)<=radius;}).sort((a,b)=>Number(b.hp>=t.unit)-Number(a.hp>=t.unit)||(side===0?duelEnemyDistance(s,a)-duelEnemyDistance(s,b):duelEnemyDistance(s,b)-duelEnemyDistance(s,a))||a.id-b.id)[0];if(e){const point=duelEnemyPosition(s,e,age),angle=Math.atan2(point.y-t.y,point.x-t.x)+Math.PI/2;head.rotation+=Phaser.Math.Angle.Wrap(angle-head.rotation)*Math.min(1,delta/90);}}
 }
}
