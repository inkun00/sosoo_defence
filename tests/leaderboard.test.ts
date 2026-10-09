import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseDuelLeaderboard,escapeLeaderboardText,type LeaderboardEntry} from '../src/multiplayer/leaderboard';

const entry=(overrides:Partial<LeaderboardEntry>={}):LeaderboardEntry=>({rank:1,name:'첫 수호자',level:5,experience:1000,isMe:false,...overrides});
function board(){
 const entries=[entry({isMe:true}),entry({name:'둘째 수호자'}),entry({rank:3,name:'세 번째 수호자',level:4,experience:600})];
 return {entries,me:{...entries[0]},limit:50};
}

test('공동 순위는 1, 1, 3으로 표시하고 내 순위는 해당 행과 일치한다',()=>{
 const data=board(),parsed=parseDuelLeaderboard(data);
 assert.deepEqual(parsed.entries.map(row=>row.rank),[1,1,3]);
 assert.deepEqual(parsed.me,parsed.entries[0]);assert.equal(parsed.limit,50);
});

test('상위 50명 밖 내 순위와 경기 기록이 없는 새 계정을 처리한다',()=>{
 const data=board();data.entries=data.entries.map(row=>({...row,isMe:false}));
 data.me=entry({rank:73,name:'내 수호자',level:2,experience:150,isMe:true});
 assert.equal(parseDuelLeaderboard(data).me.rank,73);
 assert.deepEqual(parseDuelLeaderboard({entries:[],me:entry({rank:null,level:1,experience:0,isMe:true}),limit:50}).me.rank,null);
});

test('순위 응답에 섞인 계정 ID, 이메일, 오답과 기타 필드는 화면 자료에서 제거한다',()=>{
 const data=board(),privateRow={...data.entries[0],uid:'private-account',email:'private@example.invalid',wrongQuestions:[{answer:'private-answer'}]};
 const parsed=parseDuelLeaderboard({...data,entries:[privateRow,...data.entries.slice(1)],me:{...privateRow},privateRecord:true});
 assert.deepEqual(Object.keys(parsed).sort(),['entries','limit','me']);
 assert.deepEqual(Object.keys(parsed.entries[0]).sort(),['experience','isMe','level','name','rank']);
 assert.deepEqual(Object.keys(parsed.me).sort(),['experience','isMe','level','name','rank']);
 assert.ok(!JSON.stringify(parsed).includes('private-'));
});

test('레벨은 누적 경험치 경계와 맞아야 하며 오래된 클라이언트 레벨을 거부한다',()=>{
 for(const [experience,level]of [[0,1],[99,1],[100,2],[299,2],[300,3],[600,4]]){
  const row=entry({experience,level,isMe:true});assert.equal(parseDuelLeaderboard({entries:[row],me:row,limit:50}).me.level,level);
 }
 const stale=board();stale.entries[0].level=99;assert.throws(()=>parseDuelLeaderboard(stale));
});

test('내림차순, 공동 순위와 경쟁 순위의 관계를 검증한다',()=>{
 const reversed=board();reversed.entries.reverse();assert.throws(()=>parseDuelLeaderboard(reversed));
 const skippedTie=board();skippedTie.entries[1].rank=2;assert.throws(()=>parseDuelLeaderboard(skippedTie));
 const incorrectNext=board();incorrectNext.entries[2].rank=2;assert.throws(()=>parseDuelLeaderboard(incorrectNext));
 const distinctSameRank=board();distinctSameRank.entries[1].experience=900;distinctSameRank.entries[1].level=4;assert.throws(()=>parseDuelLeaderboard(distinctSameRank));
});

test('잘못된 수치, 이름, 상위 50명 한도와 응답 형식은 표시하지 않는다',()=>{
 for(const experience of [-1,NaN,Infinity,1.5,Number.MAX_SAFE_INTEGER+1]){
  const data=board();data.entries[0].experience=experience;assert.throws(()=>parseDuelLeaderboard(data));
 }
 for(const name of ['', '   ', '가'.repeat(17)]){
  const data=board();data.entries[0].name=name;assert.throws(()=>parseDuelLeaderboard(data));
 }
 for(const malformed of [null,[],{}, {...board(),limit:500}, {...board(),entries:Array.from({length:51},()=>entry())}])assert.throws(()=>parseDuelLeaderboard(malformed));
 const unranked=board();unranked.entries[0].rank=null;assert.throws(()=>parseDuelLeaderboard(unranked));
});

test('내 행 중복과 내 순위의 불일치를 거부한다',()=>{
 const duplicate=board();duplicate.entries[1].isMe=true;assert.throws(()=>parseDuelLeaderboard(duplicate));
 const different=board();different.me.name='다른 수호자';assert.throws(()=>parseDuelLeaderboard(different));
 const notMine=board();notMine.me.isMe=false;assert.throws(()=>parseDuelLeaderboard(notMine));
});

test('이름과 오류 메시지의 HTML 특수문자는 텍스트로만 출력한다',()=>{
 const name='<img src=x>',row=entry({name,isMe:true});
 const parsed=parseDuelLeaderboard({entries:[row],me:row,limit:50});
 assert.equal(parsed.me.name,name);assert.equal(escapeLeaderboardText(parsed.me.name),'&lt;img src=x&gt;');
 assert.equal(escapeLeaderboardText('&<script>"\'</script>'),'&amp;&lt;script&gt;&quot;&#39;&lt;/script&gt;');
 assert.equal(escapeLeaderboardText('수호자 소환'),'수호자 소환');
});

test('운영 Firestore 인덱스는 경험치 정렬과 내 순위 집계를 지원하고 다른 계정 필드는 비활성화한다',()=>{
 const config=JSON.parse(readFileSync(new URL('../firestore.indexes.json',import.meta.url),'utf8')) as {
  fieldOverrides:{collectionGroup:string;fieldPath:string;indexes:{order?:string;queryScope:string}[]}[];
 };
 const users=config.fieldOverrides.filter(field=>field.collectionGroup==='decimalUsers');
 const experience=users.filter(field=>field.fieldPath==='progress.experience');
 assert.equal(experience.length,1,'경험치 예외 인덱스가 배포 설정에 정확히 한 번 있어야 한다');
 assert.deepEqual(experience[0].indexes.map(index=>({order:index.order,queryScope:index.queryScope})).sort((a,b)=>String(a.order).localeCompare(String(b.order))),[
  {order:'ASCENDING',queryScope:'COLLECTION'},
  {order:'DESCENDING',queryScope:'COLLECTION'},
 ],'상위 50명 내림차순과 내 순위의 경험치 범위 집계에 필요한 두 방향을 모두 활성화한다');
 const wildcard=users.filter(field=>field.fieldPath==='*');
 assert.equal(wildcard.length,1);assert.deepEqual(wildcard[0].indexes,[]);
 for(const fieldPath of ['progress.level','progress.wins','progress.losses','progress.draws','email','wrongQuestions']){
  const effective=users.find(field=>field.fieldPath===fieldPath)||wildcard[0];
  assert.deepEqual(effective.indexes,[],`${fieldPath}는 기존의 계정 필드 인덱스 비활성화를 유지한다`);
 }
});
