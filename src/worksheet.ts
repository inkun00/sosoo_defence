import {learningValue,precision,FusionOperation} from './math';
import {classify,LearningKind,ArithmeticLearningKind,ConceptKind,CONCEPT_KINDS,isConceptKind,validLearningKind,LearningProfile,kindParts,practiceWeight} from './learning';
export interface WorksheetQuestion{a:number;b:number;operation:FusionOperation;digits:1|2;kind:LearningKind;context:'money'|'wall'|'battle'|'concept';type?:ConceptKind;data?:number[];}
export interface DecoderEntry{answer:number;rune:number;}
export interface Worksheet{version:1;id:string;createdAt:number;questions:WorksheetQuestion[];decoder:DecoderEntry[];groups:number[][];codeHash:string;focus:LearningKind[];claimedHero:string|null;}
export const CIPHER_GROUPS=[[0,1,2,3],[4,5,6],[7,8,9],[10,11,12],[13,14,15],[16,17,18,19]];
export const random=()=>crypto.getRandomValues(new Uint32Array(1))[0]/4294967296;
const pick=(n:number,r:()=>number)=>Math.floor(r()*n);
function shuffle<T>(items:T[],r:()=>number){for(let i=items.length-1;i>0;i--){const j=pick(i+1,r);[items[i],items[j]]=[items[j],items[i]];}return items;}
export function questionAnswer(q:WorksheetQuestion):number{
 if(!q.type)return q.operation==='+'?q.a+q.b:q.a-q.b;
 const d=q.data!;
 switch(q.type){
  case 'concept-compose':return d[0]*1000+d[1]*100+d[2]*10;
  case 'concept-fraction':return d[0]*1000+d[1]*1000/d[2];
  case 'concept-grid':return d[0]*10;
  case 'concept-numberline':return d[0]+d[1]*d[2];
  case 'concept-place':return Math.floor(d[0]/d[1])%10*d[1];
  case 'concept-scale':return d[0]*d[1]/d[2];
  case 'concept-compare':return Math.max(...d);
  case 'concept-cards':{const cards=d.slice(0,3).sort((a,b)=>d[3]?b-a:a-b);return cards[0]*1000+cards[1]*100+cards[2]*10;}
  case 'concept-missing':return d[d[3]];
  case 'concept-units':return d[0]/d[1]*1000;
  case 'concept-story':return d[0]+d[1]-d[2];
  case 'concept-read':return d[0];
  case 'concept-inequality':{const options=Array.from({length:10},(_,i)=>i).filter(i=>d[2]?d[0]*1000+i*100>d[1]:d[0]*1000+i*100<d[1]);return (d[2]?Math.min(...options):Math.max(...options))*1000;}
 }
}
export function validQuestion(q:WorksheetQuestion){
 if(!q||!['+','-'].includes(q.operation)||![1,2].includes(q.digits)||!validLearningKind(q.kind))return false;
 if(!q.type){const parts=kindParts(q.kind);return !!parts&&q.digits===parts.digits&&precision(q.a)<=q.digits&&precision(q.b)<=q.digits&&['money','wall','battle'].includes(q.context)&&[q.a,q.b,questionAnswer(q)].every(n=>learningValue(n)&&n%10===0)&&questionAnswer(q)>0&&classify(q)===q.kind;}
 if(!isConceptKind(q.type)||q.kind!==q.type||q.context!=='concept'||q.b!==0||q.operation!=='+'||!Array.isArray(q.data)||!q.data.every(n=>Number.isSafeInteger(n)&&n>=0))return false;
 const d=q.data,decimalValue=(n:number)=>learningValue(n)&&n%10===0;
 let valid=false;
 switch(q.type){
  case 'concept-compose':valid=d.length===3&&d.every(n=>n<10);break;
  case 'concept-fraction':valid=d.length===3&&d[0]<10&&[10,100].includes(d[2])&&d[1]>0&&d[1]<d[2];break;
  case 'concept-grid':valid=d.length===1&&d[0]>0&&d[0]<100;break;
  case 'concept-numberline':valid=d.length===3&&decimalValue(d[0])&&[10,100].includes(d[1])&&d[2]>0&&d[2]<10&&decimalValue(d[0]+d[1]*10);break;
  case 'concept-place':valid=d.length===2&&decimalValue(d[0])&&[10,100,1000].includes(d[1]);break;
  case 'concept-scale':valid=d.length===3&&decimalValue(d[0])&&((d[1]===1&&[10,100].includes(d[2]))||(d[2]===1&&[10,100].includes(d[1])));break;
  case 'concept-compare':valid=d.length===3&&d.every(decimalValue)&&new Set(d).size===3;break;
  case 'concept-cards':valid=d.length===4&&d.slice(0,3).every(n=>n>0&&n<10)&&new Set(d.slice(0,3)).size===3&&d[3]<=1;break;
  case 'concept-missing':valid=d.length===4&&d.slice(0,2).every(decimalValue)&&d[2]<=1&&d[3]<=1&&decimalValue(d[2]?d[0]-d[1]:d[0]+d[1]);break;
  case 'concept-units':valid=d.length===2&&decimalValue(d[0])&&d[0]>0&&[10,100].includes(d[1])&&d[0]%d[1]===0&&d[0]/d[1]<100;break;
  case 'concept-story':valid=d.length===3&&d.every(decimalValue)&&decimalValue(d[0]+d[1])&&d[2]<d[0]+d[1];break;
  case 'concept-read':valid=d.length===1&&decimalValue(d[0]);break;
  case 'concept-inequality':valid=d.length===3&&d[0]<10&&decimalValue(d[1])&&d[2]<=1;break;
 }
 if(!valid)return false;const answer=questionAnswer(q);
 return Number.isSafeInteger(answer)&&answer>=0&&answer%10===0&&q.a===answer&&(q.type==='concept-units'?answer<100000:learningValue(answer));
}
function pool(level:number):ArithmeticLearningKind[]{const kinds:ArithmeticLearningKind[]=[];for(const digits of [1,2] as const){if(digits===2&&level<2)continue;for(const op of ['add','sub'])for(const mode of ['basic','regroup','chain','align']){if(digits===1&&(mode==='chain'||mode==='align'))continue;kinds.push(op+'-'+digits+'-'+mode as ArithmeticLearningKind);}}return kinds;}
function weighted<T extends LearningKind>(kinds:T[],profile:LearningProfile,r:()=>number){const weights=kinds.map(k=>1+practiceWeight(profile.counts[k]??{wrong:0,help:0,correct:0}));let choice=r()*weights.reduce((s,n)=>s+n,0);for(let i=0;i<kinds.length;i++){choice-=weights[i];if(choice<0)return kinds[i];}return kinds.at(-1)!;}
function conceptData(type:ConceptKind,level:number,r:()=>number){
 const two=level>=2,unit=two?10:100,value=()=>unit*(1+pick(two?999:99,r));
 switch(type){
  case 'concept-compose':return [pick(level<3?4:9,r),1+pick(9,r),two?1+pick(9,r):0];
  case 'concept-fraction':{const den=two?100:10;return [level>=4?pick(8,r):0,1+pick(den-1,r),den];}
  case 'concept-grid':return [(1+pick(two?99:9,r))*(two?1:10)];
  case 'concept-numberline':return [pick(two?89:8,r)*unit*10,unit,1+pick(9,r)];
  case 'concept-place':return [value(),two&&level>=4?[10,100,1000][pick(3,r)]:two?10:100];
  case 'concept-scale':{if(!two||level<4)return [100+pick(9,r)*10,10,1];return pick(2,r)?[10+pick(9,r)*10,100,1]:[(1+pick(9,r))*1000,1,pick(2,r)?10:100];}
  case 'concept-compare':{const base=pick(level<3?3:9,r)*1000;return [base+(1+pick(99,r))*10,base+(1+pick(99,r))*10,base+(1+pick(99,r))*10];}
  case 'concept-cards':return shuffle([1,2,3,4,5,6,7,8,9],r).slice(0,3).concat(pick(2,r));
  case 'concept-missing':{let a=value(),b=value();const sub=pick(2,r);if(sub&&a<b)[a,b]=[b,a];return [a,b,sub,pick(2,r)];}
  case 'concept-units':{const step=two?10:100;return [(1+pick(two?99:9,r))*step,step];}
  case 'concept-story':return [value(),value(),value()];
  case 'concept-read':return [value()];
  case 'concept-inequality':{const whole=pick(9,r),tenth=1+pick(8,r),threshold=whole*1000+tenth*100+(two?10+pick(9,r)*10:0);return [whole,threshold,pick(2,r)];}
 }
}
export function makeQuestion(kind:LearningKind,answers:Set<number>,r:()=>number,level=10):WorksheetQuestion{
 if(isConceptKind(kind)){
  for(let tries=0;tries<20000;tries++){const data=conceptData(kind,level,r),q:WorksheetQuestion={a:0,b:0,operation:'+',digits:level===1?1:2,kind,context:'concept',type:kind,data};q.a=questionAnswer(q);
   if(!validQuestion(q)||answers.has(q.a))continue;answers.add(q.a);return q;
  }
 }else{
  const p=kindParts(kind)!;const quantum=p.digits===1?100:10,max=10000/quantum-1;
  for(let tries=0;tries<20000;tries++){let a=(1+pick(max,r))*quantum,b=(1+pick(max,r))*quantum;if(p.operation==='-'&&a<b)[a,b]=[b,a];
   const answer=p.operation==='+'?a+b:a-b;if(!learningValue(answer)||answer<=0||answers.has(answer))continue;
   const context=p.operation==='+'?'wall':pick(2,r)?'battle':'money',q:WorksheetQuestion={a,b,operation:p.operation,digits:p.digits,context,kind};
   if(classify(q)!==kind)continue;answers.add(answer);return q;
  }
 }throw Error('새 문항을 만들지 못했어요. 다시 시도해 주세요.');
}
export function generateWorksheet(profile:LearningProfile,level:number,id:string,now:number,r:()=>number=random):Omit<Worksheet,'codeHash'>{
 const baseline=pool(level),weak=(Object.keys(profile.counts) as LearningKind[]).filter(k=>validLearningKind(k)&&practiceWeight(profile.counts[k]!)>0);
 const arithmeticWeak=weak.filter((k):k is ArithmeticLearningKind=>!!kindParts(k)),available=[...new Set([...baseline,...arithmeticWeak])];
 const focus=weak.sort((a,b)=>practiceWeight(profile.counts[b]!)-practiceWeight(profile.counts[a]!)).slice(0,3);
 // Half of each sheet covers the unit's concepts; arithmetic still follows accumulated mistakes.
 const concepts=shuffle([...CONCEPT_KINDS],r).slice(0,10),conceptWeak=weak.filter(isConceptKind);
 if(conceptWeak.length){const target=weighted(conceptWeak,profile,r);if(!concepts.includes(target))concepts[0]=target;}
 const kinds:LearningKind[]=[...Array.from({length:10},(_,i)=>i<7&&arithmeticWeak.length?weighted(arithmeticWeak,profile,r):available[i%available.length]),...concepts];shuffle(kinds,r);
 const answers=new Set<number>(),questions=kinds.map(k=>makeQuestion(k,answers,r,level)),runes=Array(20).fill(0);
 for(const group of CIPHER_GROUPS){let total=pick(26,r);const order=shuffle([...group],r);order.forEach((index,i)=>{const left=order.length-i-1,min=Math.max(0,total-left*9),max=Math.min(9,total),n=min+pick(max-min+1,r);runes[index]=n;total-=n;});}
 const decoder:DecoderEntry[]=questions.map((q,i)=>({answer:questionAnswer(q),rune:runes[i]}));
 for(let i=0;i<10;i++){let value:number;do{value=(1+pick(level>=2?999:99,r))*(level>=2?10:100);}while(answers.has(value));answers.add(value);decoder.push({answer:value,rune:pick(10,r)});}
 decoder.sort((a,b)=>a.answer-b.answer);
 return {version:1,id,createdAt:now,questions,decoder,groups:CIPHER_GROUPS.map(g=>[...g]),focus,claimedHero:null};
}
export function worksheetCode(sheet:Pick<Worksheet,'questions'|'decoder'|'groups'>){return sheet.groups.map(group=>{const total=group.reduce((sum,i)=>{const q=sheet.questions[i],entry=sheet.decoder.find(d=>d.answer===questionAnswer(q));if(!entry)throw Error('암호 지도가 손상되었어요.');return sum+entry.rune;},0);if(total<0||total>25)throw Error('암호 지도가 손상되었어요.');return String.fromCharCode(65+total);}).join('');}
export async function codeHash(id:string,code:string){const data=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(id+':'+code));return Array.from(new Uint8Array(data),b=>b.toString(16).padStart(2,'0')).join('');}
export function validWorksheet(s:Worksheet){
 if(!s||s.version!==1||typeof s.id!=='string'||!/^\w[\w-]{7,80}$/.test(s.id)||!Number.isSafeInteger(s.createdAt)||!Array.isArray(s.questions)||s.questions.length!==20||!Array.isArray(s.decoder)||s.decoder.length!==30||typeof s.codeHash!=='string'||!/^[a-f0-9]{64}$/.test(s.codeHash)||!Array.isArray(s.groups)||JSON.stringify(s.groups)!==JSON.stringify(CIPHER_GROUPS)||!Array.isArray(s.focus)||s.focus.some(k=>!validLearningKind(k)))return false;
 if(!s.questions.every(validQuestion)||!s.decoder.every(d=>d&&Number.isSafeInteger(d.answer)&&d.answer>=0&&d.answer<100000&&d.answer%10===0&&Number.isInteger(d.rune)&&d.rune>=0&&d.rune<=9))return false;
 if(new Set(s.questions.map(questionAnswer)).size!==20||new Set(s.decoder.map(d=>d.answer)).size!==30)return false;
 try{return /^[A-Z]{6}$/.test(worksheetCode(s));}catch{return false;}
}
