import {learningValue,precision,FusionOperation} from './math';
import {borrowingPlaces} from './towers';
export type LearningMode='basic'|'regroup'|'chain'|'align';
export type LearningKind=`${'add'|'sub'}-${1|2|3}-${LearningMode}`;
export interface LearningSample{a:number;b:number;operation:FusionOperation;digits?:number;context:'money'|'wall'|'battle';}
export interface LearningCount{wrong:number;help:number;correct:number;}
export interface LearningProfile{version:1;counts:Partial<Record<LearningKind,LearningCount>>;seen:Record<string,number>;}
const KEY='decimal-learning-v1';
const empty=():LearningProfile=>({version:1,counts:{},seen:{}});
export function kindParts(kind:string){const m=/^(add|sub)-([123])-(basic|regroup|chain|align)$/.exec(kind);if(!m||m[2]==='1'&&['chain','align'].includes(m[3]))return null;return {operation:(m[1]==='add'?'+':'-') as FusionOperation,digits:Number(m[2]) as 1|2|3,mode:m[3] as LearningMode};}
function carries(a:number,b:number){let carry=0,count=0;for(const p of [1,10,100,1000]){carry=Math.floor(a/p)%10+Math.floor(b/p)%10+carry>=10?1:0;count+=carry;}return count;}
export function classify(s:LearningSample):LearningKind|null{
 const answer=s.operation==='+'?s.a+s.b:s.a-s.b;
 if(![s.a,s.b,answer].every(learningValue)||!['+','-'].includes(s.operation))return null;
 const digits=Math.min(3,Math.max(s.digits??1,precision(s.a),precision(s.b))) as 1|2|3;
 const changes=s.operation==='+'?carries(s.a,s.b):borrowingPlaces(s.a,s.b).length;
 const mode:LearningMode=changes>=2?'chain':changes?'regroup':precision(s.a)!==precision(s.b)?'align':'basic';
 return (s.operation==='+'?'add':'sub')+'-'+digits+'-'+mode as LearningKind;
}
export function kindLabel(kind:LearningKind){const p=kindParts(kind)!;return (p.digits===3?'코인 세 자리':p.digits===2?'소수 두 자리':'소수 한 자리')+' '+(p.operation==='+'?'덧셈':'뺄셈')+' · '+({basic:'같은 자리 계산',regroup:p.operation==='+'?'받아올림':'받아내림',chain:p.operation==='+'?'연속 받아올림':'연속 받아내림',align:'서로 다른 자릿수'}[p.mode]);}
export function loadLearning():LearningProfile{
 try{const raw=JSON.parse(localStorage.getItem(KEY)||'null');if(raw?.version!==1)return empty();const p=empty();
  for(const [kind,c] of Object.entries(raw.counts??{}) as [LearningKind,LearningCount][]){if(!kindParts(kind)||!c)continue;p.counts[kind]={wrong:bounded(c.wrong),help:bounded(c.help),correct:bounded(c.correct)};}
  for(const [id,n] of Object.entries(raw.seen??{})){if(id.length<=250&&Number.isSafeInteger(n)&&Number(n)>=0)p.seen[id]=Number(n);}return p;
 }catch{return empty();}
}
function bounded(n:number){return Number.isSafeInteger(n)&&n>=0?Math.min(n,1000000):0;}
export function recordLearning(s:LearningSample,outcome:keyof LearningCount,id?:string,total?:number){
 const kind=classify(s);if(!kind)return false;const p=loadLearning(),evidence=id?id+':'+outcome:'',before=evidence?p.seen[evidence]??0:0;
 const target=total===undefined?(outcome==='wrong'?before+1:1):Math.max(0,Math.floor(total)),amount=evidence?Math.max(0,target-before):1;
 if(!amount)return true;const c=p.counts[kind]??{wrong:0,help:0,correct:0};c[outcome]=bounded(c[outcome]+amount);p.counts[kind]=c;if(evidence)p.seen[evidence]=target;
 try{localStorage.setItem(KEY,JSON.stringify(p));return true;}catch{return false;}
}
export function practiceWeight(c:LearningCount){return Math.max(0,Math.min(30,(c.wrong*4+c.help*2-c.correct)/(1+c.correct*.2)));}
export interface HistoricalLearningRecord{matchId:string;hostUid:string;guestUid:string;side:0|1;wrongQuestions:{id:string;a:number;b:number;operation:FusionOperation;kind:string;level:number;attempts:number}[];}
export function importLearningRecords(records:HistoricalLearningRecord[]){
 for(const r of records){if(!r||!Array.isArray(r.wrongQuestions)||typeof r.matchId!=='string')continue;const uid=r.side===0?r.hostUid:r.guestUid;
  for(const q of r.wrongQuestions){if(!q||!Number.isSafeInteger(q.attempts)||q.attempts<1)continue;recordLearning({a:q.a,b:q.b,operation:q.operation,context:q.kind==='tower'?'money':'wall',digits:q.kind==='tower'&&q.level>=4?3:undefined},'wrong',r.matchId+':'+uid+':'+q.id,q.attempts);}
 }
}
export function importPendingLearning(){try{const rows=JSON.parse(localStorage.getItem('decimal-duel-pending-results-v1')||'[]');if(Array.isArray(rows))importLearningRecords(rows);}catch{/* A malformed old cache never prevents a worksheet. */}}
