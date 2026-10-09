import {pageRequest,openAuthorizedPage} from './page-access';
import {reloadOnCachedRestore} from './page-lifecycle';
reloadOnCachedRestore(window,()=>location.reload());
const request=pageRequest(location.search);
async function withWorkbook(load:()=>Promise<unknown>){
 const {syncWorkbook}=await import('./worksheet-store');
 await syncWorkbook();
 return load();
}
// Keep each entry's CSS preloads with its import. A conditional chain can be
// folded into one preload call with only the final branch's styles in Vite.
const pages=new Map<string,()=>Promise<unknown>>([
 ['duel',()=>withWorkbook(()=>import('./multiplayer/controller'))],
 ['adventure',()=>import('./controller')],
 ['worksheet',()=>withWorkbook(()=>import('./worksheet-controller'))],
 ['title',()=>import('./title')],
]);
void openAuthorizedPage(request,{
 session:async()=>(await import('./account-gate')).auth,
 login:async mode=>(await import('./account-gate')).requestAccountLogin(mode),
 load:request=>pages.get(request.mode)!(),
}).catch(()=>{
 const app=document.querySelector('#app')!;
 const message=document.createElement('p');message.setAttribute('role','alert');
 message.textContent='화면을 불러오지 못했어요. 브라우저 저장 공간과 연결 상태를 확인한 뒤 다시 시도해 주세요.';
 const retry=document.createElement('button');retry.textContent='다시 시도';retry.onclick=()=>location.reload();
 const home=document.createElement('a');home.href='/?mode=title';home.textContent='시작 화면으로';
 app.replaceChildren(message,retry,home);
});
