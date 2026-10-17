import {screenMotionEase} from './screen-motion';

/** The tenth stronghold ends this world's curse; the expedition then departs. */
export const SECRET_SIEGE_ENDING_CHAPTERS=Object.freeze([
 Object.freeze({title:'마침내, 어둠이 걷히다',label:'악의 세력을 물리쳤습니다',caption:'마지막 성채의 저주 핵이 무너졌습니다. 마법사가 남긴 악의 세력도 사라지고, 긴 어둠 속에 잠겨 있던 세상에 빛이 돌아왔습니다.',duration:8}),
 Object.freeze({title:'우리가 되찾은 아침',label:'이 세상에 평화가 돌아왔습니다',caption:'숲에는 생기가, 마을에는 사람들의 웃음소리가 돌아왔습니다. 함께 싸운 병사들은 무사히 돌아와, 새롭게 시작될 하루를 맞이했습니다.',duration:8}),
 Object.freeze({title:'이제, 더 넓은 세상으로',label:'세계를 구하는 원정대',caption:'그러던 어느 날, 다른 세상에서 도움을 청하는 목소리가 들려왔습니다. 왕국의 병사들은 다시 함께 길을 나섰습니다. 이번에는 다른 세상에도 평화를 되찾아 줄 원정대가 되어.',duration:Infinity}),
]);

/** Collapse has time to settle before a slow, non-flashing dawn is revealed. */
export function secretSiegeWorldLight(victoryAge:number,reducedMotion=false){
 if(!Number.isFinite(victoryAge)||victoryAge<0)return 0;
 return reducedMotion?1:screenMotionEase((victoryAge-1.6)/2.5);
}
