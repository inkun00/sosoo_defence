import {collectionHTML,heroRevealHTML} from '../src/collection-ui';
import {heroSpec} from '../src/multiplayer/heroes';
import type {Workbook} from '../src/worksheet-store';
import '../src/game.css';
import '../src/worksheet.css';
import '../src/collection.css';
const ids=new URLSearchParams(location.search).has('single')?['hero-1-0']:['hero-1-0','hero-3-1','hero-5-2','hero-7-0','hero-10-2'];
const book:Workbook={version:1,sheets:[],collection:ids.map((heroId,i)=>({heroId,copies:i+1,obtainedAt:0})),selectedHero:ids[0]};
document.getElementById('app')!.innerHTML='<main class="workbook hero-collection-preview"><div class="workbook-toolbar"><button id="collection">수집 영웅</button>'+ids.map((id,i)=>'<button data-reveal="'+id+'">'+(i*2+1)+'등급 확인</button>').join('')+'</div><div class="workbook-dialog" role="dialog" aria-label="수집 영웅"><div class="workbook-card hero-collection-dialog"><div id="body"></div></div></div></main>';
const body=document.getElementById('body')!;
function showCollection(){body.innerHTML='<p class="ws-eyebrow">훈련으로 깨어난 돌의 영웅</p><h2>내 수집 영웅</h2>'+collectionHTML(book.selectedHero,false,book)+'<button id="reveal-high">신화 영웅 획득 연출 보기</button>';body.querySelectorAll<HTMLButtonElement>('[data-collection-hero]').forEach(b=>b.onclick=()=>{book.selectedHero=b.dataset.collectionHero!;showCollection();});document.getElementById('reveal-high')!.onclick=()=>reveal('hero-10-2');}
function reveal(id:string){body.innerHTML='<p class="ws-eyebrow">봉인이 풀렸다 · 새로운 동료</p>'+heroRevealHTML(heroSpec(id)!,1)+'<button id="back">수집 영웅으로</button>';document.getElementById('back')!.onclick=showCollection;document.getElementById('ws-equip')!.onclick=()=>{book.selectedHero=id;showCollection();};}
document.getElementById('collection')!.onclick=showCollection;document.querySelectorAll<HTMLButtonElement>('[data-reveal]').forEach(b=>b.onclick=()=>reveal(b.dataset.reveal!));showCollection();
