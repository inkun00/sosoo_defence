import sharp from 'sharp';
import {readFile,writeFile,mkdir,readdir,copyFile,stat,unlink} from 'node:fs/promises';
import {resolve,dirname,basename,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {imageProfile,transformedImage} from './image-profiles.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),source=join(root,'public'),out=join(root,'web-public');
if(dirname(out)!==root||basename(out)!=='web-public')throw Error('Invalid generated asset directory');
const manifestPath=join(root,'src','art-manifest.json');let prior={};try{prior=JSON.parse(await readFile(manifestPath,'utf8'));}catch{}
await mkdir(join(out,'assets','dungeon'),{recursive:true});await mkdir(join(out,'licenses'),{recursive:true});
const manifest={},hash=b=>createHash('sha256').update(b).digest('hex');let original=0,optimized=0,converted=0;
for(const file of (await readdir(join(source,'assets','dungeon'))).sort()){
 // Generation prompts are editable source material, not game downloads.
 if(!file.endsWith('.png'))continue;
 // These four source sheets have been replaced by the rotating-head atlases.
 if(/^tower-(basic|slow|stun|range)\.png$/.test(file))continue;
 const name=file.slice(0,-4),input=await readFile(join(source,'assets','dungeon',file)),profile=imageProfile(name);
 const fingerprint=hash(Buffer.concat([input,Buffer.from(JSON.stringify({format:'webp',...profile,sharp:sharp.versions.sharp,webp:sharp.versions.webp}))]));const old=prior[name];
 if(old?.sourceHash===fingerprint&&await stat(join(out,old.url)).catch(()=>null)){manifest[name]=old;original+=input.length;optimized+=old.bytes;continue;}
 const {data:buffer,info:meta}=await transformedImage(sharp,input,profile).webp(profile).toBuffer({resolveWithObject:true});
 const url=`/assets/dungeon/${name}.${hash(buffer).slice(0,12)}.webp`;
 await writeFile(join(out,url),buffer);manifest[name]={url,sourceHash:fingerprint,width:meta.width,height:meta.height,sourceBytes:input.length,bytes:buffer.length,encoding:profile};
 original+=input.length;optimized+=buffer.length;converted++;
}
const keep=new Set(Object.values(manifest).map(v=>basename(v.url)));
for(const file of await readdir(join(out,'assets','dungeon')))if(!keep.has(file)&&(/\.[a-f0-9]{12}\.webp$/.test(file)||/prompts.*\.json$/.test(file)))await unlink(join(out,'assets','dungeon',file));
// Audio is prepared once locally, not encoded or downloaded on every deploy.
// Only the twelve trimmed mono MP3s are published; original packs stay private.
const audioReport=JSON.parse(await readFile(join(source,'licenses','tower-audio-v1.json'),'utf8'));
const audioDirectory=join(out,'assets','audio','towers'),audioManifest={};
await mkdir(audioDirectory,{recursive:true});
for(const [id,sample] of Object.entries(audioReport.towers)){
 if(!/^[a-z]+\.mp3$/.test(sample.filename))throw Error('Invalid tower audio filename');
 const buffer=await readFile(join(source,'assets','audio','towers',sample.filename));
 if(hash(buffer)!==sample.sha256||buffer.length!==sample.bytes)throw Error(`Tower audio metadata mismatch: ${id}`);
 const url=`/assets/audio/towers/${id}.${hash(buffer).slice(0,12)}.mp3`;
 await writeFile(join(out,url),buffer);
 audioManifest[id]={url,bytes:buffer.length,duration:sample.duration};
}
const audioKeep=new Set(Object.values(audioManifest).map(v=>basename(v.url)));
for(const file of await readdir(audioDirectory))if(/\.[a-f0-9]{12}\.mp3$/.test(file)&&!audioKeep.has(file))await unlink(join(audioDirectory,file));
async function writeChanged(path,data){if(await readFile(path,'utf8').catch(()=>null)!==data)await writeFile(path,data);}
await writeChanged(join(root,'src','tower-audio-manifest.json'),JSON.stringify(audioManifest,null,2)+'\n');
const licenses=(await readdir(join(source,'licenses'))).filter(file=>!file.includes('prompt'));
for(const file of licenses)await copyFile(join(source,'licenses',file),join(out,'licenses',file));
for(const file of await readdir(join(out,'licenses')))if(file.includes('prompt')&&!licenses.includes(file))await unlink(join(out,'licenses',file));
await copyFile(join(source,'CREDITS.txt'),join(out,'CREDITS.txt'));
await writeChanged(manifestPath,JSON.stringify(manifest,null,2)+'\n');
await writeChanged(join(root,'src','art-urls.json'),JSON.stringify(Object.fromEntries(Object.entries(manifest).map(([name,art])=>[name,art.url])),null,2)+'\n');
console.log(`Images: ${(original/1048576).toFixed(2)} MiB → ${(optimized/1048576).toFixed(2)} MiB (${(100-optimized/original*100).toFixed(1)}% less), ${converted} regenerated. Source PNGs preserved.`);
console.log(`Tower audio: ${Object.keys(audioManifest).length} mono MP3s, ${(audioReport.totalBytes/1024).toFixed(1)} KiB; ${audioReport.reductionPercent}% smaller than equivalent stereo 48kHz WAVs.`);
