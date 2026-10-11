import {test} from 'node:test';
import assert from 'node:assert/strict';
import {goToMainMenu,mainMenuURL} from '../src/navigation';
import {pageRequest,requiresAccount} from '../src/page-access';

test('every game exit resolves to the public title instead of a previous game screen',()=>{
 for(const mode of ['adventure','tutorial','duel','worksheet']){
  const result=new URL(mainMenuURL(`https://sosoo-defence.vercel.app/?mode=${mode}&id=saved-sheet&print=1&emulator=1&preview=ending#hero`));
  const request=pageRequest(result.search);
  assert.equal(request.mode,'title');
  assert.equal(requiresAccount(request.mode),false);
  assert.equal(result.search,'?mode=title');
  assert.equal(result.hash,'');
 }
});

test('exit uses a direct title navigation and preserves the deployment origin and app path',()=>{
 const navigations:string[]=[];
 goToMainMenu({href:'http://localhost:5173/game/?mode=duel',assign:value=>{navigations.push(String(value));}});
 assert.deepEqual(navigations,['http://localhost:5173/game/?mode=title']);
});
