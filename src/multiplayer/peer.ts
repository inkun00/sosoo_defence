import {createDuel,joinDuel,applyDuel,advanceDuel,DuelState,DuelAction,Side} from './duel';
import {heroSpec} from './heroes';
export interface PeerIdentity{uid:string;name:string;accountLevel?:number;rewardHeroes?:string[];rewardHero?:string|null;}
export interface Reply{ok:boolean;message:string;}
interface Invitation{v:1;kind:'offer'|'answer';id:string;host:PeerIdentity;sdp:RTCSessionDescriptionInit;}
const GRACE=45000;
function randomId(){const b=crypto.getRandomValues(new Uint8Array(16));b[6]=(b[6]&15)|64;b[8]=(b[8]&63)|128;const hex=Array.from(b,n=>n.toString(16).padStart(2,'0')).join('');return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;}
function encode(v:Invitation){const bytes=new TextEncoder().encode(JSON.stringify(v));return 'SDS1.'+btoa(String.fromCharCode(...bytes));}
function decode(code:string,kind:Invitation['kind']){
 if(code.length>24000||!code.trim().startsWith('SDS1.'))throw Error('초대/응답 코드를 확인해 주세요.');
 let v:Invitation;try{v=JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(code.trim().slice(5)),c=>c.charCodeAt(0))));}catch{throw Error('코드 전체를 복사해 주세요.');}
 if(v.v!==1||v.kind!==kind||!/^[a-f0-9-]{36}$/.test(v.id)||!validIdentity(v.host)||v.sdp?.type!==kind||typeof v.sdp.sdp!=='string'||v.sdp.sdp.length>16000)throw Error('다른 종류의 접속 코드예요.');return v;
}
export function validIdentity(i:PeerIdentity){return !!i&&typeof i.uid==='string'&&/^[a-zA-Z0-9_-]{1,128}$/.test(i.uid)&&typeof i.name==='string'&&i.name.length>0&&i.name.length<=16&&(i.accountLevel===undefined||Number.isSafeInteger(i.accountLevel)&&i.accountLevel>=1&&i.accountLevel<=1000000)&&(i.rewardHeroes===undefined||Array.isArray(i.rewardHeroes)&&i.rewardHeroes.length<=30&&new Set(i.rewardHeroes).size===i.rewardHeroes.length&&i.rewardHeroes.every(id=>typeof id==='string'&&!!heroSpec(id)))&&(i.rewardHero===undefined||i.rewardHero===null||typeof i.rewardHero==='string'&&!!heroSpec(i.rewardHero)&&!!i.rewardHeroes?.includes(i.rewardHero));}
function iceComplete(pc:RTCPeerConnection):Promise<void>{return new Promise((resolve,reject)=>{
 if(pc.iceGatheringState==='complete'){resolve();return;}
 const timer=setTimeout(()=>{clean();reject(Error('접속 주소 수집 시간이 지났어요. 같은 네트워크인지 확인하고 새 코드를 만드세요.'));},15000);
 const change=()=>{if(pc.iceGatheringState==='complete'){clean();resolve();}};
 const clean=()=>{clearTimeout(timer);pc.removeEventListener('icegatheringstatechange',change);};pc.addEventListener('icegatheringstatechange',change);
 });}
export class HostPeer {
 readonly pc:RTCPeerConnection;channel:RTCDataChannel|null=null;state:DuelState|null=null;side:Side=0;id='';host:PeerIdentity;connected=false;
 // Directory connections accept only the account reserved by the server.
 allowedGuestUid:string|null=null;
 onState:(s:DuelState,connected:boolean)=>void=()=>{};onStatus:(m:string)=>void=()=>{};
 private tick:ReturnType<typeof setInterval>;private disposed=false;private started=Date.now();private monotonic=performance.now();private guest:PeerIdentity|null=null;private disconnectedAt=0;private lastPing=0;private lastSnapshot=0;private pending=new Map<string,{resolve:(r:Reply)=>void;timer:ReturnType<typeof setTimeout>}>();private replies=new Map<string,Reply>();private accepted=false;private announced=false;
 constructor(readonly identity:PeerIdentity,internet=false){
  this.host=identity;
  // Optional STUN discovers an address; no TURN or relay is configured.
  this.pc=new RTCPeerConnection({iceServers:internet?[{urls:'stun:stun.l.google.com:19302'}]:[]});
  this.pc.ondatachannel=e=>{if(this.channel){e.channel.close();return;}this.attach(e.channel);};
  this.pc.onconnectionstatechange=()=>{if(['failed','disconnected','closed'].includes(this.pc.connectionState))this.lost();};
  this.tick=setInterval(()=>this.step(),100);
 }
 private now(){return this.started+performance.now()-this.monotonic;}
 async create(){this.side=0;this.id=randomId();this.state=createDuel(this.identity.uid,this.identity.name,crypto.getRandomValues(new Uint32Array(1))[0],this.now(),this.identity.accountLevel??1,this.identity);this.attach(this.pc.createDataChannel('decimal-duel',{ordered:true}));await this.pc.setLocalDescription(await this.pc.createOffer());await iceComplete(this.pc);this.emit();return encode({v:1,kind:'offer',id:this.id,host:this.identity,sdp:this.pc.localDescription!.toJSON()});}
 async join(code:string){const v=decode(code,'offer');if(v.host.uid===this.identity.uid)throw Error('서로 다른 계정으로 참가해 주세요.');this.side=1;this.id=v.id;this.host=v.host;await this.pc.setRemoteDescription(v.sdp);await this.pc.setLocalDescription(await this.pc.createAnswer());await iceComplete(this.pc);return encode({v:1,kind:'answer',id:this.id,host:v.host,sdp:this.pc.localDescription!.toJSON()});}
 async accept(code:string){if(this.side!==0||this.accepted)throw Error('이미 참가자를 연결했어요. 두 명까지만 대전할 수 있어요.');const v=decode(code,'answer');if(v.id!==this.id||v.host.uid!==this.identity.uid)throw Error('이 방의 응답 코드가 아니에요.');await this.pc.setRemoteDescription(v.sdp);this.accepted=true;}
 private attach(channel:RTCDataChannel){this.channel=channel;channel.onopen=()=>{this.connected=true;this.disconnectedAt=0;this.lastSnapshot=this.now();if(this.side===1)this.write({kind:'hello',id:this.id,identity:this.identity});this.emit();};channel.onclose=()=>this.lost();channel.onerror=()=>this.lost();channel.onmessage=e=>{
  if(typeof e.data!=='string'||e.data.length>(this.side===0?4096:800000)){channel.close();return;}
  try{this.receive(JSON.parse(e.data));}catch{this.onStatus('잘못된 접속 메시지를 거부했어요.');}
 };}
 private write(value:unknown){if(this.channel?.readyState==='open'&&this.channel.bufferedAmount<1e6)this.channel.send(JSON.stringify(value));}
 private receive(m:any){
  if(!m||m.id!==this.id)return;
  if(this.side===0){
   if(m.kind==='hello'){
    if(!validIdentity(m.identity)||this.allowedGuestUid!==null&&m.identity.uid!==this.allowedGuestUid||m.identity.uid===this.identity.uid||this.guest&&this.guest.uid!==m.identity.uid)throw Error('참가자');
    joinDuel(this.state!,m.identity.uid,m.identity.name,this.now(),m.identity.accountLevel??1,m.identity);this.guest=m.identity;this.connected=true;this.state!.players[1]!.lastSeen=this.now();this.emit();this.broadcast();return;
   }
   if(!this.guest)return;
   if(m.kind==='ping'){this.state!.players[1]!.lastSeen=this.now();this.write({kind:'pong',id:this.id});return;}
   if(m.kind==='action'&&typeof m.requestId==='string'&&/^[a-f0-9-]{36}$/.test(m.requestId)){
    if(!m.action||JSON.stringify(m.action).length>2048)throw Error('요청 크기');const cached=this.replies.get(m.requestId),reply=cached??this.perform(1,m.action);
    this.replies.set(m.requestId,reply);if(this.replies.size>64)this.replies.delete(this.replies.keys().next().value!);
    this.broadcast();this.write({kind:'reply',id:this.id,requestId:m.requestId,...reply});
   }
  }else{
   if(m.kind==='state'&&m.state?.version===1&&Array.isArray(m.state.players)&&m.state.players[0]?.uid===this.host.uid&&m.state.players[1]?.uid===this.identity.uid&&Number.isSafeInteger(m.state.revision)){
    if(this.state&&m.state.revision<this.state.revision)return;
    this.state=m.state;this.connected=true;this.disconnectedAt=0;this.lastSnapshot=this.now();this.emit();
   }else if(m.kind==='reply'){const pending=this.pending.get(m.requestId);if(pending){clearTimeout(pending.timer);this.pending.delete(m.requestId);pending.resolve({ok:m.ok===true,message:String(m.message||'').slice(0,300)});}}
  }
 }
 private perform(side:Side,action:DuelAction):Reply{
  const s=this.state,p=s?.players[side];if(!s||!p||!action||typeof action.type!=='string')return {ok:false,message:'참가자 연결을 확인해 주세요.'};
  if(action.type==='tick')return {ok:true,message:''};
  const now=this.now();if(now-p.lastRequest<200)return {ok:false,message:'잠시 뒤 다시 눌러 주세요.'};p.lastRequest=now;p.lastSeen=now;
  advanceDuel(s,now);let result:Reply;try{result=applyDuel(s,side,action,now,randomId());}catch{result={ok:false,message:'조작 요청을 확인해 주세요.'};}s.revision++;this.emit();return result;
 }
 async send(action:DuelAction):Promise<Reply>{
  if(this.disposed)throw Error('연결이 종료됐어요.');
  if(this.side===0){const result=this.perform(0,action);this.broadcast();return result;}
  if(this.channel?.readyState!=='open')throw Error('호스트 연결을 확인해 주세요.');
  const requestId=randomId();return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{this.pending.delete(requestId);reject(Error('호스트의 응답을 기다리고 있어요.'));},8000);this.pending.set(requestId,{resolve,timer});this.write({kind:'action',id:this.id,requestId,action});});
 }
 private emit(){if(this.state)this.onState(this.state,this.connected);}
 private broadcast(){if(this.side!==0||!this.guest||!this.state)return;const state=structuredClone(this.state);state.players[0].wrongQuestions=[];this.write({kind:'state',id:this.id,state});}
 private lost(){if(this.disposed)return;this.connected=false;this.disconnectedAt||=this.now();this.emit();if(!this.announced){this.announced=true;this.onStatus('직접 연결이 끊겼어요. 45초 동안 연결을 기다려요.');}}
 private step(){
  if(this.disposed||!this.id)return;const now=this.now();
  if(this.side===0&&this.state){const s=this.state;s.players[0].lastSeen=now;
   if(s.status==='waiting'&&now-s.createdAt>600000){s.status='finished';s.reason='대기 시간이 10분을 넘었어요. 새 방을 만들어 주세요.';s.revision++;}
   if(s.status!=='finished'){advanceDuel(s,now);this.emit();this.broadcast();}
  }else if(this.side===1){
   if(now-this.lastPing>1000){this.lastPing=now;this.write({kind:'ping',id:this.id});}
   if(this.state?.status==='playing'&&now-this.lastSnapshot>5000)this.lost();
   if(this.state?.status==='playing'&&this.disconnectedAt&&now-this.disconnectedAt>=GRACE){this.state.status='finished';this.state.winner=1;this.state.reason='호스트의 연결이 45초 이상 끊겨 대전이 끝났어요.';this.state.revision++;this.emit();}
  }
 }
 async connectionInfo(){const stats=await this.pc.getStats();let result:{local:string;remote:string;protocol:string}|null=null;stats.forEach(report=>{if(report.type==='candidate-pair'&&report.state==='succeeded'&&report.nominated){const rows=new Map<string,any>();stats.forEach(row=>rows.set(row.id,row));const a=rows.get(report.localCandidateId),b=rows.get(report.remoteCandidateId);result={local:a?.candidateType,remote:b?.candidateType,protocol:a?.protocol};}});return result;}
 dispose(){this.disposed=true;clearInterval(this.tick);for(const p of this.pending.values()){clearTimeout(p.timer);p.resolve({ok:false,message:'대전 연결을 종료했어요.'});}this.pending.clear();this.channel?.close();this.pc.close();}
}
