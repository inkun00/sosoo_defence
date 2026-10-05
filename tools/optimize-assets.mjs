import sharp from 'sharp';
import {readFile,writeFile,mkdir,readdir,copyFile,stat,unlink} from 'node:fs/promises';
import {resolve,dirname,basename,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),source=join(root,'public'),out=join(root,'web-public');
if(dirname(out)!==root||basename(out)!=='web-public')throw Error('Invalid generated asset directory');
const manifestPath=join(root,'src','art-manifest.json');let prior={};try{prior=JSON.parse(await readFile(manifestPath,'utf8'));}catch{}
await mkdir(join(out,'assets','dungeon'),{recursive:true});await mkdir(join(out,'licenses'),{recursive:true});
const manifest={},hash=b=>createHash('sha256').update(b).digest('hex');let original=0,optimized=0,converted=0;
for(const file of (await readdir(join(source,'assets','dungeon'))).sort()){
 if(!file.endsWith('.png')){await copyFile(join(source,'assets','dungeon',file),join(out,'assets','dungeon',file));continue;}
 // These four source sheets have been replaced by the rotating-head atlases.
 if(/^tower-(basic|slow|stun|range)\.png$/.test(file))continue;
 const name=file.slice(0,-4),input=await readFile(join(source,'assets','dungeon',file)),quality=name.startsWith('story-')||name==='title-castle-v1'?86:90;
 const width=name.startsWith('heroes-level-')?768:name==='menu-button-v1'?1200:undefined;
 const fingerprint=hash(Buffer.concat([input,Buffer.from(`webp-${quality}-width${width??'original'}-alpha100-effort5-${sharp.versions.webp}`)]));const old=prior[name];
 if(old?.sourceHash===fingerprint&&await stat(join(out,old.url)).catch(()=>null)){manifest[name]=old;original+=input.length;optimized+=old.bytes;continue;}
 const {data:buffer,info:meta}=await sharp(input).resize({width,withoutEnlargement:true}).webp({quality,alphaQuality:100,effort:5}).toBuffer({resolveWithObject:true});
 const url=`/assets/dungeon/${name}.${hash(buffer).slice(0,12)}.webp`;
 await writeFile(join(out,url),buffer);manifest[name]={url,sourceHash:fingerprint,width:meta.width,height:meta.height,sourceBytes:input.length,bytes:buffer.length};
 original+=input.length;optimized+=buffer.length;converted++;
}
const keep=new Set(Object.values(manifest).map(v=>basename(v.url)));
for(const file of await readdir(join(out,'assets','dungeon')))if(/\.[a-f0-9]{12}\.webp$/.test(file)&&!keep.has(file))await unlink(join(out,'assets','dungeon',file));
for(const file of await readdir(join(source,'licenses')))await copyFile(join(source,'licenses',file),join(out,'licenses',file));
await copyFile(join(source,'CREDITS.txt'),join(out,'CREDITS.txt'));
await writeFile(manifestPath,JSON.stringify(manifest,null,2)+'\n');
await writeFile(join(root,'src','art-urls.json'),JSON.stringify(Object.fromEntries(Object.entries(manifest).map(([name,art])=>[name,art.url])),null,2)+'\n');
console.log(`Images: ${(original/1048576).toFixed(2)} MiB → ${(optimized/1048576).toFixed(2)} MiB (${(100-optimized/original*100).toFixed(1)}% less), ${converted} regenerated. Source PNGs preserved.`);
