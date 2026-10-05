import {learningValue,FusionOperation} from './math';
import {classify,LearningKind,LearningProfile,kindParts,practiceWeight} from './learning';
export interface WorksheetQuestion{a:number;b:number;operation:FusionOperation;digits:1|2|3;kind:LearningKind;context:'money'|'wall'|'battle';}
export interface DecoderEntry{answer:number;rune:number;}
export interface Worksheet{version:1;id:string;createdAt:number;questions:WorksheetQuestion[];decoder:DecoderEntry[];groups:number[][];codeHash:string;focus:LearningKind[];claimedHero:string|null;}
export const CIPHER_GROUPS=[[0,1,2,3],[4,5,6],[7,8,9],[10,11,12],[13,14,15],[16,17,18,19]];
export const random=()=>crypto.getRandomValues(new Uint32Array(1))[0]/4294967296;
const pick=(n:number,r:()=>number)=>Math.floor(r()*n);
function shuffle<T>(items:T[],r:()=>number){for(let i=items.length-1;i>0;i--){const j=pick(i+1,r);[items[i],items[j]]=[items[j],items[i]];}return items;}
export function questionAnswer(q:WorksheetQuestion){return q.operation==='+'?q.a+q.b:q.a-q.b;}
function pool(level:number):LearningKind[]{const kinds:LearningKind[]=[];for(const digits of [1,2,3] as const){if(digits===2&&level<2||digits===3&&level<4)continue;for(const op of ['add','sub'])for(const mode of ['basic','regroup','chain','align']){if(digits===1&&(mode==='chain'||mode==='align'))continue;kinds.push(op+'-'+digits+'-'+mode as LearningKind);}}return kinds;}
function weighted(kinds:LearningKind[],profile:LearningProfile,r:()=>number){const weights=kinds.map(k=>1+practiceWeight(profile.counts[k]??{wrong:0,help:0,correct:0}));let choice=r()*weights.reduce((s,n)=>s+n,0);for(let i=0;i<kinds.length;i++){choice-=weights[i];if(choice<0)return kinds[i];}return kinds.at(-1)!;}
export function makeQuestion(kind:LearningKind,answers:Set<number>,r:()=>number):WorksheetQuestion{
 const p=kindParts(kind)!;const quantum=p.digits===1?100:p.digits===2?10:1,max=10000/quantum-1;
 for(let tries=0;tries<20000;tries++){let a=(1+pick(max,r))*quantum,b=(1+pick(max,r))*quantum;if(p.operation==='-'&&a<b)[a,b]=[b,a];
  const answer=p.operation==='+'?a+b:a-b;if(!learningValue(answer)||answer<=0||answers.has(answer))continue;
  const context=p.digits===3?'money':p.operation==='+'?'wall':pick(2,r)?'battle':'money';
  const q:WorksheetQuestion={a,b,operation:p.operation,digits:p.digits,context,kind};if(classify(q)!==kind)continue;answers.add(answer);return q;
 }throw Error('새 문항을 만들지 못했어요. 다시 시도해 주세요.');
}
export function generateWorksheet(profile:LearningProfile,level:number,id:string,now:number,r:()=>number=random):Omit<Worksheet,'codeHash'>{
 const baseline=pool(level),weak=(Object.keys(profile.counts) as LearningKind[]).filter(k=>kindParts(k)&&practiceWeight(profile.counts[k]!)>0),available=[...new Set([...baseline,...weak])];
 const focus=weak.sort((a,b)=>practiceWeight(profile.counts[b]!)-practiceWeight(profile.counts[a]!)).slice(0,3);
 const kinds=Array.from({length:20},(_,i)=>i<14&&weak.length?weighted(weak,profile,r):available[i%available.length]);shuffle(kinds,r);
 const answers=new Set<number>(),questions=kinds.map(k=>makeQuestion(k,answers,r)),runes=Array(20).fill(0);
 // All twenty answers contribute to one of the six letters; no six-question shortcut.
 for(const group of CIPHER_GROUPS){let total=pick(26,r);const order=shuffle([...group],r);order.forEach((index,i)=>{const left=order.length-i-1,min=Math.max(0,total-left*9),max=Math.min(9,total),n=min+pick(max-min+1,r);runes[index]=n;total-=n;});}
 const decoder:DecoderEntry[]=questions.map((q,i)=>({answer:questionAnswer(q),rune:runes[i]}));
 // Ten decoys make the rune map a lookup aid rather than an answer list in question order.
 for(let i=0;i<10;i++){let value:number;do{const digits=level>=4?3:level>=2?2:1;value=(1+pick(digits===3?9999:digits===2?999:99,r))*(digits===3?1:digits===2?10:100);}while(answers.has(value));answers.add(value);decoder.push({answer:value,rune:pick(10,r)});}
 decoder.sort((a,b)=>a.answer-b.answer);
 return {version:1,id,createdAt:now,questions,decoder,groups:CIPHER_GROUPS.map(g=>[...g]),focus,claimedHero:null};
}
export function worksheetCode(sheet:Pick<Worksheet,'questions'|'decoder'|'groups'>){return sheet.groups.map(group=>{const total=group.reduce((sum,i)=>{const q=sheet.questions[i],entry=sheet.decoder.find(d=>d.answer===questionAnswer(q));if(!entry)throw Error('암호 지도가 손상되었어요.');return sum+entry.rune;},0);if(total<0||total>25)throw Error('암호 지도가 손상되었어요.');return String.fromCharCode(65+total);}).join('');}
export async function codeHash(id:string,code:string){const data=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(id+':'+code));return Array.from(new Uint8Array(data),b=>b.toString(16).padStart(2,'0')).join('');}
export function validWorksheet(s:Worksheet){
 if(!s||s.version!==1||typeof s.id!=='string'||!/^\w[\w-]{7,80}$/.test(s.id)||!Number.isSafeInteger(s.createdAt)||!Array.isArray(s.questions)||s.questions.length!==20||!Array.isArray(s.decoder)||s.decoder.length!==30||typeof s.codeHash!=='string'||!/^[a-f0-9]{64}$/.test(s.codeHash)||!Array.isArray(s.groups)||JSON.stringify(s.groups)!==JSON.stringify(CIPHER_GROUPS)||!Array.isArray(s.focus)||s.focus.some(k=>!kindParts(k)))return false;
 if(!s.questions.every(q=>q&&['+','-'].includes(q.operation)&&!!kindParts(q.kind)&&[q.a,q.b,questionAnswer(q)].every(learningValue)&&questionAnswer(q)>0&&classify(q)===q.kind&&[1,2,3].includes(q.digits)&&['money','wall','battle'].includes(q.context)&&(q.digits!==3||q.context==='money')))return false;
 if(!s.decoder.every(d=>d&&learningValue(d.answer)&&Number.isInteger(d.rune)&&d.rune>=0&&d.rune<=9))return false;
 if(new Set(s.questions.map(questionAnswer)).size!==20||new Set(s.decoder.map(d=>d.answer)).size!==30)return false;
 try{return /^[A-Z]{6}$/.test(worksheetCode(s));}catch{return false;}
}
