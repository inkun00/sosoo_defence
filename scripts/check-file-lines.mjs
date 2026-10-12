import {readFile,readdir} from 'node:fs/promises';
import {dirname,extname,relative,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(process.argv[2]??resolve(dirname(fileURLToPath(import.meta.url)),'..'));
const maximumLines=1000;
const splitWarningLines=800;
const codeExtensions=new Set([
 '.ts','.tsx','.js','.jsx','.mjs','.cjs','.css','.scss','.sass','.less',
 '.py','.html','.htm','.vue','.svelte','.sh','.ps1','.cmd','.bat',
]);
const ignoredDirectories=new Set(['node_modules','dist','.git','test-results']);
const ignoredPaths=new Set(['functions/lib']);
// No current source file exceeds 1,000 lines. Future legacy exceptions must
// record a reviewed, fixed ceiling here rather than silently accepting growth.
const frozenLegacyLimits=new Map();
const failures=[];
const warnings=[];
let checked=0;
let generated=0;

function physicalLines(content){
 if(content.length===0)return 0;
 const endings=content.match(/\r\n|\n|\r/g)?.length??0;
 return endings+(/[\r\n]$/.test(content)?0:1);
}

async function inspect(directory){
 const entries=await readdir(directory,{withFileTypes:true});
 entries.sort((left,right)=>left.name.localeCompare(right.name));
 for(const entry of entries){
  const path=resolve(directory,entry.name);
  const name=relative(root,path).replaceAll('\\','/');
  if(entry.isDirectory()){
   if(!ignoredDirectories.has(entry.name)&&!ignoredPaths.has(name))await inspect(path);
   continue;
  }
  // Do not follow symlinks outside the workspace or traverse linked checkouts.
  if(!entry.isFile()||!codeExtensions.has(extname(entry.name).toLowerCase()))continue;
  if(entry.name.includes('.generated.')){
   generated++;
   continue;
  }
  const lines=physicalLines(await readFile(path,'utf8'));
  const limit=frozenLegacyLimits.get(name)??maximumLines;
  checked++;
  if(lines>limit)failures.push(`${name}: ${lines} lines exceeds ${limit}`);
  else if(lines>=splitWarningLines)warnings.push(`${name}: ${lines} lines; split by responsibility before adding functionality`);
 }
}

try{
 await inspect(root);
 for(const warning of warnings)console.warn(`WARN ${warning}`);
 for(const failure of failures)console.error(`FAIL ${failure}`);
 if(failures.length){
  console.error(`File line check failed: ${failures.length} file(s) exceed their ceiling.`);
  process.exitCode=1;
 }else{
  console.log(`PASS file lines: ${checked} code files, ${generated} generated exceptions, ${maximumLines}-line ceiling.`);
 }
}catch(error){
 console.error(`File line check failed: ${error.message}`);
 process.exitCode=1;
}
