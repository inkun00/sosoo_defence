import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {fileURLToPath} from 'node:url';
import type Phaser from 'phaser';
import manifest from '../src/art-manifest.json';
import {PROJECTILE_SHEETS,projectileProfile,type ProjectileTypeId} from '../src/projectile-profiles';
import {projectileFrameOrigin,projectileRowCrop,registerProjectileFrames,type ProjectileFrameCrop} from '../src/projectile-frames';

async function sheets(){
 return Promise.all(PROJECTILE_SHEETS.map(async spec=>{
  const art=manifest[spec.atlas as keyof typeof manifest];
  const {data,info}=await sharp(fileURLToPath(new URL('../web-public'+art.url,import.meta.url))).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  return {spec,width:info.width,height:info.height,data};
 }));
}

test('all 72 optimized projectile frames keep every strong pixel within their shared row crop',async()=>{
 let frames=0;
 for(const sheet of await sheets()){
  const {width,height,data}=sheet,cellWidth=width/6,cellHeight=height/4;
  for(const [row,id]of sheet.spec.rows.entries()){
   const crop=projectileRowCrop(data,width,height,row);
   assert.ok(crop.x>=0&&crop.y>=0&&crop.x+crop.width<=cellWidth&&crop.y+crop.height<=cellHeight,id+' remains inside its cell');
   assert.ok(crop.height<cellHeight*.8,id+' excludes large empty margins');
   const core=projectileProfile(id).core;
   assert.ok(core.x*cellWidth>=crop.x&&core.x*cellWidth<=crop.x+crop.width&&core.y*cellHeight>=crop.y&&core.y*cellHeight<=crop.y+crop.height,id+' contains its illustrated core');
   for(let column=0;column<6;column++){
    let strong=0;
    for(let y=0;y<cellHeight;y++)for(let x=0;x<cellWidth;x++){
     if(data[((row*cellHeight+y)*width+column*cellWidth+x)*4+3]<128)continue;
     strong++;assert.ok(x>=crop.x&&x<crop.x+crop.width&&y>=crop.y&&y<crop.y+crop.height,id+'-'+column+' keeps strong alpha');
    }
    assert.ok(strong>0,id+'-'+column+' has a visible illustration');frames++;
   }
  }
 }
 assert.equal(frames,72);
});

test('row crop ignores transparent compression noise, unions different poses and guards cell edges',()=>{
 const width=120,height=80,pixels=new Uint8ClampedArray(width*height*4);
 const alpha=(column:number,x:number,y:number,value:number)=>{pixels[((20+y)*width+column*20+x)*4+3]=value;};
 alpha(0,0,0,4);alpha(2,19,19,8);alpha(0,6,7,255);alpha(5,10,12,255);
 assert.deepEqual(projectileRowCrop(pixels,width,height,1),{x:4,y:5,width:9,height:10});
 alpha(1,0,0,128);alpha(4,19,19,128);
 assert.deepEqual(projectileRowCrop(pixels,width,height,1),{x:0,y:0,width:20,height:20});
 assert.deepEqual(projectileRowCrop(pixels,width,height,0),{x:0,y:0,width:20,height:20},'empty rows safely retain the full cell');
 for(const [w,h,row]of [[0,80,0],[120,0,0],[121,80,0],[120,81,0],[120,80,4]])assert.throws(()=>projectileRowCrop(pixels,w,h,row));
});

class Texture{
 frames=new Map<string,ProjectileFrameCrop>();
 constructor(readonly source:{width:number;height:number;data:Uint8ClampedArray|Buffer}){}
 getSourceImage(){return this.source;}
 has(name:string){return this.frames.has(name);}
 add(name:string,_source:number,x:number,y:number,width:number,height:number){this.frames.set(name,{x,y,width,height});return {};}
}

function sceneFor(textures:Map<string,Texture>){
 return {textures:{exists:(key:string)=>textures.has(key),get:(key:string)=>textures.get(key)}} as unknown as Phaser.Scene;
}

function withCanvas<T>(run:(calls:{probes:number;reads:number})=>T,fail=false):T{
 const prior=Object.getOwnPropertyDescriptor(globalThis,'document'),calls={probes:0,reads:0};
 Object.defineProperty(globalThis,'document',{configurable:true,value:{createElement(){
  calls.probes++;let source:Texture['source'];
  return {width:0,height:0,getContext(){return {drawImage(value:Texture['source']){source=value;},getImageData(){calls.reads++;if(fail)throw Error('Blocked readback');return {data:source.data};}};}};
 }}});
 try{return run(calls);}finally{if(prior)Object.defineProperty(globalThis,'document',prior);else Reflect.deleteProperty(globalThis,'document');}
}

test('registration reads each source once, preserves row alignment and anchors rotated cores',async()=>{
 const loaded=await sheets(),textures=new Map(loaded.map(sheet=>[sheet.spec.key,new Texture(sheet)])),scene=sceneFor(textures);
 withCanvas(calls=>{
  registerProjectileFrames(scene);registerProjectileFrames(scene);
  assert.deepEqual(calls,{probes:3,reads:3},'cached textures are not probed or registered twice');
  for(const sheet of loaded){
   const texture=textures.get(sheet.spec.key)!;assert.equal(texture.frames.size,24);
   for(const [row,id]of sheet.spec.rows.entries()){
    const crop=projectileRowCrop(sheet.data,sheet.width,sheet.height,row),profile=projectileProfile(id),origin=projectileFrameOrigin(scene,profile);
    for(let column=0;column<6;column++)assert.deepEqual(texture.frames.get(id+'-'+column),{x:column*sheet.width/6+crop.x,y:row*sheet.height/4+crop.y,width:crop.width,height:crop.height});
    if(profile.beam){assert.deepEqual(origin,{x:.5,y:.5},'beam is centered between its endpoints');continue;}
    assert.ok(Math.abs(crop.x+origin.x*crop.width-profile.core.x*sheet.width/6)<1e-9,id+' preserves horizontal core coordinate');
    assert.ok(Math.abs(crop.y+origin.y*crop.height-profile.core.y*sheet.height/4)<1e-9,id+' preserves vertical core coordinate');
    for(const angle of [0,.5,Math.PI]){
     const coreX=(profile.core.x*sheet.width/6-crop.x-origin.x*crop.width)*2,coreY=(profile.core.y*sheet.height/4-crop.y-origin.y*crop.height)*2;
     assert.ok(Math.abs(coreX*Math.cos(angle)-coreY*Math.sin(angle))<1e-9&&Math.abs(coreX*Math.sin(angle)+coreY*Math.cos(angle))<1e-9,id+' rotates around the same illustrated core');
    }
   }
  }
  textures.set(loaded[0].spec.key,new Texture(loaded[0]));registerProjectileFrames(scene);
  assert.deepEqual(calls,{probes:4,reads:4},'a reloaded texture owns a fresh crop cache');
 });
});

test('unreadable canvas and unregistered textures keep safe full-cell frames and original origins',()=>{
 const source={width:768,height:512,data:new Uint8ClampedArray(768*512*4)};
 const textures=new Map(PROJECTILE_SHEETS.map(sheet=>[sheet.key,new Texture(source)])),scene=sceneFor(textures);
 for(const id of ['basic','needle','catapult','sniper'] as ProjectileTypeId[])assert.deepEqual(projectileFrameOrigin(scene,projectileProfile(id)),projectileProfile(id).core);
 withCanvas(()=>{
  assert.doesNotThrow(()=>registerProjectileFrames(scene));
  for(const sheet of PROJECTILE_SHEETS)for(const [row,id]of sheet.rows.entries()){
   const texture=textures.get(sheet.key)!;
   for(let column=0;column<6;column++)assert.deepEqual(texture.frames.get(id+'-'+column),{x:column*128,y:row*128,width:128,height:128});
   assert.deepEqual(projectileFrameOrigin(scene,projectileProfile(id)),projectileProfile(id).core);
  }
 },true);
 assert.deepEqual(projectileFrameOrigin(sceneFor(new Map()),projectileProfile('rune')),projectileProfile('rune').core);
});

test('existing full-cell frames and nonuniform sheet sizes retain their original alignment',()=>{
 const source={width:768,height:512,data:new Uint8ClampedArray(768*512*4)};
 source.data[(61*768+96)*4+3]=255;
 const texture=new Texture(source);texture.add('basic-0',0,0,0,128,128);
 const scene=sceneFor(new Map([[PROJECTILE_SHEETS[0].key,texture]]));
 withCanvas(()=>registerProjectileFrames(scene));
 for(let column=0;column<6;column++)assert.deepEqual(texture.frames.get('basic-'+column),{x:column*128,y:0,width:128,height:128});
 assert.deepEqual(projectileFrameOrigin(scene,projectileProfile('basic')),projectileProfile('basic').core);

 const irregular=new Texture({width:770,height:513,data:new Uint8ClampedArray(770*513*4)}),irregularScene=sceneFor(new Map([[PROJECTILE_SHEETS[0].key,irregular]]));
 withCanvas(calls=>{registerProjectileFrames(irregularScene);assert.equal(calls.reads,0,'nonuniform cells skip pixel trimming');});
 for(const [row,id]of PROJECTILE_SHEETS[0].rows.entries())for(let column=0;column<6;column++){
  const frame=irregular.frames.get(id+'-'+column)!;
  assert.equal(frame.x,Math.round(column*770/6));assert.equal(frame.x+frame.width,Math.round((column+1)*770/6));
  assert.equal(frame.y,Math.round(row*513/4));assert.equal(frame.y+frame.height,Math.round((row+1)*513/4));
 }
 assert.deepEqual(projectileFrameOrigin(irregularScene,projectileProfile('needle')),projectileProfile('needle').core);
});
