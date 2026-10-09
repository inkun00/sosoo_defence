import {test} from 'node:test';
import assert from 'node:assert/strict';
import {reloadOnCachedRestore} from '../src/page-lifecycle';

function show(target:EventTarget,persisted?:boolean){
 const event=new Event('pageshow');
 if(persisted!==undefined)Object.defineProperty(event,'persisted',{value:persisted});
 target.dispatchEvent(event);
}

test('normal page loads, refreshes and uncached history navigation do not trigger another reload',()=>{
 const page=new EventTarget();let reloads=0;
 reloadOnCachedRestore(page,()=>reloads++);
 show(page,false);show(page,false);show(page,false);show(page);
 assert.equal(reloads,0);
});

test('a cached page restore reloads its disposed runtime exactly once, including repeated restore events',()=>{
 const page=new EventTarget();let reloads=0;
 reloadOnCachedRestore(page,()=>{reloads++;show(page,true);});
 show(page,false);show(page,true);show(page,true);show(page,false);
 assert.equal(reloads,1);
});

test('disposing the page lifecycle listener leaves later events without a reload callback',()=>{
 const page=new EventTarget();let reloads=0;
 const dispose=reloadOnCachedRestore(page,()=>reloads++);
 dispose();dispose();show(page,true);
 assert.equal(reloads,0);
});
