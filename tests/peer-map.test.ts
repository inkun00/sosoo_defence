import {test,beforeEach,afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {HostPeer} from '../src/multiplayer/peer';
import {DUEL_MAPS} from '../src/multiplayer/duel-maps';
import type {DuelState} from '../src/multiplayer/duel';

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
function peer(uid:string){const value=new HostPeer({uid,name:uid==='left'?'왼쪽 수호자':'오른쪽 수호자'});peers.push(value);return value;}
function fakePC(value:HostPeer){return value.pc as unknown as FakePeerConnection;}
function invitation(code:string){return JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(code.slice(5)),char=>char.charCodeAt(0)))) as Record<string,unknown>;}
function encode(value:Record<string,unknown>){return'SDS1.'+btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(value))));}
function changed(code:string,change:(value:Record<string,unknown>)=>void){const value=invitation(code);change(value);return encode(value);}
async function pair(mapId?:string){
 const host=peer('left'),guest=peer('right'),offer=await host.create(mapId),answer=await guest.join(offer);
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
  assert.equal(host.state?.status,'playing');assert.equal(guest.state?.status,'playing');assert.equal(guest.state?.mapId,map.id);
 }
});

test('an old invitation without a map keeps the legacy road when both peers agree',async()=>{
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
 guestChannel.receive(JSON.stringify({kind:'state',id:host.id,state:snapshot}));assert.equal(guest.state?.revision,20);assert.equal(emitted,1);
 const baseline=guest.state;
 for(const mapId of [DUEL_MAPS[7].id,undefined,'unknown-map']){
  const wrong=structuredClone(snapshot);wrong.revision=1000;wrong.mapId=mapId;
  guestChannel.receive(JSON.stringify({kind:'state',id:host.id,state:wrong}));assert.equal(guest.state,baseline);assert.equal(emitted,1);
 }
 const fresh=structuredClone(snapshot);fresh.revision=21;guestChannel.receive(JSON.stringify({kind:'state',id:host.id,state:fresh}));
 assert.equal(guest.state?.revision,21);assert.equal(guest.state?.mapId,DUEL_MAPS[6].id);assert.equal(emitted,2);
});

test('a missing map in an old guest answer cannot silently change a newly selected room',async()=>{
 const host=peer('left'),guest=peer('right'),offer=await host.create(DUEL_MAPS[8].id);
 const oldOffer=changed(offer,value=>{delete value.mapId;}),oldAnswer=await guest.join(oldOffer);
 assert.equal(guest.mapId,undefined);await assert.rejects(host.accept(oldAnswer),/같은 맵/);
 assert.equal(host.mapId,DUEL_MAPS[8].id);assert.equal(host.state?.mapId,DUEL_MAPS[8].id);assert.equal(fakePC(host).remoteDescription,null);
});
