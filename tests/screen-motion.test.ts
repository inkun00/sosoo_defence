import test from 'node:test';
import assert from 'node:assert/strict';
import {SCREEN_MOTION_SPEED,screenMotionDuration,screenMotionEase} from '../src/screen-motion';

test('presentation travel takes enough time to run at seventy percent speed',()=>{
 assert.equal(SCREEN_MOTION_SPEED,.7);
 for(const original of [0,35,240,260,280,1000,1200,1800,1900])assert.ok(Math.abs(screenMotionDuration(original)*.7-original)<1e-9);
});

test('transitions accelerate smoothly from rest and slow down before settling',()=>{
 assert.equal(screenMotionEase(0),0);assert.equal(screenMotionEase(.5),.5);assert.equal(screenMotionEase(1),1);
 let previous=0;for(let step=0;step<=100;step++){const progress=screenMotionEase(step/100);assert.ok(progress>=previous&&progress<=1);previous=progress;}
 const opening=screenMotionEase(.02)-screenMotionEase(0),middle=screenMotionEase(.51)-screenMotionEase(.49),closing=screenMotionEase(1)-screenMotionEase(.98);
 assert.ok(middle>opening*100);assert.ok(middle>closing*100);
 assert.equal(screenMotionEase(-1),0);assert.equal(screenMotionEase(2),1);assert.equal(screenMotionEase(NaN),0);
});
