import {validateCampaignCompletion,type CampaignCompletion} from './campaign-score';

export const ADVENTURE_HALL_LIMIT=50;
export interface AdventureHallEntry {rank:number;nickname:string;score:number;isMe:boolean;}
export interface AdventureHallData {entries:AdventureHallEntry[];me:AdventureHallEntry|null;limit:50;}
export interface AdventureHallRegistration {saved:true;duplicate:boolean;score:number;bestScore:number;rank:number;}
export interface AdventureHallSubmission {nickname:string;snapshot:CampaignCompletion;}

/** Store the player's chosen name, without hidden controls or invisible marks. */
export function adventureNickname(value:unknown):string {
 if(typeof value!=='string'||/[\p{Cc}\p{Cf}]/u.test(value))throw Error('닉네임은 숨은 문자 없이 2~16글자로 입력해 주세요.');
 const nickname=value.normalize('NFC').replace(/\s+/gu,' ').trim(),length=Array.from(nickname).length;
 if(length<2||length>16)throw Error('닉네임은 2~16글자로 입력해 주세요.');
 return nickname;
}

export function validAdventureSubmission(value:unknown):AdventureHallSubmission {
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('명예의 전당 등록 자료를 확인해 주세요.');
 const data=value as Record<string,unknown>,nickname=adventureNickname(data.nickname),snapshot=validateCampaignCompletion(data.snapshot);
 if(!snapshot)throw Error('11스테이지를 클리어한 누적 점수 기록이 필요해요.');
 return {nickname,snapshot};
}

function row(value:unknown):AdventureHallEntry {
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('명예의 전당 순위 자료를 확인할 수 없어요.');
 const data=value as Record<string,unknown>;
 if(!Number.isSafeInteger(data.rank)||(data.rank as number)<1||!Number.isSafeInteger(data.score)||(data.score as number)<0||typeof data.isMe!=='boolean')throw Error('명예의 전당 순위 자료를 확인할 수 없어요.');
 const nickname=adventureNickname(data.nickname);
 if(nickname!==data.nickname)throw Error('명예의 전당 닉네임 자료를 확인할 수 없어요.');
 return {rank:data.rank as number,nickname,score:data.score as number,isMe:data.isMe};
}

/** Copy only public fields across the server/UI boundary. */
export function parseAdventureHall(value:unknown):AdventureHallData {
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('명예의 전당 순위 자료를 확인할 수 없어요.');
 const data=value as Record<string,unknown>;
 if(data.limit!==ADVENTURE_HALL_LIMIT||!Array.isArray(data.entries)||data.entries.length>ADVENTURE_HALL_LIMIT)throw Error('명예의 전당 순위 자료를 확인할 수 없어요.');
 const entries=data.entries.map(row),me=data.me===null?null:row(data.me);
 let previous:number|null=null,rank=0,mine:AdventureHallEntry|null=null;
 entries.forEach((entry,index)=>{
  if(previous!==null&&entry.score>previous)throw Error('명예의 전당 점수 정렬을 확인할 수 없어요.');
  if(previous!==entry.score)rank=index+1;
  if(entry.rank!==rank)throw Error('명예의 전당 공동 순위를 확인할 수 없어요.');
  if(entry.isMe){if(mine)throw Error('내 순위 자료가 중복됐어요.');mine=entry;}
  previous=entry.score;
 });
 if(me&&!me.isMe)throw Error('내 순위 자료를 확인할 수 없어요.');
 if(mine&&(!me||JSON.stringify(mine)!==JSON.stringify(me)))throw Error('내 순위 자료가 일치하지 않아요.');
 return {entries,me,limit:ADVENTURE_HALL_LIMIT};
}

export function parseAdventureRegistration(value:unknown):AdventureHallRegistration {
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('명예의 전당 저장 응답을 확인할 수 없어요. 다시 시도해 주세요.');
 const data=value as Record<string,unknown>;
 if(data.saved!==true||typeof data.duplicate!=='boolean'||!Number.isSafeInteger(data.score)||(data.score as number)<0||!Number.isSafeInteger(data.bestScore)||(data.bestScore as number)<(data.score as number)||!Number.isSafeInteger(data.rank)||(data.rank as number)<1)throw Error('명예의 전당 저장 응답을 확인할 수 없어요. 다시 시도해 주세요.');
 return {saved:true,duplicate:data.duplicate,score:data.score as number,bestScore:data.bestScore as number,rank:data.rank as number};
}
