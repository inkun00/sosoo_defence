import test from 'node:test';
import assert from 'node:assert/strict';
import type Phaser from 'phaser';
import atlas from '../src/ambient-atlas.json';
import {AmbientProps,registerAmbientFrames,scaledAmbientAtlas,type AmbientKind} from '../src/ambient-props';
import {ambientEnergyPixel,ambientEnergyWeight} from '../src/ambient-animation';

test('original ambient texture keeps every measured crop and trim offset',()=>{
 for(const kind of Object.keys(atlas) as AmbientKind[]){
  const spec=atlas[kind];
  assert.deepEqual(scaledAmbientAtlas(kind,spec.sourceWidth,spec.sourceHeight),spec);
 }
});

test('resized ambient crops and shared trim canvases contain all nine frames',()=>{
 const original=JSON.stringify(atlas);
 for(const kind of Object.keys(atlas) as AmbientKind[])for(const [width,height]of [[768,768],[960,960],[1024,1024],[768,960]]){
  const source=atlas[kind],scaled=scaledAmbientAtlas(kind,width,height);
  assert.equal(scaled.frames.length,9);
  assert.equal(scaled.canvasWidth,Math.round(source.canvasWidth*width/source.sourceWidth));
  assert.equal(scaled.canvasHeight,Math.round(source.canvasHeight*height/source.sourceHeight));
  scaled.frames.forEach((f,i)=>{
   assert.ok(Object.values(f).every(Number.isInteger),kind+' integer crop');
   assert.ok(f.width>0&&f.height>0,kind+' visible frame');
   assert.ok(f.x>=0&&f.y>=0&&f.x+f.width<=width&&f.y+f.height<=height,kind+' texture bounds');
   assert.ok(f.offsetX>=0&&f.offsetY>=0&&f.offsetX+f.width<=scaled.canvasWidth&&f.offsetY+f.height<=scaled.canvasHeight,kind+' trim canvas bounds');
   assert.ok(Math.abs(f.x-source.frames[i].x*width/source.sourceWidth)<=.5,kind+' crop placement');
   assert.ok(Math.abs(f.y-source.frames[i].y*height/source.sourceHeight)<=.5,kind+' crop placement');
  });
 }
 assert.equal(JSON.stringify(atlas),original,'source coordinates remain untouched');
});

test('ambient texture dimensions reject invalid sizes',()=>{
 for(const [width,height]of [[0,768],[768,-1],[1.5,768],[768,Infinity],[NaN,768]])assert.throws(()=>scaledAmbientAtlas('portal',width,height),/Invalid ambient texture dimensions/);
});

test('portal motion stays inside the opening and flame motion stops before the stone rim',()=>{
 for(const [x,y] of [[74,41],[132,250],[250,247],[201,125],[201,360]])assert.equal(ambientEnergyPixel('portal',x,y),false);
 assert.equal(ambientEnergyWeight('portal',201,247),1);assert.ok(ambientEnergyWeight('portal',238,247)>0&&ambientEnergyWeight('portal',238,247)<1);
 // The earliest stone rim across all nine measured fire poses starts at 147.
 for(const y of [145,147,173,250,406])for(const x of [125,174,210,250,295])assert.equal(ambientEnergyPixel('flame',x,y),false);
 assert.equal(ambientEnergyWeight('flame',210,120),1);assert.ok(ambientEnergyWeight('flame',210,141)>0&&ambientEnergyWeight('flame',210,141)<1);
});

test('canvas failures keep portal and flame still even with stale animations',()=>{
 for(const partiallyCreated of [false,true]){
  const textures=new Set(Object.values(atlas).map(spec=>'dungeon-'+spec.texture));
  const animations=new Set(['ambient-portal','ambient-flame']),played:string[]=[];
  const source={getSourceImage:()=>({width:768,height:768}),has:()=>false,add:()=>({setTrim(){return this;}})};
  const scene={
   textures:{get:()=>source,exists:(key:string)=>textures.has(key),remove:(key:string)=>textures.delete(key),
    createCanvas:(key:string)=>{if(partiallyCreated)textures.add(key);throw Error('Canvas readback unavailable');}},
   anims:{exists:(key:string)=>animations.has(key),create:({key}:{key:string})=>animations.add(key)},
   add:{sprite:(_x:number,_y:number,texture:string,frame:string)=>({texture,frame,setDisplaySize(){return this;},setName(){return this;},
    play:({key}:{key:string})=>{played.push(key);}})}
  } as unknown as Phaser.Scene;
  assert.doesNotThrow(()=>registerAmbientFrames(scene));
  const props=new AmbientProps(scene,false),parent={add(){}} as unknown as Phaser.GameObjects.Container;
  for(const kind of ['portal','flame'] as const){
   const sprite=props.add(parent,kind,kind,0,0,96,104);
   assert.equal(sprite.texture,'dungeon-'+atlas[kind].texture);assert.equal(sprite.frame,kind+'-0');
   assert.equal(textures.has('dungeon-'+atlas[kind].texture+'-stationary'),false);
  }
  assert.deepEqual(played,[],'a failed canvas must not replay the whole-body source');
  props.add(parent,'torch','torch',0,0,40,60);assert.deepEqual(played,['ambient-torch']);
 }
});
