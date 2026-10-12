import {build} from 'esbuild';
// Preserve identifiers for readable function names and production diagnostics.
await build({
 entryPoints:['src/index.ts'],outdir:'lib',bundle:true,platform:'node',
 target:'node22',format:'cjs',packages:'external',sourcemap:true,
 minifySyntax:true,minifyWhitespace:true,
});
