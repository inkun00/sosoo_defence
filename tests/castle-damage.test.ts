import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import type Phaser from 'phaser';
import atlas from '../src/castle-damage-atlas.json';
import {CastleDamageEffects,scaledCastleDamageAtlas} from '../src/castle-damage-effects';

type CastleKind='hit'|'collapse';

test('castle atlas retains all measured nonuniform crops and the original source',()=>{
 const original=JSON.stringify(atlas);
 for(const kind of Object.keys(atlas) as CastleKind[]){
  const source=atlas[kind];
  assert.equal(source.frames.length,16);
  assert.ok(new Set(source.frames.map(frame=>`${frame.width}:${frame.height}`)).size>1,'generated poses have individual measured bounds');
  assert.deepEqual(scaledCastleDamageAtlas(kind,source.sourceWidth,source.sourceHeight),source);
 }
 assert.equal(JSON.stringify(atlas),original);
});

test('resized castle crops remain inside the texture and shared trim canvas',()=>{
 const original=JSON.stringify(atlas);
 for(const kind of Object.keys(atlas) as CastleKind[])for(const [width,height]of [[1024,1024],[768,768],[640,640],[512,512],[1024,768]]){
  const source=atlas[kind],scaled=scaledCastleDamageAtlas(kind,width,height);
  assert.equal(scaled.frames.length,16);
  assert.equal(scaled.sourceWidth,width);assert.equal(scaled.sourceHeight,height);
  assert.equal(scaled.canvasWidth,Math.round(source.canvasWidth*width/source.sourceWidth));
  assert.equal(scaled.canvasHeight,Math.round(source.canvasHeight*height/source.sourceHeight));
  scaled.frames.forEach((frame,index)=>{
   assert.ok(Object.values(frame).every(Number.isInteger),`${kind} ${index}: integer crop`);
   assert.ok(frame.width>0&&frame.height>0,`${kind} ${index}: visible pose`);
   assert.ok(frame.x>=0&&frame.y>=0&&frame.x+frame.width<=width&&frame.y+frame.height<=height,`${kind} ${index}: texture bounds`);
   assert.ok(frame.offsetX>=0&&frame.offsetY>=0&&frame.offsetX+frame.width<=scaled.canvasWidth&&frame.offsetY+frame.height<=scaled.canvasHeight,`${kind} ${index}: trim bounds`);
   assert.ok(Math.abs(frame.x-source.frames[index].x*width/source.sourceWidth)<=.5,`${kind} ${index}: measured x`);
   assert.ok(Math.abs(frame.y-source.frames[index].y*height/source.sourceHeight)<=.5,`${kind} ${index}: measured y`);
  });
 }
 assert.equal(JSON.stringify(atlas),original,'scaling must not mutate source coordinates');
});

test('castle atlas rejects unusable dimensions',()=>{
 for(const kind of ['hit','collapse'] as const)for(const [width,height]of [[0,1024],[1024,0],[-1,1024],[1024,-1],[1.5,1024],[1024,.5],[NaN,1024],[1024,Infinity]]){
  assert.throws(()=>scaledCastleDamageAtlas(kind,width,height));
 }
});

class FakeContainer{
 list:FakeSprite[]=[];
 getIndex(sprite:FakeSprite){return this.list.indexOf(sprite);}
 addAt(sprite:FakeSprite,index:number){this.list.splice(index,0,sprite);sprite.parentContainer=this;return this;}
 remove(sprite:FakeSprite){const index=this.getIndex(sprite);if(index>=0)this.list.splice(index,1);}
}

class FakeSprite extends EventEmitter{
 scene:FakeScene|undefined;parentContainer?:FakeContainer;destroyed=false;visible=true;
 x:number;y:number;texture:string;frame:string;displayWidth=94;displayHeight=92;
 originX=.5;originY=.5;tintTopLeft=0xa6e8ff;tintTopRight=0xa6e8ff;tintBottomLeft=0xa6e8ff;tintBottomRight=0xa6e8ff;
 alpha=.65;rotation=.1;flipX=false;flipY=false;depth=0;name='';data=new Map<string,unknown>();
 playCalls:{key:string;startFrame:number}[]=[];
 anims={isPaused:false,currentAnim:{key:'ambient-flame'},pause:()=>{this.anims.isPaused=true;return this.anims;},resume:()=>{this.anims.isPaused=false;return this.anims;}};
 constructor(scene:FakeScene,x=100,y=200,texture='ambient-flame',frame='flame-0'){super();this.scene=scene;this.x=x;this.y=y;this.texture=texture;this.frame=frame;}
 setOrigin(x:number,y:number){this.originX=x;this.originY=y;return this;}
 setDisplaySize(width:number,height:number){this.displayWidth=width;this.displayHeight=height;return this;}
 setTint(topLeft:number,topRight:number,bottomLeft:number,bottomRight:number){this.tintTopLeft=topLeft;this.tintTopRight=topRight;this.tintBottomLeft=bottomLeft;this.tintBottomRight=bottomRight;return this;}
 setAlpha(value:number){this.alpha=value;return this;}
 setRotation(value:number){this.rotation=value;return this;}
 setFlip(x:boolean,y:boolean){this.flipX=x;this.flipY=y;return this;}
 setDepth(value:number){this.depth=value;return this;}
 setName(value:string){this.name=value;return this;}
 setData(key:string,value:unknown){this.data.set(key,value);return this;}
 setVisible(value:boolean){this.visible=value;return this;}
 setFrame(value:string){this.frame=value;return this;}
 play(value:{key:string;startFrame:number}){this.playCalls.push(value);this.anims.currentAnim={key:value.key};return this;}
 advance(frame:number){this.frame=(this.playCalls.at(-1)?.key==='castle-hit'?'hit-':'collapse-')+frame;this.emit('animationupdate',{}, {index:frame+1});}
 finish(){this.emit('animationcomplete');}
 destroy(){if(this.destroyed)return;this.destroyed=true;this.scene=undefined;this.parentContainer?.remove(this);this.removeAllListeners();}
}

class FakeScene{
 sprites:FakeSprite[]=[];
 textures={exists:()=>true};
 add={sprite:(x:number,y:number,texture:string,frame:string)=>{const sprite=new FakeSprite(this,x,y,texture,frame);this.sprites.push(sprite);return sprite;}};
 base(){const sprite=new FakeSprite(this),parent=new FakeContainer();parent.addAt(sprite,0);return sprite;}
 effect(){const sprite=this.sprites.at(-1);assert.ok(sprite,'expected a generated effect');return sprite;}
}

function fixture(reduced=false){const scene=new FakeScene(),effects=new CastleDamageEffects(scene as unknown as Phaser.Scene,reduced),base=scene.base();return{scene,effects,base,bind:(key='castle',health=9)=>effects.bind(key,base as unknown as Phaser.GameObjects.Sprite,health)};}

test('health loss plays a hit and restores the ambient castle after completion',()=>{
 const {scene,effects,base,bind}=fixture();bind();effects.sync('castle',9);assert.equal(scene.sprites.length,0);
 effects.sync('castle',8);const hit=scene.effect();
 assert.equal(hit.data.get('castlePhase'),'hit');assert.equal(base.visible,false);
 assert.equal(hit.alpha,base.alpha);assert.equal(hit.tintTopLeft,base.tintTopLeft);
 assert.equal(hit.parentContainer,base.parentContainer);assert.ok(hit.parentContainer!.getIndex(hit)>hit.parentContainer!.getIndex(base));
 assert.equal(base.anims.currentAnim.key,'ambient-flame','the ambient animation phase remains separate');
 effects.sync('castle',8);assert.equal(scene.sprites.length,1,'identical health does not replay a hit');
 hit.finish();assert.equal(base.visible,true);assert.equal(hit.destroyed,true);assert.equal(effects.isDestroying(),false);
 assert.equal(base.x,100);assert.equal(base.y,200);assert.equal(base.displayWidth,94);assert.equal(base.displayHeight,92);
 effects.sync('castle',7);assert.equal(scene.sprites.length,2,'a later health loss gets fresh feedback');effects.destroy();
});

test('zero health supersedes a hit, never repeats the collapse, and persists as ruins',async()=>{
 const {scene,effects,base,bind}=fixture();bind();effects.sync('castle',8);const hit=scene.effect(),staleCompletion=hit.listeners('animationcomplete')[0];
 effects.sync('castle',0);const collapse=scene.effect();
 assert.equal(hit.destroyed,true);assert.equal(collapse.data.get('castlePhase'),'collapse');assert.equal(effects.isDestroying('castle'),true);
 effects.sync('castle',0);assert.equal(scene.sprites.length,2,'zero-health refresh is not another destruction');
 staleCompletion?.();assert.equal(effects.isDestroying(),true,'an obsolete hit callback cannot dismiss a newer collapse');
 let settled=false;const waiting=effects.whenSettled().then(()=>{settled=true;});await Promise.resolve();assert.equal(settled,false);
 collapse.finish();await waiting;
 assert.equal(effects.isDestroying(),false);assert.equal(collapse.data.get('castlePhase'),'ruin');assert.equal(collapse.frame,'collapse-15');assert.equal(base.visible,false);
 effects.sync('castle',0);assert.equal(scene.sprites.length,2,'ruins remain without replaying destruction');effects.destroy();
});

test('settled waits for both castles, while an initial zero-health snapshot starts as ruins',async()=>{
 const {scene,effects,base,bind}=fixture();bind('left');const other=scene.base();effects.bind('right',other as unknown as Phaser.GameObjects.Sprite,9);
 effects.sync('left',0);const left=scene.effect();effects.sync('right',0);const right=scene.effect();
 let settled=false;const waiting=effects.whenSettled().then(()=>{settled=true;});left.finish();await Promise.resolve();assert.equal(settled,false);
 right.finish();await waiting;assert.equal(settled,true);assert.equal(base.visible,false);assert.equal(other.visible,false);
 const initial=fixture();initial.bind('reconnected',0);const ruin=initial.scene.effect();
 assert.equal(ruin.data.get('castlePhase'),'ruin');assert.equal(ruin.frame,'collapse-15');assert.equal(ruin.playCalls.length,0,'reconnection does not recreate an old collapse');
 assert.equal(initial.effects.isDestroying(),false);await initial.effects.whenSettled();initial.effects.destroy();effects.destroy();
});

test('redrawing a castle keeps the current hit or collapse frame and pending result',async()=>{
 const {scene,effects,bind}=fixture();bind();effects.sync('castle',8);const hit=scene.effect();hit.advance(6);
 const replacement=scene.base();effects.bind('castle',replacement as unknown as Phaser.GameObjects.Sprite,8);const continuedHit=scene.effect();
 assert.equal(hit.destroyed,true);assert.equal(continuedHit.playCalls.at(-1)?.startFrame,6);assert.equal(continuedHit.data.get('castlePhase'),'hit');
 effects.sync('castle',0);const collapse=scene.effect();collapse.advance(9);
 let settled=false;const waiting=effects.whenSettled().then(()=>{settled=true;});
 const resized=scene.base();effects.bind('castle',resized as unknown as Phaser.GameObjects.Sprite,0);const continuedCollapse=scene.effect();
 assert.equal(collapse.destroyed,true);assert.equal(continuedCollapse.playCalls.at(-1)?.startFrame,9);await Promise.resolve();assert.equal(settled,false);
 continuedCollapse.finish();await waiting;
 const after=scene.base();effects.bind('castle',after as unknown as Phaser.GameObjects.Sprite,0);const ruin=scene.effect();
 assert.equal(ruin.frame,'collapse-15');assert.equal(ruin.playCalls.length,0);assert.equal(after.visible,false);effects.destroy();
});

test('clear settles destruction, restores the base, and allows a fresh room baseline',async()=>{
 const {scene,effects,base,bind}=fixture();bind();effects.sync('castle',0);const collapse=scene.effect(),waiting=effects.whenSettled();
 effects.clear();await waiting;assert.equal(collapse.destroyed,true);assert.equal(base.visible,true);assert.equal(effects.isDestroying(),false);
 bind();effects.sync('castle',8);assert.equal(scene.effect().data.get('castlePhase'),'hit');
 effects.destroy();const count=scene.sprites.length;bind();effects.sync('castle',0);assert.equal(scene.sprites.length,count,'disposed effects cannot restart');await effects.whenSettled();
});

test('pause applies to replacement effects and resume allows the animation to continue',()=>{
 const {scene,effects,bind}=fixture();bind();effects.setPaused(true);effects.sync('castle',8);const hit=scene.effect();assert.equal(hit.anims.isPaused,true);
 hit.advance(4);effects.bind('castle',scene.base() as unknown as Phaser.GameObjects.Sprite,8);const replacement=scene.effect();assert.equal(replacement.anims.isPaused,true);
 effects.setPaused(false);assert.equal(replacement.anims.isPaused,false);assert.equal(replacement.playCalls.at(-1)?.startFrame,4);
 effects.setPaused(true);effects.clear();bind();effects.sync('castle',8);assert.equal(scene.effect().anims.isPaused,false,'clear removes the previous room pause');effects.destroy();
});

test('reduced motion skips shaking and shows the destroyed castle immediately',async()=>{
 const {scene,effects,base,bind}=fixture(true);bind();effects.sync('castle',8);assert.equal(scene.sprites.length,0);assert.equal(base.visible,true);
 effects.sync('castle',0);const ruin=scene.effect();assert.equal(ruin.data.get('castlePhase'),'ruin');assert.equal(ruin.playCalls.length,0);assert.equal(effects.isDestroying(),false);assert.equal(base.visible,false);
 await effects.whenSettled();effects.clear();assert.equal(base.visible,true);effects.destroy();
});
