import {defineConfig} from 'vite';
import {fileURLToPath} from 'node:url';
export default defineConfig({
 publicDir:'web-public',
 // Wall collisions use the game's own simulation. The official Arcade build
 // keeps both renderers and every display object while omitting unused Matter.
 resolve:{alias:[{find:/^phaser$/,replacement:fileURLToPath(new URL('./node_modules/phaser/dist/phaser-arcade-physics.js',import.meta.url))}]},
});
