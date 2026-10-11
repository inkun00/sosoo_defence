import type {DuelState,Side} from './duel';
import {parseMoney} from '../towers';
export interface WrongQuestion {id:string;kind:'tower'|'fusion';a:number;b:number;operation:'+'|'-';submitted:string;correct:number;level:number;elapsed:number;attempts:number;}
export interface MatchRecord {version:1;matchId:string;hostUid:string;guestUid:string;side:Side;outcome:'win'|'loss'|'draw';endedAt:number;duration:number;solved:number;purchases:number;wrongQuestions:WrongQuestion[];opponentType?:'computer'|'player';opponentLevel?:number;}
export interface Progress {wins:number;losses:number;draws:number;experience:number;level:number;}
export const emptyProgress=():Progress=>({wins:0,losses:0,draws:0,experience:0,level:1});
export const ACCOUNT_LEVEL_MAX=10;
const count=(value:unknown)=>typeof value==='number'&&Number.isSafeInteger(value)&&value>=0?value:0;
const level=(value:number)=>Math.max(1,Math.min(ACCOUNT_LEVEL_MAX,Number.isFinite(value)?Math.floor(value):1));
// Level 2 requires 100 XP, level 3 a total of 300, level 4 a total of 600.
export function accountLevel(experience:number){const xp=count(experience);return level(Math.floor((1+Math.sqrt(1+8*xp/100))/2));}
export function accountLevelThreshold(value:number){const n=level(value);return 100*n*(n-1)/2;}
export function normalizeProgress(value:unknown):Progress{const p=value as Partial<Progress>|null|undefined,experience=count(p?.experience);return{wins:count(p?.wins),losses:count(p?.losses),draws:count(p?.draws),experience,level:accountLevel(experience)};}
export function opponentUid(r:MatchRecord){return r.side===0?r.guestUid:r.hostUid;}
// The authoritative local peer uses these reserved opponents. Keeping this
// table free of browser storage also lets the callable validate CPU identity.
const computerIds=['moss-apprentice','lantern-scout','ember-smith','frost-sage','lightning-alchemist','rune-knight','crystal-oracle','shadow-warden','storm-dragon-sage','archmage'] as const;
export function computerOpponentLevel(uid:string):number|null{const index=computerIds.findIndex(id=>uid==='computer-'+id);return index<0?null:index+1;}
export function matchExperience(r:MatchRecord,opponent=r.opponentLevel??1){return r.duration<10?0:(r.outcome==='win'?100*level(opponent):r.outcome==='loss'?40:60)+Math.min(30,count(r.solved))*5+Math.min(20,count(r.purchases))*5;}
export function progressAfter(value:Progress,r:MatchRecord):Progress{const p=normalizeProgress(value),experience=Math.min(Number.MAX_SAFE_INTEGER,p.experience+matchExperience(r));return {wins:Math.min(Number.MAX_SAFE_INTEGER,p.wins+Number(r.outcome==='win')),losses:Math.min(Number.MAX_SAFE_INTEGER,p.losses+Number(r.outcome==='loss')),draws:Math.min(Number.MAX_SAFE_INTEGER,p.draws+Number(r.outcome==='draw')),experience,level:accountLevel(experience)};}
export function finishedRecord(s:DuelState,side:Side,matchId:string):MatchRecord|null{
 if(s.status!=='finished'||!s.startedAt||!s.players[1])return null;
 const p=s.players[side]!,opponent=s.players[(1-side) as Side]!,computerLevel=computerOpponentLevel(opponent.uid);return {version:1,matchId,hostUid:s.players[0].uid,guestUid:s.players[1].uid,side,outcome:s.winner===null?'draw':s.winner===side?'win':'loss',endedAt:Date.now(),duration:Math.min(300,Math.max(0,s.elapsed)),solved:p.solved,purchases:p.purchases??0,wrongQuestions:structuredClone(p.wrongQuestions??[]),opponentType:computerLevel===null?'player':'computer',opponentLevel:computerLevel??level(opponent.accountLevel)};
}
export function validRecord(value:unknown,uid:string,now=Date.now()):MatchRecord {
 const r=value as MatchRecord;
 const integer=(n:unknown,max:number)=>Number.isSafeInteger(n)&&Number(n)>=0&&Number(n)<=max;
 const uidOK=(v:unknown)=>typeof v==='string'&&/^[a-zA-Z0-9_-]{1,128}$/.test(v);
 if(!r||r.version!==1||typeof r.matchId!=='string'||!uidOK(r.hostUid)||!uidOK(r.guestUid)||r.hostUid===r.guestUid||![0,1].includes(r.side)||(r.side===0?r.hostUid:r.guestUid)!==uid||!['win','loss','draw'].includes(r.outcome)||!integer(r.endedAt,now+120000)||r.endedAt<1577836800000||!Number.isFinite(r.duration)||r.duration<0||r.duration>300||!integer(r.solved,1600)||!integer(r.purchases,1600)||!Array.isArray(r.wrongQuestions)||r.wrongQuestions.length>1600)throw Error('경기 종료 기록의 형식을 확인해 주세요.');
 const computerLevel=computerOpponentLevel(opponentUid(r)),computer=computerLevel!==null;
 const localId=r.matchId.match(/^computer-(\d{13})-(\d{1,10})$/);
 const validLocalId=computer&&localId&&integer(Number(localId[1]),now+120000)&&Number(localId[1])>=1577836800000&&integer(Number(localId[2]),0xffffffff);
 if(!/^[a-f0-9-]{36}$/.test(r.matchId)&&!validLocalId)throw Error('경기 번호의 형식을 확인해 주세요.');
 if(r.opponentType!==undefined&&!['computer','player'].includes(r.opponentType)||r.opponentLevel!==undefined&&(!integer(r.opponentLevel,10)||r.opponentLevel<1)||computer&&(r.side!==0||r.opponentType==='player'||r.opponentLevel!==undefined&&r.opponentLevel!==computerLevel)||!computer&&r.opponentType==='computer'||computerOpponentLevel(r.hostUid)!==null)throw Error('대전 상대와 레벨을 확인해 주세요.');
 if(new Set(r.wrongQuestions.map(q=>q?.id)).size!==r.wrongQuestions.length)throw Error('오답 문항이 중복되어 있어요.');
 for(const q of r.wrongQuestions){if(!q||typeof q.id!=='string'||q.id.length>80||!['tower','fusion'].includes(q.kind)||!integer(q.a,1e9)||!integer(q.b,1e9)||!['+','-'].includes(q.operation)||typeof q.submitted!=='string'||q.submitted.length>12||!Number.isSafeInteger(q.correct)||q.correct!==(q.operation==='+'?q.a+q.b:q.a-q.b)||parseMoney(q.submitted)===q.correct||!integer(q.level,10)||q.level<1||!Number.isFinite(q.elapsed)||q.elapsed<0||q.elapsed>300||!integer(q.attempts,10000)||q.attempts<1)throw Error('오답 문항의 형식을 확인해 주세요.');}
 // Store only these fields, never a submitted battle snapshot or account stats.
 return {version:1,matchId:r.matchId,hostUid:r.hostUid,guestUid:r.guestUid,side:r.side,outcome:r.outcome,endedAt:r.endedAt,duration:r.duration,solved:r.solved,purchases:r.purchases,wrongQuestions:r.wrongQuestions.map(q=>({id:q.id,kind:q.kind,a:q.a,b:q.b,operation:q.operation,submitted:q.submitted,correct:q.correct,level:q.level,elapsed:q.elapsed,attempts:q.attempts})),...(r.opponentType===undefined?{}:{opponentType:r.opponentType}),...(r.opponentLevel===undefined?{}:{opponentLevel:r.opponentLevel})};
}
