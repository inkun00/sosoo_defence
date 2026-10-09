import {learningValue,precision,FusionOperation} from './math';
import {borrowingPlaces} from './towers';
export type LearningMode='basic'|'regroup'|'chain'|'align';
export type ArithmeticLearningKind=`${'add'|'sub'}-${1|2}-${LearningMode}`;
export const CONCEPT_KINDS=['concept-compose','concept-fraction','concept-grid','concept-numberline','concept-place','concept-scale','concept-compare','concept-cards','concept-missing','concept-units','concept-story','concept-read','concept-inequality'] as const;
export type ConceptKind=typeof CONCEPT_KINDS[number];
export type LearningKind=ArithmeticLearningKind|ConceptKind;
export interface LearningSample{a:number;b:number;operation:FusionOperation;digits?:number;context:'money'|'wall'|'battle'|'concept';}
export interface LearningCount{wrong:number;help:number;correct:number;}
export interface LearningProfile{version:1;counts:Partial<Record<LearningKind,LearningCount>>;seen:Record<string,number>;}
const KEY='decimal-learning-v1';
const empty=():LearningProfile=>({version:1,counts:{},seen:{}});
export const isConceptKind=(kind:string):kind is ConceptKind=>(CONCEPT_KINDS as readonly string[]).includes(kind);
export function kindParts(kind:string){const m=/^(add|sub)-([12])-(basic|regroup|chain|align)$/.exec(kind);if(!m||m[2]==='1'&&['chain','align'].includes(m[3]))return null;return {operation:(m[1]==='add'?'+':'-') as FusionOperation,digits:Number(m[2]) as 1|2,mode:m[3] as LearningMode};}
export const validLearningKind=(kind:string):kind is LearningKind=>!!kindParts(kind)||isConceptKind(kind);
function carries(a:number,b:number){let carry=0,count=0;for(const p of [10,100,1000]){carry=Math.floor(a/p)%10+Math.floor(b/p)%10+carry>=10?1:0;count+=carry;}return count;}
export function classify(s:LearningSample):ArithmeticLearningKind|null{
 const answer=s.operation==='+'?s.a+s.b:s.a-s.b;
 if(![s.a,s.b,answer].every(n=>learningValue(n)&&n%10===0)||!['+','-'].includes(s.operation))return null;
 const digits=Math.min(2,Math.max(s.digits??1,precision(s.a),precision(s.b))) as 1|2;
 const changes=s.operation==='+'?carries(s.a,s.b):borrowingPlaces(s.a,s.b).length;
 const mode:LearningMode=changes>=2?'chain':changes?'regroup':precision(s.a)!==precision(s.b)?'align':'basic';
 return (s.operation==='+'?'add':'sub')+'-'+digits+'-'+mode as ArithmeticLearningKind;
}
const CONCEPT_LABELS:Record<ConceptKind,string>={
 'concept-compose':'소수의 구성','concept-fraction':'분수와 소수','concept-grid':'모눈으로 나타낸 소수','concept-numberline':'수직선 읽기',
 'concept-place':'자릿값','concept-scale':'10배·100배와 크기 변화','concept-compare':'소수의 크기 비교','concept-cards':'숫자 카드로 소수 만들기',
 'concept-missing':'빈 수 구하기','concept-units':'0.1·0.01의 개수','concept-story':'생활 속 두 단계 계산','concept-read':'소수 읽기','concept-inequality':'부등식의 빈 숫자'
};
export function kindLabel(kind:LearningKind){if(isConceptKind(kind))return CONCEPT_LABELS[kind];const p=kindParts(kind)!;return (p.digits===2?'소수 두 자리':'소수 한 자리')+' '+(p.operation==='+'?'덧셈':'뺄셈')+' · '+({basic:'같은 자리 계산',regroup:p.operation==='+'?'받아올림':'받아내림',chain:p.operation==='+'?'연속 받아올림':'연속 받아내림',align:'서로 다른 자릿수'}[p.mode]);}
function bounded(n:number){return Number.isSafeInteger(n)&&n>=0?Math.min(n,1000000):0;}
export function loadLearning():LearningProfile{
 try{const raw=JSON.parse(localStorage.getItem(KEY)||'null');if(raw?.version!==1)return empty();const p=empty();
  for(const [oldKind,c] of Object.entries(raw.counts??{}) as [string,LearningCount][]){
   // Retain evidence from old currency questions without generating thousandths again.
   const kind=oldKind.replace(/^(add|sub)-3-/,'$1-2-');if(!validLearningKind(kind)||!c)continue;const prior=p.counts[kind]??{wrong:0,help:0,correct:0};
   p.counts[kind]={wrong:bounded(prior.wrong+bounded(c.wrong)),help:bounded(prior.help+bounded(c.help)),correct:bounded(prior.correct+bounded(c.correct))};
  }
  for(const [id,n] of Object.entries(raw.seen??{})){if(id.length<=250&&Number.isSafeInteger(n)&&Number(n)>=0)p.seen[id]=Number(n);}return p;
 }catch{return empty();}
}
export function recordKindLearning(kind:LearningKind,outcome:keyof LearningCount,id?:string,total?:number){
 if(!validLearningKind(kind))return false;const p=loadLearning(),evidence=id?id+':'+outcome:'',before=evidence?p.seen[evidence]??0:0;
 const target=total===undefined?(outcome==='wrong'?before+1:1):Math.max(0,Math.floor(total)),amount=evidence?Math.max(0,target-before):1;
 if(!amount)return true;const c=p.counts[kind]??{wrong:0,help:0,correct:0};c[outcome]=bounded(c[outcome]+amount);p.counts[kind]=c;if(evidence)p.seen[evidence]=target;
 try{localStorage.setItem(KEY,JSON.stringify(p));return true;}catch{return false;}
}
export function recordLearning(s:LearningSample,outcome:keyof LearningCount,id?:string,total?:number){const kind=classify(s);return kind?recordKindLearning(kind,outcome,id,total):false;}
export function practiceWeight(c:LearningCount){return Math.max(0,Math.min(30,(c.wrong*4+c.help*2-c.correct)/(1+c.correct*.2)));}
export interface HistoricalLearningRecord{matchId:string;hostUid:string;guestUid:string;side:0|1;wrongQuestions:{id:string;a:number;b:number;operation:FusionOperation;kind:string;level:number;attempts:number}[];}
export function importLearningRecords(records:HistoricalLearningRecord[]){
 let saved=true;try{if(!localStorage.getItem(KEY))localStorage.setItem(KEY,JSON.stringify(empty()));}catch{saved=false;}
 for(const r of records){if(!r||!Array.isArray(r.wrongQuestions)||typeof r.matchId!=='string')continue;const uid=r.side===0?r.hostUid:r.guestUid;
  for(const q of r.wrongQuestions){if(!q||!Number.isSafeInteger(q.attempts)||q.attempts<1)continue;
   const sample:LearningSample={a:Math.round(q.a/10)*10,b:Math.round(q.b/10)*10,operation:q.operation,context:q.kind==='tower'?'money':'wall',digits:q.kind==='tower'&&q.level>=2?2:undefined};
   if(!classify(sample))continue;saved=recordLearning(sample,'wrong',r.matchId+':'+uid+':'+q.id,q.attempts)&&saved;
  }
 }return saved;
}
export function importPendingLearning(){try{const rows=JSON.parse(localStorage.getItem('decimal-duel-pending-results-v1')||'[]');if(Array.isArray(rows))importLearningRecords(rows);}catch{/* A malformed old cache never prevents a worksheet. */}}
