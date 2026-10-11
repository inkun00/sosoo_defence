import {test} from 'node:test';
import assert from 'node:assert/strict';
import {COMPUTER_SELECTION_DELAY_MS,COMPUTER_SELECTION_TAUNTS,ComputerSelectionDelay,ComputerSelectionDialogue} from '../src/multiplayer/computer-selection-taunt';
import {computerSelectionHTML} from '../src/multiplayer/computer-selection-ui';
import {COMPUTER_OPPONENTS} from '../src/multiplayer/computer-opponents';

function clock(){
 let now=0;const jobs:{callback:()=>void;at:number;canceled:boolean}[]=[];
 const schedule=(callback:()=>void,delayMs:number)=>{const job={callback,at:now+delayMs,canceled:false};jobs.push(job);return()=>{job.canceled=true;};};
 return {jobs,schedule,advance(ms:number){now+=ms;for(const job of jobs.splice(0)){if(job.at>now){jobs.push(job);continue;}if(!job.canceled)job.callback();}}};
}

test('the selected opponent speaks before a single peer can be started',()=>{
 const time=clock(),transition=new ComputerSelectionDelay(time.schedule);let starts=0;
 assert.equal(transition.start(()=>starts++),true);
 assert.equal(transition.active,true);
 assert.equal(transition.start(()=>starts++),false);
 time.advance(COMPUTER_SELECTION_DELAY_MS-1);assert.equal(starts,0);
 time.advance(1);assert.equal(starts,1);assert.equal(transition.active,false);
 time.advance(5000);assert.equal(starts,1);
});

test('leaving or changing the selection cancels its pending transition',()=>{
 const time=clock(),transition=new ComputerSelectionDelay(time.schedule);const starts:string[]=[];
 transition.start(()=>starts.push('old'));
 const queued=time.jobs[0].callback;transition.cancel();
 transition.start(()=>starts.push('new'));
 queued();assert.deepEqual(starts,[]);
 time.advance(COMPUTER_SELECTION_DELAY_MS);assert.deepEqual(starts,['new']);
 transition.start(()=>starts.push('left'));transition.cancel();time.advance(5000);
 assert.deepEqual(starts,['new']);assert.equal(transition.active,false);
});

test('all ten opponents have distinct taunts and use every line before refilling',()=>{
 assert.equal(COMPUTER_SELECTION_TAUNTS.length,COMPUTER_OPPONENTS.length);
 const unique=new Set(COMPUTER_SELECTION_TAUNTS.flat());assert.equal(unique.size,60);
 const dialogue=new ComputerSelectionDialogue(()=>.4);
 COMPUTER_SELECTION_TAUNTS.forEach((lines,index)=>{
  const first=Array.from({length:lines.length},()=>dialogue.next(index+1));
  assert.equal(new Set(first).size,lines.length);assert.ok(first.every(line=>lines.includes(line)));
  assert.notEqual(dialogue.next(index+1),first.at(-1));
 });
});

test('the taunt screen uses the chosen character and keeps speech as plain text',()=>{
 COMPUTER_OPPONENTS.forEach(opponent=>{
  const html=computerSelectionHTML(opponent,'<script> & "도발"');
  assert.ok(html.includes(opponent.name));assert.ok(html.includes('computer-selection-portrait'));
  assert.ok(html.includes('&lt;script&gt; &amp; &quot;도발&quot;'));
  assert.ok(html.includes('aria-live="polite"'));assert.ok(html.includes('id="computer-taunt-exit"'));
 });
});
