import {createHmac,randomBytes} from 'node:crypto';
import {relayURLs,RELAY_TTL_SECONDS,type RelayConfiguration} from '../../src/multiplayer/relay';

/** coturn TURN REST authentication: timestamped username and HMAC password. */
export function issueRelayConfiguration(urls:unknown,sharedSecret:unknown,now=Date.now(),nonce=randomBytes(16).toString('hex')):RelayConfiguration{
 const servers=relayURLs(urls);
 if(!servers.length||typeof sharedSecret!=='string'||sharedSecret.length<32)return {available:false,expiresAt:0,iceServers:[]};
 if(!Number.isSafeInteger(now)||now<0||!/^[a-f0-9]{32}$/.test(nonce))throw Error('중계 설정을 확인해 주세요.');
 const expires=Math.floor(now/1000)+RELAY_TTL_SECONDS,username=`${expires}:${nonce}`;
 const credential=createHmac('sha1',sharedSecret).update(username).digest('base64');
 return {available:true,expiresAt:expires*1000,iceServers:[{urls:servers,username,credential}]};
}
