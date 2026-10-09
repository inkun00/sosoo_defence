import {test} from 'node:test';
import type {Inventory} from '../src/model';
import {LEVELS} from '../src/levels';
import {playAutomaticStage} from './adventure-helpers';

for(const difficulty of ['practice','standard','challenge'] as const){
 test(`${difficulty}: all 11 stages clear with automatic fire and no firing controls`,()=>{
  for(const level of LEVELS)playAutomaticStage(level.id,difficulty,{bricks:[],walls:0});
 });
 test(`${difficulty}: a complete automatic-fire campaign preserves earned walls and durability`,()=>{
  let inventory:Inventory={bricks:[],walls:0};
  for(const level of LEVELS)inventory=playAutomaticStage(level.id,difficulty,inventory).inventory;
 });
}
