import {defineConfig} from 'vite';
import {fileURLToPath} from 'node:url';
import {phaserFlags,phaserOptimizerFlags,phaserChunking} from './tools/phaser-build';
const chunks=phaserChunking();
export default defineConfig({
 publicDir:'web-public',
 plugins:[phaserFlags,chunks.plugin],
 resolve:{alias:[{find:/^phaser$/,replacement:fileURLToPath(new URL('./tools/phaser-runtime.cjs',import.meta.url))}]},
 optimizeDeps:{entries:['index.html','tools/**/*.html'],include:['phaser'],esbuildOptions:{plugins:[phaserOptimizerFlags]}},
 build:{
  manifest:true,commonjsOptions:{include:[/node_modules/,/phaser-runtime\.cjs$/]},
  rollupOptions:{output:{onlyExplicitManualChunks:true,manualChunks:chunks.manualChunks}},
 },
});
