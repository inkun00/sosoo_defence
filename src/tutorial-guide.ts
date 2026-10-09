import './tutorial.css';

/** The step index is zero based. Coordinates in the target rect are viewport CSS pixels. */
export interface TutorialGuideView {
 index:number;
 total:number;
 title:string;
 instruction:string;
 note?:string;
 actionLabel?:string;
 complete?:boolean;
 status?:string;
}
export interface TutorialTargetRect {left:number;top:number;width:number;height:number;}
export interface TutorialGuideCallbacks {
 next:()=>void;
 restart:()=>void;
 exit:()=>void;
 adventure:()=>void;
}
export interface TutorialGuide {
 update:(view:TutorialGuideView)=>void;
 highlight:(rect:TutorialTargetRect|null)=>void;
 dispose:()=>void;
}

/** Keeps the instructions beside the game, with a non-interactive ring around the next action. */
export function mountTutorialGuide(host:HTMLElement,callbacks:TutorialGuideCallbacks):TutorialGuide {
 const guide=document.createElement('section');
 guide.id='tutorial-guide';guide.className='tutorial-guide';
 guide.setAttribute('aria-label','기본 조작 안내');
 guide.innerHTML=`
  <div class="tutorial-guide-copy">
   <div class="tutorial-guide-heading">
    <span class="tutorial-step-count"></span>
    <h2 id="tutorial-step-title"></h2>
    <div class="tutorial-progress" aria-hidden="true"></div>
   </div>
   <p id="tutorial-step-instruction" class="tutorial-instruction" aria-live="polite" aria-atomic="true"></p>
   <p class="tutorial-note" hidden></p>
   <p class="tutorial-status" role="status" aria-live="polite" hidden></p>
  </div>
  <div class="tutorial-guide-actions">
   <button id="tutorial-next" type="button" class="tutorial-button tutorial-primary" hidden></button>
   <button id="tutorial-adventure" type="button" class="tutorial-button tutorial-primary" hidden>모험 시작</button>
   <button id="tutorial-restart" type="button" class="tutorial-button">처음부터</button>
   <button id="tutorial-exit" type="button" class="tutorial-button tutorial-exit">나가기</button>
  </div>`;
 const target=document.createElement('div');
 target.id='tutorial-point';target.className='tutorial-target';target.hidden=true;
 target.setAttribute('aria-hidden','true');
 target.innerHTML='<span class="tutorial-target-arrow"></span>';
 const select=<T extends HTMLElement>(selector:string)=>guide.querySelector<T>(selector)!;
 const count=select<HTMLSpanElement>('.tutorial-step-count');
 const title=select<HTMLHeadingElement>('#tutorial-step-title');
 const instruction=select<HTMLParagraphElement>('#tutorial-step-instruction');
 const note=select<HTMLParagraphElement>('.tutorial-note');
 const status=select<HTMLParagraphElement>('.tutorial-status');
 const progress=select<HTMLDivElement>('.tutorial-progress');
 const next=select<HTMLButtonElement>('#tutorial-next');
 const adventure=select<HTMLButtonElement>('#tutorial-adventure');
 const restart=select<HTMLButtonElement>('#tutorial-restart');
 const exit=select<HTMLButtonElement>('#tutorial-exit');
 next.addEventListener('click',callbacks.next);
 adventure.addEventListener('click',callbacks.adventure);
 restart.addEventListener('click',callbacks.restart);
 exit.addEventListener('click',callbacks.exit);
 const body=document.body,previousClass=body.classList.contains('tutorial-mode');
 const previousHeight=body.style.getPropertyValue('--tutorial-guide-height');
 const previousHeightPriority=body.style.getPropertyPriority('--tutorial-guide-height');
 let disposed=false,lastView='',lastRect:TutorialTargetRect|null=null;
 let frame=0,lastHeight=0;
 body.classList.add('tutorial-mode');
 host.append(guide,target);

 function placeTarget(){
  if(disposed||!lastRect){target.hidden=true;return;}
  const {left,top,width,height}=lastRect;
  if(![left,top,width,height].every(Number.isFinite)||width<=0||height<=0){target.hidden=true;return;}
  const bottom=guide.getBoundingClientRect().top;
  const x=Math.max(2,left-5),y=Math.max(2,top-5);
  const right=Math.min(window.innerWidth-2,left+width+5);
  const targetBottom=Math.min(bottom-3,top+height+5);
  // A disappearing or off-screen canvas target must not leave a ring on the guide.
  if(right<=x||targetBottom<=y){target.hidden=true;return;}
  target.style.left=x+'px';target.style.top=y+'px';
  target.style.width=(right-x)+'px';target.style.height=(targetBottom-y)+'px';
  target.classList.toggle('tutorial-target-arrow-below',y<22);
  target.hidden=false;
 }
 function measure(){
  frame=0;if(disposed)return;
  const height=Math.ceil(guide.getBoundingClientRect().height);
  if(height!==lastHeight){lastHeight=height;body.style.setProperty('--tutorial-guide-height',height+'px');}
  placeTarget();
 }
 function scheduleMeasure(){if(!disposed&&!frame)frame=requestAnimationFrame(measure);}
 const observer=new ResizeObserver(scheduleMeasure);observer.observe(guide);
 window.addEventListener('resize',scheduleMeasure);
 window.visualViewport?.addEventListener('resize',scheduleMeasure);
 measure();
 return {
  update(view){
   if(disposed)return;
   const signature=JSON.stringify(view);if(signature===lastView)return;lastView=signature;
   const total=Math.max(1,Math.floor(view.total)||1),index=Math.max(0,Math.min(total-1,Math.floor(view.index)||0));
   count.textContent=view.complete?'연습 완료':`${index+1} / ${total}`;
   title.textContent=view.title;instruction.textContent=view.instruction;
   note.textContent=view.note||'';note.hidden=!view.note;
   status.textContent=view.status||'';status.hidden=!view.status;
   next.textContent=view.actionLabel||'';next.hidden=!!view.complete||!view.actionLabel;
   adventure.hidden=!view.complete;
   restart.textContent=view.complete?'다시 연습':'처음부터';
   exit.textContent=view.complete?'시작 화면':'나가기';
   guide.classList.toggle('tutorial-complete',!!view.complete);
   progress.replaceChildren(...Array.from({length:total},(_,step)=>{
    const pip=document.createElement('i');
    pip.className=step<index||view.complete?'is-done':step===index?'is-current':'';
    return pip;
   }));
   scheduleMeasure();
  },
  highlight(rect){lastRect=rect?{...rect}:null;placeTarget();},
  dispose(){
   if(disposed)return;disposed=true;
   observer.disconnect();if(frame)cancelAnimationFrame(frame);
   window.removeEventListener('resize',scheduleMeasure);
   window.visualViewport?.removeEventListener('resize',scheduleMeasure);
   guide.remove();target.remove();
   if(!previousClass)body.classList.remove('tutorial-mode');
   if(previousHeight)body.style.setProperty('--tutorial-guide-height',previousHeight,previousHeightPriority);
   else body.style.removeProperty('--tutorial-guide-height');
  },
 };
}
