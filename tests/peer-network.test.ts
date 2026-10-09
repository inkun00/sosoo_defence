import {test} from 'node:test';
import assert from 'node:assert/strict';
import {peerConfiguration,gatherPeerCandidates} from '../src/multiplayer/peer-network';

const EMPTY_SDP='v=0\r\nm=application 9 UDP/DTLS/SCTP webrtc-datachannel\r\n';
const HOST_SDP=EMPTY_SDP+'a=candidate:1 1 udp 2122260223 192.168.1.4 50000 typ host\r\n';

class GatheringPeer {
 iceGatheringState:RTCIceGatheringState='gathering';
 localDescription:{sdp:string}|null={sdp:EMPTY_SDP};
 readonly listeners=new Set<()=>void>();
 added=0;removed=0;
 addEventListener(type:string,listener:()=>void){assert.equal(type,'icegatheringstatechange');this.listeners.add(listener);this.added++;}
 removeEventListener(type:string,listener:()=>void){assert.equal(type,'icegatheringstatechange');this.listeners.delete(listener);this.removed++;}
 change(state:RTCIceGatheringState,sdp=this.localDescription?.sdp??EMPTY_SDP){this.iceGatheringState=state;this.localDescription={sdp};for(const listener of this.listeners)listener();}
 get pc(){return this as unknown as RTCPeerConnection;}
}

function serverURLs(config:RTCConfiguration){return config.iceServers!.flatMap(server=>typeof server.urls==='string'?[server.urls]:server.urls);}

test('자동 연결은 LAN 후보와 외부 STUN 후보를 모두 사용하며 설정을 공유하지 않는다',()=>{
 const first=peerConfiguration(),second=peerConfiguration();
 assert.equal(first.iceTransportPolicy,'all');
 assert.equal(second.iceTransportPolicy,'all');
 assert.deepEqual(serverURLs(first),['stun:stun.l.google.com:19302','stun:stun1.l.google.com:19302']);
 assert.notEqual(first,second);assert.notEqual(first.iceServers,second.iceServers);
 first.iceServers![0].urls=Array.isArray(first.iceServers![0].urls)?['stun:changed.invalid']: 'stun:changed.invalid';
 first.iceServers!.push({urls:'turn:changed.invalid'});
 assert.deepEqual(serverURLs(second),['stun:stun.l.google.com:19302','stun:stun1.l.google.com:19302']);
});

test('이미 수집한 접속 후보는 타이머나 이벤트 구독 없이 즉시 사용한다',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});
 const peer=new GatheringPeer();peer.change('complete',HOST_SDP);
 await gatherPeerCandidates(peer.pc);
 assert.equal(peer.added,0);assert.equal(peer.listeners.size,0);
 const removed=peer.removed;t.mock.timers.tick(15000);assert.equal(peer.removed,removed);
});

test('수집 완료 상태여도 접속 후보가 없으면 연결 실패를 반환한다',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});
 for(const description of [{sdp:EMPTY_SDP},null]){
  const peer=new GatheringPeer();peer.iceGatheringState='complete';peer.localDescription=description;
  await assert.rejects(gatherPeerCandidates(peer.pc));
  assert.equal(peer.added,0);assert.equal(peer.listeners.size,0);
 }
});

test('수집 완료 이벤트까지 기다린 뒤 구독과 제한 시간을 정리한다',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});
 const peer=new GatheringPeer(),gathering=gatherPeerCandidates(peer.pc);let settled=false;
 void gathering.then(()=>{settled=true;});
 assert.equal(peer.listeners.size,1);
 peer.change('gathering',HOST_SDP);await Promise.resolve();assert.equal(settled,false);
 peer.change('complete');await gathering;
 assert.equal(peer.listeners.size,0);assert.equal(peer.removed,1);
 t.mock.timers.tick(15000);assert.equal(peer.removed,1,'완료 후 남은 제한 시간 콜백이 실행되지 않는다');
});

test('완료 이벤트에서도 접속 후보가 없으면 거부하고 구독과 제한 시간을 정리한다',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});
 const peer=new GatheringPeer(),rejected=assert.rejects(gatherPeerCandidates(peer.pc));
 peer.change('complete');await rejected;
 assert.equal(peer.listeners.size,0);assert.equal(peer.removed,1);
 t.mock.timers.tick(15000);assert.equal(peer.removed,1);
});

test('STUN 응답이 막혀도 제한 시간에 이미 수집한 LAN 후보를 사용한다',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});
 const peer=new GatheringPeer(),gathering=gatherPeerCandidates(peer.pc);let settled=false;
 void gathering.then(()=>{settled=true;});
 t.mock.timers.tick(14999);await Promise.resolve();assert.equal(settled,false);
 peer.change('gathering',HOST_SDP);t.mock.timers.tick(1);await gathering;
 assert.equal(peer.iceGatheringState,'gathering');assert.equal(peer.listeners.size,0);assert.equal(peer.removed,1);
 peer.change('complete');t.mock.timers.tick(15000);assert.equal(peer.removed,1);
});

test('제한 시간까지 접속 후보를 얻지 못하면 거부하고 구독을 정리한다',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});
 const peer=new GatheringPeer(),rejected=assert.rejects(gatherPeerCandidates(peer.pc,250));
 assert.equal(peer.listeners.size,1);t.mock.timers.tick(250);await rejected;
 assert.equal(peer.listeners.size,0);assert.equal(peer.removed,1);
 peer.change('complete',HOST_SDP);t.mock.timers.tick(250);assert.equal(peer.removed,1);
});
