import sharp from 'sharp';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {imageProfile,transformedImage} from './image-profiles.mjs';
const manifest=JSON.parse(await readFile('src/art-manifest.json','utf8'));
let count=0,bytes=0,coreBytes=0,collectionBytes=0,worksheetBytes=0,badgeBytes=0,siegeBytes=0;
for(const [name,art]of Object.entries(manifest)){
 const sourcePath='public/assets/dungeon/'+name+'.png',source=sharp(sourcePath),before=await source.metadata();
 const buffer=await readFile('web-public'+art.url),image=sharp(buffer),after=await image.metadata();
 assert.equal(after.width,art.width);assert.equal(after.height,art.height);assert.equal(after.hasAlpha,before.hasAlpha);
 if(name.startsWith('account-badge-level-')){assert.ok(before.hasAlpha,name+' transparent source');assert.equal(after.width,192,name+' icon width');}
 if(name.startsWith('siege-')){assert.ok(before.hasAlpha,name+' transparent source');assert.equal(after.width,768,name+' atlas width');}
 assert.equal(buffer.length,art.bytes,name+' file size');
 assert.ok(art.url.includes(createHash('sha256').update(buffer).digest('hex').slice(0,12)),name+' content hash');
 if(before.hasAlpha){const expected=await transformedImage(sharp,sourcePath,imageProfile(name)).ensureAlpha().extractChannel('alpha').raw().toBuffer();const actual=await image.ensureAlpha().extractChannel('alpha').raw().toBuffer();assert.deepEqual(actual,expected,name+' transparent edges');}
 bytes+=art.bytes;
 if(name.startsWith('siege-'))siegeBytes+=art.bytes;
 else if(name==='worksheet-heroes-v1')worksheetBytes+=art.bytes;
 else if(name.startsWith('account-badge-level-'))badgeBytes+=art.bytes;
 else if(/^(cpu-opponent-|hero-collection-|hero-effect-)/.test(name))collectionBytes+=art.bytes;
 else coreBytes+=art.bytes;
 count++;
}
const sourceNames=(await readdir('public/assets/dungeon')).filter(n=>n.endsWith('.png')&&!/^tower-(basic|slow|stun|range)\.png$/.test(n)).map(n=>n.slice(0,-4));
assert.deepEqual(Object.keys(manifest).sort(),sourceNames.sort(),'every active image optimized');
assert.deepEqual(Object.keys(manifest).filter(name=>name.startsWith('account-badge-level-')).sort(),Array.from({length:10},(_,i)=>'account-badge-level-'+(i+1)+'-v1').sort(),'all ten account level badges available');
assert.deepEqual(Object.keys(manifest).filter(name=>name.startsWith('siege-')).sort(),['siege-human-army-walk-v1','siege-human-army-attack-v1','siege-corrupted-fortifications-v1','siege-corrupted-citadel-collapse-v1'].sort(),'all four secret siege atlases available');
const deployed=(await readdir('dist/assets/dungeon')).filter(n=>/\.(png|jpe?g|webp)$/i.test(n));
assert.deepEqual(deployed.sort(),Object.values(manifest).map(art=>art.url.split('/').at(-1)).sort(),'only current optimized images deployed');
// Keep the original game budget; separately bound images loaded by optional
// collection screens and the unlocked secret siege instead of raising it.
assert.ok(coreBytes<7*1048576,'core image payload must remain below 7 MiB');
assert.ok(collectionBytes<2*1048576,'CPU and collection image payload must remain below 2 MiB');
assert.ok(worksheetBytes<256*1024,'worksheet hero atlas must remain below 256 KiB');
assert.ok(badgeBytes<256*1024,'ten account badges must remain below 256 KiB');
assert.ok(siegeBytes<768*1024,'four secret siege atlases must remain below 768 KiB');
const licenses=await readdir('dist/licenses');
for(const required of ['hahmlet-OFL.txt','Phaser-MIT.txt','tower-audio-LICENSES.txt','tower-audio-v1.json'])assert.ok(licenses.includes(required),'missing public attribution: '+required);
assert.ok(!(await readdir('dist/assets/dungeon')).some(name=>/prompt/i.test(name)),'generation prompts must stay out of game downloads');
assert.ok(!licenses.some(name=>/prompt/i.test(name)),'license folder must not publish generation prompts');
console.log(`PASS ${count} compressed images (${(bytes/1048576).toFixed(2)} MiB): dimensions, lossless alpha, content hashes, full coverage, and no stale/source images or generation prompts deployed. Required credits preserved.`);
