import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../dist');
const port=Number(process.env.PORT||4173);
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.txt':'text/plain; charset=utf-8','.ico':'image/x-icon','.woff2':'font/woff2','.mp3':'audio/mpeg'};
http.createServer((req,res)=>{
 let file;try{const url=new URL(req.url,'http://localhost');file=path.resolve(root,'.'+decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname));}catch{res.writeHead(400).end();return;}
 if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 fs.stat(file,(err,stat)=>{if(err||!stat.isFile()){res.writeHead(404).end('Not found');return;}
  const relative=path.relative(root,file).replaceAll('\\','/');
  const hashed=/^assets\/(?:.*\.[a-f0-9]{12}\.(?:webp|mp3)|[^/]+-[\w-]{8}\.(?:js|css|woff2))$/.test(relative);
  res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Content-Length':stat.size,'Cache-Control':hashed?'public, max-age=31536000, immutable':'no-cache'});fs.createReadStream(file).pipe(res);
 });
}).listen(port,'0.0.0.0',()=>console.log(`소수의 성: http://localhost:${port}\n이 창을 열어 두세요. 같은 네트워크의 태블릿에서도 PC 주소로 접속할 수 있습니다.`));
