import test from 'node:test';
import assert from 'node:assert/strict';
import atlas from '../src/ambient-atlas.json';
import {scaledAmbientAtlas,type AmbientKind} from '../src/ambient-props';

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
