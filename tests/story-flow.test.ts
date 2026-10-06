import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Defense,Tower} from '../src/model';
import {LEVELS} from '../src/levels';
import {loadSave,writeSave,hasAdventure,newAdventure} from '../src/save';
import {STORY,storyFrame,storyDuration} from '../src/story';

test('새 브라우저는 BGM을 켜고 기존에 끈 음악·효과음 설정은 그대로 유지한다',()=>{
 const previous=Object.getOwnPropertyDescriptor(globalThis,'localStorage');const data=new Map<string,string>();
 Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:(k:string)=>data.get(k)??null,setItem:(k:string,v:string)=>data.set(k,v)}});
 try{const fresh=loadSave();assert.equal(fresh.music,true);fresh.music=false;fresh.sfx=false;assert.ok(writeSave(fresh));assert.equal(loadSave().music,false);assert.equal(loadSave().sfx,false);}finally{if(previous)Object.defineProperty(globalThis,'localStorage',previous);else Reflect.deleteProperty(globalThis,'localStorage');}
});

test('과거 1:1 효과음 OFF를 보존하고 새 토글 선택은 모든 화면에서 같은 설정으로 저장한다',()=>{
 const previous=Object.getOwnPropertyDescriptor(globalThis,'localStorage'),data=new Map<string,string>([['decimal-duel-sfx','off']]);
 Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:(k:string)=>data.get(k)??null,setItem:(k:string,v:string)=>data.set(k,v),removeItem:(k:string)=>data.delete(k)}});
 try{const save=loadSave();assert.equal(save.sfx,false);save.sfx=true;save.music=false;assert.ok(writeSave(save));assert.equal(data.has('decimal-duel-sfx'),false);assert.equal(loadSave().sfx,true);assert.equal(loadSave().music,false);}finally{if(previous)Object.defineProperty(globalThis,'localStorage',previous);else Reflect.deleteProperty(globalThis,'localStorage');}
});

test('보스 한 마리가 통과해도 성은 살아 있고 학습 목표 연습만 안내하며 엔딩을 열지 않는다',()=>{
 const m=new Defense(LEVELS[9],{bricks:[],walls:1});assert.ok(m.placeWall({x:1,y:4}));
 for(let i=0;i<12;i++)m.spawn();const boss=m.enemies[11];assert.equal(boss.kind,'warden');
 m.enemies=[boss];m.kills=11;m.usedUnits.add(100);m.usedUnits.add(10);boss.next=boss.path.length;
 m.phase='playing';m.elapsed=119.95;m.step(.1);
 assert.equal(m.castle,4);assert.equal(m.phase,'review');assert.equal(m.stars,0);assert.equal(m.bossDefeated,false);
 assert.ok(m.goals.slice(0,-1).every(g=>g.done));assert.equal(m.goals.at(-1)!.done,false);
});
test('최종 보스의 힘을 정확히 0으로 만든 경우에만 처치 목표 달성',()=>{
 const m=new Defense(LEVELS[9]);for(let i=0;i<12;i++)m.spawn();const boss=m.enemies[11],t={unit:2350,effect:'basic'} as Tower;
 for(let i=0;i<4;i++)m.damage(boss,t);assert.equal(boss.hp,590);assert.equal(m.bossDefeated,false);
 m.damage(boss,t);assert.equal(boss.hp,590);assert.equal(m.bossDefeated,false);
 for(const unit of [350,200,10,10,10,10]){t.unit=unit;m.damage(boss,t);}
 assert.equal(boss.hp,0);assert.equal(m.bossDefeated,true);assert.equal(m.goals.at(-1)!.done,true);
});
test('보스 등장·처치와 별도로 1~9단계에 최종 보스 목표를 추가하지 않는다',()=>{
 for(const level of LEVELS.slice(0,9)){const m=new Defense(level);for(let i=0;i<12;i++)m.spawn();assert.ok(m.enemies.every(e=>e.kind!=='warden'));assert.ok(m.goals.every(g=>!g.label.includes('최종 보스')));}
});
test('새게임은 모험만 초기화하고 설정과 입력 저장 객체를 유지한다',()=>{
 const data=new Map<string,string>();Object.assign(globalThis,{localStorage:{getItem:(k:string)=>data.get(k)??null,setItem:(k:string,v:string)=>data.set(k,v)}});
 const s=loadSave();assert.equal(hasAdventure(s),false);s.level=10;s.resumeStage=8;s.stars[9]=3;s.campaignCompleted=true;s.inventory={bricks:[300,500,800],walls:3};s.sfx=false;s.narration=false;s.difficulty='challenge';
 assert.equal(hasAdventure(s),true);const fresh=newAdventure(s);assert.equal(fresh.level,1);assert.equal(fresh.resumeStage,1);assert.equal(fresh.campaignCompleted,false);assert.deepEqual(fresh.inventory,{bricks:[],walls:0});assert.ok(fresh.stars.every(n=>n===0));assert.equal(fresh.sfx,false);assert.equal(fresh.narration,false);assert.equal(fresh.difficulty,'challenge');assert.equal(s.level,10);assert.ok(hasAdventure(fresh));assert.ok(writeSave(fresh));assert.deepEqual(loadSave(),fresh);
});
test('이어하기는 마지막 선택 단계를 보존하고 과거 저장은 해금 단계에서 이어진다',()=>{
 const data=new Map<string,string>();Object.assign(globalThis,{localStorage:{getItem:(k:string)=>data.get(k)??null,setItem:(k:string,v:string)=>data.set(k,v)}});
 data.set('decimal-castle-v1',JSON.stringify({version:1,level:7,stars:[3]}));assert.equal(loadSave().resumeStage,7);
 const s=loadSave();s.resumeStage=4;s.campaignCompleted=true;writeSave(s);assert.equal(loadSave().resumeStage,4);assert.equal(loadSave().campaignCompleted,true);
 data.set('decimal-castle-v1',JSON.stringify({...s,resumeStage:11}));assert.equal(loadSave().resumeStage,7);
});
test('오프닝·엔딩의 장면 전환과 마지막 프레임은 시간 경계에서 일관된다',()=>{
 assert.equal(storyDuration('opening'),28);assert.equal(storyDuration('ending'),22);
 for(const kind of ['opening','ending'] as const){let time=0;for(let i=0;i<STORY[kind].length;i++){const f=storyFrame(kind,time);assert.equal(f.index,i);assert.equal(f.local,0);time+=STORY[kind][i].duration;}assert.equal(storyFrame(kind,time).index,STORY[kind].length-1);assert.equal(storyFrame(kind,time+50).local,STORY[kind].at(-1)!.duration);}
});
