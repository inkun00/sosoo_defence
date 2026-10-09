import {test,beforeEach,afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {HostPeer} from '../src/multiplayer/peer';
import {DUEL_MAPS} from '../src/multiplayer/duel-maps';
import {advanceDuel,DUEL_PREPARATION_SECONDS,DUEL_SECONDS,duelScore,type DuelState,type Side} from '../src/multiplayer/duel';
import {numberText} from '../src/math';
import {decimalBoard} from '../src/multiplayer/decimal-boards';
import {additionSlots} from '../src/multiplayer/computer-peer';

// This is a wire-contract test. These fakes never gather real network
// candidates or establish a real WebRTC transport.
const SDP='v=0\r\nm=application 9 UDP/DTLS/SCTP webrtc-datachannel\r\na=candidate:1 1 udp 2122260223 192.0.2.1 50000 typ host\r\n';
class FakeChannel{
 readyState:RTCDataChannelState='connecting';bufferedAmount=0;
 onopen:(()=>void)|null=null;onclose:(()=>void)|null=null;onerror:(()=>void)|null=null;onmessage:((event:{data:string})=>void)|null=null;
 partner:FakeChannel|null=null;sent:string[]=[];
 send(data:string){assert.equal(this.readyState,'open');this.sent.push(data);this.partner?.receive(data);}
 receive(data:string){this.onmessage?.({data});}
 open(){this.readyState='open';this.onopen?.();}
 close(){if(this.readyState==='closed')return;this.readyState='closed';this.onclose?.();}
}
class FakePeerConnection{
 static instances:FakePeerConnection[]=[];
 iceGatheringState:RTCIceGatheringState='complete';connectionState:RTCPeerConnectionState='new';
 localDescription:(RTCSessionDescriptionInit&{toJSON:()=>RTCSessionDescriptionInit})|null=null;
 remoteDescription:RTCSessionDescriptionInit|null=null;
 ondatachannel:((event:{channel:RTCDataChannel})=>void)|null=null;onconnectionstatechange:(()=>void)|null=null;
 channels:FakeChannel[]=[];listeners=new Set<()=>void>();
 constructor(readonly config:RTCConfiguration){FakePeerConnection.instances.push(this);}
 createDataChannel(){const channel=new FakeChannel();this.channels.push(channel);return channel as unknown as RTCDataChannel;}
 async createOffer():Promise<RTCSessionDescriptionInit>{return{type:'offer',sdp:SDP};}
 async createAnswer():Promise<RTCSessionDescriptionInit>{return{type:'answer',sdp:SDP};}
 async setLocalDescription(value:RTCSessionDescriptionInit){this.localDescription={...value,toJSON:()=>({...value})};}
 async setRemoteDescription(value:RTCSessionDescriptionInit){this.remoteDescription={...value};}
 addEventListener(_type:string,listener:()=>void){this.listeners.add(listener);}
 removeEventListener(_type:string,listener:()=>void){this.listeners.delete(listener);}
 deliverChannel(channel:FakeChannel){this.channels.push(channel);this.ondatachannel?.({channel:channel as unknown as RTCDataChannel});}
 changeConnection(state:RTCPeerConnectionState){this.connectionState=state;this.onconnectionstatechange?.();}
 close(){this.connectionState='closed';this.onconnectionstatechange?.();}
}

const peers:HostPeer[]=[];
let originalPeerConnection:PropertyDescriptor|undefined;
beforeEach(()=>{
 originalPeerConnection=Object.getOwnPropertyDescriptor(globalThis,'RTCPeerConnection');
 Object.defineProperty(globalThis,'RTCPeerConnection',{configurable:true,writable:true,value:FakePeerConnection});
 FakePeerConnection.instances=[];
});
afterEach(()=>{
 // Every HostPeer owns a live tick timer, even before an invitation is made.
 try{for(const peer of peers.splice(0))peer.dispose();assert.ok(FakePeerConnection.instances.every(pc=>pc.connectionState==='closed'&&pc.channels.every(channel=>channel.readyState==='closed')));}
 finally{if(originalPeerConnection)Object.defineProperty(globalThis,'RTCPeerConnection',originalPeerConnection);else Reflect.deleteProperty(globalThis,'RTCPeerConnection');}
});
function peer(uid:string,rewardHeroes:string[]=[],rewardHero:string|null=null,accountLevel=1){const value=new HostPeer({uid,name:uid==='left'?'왼쪽 수호자':'오른쪽 수호자',accountLevel,rewardHeroes,rewardHero});peers.push(value);return value;}
function fakePC(value:HostPeer){return value.pc as unknown as FakePeerConnection;}
test('a credential configuration is used for this peer without changing default peers',()=>{
 const configuration:RTCConfiguration={iceTransportPolicy:'all',iceServers:[{urls:'turn:relay.example:3478?transport=udp',username:'test-session',credential:'test-only-password'}]};
 const local=new HostPeer({uid:'relay-host',name:'중계 수호자'},configuration);peers.push(local);
 assert.deepEqual(fakePC(local).config,configuration);
 const direct=peer('left');assert.equal(fakePC(direct).config.iceServers?.length,2);
});
test('a browser rejecting relay configuration still constructs the direct/STUN peer',()=>{
 class UnsupportedRelayPeer extends FakePeerConnection{
  constructor(configuration:RTCConfiguration){if(configuration.iceServers?.some(server=>String(server.urls).includes('unsupported-relay')))throw Error('provider configuration rejected');super(configuration);}
 }
 Object.defineProperty(globalThis,'RTCPeerConnection',{configurable:true,writable:true,value:UnsupportedRelayPeer});
 const local=new HostPeer({uid:'fallback-host',name:'연결 수호자'},{iceServers:[{urls:'turn:unsupported-relay.invalid'}]});peers.push(local);
 assert.equal(fakePC(local).config.iceTransportPolicy,'all');assert.equal(fakePC(local).config.iceServers?.length,2);
});
function invitation(code:string){return JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(code.slice(5)),char=>char.charCodeAt(0)))) as Record<string,unknown>;}
function encode(value:Record<string,unknown>){return'SDS1.'+btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(value))));}
function changed(code:string,change:(value:Record<string,unknown>)=>void){const value=invitation(code);change(value);return encode(value);}
async function pair(mapId?:string,rewards=false,levels:readonly[number,number]=[1,1]){
 const host=rewards?peer('left',['hero-1-0','hero-10-1'],'hero-1-0',levels[0]):peer('left',[],null,levels[0]),guest=rewards?peer('right',['hero-3-1'],'hero-3-1',levels[1]):peer('right',[],null,levels[1]),offer=await host.create(mapId),answer=await guest.join(offer);
 await host.accept(answer);
 const hostChannel=host.channel as unknown as FakeChannel,guestChannel=new FakeChannel();
 fakePC(guest).deliverChannel(guestChannel);hostChannel.partner=guestChannel;guestChannel.partner=hostChannel;
 hostChannel.open();guestChannel.open();
 return{host,guest,offer,answer,guestChannel};
}

test('all ten map ids travel through offer, echoed answer, host state and guest ready flow',async()=>{
 for(const map of DUEL_MAPS){
  const {host,guest,offer,answer}=await pair(map.id);
  assert.equal(invitation(offer).mapId,map.id);assert.equal(invitation(answer).mapId,map.id);
  assert.equal(host.mapId,map.id);assert.equal(guest.mapId,map.id);assert.equal(host.state?.mapId,map.id);assert.equal(guest.state?.mapId,map.id);
  assert.equal(fakePC(host).remoteDescription?.type,'answer');assert.equal(fakePC(guest).remoteDescription?.type,'offer');
  assert.equal((await host.send({type:'ready'})).ok,true);assert.equal((await guest.send({type:'ready'})).ok,true);
  assert.equal(host.state?.status,'preparing');assert.equal(guest.state?.status,'preparing');assert.equal(guest.state?.mapId,map.id);
 }
});

test('guest identity carries its own account level and host snapshots preserve personal addition rounds in both host orderings',async()=>{
 for(const levels of [[1,8],[8,1]] as const){
  const {host,guest,offer,answer}=await pair(DUEL_MAPS[4].id,false,levels),s=host.state!;
  assert.equal(invitation(offer).rules,'score-5min-v5');assert.equal(invitation(answer).rules,'score-5min-v5');
  assert.equal((invitation(offer).host as {accountLevel:number}).accountLevel,levels[0]);
  assert.equal(s.players[0].accountLevel,levels[0]);assert.equal(s.players[1]!.accountLevel,levels[1]);assert.equal(s.learningLevel,1);
  for(const side of [0,1] as Side[])assert.deepEqual(s.players[side]!.board,decimalBoard(s.seed,0,levels[side]));
  assert.notDeepEqual(s.players[0].board,s.players[1]!.board);assert.deepEqual(guest.state?.players.map(p=>p!.board),s.players.map(p=>p!.board));
  assert.equal((await host.send({type:'ready'})).ok,true);assert.equal((await guest.send({type:'ready'})).ok,true);
  const combatStart=s.preparationStartedAt+DUEL_PREPARATION_SECONDS*1000;s.players.forEach(p=>p!.lastSeen=combatStart);advanceDuel(s,combatStart);
  assert.equal(s.status,'playing');assert.equal((await host.send({type:'tick'})).ok,true);assert.equal(guest.state?.status,'playing');
  for(let round=0;round<3;round++)for(const side of [0,1] as Side[]){
   const p=s.players[side]!,otherRound=s.players[(1-side) as Side]!.round,otherBoard=[...s.players[(1-side) as Side]!.board];
   // This wire-contract fixture skips waiting for the independent UI request throttle.
   p.lastRequest=0;const active=side===0?host:guest;
   assert.equal((await active.send({type:'fuse',operation:'+',round:p.round,slots:additionSlots(p.board)!})).ok,true);
   assert.equal(p.round,round+1);assert.deepEqual(p.board,decimalBoard(s.seed,p.round,levels[side]));assert.equal(s.players[(1-side) as Side]!.round,otherRound);assert.deepEqual(s.players[(1-side) as Side]!.board,otherBoard);
   assert.deepEqual(guest.state?.players.map(player=>[player!.accountLevel,player!.round,player!.board]),s.players.map(player=>[player!.accountLevel,player!.round,player!.board]));
   if(round===1){p.lastRequest=0;assert.equal((await active.send({type:'hatch',heroId:'hero-2-0'})).ok,true);assert.equal(p.egg,0);assert.deepEqual(guest.state?.players[side]?.board,p.board);}
  }
 }
});

test('the host-authoritative ready exchange synchronizes both selected heroes without extra escorts',async()=>{
 const {host,guest}=await pair(DUEL_MAPS[4].id,true);
 assert.equal((await host.send({type:'ready',heroId:'hero-10-1'})).ok,true);
 assert.equal(host.state?.enemies.length,0,'one player being ready does not spawn units before both are ready');
 assert.equal((await guest.send({type:'ready',heroId:'hero-3-1'})).ok,true);
 assert.equal(host.state?.status,'preparing');assert.equal(guest.state?.status,'preparing');
 assert.equal(host.state?.players[0].rewardHero,'hero-10-1');assert.equal(host.state?.players[1]?.rewardHero,'hero-3-1');
 assert.ok(host.state?.players.every(player=>player?.rewardUsed));
 assert.deepEqual(guest.state?.enemies,host.state?.enemies);
 assert.deepEqual(host.state?.enemies.filter(enemy=>enemy.rewardSummon).map(enemy=>[enemy.owner,enemy.hero]),[[0,'hero-10-1'],[1,'hero-3-1']]);
 assert.equal(host.state?.enemies.length,2);assert.equal(host.state?.enemies.filter(enemy=>!enemy.hero).length,0);
});

test('host scoring survives private wrong-record filtering and both peers receive the same timeout winner',async()=>{
 const {host,guest}=await pair(DUEL_MAPS[4].id),s=host.state!;
 await host.send({type:'ready'});await guest.send({type:'ready'});
 for(const side of [0,1] as Side[]){
  const active=side===0?host:guest,p=s.players[side]!;p.lastRequest=0;
  assert.ok((await active.send({type:'prepare-quote',typeId:'basic'})).ok);
  const q=p.quote!;
  if(side===1){for(let i=0;i<2;i++){p.lastRequest=0;assert.equal((await active.send({type:'answer',nonce:q.nonce,answer:'0'})).ok,false);}}
  p.lastRequest=0;assert.ok((await active.send({type:'answer',nonce:q.nonce,answer:numberText(q.before-q.cost)})).ok);
 }
 assert.deepEqual(s.players.map(p=>duelScore(p!)),[100,33]);
 assert.deepEqual(guest.state!.players.map(p=>duelScore(p!)),[100,33]);
 assert.equal(guest.state!.players[0].wrongQuestions.length,0);
 assert.equal(guest.state!.players[1]!.wrongQuestions[0].attempts,2);
 const start=s.preparationStartedAt+DUEL_PREPARATION_SECONDS*1000;
 s.players.forEach(p=>p!.lastSeen=start);advanceDuel(s,start);
 s.elapsed=DUEL_SECONDS-.05;s.updatedAt=start+(DUEL_SECONDS-.05)*1000;
 s.players[0].flame=1000;s.players[1]!.flame=9000;
 const deadline=start+DUEL_SECONDS*1000;s.players.forEach(p=>p!.lastSeen=deadline);advanceDuel(s,deadline);
 assert.equal(s.status,'finished');assert.equal(s.winner,0);assert.equal(s.elapsed,DUEL_SECONDS);
 await host.send({type:'tick'});
 assert.equal(guest.state!.status,'finished');assert.equal(guest.state!.winner,0);
 assert.deepEqual(guest.state!.players.map(p=>duelScore(p!)),[100,33]);
 assert.equal(guest.state!.reason,s.reason);
});

test('new preparation invitations without a map keep the default road when both peers agree',async()=>{
 const {host,guest,offer,answer}=await pair();
 assert.equal(Object.hasOwn(invitation(offer),'mapId'),false);assert.equal(Object.hasOwn(invitation(answer),'mapId'),false);
 assert.equal(host.mapId,undefined);assert.equal(guest.mapId,undefined);assert.equal(guest.state?.mapId,undefined);
 assert.equal(guest.state?.players[1]?.uid,'right');
});

test('a selected-map host rejects old missing-map and different-map answers before accepting the correct one',async()=>{
 const host=peer('left'),guest=peer('right'),offer=await host.create(DUEL_MAPS[0].id),answer=await guest.join(offer);
 const missing=changed(answer,value=>{delete value.mapId;}),different=changed(answer,value=>{value.mapId=DUEL_MAPS[1].id;});
 await assert.rejects(host.accept(missing),/같은 맵/);await assert.rejects(host.accept(different),/같은 맵/);
 assert.equal(fakePC(host).remoteDescription,null,'failed map agreement cannot commit a remote answer');
 await host.accept(answer);assert.equal(fakePC(host).remoteDescription?.type,'answer');assert.equal(host.state?.mapId,DUEL_MAPS[0].id);
});

test('unknown map ids in create, offer and answer are rejected before RTC descriptions are committed',async()=>{
 const host=peer('left'),guest=peer('right');await assert.rejects(host.create('unknown-map'),/대전 맵/);
 assert.equal(host.id,'');assert.equal(fakePC(host).localDescription,null);
 const offer=await host.create(DUEL_MAPS[2].id),badOffer=changed(offer,value=>{value.mapId='unknown-map';});
 await assert.rejects(guest.join(badOffer),/접속 코드/);assert.equal(fakePC(guest).remoteDescription,null);assert.equal(guest.id,'');
 const answer=await guest.join(offer),badAnswer=changed(answer,value=>{value.mapId='unknown-map';});
 await assert.rejects(host.accept(badAnswer),/접속 코드/);assert.equal(fakePC(host).remoteDescription,null);
 await host.accept(answer);assert.equal(fakePC(host).remoteDescription?.type,'answer');
});

test('guest snapshots accept only the agreed map and preserve the last valid state after mismatches',async()=>{
 const {host,guest,guestChannel}=await pair(DUEL_MAPS[6].id);let emitted=0;guest.onState=()=>{emitted++;};
 const snapshot=structuredClone(host.state!) as DuelState;snapshot.revision=20;
 guestChannel.receive(JSON.stringify({kind:'state',rules:'score-5min-v5',id:host.id,state:snapshot}));assert.equal(guest.state?.revision,20);assert.equal(emitted,1);
 const baseline=guest.state;
 for(const mapId of [DUEL_MAPS[7].id,undefined,'unknown-map']){
  const wrong=structuredClone(snapshot);wrong.revision=1000;wrong.mapId=mapId;
  guestChannel.receive(JSON.stringify({kind:'state',rules:'score-5min-v5',id:host.id,state:wrong}));assert.equal(guest.state,baseline);assert.equal(emitted,1);
 }
 const fresh=structuredClone(snapshot);fresh.revision=21;guestChannel.receive(JSON.stringify({kind:'state',rules:'score-5min-v5',id:host.id,state:fresh}));
 assert.equal(guest.state?.revision,21);assert.equal(guest.state?.mapId,DUEL_MAPS[6].id);assert.equal(emitted,2);
});

test('live guest heartbeats restore a temporarily disconnected host without reopening the data channel',async()=>{
 const {host,guestChannel}=await pair(DUEL_MAPS[0].id),messages:string[]=[];
 let connectedEmits=0;host.onStatus=message=>messages.push(message);host.onState=(_state,connected)=>{if(connected)connectedEmits++;};
 for(let attempt=0;attempt<2;attempt++){
  fakePC(host).changeConnection('disconnected');assert.equal(host.connected,false);
  fakePC(host).changeConnection('connected');
  // A stale room packet cannot restore the current room's connection.
  guestChannel.send(JSON.stringify({kind:'ping',id:'another-room'}));assert.equal(host.connected,false);
  // The existing SCTP channel stays open, so its onopen event is not repeated.
  guestChannel.send(JSON.stringify({kind:'ping',id:host.id}));assert.equal(host.connected,true);
 }
 assert.equal(connectedEmits,2,'both recoveries reach the host UI');
 assert.equal(messages.length,2,'a recovered connection can report a later outage');
});

test('fresh host snapshots clear the guest outage notice so another interruption is reported',async()=>{
 const {host,guest,guestChannel}=await pair(DUEL_MAPS[1].id),messages:string[]=[];
 guest.onStatus=message=>messages.push(message);
 for(let attempt=0;attempt<2;attempt++){
  fakePC(guest).changeConnection('disconnected');assert.equal(guest.connected,false);
  const snapshot=structuredClone(host.state!);snapshot.revision+=attempt+1;
  guestChannel.receive(JSON.stringify({kind:'state',rules:'score-5min-v5',id:host.id,state:snapshot}));assert.equal(guest.connected,true);
 }
 assert.equal(messages.length,2);
});

test('a missing map in an old guest answer cannot silently change a newly selected room',async()=>{
 const host=peer('left'),guest=peer('right'),offer=await host.create(DUEL_MAPS[8].id);
 const oldOffer=changed(offer,value=>{delete value.mapId;}),oldAnswer=await guest.join(oldOffer);
 assert.equal(guest.mapId,undefined);await assert.rejects(host.accept(oldAnswer),/같은 맵/);
 assert.equal(host.mapId,DUEL_MAPS[8].id);assert.equal(host.state?.mapId,DUEL_MAPS[8].id);assert.equal(fakePC(host).remoteDescription,null);
});

test('old shared-addition and preparation clients cannot join or replace a personal-level match',async()=>{
 const host=peer('left'),guest=peer('right'),offer=await host.create(DUEL_MAPS[0].id);
 await assert.rejects(guest.join(changed(offer,v=>{delete v.rules;})),/새로고침/);
 for(const rules of ['preparation-60-v1','hero-auras-5-v3','personal-hero-level-v4'])await assert.rejects(guest.join(changed(offer,v=>{v.rules=rules;})),/새로고침/);
 assert.equal(fakePC(guest).remoteDescription,null);
 const answer=await guest.join(offer);await assert.rejects(host.accept(changed(answer,v=>{delete v.rules;})),/새로고침/);
 for(const rules of ['preparation-60-v1','hero-auras-5-v3','personal-hero-level-v4'])await assert.rejects(host.accept(changed(answer,v=>{v.rules=rules;})),/새로고침/);
 assert.equal(fakePC(host).remoteDescription,null);await host.accept(answer);
 const paired=await pair(DUEL_MAPS[1].id),baseline=paired.guest.state,snapshot=structuredClone(paired.host.state!);snapshot.revision+=100;
 paired.guestChannel.receive(JSON.stringify({kind:'state',id:paired.host.id,state:snapshot}));
 for(const rules of ['preparation-60-v1','hero-auras-5-v3','personal-hero-level-v4'])paired.guestChannel.receive(JSON.stringify({kind:'state',rules,id:paired.host.id,state:snapshot}));
 assert.equal(paired.guest.state,baseline);
});
