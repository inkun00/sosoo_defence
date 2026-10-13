import test from 'node:test';
import assert from 'node:assert/strict';
import {combatLabelPosition,type LabelBounds} from '../src/combat-label-layout';
const field={left:16,top:12,right:972,bottom:592};
function clear(p:{x:number;y:number},width:number,height:number,r:LabelBounds){return p.x+width/2<=r.left||p.x-width/2>=r.right||p.y+height/2<=r.top||p.y-height/2>=r.bottom;}
function contained(p:{x:number;y:number},width:number,height:number){assert.ok(p.x-width/2>=field.left&&p.x+width/2<=field.right&&p.y-height/2>=field.top&&p.y+height/2<=field.bottom);}
test('moving boss speech does not cover an edge-clamped damage equation',()=>{
 for(const x of [69,250,494,800,919]){
  const speech={left:Math.max(0,x-350),top:-130,right:Math.min(988,x+350),bottom:75};
  const hp={left:x-90,top:85,right:x+90,bottom:140};
  const p=combatLabelPosition({x,y:40},310,42,field,[speech,hp]);
  contained(p,310,42);assert.ok(clear(p,310,42,speech));assert.ok(clear(p,310,42,hp));
 }
});
test('a floating equation avoids both an active medallion and monster HP',()=>{
 const icon={left:475,top:33,right:513,bottom:73},hp={left:440,top:80,right:548,bottom:150};
 const p=combatLabelPosition({x:494,y:50},310,42,field,[icon,hp]);
 contained(p,310,42);assert.ok(clear(p,310,42,icon));assert.ok(clear(p,310,42,hp));
});
test('unobstructed equations retain their anchors and stay inside field edges',()=>{
 assert.deepEqual(combatLabelPosition({x:494,y:200},310,42,field),{x:494,y:200});
 for(const at of [{x:-200,y:-80},{x:1200,y:800}])contained(combatLabelPosition(at,310,42,field),310,42);
});
