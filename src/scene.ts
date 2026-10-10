import Phaser from 'phaser';
import {Defense,Event as GameEvent,Enemy,WallPreview,WallImpact,WALL_DURABILITY} from './model';
import {Cell,TILE,COLS,ROWS,OX,OY,world,cellAt,key} from './path';
import {Effect,EFFECTS} from './levels';
import {decimal,numberText} from './math';
import {FIELD_X,FIELD_Y,FIELD_WIDTH,FIELD_HEIGHT} from './layout';
import {loadDungeon,registerDungeon,registerMonster,terrainTileScale} from './assets';
import {MonsterKind,MONSTERS,MONSTER_KINDS,monsterSize,stageMonsterKinds} from './monsters';
import {artURL} from './art';
import {towerType,TOWER_RANGE,LONG_TOWER_RANGE} from './towers';
import {HitEquationPopups} from './hit-equations';
import {hitEquationsEnabled} from './combat-preferences';
import {AmbientProps} from './ambient-props';
import type {GameScreenLayout} from './responsive-game';
import {playTowerProjectile,clearTowerProjectiles} from './tower-projectiles';
export interface Mode{kind:'tower'|'wall'|'inspect';unit:number;effect:Effect;typeId?:string;}
interface TowerVisual{root:Phaser.GameObjects.Container;base:Phaser.GameObjects.Image;pivot:Phaser.GameObjects.Container;head:Phaser.GameObjects.Image;angle:number;recoilTime:number;}
interface ShotData{towerId:number;typeId:string;targetId:number;toX:number;toY:number;kind:MonsterKind;effect:Effect;unit:number;before:number;after:number;valid:boolean;killed:boolean;}
export class Field extends Phaser.Scene{
 model:Defense;mode:Mode={kind:'inspect',unit:100,effect:'basic'};onChange:()=>void=()=>{};onEvent:(event:GameEvent)=>void=()=>{};onSelect:(id:number)=>void=()=>{};
 onImpactAudio:(type:'hit'|'kill'|'invalid')=>void=()=>{};
 onFinalBossImpact:(x:number,y:number)=>void=()=>{};
 // Freeze combat during the farewell, while the killing projectile still flies.
 presentationHeld=false;
 private floor!:Phaser.GameObjects.Container;private overlay!:Phaser.GameObjects.Graphics;private visuals=new Map<number,{kind:MonsterKind;sprite:Phaser.GameObjects.Sprite;text:Phaser.GameObjects.Text;name:Phaser.GameObjects.Text;bar:Phaser.GameObjects.Graphics}>();
 private towersView?:Phaser.GameObjects.Container;private layoutSignature='';private heartbeat=0;private readyFlag=false;selected?:number;
 private towerArt=new Map<number,TowerVisual>();private knownTowerIds=new Set<number>();private cursor:Cell={x:1,y:3};
 private wallArt=new Map<number,{image:Phaser.GameObjects.Image;health:Phaser.GameObjects.Text}>();
 selectedWall?:Cell;onWallSelect:(c:Cell)=>void=()=>{};
 onWallPlace:(c:Cell)=>void=()=>{};
 private wallGhost?:Phaser.GameObjects.Image;private wallGhostLabel?:Phaser.GameObjects.Text;
 onPurchase:(c:Cell,typeId:string)=>void=()=>{};
 beforeCellAction:(c:Cell)=>boolean=()=>true;
 private reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
 private battleEffects=new Set<Phaser.GameObjects.GameObject>();private lastShakeTime=0;
 private hitEquations?:HitEquationPopups;private shotSequence=0;
 private ambient?:AmbientProps;
 private loadingMonsters=new Set<MonsterKind>();private monsterRetry=new Map<MonsterKind,number>();
 private screenLayout?:GameScreenLayout;
 constructor(model:Defense){super('field');this.model=model;}
 preload(){loadDungeon(this,stageMonsterKinds(this.model.level));this.load.image('dungeon-wall-collapse-v1',artURL('wall-collapse-v1'));}
 create(){
  this.readyFlag=true;this.layoutCamera();registerDungeon(this);this.floor=this.add.container(0,0);this.towersView=this.add.container(0,0);this.overlay=this.add.graphics().setDepth(8);
  this.ambient=new AmbientProps(this,this.reducedMotion);
  this.hitEquations=new HitEquationPopups(this,{left:16,right:FIELD_WIDTH-16,top:12,bottom:FIELD_HEIGHT-16},()=>this.model.phase==='paused');
  for(const kind of MONSTER_KINDS)this.monsterAnimations(kind);
  for(const effect of ['basic','slow','stun','range'])this.anims.create({key:'impact-'+effect,frames:Array.from({length:6},(_,i)=>({key:'dungeon-fx-impact-v1',frame:effect+'-'+i})),frameRate:22,repeat:0});
  for(const effect of ['muzzle','defeat','shockwave'])this.anims.create({key:'fx-'+effect,frames:Array.from({length:6},(_,i)=>({key:'dungeon-fx-utility-v1',frame:effect+'-'+i})),frameRate:effect==='muzzle'?36:18,repeat:0});
  this.anims.create({key:'wall-collapse',frames:Array.from({length:9},(_,i)=>({key:'dungeon-wall-collapse-v1',frame:'break-'+i})),frameRate:15,repeat:0});
  this.input.on('pointermove',(pointer:Phaser.Input.Pointer)=>{if(!this.inField(pointer)){if(this.mode.kind==='wall')return;this.clearWallPreview();return;}const p=this.cameras.main.getWorldPoint(pointer.x,pointer.y);this.hover(cellAt(p.x,p.y));});
  this.input.on('pointerdown',(pointer:Phaser.Input.Pointer)=>{
   if(!this.inField(pointer))return;const p=this.cameras.main.getWorldPoint(pointer.x,pointer.y);this.actCell(cellAt(p.x,p.y));
  });
  this.input.keyboard?.on('keydown',(e:KeyboardEvent)=>{
   if(!this.input.enabled||(e.target as HTMLElement)?.closest('button,input,textarea,select'))return;
   const directions:Record<string,[number,number]>={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};const d=directions[e.key];
   if(d){e.preventDefault();this.cursor={x:Phaser.Math.Clamp(this.cursor.x+d[0],0,COLS-1),y:Phaser.Math.Clamp(this.cursor.y+d[1],0,ROWS-1)};this.hover(this.cursor);const p=world(this.cursor);this.overlay.lineStyle(3,0xffe7a2).strokeRect(p.x-27,p.y-27,54,54);}
   else if(e.key==='Enter'&&!e.repeat){e.preventDefault();this.actCell(this.cursor);}
  });this.drawTerrain();this.scene.launch('game-ui');this.onChange();
 }
 setScreenLayout(layout:GameScreenLayout){this.screenLayout=layout;if(this.readyFlag)this.layoutCamera();}
 private layoutCamera(){
  const compact=this.screenLayout?.compact,top=compact?Math.max(68,Math.ceil(44/this.screenLayout!.scale))+12:FIELD_Y,height=compact?this.screenLayout!.height-top-8:FIELD_HEIGHT;
  this.cameras.main.setViewport(FIELD_X,top,FIELD_WIDTH,height).setZoom(Math.min(1,height/FIELD_HEIGHT)).centerOn(FIELD_WIDTH/2,FIELD_HEIGHT/2);
 }
 /** Canvas coordinates, shared by the finale overlay and responsive UI effects. */
 worldToScreen(x:number,y:number){const c=this.cameras.main;return {x:c.x+c.width/2+(x-FIELD_WIDTH/2)*c.zoom,y:c.y+c.height/2+(y-FIELD_HEIGHT/2)*c.zoom};}
 private inField(p:Phaser.Input.Pointer){const c=this.cameras.main;return p.x>=c.x&&p.x<c.x+c.width&&p.y>=c.y&&p.y<c.y+c.height;}
 actCell(c:Cell){
  if(!this.beforeCellAction(c))return;
   if(!this.input.enabled||c.x<0||c.x>=COLS||c.y<0||c.y>=ROWS)return;
   if(this.mode.kind==='wall'){this.onWallPlace(c);this.flush();this.onChange();return;}
   const t=this.model.towers.find(t=>t.x===c.x&&t.y===c.y);
   if(this.model.walls.some(w=>key(w)===key(c))){this.mode.kind='inspect';this.selected=undefined;this.onSelect(0);this.selectedWall={...c};this.onWallSelect(this.selectedWall);this.hover(c);}
   else if(t){this.mode.kind='inspect';this.selected=t.id;this.onSelect(t.id);this.hover(c);}
   else if(this.mode.kind==='tower')this.onPurchase(c,this.mode.typeId??'basic');
   else {this.selected=undefined;this.onSelect(0);}
   this.flush();this.onChange();
 }
 setModel(model:Defense){this.model=model;this.presentationHeld=false;this.selected=undefined;this.selectedWall=undefined;if(this.readyFlag)this.clearBattleEffects();this.mode.kind='inspect';this.knownTowerIds.clear();if(!this.readyFlag)return;for(const v of this.towerArt.values())this.tweens.killTweensOf(v.root);this.towerArt.clear();for(const v of this.visuals.values()){v.sprite.destroy();v.text.destroy();v.name.destroy();v.bar.destroy();}this.visuals.clear();this.layoutSignature='';this.overlay.clear();this.drawTerrain();}
 private label(x:number,y:number,text:string,size=16,color='#f7e8cd'){
  return this.add.text(x,y,text,{fontFamily:'Malgun Gothic, system-ui, sans-serif',fontSize:size,fontStyle:'bold',color,align:'center',padding:{x:5,y:3}}).setOrigin(.5);
 }
 drawTerrain(){
  if(this.readyFlag)for(const kind of stageMonsterKinds(this.model.level))this.ensureMonster(kind);
  if(!this.readyFlag)return;this.ambient?.prepareRedraw();const previous=new Map(this.towerArt);for(const v of previous.values())this.tweens.killTweensOf(v.root);this.floor.removeAll(true);this.towersView?.removeAll(true);this.towerArt.clear();for(const v of this.wallArt.values()){v.image.destroy();v.health.destroy();}this.wallArt.clear();const road=this.model.path()??[],roadSet=new Set(road.map(key)),map=this.model.map;
  const backdrop=this.add.graphics();backdrop.fillStyle(0x17191d).fillRoundedRect(9,24,970,558,12);backdrop.lineStyle(2,0x4c4840).strokeRoundedRect(12,27,964,552,10);this.floor.add(backdrop);
  this.floor.add(this.label(FIELD_WIDTH/2,12,`${String(map.id).padStart(2,'0')} · ${map.name}`,16,'#ded0b8'));
  const floorScale=terrainTileScale(this,.38);
  const stoneFloor=this.add.tileSprite(OX+COLS*TILE/2,OY+ROWS*TILE/2,COLS*TILE,ROWS*TILE,'dungeon-terrain','floor').setTileScale(floorScale.x,floorScale.y).setTint(map.floorTint);this.floor.add(stoneFloor);
  const props=(x:number,y:number,name:string,w:number,h=w)=>{const image=this.add.image(x,y,'dungeon-props',name).setDisplaySize(w,h);this.floor.add(image);return image;};
  for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++){
   const c={x,y},xy=world(c),isRoad=roadSet.has(key(c));
   if(isRoad){const floor=this.add.image(xy.x,xy.y,'dungeon-terrain',(x+y)%2?'path':'path-alt').setDisplaySize(TILE+.5,TILE+.5).setTint(map.pathTint);this.floor.add(floor);}
   if(this.model.blocks.has(key(c))&&!this.model.walls.some(w=>key(w)===key(c))&&!this.model.towers.some(t=>key(t)===key(c)))props(xy.x,xy.y-7,'rock',75,75).setTint(map.rockTint);
   else if(!isRoad&&!this.model.towers.some(t=>key(t)===key(c))&&((x*31+y*7)%23===0))props(xy.x+9,xy.y+9,(x+y)%2?'rubble':'plant',30,30).setAlpha(.7);
  }
  // Quiet grid guides appear only while placing; the path is marked for learning clarity.
  const lights=this.add.graphics();for(const c of [{x:1,y:0},{x:12,y:8}]){const xy=world(c);for(let r=6;r>=1;r--)lights.fillStyle(0xffa942,.008*(7-r)).fillCircle(xy.x,xy.y,r*14);this.ambient?.add(this.floor,'torch-'+key(c),'torch',xy.x,xy.y-8,60,66);}this.floor.add(lights);
  const dots=this.add.graphics().fillStyle(0xe1be82,.45);road.forEach((c,i)=>{if(i%2)dots.fillCircle(world(c).x,world(c).y,2);});this.floor.add(dots);
  this.model.walls.forEach(w=>{const xy=world(w),image=this.add.image(xy.x,xy.y-8,'dungeon-wall-collapse-v1','wall-'+(WALL_DURABILITY-w.durability)).setDisplaySize(94,88).setDepth(4.1);
   const health=this.label(xy.x,xy.y+34,'◆'.repeat(w.durability)+'◇'.repeat(WALL_DURABILITY-w.durability),14,'#ffda92').setBackgroundColor('#13151bea').setDepth(7.2);this.wallArt.set(w.id,{image,health});});
  const start=world(map.start),end=world(map.end);this.ambient?.add(this.floor,'entrance','portal',start.x,start.y-8,96,104);this.floor.add(this.label(start.x,start.y+36,'입구',14,'#d4bcef'));
  const glow=this.add.graphics();for(let r=5;r>=1;r--)glow.fillStyle(0xffac52,.015*(6-r)).fillCircle(end.x,end.y,r*14);this.floor.add(glow);
  this.ambient?.add(this.floor,'guardian','flame',end.x,end.y-14,128,116);this.floor.add(this.label(end.x,end.y+44,'수호의 불꽃',15,'#ffdd9c'));
  for(const t of this.model.towers){const xy=world(t);
   const root=this.add.container(xy.x,xy.y-8).setAlpha(t.enabled?1:.45);this.towersView?.add(root);
   const base=this.add.image(0,0,'dungeon-turret-parts-v1','base').setDisplaySize(76,76);root.add(base);
   const old=previous.get(t.id),angle=old?.angle??0,pivot=this.add.container(0,-5).setRotation(angle);root.add(pivot);
   const type=towerType(t.typeId)!,head=this.add.image(0,0,'dungeon-tower-heads-'+type.sheet+'-v1',type.id).setOrigin(.5,.64).setDisplaySize(64,64);pivot.add(head);
   this.towerArt.set(t.id,{root,base,pivot,head,angle,recoilTime:old?.recoilTime??0});
   if(!this.knownTowerIds.has(t.id)&&!this.reducedMotion){root.setScale(0);this.tweens.add({targets:root,scale:1,duration:280,ease:'Back.easeOut'});}this.knownTowerIds.add(t.id);
   const text=this.label(xy.x,xy.y+28,decimal(t.unit,this.model.level.digits),20,'#ffe4a3');text.setBackgroundColor('#15171eea');this.towersView?.add(text);
   const status=this.add.image(xy.x+22,xy.y-32,'dungeon-icons',t.enabled?'play':'pause').setDisplaySize(18,18);this.towersView?.add(status);
  }
  this.layoutSignature=this.signature();if(this.mode.kind==='wall'&&this.model.pendingWall)this.hover(this.model.pendingWall);else if(this.selected){const t=this.model.towers.find(t=>t.id===this.selected);if(t)this.hover(t);}
 }
 private signature(){return this.model.towers.map(t=>`${t.id}${t.enabled}`).join(',')+'w'+this.model.walls.map(w=>w.id).join(';');}
 focusCell(c:Cell){this.cursor={...c};this.hover(c);}
 hover(c:Cell){
  this.wallGhost?.setVisible(false);this.wallGhostLabel?.setVisible(false);
  // Show range while choosing a legal location.
  this.overlay.clear();if(this.mode.kind!=='inspect'){this.overlay.lineStyle(1,0xe1d1aa,.15);for(let x=0;x<=COLS;x++)this.overlay.lineBetween(OX+x*TILE,OY,OX+x*TILE,OY+ROWS*TILE);for(let y=0;y<=ROWS;y++)this.overlay.lineBetween(OX,OY+y*TILE,OX+COLS*TILE,OY+y*TILE);}if(c.x<0||c.x>=COLS||c.y<0||c.y>=ROWS)return;this.cursor={...c};
  if(this.mode.kind==='wall'){this.drawWallPreview(this.model.pendingWall??this.model.previewWall(c));return;}
  const selected=this.model.towers.find(t=>t.id===this.selected),xy=world(selected??this.selectedWall??c);
  if(this.selectedWall&&this.mode.kind==='inspect')this.overlay.lineStyle(3,0xffe7a2).strokeRoundedRect(xy.x-26,xy.y-26,52,52,8);
  if(this.mode.kind==='tower'||selected){const effect=selected?.effect??this.mode.effect,radius=effect==='range'?LONG_TOWER_RANGE:TOWER_RANGE;this.overlay.fillStyle(EFFECTS[effect].color,.11).fillCircle(xy.x,xy.y,radius);this.overlay.lineStyle(2,EFFECTS[effect].color,.7).strokeCircle(xy.x,xy.y,radius);}
  if(this.mode.kind!=='inspect'){const valid=this.model.candidate(c);this.overlay.lineStyle(3,valid?0xfaf2d6:0xbe5c48,.9).strokeRoundedRect(world(c).x-26,world(c).y-26,52,52,8);}
 }
 clearWallPreview(){this.overlay?.clear();this.wallGhost?.setVisible(false);this.wallGhostLabel?.setVisible(false);}
 private drawWallPreview(preview:WallPreview){
  const g=this.overlay;
  for(const c of this.model.path()??[])if(this.model.candidate(c,true)){const p=world(c);g.fillStyle(0x91efad,.13).fillRect(p.x-25,p.y-25,50,50);}
  const p=world(preview);g.lineStyle(3,preview.valid?0x91efad:0xff675d).strokeRoundedRect(p.x-27,p.y-27,54,54,8);
  this.wallGhost??=this.add.image(0,0,'dungeon-wall-collapse-v1','wall-0').setDisplaySize(94,88).setDepth(9);
  this.wallGhost.setPosition(p.x,p.y-8).setAlpha(.65).setTint(preview.valid?0xb8ffd0:0xff7777).setVisible(true);
  this.wallGhostLabel??=this.label(0,0,'',14).setBackgroundColor('#11141de8').setDepth(10);
  this.wallGhostLabel.setPosition(p.x,Math.max(30,p.y-47)).setText(preview.valid?'눌러서 설치':'설치 불가').setVisible(true);
 }
 private monsterAnimations(kind:MonsterKind){
  if(!this.textures.exists('dungeon-'+MONSTERS[kind].atlas))return;registerMonster(this,kind);
  for(const [name,start]of [['walk',0],['hurt',4],['frozen',8],['fall',12]] as const)if(!this.anims.exists(kind+'-'+name))this.anims.create({key:kind+'-'+name,frames:Array.from({length:4},(_,i)=>({key:'dungeon-'+MONSTERS[kind].atlas,frame:kind+'-'+(start+i)})),frameRate:name==='walk'?5:8,repeat:name==='fall'?0:-1});
 }
 private ensureMonster(kind:MonsterKind){
  const key='dungeon-'+MONSTERS[kind].atlas;if(this.textures.exists(key)||this.loadingMonsters.has(kind)||performance.now()<(this.monsterRetry.get(kind)??0))return;
  this.loadingMonsters.add(kind);const event='filecomplete-image-'+key;
  const complete=()=>{this.load.off('loaderror',failed);this.loadingMonsters.delete(kind);this.monsterAnimations(kind);};
  const failed=(file:Phaser.Loader.File)=>{if(file.key!==key)return;this.load.off(event,complete);this.load.off('loaderror',failed);this.loadingMonsters.delete(kind);this.monsterRetry.set(kind,performance.now()+30000);};
  this.load.once(event,complete);this.load.on('loaderror',failed);this.load.image(key,artURL(MONSTERS[kind].atlas));if(!this.load.isLoading())this.load.start();
 }
 private enemyVisual(e:Enemy){
  this.ensureMonster(e.kind);const renderedKind=this.textures.exists('dungeon-'+MONSTERS[e.kind].atlas)?e.kind:'slime';
  const art=MONSTERS[e.kind],size=monsterSize(e.kind,this.model.level.id),sy=e.y+32-size*.4;
  const tx=Phaser.Math.Clamp(e.x,art.boss?69:48,FIELD_WIDTH-69),ty=Math.max(hitEquationsEnabled()?106:62,sy-size*.46);
  let v=this.visuals.get(e.id);if(!v){
   const sprite=this.add.sprite(e.x,sy,'dungeon-'+MONSTERS[renderedKind].atlas,renderedKind+'-0').setDisplaySize(size,size).setDepth(4).setData('kind',e.kind);sprite.play(renderedKind+'-walk');
   const text=this.label(tx,ty,'',art.boss?32:25,'#fff0cb').setBackgroundColor('#11141de8').setDepth(7);
   const name=this.label(tx,ty-27,(art.boss?'보스 · ':'')+art.name,art.boss?15:12,art.boss?'#ffd478':'#ddd4c5').setBackgroundColor('#11141de8').setDepth(7);
   const bar=this.add.graphics().setDepth(6);v={kind:e.kind,sprite,text,name,bar};this.visuals.set(e.id,v);
  }
  const texture='dungeon-'+MONSTERS[renderedKind].atlas;if(v.sprite.texture.key!==texture)v.sprite.stop().setTexture(texture,renderedKind+'-0').setDisplaySize(size,size);
  const previous=e.path[e.next-1],next=e.path[e.next],dx=previous&&next?next.x-previous.x:0;
  if(dx)v.sprite.setFlipX(dx<0);
  const bouncing=(e.recoil?.remaining??0)>0,pose=!this.reducedMotion&&bouncing?Math.sin(Math.PI*(1-e.recoil!.remaining/.6))*12:0;
  const normal=bouncing?Math.hypot(e.recoil!.vx,e.recoil!.vy):0;
  v.sprite.setPosition(e.x+(normal?e.recoil!.vx/normal*pose:0),sy+(normal?e.recoil!.vy/normal*pose:0));
  v.sprite.setRotation(!this.reducedMotion&&bouncing?Phaser.Math.Clamp(e.recoil!.vx/900,-.12,.12):0);
  const anim=renderedKind+'-'+(bouncing?'hurt':e.stun||e.slow?'frozen':e.hitFlash?'hurt':'walk');if(v.sprite.anims.currentAnim?.key!==anim)v.sprite.play(anim);
  v.text.setPosition(tx,ty).setText(e.kind==='wizard'?numberText(e.hp):decimal(e.hp,this.model.level.digits));v.name.setPosition(tx,ty-27);
  const width=art.boss?100:Math.max(44,size*.38),by=ty+22;v.bar.clear();v.bar.fillStyle(0x090a10,.9).fillRoundedRect(tx-width/2,by,width,6,2);v.bar.fillStyle(e.stun?0xb9a4dc:art.color).fillRoundedRect(tx-width/2,by,width*e.hp/e.max,6,2);
 }
 private impactPoint(x:number,y:number,kind:MonsterKind){return {x,y:y+32-monsterSize(kind,this.model.level.id)*.4};}
 private aimAngle(v:TowerVisual,x:number,y:number){
  const origin=v.pivot.getWorldTransformMatrix().transformPoint(0,0);
  return Math.atan2(y-origin.y,x-origin.x)+Math.PI/2;
 }
 private animateTowers(delta:number){
  if(this.model.phase!=='playing')return;const dt=Math.min(.1,Math.max(0,delta/1000));
  for(const t of this.model.towers){const v=this.towerArt.get(t.id);if(!v)continue;
   const target=t.enabled?this.model.targetFor(t):undefined;
   if(target){const point=this.impactPoint(target.x,target.y,target.kind),desired=this.aimAngle(v,point.x,point.y);
    const difference=Math.atan2(Math.sin(desired-v.angle),Math.cos(desired-v.angle));
    v.angle=this.reducedMotion?desired:v.angle+Phaser.Math.Clamp(difference,-dt*8,dt*8);v.pivot.setRotation(v.angle);
   }
   v.recoilTime=Math.max(0,v.recoilTime-dt);const elapsed=.22-v.recoilTime;
   const strength=t.unit>=1000?7:t.unit>=100?4:2.5;
   v.head.y=!this.reducedMotion&&v.recoilTime>0?strength*(elapsed<.055?elapsed/.055:1-(elapsed-.055)/.165):0;
  }
 }
 private animateWalls(){
  for(const w of this.model.walls){const view=this.wallArt.get(w.id);if(!view)continue;const p=world(w);
   view.image.setFrame('wall-'+(WALL_DURABILITY-w.durability)).setPosition(p.x+(this.reducedMotion?0:w.offsetX*2.5),p.y-8+(this.reducedMotion?0:w.offsetY*2.5));
   view.image.setRotation(this.reducedMotion?0:Phaser.Math.Clamp(w.offsetX*.025,-.1,.1));
   view.health.setText('◆'.repeat(w.durability)+'◇'.repeat(WALL_DURABILITY-w.durability));
  }
 }
 private wallImpact(ev:GameEvent){
  const d=ev.data as WallImpact,x=ev.x!,y=ev.y!;
  // Keep durability feedback away from the monster's decimal HP and equations.
  const below=y+88<FIELD_HEIGHT,labelX=below?x:Math.min(FIELD_WIDTH-70,x+64),labelY=below?y+68:y+8;
  const label=this.trackEffect(this.label(labelX,labelY,d.durability?`충돌! ${d.durability}/${WALL_DURABILITY}`:'성벽 파괴!',17,d.durability?'#ffde9b':'#ffb494').setBackgroundColor('#13151deb').setDepth(10));
  this.tweens.add({targets:label,y:label.y+(this.reducedMotion?0:8),alpha:0,delay:350,duration:550,onComplete:()=>label.destroy()});
  if(this.reducedMotion)return;
  const ring=this.effect('dungeon-fx-utility-v1','fx-shockwave',x-d.dx*15,y-d.dy*15,74,0,0xe8d6b3);ring?.setAlpha(.5);
  const view=this.visuals.get(d.enemyId);if(view){const sprite=view.sprite,size=monsterSize(d.kind,this.model.level.id);this.tweens.killTweensOf(sprite);sprite.setDisplaySize(size,size);
   this.tweens.add({targets:sprite,scaleX:sprite.scaleX*(Math.abs(d.dx)>.5?.86:1.1),scaleY:sprite.scaleY*(Math.abs(d.dy)>.5?.86:1.1),duration:65,yoyo:true,ease:'Quad.easeOut'});
  }
  this.wallDebris(x-d.dx*18,y-d.dy*18,d.dx,d.dy);
  if(this.time.now-this.lastShakeTime>160&&this.model.phase==='playing'){this.lastShakeTime=this.time.now;this.cameras.main.shake(d.durability?65:120,d.durability ? .0011 : .0022,false);}
 }
 private wallDebris(x:number,y:number,dx:number,dy:number){
  for(let i=0;i<6&&this.battleEffects.size<160;i++){
   const piece=this.trackEffect(this.add.image(x,y-12,'dungeon-fx-utility-v1','particle-stone').setDisplaySize(6+Math.random()*7,6+Math.random()*7).setDepth(5.4));
   const vx=dx*(35+Math.random()*45)+(Math.random()-.5)*95,vy=-70-Math.random()*65+dy*20,g=500,ground=y+22;
   const land=(-vy+Math.sqrt(vy*vy+2*g*34))/g,clock={t:0},spin=(Math.random()-.5)*360;
   piece.once('destroy',()=>this.tweens.killTweensOf(clock));
   this.tweens.add({targets:clock,t:.85,duration:850,onUpdate:()=>{if(!piece.active)return;const t=clock.t,after=Math.max(0,t-land),bounce=-.3*(vy+g*land);
    piece.x=x+vx*(t<=land?t:land+(1-Math.exp(-5*after))/5);
    piece.y=t<=land?y-12+vy*t+g*t*t/2:Math.min(ground,ground+bounce*after+g*after*after/2);
    piece.setAngle(spin*t).setAlpha(Math.min(1,(.85-t)/.25));
   },onComplete:()=>piece.destroy()});
  }
 }
 private breakWall(ev:GameEvent){
  const x=ev.x!,y=ev.y!;
  if(this.reducedMotion){const rubble=this.trackEffect(this.add.image(x,y-8,'dungeon-wall-collapse-v1','break-7').setDisplaySize(94,88).setDepth(4.4));this.tweens.add({targets:rubble,alpha:0,delay:350,duration:300,onComplete:()=>rubble.destroy()});return;}
  const collapse=this.trackEffect(this.add.sprite(x,y-8,'dungeon-wall-collapse-v1','break-0').setName('wall-collapse').setDisplaySize(94,88).setDepth(4.4));
  collapse.once('animationcomplete',()=>this.tweens.add({targets:collapse,alpha:0,duration:250,onComplete:()=>collapse.destroy()}));collapse.play('wall-collapse');
 }
 private trackEffect<T extends Phaser.GameObjects.GameObject>(object:T):T{
  this.battleEffects.add(object);object.once('destroy',()=>this.battleEffects.delete(object));return object;
 }
 private clearBattleEffects(){
  clearTowerProjectiles(this);
  this.hitEquations?.clear();
  for(const object of [...this.battleEffects]){this.tweens.killTweensOf(object);object.destroy();}
  this.battleEffects.clear();this.tweens.timeScale=1;this.cameras.main.shakeEffect.reset();this.lastShakeTime=0;
 }
 private effect(atlas:string,animation:string,x:number,y:number,size:number,rotation=0,tint?:number){
  if(this.battleEffects.size>=160)return;
  const firstFrame=(animation.startsWith('impact-')?animation.slice(7):animation.slice(3))+'-0';
  const sprite=this.trackEffect(this.add.sprite(x,y,atlas,firstFrame).setDisplaySize(size,size).setRotation(rotation).setDepth(5.5));
  if(tint!==undefined)sprite.setTint(tint);
  sprite.once('animationcomplete',()=>sprite.destroy());sprite.play(animation);return sprite;
 }
 private fragments(x:number,y:number,size:number,color:number,stone=false){
  for(let i=0;i<(stone?8:4)&&this.battleEffects.size<160;i++){
   const angle=i*Math.PI*2/(stone?8:4)+Math.random()*.4,length=size*(.3+Math.random()*.3),pieceSize=stone?11+Math.random()*9:9;
   const piece=this.trackEffect(this.add.image(x,y,'dungeon-fx-utility-v1',stone?'particle-stone':'particle-spark').setDisplaySize(pieceSize,pieceSize).setDepth(5.4));
   if(!stone)piece.setTint(color);
   this.tweens.add({targets:piece,x:x+Math.cos(angle)*length,y:y+Math.sin(angle)*length+14,angle:Phaser.Math.Between(-120,120),alpha:0,duration:stone?480:280,ease:'Cubic.easeOut',onComplete:()=>piece.destroy()});
  }
 }
 private impact(d:ShotData,x:number,y:number,sequence:number){
  this.onImpactAudio(!d.valid?'invalid':d.killed?'kill':'hit');
  if(d.valid&&d.killed&&d.kind==='wizard'&&this.model.level.boss?.kind==='wizard')this.onFinalBossImpact(x,y);
  const size=d.unit>=1000?108:d.unit>=100?72:46,color=EFFECTS[d.effect].color;
  if(d.valid)this.hitEquations?.show(d.targetId,d.before,d.unit,d.after,()=>{
   const target=this.visuals.get(d.targetId),bodySize=monsterSize(d.kind,this.model.level.id);
   return {x:target?.sprite.x??x,y:target?target.name.y-42:Math.max(106,y-bodySize*.46)-69};
  },this.model.level.digits,'#fff0c4',sequence);
  if(!d.valid){
   const shield=this.trackEffect(this.add.image(x,y,'dungeon-fx-utility-v1','shockwave-1').setDisplaySize(42,42).setTint(0xff7777).setAlpha(.65).setDepth(5.5));
   this.tweens.add({targets:shield,alpha:0,duration:160,onComplete:()=>shield.destroy()});return;
  }
  if(this.reducedMotion){
   const flash=this.trackEffect(this.add.image(x,y,'dungeon-fx-impact-v1',d.effect+'-0').setDisplaySize(32,32).setAlpha(.6).setDepth(5.5));
   this.tweens.add({targets:flash,alpha:0,duration:120,onComplete:()=>flash.destroy()});return;
  }
  this.effect('dungeon-fx-impact-v1','impact-'+d.effect,x,y,size);this.fragments(x,y,size,color);
  const target=this.visuals.get(d.targetId);
  if(target){
   const sprite=target.sprite,bodySize=monsterSize(d.kind,this.model.level.id);this.tweens.killTweensOf(sprite);sprite.setDisplaySize(bodySize,bodySize).setTintFill(0xfff0d1);
   this.tweens.add({targets:sprite,scaleX:sprite.scaleX*1.05,scaleY:sprite.scaleY*.94,duration:65,yoyo:true,onYoyo:()=>sprite.clearTint(),onComplete:()=>sprite.clearTint()});
  }
  if(d.unit>=1000||d.killed){const ring=this.effect('dungeon-fx-utility-v1','fx-shockwave',x,y,size*1.35,0,color);ring?.setDepth(3.5).setAlpha(.65);}
  if(d.killed){const deathSize=Math.min(190,monsterSize(d.kind,this.model.level.id)*1.05);this.effect('dungeon-fx-utility-v1','fx-defeat',x,y,deathSize);this.fragments(x,y,deathSize,color,true);}
  if((d.unit>=1000||d.killed&&MONSTERS[d.kind].boss)&&this.time.now-this.lastShakeTime>200&&this.model.phase==='playing'){
   this.lastShakeTime=this.time.now;this.cameras.main.shake(MONSTERS[d.kind].boss&&d.killed?150:90,MONSTERS[d.kind].boss&&d.killed?0.003:0.0015,false);
  }
 }
 private fireShot(ev:GameEvent){
  const d=ev.data as ShotData,point=this.impactPoint(d.toX,d.toY,d.kind),v=this.towerArt.get(d.towerId),sequence=++this.shotSequence;
  let origin={x:ev.x!,y:ev.y!-13};
  if(v){
   // A killing shot still aims at its recorded target, even after it disappears.
   v.angle=this.aimAngle(v,point.x,point.y);v.pivot.setRotation(v.angle);v.recoilTime=this.reducedMotion?0:.22;
   const length={basic:29,slow:33,stun:33,range:38}[d.effect];origin=v.pivot.getWorldTransformMatrix().transformPoint(0,-length+v.head.y);
  }
  const bearing=Math.atan2(point.y-origin.y,point.x-origin.x);
  if(!this.reducedMotion){
   this.effect('dungeon-fx-utility-v1','fx-muzzle',origin.x,origin.y,d.unit>=1000?72:d.unit>=100?52:36,bearing+Math.PI/2,EFFECTS[d.effect].color)?.setOrigin(.5,.85);
  }
  playTowerProjectile(this,{typeId:d.typeId,from:origin,to:point,reducedMotion:this.reducedMotion,
   track:object=>{this.trackEffect(object);},onImpact:()=>this.impact(d,point.x,point.y,sequence)});
 }
 flush(){
  const events=this.model.events.splice(0);for(const ev of events){this.onEvent(ev);if(ev.type==='shot')this.fireShot(ev);else if(ev.type==='wall-impact')this.wallImpact(ev);else if(ev.type==='wall-break')this.breakWall(ev);
   if(['hit','invalid','kill'].includes(ev.type)&&ev.x!==undefined){const data=ev.data as {damage?:number;after?:number}|undefined;const value=ev.type==='hit'?(hitEquationsEnabled()||data?.after===0?'':`− ${decimal(data!.damage!,this.model.level.digits)}`):ev.type==='kill'?'정확히 0!':ev.message;if(value){const t=this.label(ev.x,ev.y!+36,value,ev.type==='invalid'?13:19,ev.type==='invalid'?'#ffb494':'#ffe3a0').setDepth(10).setBackgroundColor('#13151dea');this.tweens.add({targets:t,y:ev.y!+18,alpha:0,duration:1600,ease:'Cubic.easeOut',onComplete:()=>t.destroy()});}}
  }
 }
 update(_time:number,delta:number){
  const paused=this.model.phase==='paused';this.tweens.timeScale=paused?0:1;if(paused)this.cameras.main.shakeEffect.reset();
  this.ambient?.setPaused(paused);
  for(const object of this.battleEffects)if(object instanceof Phaser.GameObjects.Sprite){if(paused)object.anims.pause();else if(object.anims.isPaused)object.anims.resume();}
  if(!this.presentationHeld)this.model.step(delta/1000);for(const e of this.model.enemies)this.enemyVisual(e);
  for(const v of this.visuals.values()){if(paused)v.sprite.anims.pause();else if(v.sprite.anims.isPaused)v.sprite.anims.resume();}
  const live=new Set(this.model.enemies.map(e=>e.id));for(const [id,v]of this.visuals){if(live.has(id))continue;v.text.destroy();v.name.destroy();v.bar.destroy();this.trackEffect(v.sprite);v.sprite.play((this.anims.exists(v.kind+'-fall')?v.kind:'slime')+'-fall');this.tweens.add({targets:v.sprite,alpha:0,duration:550,onComplete:()=>v.sprite.destroy()});this.visuals.delete(id);}
  if(this.layoutSignature!==this.signature())this.drawTerrain();this.animateWalls();this.animateTowers(delta);this.flush();this.heartbeat+=delta;if(this.heartbeat>=120){this.heartbeat=0;this.onChange();}
 }
}

