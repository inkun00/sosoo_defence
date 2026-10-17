type DisplayBrick={id:number;value:number};
const MAX_ATTEMPTS=6,MAX_SWAP_CHECKS=40000;

function isRecipe<T extends DisplayBrick>(bricks:readonly T[],start:number){
 const a=bricks[start].value,b=bricks[start+1].value,c=bricks[start+2].value;
 return a+b===c||a+c===b||b+c===a;
}
function recipeCount<T extends DisplayBrick>(bricks:readonly T[]){
 let count=0;for(let i=0;i<bricks.length-2;i++)if(isRecipe(bricks,i))count++;return count;
}
function affectedCount<T extends DisplayBrick>(bricks:readonly T[],a:number,b:number){
 let count=0;
 for(let start=Math.max(0,a-2);start<=Math.min(a,bricks.length-3);start++)if(isRecipe(bricks,start))count++;
 for(let start=Math.max(0,b-2);start<=Math.min(b,bricks.length-3);start++)if((start<a-2||start>a)&&isRecipe(bricks,start))count++;
 return count;
}
function shuffled<T>(items:readonly T[],seed:number):T[]{
 const result=items.slice();let state=seed||0x6d2b79f5;
 for(let i=result.length-1;i>0;i--){
  state^=state<<13;state^=state>>>17;state^=state<<5;
  const j=(state>>>0)%(i+1);[result[i],result[j]]=[result[j],result[i]];
 }
 return result;
}

/**
 * Display the complete inventory before paging, without revealing recipe drops
 * as consecutive a, b, a+b triples. This never changes inventory or combat RNG.
 * The seed uses values only: saved inventories regenerate IDs on reload, while
 * retaining their value order. Returned entries remain the caller's objects.
 * Separation is best effort: small/duplicate-heavy inventories may make it
 * impossible, and six attempts plus a fixed swap budget bound the total work.
 */
export function brickDisplayOrder<T extends DisplayBrick>(bricks:readonly T[]):T[]{
 if(bricks.length<=3||bricks.every(brick=>brick.value===bricks[0].value))return bricks.slice();
 let seed=2166136261;
 for(const brick of bricks)seed=Math.imul(seed^brick.value,16777619)>>>0;
 let best=bricks.slice(),bestCount=recipeCount(best),checks=0;
 for(let attempt=0;attempt<MAX_ATTEMPTS;attempt++){
  const order=shuffled(bricks,(seed^Math.imul(attempt+1,0x9e3779b9))>>>0);
  // Swaps only improve the global conflict count. Checking all affected
  // windows also includes triples crossing the six-item page boundary.
  for(let pass=0;pass<3&&checks<MAX_SWAP_CHECKS;pass++){
   let changed=false;
   for(let i=0;i<order.length-2&&checks<MAX_SWAP_CHECKS;i++){
    if(!isRecipe(order,i))continue;
    let repaired=false;
    for(let position=i+2;position>=i&&!repaired;position--){
     const candidates=Math.min(order.length,96);
     for(let probe=0;probe<candidates&&checks<MAX_SWAP_CHECKS;probe++){
      // Nearby choices help small inventories; spread the other choices over
      // large inventories instead of repeatedly searching their whole length.
      const other=order.length<=96?(i+3+probe)%order.length:probe<48?(i+3+probe)%order.length:Math.floor((probe-48)*order.length/48);
      if(other>=i&&other<=i+2)continue;
      checks++;const before=affectedCount(order,position,other);
      [order[position],order[other]]=[order[other],order[position]];
      if(affectedCount(order,position,other)<before){changed=true;repaired=true;break;}
      [order[position],order[other]]=[order[other],order[position]];
     }
    }
   }
   if(!changed)break;
  }
  const count=recipeCount(order);
  // Prefer a shuffled display over the input when their scores tie.
  if(count<bestCount||attempt===0&&count===bestCount){best=order;bestCount=count;}
  if(bestCount===0||checks>=MAX_SWAP_CHECKS)break;
 }
 return best;
}
