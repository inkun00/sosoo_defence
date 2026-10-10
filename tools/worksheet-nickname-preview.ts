// Imported only by the local browser checker. The application still boots its
// real main.ts, account gate, worksheet controller and PDF exporter.
import {signOut} from 'firebase/auth';
import {auth} from '../src/account-gate';
import {codeHash,generateWorksheet,validWorksheet,worksheetCode,Worksheet} from '../src/worksheet';

function requireLocalEmulator(){
 if(!['localhost','127.0.0.1'].includes(location.hostname)||new URLSearchParams(location.search).get('emulator')!=='1'||!auth)throw Error('Nickname QA requires the local Auth Emulator.');
}
export async function seedNicknameWorkbook(){
 requireLocalEmulator();
 if(auth!.currentUser)throw Error('Seed the isolated QA browser before signing in.');
 let seed=74191;
 const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const sheets:Worksheet[]=[];
 for(const [index,id]of ['6c4bf120-0000-4000-8000-000000000001','6c4bf121-0000-4000-8000-000000000002'].entries()){
  const generated=generateWorksheet({version:1,counts:{},seen:{}},4,id,1791648000000+index,random);
  const sheet={...generated,codeHash:await codeHash(id,worksheetCode(generated))};
  if(!validWorksheet(sheet))throw Error('Invalid nickname QA worksheet.');
  sheets.push(sheet);
 }
 localStorage.setItem('decimal-workbook-v1',JSON.stringify({version:1,sheets,collection:[],selectedHero:null}));
 return sheets.map(({id,createdAt})=>({id,createdAt}));
}
export function nicknameAccount(){requireLocalEmulator();return auth!.currentUser?{uid:auth!.currentUser.uid,name:auth!.currentUser.displayName}:null;}
export async function signOutNicknameAccount(){requireLocalEmulator();await signOut(auth!);}
