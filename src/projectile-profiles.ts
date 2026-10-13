export const PROJECTILE_IDS=['basic','double','needle','pebble','frost','ice','catapult','lightning','crystal','sniper','siege','rune'] as const;
export type ProjectileTypeId=typeof PROJECTILE_IDS[number];
export const PROJECTILE_SHEETS=Object.freeze([
 {atlas:'fx-flight-stone-v1',key:'dungeon-fx-flight-stone-v1',rows:['basic','double','needle','pebble'] as readonly ProjectileTypeId[]},
 {atlas:'fx-flight-element-v1',key:'dungeon-fx-flight-element-v1',rows:['frost','ice','catapult','siege'] as readonly ProjectileTypeId[]},
 {atlas:'fx-flight-magic-v1',key:'dungeon-fx-flight-magic-v1',rows:['lightning','crystal','sniper','rune'] as readonly ProjectileTypeId[]}
]);
export interface ProjectilePoint{x:number;y:number;}
export const REDUCED_PROJECTILE_DURATION=220;
export type ProjectileTrail='smoke'|'dust'|'needle'|'chips'|'frost'|'ice'|'spark'|'tracer'|'rune'|'none';
export interface TowerProjectileProfile{
 readonly id:ProjectileTypeId;readonly atlas:string;readonly row:number;readonly grade:1|2|3|4;
 readonly signature:string;readonly duration:number;readonly width:number;readonly height:number;
 readonly core:Readonly<ProjectilePoint>;readonly roundDelay:number;
 readonly spin:number;readonly arc:number;readonly beam:boolean;readonly rounds:1|2;
 readonly trail:ProjectileTrail;readonly color:number;readonly emissions:number;readonly maxTrails:number;
}

const [stone,element,magic]=PROJECTILE_SHEETS.map(sheet=>sheet.key);
const profile=(p:Omit<TowerProjectileProfile,'core'|'roundDelay'>&{core?:ProjectilePoint;roundDelay?:number}):Readonly<TowerProjectileProfile>=>Object.freeze({core:Object.freeze(p.core??{x:.5,y:.5}),roundDelay:0,...p});

// Duration, silhouette and path belong to the weapon, independently of damage.
// A double shot still represents one model event and a lightning beam one target.
// Sizes describe the trimmed illustration, not its transparent atlas cell.
// Core origins retain their original cell coordinates; frame registration
// remaps them so stones still rotate and arrive around their own center.
export const PROJECTILE_PROFILES:Readonly<Record<ProjectileTypeId,TowerProjectileProfile>>=Object.freeze({
 basic:profile({id:'basic',atlas:stone,row:0,grade:1,signature:'iron-ball-smoke',duration:620,width:54,height:26,core:{x:.76,y:.59},spin:0,arc:0,beam:false,rounds:1,trail:'smoke',color:0xffcc8d,emissions:4,maxTrails:3}),
 double:profile({id:'double',atlas:stone,row:1,grade:1,signature:'separated-twin-stones',duration:580,width:50,height:26,core:{x:.78,y:.54},roundDelay:65,spin:.15,arc:0,beam:false,rounds:2,trail:'dust',color:0xffdba5,emissions:5,maxTrails:3}),
 needle:profile({id:'needle',atlas:stone,row:2,grade:1,signature:'slender-fast-needle',duration:450,width:74,height:22,core:{x:.74,y:.48},spin:0,arc:0,beam:false,rounds:1,trail:'needle',color:0xf6f2d8,emissions:3,maxTrails:2}),
 pebble:profile({id:'pebble',atlas:stone,row:3,grade:1,signature:'spinning-gravel-chips',duration:550,width:50,height:25,core:{x:.76,y:.38},spin:1.8,arc:0,beam:false,rounds:1,trail:'chips',color:0xeac18c,emissions:5,maxTrails:3}),
 frost:profile({id:'frost',atlas:element,row:0,grade:2,signature:'swirling-frost-orb',duration:720,width:58,height:36,core:{x:.8,y:.58},spin:.35,arc:0,beam:false,rounds:1,trail:'frost',color:0xa4f3ff,emissions:7,maxTrails:5}),
 ice:profile({id:'ice',atlas:element,row:1,grade:2,signature:'spinning-long-ice-spear',duration:600,width:76,height:30,core:{x:.73,y:.53},spin:0,arc:0,beam:false,rounds:1,trail:'ice',color:0xd5fbff,emissions:6,maxTrails:4}),
 catapult:profile({id:'catapult',atlas:element,row:2,grade:2,signature:'gravity-arc-boulder-shadow',duration:950,width:64,height:40,core:{x:.74,y:.49},spin:1.15,arc:90,beam:false,rounds:1,trail:'dust',color:0xe6bf8b,emissions:5,maxTrails:4}),
 lightning:profile({id:'lightning',atlas:magic,row:0,grade:3,signature:'connected-flickering-lightning',duration:650,width:1,height:38,spin:0,arc:0,beam:true,rounds:1,trail:'none',color:0xc8c1ff,emissions:0,maxTrails:0}),
 crystal:profile({id:'crystal',atlas:magic,row:1,grade:3,signature:'rotating-crystal-sparkles',duration:720,width:66,height:34,core:{x:.65,y:.51},spin:1.25,arc:0,beam:false,rounds:1,trail:'spark',color:0xe3aaff,emissions:8,maxTrails:5}),
 sniper:profile({id:'sniper',atlas:magic,row:2,grade:3,signature:'very-fast-long-tracer',duration:380,width:92,height:24,core:{x:.78,y:.47},spin:0,arc:0,beam:false,rounds:1,trail:'tracer',color:0xffedac,emissions:3,maxTrails:2}),
 siege:profile({id:'siege',atlas:element,row:3,grade:3,signature:'heavy-cannonball-pressure-smoke',duration:820,width:70,height:46,core:{x:.77,y:.42},spin:.2,arc:0,beam:false,rounds:1,trail:'smoke',color:0xffc27c,emissions:8,maxTrails:6}),
 rune:profile({id:'rune',atlas:magic,row:3,grade:4,signature:'rising-rotating-runic-bolt',duration:770,width:72,height:42,core:{x:.7,y:.41},spin:0,arc:22,beam:false,rounds:1,trail:'rune',color:0xa8ffde,emissions:9,maxTrails:6})
});

export function projectileProfile(typeId:string):TowerProjectileProfile{
 return Object.hasOwn(PROJECTILE_PROFILES,typeId)?PROJECTILE_PROFILES[typeId as ProjectileTypeId]:PROJECTILE_PROFILES.basic;
}

export function projectileFlightDuration(profile:TowerProjectileProfile,reducedMotion=false):number{
 return (reducedMotion?REDUCED_PROJECTILE_DURATION:profile.duration)+profile.roundDelay*(profile.rounds-1);
}

/** A modest detail boost keeps the art readable when the whole field is fitted. */
export function projectileVisibilityScale(scale=1,pixelsPerWorld=1):number{
 const base=Math.max(.35,Math.min(2,Number.isFinite(scale)?scale:1));
 const pixels=Number.isFinite(pixelsPerWorld)&&pixelsPerWorld>0?pixelsPerWorld:1;
 return base*Math.max(1,Math.min(1.5,.75/pixels));
}

// A null progress means that round has not left the tower yet. Both visual
// rounds share the flight's one completion, after the delayed round arrives.
export function projectileRoundProgress(profile:TowerProjectileProfile,elapsed:number,round:0|1,reducedMotion=false):number|null{
 const launch=profile.roundDelay*round;
 return elapsed<launch?null:Math.max(0,Math.min(1,(elapsed-launch)/(reducedMotion?REDUCED_PROJECTILE_DURATION:profile.duration)));
}

export function projectileArcHeight(profile:TowerProjectileProfile,from:ProjectilePoint,to:ProjectilePoint,scale=1):number{
 return Math.min(profile.arc*Math.max(0,scale),Math.hypot(to.x-from.x,to.y-from.y)*.48);
}

// The parabola is exact at both endpoints and never rises beyond its arc height.
export function projectilePath(profile:TowerProjectileProfile,from:ProjectilePoint,to:ProjectilePoint,progress:number,scale=1):ProjectilePoint{
 const t=Math.max(0,Math.min(1,progress)),arc=projectileArcHeight(profile,from,to,scale);
 return {x:from.x+(to.x-from.x)*t,y:from.y+(to.y-from.y)*t-4*arc*t*(1-t)};
}

export function projectileRotation(profile:TowerProjectileProfile,from:ProjectilePoint,to:ProjectilePoint,progress:number,scale=1):number{
 const t=Math.max(0,Math.min(1,progress)),arc=projectileArcHeight(profile,from,to,scale);
 return Math.atan2(to.y-from.y-4*arc*(1-2*t),to.x-from.x)+profile.spin*Math.PI*2*t;
}

// Mark settled before cleanup: destroying the lead sprite can reenter cancel().
// Cancellation deliberately suppresses stale impacts when a field is reset.
export function projectileLifecycle(onImpact:()=>void,cleanup:()=>void){
 let state:'active'|'complete'|'cancelled'='active';
 return {
  get active(){return state==='active';},
  get state(){return state;},
  finish(){if(state!=='active')return;state='complete';try{cleanup();}finally{onImpact();}},
  cancel(){if(state!=='active')return;state='cancelled';cleanup();}
 };
}
