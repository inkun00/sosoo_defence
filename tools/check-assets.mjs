import sharp from 'sharp';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {imageProfile,transformedImage} from './image-profiles.mjs';
const manifest=JSON.parse(await readFile('src/art-manifest.json','utf8'));
let count=0,bytes=0;
for(const [name,art]of Object.entries(manifest)){
 const sourcePath='public/assets/dungeon/'+name+'.png',source=sharp(sourcePath),before=await source.metadata();
 const buffer=await readFile('web-public'+art.url),image=sharp(buffer),after=await image.metadata();
 assert.equal(after.width,art.width);assert.equal(after.height,art.height);assert.equal(after.hasAlpha,before.hasAlpha);
 assert.equal(buffer.length,art.bytes,name+' file size');
 assert.ok(art.url.includes(createHash('sha256').update(buffer).digest('hex').slice(0,12)),name+' content hash');
 if(before.hasAlpha){const expected=await transformedImage(sharp,sourcePath,imageProfile(name)).ensureAlpha().extractChannel('alpha').raw().toBuffer();const actual=await image.ensureAlpha().extractChannel('alpha').raw().toBuffer();assert.deepEqual(actual,expected,name+' transparent edges');}
 bytes+=art.bytes;
 count++;
}
const sourceNames=(await readdir('public/assets/dungeon')).filter(n=>n.endsWith('.png')&&!/^tower-(basic|slow|stun|range)\.png$/.test(n)).map(n=>n.slice(0,-4));
assert.deepEqual(Object.keys(manifest).sort(),sourceNames.sort(),'every active image optimized');
const deployed=(await readdir('dist/assets/dungeon')).filter(n=>/\.(png|jpe?g|webp)$/i.test(n));
assert.deepEqual(deployed.sort(),Object.values(manifest).map(art=>art.url.split('/').at(-1)).sort(),'only current optimized images deployed');
assert.ok(bytes<7*1048576,'image payload must remain below 7 MiB');
const licenses=await readdir('dist/licenses');
for(const required of ['hahmlet-OFL.txt','Phaser-MIT.txt','tower-audio-LICENSES.txt','tower-audio-v1.json'])assert.ok(licenses.includes(required),'missing public attribution: '+required);
assert.ok(!(await readdir('dist/assets/dungeon')).some(name=>/prompt/i.test(name)),'generation prompts must stay out of game downloads');
assert.ok(!licenses.some(name=>/prompt/i.test(name)),'license folder must not publish generation prompts');
console.log(`PASS ${count} compressed images (${(bytes/1048576).toFixed(2)} MiB): dimensions, lossless alpha, content hashes, full coverage, and no stale/source images or generation prompts deployed. Required credits preserved.`);
