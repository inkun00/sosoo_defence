/** Leaving a game always opens the title, without retaining a worksheet,
 * preview or test-only query from the screen that was closed. */
export function mainMenuURL(href:string):string {
 const url=new URL(href);
 url.search='?mode=title';
 url.hash='';
 return url.href;
}

export function goToMainMenu(target:Pick<Location,'href'|'assign'>=window.location):void {
 const url=mainMenuURL(target.href);
 if(typeof window!=='undefined'&&target===window.location){
  void import('./game-motion').then(({navigateWithMotion})=>navigateWithMotion(url)).catch(()=>target.assign(url));
 }else target.assign(url);
}
