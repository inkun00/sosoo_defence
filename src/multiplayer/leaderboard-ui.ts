import type {DuelLeaderboard,LeaderboardEntry} from './leaderboard';
import {escapeLeaderboardText} from './leaderboard';
import './leaderboard.css';

export type LeaderboardViewState='loading'|'error'|'ready';
const number=new Intl.NumberFormat('ko-KR');
function rankText(row:LeaderboardEntry){return row.rank===null?'순위 없음':`${number.format(row.rank)}위`;}
function badge(row:LeaderboardEntry){
 const podium=row.rank!==null&&row.rank<=3;
 return `<span class="leaderboard-rank${podium?' leaderboard-medal leaderboard-medal-'+row.rank:''}">${podium?'<span class="leaderboard-crown" aria-hidden="true">♛</span>':''}${rankText(row)}</span>`;
}
function myRank(row:LeaderboardEntry){
 return `<section class="leaderboard-mine" aria-label="내 순위"><div class="leaderboard-my-position"><small>내 순위</small>${badge(row)}</div><div class="leaderboard-my-profile"><strong>${escapeLeaderboardText(row.name)}</strong><span>Lv.${number.format(row.level)} · ${number.format(row.experience)} XP</span></div>${row.rank===null?'<p>온라인 대전을 마치면 순위에 등록돼요.</p>':''}</section>`;
}
function table(data:DuelLeaderboard){
 if(!data.entries.length)return '<div class="leaderboard-empty" role="status"><span aria-hidden="true">♜</span><strong>첫 수호자를 기다리고 있어요</strong><p>온라인 대전을 마치고 명예의 전당에 이름을 올려 보세요.</p></div>';
 return `<div class="leaderboard-table-wrap"><table class="leaderboard-table"><caption class="sr-only">온라인 대전 레벨과 누적 경험치 상위 50명</caption><thead><tr><th scope="col">순위</th><th scope="col">수호자</th><th scope="col">레벨</th><th scope="col">누적 경험치</th></tr></thead><tbody>${data.entries.map(row=>`<tr${row.isMe?' class="leaderboard-my-row"':''}><td>${badge(row)}</td><th scope="row"><span class="leaderboard-name">${escapeLeaderboardText(row.name)}</span>${row.isMe?'<span class="leaderboard-me-tag">나</span>':''}</th><td>Lv.${number.format(row.level)}</td><td>${number.format(row.experience)} <span class="leaderboard-xp-unit">XP</span></td></tr>`).join('')}</tbody></table></div>`;
}

export function leaderboardHTML(data?:DuelLeaderboard,state:LeaderboardViewState='ready',errorText?:string){
 const body=state==='loading'?'<div class="leaderboard-status" role="status"><span class="leaderboard-loading" aria-hidden="true"></span><strong>수호자들의 순위를 불러오는 중이에요…</strong></div>':state==='error'?`<div class="leaderboard-status leaderboard-error" role="alert"><strong>명예의 전당을 불러오지 못했어요</strong><p>${escapeLeaderboardText((errorText||'연결을 확인하고 다시 시도해 주세요.').slice(0,240))}</p></div>`:data?myRank(data.me)+table(data):'<div class="leaderboard-status" role="status">순위 자료를 새로 불러와 주세요.</div>';
 return `<section class="leaderboard-screen"${state==='loading'?' aria-busy="true"':''}><header class="leaderboard-heading"><span class="leaderboard-heading-mark" aria-hidden="true">♛</span><div><h2>명예의 전당</h2><p class="leaderboard-order">레벨 높은 순 · 같은 레벨에서는 누적 경험치 높은 순</p></div></header><div class="leaderboard-content">${body}</div><footer class="leaderboard-footer"><p>상위 50명과 내 순위를 표시해요. 레벨과 경험치가 같으면 공동 순위예요.<br>온라인 대전 경험치만 반영해요. 컴퓨터 대전은 포함되지 않아요.</p><div class="duel-row"><button type="button" id="leaderboard-refresh"${state==='loading'?' disabled':''}>${state==='error'?'다시 불러오기':'순위 새로고침'}</button><button type="button" class="duel-primary" id="leaderboard-back">대기실로</button></div></footer></section>`;
}
