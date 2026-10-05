import {build} from 'esbuild';
await build({entryPoints:['src/index.ts'],outdir:'lib',bundle:true,platform:'node',target:'node22',format:'cjs',packages:'external',sourcemap:true});
