import sharp from 'sharp';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
const manifest=JSON.parse(await readFile('src/art-manifest.json','utf8'));
let count=0;
for(const [name,art]of Object.entries(manifest)){
 const source=sharp('public/assets/dungeon/'+name+'.png'),before=await source.metadata();
 const image=sharp('web-public'+art.url),after=await image.metadata();
 assert.equal(after.width,art.width);assert.equal(after.height,art.height);assert.equal(after.hasAlpha,before.hasAlpha);
 if(before.hasAlpha){const expected=await source.resize({width:art.width,withoutEnlargement:true}).ensureAlpha().extractChannel('alpha').raw().toBuffer();const actual=await image.ensureAlpha().extractChannel('alpha').raw().toBuffer();assert.deepEqual(actual,expected,name+' transparent edges');}
 count++;
}
assert.equal((await readdir('dist/assets/dungeon')).filter(n=>n.endsWith('.png')).length,0);
console.log(`PASS ${count} compressed images: dimensions, transparency, and no deployed source PNGs.`);
