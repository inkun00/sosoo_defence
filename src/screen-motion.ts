/** Presentation timing only: game clocks and looping sprites keep their speed. */
export const SCREEN_MOTION_SPEED=.7;
export const SCREEN_MOTION_EASING='cubic-bezier(.42,0,.58,1)';
export const SCREEN_MOTION_PHASER_EASING='Cubic.easeInOut';
export const screenMotionDuration=(original:number)=>original/SCREEN_MOTION_SPEED;
export function screenMotionEase(value:number){
 const t=Math.max(0,Math.min(1,Number.isFinite(value)?value:0));
 return t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
}
