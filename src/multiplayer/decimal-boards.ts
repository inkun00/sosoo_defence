export type DecimalTriple=readonly [number,number,number];
export function learningLevel(accountLevel:number){return Number.isSafeInteger(accountLevel)&&accountLevel>0?Math.min(10,accountLevel):1;}
export function normalizedAccountLevel(value:number){return Number.isSafeInteger(value)&&value>0?Math.min(1000000,value):1;}
export function learningDescription(level:number){return [
 '한 자리 소수 · 작은 수',
 '한 자리 소수 · 1보다 작은 합',
 '한 자리 소수 · 받아올림·받아내림',
 '두 자리 소수 · 자리 맞추기',
 '두 자리 소수 · 받아올림·받아내림',
 '두 자리 소수 · 두 자리 연속 받아내림',
 '다른 자릿수 · 자연수와 소수',
 '자연수·두 자리 소수 · 연속 받아내림',
 '10을 넘는 합 · 0을 거치는 받아내림',
 '100을 넘는 합 · 여러 0을 거치는 받아내림',
 ][learningLevel(level)-1];}
function rng(seed:number){let n=seed>>>0;return()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};}
// Every triple supports both a+b=c and c-a=b, including repeated values.
// Quantities stay exact in thousandths; learning uses tenths/hundredths only.
export function decimalTriples(seed:number,round:number,accountLevel=1):DecimalTriple[]{
 const lv=learningLevel(accountLevel),r=rng(seed^Math.imul(round+1,2654435761)^Math.imul(lv,2246822519));
 const pick=(a:number,b:number)=>a+Math.floor(r()*(b-a+1));
 return Array.from({length:5},()=>{
  let a:number,b:number;
  if(lv<=2){const upper=lv===1?4:8;a=pick(1,upper)*100;b=pick(1,Math.min(upper,9-a/100))*100;}
  else if(lv===3){const tenths=pick(3,9);a=tenths*100;b=pick(10-tenths,9)*100;}
  else if(lv===4){a=(pick(0,4)*10+pick(1,4))*10;b=(pick(0,4)*10+pick(1,4))*10;}
  else if(lv===7){const t=pick(4,9);a=pick(1,4)*1000+t*100;b=pick(0,3)*1000+pick(10-t,9)*100+pick(1,9)*10;}
  else if(lv>=9){
   const integer=lv===9?pick(1,8):pick(10,89),fraction=pick(2,9)*10+pick(2,9),sumUnit=pick(1,fraction%10-1);
   a=integer*1000+fraction*10;b=((lv===9?9:99)-integer)*1000+(100+sumUnit-fraction)*10;
  }else{
   const t=lv===5?pick(1,4):pick(5,9),u=pick(3,9);
   const otherT=lv===5?pick(1,4):pick(10-t,9),otherU=pick(10-u,9);
   a=(t*10+u)*10;b=(otherT*10+otherU)*10;
   if(lv===8){a+=pick(1,8)*1000;b+=pick(0,8)*1000;}
  }
  return [a,b,a+b] as const;
 });
}
export function decimalBoard(seed:number,round:number,accountLevel=1){
 const triples=decimalTriples(seed,round,accountLevel),board=triples.flatMap(t=>[...t]);
 // Keep the original 16 slots. The extra value belongs to an existing triple,
 // so unlike a random decoy it can also form a valid three-block equation.
 board.push(triples[(round>>>0)%5][(round>>>0)%3]);
 const r=rng(seed^Math.imul(round+1,3266489917)^Math.imul(learningLevel(accountLevel),668265263));
 for(let i=15;i>0;i--){const j=Math.floor(r()*(i+1));[board[i],board[j]]=[board[j],board[i]];}return board;
}
