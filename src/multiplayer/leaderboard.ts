import {accountLevel} from './records';

export interface LeaderboardEntry {
 rank:number|null;
 name:string;
 level:number;
 experience:number;
 isMe:boolean;
}
export interface DuelLeaderboard {
 entries:LeaderboardEntry[];
 me:LeaderboardEntry;
 limit:50;
}

const invalid=()=>Error('순위 자료를 확인하지 못했어요. 다시 불러와 주세요.');
function entry(value:unknown,ranked:boolean):LeaderboardEntry {
 if(!value||typeof value!=='object')throw invalid();
 const row=value as Record<string,unknown>,xp=row.experience;
 if(typeof row.name!=='string'||!row.name.trim()||row.name.length>16||typeof row.isMe!=='boolean'||!Number.isSafeInteger(xp)||Number(xp)<0||!Number.isSafeInteger(row.level)||row.level!==accountLevel(Number(xp))||!(row.rank===null&&!ranked||Number.isSafeInteger(row.rank)&&Number(row.rank)>0))throw invalid();
 // Keep only the fields the popup needs; account identifiers never reach its HTML.
 return {rank:row.rank as number|null,name:row.name,level:row.level as number,experience:xp as number,isMe:row.isMe};
}

export function parseDuelLeaderboard(value:unknown):DuelLeaderboard {
 if(!value||typeof value!=='object')throw invalid();
 const data=value as Record<string,unknown>;
 if(data.limit!==50||!Array.isArray(data.entries)||data.entries.length>50)throw invalid();
 const entries=data.entries.map(row=>entry(row,true)),me=entry(data.me,false);
 if(!me.isMe||entries.filter(row=>row.isMe).length>1)throw invalid();
 for(let i=0;i<entries.length;i++){
  const row=entries[i],previous=entries[i-1];
  if(previous&&(row.level>previous.level||row.level===previous.level&&row.experience>previous.experience))throw invalid();
  const tied=previous&&row.level===previous.level&&row.experience===previous.experience;
  if(row.rank!==(tied?previous.rank:i+1))throw invalid();
  if(row.isMe&&(row.rank!==me.rank||row.name!==me.name||row.level!==me.level||row.experience!==me.experience))throw invalid();
 }
 return {entries,me,limit:50};
}

export function escapeLeaderboardText(value:string){
 return value.replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]!));
}
