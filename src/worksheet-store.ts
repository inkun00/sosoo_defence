import {heroSpec,HEROES} from './multiplayer/heroes';
import {loadLearning,recordKindLearning,importPendingLearning} from './learning';
import {Worksheet,generateWorksheet,codeHash,worksheetCode,validWorksheet,random} from './worksheet';
import {storageRecordUpdate} from './storage-lock';
export interface CollectedHero{heroId:string;copies:number;obtainedAt:number;}
export interface Workbook{version:1;sheets:Worksheet[];collection:CollectedHero[];selectedHero:string|null;}
export const HERO_LEVEL_CHANCES=[40,24,14,8,5,3.5,2.5,1.5,1,.5];
const KEY='decimal-workbook-v1',empty=():Workbook=>({version:1,sheets:[],collection:[],selectedHero:null});
function parseWorkbook(value:string|null):Workbook{
 try{const raw=JSON.parse(value||'null');if(raw?.version!==1)return empty();const book=empty();
  book.sheets=Array.isArray(raw.sheets)?raw.sheets.filter((s:Worksheet)=>validWorksheet(s)&&(s.claimedHero===null||!!heroSpec(s.claimedHero))):[];
  book.collection=Array.isArray(raw.collection)?raw.collection.filter((h:CollectedHero)=>h&&heroSpec(h.heroId)&&Number.isSafeInteger(h.copies)&&h.copies>0&&Number.isSafeInteger(h.obtainedAt)):[];
  book.selectedHero=raw.selectedHero===null?null:book.collection.some(h=>h.heroId===raw.selectedHero)?raw.selectedHero:book.collection[0]?.heroId??null;return book;
 }catch{return empty();}
}
export function loadWorkbook():Workbook{try{return parseWorkbook(localStorage.getItem(KEY));}catch{return empty();}}
function mirror(value:string){try{localStorage.setItem(KEY,value);}catch{throw Error('브라우저 저장 공간이 부족해요. 저장 공간을 확보한 뒤 다시 시도해 주세요.');}}
function locked<T>(fn:(book:Workbook)=>T){return storageRecordUpdate('decimal-workbook',()=>JSON.stringify(parseWorkbook(localStorage.getItem(KEY))),raw=>{const book=parseWorkbook(raw),result=fn(book);return {value:JSON.stringify(book),result};},mirror);}
/** Refresh the synchronous mirror before loading worksheet or duel pages. */
export async function syncWorkbook(){await locked(()=>undefined);}
export function ownedHeroIds(){return [...new Set(loadWorkbook().collection.map(h=>h.heroId))];}
export function selectedWorksheetHero(){return loadWorkbook().selectedHero;}
export async function selectWorksheetHero(id:string|null){return locked(book=>{if(id!==null&&!book.collection.some(h=>h.heroId===id))throw Error('아직 획득하지 않은 영웅이에요.');book.selectedHero=id;});}
function pendingWorksheet(book:Workbook){const modern=[...book.sheets].reverse().filter(s=>s.questions.some(q=>q.type));return modern.find(s=>!s.claimedHero)??modern[0];}
export async function getOrCreateWorksheet(level:number,fresh=false){
 const prepared=await locked(book=>{importPendingLearning();return {pending:pendingWorksheet(book),profile:loadLearning()};});
 if(prepared.pending&&!fresh)return prepared.pending;
 const generated=generateWorksheet(prepared.profile,level,crypto.randomUUID(),Date.now()),sheet:Worksheet={...generated,codeHash:await codeHash(generated.id,worksheetCode(generated))};
 return locked(book=>{
  const pending=pendingWorksheet(book);if(pending&&!fresh)return pending;
  book.sheets.push(sheet);return sheet;
 });
}
function worksheetHeroPools(ownedHeroIds:Iterable<string>){
 const owned=new Set(ownedHeroIds);
 return HERO_LEVEL_CHANCES.map((weight,i)=>({level:i+1,weight,heroes:HEROES.filter(h=>h.level===i+1&&!owned.has(h.id))})).filter(pool=>pool.heroes.length>0);
}
export function worksheetHeroLevelChances(ownedHeroIds:Iterable<string>=[]):number[]{
 const pools=worksheetHeroPools(ownedHeroIds),total=pools.reduce((sum,pool)=>sum+pool.weight,0);
 return HERO_LEVEL_CHANCES.map((_,i)=>(pools.find(pool=>pool.level===i+1)?.weight??0)/(total||1)*100);
}
export function drawWorksheetHero(r:()=>number=random,ownedHeroIds:Iterable<string>=[]){
 const pools=worksheetHeroPools(ownedHeroIds);
 if(!pools.length)throw Error('영웅 30종을 모두 모았어요. 수집이 완료되어 새로운 영웅 보상은 없어요.');
 let x=r()*pools.reduce((sum,pool)=>sum+pool.weight,0),selected=pools[pools.length-1];
 for(const pool of pools){x-=pool.weight;if(x<0){selected=pool;break;}}
 return selected.heroes[Math.floor(r()*selected.heroes.length)];
}
export async function redeemWorksheet(id:string,input:string,r:()=>number=random){
 const code=input.trim().toUpperCase();if(!/^[A-Z]{6}$/.test(code))throw Error('알파벳 여섯 글자를 입력해 주세요.');
 const hash=await codeHash(id,code);
 const result=await locked(book=>{
  const sheet=book.sheets.find(s=>s.id===id);if(!sheet)throw Error('이 브라우저에서 출력한 학습지를 선택해 주세요.');
  if(sheet.claimedHero)throw Error('이 학습지는 이미 영웅을 받았어요. 새 학습지로 다시 도전해 주세요.');
  if(hash!==sheet.codeHash)throw Error('암호가 맞지 않아요. 20개 답의 룬 숫자와 여섯 묶음의 합을 다시 확인해 주세요.');
  // Read the eligible roster inside the lock so separate worksheets cannot award the same hero.
  const hero=drawWorksheetHero(r,book.collection.map(h=>h.heroId));sheet.claimedHero=hero.id;book.collection.push({heroId:hero.id,copies:1,obtainedAt:Date.now()});book.selectedHero??=hero.id;
  return {hero,copies:1,questions:sheet.questions};
 });
 for(const [i,q] of result.questions.entries())recordKindLearning(q.kind,'correct','worksheet:'+id+':'+i);
 return {hero:result.hero,copies:result.copies};
}
