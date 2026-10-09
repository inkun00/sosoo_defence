import {loadSave,newAdventure,writeSave} from '../src/save';
import {world,key,COLS,ROWS} from '../src/path';
import type {Field} from '../src/scene';
import type {GameUI,UIState} from '../src/ui';
import type {Defense} from '../src/model';
import {gameScreenLayout} from '../src/responsive-game';

// This local-only fixture starts with three addition bricks; no cloud record is written.
const save=newAdventure(loadSave());save.inventory={bricks:[100,200,300],walls:0};save.sfx=false;save.music=false;writeSave(save);
await import('../src/controller');
const proof=document.createElement('output');proof.id='landscape-proof';proof.className='sr-only';proof.setAttribute('role','status');document.getElementById('app')!.append(proof);
type DebugGame={model:Defense;scene:Field;ui:GameUI;state:UIState};
const timer=setInterval(()=>{
 const game=(window as unknown as {__gameTest?:DebugGame}).__gameTest;if(!game?.ui.ready)return;
 const {model,scene,ui,state}=game,road=new Set((model.path()??[]).map(key)),cells=[];
 const field=document.getElementById('field')!.getBoundingClientRect(),canvas=document.querySelector('canvas')!,box=canvas.getBoundingClientRect(),expected=gameScreenLayout(field.width,field.height),screenReady=canvas.height===expected.height&&Math.abs(box.width-1280*expected.scale)<2&&Math.abs(box.height-expected.height*expected.scale)<2;
 for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++)if(!model.blocks.has(key({x,y}))&&!road.has(key({x,y}))&&!model.towers.some(t=>t.x===x&&t.y===y)){const point=world({x,y});cells.push({x,y,...{screen:scene.worldToScreen(point.x,point.y)}});}
 const wallCells=(model.path()??[]).slice(1,-1).filter(c=>!model.walls.some(w=>w.x===c.x&&w.y===c.y)).map(c=>{const p=world(c);return {...c,screen:scene.worldToScreen(p.x,p.y)};});
 proof.textContent=JSON.stringify({viewport:[innerWidth,innerHeight],screenReady,phase:model.phase,panel:state.panel,money:model.money,towers:model.towers.length,walls:model.walls.length,wallStock:model.wallStock,bricks:model.bricks.map(b=>({id:b.id,value:b.value})),slots:state.slots,purchase:model.pendingPurchase&&{before:model.pendingPurchase.before,cost:model.pendingPurchase.cost},input:state.purchaseInput,controls:[...ui.controls].map(([id,c])=>({id,label:c.label,enabled:c.enabled,...ui.getButtonBounds(id)})),cells:cells.slice(0,5),wallCells:wallCells.slice(0,5)});
},150);
window.addEventListener('pagehide',()=>clearInterval(timer));
