import {httpsCallable} from 'firebase/functions';
import {auth,functions,recordsReady} from './firebase';
import {parseDuelLeaderboard,type DuelLeaderboard} from './leaderboard';

/** Fetch server-ranked account progress; client scores never enter the ranking. */
export async function loadDuelLeaderboard(uid:string):Promise<DuelLeaderboard>{
 if(auth?.currentUser?.uid!==uid)throw Error('같은 계정으로 로그인해 주세요.');
 if(!functions||!recordsReady)throw Error('명예의 전당 연결을 준비하고 있어요. 잠시 뒤 다시 시도해 주세요.');
 const reply=await httpsCallable<Record<string,never>,unknown>(functions,'duelLeaderboard',{timeout:12000})({});
 if(auth?.currentUser?.uid!==uid)throw Error('계정이 변경됐어요. 명예의 전당을 다시 열어 주세요.');
 return parseDuelLeaderboard(reply.data);
}
