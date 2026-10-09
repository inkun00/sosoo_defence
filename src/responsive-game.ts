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

/** Follow both rotation and browser chrome changes without recreating the game. */
export function observeGameScreen(game:Phaser.Game,field:HTMLElement,changed:(layout:GameScreenLayout)=>void){
 let previous='',disposed=false;
 const resize=()=>{
  if(disposed)return;
  const box=field.getBoundingClientRect();if(box.width<=0||box.height<=0)return;
  const layout=gameScreenLayout(box.width,box.height),signature=[layout.pixelWidth,layout.pixelHeight,layout.height].join(':');
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
