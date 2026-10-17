import assert from 'node:assert/strict';
import test from 'node:test';
import {brickDisplayOrder} from '../src/brick-display-order';
import {wallRecipePool} from '../src/wall-recipes';

const bricks=(values:readonly number[])=>values.map((value,index)=>({id:index*7+11,value}));
function adjacentRecipes(items:readonly {value:number}[]){
 let count=0;
 for(let i=0;i<items.length-2;i++){
  const [a,b,c]=items.slice(i,i+3).map(brick=>brick.value);
  if(a+b===c||a+c===b||b+c===a)count++;
 }
 return count;
}
function preserves<T extends {id:number;value:number}>(input:readonly T[],output:readonly T[]){
 assert.equal(output.length,input.length);assert.notEqual(output,input);
 assert.deepEqual(output.map(brick=>brick.id).sort((a,b)=>a-b),input.map(brick=>brick.id).sort((a,b)=>a-b));
 for(const brick of input)assert.equal(output.filter(item=>item===brick).length,input.filter(item=>item===brick).length,'preserve each original object reference and multiplicity');
}

test('separates two addition recipe drops instead of merely swapping operands',()=>{
 const input=Object.freeze(bricks([100,200,300,400,500,900]).map(Object.freeze)),snapshot=input.slice();
 const order=brickDisplayOrder(input);
 assert.equal(adjacentRecipes(order),0);assert.deepEqual(input,snapshot);preserves(input,order);
 assert.notDeepEqual(order.map(brick=>brick.id),input.map(brick=>brick.id));
});

test('disperses 24 saved bricks across all four pages and their boundaries',()=>{
 const input=bricks([100,200,300,100,300,400,200,300,500,200,400,600,100,500,600,300,400,700,200,500,700,100,700,800]);
 assert.ok(adjacentRecipes(input)>=8);
 const order=brickDisplayOrder(input);
 assert.equal(adjacentRecipes(order),0);preserves(input,order);
 for(const boundary of [6,12,18])assert.equal(adjacentRecipes(order.slice(boundary-2,boundary+2)),0,'no adjacent answer set straddles a page');
});

test('display order stays stable across selection changes, repeated rendering and regenerated save IDs',()=>{
 const input=bricks([110,230,340,170,280,450,130,490,620,240,370,610]);
 const first=brickDisplayOrder(input),again=brickDisplayOrder(input);
 assert.deepEqual(first.map(brick=>brick.id),again.map(brick=>brick.id));
 const selected=new Set([input[0].id,input[4].id]);
 const withSelection=input.map(brick=>({...brick,selected:selected.has(brick.id)}));
 assert.deepEqual(brickDisplayOrder(withSelection).map(brick=>brick.id),first.map(brick=>brick.id));
 const restored=input.map((brick,index)=>({id:index+1,value:brick.value}));
 assert.deepEqual(brickDisplayOrder(restored).map(brick=>brick.value),first.map(brick=>brick.value));
});

test('new recipe drops are dispersed with the existing inventory and duplicate values remain distinct',()=>{
 const stored=bricks([100,200,300,100,200,300,100,200,300,100,200,300]);
 const drop=[{id:301,value:200},{id:302,value:400},{id:303,value:600}],input=[...stored,...drop];
 const order=brickDisplayOrder(input);
 assert.equal(adjacentRecipes(order),0);preserves(input,order);
 assert.equal(order.filter(brick=>brick.value===100).length,4);
 assert.equal(order.filter(brick=>brick.value===200).length,5);
});

test('empty, small, identical and impossible inventories finish without losing any materials',()=>{
 for(const values of [[],[100],[100,200],[100,200,300],[100,100,100,100,100],[100,100,100,200]]){
  const input=bricks(values),order=brickDisplayOrder(input);preserves(input,order);
  assert.deepEqual(order,brickDisplayOrder(input));
  if(values.length<=3||new Set(values).size<=1)assert.deepEqual(order,input);
 }
 // Every location for 200 in four entries leaves a contiguous 100+100=200.
 assert.ok(adjacentRecipes(brickDisplayOrder(bricks([100,100,100,200])))>0);
});

test('real stage recipe banks do not expose adjacent answer sets in 24-brick inventories',()=>{
 for(let stage=1;stage<=11;stage++)for(let sample=0;sample<24;sample++){
  const pool=wallRecipePool(stage),values=Array.from({length:8},(_,i)=>pool[(sample*19+i*37)%pool.length]).flat();
  const input=bricks(values),order=brickDisplayOrder(input);
  assert.equal(adjacentRecipes(order),0,`stage ${stage}, saved inventory ${sample}`);preserves(input,order);
 }
});

test('large duplicate-heavy inventories use bounded work and never consume combat Math.random',()=>{
 const original=Math.random;Math.random=()=>{throw new Error('combat RNG was consumed');};
 try{
  const input=bricks(Array.from({length:12000},(_,i)=>i%6===0?200:100)),start=performance.now(),order=brickDisplayOrder(input);
  assert.equal(order.length,input.length);assert.equal(new Set(order.map(brick=>brick.id)).size,input.length);
  assert.deepEqual(order.map(brick=>brick.value).sort((a,b)=>a-b),input.map(brick=>brick.value).sort((a,b)=>a-b));
  assert.ok(performance.now()-start<3000,'bounded local repair handles an oversized inventory');
 }finally{Math.random=original;}
});
