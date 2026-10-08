import {wallRecipeKey,wallRecipePool,type WallRecipe} from './wall-recipes';
import {learningValue} from './math';

const KEY='decimal-wall-recipes-v1',RECENT=8;
interface History{version:1;stages:Record<string,string[]>;nextGroups:Record<string,number>;}
const empty=():History=>({version:1,stages:{},nextGroups:{}});
let memory=empty();

function validKey(key:unknown):key is string{
 if(typeof key!=='string'||!/^\d+:\d+:\d+$/.test(key))return false;
 const [a,b,c]=key.split(':').map(Number);
 return [a,b,c].every(n=>learningValue(n)&&n>0&&n%10===0)&&a<=b&&a+b===c;
}
function load():History{
 try{
  const raw=JSON.parse(localStorage.getItem(KEY)||'null'),history=empty();
  if(raw?.version===1&&raw.stages&&typeof raw.stages==='object')for(let stage=1;stage<=11;stage++){
   const values=raw.stages[String(stage)];if(Array.isArray(values))history.stages[String(stage)]=values.filter(validKey).slice(-RECENT);
   const group=raw.nextGroups?.[String(stage)];if(Number.isInteger(group)&&group>=0&&group<6)history.nextGroups[String(stage)]=group;
  }
  return memory=history;
 }catch{return memory;}
}

// This random source belongs only to brick recipes; it never consumes the
// combat generator used for stun rolls or changes the number of rewards.
export function drawWallRecipe(stageId:number,groupIndex:number,random:()=>number=Math.random):WallRecipe{
 const history=load(),group=history.nextGroups[String(stageId)]??groupIndex,pool=wallRecipePool(stageId,group),recent=[...(history.stages[String(stageId)]??[])];
 let candidates=pool.filter(values=>!recent.includes(wallRecipeKey(values)));
 // Only relax the oldest exclusion if a future curriculum has a small bank.
 while(!candidates.length&&recent.length){recent.shift();candidates=pool.filter(values=>!recent.includes(wallRecipeKey(values)));}
 const roll=random(),index=Number.isFinite(roll)?Math.floor(Math.max(0,Math.min(1-Number.EPSILON,roll))*candidates.length):0;
 const values=candidates[index],key=wallRecipeKey(values);
 history.stages[String(stageId)]=[...recent.filter(k=>k!==key),key].slice(-RECENT);history.nextGroups[String(stageId)]=(group+1)%6;memory=history;
 try{localStorage.setItem(KEY,JSON.stringify(history));}catch{/* Recipes still vary when browser storage is unavailable. */}
 return [...values] as WallRecipe;
}
