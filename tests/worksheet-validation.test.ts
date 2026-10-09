import {test} from 'node:test';
import assert from 'node:assert/strict';
import {CONCEPT_KINDS,kindParts,LearningKind,LearningProfile} from '../src/learning';
import {generateWorksheet,makeQuestion,questionAnswer,validQuestion,validWorksheet,worksheetCode,Worksheet,WorksheetQuestion} from '../src/worksheet';
import {worksheetQuestionHTML,worksheetPages} from '../src/worksheet-view';

function seeded(seed:number){return ()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
const cents=(scaled:number)=>scaled/10;
function printedCents(text:string){const [whole,fraction='']=text.split('.');return Number(whole)*100+Number(fraction.padEnd(2,'0'));}
function permutations(values:number[]):number[][]{return values.length?values.flatMap((n,i)=>permutations(values.filter((_,j)=>i!==j)).map(rest=>[n,...rest])):[[]];}
// Solve the prompt in hundredths, independently of the game's integer-thousandth answer helpers.
function solve(q:WorksheetQuestion):number{
 if(!q.type){
  const equation=worksheetQuestionHTML(q).match(/>(\d+(?:\.\d+)?) ([+−]) (\d+(?:\.\d+)?) =/);
  assert.ok(equation,'Printed arithmetic must be readable as an equation');
  return (equation[2]==='+'?printedCents(equation[1])+printedCents(equation[3]):printedCents(equation[1])-printedCents(equation[3]))*10;
 }
 const d=q.data!;
 switch(q.type){
  case 'concept-compose':return (d[0]*100+d[1]*10+d[2])*10;
  case 'concept-fraction':return (d[0]*100+d[1]*100/d[2])*10;
  case 'concept-grid':return d[0]*10;
  case 'concept-numberline':{
   const endpoints=[cents(d[0]),cents(d[0]+10*d[1])];
   return (endpoints[0]+(endpoints[1]-endpoints[0])*d[2]/10)*10;
  }
  case 'concept-place':{
   const digits=String(cents(d[0])).padStart(3,'0');
   const fromRight=d[1]===10?0:d[1]===100?1:2;
   return Number(digits.at(-1-fromRight))*10**fromRight*10;
  }
  case 'concept-scale':return cents(d[0])*(d[1]/d[2])*10;
  case 'concept-compare':return [...d].sort((a,b)=>cents(b)-cents(a))[0];
  case 'concept-cards':{
   const possibilities=permutations(d.slice(0,3)).map(cards=>printedCents(cards[0]+'.'+cards[1]+cards[2]));
   const result=d[3]?Math.max(...possibilities):Math.min(...possibilities);
   assert.equal(possibilities.filter(n=>n===result).length,1,'Digit cards must have one requested extremum');
   return result*10;
  }
  case 'concept-missing':{
   const total=d[2]?cents(d[0])-cents(d[1]):cents(d[0])+cents(d[1]);
   const solutions=Array.from({length:1000},(_,n)=>n).filter(n=>{
    const left=d[3]===0?n:cents(d[0]),right=d[3]===1?n:cents(d[1]);
    return (d[2]?left-right:left+right)===total;
   });
   assert.equal(solutions.length,1,'Missing operand must have one answer');return solutions[0]*10;
  }
  case 'concept-units':return cents(d[0])/cents(d[1])*1000;
  case 'concept-story':return (cents(d[0])+cents(d[1])-cents(d[2]))*10;
  case 'concept-read':return printedCents((cents(d[0])/100).toFixed(2))*10;
  case 'concept-inequality':{
   const candidates=Array.from({length:10},(_,n)=>n).filter(n=>d[2]?d[0]*100+n*10>cents(d[1]):d[0]*100+n*10<cents(d[1]));
   assert.ok(candidates.length,'An inequality must have an admissible digit');return (d[2]?candidates[0]:candidates.at(-1)!)*1000;
  }
 }
}
const arithmeticKinds:LearningKind[]=[];
for(const op of ['add','sub'])for(const digits of [1,2])for(const mode of ['basic','regroup','chain','align']){
 const kind=`${op}-${digits}-${mode}`;if(kindParts(kind))arithmeticKinds.push(kind as LearningKind);
}
const empty:LearningProfile={version:1,counts:{},seen:{}};
const allWeak:LearningProfile={version:1,counts:Object.fromEntries([...arithmeticKinds,...CONCEPT_KINDS].map((kind,i)=>[kind,{wrong:i+1,help:i%3,correct:i%5}])),seen:{}};
const chainWeak:LearningProfile={version:1,counts:{'sub-2-chain':{wrong:90,help:10,correct:0},'concept-numberline':{wrong:10,help:0,correct:0}},seen:{}};

test('all 25 arithmetic/concept categories have correct, uniquely solvable answers across 1–11 stages and 80 seeds',()=>{
 for(let level=1;level<=11;level++)for(let seed=1;seed<=80;seed++)for(const kind of [...arithmeticKinds,...CONCEPT_KINDS]){
  const q=makeQuestion(kind,new Set(),seeded(level*10000+seed*100+kind.length),level);
  assert.ok(validQuestion(q),`${kind}, level ${level}, seed ${seed}`);
  const answer=solve(q);assert.equal(answer,questionAnswer(q),`${kind}, level ${level}, seed ${seed}`);
  assert.ok(Number.isSafeInteger(answer)&&answer>=0&&answer%10===0);
  assert.ok(answer<(kind==='concept-units'?100000:10000));
  assert.ok(!/\b\d+\.\d{3}\b/.test(worksheetQuestionHTML(q)),'The printed question must stop at hundredths');
 }
});

test('1,056 generated and JSON-restored sheets keep all 20 answers and six cipher letters consistent under empty and weak-learning profiles',()=>{
 for(let level=1;level<=11;level++)for(let seed=1;seed<=32;seed++)for(const [profileIndex,profile] of [empty,allWeak,chainWeak].entries()){
  const generated={...generateWorksheet(profile,level,`validate-${level}-${seed}-${profileIndex}`,1700000000000,seeded(level*100000+seed*100+profileIndex)),codeHash:'a'.repeat(64)};
  const sheet=JSON.parse(JSON.stringify(generated)) as Worksheet;
  assert.ok(validWorksheet(sheet));const answers=sheet.questions.map(solve);
  assert.equal(new Set(answers).size,20);assert.equal(new Set(sheet.decoder.map(entry=>entry.answer)).size,30);
  assert.equal(sheet.questions.filter(q=>q.type).length,10);
  for(const answer of answers)assert.equal(sheet.decoder.filter(entry=>entry.answer===answer).length,1);
  const expected=sheet.groups.map(group=>{
   const sum=group.map(index=>sheet.decoder.find(entry=>entry.answer===answers[index])!.rune).reduce((a,b)=>a+b,0);
   assert.ok(Number.isInteger(sum)&&sum>=0&&sum<=25);return 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[sum];
  }).join('');
  assert.match(expected,/^[A-Z]{6}$/);assert.equal(worksheetCode(sheet),expected);
  const html=worksheetPages(sheet);
  assert.equal((html.match(/data-question=/g)||[]).length,20);
  assert.ok(!html.includes(expected),'The completed cipher must not be disclosed in print');
 }
});

test('stored arithmetic precision must match the printed operands instead of truncating hundredths',()=>{
 const q:WorksheetQuestion={a:4350,b:210,operation:'-',digits:2,kind:'sub-2-basic',context:'money'};
 assert.ok(validQuestion(q));assert.equal(solve(q),4140);
 assert.equal(validQuestion({...q,digits:1}),false,'4.35 − 0.21 must never be accepted for a one-place 4.3 − 0.2 display');
 assert.equal(solve({...q,digits:1}),4140,'Even an invalid legacy question must print its complete operands defensively');
});

function attr(tag:string,name:string){return tag.match(new RegExp(`\\b${name}="([^"]*)"`))?.[1];}
function pathX(tag:string){const match=attr(tag,'d')?.match(/^M(-?[\d.]+)/);assert.ok(match);return Number(match[1]);}
test('numberline labels align with their endpoint ticks and every arrow points to its mathematically correct interior tick',()=>{
 const cases:number[][]=[[3000,100,7],[1200,10,7],[8800,10,9]];
 for(const step of [10,100])for(let start=0;start<=8000;start+=1000)for(let index=1;index<=9;index++)cases.push([start,step,index]);
 for(const data of cases){
  const q:WorksheetQuestion={a:data[0]+data[1]*data[2],b:0,operation:'+',digits:2,kind:'concept-numberline',type:'concept-numberline',context:'concept',data};
  assert.ok(validQuestion(q));const html=worksheetQuestionHTML(q),paths=html.match(/<path\b[^>]*>/g)!;
  const ticks=paths.filter(tag=>attr(tag,'data-numberline-tick')!==undefined).sort((a,b)=>Number(attr(a,'data-numberline-tick'))-Number(attr(b,'data-numberline-tick')));
  assert.equal(ticks.length,11);assert.deepEqual(ticks.map(tag=>Number(attr(tag,'data-numberline-tick'))),Array.from({length:11},(_,i)=>i));
  const xs=ticks.map(pathX),spacing=xs[1]-xs[0];assert.ok(spacing>0);
  for(let i=1;i<xs.length;i++)assert.equal(xs[i]-xs[i-1],spacing);
  const arrow=paths.find(tag=>attr(tag,'data-numberline-arrow')!==undefined)!;
  assert.equal(Number(attr(arrow,'data-numberline-arrow')),data[2]);assert.equal(pathX(arrow),xs[data[2]]);
  const labels=html.match(/<text\b[^>]*>[^<]*<\/text>/g)!;
  const left=labels.find(tag=>attr(tag,'data-numberline-endpoint')==='start')!,right=labels.find(tag=>attr(tag,'data-numberline-endpoint')==='end')!;
  assert.equal(Number(attr(left,'x')),xs[0]);assert.equal(Number(attr(right,'x')),xs[10]);
  assert.equal(attr(left,'text-anchor'),'middle');assert.equal(attr(right,'text-anchor'),'middle');
  const leftValue=printedCents(left.match(/>([^<]*)</)![1]),rightValue=printedCents(right.match(/>([^<]*)</)![1]);
  assert.equal((leftValue+(rightValue-leftValue)*data[2]/10)*10,questionAnswer(q));
 }
});

test('all hundred-grid quantities and digit place highlights display the values that are actually graded',()=>{
 for(let n=1;n<100;n++){
  const q:WorksheetQuestion={a:n*10,b:0,operation:'+',digits:2,kind:'concept-grid',type:'concept-grid',context:'concept',data:[n]},html=worksheetQuestionHTML(q);
  const rects=html.match(/<rect\b[^>]*>/g)!;assert.equal(rects.length,100);
  assert.equal(new Set(rects.map(tag=>attr(tag,'x')+','+attr(tag,'y'))).size,100);
  const filled=rects.filter(tag=>attr(tag,'fill')!=='#ffffff').length;
  assert.equal(filled*10,questionAnswer(q));
 }
 for(let amount=0;amount<10000;amount+=10)for(const place of [10,100,1000]){
  const expected=Number(String(amount/10).padStart(3,'0').at(place===10?-1:place===100?-2:-3))*place;
  const q:WorksheetQuestion={a:expected,b:0,operation:'+',digits:2,kind:'concept-place',type:'concept-place',context:'concept',data:[amount,place]},html=worksheetQuestionHTML(q);
  assert.ok(validQuestion(q));
  // Locate the underline in the explicitly printed one-whole-digit/two-fraction-digit numeral.
  const value=html.match(/<div>([\d.]*<u>\d<\/u>[\d.]*) →/)![1],plain=value.replace(/<\/?u>/g,''),digit=Number(value.match(/<u>(\d)<\/u>/)![1]);
  assert.equal(printedCents(plain),amount/10);
  const highlightedPosition=value.indexOf('<u>'),dotPosition=value.indexOf('.');
  const displayedPlace=highlightedPosition<dotPosition?1000:highlightedPosition===dotPosition+1?100:10;
  assert.equal(displayedPlace,place);assert.equal(digit*displayedPlace,questionAnswer(q));
 }
});

test('malformed saved diagrams, wrong answers, repeated decoder answers and impossible cipher sums are rejected',()=>{
 for(const type of CONCEPT_KINDS){
  const q=makeQuestion(type,new Set(),seeded(type.length+37),6);
  assert.equal(validQuestion({...q,a:q.a+10}),false,`${type}: wrong answer`);
  assert.equal(validQuestion({...q,data:[...q.data!,-1]}),false,`${type}: invalid shape`);
  assert.equal(validQuestion({...q,data:q.data!.map((n,i)=>i? n:NaN)}),false,`${type}: invalid number`);
 }
 const sheet={...generateWorksheet(allWeak,8,'invalid-map',1700000000000,seeded(82)),codeHash:'b'.repeat(64)};
 assert.ok(validWorksheet(sheet));
 assert.equal(validWorksheet({...sheet,questions:sheet.questions.map((q,i)=>i===1?sheet.questions[0]:q)}),false);
 assert.equal(validWorksheet({...sheet,decoder:sheet.decoder.map((entry,i)=>i===1?sheet.decoder[0]:entry)}),false);
 assert.equal(validWorksheet({...sheet,decoder:sheet.decoder.map(entry=>({...entry,rune:9}))}),false);
 assert.equal(validWorksheet({...sheet,groups:sheet.groups.map((group,i)=>i?group:group.slice(1))}),false);
 assert.equal(validWorksheet({...sheet,decoder:sheet.decoder.map((entry,i)=>i?entry:{...entry,rune:-1})}),false);
});
