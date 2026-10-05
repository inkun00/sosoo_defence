// All quantities use thousandths as integers. 0.001 is currency only.
export const SCALE=1000;
export function decimal(value:number,digits=1):string {
 if(!Number.isSafeInteger(value))throw new Error('Exact integer amount required');
 const sign=value<0?'-':'';const v=Math.abs(value);
 return sign+Math.floor(v/1000)+(digits?'.'+String(v%1000).padStart(3,'0').slice(0,digits):'');
}
export function precision(value:number):number{return value%100?value%10?3:2:1;}
export function numberText(value:number,min=1):string{return decimal(value,Math.max(min,precision(value)));}
export function hit(hp:number,damage:number):{hp:number;valid:boolean;killed:boolean}{
 if(!Number.isSafeInteger(hp)||!Number.isSafeInteger(damage)||hp<=0||damage<=0)throw new Error('Invalid damage');
 const valid=damage<=hp;return {hp:valid?hp-damage:hp,valid,killed:valid&&hp===damage};
}
export type FusionOperation='+'|'-';
export function recipe(a:number,b:number,c:number,operation:FusionOperation='+'):boolean{
 if(![a,b,c].every(n=>Number.isSafeInteger(n)&&n>0))return false;
 return operation==='+'?a+b===c:operation==='-'&&a-b===c;
}
const hitTables=new Map<string,{step:number;values:number[]}>();
export function minimumHits(hp:number,units:number[]):number{
 const sorted=[...new Set(units.filter(n=>Number.isSafeInteger(n)&&n>0))].sort((a,b)=>a-b);if(!sorted.length)return Infinity;
 const gcd=(a:number,b:number):number=>b?gcd(b,a%b):a,key=sorted.join(',');let table=hitTables.get(key);
 if(!table){table={step:sorted.reduce(gcd),values:[0]};hitTables.set(key,table);}
 if(hp%table.step)return Infinity;const target=hp/table.step,coins=sorted.map(n=>n/table!.step);
 for(let n=table.values.length;n<=target;n++){let best=Infinity;for(const c of coins){if(c>n)break;best=Math.min(best,table.values[n-c]+1);}table.values.push(best);}
 return table.values[target];
}
export function reward(hp:number,hits:number,units:number[],stage:number):number{
 const efficiency=Math.max(.25,Math.min(1,minimumHits(hp,units)/Math.max(1,hits)));
 const unit=stage>=4?1:100;
 return Math.max(unit,Math.min(9000,Math.round(2*(160+stage*38+hp*.12)*(0.6+efficiency*.9)/unit)*unit));
}
export function regroupMessage(before:number,damage:number,digits:number):string{
 const unit=digits===1?100:10;
 const lowBefore=Math.floor(before/unit)%10,lowDamage=Math.floor(damage/unit)%10;
 if(lowBefore<lowDamage)return digits===1?'1을 0.1 열 개로 바꾸어 받아내려요.':'0.1을 0.01 열 개로 바꾸어 받아내려요.';
 if(Math.floor(before/100)%10<Math.floor(damage/100)%10)return '1을 0.1 열 개로 바꾸어 받아내려요.';
 return '소수점을 맞추고 같은 자리끼리 빼요.';
}
