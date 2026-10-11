import type Phaser from 'phaser';

export interface GameScreenLayout{
 width:1280;height:number;compact:boolean;scale:number;pixelWidth:number;pixelHeight:number;
}

/** Reflow the controls on short landscape screens; keep artwork uniformly scaled. */
export function gameScreenLayout(pixelWidth:number,pixelHeight:number):GameScreenLayout{
 const w=Math.max(1,Number.isFinite(pixelWidth)?pixelWidth:1280),h=Math.max(1,Number.isFinite(pixelHeight)?pixelHeight:800);
 const compact=w/h>1.65&&h<=600,height=compact?Math.round(Math.max(600,Math.min(800,1280*h/w))):800;
 return {width:1280,height,compact,scale:Math.min(w/1280,h/height),pixelWidth:w,pixelHeight:h};
}

/** Reserve both battlefields and reflow answers on short or narrow duel screens. */
export function duelScreenLayout(pixelWidth:number,pixelHeight:number):GameScreenLayout{
 const layout=gameScreenLayout(pixelWidth,pixelHeight);
 const {pixelWidth:w,pixelHeight:h}=layout;
 const standardScale=Math.min(w/1280,h/1104),compact=layout.compact||Math.ceil(44/standardScale)>70;
 if(!compact)return {...layout,height:1104,scale:standardScale};
 // boardY + crafting offset + two touch rows + bottom padding.
 // Three ceil-rounded touch heights need at most 3 extra logical pixels.
 const height=Math.max(layout.height+304,3*Math.max(68,Math.ceil(44*1280/w))+681,
  h>132?Math.ceil(684/(1-132/h)):layout.height+304);
 return {...layout,compact,height,scale:Math.min(w/1280,h/height)};
}

/** Enlarge the fitted duel by 30%; scrolling keeps its full composition reachable. */
export function duelScreenDisplayLayout(pixelWidth:number,pixelHeight:number):GameScreenLayout{
 const layout=duelScreenLayout(pixelWidth,pixelHeight);
 return {...layout,scale:layout.scale*1.3};
}

/** Measure the scroll viewport, never the enlarged field, so resizing cannot feed back. */
export function observeDuelScreen(game:Phaser.Game,viewport:HTMLElement,field:HTMLElement,changed:(layout:GameScreenLayout)=>void){
 let previous='',disposed=false;
 const resize=()=>{
  if(disposed)return;
  const box=viewport.getBoundingClientRect();
  if(!Number.isFinite(box.width)||!Number.isFinite(box.height)||box.width<=0||box.height<=0)return;
  const layout=duelScreenDisplayLayout(box.width,box.height),signature=[layout.pixelWidth,layout.pixelHeight,layout.height].join(':');
  if(signature===previous)return;previous=signature;
  field.style.width=layout.width*layout.scale+'px';field.style.height=layout.height*layout.scale+'px';
  field.dataset.screenLayout=layout.compact?'compact':'standard';
  // FIT must read the newly enlarged parent before it recomputes the canvas size.
  if(game.isBooted)game.scale.getParentBounds();
  if(game.isBooted&&(game.scale.width!==layout.width||game.scale.height!==layout.height))game.scale.setGameSize(layout.width,layout.height);
  changed(layout);if(game.isBooted)game.scale.refresh();
 };
 const ready=()=>{previous='';resize();};
 const scroll=()=>{if(!disposed&&game.isBooted)game.scale.updateBounds();};
 const observer=new ResizeObserver(resize);observer.observe(viewport);
 window.addEventListener('resize',resize);window.visualViewport?.addEventListener('resize',resize);
 viewport.addEventListener('scroll',scroll,{passive:true});game.events.on('ready',ready);
 const dispose=()=>{if(disposed)return;disposed=true;observer.disconnect();window.removeEventListener('resize',resize);window.visualViewport?.removeEventListener('resize',resize);viewport.removeEventListener('scroll',scroll);game.events.off('ready',ready);game.events.off('destroy',dispose);};
 game.events.once('destroy',dispose);resize();return dispose;
}

/** Follow both rotation and browser chrome changes without recreating the game. */
export function observeGameScreen(game:Phaser.Game,field:HTMLElement,changed:(layout:GameScreenLayout)=>void,screenLayout=gameScreenLayout){
 let previous='',disposed=false;
 const resize=()=>{
  if(disposed)return;
  const box=field.getBoundingClientRect();if(box.width<=0||box.height<=0)return;
  const layout=screenLayout(box.width,box.height),signature=[layout.pixelWidth,layout.pixelHeight,layout.height].join(':');
  if(signature===previous)return;previous=signature;
  // FIT reads parentSize before refresh updates it; refresh the bounds first on rotation.
  if(game.isBooted)game.scale.getParentBounds();
  if(game.isBooted&&(game.scale.width!==layout.width||game.scale.height!==layout.height))game.scale.setGameSize(layout.width,layout.height);
  field.dataset.screenLayout=layout.compact?'compact':'standard';
  changed(layout);if(game.isBooted)game.scale.refresh();
 };
 const ready=()=>{previous='';resize();};
 const observer=new ResizeObserver(resize);observer.observe(field);
 window.addEventListener('resize',resize);window.visualViewport?.addEventListener('resize',resize);
 game.events.on('ready',ready);
 const dispose=()=>{if(disposed)return;disposed=true;observer.disconnect();window.removeEventListener('resize',resize);window.visualViewport?.removeEventListener('resize',resize);game.events.off('ready',ready);};
 game.events.once('destroy',dispose);resize();return dispose;
}
