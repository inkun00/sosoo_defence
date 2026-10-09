import Phaser from 'phaser';
import {DuelScene,DuelView} from '../src/multiplayer/scene';
import {createDuel,joinDuel,FLAME_MAX,Side} from '../src/multiplayer/duel';
import {numberText} from '../src/math';
import '../src/game.css';

const now=Date.now(),state=createDuel('left','왼쪽 수호자',71,now,1,{},'eclipse-labyrinth');
joinDuel(state,'right','오른쪽 수호자',now);
let side:Side=0;
const scene=new DuelScene(():DuelView=>({state,side,room:'체력 게이지 검증',selectedType:'',shopPage:0,slots:[],selectedTower:0,message:'',busy:false,connected:true}));
new Phaser.Game({type:Phaser.AUTO,parent:'field',width:1280,height:800,scene:[scene],backgroundColor:'#111216',scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},audio:{noAudio:true}});
function refresh(){
 state.revision++;scene.redraw();
 document.getElementById('proof')!.textContent=` 왼쪽 ${numberText(state.players[0].flame)} / ${numberText(FLAME_MAX)} · 오른쪽 ${state.players[1]?numberText(state.players[1].flame):'대기 중'} · ${side===0?'호스트':'참가자'} 시점`;
}
function health(left:number,right:number|null){
 state.players[0].flame=left;
 if(right===null)state.players[1]=null;
 else{if(!state.players[1])joinDuel(state,'right','오른쪽 수호자',now);state.players[1]!.flame=right;}
 refresh();
}
document.getElementById('full')!.onclick=()=>health(FLAME_MAX,FLAME_MAX);
document.getElementById('damage')!.onclick=()=>health(4500,1800);
document.getElementById('left-zero')!.onclick=()=>health(0,FLAME_MAX);
document.getElementById('right-zero')!.onclick=()=>health(FLAME_MAX,0);
document.getElementById('waiting')!.onclick=()=>health(FLAME_MAX,null);
document.getElementById('swap-side')!.onclick=()=>{side=side===0?1:0;refresh();};
document.getElementById('edge-towers')!.onclick=()=>{
 for(const owner of [0,1] as Side[]){const player=state.players[owner];if(player)player.towers=[{id:900+owner,typeId:'basic',x:owner===0?1:22,y:1,unit:100,cost:100,enabled:true,cooldown:0}];}
 refresh();
};
refresh();
