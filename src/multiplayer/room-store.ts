import {httpsCallable} from 'firebase/functions';
import {functions,lobbyReady} from './firebase';
import {ListedRoom} from './rooms';
export async function roomRequest<T=Record<string,any>>(data:Record<string,unknown>):Promise<T>{
 if(!functions||!lobbyReady)throw Error('운영 방 목록 연결을 준비하고 있어요.');
 return (await httpsCallable<Record<string,unknown>,T>(functions,'duelRoom',{timeout:15000})(data)).data;
}
export function listRooms(){return roomRequest<{now:number;rooms:ListedRoom[]}>({action:'list'});}
