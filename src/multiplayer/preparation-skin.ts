import {artURL} from '../art';
import './preparation-skin.css';

type Skin='panel'|'button'|'active'|'disabled'|'menu';
interface AtlasFrame{x:number;y:number;width:number;height:number;}

// These are the visible alpha > 180 bounds used by registerDungeon. Keeping the
// same crop and 14 / 128 slice makes DOM controls match the battlefield frames.
const DUNGEON_FRAMES:Record<Exclude<Skin,'menu'>,AtlasFrame>={
 panel:{x:23,y:25,width:221,height:211},
 button:{x:267,y:25,width:221,height:211},
 active:{x:22,y:264,width:222,height:214},
 disabled:{x:267,y:264,width:222,height:214}
};
const templates=new Map<Skin,string>();

function frameHTML(kind:Skin){
 const cached=templates.get(kind);if(cached)return cached;
 const menu=kind==='menu',frame=menu?{x:17,y:49,width:926,height:211}:DUNGEON_FRAMES[kind];
 const left=frame.width*(menu ? .18 : 14/128),top=frame.height*(menu ? .18 : 14/128);
 const widths=[left,frame.width-left*2,left],heights=[top,frame.height-top*2,top];
 const sourceWidth=menu?960:512,sourceHeight=menu?320:512,url=artURL(menu?'menu-button-v1':'ui');
 let pieces='',y=frame.y;
 for(const height of heights){let x=frame.x;for(const width of widths){
  pieces+=`<svg viewBox="${x} ${y} ${width} ${height}" preserveAspectRatio="none" overflow="hidden" xmlns="http://www.w3.org/2000/svg"><image href="${url}" width="${sourceWidth}" height="${sourceHeight}"/></svg>`;x+=width;
 }y+=height;}
 const html=`<span class="duel-preparation-skin" data-preparation-skin="${kind}" aria-hidden="true">${pieces}</span>`;
 templates.set(kind,html);return html;
}

function normalSkin(surface:HTMLElement):Skin{
 const requested=surface.dataset.preparationSurface;
 if(requested&&['panel','button','active','disabled','menu'].includes(requested))return requested as Skin;
 if(surface.classList.contains('duel-preparation-card')||surface.classList.contains('duel-preparation-input-surface'))return 'panel';
 if(surface.classList.contains('duel-preparation-primary')||surface.getAttribute('aria-selected')==='true'||surface.getAttribute('aria-pressed')==='true')return 'active';
 return 'button';
}

/** Paint existing game art beneath native controls without changing their events. */
export function mountPreparationSkin(root:HTMLElement){
 const input=root.querySelector<HTMLInputElement>('input[name="answer"]');
 let inputWrapper:HTMLSpanElement|undefined;
 if(input&&!input.parentElement?.classList.contains('duel-preparation-input-surface')){
  inputWrapper=document.createElement('span');inputWrapper.className='duel-preparation-input-surface';input.before(inputWrapper);inputWrapper.append(input);
 }
 // Clock updates replace some button labels. Reattach the existing frame in
 // those cases so its SVG nodes and decoded atlas image remain reusable.
 const frames=new WeakMap<HTMLElement,Partial<Record<Skin,HTMLElement>>>();
 const sync=()=>{
  root.querySelectorAll<HTMLElement>('[data-preparation-surface],.duel-preparation-card,button,.duel-preparation-input-surface').forEach(surface=>{
   const kind=surface instanceof HTMLButtonElement&&surface.disabled?'disabled':normalSkin(surface);
   surface.dataset.preparationSkinned=kind;
   const old=Array.from(surface.children).find(child=>child.classList.contains('duel-preparation-skin'));
   if(old?.getAttribute('data-preparation-skin')===kind)return;
   old?.remove();let cached=frames.get(surface);if(!cached){cached={};frames.set(surface,cached);}
   let frame=cached[kind];if(!frame){const template=document.createElement('template');template.innerHTML=frameHTML(kind);frame=template.content.firstElementChild as HTMLElement;cached[kind]=frame;}
   surface.prepend(frame);
  });
 };
 sync();
 return {sync,dispose(){
  root.querySelectorAll('.duel-preparation-skin').forEach(frame=>frame.remove());
  root.querySelectorAll<HTMLElement>('[data-preparation-skinned]').forEach(surface=>delete surface.dataset.preparationSkinned);
  if(inputWrapper&&input){inputWrapper.before(input);inputWrapper.remove();}
 }};
}
