import {LEVELS, type Level} from './levels';
import {Defense, type Event} from './model';
import {key, type Cell} from './path';
import type {FusionOperation} from './math';

export const TUTORIAL_TOWER_CELL:Readonly<Cell>={x:1,y:3};
export const TUTORIAL_WALL_CELL:Readonly<Cell>={x:1,y:4};
export const TUTORIAL_STEPS=['welcome','tower','place-tower','purchase','forge','fusion','wall','start','battle','complete'] as const;
export type TutorialStep=typeof TUTORIAL_STEPS[number];
export interface TutorialGuide {
 id:TutorialStep;
 title:string;
 text:string;
 focus:'none'|'tower'|'field'|'purchase'|'forge'|'fusion'|'wall'|'start'|'battle';
 button?:string;
}

const GUIDES:Record<TutorialStep,Omit<TutorialGuide,'id'>>={
 welcome:{title:'처음이라면, 함께 연습해요',text:'타워 설치부터 성벽 만들기와 자동 전투까지 직접 해 봐요. 연습용 코인과 벽돌을 사용해요.',focus:'none',button:'연습 시작'},
 tower:{title:'1. 기본 포탑을 골라요',text:'기본 포탑을 누르면 설치할 준비가 돼요. 공격력은 0.1이에요.',focus:'tower'},
 'place-tower':{title:'2. 길 옆에 타워를 놓아요',text:'빛나는 빈 칸을 눌러요. 타워는 길 위가 아니라 길 옆에 설치해요.',focus:'field'},
 purchase:{title:'3. 타워 가격을 빼요',text:'보유 코인에서 타워 가격을 빼고 남는 코인을 입력해요. 소수점을 맞춰 계산하면 돼요.',focus:'purchase'},
 forge:{title:'4. 성벽을 만들어요',text:'성벽 합성을 열어요. 벽돌의 덧셈을 맞히면 길을 지키는 성벽을 얻어요.',focus:'forge',button:'성벽 합성'},
 fusion:{title:'5. 두 벽돌의 합을 찾아요',text:'0.2와 0.3을 고르고, 합인 0.5를 골라 합성해요. 성벽은 덧셈으로 만들어요.',focus:'fusion'},
 wall:{title:'6. 성벽은 길 위에 놓아요',text:'빛나는 길 위의 칸에 성벽을 설치해요. 몬스터가 부딪힐 때마다 내구도가 1씩 줄어요.',focus:'wall'},
 start:{title:'7. 방어를 시작해요',text:'준비가 끝났어요. 방어 시작을 누르면 몬스터가 움직이고 타워가 자동으로 공격해요.',focus:'start',button:'방어 시작'},
 battle:{title:'8. 자동 전투를 살펴봐요',text:'타워가 몬스터 체력을 0.1씩 줄여요. 성벽은 몬스터를 튕겨 내고 세 번째 충돌에 부서져요.',focus:'battle'},
 complete:{title:'기본 훈련 완료!',text:'타워는 코인 뺄셈으로 설치하고, 성벽은 벽돌 덧셈으로 만들어요. 이제 모험에서 성을 지켜 보세요.',focus:'none',button:'모험 시작하기'}
};

/** A disposable stage-one model keeps real combat rules without reward-store writes. */
export class TutorialDefense extends Defense {
 tutorialShots=0;
 tutorialWallImpacts=0;
 tutorialWallBreaks=0;
 purchaseUnlocked=false;
 forgeUnlocked=false;
 private disposed=false;

 constructor(){
  const level:Level={...LEVELS[0],name:'기본 훈련',subtitle:'타워와 성벽 설치 연습',hint:'안내에 따라 기본 포탑과 성벽을 준비해요.',units:[100],effects:['basic'],hp:[600],bricks:[200,300,500],budget:900,goal:'wall'};
  super(level,{bricks:[200,300,500],walls:0},'practice');
 }
 override get goals(){return [
  {label:'뺄셈으로 기본 포탑 1개 설치',done:this.purchaseAnswers>=1},
  {label:'덧셈으로 성벽 합성하고 길 위에 설치',done:this.fusions>=1&&this.wallPlacements>=1},
  {label:'자동 공격과 성벽 3회 충돌 확인',done:this.tutorialShots>0&&this.tutorialWallImpacts>=3&&this.tutorialWallBreaks>0&&this.kills>=1}
 ];}
 override emit(event:Event){
  if(event.type==='shot')this.tutorialShots++;
  if(event.type==='wall-impact')this.tutorialWallImpacts++;
  if(event.type==='wall-break')this.tutorialWallBreaks++;
  super.emit(event);
 }
 override requestPurchase(cell:Cell,typeId:string){
  if(this.disposed||!this.purchaseUnlocked)return false;
  if(typeId!=='basic')return this.notice('이번 연습에서는 기본 포탑을 골라요.');
  if(this.towers.length)return this.notice('기본 포탑 한 개로 자동 전투를 연습해요.');
  if(key(cell)!==key(TUTORIAL_TOWER_CELL))return this.notice('빛나는 길 옆의 빈 칸에 기본 포탑을 설치해요.');
  return super.requestPurchase(cell,typeId);
 }
 override fuse(ids:number[],operation:FusionOperation='+'){
  if(this.disposed||!this.forgeUnlocked||!this.towers.length)return false;
  return super.fuse(ids,operation);
 }
 override placeWall(cell:Cell){
  if(this.disposed)return false;
  if(key(cell)!==key(TUTORIAL_WALL_CELL))return this.notice('빛나는 길 위의 칸에 연습용 성벽을 설치해요.');
  return super.placeWall(cell);
 }
 override start(){
  if(this.disposed)return false;
  if(!this.towers.length||!this.fusions||!this.walls.length)return this.notice('기본 포탑을 설치하고 성벽을 합성해 길 위에 놓은 뒤 시작해요.');
  const started=super.start();
  if(started)this.spawn();
  return started;
 }
 dispose(){this.disposed=true;this.cancelPurchase();this.cancelWall();if(this.phase==='playing')this.phase='paused';}
}

/** State is derived from actual model actions, including cancellation and recovery. */
export class TutorialSession {
 readonly model=new TutorialDefense();
 readonly suggestedTowerCell:Readonly<Cell>=TUTORIAL_TOWER_CELL;
 readonly suggestedWallCell:Readonly<Cell>=TUTORIAL_WALL_CELL;
 private begun=false;
 private chosenTower=false;
 private forgeOpen=false;
 private disposed=false;
 step:TutorialStep='welcome';

 get guide():TutorialGuide{return {id:this.step,...GUIDES[this.step]};}
 get progress(){return {current:TUTORIAL_STEPS.indexOf(this.step),total:TUTORIAL_STEPS.length-1};}
 get completed(){return this.step==='complete';}
 begin(){
  if(this.disposed||this.begun)return false;
  this.begun=true;this.sync();return true;
 }
 selectTower(typeId:string){
  if(this.disposed||!this.begun||typeId!=='basic'||this.model.towers.length)return false;
  this.chosenTower=true;this.model.purchaseUnlocked=true;this.sync();return true;
 }
 openForge(){
  if(this.disposed||!this.model.towers.length||this.model.fusions)return false;
  this.forgeOpen=true;this.model.forgeUnlocked=true;this.sync();return true;
 }
 closeForge(){this.forgeOpen=false;this.sync();}
 start(){const started=!this.disposed&&this.model.start();this.sync();return started;}
 sync():TutorialStep {
  if(this.disposed||this.completed)return this.step;
  const model=this.model;
  if(!this.begun)this.step='welcome';
  else if(model.tutorialShots>0&&model.tutorialWallImpacts>=3&&model.tutorialWallBreaks>0&&model.kills>0)this.step='complete';
  else if(model.phase==='playing'||model.phase==='paused')this.step='battle';
  else if(!model.towers.length)this.step=model.pendingPurchase?'purchase':this.chosenTower?'place-tower':'tower';
  else if(!model.fusions)this.step=this.forgeOpen?'fusion':'forge';
  else if(!model.walls.length)this.step='wall';
  else this.step='start';
  return this.step;
 }
 dispose(){this.disposed=true;this.model.dispose();}
}
