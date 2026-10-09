import {readFile} from 'node:fs/promises';
import type {Plugin} from 'vite';
import type {Plugin as EsbuildPlugin} from 'esbuild';
import type {ManualChunkMeta} from 'rollup';

// Phaser's official webpack builds replace `typeof FLAG` expressions rather
// than bare identifiers. Use the identical flags in Vite and its dev optimizer.
const flags = {WEBGL_RENDERER:true,CANVAS_RENDERER:true,FEATURE_SOUND:false,WEBGL_DEBUG:false,PLUGIN_CAMERA3D:false,PLUGIN_FBINSTANT:false};
export function compilePhaserFlags(code:string){
 return code.replace(/typeof (WEBGL_RENDERER|CANVAS_RENDERER|FEATURE_SOUND|WEBGL_DEBUG|PLUGIN_CAMERA3D|PLUGIN_FBINSTANT)\b/g,(_,flag:keyof typeof flags)=>String(flags[flag]));
}
export const phaserFlags:Plugin={
 name:'phaser-custom-build-flags',enforce:'pre',
 transform(code,id){if(id.replaceAll('\\','/').includes('/node_modules/phaser/src/'))return {code:compilePhaserFlags(code),map:null};},
};
export const phaserOptimizerFlags:EsbuildPlugin={
 name:'phaser-custom-build-flags',setup(build){
  build.onLoad({filter:/[\\/]phaser[\\/]src[\\/].*\.js$/},async({path})=>({contents:compilePhaserFlags(await readFile(path,'utf8')),loader:'js'}));
 },
};

/** Rendering plus its dependencies form a one-way boundary with the runtime.
 * Putting shared geometry/utils in the renderer keeps the two chunks acyclic.
 * No max-size slicing or raised Vite warning threshold is involved. */
export function phaserChunking(){
 let rendererModules:Set<string>|undefined;
 const isPhaser=(id:string)=>id.replaceAll('\\','/').includes('/node_modules/phaser/');
 return {
  plugin:{name:'phaser-source-chunks',buildStart(){rendererModules=undefined;}} as Plugin,
  manualChunks(id:string,{getModuleIds,getModuleInfo}:ManualChunkMeta){
   if(!isPhaser(id))return;
   if(!rendererModules){
    rendererModules=new Set();
    const visit=(module:string)=>{
     if(rendererModules!.has(module)||!isPhaser(module))return;
     rendererModules!.add(module);
     for(const dependency of getModuleInfo(module)?.importedIds??[])visit(dependency);
    };
    for(const module of getModuleIds())if(module.replaceAll('\\','/').includes('/node_modules/phaser/src/renderer/'))visit(module);
   }
   return rendererModules.has(id)?'phaser-renderer':'phaser-engine';
  },
 };
}
