import type {Inventory} from './model';
import {Difficulty,isDifficulty} from './difficulty';
import {learningValue} from './math';
export interface Save{version:1;level:number;stars:number[];sfx:boolean;music:boolean;inventory:Inventory;difficulty:Difficulty;}
const KEY='decimal-castle-v1';
export function loadSave():Save{
 const base:Save={version:1,level:1,stars:Array(10).fill(0),sfx:true,music:false,inventory:{bricks:[],walls:0},difficulty:'standard'};
 try{const s=JSON.parse(localStorage.getItem(KEY)||'null');if(!s||s.version!==1)return base;return {...base,level:Math.max(1,Math.min(10,Math.floor(Number(s.level)||1))),stars:base.stars.map((_,i)=>Math.max(0,Math.min(3,Math.floor(Number(s.stars?.[i])||0)))),sfx:typeof s.sfx==='boolean'?s.sfx:true,music:!!s.music,difficulty:isDifficulty(s.difficulty)?s.difficulty:'standard',inventory:{bricks:Array.isArray(s.inventory?.bricks)?s.inventory.bricks.filter((n:unknown)=>typeof n==='number'&&learningValue(n)&&n>0&&n%10===0):[],walls:Number.isSafeInteger(s.inventory?.walls)&&s.inventory.walls>=0?s.inventory.walls:0}};}catch{return base;}
}
export function writeSave(s:Save){try{localStorage.setItem(KEY,JSON.stringify(s));return true;}catch{return false;}}
