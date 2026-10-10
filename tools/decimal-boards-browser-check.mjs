import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
const executablePath='C:/Users/user/AppData/Local/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-win64/chrome-headless-shell.exe';
const url=process.env.DECIMAL_BOARDS_URL||'http://127.0.0.1:5173/tools/personal-hero-level-preview.html';
const dir='test-results/decimal-boards';mkdirSync(dir,{recursive:true});
const checks=[],errors=[];
const check=(name,value)=>{assert.ok(value,name);checks.push(name);console.log('PASS',name);};
const browser=await chromium.launch({executablePath,headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
let currentPage,currentLabel;
async function snapshot(page){return page.evaluate(()=>{const api=window.__personalHeroLevelTest;return api.state.players.map(p=>p&&({account:p.accountLevel,stage:api.duelHeroLearningLevel(p),solved:p.solved,round:p.round,growth:p.egg,board:[...p.board],wrong:p.wrongQuestions.length}));});}
async function boardRule(page,owner){
 return page.evaluate(owner=>{
  const api=window.__personalHeroLevelTest,p=api.state.players[owner],stage=api.duelHeroLearningLevel(p),board=p.board;
  if(board.length!==16||!board.every(n=>Number.isSafeInteger(n)&&n>0&&n<10000&&n%10===0))return false;
  if(stage<=2?!board.every(n=>n%100===0):!board.every(n=>n%100!==0))return false;
  let count=0;
  for(let i=0;i<16;i++)for(let j=0;j<16;j++)for(let k=0;k<16;k++){
   if(i===j||i===k||j===k||board[i]+board[j]!==board[k])continue;
   count++;
   const a=board[i],b=board[j],hundredths=Math.floor(a/10)%10+Math.floor(b/10)%10>=10,tenths=Math.floor(a/100)%10+Math.floor(b/100)%10+(hundredths?1:0)>=10;
   if(stage===1&&tenths||stage===2&&!tenths||stage===3&&(hundredths||tenths)||stage===4&&!hundredths&&!tenths)return false;
  }
  return count>0;
 },owner);
}
async function uiRule(page,owner){
 return page.evaluate(owner=>{
  const api=window.__personalHeroLevelTest,p=api.state.players[owner],stage=api.duelHeroLearningLevel(p),row=document.querySelector(`#proof [data-side="${owner}"]`),stageText=api.scene.ui.getByName('duel-hero-stage'),progress=api.scene.ui.getByName('duel-hero-progress'),description=api.scene.ui.getByName('duel-hero-description');
  return api.view().side===owner&&row?.dataset.stage===String(stage)&&row.dataset.solved===String(p.solved)&&row.textContent.includes(`정답 ${p.solved}개`)&&stageText?.text.includes(`문제 ${stage}단계`)&&progress?.text.includes(stage<4?`다음 단계까지 정답 ${5-p.solved%5}개`:'최고 단계 유지')&&description?.text.includes(stage<=2?'한 자리':'두 자리')&&!stageText.text.includes('학습 Lv');
 },owner);
}
async function solve(page,owner,count){
 await page.locator('#correct-fuse').click();
 await page.waitForFunction(({owner,count})=>window.__personalHeroLevelTest.state.players[owner].solved===count,{owner,count});
}
async function wrong(page,label,owner){
 const before=await snapshot(page);await page.locator('#wrong-fuse').click();
 await page.waitForFunction(({owner,wrong})=>window.__personalHeroLevelTest.state.players[owner].wrongQuestions.length===wrong+1,{owner,wrong:before[owner].wrong});
 const after=await snapshot(page);
 check(`${label} player ${owner} wrong answer preserves stage, count, blocks and growth`,before.every((p,index)=>JSON.stringify({...p,wrong:0})===JSON.stringify({...after[index],wrong:0}))&&after[owner].wrong===before[owner].wrong+1);
}
try{
 for(const [label,width,height]of [['desktop',1280,800],['tablet',1024,768],['phone-landscape',844,390]]){
  if(process.env.DECIMAL_BOARDS_SCREEN&&process.env.DECIMAL_BOARDS_SCREEN!==label)continue;
  const page=await browser.newPage({viewport:{width,height},hasTouch:label!=='desktop'});currentPage=page;currentLabel=label;page.setDefaultTimeout(10000);
  page.on('pageerror',e=>errors.push(`${label}: ${e.message}`));
  await page.goto(url);await page.waitForFunction(()=>window.__personalHeroLevelTest?.loaded&&window.__personalHeroLevelTest.scene.ready);
  const initial=await snapshot(page);
  check(label+' different account levels both start at stage one with the same blocks',initial[0].account===1&&initial[1].account===8&&initial.every(p=>p.stage===1&&p.solved===0&&p.growth===0)&&JSON.stringify(initial[0].board)===JSON.stringify(initial[1].board));
  check(label+' stage one has tenths without any carry in every valid equation',await boardRule(page,0));
  check(label+' initial UI states stage one, zero correct and five to next stage',await uiRule(page,0));
  check(label+' preserves three-minute preparation, three-minute battle and 17.6 budget',await page.evaluate(()=>{const api=window.__personalHeroLevelTest;return api.state.status==='preparing'&&api.state.players.every(p=>p.money===17600)&&api.scene.ui.getByName('duel-total-timer').text==='06:00'&&api.scene.ui.getByName('duel-phase-timer').text==='문제풀이 03:00';}));
  check(label+' visible canvas actions and preview buttons have 44px touch height',await page.evaluate(()=>{const api=window.__personalHeroLevelTest,canvas=document.querySelector('#field canvas'),box=canvas.getBoundingClientRect(),scale=box.height/canvas.height;return [...api.scene.controls.values()].filter(c=>c.enabled).every(c=>c.h*scale>=43.9)&&[...document.querySelectorAll('.preview-controls button')].every(b=>b.getBoundingClientRect().height>=44);}));
  await page.locator('#game-shell').screenshot({path:`${dir}/${label}-stage-1.png`});
  for(const owner of [0,1]){
   await page.locator(owner===0?'#host-view':'#guest-view').click();
   const other=1-owner,unchangedOther=(await snapshot(page))[other];
   for(let count=1;count<=17;count++){
    await solve(page,owner,count);
    const actual=await snapshot(page),stage=Math.min(4,Math.floor(count/5)+1);
    assert.equal(actual[owner].stage,stage,`${label} player ${owner} stage after answer ${count}`);
    assert.equal(actual[owner].growth,count,`${label} player ${owner} growth after answer ${count}`);
    assert.deepEqual(actual[other],unchangedOther,`${label} player ${owner} never changes opponent's blocks or progress`);
    if([4,5,9,10,14,15,17].includes(count)){
     check(`${label} player ${owner} ${count} correct shows stage ${stage} and exact next-stage progress`,await uiRule(page,owner));
     check(`${label} player ${owner} ${count} correct generates actual stage ${stage} decimal/carry rules`,await boardRule(page,owner));
     if([4,9,14,17].includes(count))await wrong(page,label,owner);
     if(owner===0&&[5,10,15].includes(count))await page.locator('#game-shell').screenshot({path:`${dir}/${label}-stage-${stage}.png`});
    }
   }
   check(`${label} player ${owner} reaches highest stage independently`,await uiRule(page,owner)&&await page.locator('#next-stage').isDisabled());
  }
  await page.locator('#new-match').click();const reset=await snapshot(page);
  check(label+' new match clears both personal progress, growth and wrong answers',reset.every(p=>p.stage===1&&p.solved===0&&p.round===0&&p.growth===0&&p.wrong===0)&&JSON.stringify(reset[0].board)===JSON.stringify(initial[0].board)&&await uiRule(page,0));
  await page.locator('#reverse-levels').click();const reversed=await snapshot(page);
  check(label+' reversing account levels still starts both players at identical stage one',reversed[0].account===8&&reversed[1].account===1&&reversed.every(p=>p.stage===1&&p.solved===0)&&JSON.stringify(reversed[0].board)===JSON.stringify(reversed[1].board)&&await boardRule(page,0));
  await page.locator('#next-stage').click();const advanced=await snapshot(page);
  check(label+' next-stage preview solves five actual additions for only the selected player',advanced[0].solved===5&&advanced[0].round===5&&advanced[0].growth===5&&advanced[0].stage===2&&advanced[1].solved===0&&advanced[1].stage===1&&await uiRule(page,0)&&await boardRule(page,0));
  check(label+' preview error output stays empty',(await page.locator('#errors').textContent()).trim()==='');
  await page.close();currentPage=undefined;
 }
 check('browser has no uncaught errors',errors.length===0);writeFileSync(`${dir}/results.json`,JSON.stringify({url,checks,errors},null,2));
}catch(error){
 writeFileSync(`${dir}/error.txt`,String(error.stack));
 if(currentPage){await currentPage.screenshot({path:`${dir}/${currentLabel}-failure.png`,fullPage:true}).catch(()=>{});const state=await snapshot(currentPage).catch(()=>null);writeFileSync(`${dir}/${currentLabel}-failure.json`,JSON.stringify({state,checks,errors},null,2));}
 throw error;
}finally{await browser.close();}
