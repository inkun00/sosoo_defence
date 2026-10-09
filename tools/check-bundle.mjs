import assert from 'node:assert/strict';
import {readFile,readdir,stat} from 'node:fs/promises';
import {join} from 'node:path';
import {brotliCompressSync,constants} from 'node:zlib';

const directory=process.argv[2]??'dist';
const manifest=JSON.parse(await readFile(join(directory,'.vite/manifest.json'),'utf8'));
const total=async files=>{
 let bytes=0,estimatedBrotliBytes=0;
 for(const path of files){
  const data=await readFile(join(directory,path));bytes+=data.length;
  estimatedBrotliBytes+=brotliCompressSync(data,{params:{[constants.BROTLI_PARAM_QUALITY]:6}}).length;
 }
 return {files:files.length,bytes,estimatedBrotliBytes};
};
function dependencies(entries){
 const loaded=new Set();
 function visit(key){
  assert.ok(manifest[key],`Unknown bundle entry ${key}`);
  if(loaded.has(key))return;loaded.add(key);
  // Dynamic edges are intentionally ignored: the entry router selects one mode
  // and the PDF exporter is only imported when the user presses Save.
  for(const dependency of manifest[key].imports??[])visit(dependency);
 }
 entries.forEach(visit);return [...loaded];
}
const reports={};
for(const [mode,entry]of Object.entries({title:'src/title.ts',worksheet:'src/worksheet-controller.ts',adventure:'src/controller.ts',duel:'src/multiplayer/controller.ts'})){
 const keys=dependencies(['index.html',entry,...(mode==='worksheet'||mode==='duel'?['src/account-gate.ts']:[])]);
 const files=keys.map(key=>manifest[key].file).filter(file=>file.endsWith('.js'));
 if(mode==='title'||mode==='worksheet')assert.ok(!files.some(file=>/phaser-|tower-projectiles-/.test(file)),`${mode} must not fetch the game engine`);
 if(mode==='title')assert.ok(!files.some(file=>/cinematic-/.test(file)),'Story and ending font must wait until the user opens a cinematic');
 if(mode==='worksheet')assert.ok(!files.some(file=>/worksheet-pdf-/.test(file)),'PDF libraries must wait for Save');
 if(mode==='adventure'||mode==='duel')for(const chunk of ['phaser-engine','phaser-renderer'])assert.ok(keys.some(key=>manifest[key].name===chunk),`${mode} requires ${chunk}`);
 reports[mode]=await total(files);
}
const visited=new Set(),pending=new Set();
function acyclic(key){
 assert.ok(!pending.has(key),`Circular static bundle dependency at ${key}`);
 if(visited.has(key))return;pending.add(key);
 for(const dependency of manifest[key].imports??[])acyclic(dependency);
 pending.delete(key);visited.add(key);
}
Object.keys(manifest).forEach(acyclic);
for(const file of await readdir(join(directory,'assets'))){
 if(!file.endsWith('.js'))continue;
 const {size}=await stat(join(directory,'assets',file));
 assert.ok(size<=500000,`${file} exceeds the unchanged 500 kB bundle budget: ${size} bytes`);
}
const engineFiles=Object.values(manifest).filter(item=>/^phaser-/.test(item.name??'')).map(item=>item.file);
console.log(JSON.stringify({status:'PASS',checks:['500 kB per JavaScript chunk','acyclic static imports','no Phaser on title or worksheet','story deferred until opened','PDF deferred until Save'],phaser:await total(engineFiles),initialJavaScript:reports,compression:'Brotli quality 6 estimate; browser/server transfer can differ'},null,2));
