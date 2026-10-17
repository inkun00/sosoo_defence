import {pageRequest,openAuthorizedPage,AccountConnectionTimeout} from './page-access';
import {reloadOnCachedRestore} from './page-lifecycle';
import {navigateWithMotion} from './game-motion';
reloadOnCachedRestore(window,()=>location.reload());
const request=pageRequest(location.search);
// Keep native new-tab/modified clicks, external links, and downloads intact.
document.addEventListener('click',event=>{
 if(event.defaultPrevented||event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
 const link=(event.target as Element)?.closest<HTMLAnchorElement>('a[href]');
 if(!link||link.target==='_blank'||link.hasAttribute('download'))return;
 const url=new URL(link.href),mode=url.searchParams.get('mode');
 if(url.origin===location.origin&&url.pathname===location.pathname&&['title','adventure','tutorial','duel','worksheet','siege'].includes(mode??'')){
  event.preventDefault();navigateWithMotion(url.href);
 }
});
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
 ['tutorial',()=>import('./controller')],
 ['siege',()=>import('./secret-siege-controller')],
 ['worksheet',()=>withWorkbook(()=>import('./worksheet-controller'))],
 ['title',()=>import('./title')],
]);
void openAuthorizedPage(request,{
 session:async()=>(await import('./account-gate')).auth,
 login:async mode=>(await import('./account-gate')).requestAccountLogin(mode),
 load:request=>pages.get(request.mode)!(),
}).catch(error=>{
 window.dispatchEvent(new CustomEvent('decimal-startup-failed',{detail:{kind:error instanceof AccountConnectionTimeout?'account':'load'}}));
});
