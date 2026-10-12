import {artURL} from '../art';
import type {ComputerOpponent} from './computer-opponents';
import packedFrames from './computer-selection-frames.generated.json';
import {decodeSpriteFrames} from '../sprite-frame-packing';

interface ComputerFrame{x:number;y:number;width:number;height:number;polygon?:number[][];}
interface ComputerSheet{width:number;height:number;poses:ComputerFrame[];}
const frames=decodeSpriteFrames(packedFrames) as Record<string,ComputerSheet>;
let portraitSerial=0;

function escapeHTML(text:string){return text.replace(/[&<>"']/g,value=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[value]!));}

/** Audited ownership clips retain staffs/feet while excluding neighboring poses. */
export function computerSelectionPortraitHTML(level:number){
 const name='cpu-opponent-'+level+'-v1',source=(frames as Record<string,ComputerSheet>)[name];
 if(!source)throw Error('Unknown computer selection portrait: '+level);
 const column=source.width/4,left=Math.min(...source.poses.map((frame,i)=>frame.x-i*column)),top=Math.min(...source.poses.map(frame=>frame.y));
 const width=Math.max(...source.poses.map((frame,i)=>frame.x+frame.width-i*column))-left,height=Math.max(...source.poses.map(frame=>frame.y+frame.height))-top;
 const size=Math.max(width,height)+8,scale=224/size,x=(size-width)/2-left,y=(size-height)/2-top,id='computer-selection-clip-'+(++portraitSerial);
 const clips=source.poses.map((frame,i)=>{
  const points=frame.polygon??[[frame.x,frame.y],[frame.x+frame.width,frame.y],[frame.x+frame.width,frame.y+frame.height],[frame.x,frame.y+frame.height]];
  return `<clipPath id="${id}-${i}" clipPathUnits="userSpaceOnUse"><path d="M${points.map(point=>point.join(' ')).join('L')}Z"/></clipPath>`;
 }).join('');
 const images=source.poses.map((_,i)=>`<g class="computer-selection-frame" data-computer-pose="${i+4}" style="animation-delay:${i?-.3:0}s" transform="matrix(${scale} 0 0 ${scale} ${(x-i*column)*scale} ${y*scale})"><image href="${artURL(name)}" width="${source.width}" height="${source.height}" clip-path="url(#${id}-${i})"/></g>`).join('');
 return `<span class="computer-selection-portrait" aria-hidden="true"><svg data-computer-sheet="${name}" viewBox="0 0 224 224" xmlns="http://www.w3.org/2000/svg"><defs>${clips}</defs>${images}</svg></span>`;
}

export function computerSelectionHTML(opponent:ComputerOpponent,phrase:string){
 return `<section class="computer-selection-scene"><p class="eyebrow">Lv.${opponent.level} · ${escapeHTML(opponent.title)}</p><h2 tabindex="-1" id="computer-selection-heading" aria-describedby="computer-selection-speech">${escapeHTML(opponent.name)}</h2><div class="computer-selection-stage"><div class="computer-selection-glow" aria-hidden="true"></div>${computerSelectionPortraitHTML(opponent.level)}</div><p id="computer-selection-speech" class="computer-selection-speech" role="status" aria-live="polite" aria-atomic="true">${escapeHTML(phrase)}</p><p class="computer-selection-status">곧 결투가 시작됩니다…</p><div class="duel-row"><button type="button" id="computer-taunt-back">다른 상대 선택</button><button type="button" id="computer-taunt-exit">나가기</button></div></section>`;
}
