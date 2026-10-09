import './game-audio-controls.css';

export type GameAudioKind='sfx'|'music';
export interface GameAudioState{sfx:boolean;music:boolean;}
export interface GameAudioControlsOptions{
 getState:()=>GameAudioState;
 change:(kind:GameAudioKind,enabled:boolean)=>void|Promise<void>;
 variant?:'toolbar'|'settings';
}

/** Share the same sound buttons between the game toolbar and settings. */
export function mountGameAudioControls(shell:HTMLElement,options:GameAudioControlsOptions){
 const inSettings=options.variant==='settings';
 const toolbar=document.createElement('div');
 toolbar.className=inSettings?'game-audio-settings':'game-audio-controls';
 toolbar.setAttribute('role','group');
 toolbar.setAttribute('aria-label','게임 소리');
 let disposed=false;
 const buttons=(['sfx','music'] as const).map(kind=>{
  const button=document.createElement('button');
  button.type='button';
  button.className='game-audio-toggle';
  button.dataset.audio=kind;
  const icon=document.createElement('span');
  icon.className='game-audio-icon';
  icon.setAttribute('aria-hidden','true');
  const label=document.createElement('span');
  button.append(icon,label);
  const toggle=()=>{
   try{
    const changed=options.change(kind,!options.getState()[kind]);
    // Controllers update immediately; asynchronous persistence may finish later.
    if(changed)void changed.then(sync,sync);
   }finally{sync();}
  };
  button.addEventListener('click',toggle);
  toolbar.append(button);
  return {kind,button,icon,label,toggle};
 });
 function sync(){
  if(disposed)return;
  const state=options.getState();
  for(const {kind,button,icon,label} of buttons){
   const enabled=state[kind],name=kind==='sfx'?'효과음':'배경음';
   button.setAttribute('aria-pressed',String(enabled));
   button.title=`${name} ${enabled?'끄기':'켜기'}`;
   label.textContent=`${name} ${enabled?'ON':'OFF'}`;
   icon.textContent=kind==='sfx'?(enabled?'🔊':'🔇'):'♫';
  }
 }
 if(!inSettings)shell.classList.add('has-game-audio-controls');
 shell.prepend(toolbar);
 sync();
 return {
  sync,
  dispose(){
   if(disposed)return;
   disposed=true;
   for(const {button,toggle} of buttons)button.removeEventListener('click',toggle);
   toolbar.remove();
   if(!inSettings)shell.classList.remove('has-game-audio-controls');
  }
 };
}
