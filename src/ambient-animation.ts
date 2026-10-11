export type StationaryAmbientKind='portal'|'flame';
export interface AmbientCrop{x:number;y:number;width:number;height:number;offsetX:number;offsetY:number;}
export interface AmbientCanvas{canvasWidth:number;canvasHeight:number;frames:AmbientCrop[];}
// Coordinates use the measured 420 × 440 trim canvas, not the atlas cells.
// The small inset keeps the arch's purple-lit stone edges stationary too.
export function ambientEnergyWeight(kind:StationaryAmbientKind,x:number,y:number){
 const weight=kind==='flame'?(145-y)/8:(1-Math.hypot((x-201)/39,(y-247)/102))/.06;
 return Math.max(0,Math.min(1,weight));
}
export function ambientEnergyPixel(kind:StationaryAmbientKind,x:number,y:number){return ambientEnergyWeight(kind,x,y)>0;}

/** Recompose the existing art once; the stone pixels never change frames. */
export function drawStationaryAmbientAtlas(context:CanvasRenderingContext2D,kind:StationaryAmbientKind,source:CanvasImageSource,spec:AmbientCanvas){
 const {canvasWidth:width,canvasHeight:height}=spec,probe=document.createElement('canvas');probe.width=width;probe.height=height;
 const paint=probe.getContext('2d',{willReadFrequently:true});if(!paint)throw Error('Ambient canvas unavailable');
 const draw=(crop:AmbientCrop)=>{paint.clearRect(0,0,width,height);paint.drawImage(source,crop.x,crop.y,crop.width,crop.height,crop.offsetX,crop.offsetY,crop.width,crop.height);return paint.getImageData(0,0,width,height);};
 const base=draw(spec.frames[0]),mask=new Float32Array(width*height);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++)mask[y*width+x]=ambientEnergyWeight(kind,(x+.5)*420/width,(y+.5)*440/height);
 spec.frames.forEach((crop,index)=>{
  const motion=draw(crop);
  for(let pixel=0;pixel<mask.length;pixel++)if(mask[pixel]<1){const offset=pixel*4,weight=mask[pixel];for(let channel=0;channel<4;channel++)motion.data[offset+channel]=base.data[offset+channel]*(1-weight)+motion.data[offset+channel]*weight;}
  context.putImageData(motion,index%3*width,Math.floor(index/3)*height);
 });
}
