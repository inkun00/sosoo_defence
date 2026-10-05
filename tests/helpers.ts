import {Defense} from '../src/model';
import type {Cell} from '../src/path';
import {numberText} from '../src/math';
import {towersForStage} from '../src/towers';
export function install(m:Defense,c:Cell,unit:number,_effect?:string){
 const type=towersForStage(m.level.id).find(t=>t.unit===unit);if(!type||!m.requestPurchase(c,type.id))return false;
 const q=m.pendingPurchase!;return m.answerPurchase(numberText(q.before-q.cost,3));
}
