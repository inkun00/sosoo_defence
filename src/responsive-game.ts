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

/** Keep both battlefields and the action strip within one uniformly fitted screen. */
export function duelScreenLayout(pixelWidth:number,pixelHeight:number):GameScreenLayout{
 const layout=gameScreenLayout(pixelWidth,pixelHeight);
 const {pixelWidth:w,pixelHeight:h}=layout;
 const height=800,compact=layout.compact||w<960||h<650;
 return {...layout,compact,height,scale:Math.min(w/1280,h/height)};
}

/** The displayed duel uses the fitted scale so the whole map stays visible. */
export function duelScreenDisplayLayout(pixelWidth:number,pixelHeight:number):GameScreenLayout{
 return duelScreenLayout(pixelWidth,pixelHeight);
}

/** Measure the fixed viewport, never the fitted field, so resizing cannot feed back. */
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
  // FIT must read the newly fitted parent before it recomputes the canvas size.
  if(game.isBooted)game.scale.getParentBounds();
  if(game.isBooted&&(game.scale.width!==layout.width||game.scale.height!==layout.height))game.scale.setGameSize(layout.width,layout.height);
  changed(layout);if(game.isBooted)game.scale.refresh();
 };
 const ready=()=>{previous='';resize();};
 const observer=new ResizeObserver(resize);observer.observe(viewport);
 window.addEventListener('resize',resize);window.visualViewport?.addEventListener('resize',resize);
 game.events.on('ready',ready);
 const dispose=()=>{if(disposed)return;disposed=true;observer.disconnect();window.removeEventListener('resize',resize);window.visualViewport?.removeEventListener('resize',resize);game.events.off('ready',ready);game.events.off('destroy',dispose);};
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
