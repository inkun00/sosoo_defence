export interface SiegeHumanFrame{
 x:number;y:number;width:number;height:number;
 /** Absolute source-pixel contact point between the two planted feet. */
 anchorX:number;anchorY:number;
 polygon?:number[][];
}
export interface SiegeHumanAtlas{
 texture:string;sourceWidth:number;sourceHeight:number;
 /** One source-to-display scale shared by all sixteen frames. */
 scale:number;frames:SiegeHumanFrame[];
}
export const SIEGE_HUMAN_CELL=224;
export const SIEGE_HUMAN_GROUND={x:SIEGE_HUMAN_CELL*.5,y:SIEGE_HUMAN_CELL*.92};

export function siegeHumanFramePlacement(atlas:SiegeHumanAtlas,index:number){
 const frame=atlas.frames[index];if(!frame)throw new RangeError('Unknown human sprite frame: '+index);
 return {x:SIEGE_HUMAN_GROUND.x-frame.anchorX*atlas.scale,y:SIEGE_HUMAN_GROUND.y-frame.anchorY*atlas.scale,scale:atlas.scale};
}
export function siegeHumanFramePath(frame:SiegeHumanFrame){
 const points=frame.polygon??[[frame.x,frame.y],[frame.x+frame.width,frame.y],[frame.x+frame.width,frame.y+frame.height],[frame.x,frame.y+frame.height]];
 return 'M'+points.map(point=>point.join(' ')).join('L')+'Z';
}
export function siegeHumanGround(atlas:SiegeHumanAtlas){
 const top=Math.min(...atlas.frames.map(frame=>SIEGE_HUMAN_GROUND.y+(frame.y-frame.anchorY)*atlas.scale));
 return {...SIEGE_HUMAN_GROUND,top:Math.max(0,top)};
}
/** Atlas padding may be large; size the person by the first pose's body height. */
export function siegeHumanDrawSize(atlas:SiegeHumanAtlas,visibleHeight:number){
 const first=atlas.frames[0],height=(first.anchorY-first.y)*atlas.scale;
 return visibleHeight*SIEGE_HUMAN_CELL/Math.max(1,height);
}

/** Normalize source cells once; fixed feet and scale keep poses from wobbling. */
export function drawSiegeHumanAtlas(context:CanvasRenderingContext2D,atlas:SiegeHumanAtlas,image:CanvasImageSource){
 context.clearRect(0,0,SIEGE_HUMAN_CELL*4,SIEGE_HUMAN_CELL*4);
 atlas.frames.forEach((frame,index)=>{
  const placement=siegeHumanFramePlacement(atlas,index);
  context.save();context.translate(index%4*SIEGE_HUMAN_CELL,Math.floor(index/4)*SIEGE_HUMAN_CELL);
  // Keep even unusual weapon/effect silhouettes inside their own cached cell.
  context.beginPath();context.rect(0,0,SIEGE_HUMAN_CELL,SIEGE_HUMAN_CELL);context.clip();
  context.translate(placement.x,placement.y);context.scale(atlas.scale,atlas.scale);
  context.beginPath();context.rect(frame.x,frame.y,frame.width,frame.height);context.clip();
  if(frame.polygon){context.beginPath();frame.polygon.forEach(([x,y],i)=>i?context.lineTo(x,y):context.moveTo(x,y));context.closePath();context.clip();}
  context.drawImage(image,0,0,atlas.sourceWidth,atlas.sourceHeight);context.restore();
 });
}
