import type {Cell} from './path';

type RockRectangle=readonly [x:number,y:number,width:number,height:number];
export interface StageMap{
 readonly id:number;readonly name:string;readonly start:Cell;readonly end:Cell;
 readonly rocks:readonly RockRectangle[];
 readonly floorTint:number;readonly pathTint:number;readonly rockTint:number;
}
// Designed layouts keep retries predictable while changing the route, building
// spaces and flame location from one learning stage to the next.
export const STAGE_MAPS:readonly StageMap[]=[
 {id:1,name:'불꽃 앞뜰',start:{x:0,y:4},end:{x:15,y:4},rocks:[[4,0,1,6],[9,3,1,6]],floorTint:0xc4c0b8,pathTint:0xffe1b6,rockTint:0xffffff},
 {id:2,name:'굽이진 회랑',start:{x:0,y:4},end:{x:15,y:7},rocks:[[5,0,1,7],[10,2,1,7]],floorTint:0xb8b9ac,pathTint:0xf2d29d,rockTint:0xe1dfc9},
 {id:3,name:'달빛 고갯길',start:{x:0,y:4},end:{x:15,y:2},rocks:[[4,2,1,7],[10,0,1,7],[7,4,2,1]],floorTint:0xb0bdd1,pathTint:0xd5dbea,rockTint:0xc7d4eb},
 {id:4,name:'수정의 광장',start:{x:0,y:4},end:{x:15,y:4},rocks:[[5,1,6,6],[13,0,1,2]],floorTint:0xbeb1d0,pathTint:0xe4cee8,rockTint:0xddc6ed},
 {id:5,name:'쌍둥이 보루',start:{x:0,y:4},end:{x:15,y:4},rocks:[[4,0,3,6],[10,3,3,6]],floorTint:0xb4c6b1,pathTint:0xd7dfa6,rockTint:0xc5dfb9},
 {id:6,name:'돌의 나선',start:{x:0,y:4},end:{x:8,y:4},rocks:[[4,1,1,6],[4,1,9,1],[4,6,9,1]],floorTint:0xc8b9a5,pathTint:0xf1d2aa,rockTint:0xe3d0b3},
 {id:7,name:'세 개의 관문',start:{x:0,y:4},end:{x:15,y:4},rocks:[[4,0,1,7],[9,3,1,6],[13,0,1,6]],floorTint:0xadc7c5,pathTint:0xc5e3d8,rockTint:0xbbe0d8},
 {id:8,name:'서리 뱀길',start:{x:0,y:4},end:{x:15,y:1},rocks:[[3,0,1,6],[7,3,1,6],[10,0,1,6],[13,3,1,6]],floorTint:0xa6bdd5,pathTint:0xd1e9f2,rockTint:0xc0e0ed},
 {id:9,name:'균열의 우회로',start:{x:0,y:4},end:{x:15,y:7},rocks:[[4,0,1,6],[9,3,1,6],[12,1,2,3]],floorTint:0xc6a6af,pathTint:0xecc3ab,rockTint:0xe2b7c1},
 {id:10,name:'돌왕의 미궁',start:{x:0,y:4},end:{x:15,y:4},rocks:[[4,0,1,6],[8,3,1,6],[11,0,1,6],[14,3,1,6]],floorTint:0xb5a6c8,pathTint:0xe7bc93,rockTint:0xd5b8e6}
];
export function stageMap(stage:number):StageMap{return STAGE_MAPS[stage-1]??STAGE_MAPS[0];}
