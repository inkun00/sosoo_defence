import type Phaser from 'phaser';
import type {BossSpellState} from './boss-spells';
import './boss-spell-warning.css';

/** A passive overlay: it never pauses combat, captures input, or advances its own timer. */
export class BossSpellWarning{
 private root:HTMLElement;
 private announcement:HTMLElement;
 private name:HTMLElement;
 private taunt:HTMLElement;
 private countdown:HTMLElement;
 private description:HTMLElement;
 private announced=new Set<string>();
 private placementSignature='';
 private contentSignature='';
 private disposed=false;
 constructor(private scene:Phaser.Scene){
  this.root=document.createElement('aside');this.root.className='boss-spell-warning';this.root.hidden=true;this.root.setAttribute('aria-label','저주 마법사의 마법');this.root.dataset.phase='none';this.root.dataset.spellId='';this.root.dataset.sourceId='';this.root.dataset.countdown='0';
  this.root.innerHTML='<div class="boss-spell-warning-title" aria-hidden="true"><span data-boss-spell="name"></span><span data-boss-spell="countdown"></span></div><p data-boss-spell="taunt" aria-hidden="true"></p><p data-boss-spell="description" aria-hidden="true"></p><p class="boss-spell-announcement" role="status" aria-live="polite" aria-atomic="true"></p>';
  this.name=this.root.querySelector('[data-boss-spell="name"]')!;this.taunt=this.root.querySelector('[data-boss-spell="taunt"]')!;this.countdown=this.root.querySelector('[data-boss-spell="countdown"]')!;this.description=this.root.querySelector('[data-boss-spell="description"]')!;this.announcement=this.root.querySelector('.boss-spell-announcement')!;
  (scene.game.canvas.parentElement??document.body).append(this.root);
 }
 sync(state:BossSpellState|null){
  if(this.disposed)return;
  if(!state){this.clear();return;}
  if(state.phase==='rest'){
   const countdown=Math.max(0,Math.ceil(state.remaining-1e-8)),signature=[state.sourceId,state.cycle,'rest',state.spell.id,countdown].join(':');this.hide();
   if(signature!==this.contentSignature){this.contentSignature=signature;this.root.dataset.phase='rest';this.root.dataset.spellId=state.spell.id;this.root.dataset.sourceId=String(state.sourceId);this.root.dataset.cycle=String(state.cycle);this.root.dataset.countdown=String(countdown);}
   return;
  }
  const {spell,phase,cycle,sourceId}=state,countdown=Math.max(0,Math.ceil(state.remaining-1e-8)),signature=[sourceId,cycle,phase,spell.id,countdown].join(':');
  if(this.root.hidden)this.root.hidden=false;
  if(signature!==this.contentSignature){
   this.contentSignature=signature;this.root.dataset.phase=phase;this.root.dataset.spellId=spell.id;this.root.dataset.sourceId=String(sourceId);this.root.dataset.cycle=String(cycle);this.root.dataset.countdown=String(countdown);
   this.root.style.setProperty('--boss-spell-color','#'+spell.color.toString(16).padStart(6,'0'));
   this.name.textContent=(phase==='warning'?'시전 예고 · ':'발동 중 · ')+spell.name;
   this.countdown.textContent=phase==='warning'?`${countdown}초 후 발동`:`${countdown}초 남음`;
   this.taunt.textContent=spell.taunt;this.taunt.hidden=phase!=='warning';
   this.description.textContent=phase==='warning'?'곧 3칸 안의 몬스터에만 발동해요 · 지금은 강화 없음':spell.description;
   this.placementSignature='';
  }
  const warningId=[sourceId,cycle,spell.id].join(':');
  if(phase==='warning'&&!this.announced.has(warningId)){this.announced.add(warningId);this.announcement.textContent=`저주 마법사: ${spell.taunt} ${spell.name}, ${countdown}초 후 발동. ${spell.description}`;}
  this.place();
 }
 private place(){
  const canvas=this.scene.game.canvas,box=canvas.getBoundingClientRect(),camera=this.scene.cameras.main,scaleX=box.width/Math.max(1,this.scene.scale.width),scaleY=box.height/Math.max(1,this.scene.scale.height);
  const left=box.left+camera.x*scaleX,top=box.top+camera.y*scaleY,width=camera.width*scaleX;
  const toolbar=document.querySelector<HTMLElement>('.game-audio-controls'),toolbarBox=toolbar?.getBoundingClientRect(),firstButton=toolbar?.querySelector('button')?.getBoundingClientRect();
  const stripWidth=toolbarBox&&firstButton?firstButton.left-toolbarBox.left-16:0;
  const compact=window.innerHeight<=500&&window.innerWidth>window.innerHeight&&stripWidth>=250;
  const cardWidth=compact?Math.min(560,stripWidth):Math.max(160,Math.min(560,width-20)),signature=[left,top,width,box.top,window.innerWidth,window.innerHeight,cardWidth,compact,toolbarBox?.top,toolbarBox?.height].join(':');
  if(signature===this.placementSignature)return;this.placementSignature=signature;
  this.root.dataset.compact=String(compact);this.root.style.width=cardWidth+'px';this.root.style.left=(compact?toolbarBox!.left+8:Math.max(8,Math.min(window.innerWidth-cardWidth-8,left+(width-cardWidth)/2)))+'px';
  const height=this.root.getBoundingClientRect().height;
  // On a short landscape screen the free part of the audio strip keeps boss HP visible.
  if(compact){this.root.style.top=toolbarBox!.top+Math.max(0,(toolbarBox!.height-height)/2)+'px';return;}
  // Narrow portrait screens have unused space above the fitted canvas. Use it first.
  const above=box.top-height-12;
  const y=above>=Math.max(12,(toolbarBox?.bottom??0)+4)?above:top+Math.max(8,24*scaleY);
  this.root.style.top=Math.max(8,Math.min(window.innerHeight-height-8,y))+'px';
 }
 private hide(){if(this.root.hidden)return;this.root.hidden=true;this.contentSignature='';this.placementSignature='';if(this.announcement.textContent)this.announcement.textContent='';}
 clear(){if(this.disposed)return;this.hide();this.contentSignature='';this.placementSignature='';this.announced.clear();this.root.dataset.phase='none';this.root.dataset.spellId='';this.root.dataset.sourceId='';this.root.dataset.countdown='0';}
 destroy(){if(this.disposed)return;this.clear();this.disposed=true;this.root.remove();}
}
