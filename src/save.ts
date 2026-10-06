import type {Inventory} from './model';
import {Difficulty,isDifficulty} from './difficulty';
import {learningValue} from './math';
export interface Save{version:1;level:number;resumeStage:number;stars:number[];sfx:boolean;music:boolean;inventory:Inventory;difficulty:Difficulty;started:boolean;campaignCompleted:boolean;narration:boolean;}
const KEY='decimal-castle-v1';
export function loadSave():Save{
 const base:Save={version:1,level:1,resumeStage:1,stars:Array(10).fill(0),sfx:true,music:true,inventory:{bricks:[],walls:0},difficulty:'standard',started:false,campaignCompleted:false,narration:true};
 try{
  // Older duel screens saved effects separately. Preserve an explicit OFF
  // while moving all three screens to the same audio preferences.
  base.sfx=localStorage.getItem('decimal-duel-sfx')!=='off';
  const s=JSON.parse(localStorage.getItem(KEY)||'null');if(!s||s.version!==1)return base;
  const level=Math.max(1,Math.min(10,Math.floor(Number(s.level)||1)));
  return {...base,level,resumeStage:Math.max(1,Math.min(level,Math.floor(Number(s.resumeStage??s.level)||1))),stars:base.stars.map((_,i)=>Math.max(0,Math.min(3,Math.floor(Number(s.stars?.[i])||0)))),sfx:base.sfx&&(typeof s.sfx==='boolean'?s.sfx:true),music:typeof s.music==='boolean'?s.music:true,narration:s.narration!==false,started:!!s.started,campaignCompleted:!!s.campaignCompleted,difficulty:isDifficulty(s.difficulty)?s.difficulty:'standard',inventory:{bricks:Array.isArray(s.inventory?.bricks)?s.inventory.bricks.filter((n:unknown)=>typeof n==='number'&&learningValue(n)&&n>0&&n%10===0):[],walls:Number.isSafeInteger(s.inventory?.walls)&&s.inventory.walls>=0?s.inventory.walls:0}};
 }catch{return base;}
}
export function writeSave(s:Save){try{localStorage.setItem(KEY,JSON.stringify(s));}catch{return false;}try{localStorage.removeItem?.('decimal-duel-sfx');}catch{}return true;}
export function hasAdventure(s:Save){return s.started||s.level>1||s.stars.some(n=>n>0)||s.inventory.bricks.length>0||s.inventory.walls>0;}
export function newAdventure(s:Save):Save{return {...s,level:1,resumeStage:1,stars:Array(10).fill(0),inventory:{bricks:[],walls:0},started:true,campaignCompleted:false};}
