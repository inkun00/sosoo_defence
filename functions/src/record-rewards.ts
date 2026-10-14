import {ACCOUNT_LEVEL_MAX,computerOpponentLevel,normalizeProgress,type MatchRecord} from '../../src/multiplayer/records';

export interface MatchLevels{hostLevel:number;guestLevel:number;}
const validLevel=(value:unknown):value is number=>Number.isSafeInteger(value)&&Number(value)>=1&&Number(value)<=ACCOUNT_LEVEL_MAX;

/** Freeze both levels before awarding either player's XP for this match. */
export function matchLevels(record:MatchRecord,hostProgress:unknown,guestProgress:unknown,previous?:Partial<MatchLevels>|null):MatchLevels{
 if(previous?.hostLevel!==undefined||previous?.guestLevel!==undefined){
  if(!validLevel(previous.hostLevel)||!validLevel(previous.guestLevel))throw Error('경기 상대의 저장된 레벨을 확인할 수 없어요.');
  return{hostLevel:previous.hostLevel,guestLevel:previous.guestLevel};
 }
 return{hostLevel:normalizeProgress(hostProgress).level,guestLevel:computerOpponentLevel(record.guestUid)??normalizeProgress(guestProgress).level};
}

/** Client PvP level hints never decide the persisted experience reward. */
export function rewardedRecord(record:MatchRecord,levels:MatchLevels):MatchRecord{
 return{...record,opponentType:computerOpponentLevel(record.guestUid)===null?'player':'computer',opponentLevel:record.side===0?levels.guestLevel:levels.hostLevel};
}
