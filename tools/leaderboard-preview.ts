import {artURL} from '../src/art';
import {accountLevel} from '../src/multiplayer/records';
import {parseDuelLeaderboard} from '../src/multiplayer/leaderboard';
import type {DuelLeaderboard,LeaderboardEntry} from '../src/multiplayer/leaderboard';
import {leaderboardHTML} from '../src/multiplayer/leaderboard-ui';
import type {LeaderboardViewState} from '../src/multiplayer/leaderboard-ui';
import '../src/game.css';
import '../src/multiplayer/multiplayer.css';
import '../src/multiplayer/duel-theme.css';

(document.querySelector('.duel-hall-logo') as HTMLImageElement).src=artURL('title-wordmark-v1');
const names=['별빛 수호자','달빛 기사','새벽 마법사','푸른 불꽃','나의 수호자','바람의 현자','성벽 지킴이','서리 마녀','황금 용기사','<img onerror=1>'];
const entries:LeaderboardEntry[]=Array.from({length:50},(_,i)=>{
 const experience=i===1?16500:i===2?16000:Math.max(0,16500-i*330);
 return {rank:i===1?1:i+1,name:names[i]??'연습 수호자 '+(i+1),level:accountLevel(experience),experience,isMe:i===4};
});
const data=parseDuelLeaderboard({entries,me:entries[4],limit:50});
const target=document.getElementById('duel-content')!;
function draw(state:LeaderboardViewState='ready',value:DuelLeaderboard=data){
 target.innerHTML=leaderboardHTML(value,state,'연결을 잠시 확인해 주세요.');
 target.querySelector('h2')!.id='leaderboard-preview-title';
 document.getElementById('leaderboard-refresh')!.onclick=()=>{draw('loading');setTimeout(()=>draw('ready',value),350);};
 document.getElementById('leaderboard-back')!.onclick=()=>draw('ready',data);
}
const mode=new URL(location.href).searchParams.get('state');
if(mode==='empty')draw('ready',{entries:[],me:{rank:null,name:'나의 수호자',level:1,experience:0,isMe:true},limit:50});
else if(mode==='unranked')draw('ready',{...data,entries:data.entries.map(row=>({...row,isMe:false})),me:{rank:88,name:'나의 수호자',level:2,experience:200,isMe:true}});
else draw(mode==='loading'||mode==='error'?mode:'ready');
