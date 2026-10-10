export type DecimalTriple=readonly [number,number,number];
export function learningLevel(accountLevel:number){return Number.isSafeInteger(accountLevel)&&accountLevel>0?Math.min(10,accountLevel):1;}
export function normalizedAccountLevel(value:number){return Number.isSafeInteger(value)&&value>0?Math.min(1000000,value):1;}
function additionStage(stage:number){return Number.isSafeInteger(stage)&&stage>0?Math.min(4,stage):1;}
export function learningDescription(stage:number){return [
 '한 자리 소수 · 받아올림 없음',
 '한 자리 소수 · 받아올림 있음',
 '두 자리 소수 · 받아올림 없음',
 '두 자리 소수 · 받아올림 있음',
 ][additionStage(stage)-1];}
function rng(seed:number){let n=seed>>>0;return()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};}
function hasDecimalCarry(a:number,b:number){
 const hundredths=Math.floor(a/10)%10+Math.floor(b/10)%10>=10;
 return hundredths||Math.floor(a/100)%10+Math.floor(b/100)%10+(hundredths?1:0)>=10;
}
function compatible(values:number[],carry:boolean){
 const available=new Set(values);
 // Results can be chosen as inputs too. Check every possible equation, rather
 // than only the triples used to construct the board; duplicate inputs count.
 for(const a of available)for(const b of available)if(available.has(a+b)&&hasDecimalCarry(a,b)!==carry)return false;
 return true;
}
// Every triple supports addition a+b=c, including repeated values.
// Quantities stay exact in thousandths; learning uses tenths/hundredths only.
export function decimalTriples(seed:number,round:number,stage=1):DecimalTriple[]{
 const difficulty=additionStage(stage),carry=difficulty===2||difficulty===4,r=rng(seed^Math.imul(round+1,2654435761)^Math.imul(difficulty,2246822519));
 const pick=(a:number,b:number)=>a+Math.floor(r()*(b-a+1));
 const triples:DecimalTriple[]=[],values:number[]=[];
 const fallback:DecimalTriple[]=[[100,200,300],[600,700,1300],[110,220,330],[560,670,1230]];
 for(let i=0;i<5;i++){
  let triple:DecimalTriple|undefined;
  for(let attempt=0;attempt<64;attempt++){
   let a:number,b:number;
   if(difficulty===1){a=pick(1,4)*100;b=pick(1,4)*100;}
   else if(difficulty===2){const tenths=pick(3,9);a=tenths*100;b=pick(10-tenths,9)*100;}
   else if(difficulty===3){a=(pick(0,4)*10+pick(1,4))*10;b=(pick(0,4)*10+pick(1,4))*10;}
   else{const hundredths=pick(3,9);a=(pick(0,9)*10+hundredths)*10;b=(pick(0,9)*10+pick(10-hundredths,9))*10;if((a+b)%100===0)continue;}
   const candidate=[a,b,a+b] as const;
   if(compatible([...values,...candidate],carry)){triple=candidate;break;}
  }
  // Bound generation work. Reusing an accepted triple preserves both the
  // equation guarantee and the rule for all combinations across the board.
  triple??=triples.length?triples[pick(0,triples.length-1)]:fallback[difficulty-1];
  triples.push(triple);values.push(...triple);
 }
 return triples;
}
export function decimalBoard(seed:number,round:number,stage=1){
 const triples=decimalTriples(seed,round,stage),board=triples.flatMap(t=>[...t]);
 // Keep the original 16 slots. The extra value belongs to an existing triple,
 // so unlike a random decoy it can also form a valid three-block equation.
 board.push(triples[(round>>>0)%5][(round>>>0)%3]);
 const r=rng(seed^Math.imul(round+1,3266489917)^Math.imul(additionStage(stage),668265263));
 for(let i=15;i>0;i--){const j=Math.floor(r()*(i+1));[board[i],board[j]]=[board[j],board[i]];}return board;
}
