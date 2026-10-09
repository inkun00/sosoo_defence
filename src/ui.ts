import Phaser from 'phaser';
import {Defense,Event as BattleEvent,WALL_DURABILITY} from './model';
import {Effect,EFFECTS,LEVELS,FINAL_STAGE} from './levels';
import {decimal,numberText,FusionOperation,purchaseBalanceText} from './math';
import {Save} from './save';
import {Mode} from './scene';
import {FIELD_X,FIELD_Y,GAME_WIDTH,GAME_HEIGHT} from './layout';
import {MONSTERS,monsterKind} from './monsters';
import type {Cell} from './path';
import {DIFFICULTIES,Difficulty,balanceFor} from './difficulty';
import {TOWERS,towerType,towerPrice,GRADE_NAMES} from './towers';
import {stageMap} from './maps';
import type {GameScreenLayout} from './responsive-game';

export type Panel='forge'|'map'|'menu'|'difficulty'|'purchase'|'goals'|'result'|null;
export interface UIState{
 model:Defense;save:Save;unit:number;effect:Effect;selected:number;selectedWall:Cell|null;brickPage:number;speed:number;
 mode:Mode;panel:Panel;slots:(number|null)[];fusionOperation:FusionOperation;equation:string;hint:string;message:string;
 towerTypeId:string;shopPage:number;purchaseInput:string;purchaseMessage:string;purchaseHelp:boolean;
}
export interface Control{label:string;x:number;y:number;w:number;h:number;enabled:boolean;run:()=>void;}
const C={ink:'#f1e9dd',cream:'#fff0d6',muted:'#bbb5ae',gold:0xf5b65b,wood:0x25262a,paper:0x24252a,green:0x75be92};
export class GameUI extends Phaser.Scene{
 getState:()=>UIState;onAction:(key:string)=>void=()=>{};onControls:(controls:Map<string,Control>)=>void=()=>{};
 fieldPoint:(x:number,y:number)=>{x:number;y:number}=(x,y)=>({x:x+FIELD_X,y:y+FIELD_Y});
 controls=new Map<string,Control>();ready=false;
 private header!:Phaser.GameObjects.Container;private shop!:Phaser.GameObjects.Container;private dock!:Phaser.GameObjects.Container;private popup!:Phaser.GameObjects.Container;
 private moneyText!:Phaser.GameObjects.Text;private timerText!:Phaser.GameObjects.Text;private healthIcons:Phaser.GameObjects.Image[]=[];private waveText!:Phaser.GameObjects.Text;private pauseIcon!:Phaser.GameObjects.Image;
 private pauseText!:Phaser.GameObjects.Text;private goalsText!:Phaser.GameObjects.Text;private toastView?:Phaser.GameObjects.Container;
 private castleText?:Phaser.GameObjects.Text;
 private purchaseView?:Phaser.GameObjects.Container;private purchaseTimer?:Phaser.Time.TimerEvent;
 private signatures=['','',''];private currentStage=0;private previousPanel:Panel=null;private timer?:Phaser.Time.TimerEvent;
 private screenLayout?:GameScreenLayout;private controlViews=new Map<string,Phaser.GameObjects.Container>();
 readonly reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
 constructor(getState:()=>UIState){super('game-ui');this.getState=getState;}
 preload(){}
 create(){this.ready=true;this.header=this.add.container(0,0);this.shop=this.add.container(0,0);this.dock=this.add.container(0,0);this.popup=this.add.container(0,0).setDepth(40);this.refresh(true);}
 setScreenLayout(layout:GameScreenLayout){this.screenLayout=layout;if(this.ready){this.tweens.killTweensOf(this.popup);this.popup.setScale(1).setPosition(0,0);this.clearNotification();this.refresh(true);}}
 get shopPageSize(){return this.screenLayout?.compact?this.compactShopLayout().count:6;}
 get shopPageCount(){return Math.ceil(TOWERS.length/this.shopPageSize);}
 get cycleShopPages(){return !!this.screenLayout?.compact&&this.screenLayout.scale<=.6;}
 private get minimumTouch(){return Math.max(68,Math.ceil(44/(this.screenLayout?.scale??1)));}
 private popupFitScale(){const panel=this.getState().panel,height=this.screenLayout?.height??800;if(!this.screenLayout?.compact||!panel||['purchase','forge','menu'].includes(panel))return 1;return Math.min(1,(height-20)/(panel==='map'?640:panel==='result'?650:panel==='difficulty'?600:540));}
 private compactShopLayout(){
  const height=this.screenLayout?.height??800,rowHeight=this.minimumTouch,pitch=rowHeight+4;
  const startY=height-8-rowHeight/2,forgeY=startY-pitch,pageY=forgeY-pitch,shopTop=rowHeight+12,top=shopTop+36;
  return {rowHeight,pitch,startY,forgeY,pageY,shopTop,top,count:Math.max(1,Math.min(6,Math.floor((pageY-rowHeight/2-4-top)/pitch)))};
 }
 private text(group:Phaser.GameObjects.Container,x:number,y:number,value:string,size=20,color=C.ink,width?:number){
  const t=this.add.text(x,y,value,{fontFamily:'Malgun Gothic, Apple SD Gothic Neo, sans-serif',fontSize:size,fontStyle:'bold',color,padding:{x:2,y:2},...(width?{wordWrap:{width,useAdvancedWrap:true}}:{})});group.add(t);return t;
 }
 private frame(group:Phaser.GameObjects.Container,x:number,y:number,w:number,h:number,texture='panel_brown',tint?:number){
  const frame=this.game.renderer.type===Phaser.WEBGL?this.add.nineslice(x,y,'ui-'+texture,undefined,w,h,14,14,14,14):this.add.image(x,y,'ui-'+texture).setDisplaySize(w,h);
  if(tint)frame.setTint(tint);group.add(frame);return frame;
 }
 private fitText(text:Phaser.GameObjects.Text,width:number,height=Infinity){
  text.setScale(Math.min(1,width/Math.max(1,text.width),height/Math.max(1,text.height)));return text;
 }
 private centerLabel(text:Phaser.GameObjects.Text){
  if(!text.text)return text;
  const canvas=text.canvas,signature=`${text.text}:${canvas.width}:${canvas.height}`;
  if(text.getData('inkSignature')===signature)return text;
  const pixels=text.context.getImageData(0,0,canvas.width,canvas.height).data;let left=canvas.width,top=canvas.height,right=-1,bottom=-1;
  for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++)if(pixels[(y*canvas.width+x)*4+3]>90){left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y);}
  // Center the visible Korean/numeral glyphs, excluding font ascent padding.
  if(right>=left)text.setOrigin((left+right+1)/2/canvas.width,(top+bottom+1)/2/canvas.height);
  text.setData('inkSignature',signature);return text;
 }
 private button(group:Phaser.GameObjects.Container,key:string,x:number,y:number,w:number,h:number,label:string,enabled=true,tone='button_brown',size=22){
  if(this.screenLayout?.compact){const touch=Math.ceil(44/(this.screenLayout.scale*(group===this.popup?this.popupFitScale():1)));w=Math.max(w,touch);h=Math.max(h,touch);}
  const c=this.add.container(x,y);group.add(c);const f=this.frame(c,0,0,w,h,tone);const labelText=this.centerLabel(this.fitText(this.text(c,0,0,label,size,tone==='button_red'?'#fff4d4':C.ink).setOrigin(.5),w-24,h-20));
  const zone=this.add.zone(0,0,w,h).setInteractive({useHandCursor:true});c.add(zone);if(!enabled){c.setAlpha(.55);zone.disableInteractive();}
  const run=()=>{if(enabled)this.onAction(key);};
  zone.on('pointerover',()=>{if(enabled)f.setTint(0xffdf91);}).on('pointerout',()=>{f.clearTint();c.setScale(1);}).on('pointerdown',()=>{if(enabled)c.setScale(.96);}).on('pointerup',()=>{c.setScale(1);run();});
  this.controls.set(key,{label,x,y,w,h,enabled,run});this.controlViews.set(key,c);return {container:c,label:labelText,frame:f};
 }
 private clear(group:Phaser.GameObjects.Container){
  // A shop refresh must retain controls that still belong to the dock or popup.
  for(const [key,view]of this.controlViews)if(view.parentContainer===group){this.controls.delete(key);this.controlViews.delete(key);}
  group.removeAll(true);
 }
 refresh(force=false){
  if(!this.ready)return;const s=this.getState(),m=s.model;
  if(force||this.currentStage!==m.level.id){this.currentStage=m.level.id;this.header.removeAll(true);this.controls.clear();this.controlViews.clear();this.drawHeader();this.signatures=['','',''];}
  this.moneyText.setText(numberText(m.money,m.level.digits)).setScale(1);if(this.moneyText.width>196)this.moneyText.setScale(196/this.moneyText.width);const time=Math.max(0,Math.ceil(m.duration-m.elapsed)),timerWidth=this.screenLayout?.compact?90:103;this.timerText.setText(time===0&&['playing','paused'].includes(m.phase)?'추가 방어':`${String(Math.floor(time/60)).padStart(2,'0')}:${String(time%60).padStart(2,'0')}`).setScale(1);if(this.timerText.width>timerWidth)this.timerText.setScale(timerWidth/this.timerText.width);
  this.healthIcons.forEach((heart,i)=>heart.setAlpha(i<m.castle?1:.2));
  this.castleText?.setText(`${m.castle}/5`);
  this.waveText.setText(`방어 ${m.kills} / ${m.enemyCount} · ${DIFFICULTIES[m.difficulty].name} · ${m.phase==='ready'?'준비':m.phase==='paused'?'정지':m.phase==='won'?'성공':m.phase==='review'?'목표 연습':m.phase==='lost'?'재도전':'진행'}`);
  this.pauseIcon.setFrame(m.phase==='paused'?'play':'pause');this.centerLabel(this.fitText(this.goalsText.setText(`목표 ${m.goals.filter(g=>g.done).length}/${m.goals.length} ▸`),90,32));
  const shopSig=[s.towerTypeId,s.shopPage,s.selected,s.selectedWall?.x,s.selectedWall?.y,s.mode.kind,m.money,m.level.id,m.phase,m.difficulty,m.purchaseVariation.round,m.towers.length,m.towers.filter(t=>t.unit===10).length,m.walls.map(w=>`${w.id}:${w.durability}`)].join('|');
  if(force||shopSig!==this.signatures[0]){this.signatures[0]=shopSig;this.drawShop();}
  const dockSig=[s.selected,s.selectedWall?.x,s.selectedWall?.y,m.walls.map(w=>`${w.id}:${w.durability}`),m.towers.map(t=>`${t.id}:${t.enabled}`),s.mode.kind,JSON.stringify(m.pendingWall),s.equation,s.hint,m.wallStock,m.bricks.length,m.phase,s.speed].join('|');
  if(force||dockSig!==this.signatures[1]){this.signatures[1]=dockSig;this.drawDock();}
  const popupSig=[s.panel,s.panel==='forge'?m.bricks.map(b=>b.id)+s.slots.join(',')+s.fusionOperation+s.brickPage+m.wallStock+s.message:'',s.panel==='result'?m.phase+s.save.level:'',s.panel==='map'?s.save.level:'',s.panel==='difficulty'?m.difficulty+String(m.canChangeDifficulty):'',s.panel==='purchase'?s.purchaseInput+s.purchaseMessage+s.purchaseHelp+JSON.stringify(m.pendingPurchase):''].join('|');
  if(force||popupSig!==this.signatures[2]){this.signatures[2]=popupSig;this.drawPopup();}
  this.onControls(this.controls);
 }
 private drawHeader(){
  if(this.screenLayout?.compact){this.drawCompactHeader();return;}this.castleText=undefined;
  const s=this.getState();this.frame(this.header,640,35,1264,66,'panel_brown_dark');
  this.text(this.header,32,35,'소수의 성',29,C.cream).setOrigin(0,.5);const title=this.text(this.header,206,26,`${String(s.model.level.id).padStart(2,'0')}  ${s.model.level.name}`,21,C.cream).setOrigin(0,.5);this.fitText(title,218);
  this.waveText=this.text(this.header,207,49,'',14,C.muted).setOrigin(0,.5);
  this.goalsText=this.button(this.header,'goals',487,35,114,52,'목표',true,'button_brown',16).label;
  const coin=this.add.image(576,35,'dungeon-icons','coin').setDisplaySize(32,32);this.header.add(coin);this.moneyText=this.text(this.header,598,35,'',32,'#ffcf82').setOrigin(0,.5);
  this.text(this.header,810,24,'성 체력',12,C.muted).setOrigin(0,.5);this.healthIcons=Array.from({length:5},(_,i)=>{const heart=this.add.image(822+i*27,46,'dungeon-icons','heart').setDisplaySize(31,31);this.header.add(heart);return heart;});
  this.timerText=this.text(this.header,978,35,'02:00',27,C.cream).setOrigin(0,.5);
  this.pauseText=this.button(this.header,'pause',1107,34,58,54,'Ⅱ',true,'button_brown',24).label;
  this.pauseText.setVisible(false);this.pauseIcon=this.add.image(1107,34,'dungeon-icons','pause').setDisplaySize(30,30);this.header.add(this.pauseIcon);
  this.button(this.header,'menu',1200,34,104,54,'메뉴',true,'button_brown',21);
 }
 private drawCompactHeader(){
  const s=this.getState(),touch=this.minimumTouch,y=4+touch/2,scale=this.screenLayout!.scale;
  this.frame(this.header,640,(touch+8)/2,1264,touch+8,'panel_brown_dark');
  this.text(this.header,32,y,'소수의 성',29,C.cream).setOrigin(0,.5);
  this.fitText(this.text(this.header,206,y-10,`${String(s.model.level.id).padStart(2,'0')}  ${s.model.level.name}`,21,C.cream).setOrigin(0,.5),218);
  this.waveText=this.text(this.header,207,y+14,'',14,C.muted).setOrigin(0,.5);
  this.goalsText=this.button(this.header,'goals',487,y,Math.max(114,touch),touch,'목표',true,'button_brown',Math.max(20,Math.ceil(14/scale))).label;
  this.header.add(this.add.image(576,y,'dungeon-icons','coin').setDisplaySize(38,38));this.moneyText=this.text(this.header,598,y,'',32,'#ffcf82').setOrigin(0,.5);
  this.text(this.header,810,y-22,'성 체력',14,C.muted).setOrigin(0,.5);this.header.add(this.add.image(825,y+9,'dungeon-icons','heart').setDisplaySize(36,36));this.healthIcons=[];
  this.castleText=this.text(this.header,850,y+9,`${s.model.castle}/5`,Math.max(24,Math.ceil(14/scale))).setOrigin(0,.5);
  this.timerText=this.text(this.header,945,y,'02:00',27,C.cream).setOrigin(0,.5);
  this.pauseText=this.button(this.header,'pause',1090,y,touch,touch,'Ⅱ',true,'button_brown',24).label;this.pauseText.setVisible(false);
  this.pauseIcon=this.add.image(1090,y,'dungeon-icons','pause').setDisplaySize(Math.min(50,touch*.48),Math.min(50,touch*.48));this.header.add(this.pauseIcon);
  this.button(this.header,'menu',1200,y,Math.max(104,touch),touch,'메뉴',true,'button_brown',Math.max(23,Math.ceil(14/scale)));
 }
 private drawShop(){
  this.clear(this.shop);const s=this.getState(),m=s.model;
  if(this.screenLayout?.compact){this.drawCompactShop();return;}
  this.frame(this.shop,1135,371,248,592,'panel_brown');
  this.text(this.shop,1135,109,'타워 제작소',24).setOrigin(.5);
  this.text(this.shop,1135,139,`타워 ${m.towers.length}/${m.balance.towerLimit} · 바늘 ${m.towers.filter(t=>t.unit===10).length}/${m.balance.precisionLimit}`,15,'#b8b0a4').setOrigin(.5);
  TOWERS.slice(s.shopPage*6,s.shopPage*6+6).forEach((t,i)=>{
   const unlocked=t.unlock<=m.level.id,cost=towerPrice(t,m.money,m.level.id,m.purchaseVariation),active=s.mode.kind==='tower'&&s.towerTypeId===t.id;
   const b=this.button(this.shop,'type:'+t.id,1135,196+i*72,218,68,'',unlocked&&m.money>=cost&&m.towerAvailable(t.unit)&&m.canBuild,active?'button_red':'button_brown');
   this.towerIcon(b.container,-76,0,t.id,54);
   this.fitText(this.text(b.container,-43,-20,t.name+' · '+GRADE_NAMES[t.grade],16,C.cream).setOrigin(0,.5),142);
   this.text(b.container,-43,0,`공격 ${numberText(t.unit)} · ${t.effect==='slow'?'감속':t.effect==='stun'?'기절':t.effect==='range'?'장거리':'기본'}`,13,'#b8b0a4').setOrigin(0,.5);
   this.text(b.container,-43,20,unlocked?numberText(cost)+' 코인':`${t.unlock}단계 해금`,17,'#f0c583').setOrigin(0,.5);
   this.controls.get('type:'+t.id)!.label=`${t.name}, ${GRADE_NAMES[t.grade]}, 공격력 ${numberText(t.unit)}, ${numberText(cost)} 코인`;
  });
  this.text(this.shop,1135,600,m.canBuild?'준비 중에만 설치 · 인접하면 열 간섭':'전투 중 설치 불가 · 발사 조절 가능',12,'#b8b0a4').setOrigin(.5);
  this.button(this.shop,'shop-page:prev',1055,633,64,56,'◀',s.shopPage>0,'button_brown',22);
  this.button(this.shop,'cancel',1135,633,80,56,s.mode.kind==='tower'?'취소':`${s.shopPage+1} / 2`,s.mode.kind==='tower','button_brown',16);
  this.button(this.shop,'shop-page:next',1215,633,64,56,'▶',s.shopPage<1,'button_brown',22);
 }
 private drawCompactShop(){
  const s=this.getState(),m=s.model,{rowHeight,pitch,pageY,shopTop,top,count}=this.compactShopLayout(),height=this.screenLayout!.height,t=m.towers.find(t=>t.id===s.selected);
  this.frame(this.shop,1135,(shopTop+height-8)/2,248,height-8-shopTop,'panel_brown');
  this.text(this.shop,1135,shopTop+20,'타워 제작소',23).setOrigin(.5);
  if(s.mode.kind==='wall'){
   this.text(this.shop,1135,162,'초록색 길을 누르면\n성벽을 바로 놓아요.',22,C.cream,210).setOrigin(.5,0);
   this.text(this.shop,1135,247,`남은 성벽 ${m.wallStock}개\n새 성벽 내구도 3`,20,'#ffda92',210).setOrigin(.5,0);
   this.button(this.shop,'wall-cancel',1135,pageY,218,rowHeight,'배치 완료',true,'button_red',23);return;
  }
  if(t||s.selectedWall){
   if(t){
    const bottom=pageY-rowHeight/2-8,iconSize=Math.min(84,(bottom-top)*.3),nameY=top+iconSize+24;
    this.towerIcon(this.shop,1135,top+iconSize/2+2,t.typeId,iconSize);
    this.fitText(this.text(this.shop,1135,nameY,towerType(t.typeId)!.name,25,C.cream).setOrigin(.5),214);
    this.text(this.shop,1135,nameY+28,'공격 '+numberText(t.unit),20,C.ink).setOrigin(.5);
    this.text(this.shop,1135,nameY+56,`재장전 ${m.reloadTime(t).toFixed(1)}초`,20,C.ink).setOrigin(.5);
    this.fitText(this.text(this.shop,1135,bottom-12,'회수 '+numberText(t.cost)+' 코인',19,'#f0c583').setOrigin(.5),214);
    this.button(this.shop,'sell',1080,pageY,108,rowHeight,'회수',!['won','review','lost'].includes(m.phase),'button_brown',22);
    this.button(this.shop,'inspect-back',1192,pageY,108,rowHeight,'목록',true,'button_brown',22);
   }else{
    const wall=m.walls.find(w=>w.x===s.selectedWall!.x&&w.y===s.selectedWall!.y);
    this.text(this.shop,1135,158,'성벽',26,C.cream).setOrigin(.5);this.text(this.shop,1135,195,`내구도 ${wall?.durability??0}/${WALL_DURABILITY}`,24,C.cream).setOrigin(.5);
    this.button(this.shop,'wall-recover',1135,pageY-pitch,218,rowHeight,'회수 · 재배치',!['won','review','lost'].includes(m.phase),'button_brown',22);
    this.button(this.shop,'inspect-back',1135,pageY,218,rowHeight,'타워 목록',true,'button_brown',22);
   }
   return;
  }
  const page=Math.min(s.shopPage,this.shopPageCount-1);
  TOWERS.slice(page*count,page*count+count).forEach((tower,i)=>{
   const unlocked=tower.unlock<=m.level.id,cost=towerPrice(tower,m.money,m.level.id,m.purchaseVariation),active=s.mode.kind==='tower'&&s.towerTypeId===tower.id;
   const b=this.button(this.shop,'type:'+tower.id,1135,top+rowHeight/2+i*pitch,218,rowHeight,'',unlocked&&m.money>=cost&&m.towerAvailable(tower.unit)&&m.canBuild,active?'button_red':'button_brown');
   this.towerIcon(b.container,-76,0,tower.id,54);
   this.fitText(this.text(b.container,-43,-20,tower.name+' · '+GRADE_NAMES[tower.grade],17,C.cream).setOrigin(0,.5),142);
   this.text(b.container,-43,0,'공격 '+numberText(tower.unit),15,C.muted).setOrigin(0,.5);
   this.text(b.container,-43,20,unlocked?numberText(cost)+' 코인':`${tower.unlock}단계 해금`,18,'#f0c583').setOrigin(0,.5);
   this.controls.get('type:'+tower.id)!.label=`${tower.name}, ${GRADE_NAMES[tower.grade]}, 공격력 ${numberText(tower.unit)}, ${numberText(cost)} 코인`;
  });
  if(this.cycleShopPages){
   const placing=s.mode.kind==='tower';this.text(this.shop,1135,pageY-rowHeight/2-26,`${page+1} / ${this.shopPageCount}`,22,C.muted).setOrigin(.5);
   this.button(this.shop,placing?'cancel':'shop-page:prev',1076,pageY,112,rowHeight,placing?'취소':'◀ 이전',placing||page>0,'button_brown',26);
   this.button(this.shop,'shop-page:next',1194,pageY,112,rowHeight,'다음 ▶',this.shopPageCount>1,'button_brown',26);
  }else{
   this.button(this.shop,'shop-page:prev',1055,pageY,Math.max(68,rowHeight),rowHeight,'◀',page>0,'button_brown',22);
   this.button(this.shop,'cancel',1135,pageY,80,rowHeight,s.mode.kind==='tower'?'취소':`${page+1}/${this.shopPageCount}`,s.mode.kind==='tower','button_brown',19);
   this.button(this.shop,'shop-page:next',1215,pageY,Math.max(68,rowHeight),rowHeight,'▶',page<this.shopPageCount-1,'button_brown',22);
  }
 }
 private towerIcon(group:Phaser.GameObjects.Container,x:number,y:number,id:string,size:number){
  const t=towerType(id)!;group.add(this.add.image(x,y+size*.07,'dungeon-turret-parts-v1','base').setDisplaySize(size,size));
  group.add(this.add.image(x,y-size*.08,'dungeon-tower-heads-'+t.sheet+'-v1',id).setDisplaySize(size,size));
 }
 private drawDock(){
  this.clear(this.dock);const s=this.getState(),m=s.model,t=m.towers.find(t=>t.id===s.selected);
  if(this.screenLayout?.compact){
   const {rowHeight,forgeY,startY}=this.compactShopLayout();
   this.button(this.dock,'forge',1135,forgeY,244,rowHeight,`성벽 제작 ${m.wallStock}`,!['won','review','lost'].includes(m.phase),'button_brown',22);
   if(m.phase==='ready')this.button(this.dock,'start',1135,startY,244,rowHeight,'방어 시작 ▶',s.mode.kind!=='wall','button_red',26);
   else this.button(this.dock,'speed',1135,startY,244,rowHeight,`진행 속도 ×${s.speed}`,s.mode.kind!=='wall'&&!['won','review','lost'].includes(m.phase),'button_brown',22);
   return;
  }
  this.frame(this.dock,509,736,988,112,'panel_brown_dark');
  const board=this.button(this.dock,'calculation',221,736,392,104,'',s.mode.kind!=='wall','button_brown');
  if(s.mode.kind==='wall'){
   board.container.setAlpha(1);
   this.text(board.container,-171,-31,'길 위의 성벽',18,C.cream).setOrigin(0,.5);
   this.text(board.container,-171,-5,'충돌 1번마다 내구도 1 감소',16,'#ffda92').setOrigin(0,.5);
   this.fitText(this.text(board.container,-171,23,'새 성벽은 세 번째 충돌에 부서져요.',16,C.ink).setOrigin(0,.5),344);
  }else{
  this.text(board.container,-171,-30,m.level.id<=4?'전투 속 소수  ·  계산 도움말 ▸':'이번 단계의 전략  ·  도움말 ▸',14,'#c0b9aa').setOrigin(0,.5);
  const value=s.equation||m.level.hint;this.fitText(this.text(board.container,-171,11,value,s.equation?24:16,C.ink,344).setOrigin(0,.5),344,54);
  }
  if(s.mode.kind==='wall'){
   this.fitText(this.text(this.dock,450,707,`초록 길을 누르면 바로 설치 · 남은 성벽 ${m.wallStock}개`,20,C.cream,524).setOrigin(0,.5),524,38);
   this.button(this.dock,'wall-cancel',710,760,468,56,'완료 · 남은 성벽 보관',true,'button_brown',23);
  }else if(t){
   this.towerIcon(this.dock,472,729,t.typeId,68);
   this.fitText(this.text(this.dock,520,710,`${towerType(t.typeId)!.name} · ${numberText(t.unit)} · 재장전 ${m.reloadTime(t).toFixed(1)}초${m.reloadFactor(t)>1?' (열 간섭)':''}`,21,C.cream).setOrigin(0,.5),446);
   this.text(this.dock,520,750,'전투 중 자동 공격',19,C.muted).setOrigin(0,.5);
   this.button(this.dock,'sell',870,750,184,58,'회수 '+numberText(t.cost),!['won','review','lost'].includes(m.phase),'button_brown',18);
  }else if(s.selectedWall){
   const w=m.walls.find(w=>w.x===s.selectedWall!.x&&w.y===s.selectedWall!.y);
   this.text(this.dock,450,710,`성벽 · 내구도 ${w?.durability??0}/${WALL_DURABILITY} · 충돌하면 반동`,21,C.cream).setOrigin(0,.5);
   this.button(this.dock,'wall-recover',640,750,310,58,'성벽 회수 · 다시 배치',!['won','review','lost'].includes(m.phase),'button_brown',23);
  }else{
   const placing=s.mode.kind==='tower';this.text(this.dock,450,713,placing?'설치할 칸을 골라 주세요':'타워를 누르면 정보와 회수를 확인해요',21,C.cream,520).setOrigin(0,.5);
   const max=m.level.boss?.hp??Math.max(...m.level.hp),i=m.level.hp.indexOf(max),strongest=MONSTERS[m.level.boss?.kind??monsterKind(m.level.id,i,max)];
   this.text(this.dock,450,750,s.mode.kind==='tower'?`공격 ${numberText(s.unit)} · 붙이면 재장전이 느려져요.`:m.phase==='ready'?`최강 ${strongest.name} · 체력 ${numberText(max,m.level.boss?1:m.level.digits)}`:'타워가 자동으로 공격해요 · 작은 포탄으로 마무리!',18,C.muted,520).setOrigin(0,.5);
  }
  this.button(this.dock,'forge',1135,705,244,58,s.mode.kind==='wall'?'성벽 더 합성하기':`성벽 제작  ${m.bricks.length} / 성벽 ${m.wallStock}`,!['won','review','lost'].includes(m.phase),'button_brown',20);
  if(m.phase==='ready')this.button(this.dock,'start',1135,770,244,58,'방어 시작 ▶',s.mode.kind!=='wall','button_red',26);
  else this.button(this.dock,'speed',1135,770,244,58,`진행 속도 ×${s.speed}`,s.mode.kind!=='wall'&&!['won','review','lost'].includes(m.phase),'button_brown',22);
 }
 private drawPopup(){
  if(this.getState().panel!==this.previousPanel||this.screenLayout?.compact){this.tweens.killTweensOf(this.popup);this.popup.setScale(1).setPosition(0,0);}
  this.clear(this.popup);
  const s=this.getState();if(!s.panel){this.previousPanel=null;return;}
  const veil=this.add.rectangle(640,400,1280,800,0x050609,.85).setInteractive();this.popup.add(veil);
  if(s.panel==='map')this.drawMap();else if(s.panel==='forge')this.drawForge();else if(s.panel==='result')this.drawResult();else if(s.panel==='menu')this.drawMenu();else if(s.panel==='difficulty')this.drawDifficulty();else if(s.panel==='purchase')this.drawPurchase();else this.drawGoals();
  if(this.screenLayout?.compact){
   const height=this.screenLayout.height,reflowed=['purchase','forge','menu'].includes(s.panel),panelHeight=s.panel==='map'?640:s.panel==='result'?650:s.panel==='difficulty'?600:540;
   const scale=reflowed?1:Math.min(1,(height-20)/panelHeight);this.popup.setScale(scale).setPosition(640*(1-scale),reflowed?0:height/2-410*scale);
   veil.setPosition((640-this.popup.x)/scale,(height/2-this.popup.y)/scale).setSize(1280/scale,height/scale);
  }
  if(s.panel==='result'&&this.previousPanel!=='result'&&!this.reducedMotion&&!this.screenLayout?.compact){this.popup.setScale(.93).setPosition(45,28);this.tweens.add({targets:this.popup,scale:1,x:0,y:0,duration:350,ease:'Back.easeOut'});}
  this.previousPanel=s.panel;
 }
 private modalFrame(title:string,w=900,h=540){
  this.frame(this.popup,640,410,w,h,'panel_brown');this.text(this.popup,640,410-h/2+35,title,32).setOrigin(.5);
  this.button(this.popup,'close',640+w/2-42,410-h/2+39,58,58,'×',true,'button_red',30);
 }
 private compactModalFrame(title:string){
  const height=this.screenLayout!.height,touch=this.minimumTouch;this.frame(this.popup,640,height/2,1252,height-16,'panel_brown');
  this.text(this.popup,640,42,title,32,C.cream).setOrigin(.5);this.button(this.popup,'close',1210,8+touch/2,touch,touch,'×',true,'button_red',Math.max(30,Math.ceil(18/this.screenLayout!.scale)));
 }
 private drawCompactForge(){
  const s=this.getState(),m=s.model,height=this.screenLayout!.height,touch=this.minimumTouch,slotHeight=Math.max(84,touch),brickHeight=Math.max(80,touch),pagerHeight=Math.max(70,touch),pagerY=303+brickHeight/2+8+pagerHeight/2;this.compactModalFrame('벽돌을 합쳐 성벽으로');
  this.text(this.popup,640,91,m.level.id<=3?'두 벽돌의 합을 찾아요 · 한 자리 소수':'소수점을 맞추어 더해요 · 받아올림을 확인해요',22,'#f1ce94').setOrigin(.5);
  [330,520,710].forEach((x,i)=>{const brick=m.bricks.find(b=>b.id===s.slots[i]);const slot=this.button(this.popup,`slot:${i}`,x,174,158,slotHeight,brick?numberText(brick.value):'?',true,'button_brown',34);if(brick){slot.container.addAt(this.add.image(0,2,'dungeon-props','brick').setDisplaySize(164,92),1);slot.label.setStroke('#14151d',4);}});
  this.text(this.popup,425,174,'+',34).setOrigin(.5);this.text(this.popup,615,174,'=',34).setOrigin(.5);
  this.button(this.popup,'fuse',938,174,200,slotHeight,'합성 · 설치',s.slots.every(v=>v!==null),'button_red',25);
  this.text(this.popup,640,236,`벽돌 ${m.bricks.length}개 · 아래 숫자를 골라요`,21,C.muted).setOrigin(.5);
  m.bricks.slice(s.brickPage*6,s.brickPage*6+6).forEach((brick,i)=>{const tile=this.button(this.popup,`brick:${brick.id}`,190+i*180,303,162,brickHeight,numberText(brick.value),!s.slots.includes(brick.id),'button_brown',29);tile.container.addAt(this.add.image(0,3,'dungeon-props','brick').setDisplaySize(170,87),1);tile.label.setStroke('#14151d',4);});
  const pages=Math.ceil(m.bricks.length/6);if(pages>1){this.button(this.popup,'brick-page:prev',400,pagerY,180,pagerHeight,'◀ 이전',s.brickPage>0,'button_brown',23);this.text(this.popup,640,pagerY,`${s.brickPage+1} / ${pages}`,22,C.muted).setOrigin(.5);this.button(this.popup,'brick-page:next',880,pagerY,180,pagerHeight,'다음 ▶',s.brickPage<pages-1,'button_brown',23);}
  if(!m.bricks.length)this.text(this.popup,640,303,'돌 몬스터를 처치하면 숫자 벽돌을 얻어요.',23,C.muted).setOrigin(.5);
  this.fitText(this.text(this.popup,640,pages>1?Math.max(456,pagerY+pagerHeight/2+28):456,s.message||'□ + □ = □가 맞으면 바로 길에 놓을 수 있어요.',23,'#dfb987').setOrigin(.5),1080,50);
  const wallHeight=Math.max(80,touch);this.button(this.popup,'wall',940,height-8-wallHeight/2,370,wallHeight,`성벽 설치 (${m.wallStock})`,m.wallStock>0,'button_red',27);
 }
 private drawCompactPurchase(){
  const s=this.getState(),q=s.model.pendingPurchase;if(!q)return;const type=towerType(q.typeId)!,height=this.screenLayout!.height,touch=this.minimumTouch,wide=this.screenLayout!.scale<=.6,before=numberText(q.before,q.digits),cost=numberText(q.cost,q.digits);
  this.compactModalFrame('소수 뺄셈으로 타워 설치');
  this.text(this.popup,640,80,`${GRADE_NAMES[type.grade]} · ${type.name} · 공격력 ${numberText(type.unit)}`,23,C.cream).setOrigin(.5);
  this.fitText(this.text(this.popup,640,109,purchaseBalanceText(q.wallet,q.before,q.digits),19,C.ink).setName('purchase-wallet').setOrigin(.5),1000,26);
  this.text(this.popup,640,145,`${before} − ${cost} = ?`,34,'#ffe1a0').setOrigin(.5);
  this.frame(this.popup,640,184,1030,56,'button_brown');this.centerLabel(this.fitText(this.text(this.popup,640,184,s.purchaseInput||'남는 코인을 입력해요',s.purchaseInput?32:23,C.cream).setOrigin(.5),980,43));
  const footerY=height-8-touch/2,keyHeight=Math.max(70,touch),lastBottom=height-8-touch-34,firstY=wide?lastBottom-keyHeight/2-keyHeight-8:213+keyHeight/2,mathHeight=wide?Math.min(150,firstY-keyHeight/2-228):150,mathY=wide?220+mathHeight/2:325;
  this.frame(this.popup,330,mathY,386,mathHeight,'panel_brown_dark');
  if(s.purchaseHelp){const needed=q.borrowing.filter(p=>p<1000);this.fitText(this.text(this.popup,330,mathY,needed.length?'작은 자리가 모자라면 왼쪽 자리에서 1을 가져와 작은 단위 10개로 바꿔요.':'소수점을 맞추어 같은 자리끼리 계산해요.',22,'#edc88d',330).setOrigin(.5),334,mathHeight-16);}
  else this.fitText(this.text(this.popup,330,mathY,`  ${before.padStart(8)}\n− ${cost.padStart(8)}\n──────────`,29,'#ffe1a0').setFontFamily('Consolas, monospace').setOrigin(.5),350,mathHeight-12);
  ['7','8','9','4','5','6','1','2','3','0','.','⌫'].forEach((key,i)=>this.button(this.popup,'purchase-key:'+(key==='⌫'?'backspace':key==='.'?'dot':key),wide?174+i%6*186:730+i%3*170,firstY+Math.floor(i/(wide?6:3))*(keyHeight+(wide?8:3)),wide?164:152,keyHeight,key,true,'button_brown',31));
  this.button(this.popup,'purchase-help',wide?940:330,wide?mathY:440,330,touch,s.purchaseHelp?'도움말 닫기':'계산 도움말',true,'button_brown',24);
  this.fitText(this.text(this.popup,wide?640:330,wide?height-8-touch-17:505,s.purchaseMessage||'정답일 때만 코인을 내요.',18,s.purchaseMessage?'#ffc296':C.muted).setOrigin(.5),wide?1040:510,30);
  this.button(this.popup,'purchase-cancel',430,footerY,330,touch,'취소 · 돈 유지',true,'button_brown',25);
  this.button(this.popup,'purchase-confirm',880,footerY,490,touch,'정답 확인 · 설치 ▶',!!s.purchaseInput,'button_red',26);
 }
 private drawForge(){
  if(this.screenLayout?.compact){this.drawCompactForge();return;}
  const s=this.getState(),m=s.model;this.modalFrame('벽돌을 합쳐 성벽으로',920,530);
  this.text(this.popup,640,208,'식이 맞으면 바로 길에 성벽을 놓을 수 있어요.',18,'#c2b7a4').setOrigin(.5);
  this.text(this.popup,640,252,m.level.id<=3?'두 벽돌의 합을 찾아요 · 한 자리 소수':m.level.id<=4?'소수점을 맞추어 더해요 · 두 자리 소수':'단계가 높아질수록 받아올림과 큰 수를 더해요',20,'#f1ce94').setOrigin(.5);
  [350,540,730].forEach((x,i)=>{const brick=m.bricks.find(b=>b.id===s.slots[i]);const slot=this.button(this.popup,`slot:${i}`,x,330,140,86,brick?numberText(brick.value):'?',true,'button_brown',32);if(brick){const stone=this.add.image(0,2,'dungeon-props','brick').setDisplaySize(156,92);slot.container.addAt(stone,1);slot.label.setStroke('#14151d',4);}});
  this.text(this.popup,445,328,'+',34).setOrigin(.5);this.text(this.popup,635,328,'=',34).setOrigin(.5);
  this.button(this.popup,'fuse',917,330,158,84,'합성·설치',s.slots.every(v=>v!==null),'button_red',23);
  this.text(this.popup,243,378,`보관 중인 벽돌 ${m.bricks.length}개  ·  누르면 빈 슬롯에 들어가요`,19);
  m.bricks.slice(s.brickPage*6,s.brickPage*6+6).forEach((b,i)=>{const tile=this.button(this.popup,`brick:${b.id}`,295+i*137,442,118,64,numberText(b.value),!s.slots.includes(b.id),'button_brown',26);const stone=this.add.image(0,3,'dungeon-props','brick').setDisplaySize(126,77);tile.container.addAt(stone,1);tile.label.setStroke('#14151d',4);});
  const pages=Math.ceil(m.bricks.length/6);if(pages>1){this.button(this.popup,'brick-page:prev',403,508,134,56,'◀ 이전',s.brickPage>0,'button_brown',18);this.text(this.popup,640,508,`${s.brickPage+1} / ${pages}`,18,C.muted).setOrigin(.5);this.button(this.popup,'brick-page:next',877,508,134,56,'다음 ▶',s.brickPage<pages-1,'button_brown',18);}
  if(!m.bricks.length)this.text(this.popup,640,453,'돌 몬스터를 처치하면 숫자 벽돌을 얻어요.',21,'#bdb7ae').setOrigin(.5);
  this.text(this.popup,247,540,s.message||'□ + □ = □가 맞으면 벽돌 세 개를 소비해요.',19,'#dfb987',500);
  this.button(this.popup,'wall',914,602,220,64,`성벽 설치 (${m.wallStock})`,m.wallStock>0,'button_red',24);
 }
 private drawMap(){
  const s=this.getState();this.modalFrame(`소수의 성으로 가는 ${FINAL_STAGE}개의 모험`,1120,640);
  this.text(this.popup,640,164,`나의 레벨 ${s.save.level}  ·  배치와 돈은 단계마다 새로 시작해요`,19,'#bdb7ae').setOrigin(.5);
  const positions=LEVELS.map((_,i)=>({x:i<6?190+i*180:1000-(i-6)*180,y:i<6?280+(i%2)*24:500-((i-6)%2)*24}));
  const road=this.add.graphics().lineStyle(20,0x302a23).beginPath();positions.forEach((p,i)=>i?road.lineTo(p.x,p.y):road.moveTo(p.x,p.y));road.strokePath();road.lineStyle(10,0xb28752).beginPath();positions.forEach((p,i)=>i?road.lineTo(p.x,p.y):road.moveTo(p.x,p.y));road.strokePath();this.popup.add(road);
  LEVELS.forEach((l,i)=>{const p=positions[i],open=l.id<=s.save.level;const b=this.button(this.popup,`stage:${l.id}`,p.x,p.y,86,82,open?String(l.id):'잠김',open,l.id===s.model.level.id?'button_red':'button_brown',open?34:22);
   this.text(this.popup,p.x,p.y+52,l.name,17,open?C.ink:'#99959a',180).setOrigin(.5,0);
   this.text(this.popup,p.x,p.y+78,stageMap(l.id).name,13,open?'#dbc29e':'#99959a',180).setOrigin(.5,0);
   [0,1,2].forEach(j=>{const star=this.add.image(p.x+(j-1)*25,p.y+114,'dungeon-icons','star').setDisplaySize(26,26).setAlpha(j<s.save.stars[i]?1:.17);this.popup.add(star);});
   if(!open)b.container.setAlpha(.7);
  });
 }
 private drawResult(){
  const s=this.getState(),m=s.model,won=m.phase==='won',review=m.phase==='review';this.modalFrame(won?'소수의 성을 지켰어요!':review?'성은 지켰어요! 학습 목표를 연습해요':'성 체력 5개가 모두 소진됐어요',940,650);
  [0,1,2].forEach(i=>{const star=this.add.image(562+i*78,214,'dungeon-icons','star').setDisplaySize(64,64).setAlpha(won&&i<m.stars?1:.24);this.popup.add(star);if(won&&i<m.stars&&!this.reducedMotion)this.tweens.add({targets:star,angle:{from:-20,to:0},scaleX:{from:star.scaleX*.2,to:star.scaleX},scaleY:{from:star.scaleY*.2,to:star.scaleY},delay:200+i*130,duration:450,ease:'Back.easeOut'});});
  this.text(this.popup,640,275,`성 체력 ${m.castle}/5   ·   ${m.kills}마리 방어   ·   유효 타격 ${m.successfulHits}회`,24).setOrigin(.5);
  m.goals.forEach((g,i)=>this.text(this.popup,265,333+i*42,`${g.done?'✓':'○'}  ${g.label}`,22,g.done?'#8bd3a0':'#dfb28e',740));
  this.text(this.popup,640,523,`벽돌 ${m.bricks.length}개 · 남은 성벽 ${m.inventory.walls}개 보관! 내구도도 유지돼요.`,20,'#f0c583').setOrigin(.5);
  this.text(this.popup,640,568,won?'방어와 학습 목표를 모두 달성했어요.':review?'패배가 아니에요. ○ 표시된 목표를 연습하면 다음 단계가 열려요.':'타워의 위치와 발사 순서를 바꾸어 같은 웨이브에 다시 도전해요.',21,'#bdb5a9').setOrigin(.5);
  this.button(this.popup,'retry',450,641,284,68,'같은 단계 다시',true,'button_brown',25);
  const final=won&&m.level.id===FINAL_STAGE;
  this.button(this.popup,final?'home':won?'next':'levels',815,641,284,68,final?'시작 화면':won?'다음 단계 ▶':'단계 지도',true,'button_red',25);
 }
 private drawMenu(){
  if(this.screenLayout?.compact){
   this.compactModalFrame('소수의 성 메뉴');
   [['home','시작 화면'],['levels','모험 지도'],['help','게임 방법'],['popup-calculation','계산 도움말'],['settings','게임 설정'],['difficulty','난이도 선택'],['online','회원가입 · 1:1 대전'],['credits','게임 정보 · 출처']].forEach(([id,label],i)=>this.button(this.popup,id,i%2?920:360,145+Math.floor(i/2)*108,460,84,label,true,id==='online'?'button_red':'button_brown',25));return;
  }
  this.modalFrame('소수의 성 메뉴',540,660);
  [['home','시작 화면'],['levels','모험 지도'],['help','게임 방법'],['settings','게임 설정'],['difficulty','난이도 선택'],['online','회원가입 · 1:1 대전'],['credits','게임 정보 · 출처']].forEach(([id,label],i)=>this.button(this.popup,id,640,218+i*68,390,62,label,true,id==='online'?'button_red':'button_brown',23));
 }
 private drawPurchase(){
  if(this.screenLayout?.compact){this.drawCompactPurchase();return;}
  const s=this.getState(),q=s.model.pendingPurchase;if(!q)return;const t=towerType(q.typeId)!;
  this.modalFrame('소수 뺄셈으로 타워 설치',960,650);
  this.text(this.popup,640,170,`${GRADE_NAMES[t.grade]} · ${t.name} · 공격력 ${numberText(t.unit)}`,23,C.cream).setOrigin(.5);
  this.centerLabel(this.fitText(this.text(this.popup,640,202,purchaseBalanceText(q.wallet,q.before,q.digits),20,C.ink).setName('purchase-wallet').setOrigin(.5),850,27));
  const before=numberText(q.before,q.digits),cost=numberText(q.cost,q.digits);
  this.centerLabel(this.fitText(this.text(this.popup,640,242,`${before} − ${cost} = ?`,39,'#ffe1a0').setOrigin(.5),850,50));
  this.frame(this.popup,640,306,500,64,'button_brown');
  this.centerLabel(this.fitText(this.text(this.popup,640,306,s.purchaseInput||(q.wallet!==q.before?'계산용 코인의 잔액을 입력해요':'남는 코인을 입력해요'),s.purchaseInput?34:22,C.cream).setOrigin(.5),458,44));
  this.text(this.popup,348,372,'소수점 위치를 맞춰요',20,C.ink).setOrigin(.5);
  this.frame(this.popup,348,452,286,130,'panel_brown_dark');
  this.text(this.popup,348,444,`  ${before.padStart(8)}\n− ${cost.padStart(8)}\n──────────`,25,'#ffe1a0').setFontFamily('Consolas, monospace').setOrigin(.5);
  const keys=['7','8','9','4','5','6','1','2','3','0','.','⌫'];
  keys.forEach((key,i)=>{const id=key==='⌫'?'backspace':key==='.'?'dot':key;this.button(this.popup,'purchase-key:'+id,650+i%3*110,382+Math.floor(i/3)*60,100,56,key,true,'button_brown',27);});
  this.button(this.popup,'purchase-help',348,550,240,56,s.purchaseHelp?'도움말 닫기':'계산 도움말',true,'button_brown',20);
  if(s.purchaseHelp){const needed=q.borrowing.filter(p=>p<1000);this.text(this.popup,211,584,needed.length?'작은 자리가 모자라면 왼쪽 자리에서 1을 가져와 작은 단위 10개로 바꿔요.':'같은 자리끼리 빼고 바뀌지 않는 자리는 그대로 써요.',15,'#edc88d',280);}
  this.centerLabel(this.fitText(this.text(this.popup,640,638,s.purchaseMessage||(q.wallet!==q.before?`정답을 맞혀도 보관한 ${numberText(q.wallet-q.before,q.digits)} 코인은 그대로 남아요.`:'정답일 때만 코인을 내고 선택한 칸에 설치해요.'),20,s.purchaseMessage?'#ffc296':C.muted).setOrigin(.5),860,30));
  this.button(this.popup,'purchase-cancel',458,692,238,64,'취소 · 돈 유지',true,'button_brown',23);
  this.button(this.popup,'purchase-confirm',805,692,310,64,'정답 확인 · 설치 ▶',!!s.purchaseInput,'button_red',23);
 }
 private drawDifficulty(){
  const m=this.getState().model;this.modalFrame('방어 난이도 선택',940,600);
  this.text(this.popup,640,230,'기본은 표준이에요. 단계가 올라갈수록 몬스터가 빨라져요.',22,C.cream).setOrigin(.5);
  (Object.keys(DIFFICULTIES) as Difficulty[]).forEach((id,i)=>{
   const x=355+i*285,chosen=m.difficulty===id;
   this.button(this.popup,'difficulty:'+id,x,315,250,90,(chosen?'✓ ':'')+DIFFICULTIES[id].name,m.canChangeDifficulty,chosen?'button_red':'button_brown',30);
   this.text(this.popup,x,395,DIFFICULTIES[id].description,18,C.ink,235).setOrigin(.5,0);
   const limits=balanceFor(m.level.id,id);
   this.text(this.popup,x,464,`타워 ${limits.towerLimit}개 · 0.01 타워 ${limits.precisionLimit}개\n성벽 ${limits.wallLimit}개`,20,'#edc88d').setOrigin(.5);
  });
  this.text(this.popup,640,550,m.canChangeDifficulty?'선택은 자동 저장돼요. 돈·벽돌·성벽 재고는 그대로예요.':'방어 시작 전에 타워와 성벽을 회수하면 변경할 수 있어요.',20,C.muted).setOrigin(.5);
  this.text(this.popup,640,591,'타워 고유 공격력·몬스터 체력·2분 진행·학습 목표는 같아요.',18,C.muted).setOrigin(.5);
 }
 private drawGoals(){
  const s=this.getState();this.modalFrame(`${s.model.level.name} · 학습 목표`,900,540);
  this.text(this.popup,258,234,s.model.level.hint,22,C.ink,760);
  s.model.goals.forEach((g,i)=>this.text(this.popup,263,338+i*43,`${g.done?'✓':'○'}  ${g.label}`,22,g.done?'#8bd3a0':'#bbb1a1',745));
  const m=s.model,max=m.level.boss?.hp??Math.max(...m.level.hp),kind=m.level.boss?.kind??monsterKind(m.level.id,m.level.hp.indexOf(max),max);
  this.text(this.popup,640,615,`최강 ${MONSTERS[kind].name} · 체력 ${numberText(max,m.level.boss?1:m.level.digits)} · 여러 타워로 힘을 모아요`,18,'#e7bf81').setOrigin(.5);
 }
 notify(message:string){
  if(!this.ready)return;this.toastView?.destroy(true);this.timer?.remove();const view=this.add.container(506,this.purchaseView?179:99).setDepth(70);this.toastView=view;const width=Math.min(930,Math.max(380,message.length*18+50));this.frame(view,0,0,width,48,'button_brown');this.centerLabel(this.fitText(this.text(view,0,0,message,20).setOrigin(.5),width-28,28));this.timer=this.time.delayedCall(3300,()=>{view.destroy(true);this.toastView=undefined;});
 }
 showPurchaseEquation(equation:string){
  if(!this.ready)return;this.purchaseView?.destroy(true);this.purchaseTimer?.remove();
  const view=this.add.container(504,111).setName('purchase-calculation').setDepth(71);this.purchaseView=view;
  this.frame(view,0,0,950,82,'panel_brown_dark');
  const m=this.getState().model;
  this.centerLabel(this.fitText(this.text(view,0,-21,`타워 구매 · 계산용 코인 · 전체 잔액 ${numberText(m.money,m.level.digits)} 코인`,15,'#c7baa6').setOrigin(.5),886,22));
  this.centerLabel(this.fitText(this.text(view,0,11,equation,34,'#ffe1a0').setName('purchase-equation').setOrigin(.5),886,42));
  this.toastView?.setY(179);
  this.purchaseTimer=this.time.delayedCall(8000,()=>{view.destroy(true);this.purchaseView=undefined;this.purchaseTimer=undefined;});
 }
 clearNotification(){this.toastView?.destroy(true);this.toastView=undefined;this.timer?.remove();this.timer=undefined;this.purchaseView?.destroy(true);this.purchaseView=undefined;this.purchaseTimer?.remove();this.purchaseTimer=undefined;}
 animate(ev:BattleEvent){
  if(!this.ready||this.reducedMotion)return;
  if((ev.type==='money'||ev.type==='brick')&&ev.x!==undefined){
   const point=this.fieldPoint(ev.x,ev.y!),coin=this.add.image(point.x,point.y,ev.type==='money'?'dungeon-icons':'dungeon-props',ev.type==='money'?'coin':'brick').setDisplaySize(34,34).setDepth(65);
   this.tweens.add({targets:coin,x:ev.type==='money'?576:1135,y:ev.type==='money'?35:this.screenLayout?.compact?this.compactShopLayout().forgeY:705,scaleX:coin.scaleX*.7,scaleY:coin.scaleY*.7,duration:700,ease:'Cubic.easeIn',onComplete:()=>coin.destroy()});
  }
  if(ev.type==='wall'&&ev.message.includes(' = ')){
   const x=this.screenLayout?.compact?938:917,y=this.screenLayout?.compact?174:330;
   for(let i=0;i<12;i++){const spark=this.add.image(x,y,'dungeon-icons','star').setDisplaySize(13,13).setDepth(60);const angle=i*Math.PI/6;this.tweens.add({targets:spark,x:x+Math.cos(angle)*90,y:y+Math.sin(angle)*80,alpha:0,duration:650,onComplete:()=>spark.destroy()});}
  }
 }
 getButtonBounds(key:string){const c=this.controls.get(key),view=this.controlViews.get(key);if(!c||!view||!view.scene)return null;const matrix=view.getWorldTransformMatrix(),point=matrix.transformPoint(0,0);return {x:point.x,y:point.y,w:c.w*Math.hypot(matrix.a,matrix.b),h:c.h*Math.hypot(matrix.c,matrix.d),enabled:c.enabled};}
}
