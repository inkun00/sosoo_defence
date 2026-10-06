// Cinematic story effects: the world fragments into decimals, a spell summons
// monsters, and several layers of the army advance toward the viewer.
// Nothing here simulates a tower attack, a purchase, or a learning question.
const clamp=(n:number)=>Math.max(0,Math.min(1,n));
const ease=(n:number)=>1-(1-clamp(n))**3;
const value=(i:number)=>(((i*17)%99+1)/10).toFixed(1);
export const OPENING_ASSETS=['slime','monster-crystal','monster-golem'] as const;
type Art=ReadonlyMap<string,HTMLImageElement>;

export function drawOpeningMotion(ctx:CanvasRenderingContext2D,scene:number,local:number,reduced:boolean,art:Art){
 const t=reduced?2:local;
 ctx.save();ctx.textAlign='center';ctx.textBaseline='middle';
 if(scene===1){
  const spread=reduced?1:ease((local-.45)/4.6),radius=spread*1900;
  ctx.save();ctx.beginPath();ctx.arc(1280,120,radius,0,Math.PI*2);ctx.clip();
  const curse=ctx.createLinearGradient(0,0,1600,700);curse.addColorStop(0,'#270942a0');curse.addColorStop(1,'#52207475');ctx.fillStyle=curse;ctx.fillRect(0,0,1600,900);
  // Bits of the actual landscape lift away; glowing decimals take their places.
  const landscape=art.get('story-dawn-v1')!;
  for(let i=0;i<72;i++){
   const x=80+(i*239)%1450,y=90+(i*131)%440,arrival=clamp((radius-Math.hypot(x-1280,y-120))/250);
   if(!arrival)continue;const drift=reduced?0:arrival*(25+i%7*12),w=28+i%4*9;
   ctx.save();ctx.translate(x,y);ctx.rotate(reduced?0:arrival*(i%2?1:-1)*.6);
   ctx.globalAlpha=arrival*(1-arrival)*1.5;ctx.drawImage(landscape,x/1600*landscape.width,y/900*landscape.height,w/1600*landscape.width,w/900*landscape.height,-w/2,-drift-w/2,w,w);
   ctx.globalAlpha=arrival*(.4+i%3*.15);ctx.fillStyle='#f2d5ff';ctx.font=`800 ${20+i%4*7}px 'Malgun Gothic',sans-serif`;ctx.fillText(value(i),0,-drift);ctx.restore();
  }
  ctx.restore();
  if(!reduced&&spread<.99){ctx.strokeStyle='#d29aff';ctx.globalAlpha=.65;ctx.lineWidth=5;ctx.beginPath();ctx.arc(1280,120,radius,0,Math.PI*2);ctx.stroke();}
 }
 if(scene===2||scene===3){
  const strength=reduced?1:ease(local/1.5),cx=780,cy=350;
  const glow=ctx.createRadialGradient(cx,cy,10,cx,cy,220);glow.addColorStop(0,'#eed2ff55');glow.addColorStop(1,'#bb6eff00');ctx.fillStyle=glow;ctx.globalAlpha=strength;ctx.fillRect(cx-220,cy-220,440,440);
  for(let ring=0;ring<3;ring++){
   ctx.save();ctx.translate(cx,cy);ctx.scale(1,.42);ctx.rotate(t*(ring%2?-.4:.3)+ring);ctx.strokeStyle=ring===1?'#eee0ff':'#c08aff';ctx.lineWidth=2;ctx.globalAlpha=strength*.7;ctx.beginPath();ctx.arc(0,0,95+ring*48,.2,Math.PI*1.7);ctx.stroke();ctx.restore();
  }
  for(let i=0;i<30;i++){
   const a=i*Math.PI*2/30+t*.4,r=105+(i%5)*29-(scene===3?ease(local/3)*45:0);
   ctx.globalAlpha=strength*(.3+i%3*.2);ctx.fillStyle='#eacbff';ctx.font=`700 ${18+i%3*7}px 'Malgun Gothic',sans-serif`;ctx.fillText(value(i),cx+Math.cos(a)*r,cy+Math.sin(a)*r*.52);
  }
 }
 const monster=(name:string,x:number,y:number,size:number,clock:number,opacity=1)=>{
  const sheet=art.get(name)!;const frame=reduced?0:Math.floor(clock*6)%4,bob=reduced?0:Math.sin(clock*8)*size*.025;
  ctx.save();ctx.globalAlpha=opacity;ctx.fillStyle='#08051066';ctx.beginPath();ctx.ellipse(x,y+size*.3,size*.35,size*.07,0,0,Math.PI*2);ctx.fill();
  ctx.drawImage(sheet,frame*sheet.width/4,0,sheet.width/4,sheet.height/4,x-size/2,y-size/2+bob,size,size);ctx.restore();
 };
 if(scene===3){
  OPENING_ASSETS.forEach((name,i)=>{
   const born=reduced?1:ease((local-.7-i*.4)/1.6),x=435+i*365,y=365+(1-born)*90,size=(160+i*42)*born;
   if(born<=0)return;ctx.save();ctx.globalAlpha=born*.7;ctx.strokeStyle='#d5a3ff';ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(x,458,85,20,0,0,Math.PI*2);ctx.stroke();ctx.restore();
   monster(name,x,y,size,t+i,born);
   ctx.globalAlpha=born;ctx.font="800 30px 'Malgun Gothic',sans-serif";ctx.fillStyle='#efd5ff';ctx.fillText(['0.2','1.5','2.4'][i],x,480);
   if(!reduced)for(let j=0;j<8;j++){const a=j*Math.PI/4+t,r=45+born*55;ctx.globalAlpha=(1-born)*.8;ctx.fillStyle='#cfadfa';ctx.fillRect(x+Math.cos(a)*r,400+Math.sin(a)*r,9,9);}
  });
 }
 if(scene===4){
  // Different speeds and sizes give the advancing army foreground parallax.
  for(let layer=0;layer<3;layer++)for(let i=0;i<5;i++){
   const size=85+layer*45,cycle=reduced?(i+.5)/5:((i*.2+t*(.033+layer*.016))%1),x=-120+cycle*1840,y=275+layer*78+i%2*28;
   monster(OPENING_ASSETS[(i+layer)%3],x,y,size,t+i+layer,.55+layer*.2);
   if(layer===2){ctx.globalAlpha=.8;ctx.font="800 25px 'Malgun Gothic',sans-serif";ctx.fillStyle='#dbc1ff';ctx.fillText(value(i+layer*7),x,y-size*.37);}
  }
  if(!reduced){ctx.strokeStyle='#d9c0ff';ctx.lineWidth=1;for(let i=0;i<22;i++){const x=(i*173+t*90)%1600,y=140+i*16;ctx.globalAlpha=.07;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+45+i%4*18,y-9);ctx.stroke();}}
 }
 if(scene===5){
  const reveal=reduced?1:ease(local/2.5);ctx.globalAlpha=.28*reveal;ctx.strokeStyle='#ffcf7d';ctx.lineWidth=2;
  for(let i=0;i<9;i++){const a=-Math.PI*.93+i*.22;ctx.beginPath();ctx.moveTo(1120,300);ctx.lineTo(1120+Math.cos(a)*1000,300+Math.sin(a)*1000);ctx.stroke();}
  if(!reduced){ctx.globalAlpha=.55*(1-clamp(local/3));ctx.beginPath();ctx.arc(1120,300,80+ease(local/3)*900,0,Math.PI*2);ctx.stroke();}
 }
 ctx.restore();
}
