export type HeroRank=1|2|3|4|5;
export interface HeroSummonStyle{
 readonly rank:HeroRank;readonly label:string;readonly color:number;readonly accent:number;
 readonly cssColor:string;readonly cssAccent:string;readonly rings:number;readonly particles:number;
 readonly rays:number;readonly duration:number;readonly columnHeight:number;
}
const ranks=[
 {label:'일반',color:0x86d7a5,accent:0xe2f8bb},
 {label:'고급',color:0x6bdcf3,accent:0xd3fcff},
 {label:'희귀',color:0xc194ff,accent:0xf0d7ff},
 {label:'전설',color:0xffcb69,accent:0xfff0be},
 {label:'신화',color:0xffdf9d,accent:0xc3f4ff}
] as const;
const css=(value:number)=>'#'+value.toString(16).padStart(6,'0');
/** Rank art is shared by the collection cards and battlefield summoning. */
export function heroSummonStyle(level:number):Readonly<HeroSummonStyle>{
 const safe=Number.isFinite(level)?Math.max(1,Math.min(10,Math.floor(level))):1;
 const rank=(Math.ceil(safe/2)) as HeroRank,palette=ranks[rank-1];
 return Object.freeze({rank,...palette,cssColor:css(palette.color),cssAccent:css(palette.accent),
  rings:rank,particles:8+rank*6,rays:rank>2?(rank-2)*4:0,
  duration:1050+rank*180,columnHeight:55+rank*11});
}
