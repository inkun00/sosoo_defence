export interface LabelBounds{left:number;top:number;right:number;bottom:number;}
interface Point{x:number;y:number;}
/** Choose the nearest readable position inside the field, around live overlays. */
export function combatLabelPosition(at:Point,width:number,height:number,bounds:LabelBounds,blocked:LabelBounds[]=[]):Point{
 const hw=width/2,hh=height/2,minX=bounds.left+hw,maxX=Math.max(minX,bounds.right-hw),minY=bounds.top+hh,maxY=Math.max(minY,bounds.bottom-hh);
 const clamp=(n:number,a:number,b:number)=>Math.max(a,Math.min(b,n)),origin={x:clamp(at.x,minX,maxX),y:clamp(at.y,minY,maxY)};
 const overlap=(p:Point,r:LabelBounds)=>Math.max(0,Math.min(p.x+hw,r.right)-Math.max(p.x-hw,r.left))*Math.max(0,Math.min(p.y+hh,r.bottom)-Math.max(p.y-hh,r.top));
 if(blocked.every(r=>overlap(origin,r)===0))return origin;
 const xs=[origin.x],ys=[origin.y];
 for(const r of blocked){xs.push(clamp(r.left-hw-3,minX,maxX),clamp(r.right+hw+3,minX,maxX));ys.push(clamp(r.top-hh-3,minY,maxY),clamp(r.bottom+hh+3,minY,maxY));}
 let best=origin,bestArea=Infinity,bestDistance=Infinity;
 for(const x of xs)for(const y of ys){
  const p={x,y},area=blocked.reduce((sum,r)=>sum+overlap(p,r),0),distance=(x-origin.x)**2+(y-origin.y)**2;
  if(area<bestArea||area===bestArea&&distance<bestDistance){best=p;bestArea=area;bestDistance=distance;}
 }
 return best;
}
