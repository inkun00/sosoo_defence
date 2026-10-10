import assert from 'node:assert/strict';
import {randomBytes,randomUUID} from 'node:crypto';
import {existsSync} from 'node:fs';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {chromium} from 'playwright';
import {PDFDocument,PageSizes} from 'pdf-lib';

// Run with the local Vite server and Auth Emulator already running:
// $env:WORKSHEET_NICKNAME_URL='http://127.0.0.1:5174/?mode=worksheet&emulator=1'
// node tools/worksheet-nickname-browser-check.mjs
const target=new URL(process.env.WORKSHEET_NICKNAME_URL||'http://127.0.0.1:5173/?mode=worksheet&emulator=1');
assert.ok(target.protocol==='http:'&&['localhost','127.0.0.1'].includes(target.hostname)&&target.searchParams.get('mode')==='worksheet'&&target.searchParams.get('emulator')==='1','Only the actual local worksheet page with emulator=1 is allowed');
target.searchParams.delete('print');target.searchParams.delete('id');
const authOrigin='http://127.0.0.1:9099',dir=resolve(process.env.WORKSHEET_NICKNAME_DIR||'test-results/worksheet-nickname');
const checks=[],errors=[],pdfs=[],diagnostics=[],blocked={production:0,auxiliary:0,localCloud:0};
const nickname='가나다라마바사아자차카타파하거너더러머버';assert.equal(nickname.length,20);
const report={target:target.href,scope:'Actual main.ts → account login → worksheet controller → nickname modal → real PDF download',checks,errors,pdfs,diagnostics,blocked,emulatorAccountDeleted:false};
const originalFetch=globalThis.fetch;
// Firebase captures fetch on import. Guard it before importing the Node SDK.
globalThis.fetch=(input,options)=>{
 const request=new URL(typeof input==='string'||input instanceof URL?input:input.url);
 assert.equal(request.origin,authOrigin,'Node Firebase requests must stay on the Auth Emulator');
 return originalFetch(input,options);
};
const {initializeApp,deleteApp}=await import('firebase/app');
const {initializeAuth,inMemoryPersistence,connectAuthEmulator,createUserWithEmailAndPassword,updateProfile,deleteUser}=await import('firebase/auth');
const firebaseApp=initializeApp({apiKey:'demo-decimal-key',projectId:'demo-decimal-defense',appId:'demo-decimal-app'},'nickname-qa-'+randomUUID());
const auth=initializeAuth(firebaseApp,{persistence:inMemoryPersistence});connectAuthEmulator(auth,authOrigin,{disableWarnings:true});
const email=randomUUID()+'@nickname-qa.invalid',password=randomBytes(18).toString('base64url'),displayName='학습지 검증 수호자';
let created,browser,currentPage,currentLabel,heldRoute;
const check=(name,value)=>{assert.ok(value,name);checks.push(name);console.log('PASS',name);};
function trace(label,event,value){if(diagnostics.length<1500)diagnostics.push({time:new Date().toISOString(),label,event,...value});}
function safeUrl(value){try{const url=new URL(value);return url.origin+url.pathname+(url.origin===target.origin?url.search:'');}catch{return String(value).slice(0,300);}}
async function qa(page,method){return page.evaluate(async method=>(await import('/tools/worksheet-nickname-preview.ts'))[method](),method);}
async function persisted(page){return page.evaluate(()=>Object.fromEntries(Object.keys(localStorage).filter(key=>key.startsWith('decimal-')).sort().map(key=>[key,localStorage.getItem(key)])));}
async function state(page,label,event){
 const value=await page.evaluate(()=>({documentId:window.__worksheetNicknameDocument,url:location.href,navigationType:performance.getEntriesByType('navigation')[0]?.type,status:document.getElementById('ws-status')?.textContent??null,printDisabled:document.getElementById('ws-print')?.disabled??null,modalVisible:!!document.querySelector('#ws-dialog:not(.hidden)'),modalPurpose:document.getElementById('ws-dialog')?.dataset.purpose??null,inputLength:document.getElementById('ws-nickname')?.value.length??null,inputError:document.getElementById('ws-nickname-error')?.textContent??null,headerName:document.querySelector('.ws-header .ws-nickname')?.textContent??null,selectedSheet:document.getElementById('ws-select')?.value??null,exportClones:document.querySelectorAll('.ws-export').length,authFormVisible:!!document.getElementById('auth-form')}));
 trace(label,event,value);return value;
}
async function warmExporter(page,label){
 // A dev server can discover html-to-image/pdf-lib on the first dynamic import
 // and reload the document. Warm those dependencies before any login or save.
 for(let attempt=1;attempt<=5;attempt++){
  await page.locator('#auth-form').waitFor();const before=await state(page,label,'warmup-start');
  try{await page.evaluate(async()=>{await import('/tools/worksheet-nickname-preview.ts');await import('/src/worksheet-pdf.ts');});}
  catch(error){if(!/Execution context was destroyed|navigation|Cannot find context/.test(String(error)))throw error;trace(label,'warmup-navigation',{attempt});}
  await page.waitForTimeout(400);await page.locator('#auth-form').waitFor();const after=await state(page,label,'warmup-end');
  if(before.documentId===after.documentId)return;
 }
 throw Error('Vite dependency warmup did not settle after five document reloads');
}
async function downloadAfterConfirm(page,label){
 const before=await state(page,label,'before-export-confirm');
 let rejectReload;const reloaded=new Promise((_,reject)=>{rejectReload=reject;});
 const onReload=()=>rejectReload(Error('Document reloaded during PDF export; inspect navigation, Vite websocket and console diagnostics.'));
 page.on('domcontentloaded',onReload);
 try{
  const waiting=page.waitForEvent('download',{timeout:60000}),completed=Promise.race([waiting,reloaded]);completed.catch(()=>{});
  await page.locator('#ws-nickname-confirm').click();await state(page,label,'after-export-confirm');const download=await completed;
  assert.equal((await state(page,label,'after-export-download')).documentId,before.documentId,'PDF export must stay in the same document');
  return download;
 }finally{page.off('domcontentloaded',onReload);}
}
async function openNickname(page){await page.locator('#ws-print').click();await page.locator('#ws-dialog[data-purpose="nickname"]:not(.hidden)').waitFor();}
async function closedNickname(page){await page.locator('#ws-dialog').waitFor({state:'hidden'});await page.waitForFunction(()=>!document.getElementById('ws-print')?.disabled);}
async function localContext(viewport){
 const context=await browser.newContext({viewport,hasTouch:viewport.width<1100,acceptDownloads:true});
 await context.addInitScript(()=>{
  window.__worksheetNicknameDocument=Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);
  const record=(event,value={})=>console.debug('[nickname-qa]',JSON.stringify({documentId:window.__worksheetNicknameDocument,event,...value}));
  for(const event of ['DOMContentLoaded','load','beforeunload','pagehide','pageshow'])window.addEventListener(event,value=>record(event,{persisted:value.persisted??false}));
  document.addEventListener('submit',event=>{if(event.target?.id==='ws-nickname-form')record('nickname-submit',{inputLength:document.getElementById('ws-nickname')?.value.length,modalVisible:!!document.querySelector('#ws-dialog:not(.hidden)')});},true);
 });
 await context.route('**/*',async route=>{
  const request=new URL(route.request().url());
  if(request.origin===target.origin||request.origin===authOrigin)return route.continue();
  if(['localhost','127.0.0.1'].includes(request.hostname)&&['5001','8080'].includes(request.port))blocked.localCloud++;
  else if(/firebase|googleapis|identitytoolkit|securetoken/.test(request.hostname))blocked.production++;
  else blocked.auxiliary++;
  return route.abort();
 });
 return context;
}
async function login(context,label){
 const page=await context.newPage();currentPage=page;currentLabel=label;page.setDefaultTimeout(15000);
 page.on('pageerror',error=>{errors.push(label+': '+error.message);trace(label,'pageerror',{message:error.message});});
 page.on('console',message=>trace(label,'console',{type:message.type(),text:message.text().slice(0,2500)}));
 page.on('framenavigated',frame=>{if(frame===page.mainFrame())trace(label,'navigation',{url:safeUrl(frame.url())});});
 page.on('requestfailed',request=>trace(label,'requestfailed',{url:safeUrl(request.url()),type:request.resourceType(),error:request.failure()?.errorText}));
 page.on('response',response=>{if(response.status()>=400)trace(label,'response-error',{url:safeUrl(response.url()),status:response.status()});});
 page.on('websocket',socket=>{
  trace(label,'websocket-open',{url:safeUrl(socket.url())});
  socket.on('framereceived',frame=>{let message;try{message=JSON.parse(String(frame.payload));}catch{return;}if(['full-reload','update','error','connected'].includes(message.type))trace(label,'vite-message',{type:message.type,path:message.path,updates:message.updates?.map(({type,path})=>({type,path})),message:message.err?.message});});
 });
 await page.goto(target.href);await page.locator('#auth-form').waitFor();
 await warmExporter(page,label);
 const fixtures=await qa(page,'seedNicknameWorkbook');
 await page.locator('#auth-form [name=email]').fill(email);await page.locator('#auth-form [name=password]').fill(password);await page.locator('#auth-form button').click();
 await page.waitForFunction(()=>document.getElementById('ws-print')&&!document.getElementById('ws-print').disabled);
 const account=await qa(page,'nicknameAccount');check(label+' retains actual Firebase Auth login and account identity',account?.uid===created.uid&&account?.name===displayName);
 await state(page,label,'logged-in');
 check(label+' loads the actual worksheet controller and seeded valid worksheet',await page.locator('.ws-question').count()===20&&await page.locator('#ws-select option').count()===2);
 return {page,fixtures};
}
async function inspectDownload(page,download,label,entered){
 const selected=await page.locator('#ws-select').inputValue();
 const expected=await page.evaluate(async({selected,entered})=>{
  const sheet=JSON.parse(localStorage.getItem('decimal-workbook-v1')).sheets.find(sheet=>sheet.id===selected);
  return (await import('/src/worksheet-pdf.ts')).worksheetPdfName(sheet,entered);
 },{selected,entered});
 check(label+' download filename contains the normalized nickname and worksheet ID',download.suggestedFilename()===expected&&expected.includes(entered.trim()));
 const file=resolve(dir,label,expected);await mkdir(resolve(dir,label),{recursive:true});await download.saveAs(file);
 const pdf=await PDFDocument.load(await readFile(file)),size=pdf.getPage(0).getSize();
 check(label+' downloads one real A4 PDF page',pdf.getPageCount()===1&&Math.abs(size.width-PageSizes.A4[0])<.1&&Math.abs(size.height-PageSizes.A4[1])<.1);
 check(label+' PDF title, subject and author retain the entered nickname',pdf.getTitle()?.includes(entered.trim())&&pdf.getSubject()?.includes(entered.trim())&&pdf.getAuthor()===entered.trim());
 pdfs.push({screen:label,file,filename:expected,nickname:entered.trim(),bytes:(await readFile(file)).length,pageCount:pdf.getPageCount(),size});
}
async function holdExport(page){
 let resolveHeld;const ready=new Promise(resolve=>{resolveHeld=resolve;});let holding=true;
 await page.route('**/*',async route=>{
  if(holding&&route.request().resourceType()==='fetch'&&new URL(route.request().url()).origin===target.origin&&new URL(route.request().url()).pathname.includes('/assets/')){
   holding=false;heldRoute=route;resolveHeld();return;
  }
  await route.fallback();
 });
 await openNickname(page);await page.locator('#ws-nickname').fill('저장 중 계정 확인');await page.locator('#ws-nickname-confirm').click();
 await Promise.race([ready,new Promise((_,reject)=>{const timer=setTimeout(()=>reject(Error('The actual PDF artwork export did not start')),15000);timer.unref();})]);
 check('guard test pauses an actual PDF artwork fetch with controls disabled',await page.locator('#ws-print').isDisabled()&&await page.locator('#ws-select').isDisabled());
}
try{
 await mkdir(dir,{recursive:true});
 created=(await createUserWithEmailAndPassword(auth,email,password)).user;await updateProfile(created,{displayName});
 const fallback='C:/Users/user/AppData/Local/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-win64/chrome-headless-shell.exe';
 const executablePath=process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||(existsSync(fallback)?fallback:undefined);
 browser=await chromium.launch({executablePath,headless:true});
 const profiles=[['desktop',1280,900],['tablet',1024,768],['phone',390,844]],only=process.env.WORKSHEET_NICKNAME_SCREENS?.split(',');
 for(const [label,width,height]of profiles){
  if(only&&!only.includes(label))continue;
  const context=await localContext({width,height}),{page}=await login(context,label),downloads=[];page.on('download',download=>downloads.push(download));
  const before=await persisted(page);
  await openNickname(page);
  check(label+' shows a required 20-character nickname modal with Unicode input allowance, account default and focus',await page.locator('#ws-nickname').inputValue()===displayName&&await page.locator('#ws-nickname').getAttribute('maxlength')==='40'&&await page.locator('#ws-nickname').getAttribute('required')!==null&&await page.locator('#ws-nickname').evaluate(input=>input===document.activeElement));
  check(label+' background controls are disabled and inert while the modal is open',await page.evaluate(()=>document.getElementById('ws-print').disabled&&document.getElementById('ws-select').disabled&&document.querySelector('.workbook-toolbar').inert));
  check(label+' modal stays within the viewport and action targets are at least 44px',await page.locator('.worksheet-nickname-card').evaluate(card=>{const box=card.getBoundingClientRect();return box.x>=0&&box.right<=innerWidth&&box.y>=0&&box.bottom<=innerHeight&&[...card.querySelectorAll('button,input')].every(control=>control.getBoundingClientRect().height>=44);}));
  await page.screenshot({path:resolve(dir,label+'-nickname-modal.png'),fullPage:true});
  for(const [name,cancel]of [['cancel',()=>page.locator('#ws-nickname-cancel').click()],['Escape',()=>page.keyboard.press('Escape')],['close',()=>page.locator('#ws-close').click()],['backdrop',()=>page.locator('#ws-dialog').click({position:{x:3,y:3}})]]){
   if(name!=='cancel')await openNickname(page);
   await cancel();await closedNickname(page);check(label+' '+name+' cancels without a download and returns focus',downloads.length===0&&await page.locator('#ws-print').evaluate(button=>button===document.activeElement));
  }
  await openNickname(page);
  for(const value of ['', '   ']){
   await page.locator('#ws-nickname').fill(value);await page.locator('#ws-nickname-confirm').click();await page.waitForFunction(()=>document.getElementById('ws-nickname-error').textContent.trim().length>0);
   check(label+' rejects '+(value?'whitespace':'empty input')+' without closing or downloading',await page.locator('#ws-dialog').isVisible()&&await page.locator('#ws-nickname').getAttribute('aria-invalid')==='true'&&downloads.length===0);
  }
  // Native maxlength is still backed by a controller check for scripted values.
  await page.locator('#ws-nickname').evaluate(input=>{input.value='A'.repeat(21);input.dispatchEvent(new Event('input',{bubbles:true}));});await page.locator('#ws-nickname-confirm').click();
  await page.waitForFunction(()=>document.getElementById('ws-nickname-error').textContent.includes('20'));
  check(label+' rejects a scripted 21-character ASCII value without downloading',downloads.length===0&&await page.locator('#ws-dialog').isVisible());
  await page.locator('#ws-nickname').fill(nickname);const download=await downloadAfterConfirm(page,label);await closedNickname(page);
  check(label+' prints the full 20-character Korean nickname in the worksheet header',await page.locator('.ws-header .ws-nickname').textContent()==='닉네임 '+nickname);
  check(label+' keeps all 20 questions, cipher and footer inside the one-page sheet',await page.locator('.ws-sheet').evaluate(sheet=>{const box=sheet.getBoundingClientRect();return sheet.querySelectorAll('.ws-question').length===20&&sheet.querySelectorAll('.ws-final-code i').length===6&&sheet.querySelector('.ws-footer').getBoundingClientRect().bottom<=box.bottom+1;}));
  await page.locator('.ws-sheet').screenshot({path:resolve(dir,label+'-named-worksheet.png')});await inspectDownload(page,download,label,nickname);
  assert.deepEqual(await persisted(page),before,label+' nickname must remain in controller memory without changing saved workbook, learning or game data');check(label+' nickname export leaves persistent game and workbook data unchanged',true);
  await openNickname(page);check(label+' repeat save defaults to the previous nickname',await page.locator('#ws-nickname').inputValue()===nickname);await page.locator('#ws-nickname-cancel').click();await closedNickname(page);
  await page.locator('#ws-new').click();await page.locator('#ws-dialog[data-purpose="nickname"]:not(.hidden)').waitFor();await page.locator('#ws-nickname-cancel').click();await closedNickname(page);
  check(label+' new-worksheet save requires nickname confirmation and cancellation restores save-button focus',downloads.length===1&&await page.locator('#ws-print').evaluate(button=>button===document.activeElement));
  const auto=new URL(target);auto.searchParams.set('print','1');await page.goto(auto.href);await page.locator('#ws-dialog[data-purpose="nickname"]:not(.hidden)').waitFor();await page.locator('#ws-nickname-cancel').click();await closedNickname(page);
  check(label+' print=1 entry waits for nickname confirmation and cancellation restores save-button focus',downloads.length===1&&await page.locator('#ws-print').evaluate(button=>button===document.activeElement));
  await context.close();currentPage=undefined;
 }
 for(const mode of ['modal','export']){
  const context=await localContext({width:1280,height:900}),{page}=await login(context,'logout-'+mode),downloads=[];page.on('download',download=>downloads.push(download));
  if(mode==='modal')await openNickname(page);else await holdExport(page);
  await qa(page,'signOutNicknameAccount');await page.locator('#auth-form').waitFor();
  if(heldRoute){await heldRoute.fallback();heldRoute=undefined;await page.waitForFunction(()=>!document.querySelector('.ws-export'));}
  check('logout during '+mode+' revokes the real account and blocks PDF download',await qa(page,'nicknameAccount')===null&&downloads.length===0&&await page.locator('#ws-nickname-form').count()===0);
  await context.close();currentPage=undefined;
 }
 check('no production Firebase request was attempted',blocked.production===0);check('no uncaught browser errors',errors.length===0);assert.ok(pdfs.length>0,'At least one viewport must run');
}catch(error){
 report.failure=String(error.stack||error);process.exitCode=1;
 if(currentPage){report.failureState=await state(currentPage,currentLabel||'unknown','failure-state').catch(()=>null);await currentPage.screenshot({path:resolve(dir,(currentLabel||'unknown')+'-failure.png'),fullPage:true}).catch(()=>{});}
}finally{
 if(heldRoute)await heldRoute.abort().catch(()=>{});
 await browser?.close();
 try{if(created){await deleteUser(created);report.emulatorAccountDeleted=true;}}catch{report.cleanupFailed=true;process.exitCode=1;}
 await deleteApp(firebaseApp);globalThis.fetch=originalFetch;
 await mkdir(dir,{recursive:true});await writeFile(resolve(dir,'results.json'),JSON.stringify(report,null,2));
 console.log(JSON.stringify({checks:checks.length,pdfs:pdfs.map(({screen,file,filename})=>({screen,file,filename})),emulatorAccountDeleted:report.emulatorAccountDeleted,blocked,passed:!report.failure&&!report.cleanupFailed},null,2));
 if(report.failure)console.error(report.failure);
}
