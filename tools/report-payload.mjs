import {readFile,readdir,writeFile} from 'node:fs/promises';
import {join,extname,resolve} from 'node:path';
import {brotliCompressSync,constants} from 'node:zlib';

// Uncompressed deployment bytes and a reproducible transfer-size estimate.
// Vercel negotiates compression; this estimate is not a measured network bill.
const output=process.argv[2],groups={},files=[];
async function visit(directory){
 for(const entry of await readdir(directory,{withFileTypes:true})){
  const path=join(directory,entry.name);if(entry.isDirectory()){await visit(path);continue;}
  const data=await readFile(path),extension=extname(path);
  const group={'.webp':'images','.mp3':'audio','.woff2':'fonts','.js':'javascript','.css':'styles','.html':'html'}[extension]??'credits';
  const transferBytes=/\.(js|css|html|json|txt)$/.test(path)?brotliCompressSync(data,{params:{[constants.BROTLI_PARAM_QUALITY]:6}}).length:data.length;
  groups[group]??={files:0,bytes:0,estimatedTransferBytes:0};groups[group].files++;groups[group].bytes+=data.length;groups[group].estimatedTransferBytes+=transferBytes;
  files.push({path:path.replaceAll('\\','/').replace(/^dist\//,''),bytes:data.length,estimatedTransferBytes:transferBytes});
 }
}
await visit('dist');
const report={generatedAt:new Date().toISOString(),groups,total:{files:files.length,bytes:files.reduce((s,f)=>s+f.bytes,0),estimatedTransferBytes:files.reduce((s,f)=>s+f.estimatedTransferBytes,0)},files:files.sort((a,b)=>b.bytes-a.bytes)};
if(output)await writeFile(resolve(output),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({groups:report.groups,total:report.total},null,2));
