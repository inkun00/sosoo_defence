import type {DuelState,Side} from './duel';
import {parseMoney} from '../towers';
export interface WrongQuestion {id:string;kind:'tower'|'fusion';a:number;b:number;operation:'+'|'-';submitted:string;correct:number;level:number;elapsed:number;attempts:number;}
export interface MatchRecord {version:1;matchId:string;hostUid:string;guestUid:string;side:Side;outcome:'win'|'loss'|'draw';endedAt:number;duration:number;solved:number;purchases:number;wrongQuestions:WrongQuestion[];}
export interface Progress {wins:number;losses:number;draws:number;experience:number;level:number;}
export const emptyProgress=():Progress=>({wins:0,losses:0,draws:0,experience:0,level:1});
// Level 2 requires 100 XP, level 3 a total of 300, level 4 a total of 600.
export function accountLevel(experience:number){return Math.floor((1+Math.sqrt(1+8*experience/100))/2);}
export function matchExperience(r:MatchRecord){return r.duration<10?0:(r.outcome==='win'?100:r.outcome==='loss'?40:60)+Math.min(30,r.solved)*5+Math.min(20,r.purchases)*5;}
export function progressAfter(p:Progress,r:MatchRecord):Progress{const experience=p.experience+matchExperience(r);return {wins:p.wins+Number(r.outcome==='win'),losses:p.losses+Number(r.outcome==='loss'),draws:p.draws+Number(r.outcome==='draw'),experience,level:accountLevel(experience)};}
export function finishedRecord(s:DuelState,side:Side,matchId:string):MatchRecord|null{
 if(s.status!=='finished'||!s.startedAt||!s.players[1])return null;
 const p=s.players[side]!;return {version:1,matchId,hostUid:s.players[0].uid,guestUid:s.players[1].uid,side,outcome:s.winner===null?'draw':s.winner===side?'win':'loss',endedAt:Date.now(),duration:Math.min(300,Math.max(0,s.elapsed)),solved:p.solved,purchases:p.purchases??0,wrongQuestions:structuredClone(p.wrongQuestions??[])};
}
export function validRecord(value:unknown,uid:string,now=Date.now()):MatchRecord {
 const r=value as MatchRecord;
 const integer=(n:unknown,max:number)=>Number.isSafeInteger(n)&&Number(n)>=0&&Number(n)<=max;
 const uidOK=(v:unknown)=>typeof v==='string'&&/^[a-zA-Z0-9_-]{1,128}$/.test(v);
 if(!r||r.version!==1||typeof r.matchId!=='string'||!/^[a-f0-9-]{36}$/.test(r.matchId)||!uidOK(r.hostUid)||!uidOK(r.guestUid)||r.hostUid===r.guestUid||![0,1].includes(r.side)||(r.side===0?r.hostUid:r.guestUid)!==uid||!['win','loss','draw'].includes(r.outcome)||!integer(r.endedAt,now+120000)||r.endedAt<1577836800000||!Number.isFinite(r.duration)||r.duration<0||r.duration>300||!integer(r.solved,1600)||!integer(r.purchases,1600)||!Array.isArray(r.wrongQuestions)||r.wrongQuestions.length>1600)throw Error('경기 종료 기록의 형식을 확인해 주세요.');
 if(new Set(r.wrongQuestions.map(q=>q?.id)).size!==r.wrongQuestions.length)throw Error('오답 문항이 중복되어 있어요.');
 for(const q of r.wrongQuestions){if(!q||typeof q.id!=='string'||q.id.length>80||!['tower','fusion'].includes(q.kind)||!integer(q.a,1e9)||!integer(q.b,1e9)||!['+','-'].includes(q.operation)||typeof q.submitted!=='string'||q.submitted.length>12||!Number.isSafeInteger(q.correct)||q.correct!==(q.operation==='+'?q.a+q.b:q.a-q.b)||parseMoney(q.submitted)===q.correct||!integer(q.level,10)||q.level<1||!Number.isFinite(q.elapsed)||q.elapsed<0||q.elapsed>300||!integer(q.attempts,10000)||q.attempts<1)throw Error('오답 문항의 형식을 확인해 주세요.');}
 // Store only these fields, never a submitted battle snapshot or account stats.
 return {version:1,matchId:r.matchId,hostUid:r.hostUid,guestUid:r.guestUid,side:r.side,outcome:r.outcome,endedAt:r.endedAt,duration:r.duration,solved:r.solved,purchases:r.purchases,wrongQuestions:r.wrongQuestions.map(q=>({id:q.id,kind:q.kind,a:q.a,b:q.b,operation:q.operation,submitted:q.submitted,correct:q.correct,level:q.level,elapsed:q.elapsed,attempts:q.attempts}))};
}
