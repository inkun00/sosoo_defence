import {test} from 'node:test';
import assert from 'node:assert/strict';
import type Phaser from 'phaser';
import {DuelHeroEffectBadges} from '../src/multiplayer/hero-effect-badges';

class Item{
 destroyed=false;name='';texture='';list:Item[]=[];data=new Map<string,unknown>();
 constructor(public x=0,public y=0){}
 setDepth(){return this;}setDisplaySize(){return this;}setInteractive(){return this;}
 setName(name:string){this.name=name;return this;}setData(key:string,value:unknown){this.data.set(key,value);return this;}
 on(){return this;}setPosition(x:number,y:number){this.x=x;this.y=y;return this;}
 add(item:Item){this.list.push(item);return this;}
 removeAll(destroy:boolean){if(destroy)for(const item of this.list)item.destroy();this.list=[];return this;}
 destroy(){this.destroyed=true;for(const item of this.list)item.destroy();}
}
test('소진되거나 범위를 벗어난 영웅 효과의 머리 위 아이콘과 입장 트윈이 제거된다',()=>{
 const items:Item[]=[],containers:Item[]=[],killed:Item[]=[];
 const scene={add:{container(x:number,y:number){const item=new Item(x,y);containers.push(item);return item;},image(x:number,y:number,texture:string){const item=new Item(x,y);item.texture=texture;items.push(item);return item;}},tweens:{killTweensOf(item:Item){killed.push(item);},add(){}}} as unknown as Phaser.Scene;
 const badges=new DuelHeroEffectBadges(scene,false);
 badges.sync(['shield','tower-haste']);assert.equal(badges.visible,true);
 assert.deepEqual(items.map(item=>item.texture),['hero-effect-shield','hero-effect-tower-haste']);
 assert.deepEqual(items.map(item=>item.data.get('heroEffect')),['shield','tower-haste']);
 assert.deepEqual(items.map(item=>item.x),[-12,12]);
 badges.sync(['shield','tower-haste']);assert.equal(items.length,2,'동일한 호스트 상태에서 아이콘을 중복 생성하지 않는다');
 badges.sync(['tower-haste']);assert.ok(items.slice(0,2).every(item=>item.destroyed));assert.equal(killed.length,2);
 assert.deepEqual(containers[0].list.map(item=>item.texture),['hero-effect-tower-haste']);
 badges.position(-100,-100,40,950,132);assert.deepEqual([containers[0].x,containers[0].y],[52,146],'지도 가장자리에서 아이콘이 화면 밖으로 사라지지 않는다');
 badges.sync([]);assert.equal(badges.visible,false);assert.equal(containers[0].list.length,0);assert.ok(items.every(item=>item.destroyed));
 badges.destroy();assert.equal(containers[0].destroyed,true);
});
