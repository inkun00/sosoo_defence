const mode=new URLSearchParams(location.search).get('mode');
// Keep each entry's CSS preloads with its import. A conditional chain can be
// folded into one preload call with only the final branch's styles in Vite.
const pages=new Map<string,()=>Promise<unknown>>([
 ['duel',()=>import('./multiplayer/controller')],
 ['adventure',()=>import('./controller')],
 ['worksheet',()=>import('./worksheet-controller')],
 ['title',()=>import('./title')],
]);
void (pages.get(mode??'title')??pages.get('title')!)();
