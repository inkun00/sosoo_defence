import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {issueRelayConfiguration} from '../functions/src/relay-credentials';
import {relayURLs,RELAY_TTL_SECONDS,validRelayConfiguration} from '../src/multiplayer/relay';
import {peerConfiguration,resolvePeerConfiguration} from '../src/multiplayer/peer-network';

const NOW=1791500000123,SECRET='test-only-signing-secret-32-characters',NONCE='0123456789abcdef0123456789abcdef';
const URLS=['turn:relay.example:3478?transport=udp','turn:relay.example:3478?transport=tcp','turns:relay.example:443?transport=tcp'];
function issued(now=NOW){return issueRelayConfiguration(URLS,SECRET,now,NONCE);}
function urls(config:RTCConfiguration){return config.iceServers!.flatMap(server=>typeof server.urls==='string'?[server.urls]:server.urls);}

test('TURN REST credentials verify against coturn HMAC-SHA1 and expire after the bounded session',()=>{
 const response=issued(),server=response.iceServers[0],expiry=Math.floor(NOW/1000)+RELAY_TTL_SECONDS;
 assert.equal(response.expiresAt,expiry*1000);assert.equal(server.username,`${expiry}:${NONCE}`);
 assert.equal(server.credential,createHmac('sha1',SECRET).update(`${expiry}:${NONCE}`).digest('base64'));
 assert.deepEqual(server.urls,URLS);assert.equal(JSON.stringify(response).includes(SECRET),false);
 assert.ok(validRelayConfiguration(response,NOW));assert.equal(validRelayConfiguration(response,response.expiresAt),null);
});

test('TURN is disabled without complete server configuration and emits no partial credentials',()=>{
 for(const [list,secret] of [[[],SECRET],[URLS,''],[URLS,undefined],[['https://wrong.example'],SECRET],[URLS,'short-secret']]){
  assert.deepEqual(issueRelayConfiguration(list,secret,NOW,NONCE),{available:false,expiresAt:0,iceServers:[]});
 }
});

test('session credentials are distinct even when issued to the same player in the same second',()=>{
 const first=issueRelayConfiguration(URLS,SECRET,NOW),second=issueRelayConfiguration(URLS,SECRET,NOW);
 assert.notEqual(first.iceServers[0].username,second.iceServers[0].username);
 assert.notEqual(first.iceServers[0].credential,second.iceServers[0].credential);
});

test('TURN URL parser rejects credential injection, unsupported transports, malformed hosts and excessive lists',()=>{
 for(const invalid of ['https://relay.example','turn:user:password@relay.example','turn://relay.example','turn:relay.example:0','turn:relay.example:65536','turn:relay.example?transport=quic','turns:relay.example?transport=udp','turn:relay..example','turn:-relay.example','turn:[::::]','turn:relay.example\n'])assert.deepEqual(relayURLs([invalid]),[],invalid);
 assert.deepEqual(relayURLs(Array(9).fill(URLS[0])),[]);
 assert.deepEqual(relayURLs(['turn:[2001:db8::1]:3478','turn:127.0.0.1:3478']),['turn:[2001:db8::1]:3478','turn:127.0.0.1:3478']);
 assert.deepEqual(relayURLs([URLS[0],URLS[0]]),[URLS[0]]);
});

test('automatic ICE includes both direct and relay routes while configuration copies remain independent',()=>{
 const response=issued(),first=peerConfiguration(response,NOW),second=peerConfiguration(response,NOW);
 assert.equal(first.iceTransportPolicy,'all');assert.equal(first.iceServers!.length,3);
 assert.deepEqual(urls(first).slice(2),URLS);
 (first.iceServers![2].urls as string[])[0]='turn:changed.invalid';
 assert.deepEqual(urls(second).slice(2),URLS);assert.deepEqual(response.iceServers[0].urls,URLS);
});

test('expired, malformed or unreasonably long-lived credentials preserve direct/STUN fallback',()=>{
 const response=issued(),badResponses=[null,{available:false,expiresAt:0,iceServers:[]},{...response,expiresAt:NOW},{...response,expiresAt:NOW+1800001},{...response,iceServers:[{...response.iceServers[0],username:'bad\nname'}]},{...response,iceServers:[{...response.iceServers[0],credential:SECRET}]},{...response,iceServers:[{...response.iceServers[0],urls:['https://wrong.example']}]}];
 for(const invalid of badResponses)assert.deepEqual(peerConfiguration(invalid,NOW),peerConfiguration());
});

test('a failed credential endpoint never prevents a direct connection and exposes no provider error',async()=>{
 assert.deepEqual(await resolvePeerConfiguration(async()=>{throw Error('private-provider-error');}),peerConfiguration());
 assert.deepEqual(await resolvePeerConfiguration(async()=>({available:false,iceServers:[]})),peerConfiguration());
});

test('a stalled credential endpoint is bounded and a late rejection is handled',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});let reject!:(error:Error)=>void;
 const response=new Promise((_,fail)=>{reject=fail;}),resolving=resolvePeerConfiguration(()=>response,100);
 await Promise.resolve();t.mock.timers.tick(100);
 assert.deepEqual(await resolving,peerConfiguration());reject(Error('late provider error'));await Promise.resolve();
});

test('a fresh credential response reaches the connection and its timeout is cleared',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});const response=issueRelayConfiguration(URLS,SECRET,Date.now(),NONCE);
 const configuration=await resolvePeerConfiguration(async()=>response,100);
 assert.deepEqual(urls(configuration).slice(2),URLS);t.mock.timers.tick(100);
});
