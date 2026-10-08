// The curse recedes into dawn. These story effects contain no gameplay,
// numbers, equations or teaching demonstrations.
const clamp=(n:number)=>Math.max(0,Math.min(1,n));
const ease=(n:number)=>1-(1-clamp(n))**3;
export const ENDING_CHAPTERS=['어둠의 끝','저주의 해제','되찾은 세상','새로운 아침'] as const;

export function drawRestoredWorld(ctx:CanvasRenderingContext2D,local:number,reduced:boolean,drawDawn:()=>void){
 const progress=reduced?1:ease((local-1.4)/3.4);
 if(progress<=0)return;
 // Dawn spreads from the defeated sorcerer, replacing the cursed landscape.
 ctx.save();ctx.beginPath();ctx.arc(1080,260,progress*1500,0,Math.PI*2);ctx.clip();drawDawn();ctx.restore();
 if(!reduced&&progress<1){
  ctx.save();ctx.globalAlpha=.45*(1-progress);ctx.strokeStyle='#ffe6ae';ctx.lineWidth=7;ctx.shadowColor='#ffcc73';ctx.shadowBlur=30;
  ctx.beginPath();ctx.arc(1080,260,progress*1500,0,Math.PI*2);ctx.stroke();ctx.restore();
 }
}

export function drawEndingMotion(ctx:CanvasRenderingContext2D,scene:number,local:number,reduced:boolean){
 ctx.save();
 if(scene===0&&!reduced){
  const release=clamp((local-1)/3.8);
  // Remnants of the spell lose their power and drift away as quiet sparks.
  for(let i=0;i<44;i++){
   const a=i*2.399,r=70+(i%7)*24+release*(180+i%5*40),x=1080+Math.cos(a)*r,y=260+Math.sin(a)*r*.65-release*180;
   ctx.globalAlpha=Math.sin(release*Math.PI)*(.16+i%3*.09);ctx.fillStyle=release<.45?'#dbc2ff':'#ffdf9a';
   ctx.save();ctx.translate(x,y);ctx.rotate(a+release*2);ctx.fillRect(-3,-3,6,6);ctx.restore();
  }
 }
 if(scene>0){
  const glow=ctx.createRadialGradient(315,365,20,315,365,850);
  glow.addColorStop(0,'#ffe2a024');glow.addColorStop(1,'#ffe2a000');ctx.fillStyle=glow;ctx.globalAlpha=reduced?.55:ease(local/2)*.8;ctx.fillRect(0,0,1600,900);
  if(!reduced){
   // Air returns to the trees; leaves and distant birds carry the new morning.
   for(let i=0;i<12;i++){
    const x=(i*193+local*(22+i%3*8))%1720-60,y=120+(i*83)%360+Math.sin(local*.7+i)*20;
    ctx.save();ctx.translate(x,y);ctx.rotate(i+local*.24);ctx.globalAlpha=.15+(i%3)*.05;ctx.fillStyle=i%3?'#dbe6a9':'#ffe8b3';ctx.beginPath();ctx.ellipse(0,0,7+i%3*2,2.8,0,0,Math.PI*2);ctx.fill();ctx.restore();
   }
   ctx.strokeStyle='#515850';ctx.lineWidth=1.7;ctx.globalAlpha=.35;
   for(let i=0;i<6;i++){
    const x=340+i*25+local*16,y=160+i%3*12+Math.sin(local*2+i)*4;
    ctx.beginPath();ctx.moveTo(x-7,y);ctx.quadraticCurveTo(x-3,y-4,x,y);ctx.quadraticCurveTo(x+3,y-4,x+7,y);ctx.stroke();
   }
  }
 }
 // A fine, luminous ornament frames the serif lettering without obscuring it.
 const alpha=ease(local/.9)*clamp((6-local)/.5);ctx.globalAlpha=alpha*.65;ctx.strokeStyle='#e6c58c';ctx.lineWidth=1.4;
 for(const side of [-1,1]){
  ctx.beginPath();ctx.moveTo(800+side*24,611);ctx.lineTo(800+side*210,611);ctx.stroke();
  for(let i=0;i<3;i++){
   const x=800+side*(102+i*32);ctx.beginPath();ctx.moveTo(x,611);ctx.quadraticCurveTo(x+side*8,600,x+side*18,603);ctx.stroke();
   ctx.beginPath();ctx.moveTo(x+side*12,611);ctx.quadraticCurveTo(x+side*20,623,x+side*30,619);ctx.stroke();
  }
 }
 ctx.save();ctx.translate(800,611);ctx.rotate(Math.PI/4);ctx.fillStyle='#ffdfa1';ctx.fillRect(-5,-5,10,10);ctx.restore();
 ctx.restore();
}
