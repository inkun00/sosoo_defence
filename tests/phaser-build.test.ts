import test from 'node:test';
import assert from 'node:assert/strict';
import {compilePhaserFlags,phaserChunking} from '../tools/phaser-build';
import type {ManualChunkMeta} from 'rollup';

test('custom Phaser build keeps both renderers and removes optional engines/plugins',()=>{
 const source='if (typeof WEBGL_RENDERER && typeof CANVAS_RENDERER) render(); if (typeof FEATURE_SOUND) sound(); if (typeof WEBGL_DEBUG || typeof PLUGIN_FBINSTANT || typeof PLUGIN_CAMERA3D) optional(); typeof unknown;';
 assert.equal(compilePhaserFlags(source),'if (true && true) render(); if (false) sound(); if (false || false || false) optional(); typeof unknown;');
});

test('renderer chunk owns its shared dependencies so the engine cannot create a reverse chunk import',()=>{
 const renderer='/project/node_modules/phaser/src/renderer/WebGL.js',utility='/project/node_modules/phaser/src/utils/Math.js',engine='/project/node_modules/phaser/src/core/Game.js',app='/project/src/controller.ts';
 const modules=new Map([[renderer,[utility]],[utility,[]],[engine,[renderer,utility]],[app,[engine]]]);
 const metadata={getModuleIds:()=>modules.keys(),getModuleInfo:(id:string)=>({importedIds:modules.get(id)??[]})} as unknown as ManualChunkMeta;
 const chunks=phaserChunking();
 assert.equal(chunks.manualChunks(engine,metadata),'phaser-engine');
 assert.equal(chunks.manualChunks(renderer,metadata),'phaser-renderer');
 assert.equal(chunks.manualChunks(utility,metadata),'phaser-renderer');
 assert.equal(chunks.manualChunks(app,metadata),undefined);
});

test('watch builds recalculate renderer dependency closure when the source graph changes',()=>{
 const renderer='/project/node_modules/phaser/src/renderer/WebGL.js',dependency='/project/node_modules/phaser/src/geom/Rectangle.js';
 let graph=new Map([[renderer,[]],[dependency,[]]]);
 const metadata={getModuleIds:()=>graph.keys(),getModuleInfo:(id:string)=>({importedIds:graph.get(id)??[]})} as unknown as ManualChunkMeta;
 const chunks=phaserChunking();
 assert.equal(chunks.manualChunks(dependency,metadata),'phaser-engine');
 graph=new Map([[renderer,[dependency]],[dependency,[]]]);
 (chunks.plugin.buildStart as ()=>void)();
 assert.equal(chunks.manualChunks(dependency,metadata),'phaser-renderer');
});
