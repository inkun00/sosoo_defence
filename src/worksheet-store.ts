import {heroSpec,HEROES} from './multiplayer/heroes';
import {loadLearning,recordLearning,importPendingLearning} from './learning';
import {Worksheet,generateWorksheet,codeHash,worksheetCode,validWorksheet,random} from './worksheet';
export interface CollectedHero{heroId:string;copies:number;obtainedAt:number;}
export interface Workbook{version:1;sheets:Worksheet[];collection:CollectedHero[];selectedHero:string|null;}
export const HERO_LEVEL_CHANCES=[40,24,14,8,5,3.5,2.5,1.5,1,.5];
const KEY='decimal-workbook-v1',empty=():Workbook=>({version:1,sheets:[],collection:[],selectedHero:null});
export function loadWorkbook():Workbook{
 try{const raw=JSON.parse(localStorage.getItem(KEY)||'null');if(raw?.version!==1)return empty();const book=empty();
  book.sheets=Array.isArray(raw.sheets)?raw.sheets.filter((s:Worksheet)=>validWorksheet(s)&&(s.claimedHero===null||!!heroSpec(s.claimedHero))):[];
  book.collection=Array.isArray(raw.collection)?raw.collection.filter((h:CollectedHero)=>h&&heroSpec(h.heroId)&&Number.isSafeInteger(h.copies)&&h.copies>0&&Number.isSafeInteger(h.obtainedAt)):[];
  book.selectedHero=raw.selectedHero===null?null:book.collection.some(h=>h.heroId===raw.selectedHero)?raw.selectedHero:book.collection[0]?.heroId??null;return book;
 }catch{return empty();}
}
function save(book:Workbook){try{localStorage.setItem(KEY,JSON.stringify(book));}catch{throw Error('브라우저 저장 공간이 부족해요. 저장 공간을 확보한 뒤 다시 시도해 주세요.');}}
async function locked<T>(fn:()=>Promise<T>|T):Promise<T>{if(typeof navigator!=='undefined'&&navigator.locks)return navigator.locks.request('decimal-workbook',fn);return fn();}
export function ownedHeroIds(){return [...new Set(loadWorkbook().collection.map(h=>h.heroId))];}
export function selectedWorksheetHero(){return loadWorkbook().selectedHero;}
export async function selectWorksheetHero(id:string|null){return locked(()=>{const book=loadWorkbook();if(id!==null&&!book.collection.some(h=>h.heroId===id))throw Error('아직 획득하지 않은 영웅이에요.');book.selectedHero=id;save(book);});}
export async function getOrCreateWorksheet(level:number,fresh=false){return locked(async()=>{
 importPendingLearning();const book=loadWorkbook(),pending=[...book.sheets].reverse().find(s=>!s.claimedHero)??book.sheets.at(-1);if(pending&&!fresh)return pending;
 const generated=generateWorksheet(loadLearning(),level,crypto.randomUUID(),Date.now()),sheet:Worksheet={...generated,codeHash:await codeHash(generated.id,worksheetCode(generated))};
 book.sheets.push(sheet);save(book);return sheet;
});}
export function drawWorksheetHero(r:()=>number=random){let x=r()*100,level=10;for(let i=0;i<HERO_LEVEL_CHANCES.length;i++){x-=HERO_LEVEL_CHANCES[i];if(x<0){level=i+1;break;}}return HEROES.filter(h=>h.level===level)[Math.floor(r()*3)];}
export async function redeemWorksheet(id:string,input:string,r:()=>number=random){
 const code=input.trim().toUpperCase();if(!/^[A-Z]{6}$/.test(code))throw Error('알파벳 여섯 글자를 입력해 주세요.');
 const hash=await codeHash(id,code);
 return locked(()=>{
  const book=loadWorkbook(),sheet=book.sheets.find(s=>s.id===id);if(!sheet)throw Error('이 브라우저에서 출력한 학습지를 선택해 주세요.');
  if(sheet.claimedHero)throw Error('이 학습지는 이미 영웅을 받았어요. 새 학습지로 다시 도전해 주세요.');
  if(hash!==sheet.codeHash)throw Error('암호가 맞지 않아요. 20개 답의 룬 숫자와 여섯 묶음의 합을 다시 확인해 주세요.');
  const hero=drawWorksheetHero(r);sheet.claimedHero=hero.id;const owned=book.collection.find(h=>h.heroId===hero.id);if(owned)owned.copies++;else book.collection.push({heroId:hero.id,copies:1,obtainedAt:Date.now()});book.selectedHero??=hero.id;save(book);
  for(const [i,q] of sheet.questions.entries())recordLearning(q,'correct','worksheet:'+id+':'+i);
  return {hero,copies:owned?.copies??1};
 });
}
