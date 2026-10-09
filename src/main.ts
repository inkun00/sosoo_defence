import {pageRequest,openAuthorizedPage} from './page-access';
const request=pageRequest(location.search);
// Keep each entry's CSS preloads with its import. A conditional chain can be
// folded into one preload call with only the final branch's styles in Vite.
const pages=new Map<string,()=>Promise<unknown>>([
 ['duel',()=>import('./multiplayer/controller')],
 ['adventure',()=>import('./controller')],
 ['worksheet',()=>import('./worksheet-controller')],
 ['title',()=>import('./title')],
]);
void openAuthorizedPage(request,{
 session:async()=>(await import('./account-gate')).auth,
 login:async mode=>(await import('./account-gate')).requestAccountLogin(mode),
 load:request=>pages.get(request.mode)!(),
});
