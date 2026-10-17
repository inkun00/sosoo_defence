import test from 'node:test';
import assert from 'node:assert/strict';

// These checks cover the build-time WebP policy without loading the game or
// generating an image. All atlas grids keep their full alpha-padded canvas.
const profileModuleURL=new URL('../tools/image-profiles.mjs',import.meta.url).href;

test('secret siege atlases preserve padding and use lossless alpha at the measured width',async()=>{
 const {imageProfile}=await import(profileModuleURL);
 for(const name of ['siege-human-army-walk-v1','siege-human-army-attack-v1','siege-corrupted-fortifications-v1','siege-corrupted-citadel-collapse-v1']){
  const profile=imageProfile(name);
  assert.equal(profile.width,768);assert.equal(profile.alphaQuality,100);assert.equal(profile.trim,undefined);
  assert.equal(profile.quality,name==='siege-corrupted-citadel-collapse-v1'?84:80);
 }
});

test('human v2 atlases retain all sixteen cells and transparent weapon margins',async()=>{
 const {imageProfile}=await import(profileModuleURL);
 for(const role of ['guard','striker','scout']){
  const profile=imageProfile(`siege-human-${role}-v2`);
  assert.equal(profile.width,1024);assert.equal(profile.quality,84);
  assert.equal(profile.alphaQuality,100);assert.equal(profile.trim,undefined);
 }
});
