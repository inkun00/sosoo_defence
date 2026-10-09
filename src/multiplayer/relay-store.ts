import {httpsCallable} from 'firebase/functions';
import {auth,functions} from './firebase';
import {resolvePeerConfiguration} from './peer-network';

/** Credentials stay in this connection's memory, never localStorage or logs. */
export function loadPeerConfiguration(){
 return resolvePeerConfiguration(async()=>{
  if(!functions||!auth?.currentUser)return null;
  return (await httpsCallable<Record<string,never>,unknown>(functions,'duelIce',{timeout:5000})({})).data;
 });
}
