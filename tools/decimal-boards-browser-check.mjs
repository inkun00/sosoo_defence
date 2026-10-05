import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {initializeApp,deleteApp} from 'firebase/app';
import {getAuth,connectAuthEmulator,createUserWithEmailAndPassword} from 'firebase/auth';
import {getFunctions,connectFunctionsEmulator,httpsCallable} from 'firebase/functions';
const executablePath='C:/Users/user/AppData/Local/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-win64/chrome-headless-shell.exe';
const dir='test-results/decimal-boards';mkdirSync(dir,{recursive:true});
const checks=[],errors=[],apps=[],stamp=Date.now(),password='Emulator-only-123!';
const check=(name,value)=>{assert.ok(value,name);checks.push(name);console.log('PASS',name);};
async function account(index,wins){
 const projectId='demo-decimal-defense',email=`decimal-level-${index}-${stamp}@duel.invalid`,app=initializeApp({apiKey:projectId,projectId,authDomain:projectId+'.firebaseapp.com'},'decimal-level-'+index+'-'+stamp);apps.push(app);
 const auth=getAuth(app);connectAuthEmulator(auth,'http://127.0.0.1:9099',{disableWarnings:true});await createUserWithEmailAndPassword(auth,email,password);
 const f=getFunctions(app,'asia-northeast3');connectFunctionsEmulator(f,'127.0.0.1',5001);let progress={wins:0,level:1};
 // Earn test levels through the same completed-record function used by the game.
 for(let i=0;i<wins;i++)progress=(await httpsCallable(f,'duelSaveResult')({version:1,matchId:crypto.randomUUID(),hostUid:auth.currentUser.uid,guestUid:'emulator-opponent',side:0,outcome:'win',endedAt:Date.now(),duration:120,solved:30,purchases:20,wrongQuestions:[]})).data.progress;
 return {email,progress};
}
async function login(p,a){await p.goto('http://localhost:5173/?mode=duel&emulator=1');await p.locator('[name=email]').fill(a.email);await p.locator('[name=password]').fill(password);await p.locator('#auth-form button').click();await p.waitForFunction(l=>window.__duelTest?.progress.level===l,a.progress.level);await p.waitForTimeout(500);}
async function connect(p,q){await p.locator('#create-room').click();await p.locator('#publish-room').click();await p.locator('#connection-cancel').waitFor();const id=await p.evaluate(()=>window.__duelTest.peer.id);await q.locator('#refresh-rooms').click();await q.locator(`[data-join-room="${id}"]`).waitFor();await q.locator(`[data-join-room="${id}"]`).click();for(const page of [p,q])await page.waitForFunction(()=>window.__duelTest?.peer.connected&&window.__duelTest.state?.players[1]);}
async function click(p,key){const b=p.locator(`[data-duel-action="${key}"]`);await b.waitFor({state:'attached'});await b.evaluate(el=>el.click());await p.waitForFunction(()=>!window.__duelTest.view().busy);await p.waitForTimeout(230);}
async function solve(p,operation){
 const found=await p.evaluate(op=>{const s=window.__duelTest.state.players[window.__duelTest.side];for(let a=0;a<16;a++)for(let b=0;b<16;b++)for(let c=0;c<16;c++)if(a!==b&&a!==c&&b!==c&&(op==='+'?s.board[a]+s.board[b]:s.board[a]-s.board[b])===s.board[c])return {slots:[a,b,c],round:s.round};throw Error('no equation');},operation);
 await click(p,'op:'+operation);for(const i of found.slots)await click(p,'block:'+i);await click(p,'fuse');await p.waitForFunction(r=>window.__duelTest.state.players[window.__duelTest.side].round===r+1,found.round);
}
const browser=await chromium.launch({executablePath,headless:true});
try{
 const accounts=[await account(0,13),await account(1,13),await account(2,0)];check('Firebase 에뮬레이터 승리 기록으로 계정 Lv.10·Lv.1 구성',accounts[0].progress.level===10&&accounts[0].progress.wins===13&&accounts[2].progress.level===1);
 const contexts=await Promise.all(accounts.map((_,i)=>browser.newContext({viewport:i===1?{width:1024,height:640}:{width:1280,height:800}}))),pages=await Promise.all(contexts.map(c=>c.newPage()));const[p,q,r]=pages;
 for(const page of pages)page.on('pageerror',e=>errors.push(e.message));
 for(let i=0;i<pages.length;i++)await login(pages[i],accounts[i]);
 check('실제 로그인에서 저장된 계정 레벨을 불러옴',await p.locator('#profile-name').textContent().then(t=>t.includes('계정 Lv.10')));
 await connect(p,q);check('계정 Lv.10을 WebRTC로 전달해 두 화면의 학습 난이도 결정',await p.evaluate(()=>window.__duelTest.state.learningLevel===10&&window.__duelTest.state.players.every(p=>p.accountLevel===10))&&await q.evaluate(()=>window.__duelTest.state.learningLevel===10));
 check('양쪽에 같은 16개 블럭·모든 자연수 부분 한 자리',await p.evaluate(()=>{const s=window.__duelTest.state;return s.players[0].board.length===16&&JSON.stringify(s.players[0].board)===JSON.stringify(s.players[1].board)&&s.players[0].board.every(n=>n>0&&n<10000);}));
 check('화면과 접근성 설명에 학습 레벨 표시',await q.locator('#duel-state').textContent().then(t=>t.includes('학습 Lv.10'))&&await p.evaluate(()=>window.__duelTest.scene.children.list.some(c=>c.type==='Container'&&c.list?.some(t=>t.type==='Text'&&t.text.includes('학습 Lv.10')))));
 await click(p,'ready');await click(q,'ready');await p.waitForFunction(()=>window.__duelTest.state.status==='playing');
 await solve(p,'+');await solve(p,'-');await solve(q,'-');await solve(q,'+');
 check('고급 덧셈·뺄셈 합성 성공 및 다음 판의 동일한 순서',await q.evaluate(()=>{const s=window.__duelTest.state;return s.learningLevel===10&&s.players.every(p=>p.round===2&&p.egg===2)&&JSON.stringify(s.players[0].board)===JSON.stringify(s.players[1].board);}));
 await p.screenshot({path:dir+'/level-10-desktop.png'});await q.screenshot({path:dir+'/level-10-tablet.png'});
 await p.evaluate(()=>window.__duelTest.send({type:'surrender'}));await p.locator('#result-lobby').waitFor();await q.locator('#result-lobby').waitFor();await p.locator('#result-lobby').click();
 await connect(p,r);check('고급 호스트와 초급 참가자는 낮은 계정 Lv.1로 판을 재생성',await p.evaluate(()=>{const s=window.__duelTest.state;return s.learningLevel===1&&s.players[0].accountLevel===10&&s.players[1].accountLevel===1&&s.players[0].board.every(n=>n<1000&&n%100===0)&&JSON.stringify(s.players[0].board)===JSON.stringify(s.players[1].board);})&&await r.evaluate(()=>window.__duelTest.state.learningLevel===1));
 await click(p,'ready');await click(r,'ready');await solve(r,'-');
 check('초급 뺄셈 합성 후에도 한 자리 소수 유지',await p.evaluate(()=>window.__duelTest.state.players[1].round===1&&window.__duelTest.state.players[1].board.every(n=>n<1000&&n%100===0)));
 await r.screenshot({path:dir+'/level-1-desktop.png'});check('브라우저 오류 없음',errors.length===0);
 writeFileSync(dir+'/results.json',JSON.stringify({checks,errors},null,2));
}catch(e){writeFileSync(dir+'/error.txt',String(e.stack));throw e;}finally{await browser.close();await Promise.all(apps.map(deleteApp));}
