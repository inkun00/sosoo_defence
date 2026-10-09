import {generateWorksheet} from '../src/worksheet';
import {worksheetPages} from '../src/worksheet-view';
import '../src/game.css';
import '../src/worksheet.css';
let seed=7;
const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
function render(){const sheet={...generateWorksheet({version:1,counts:{'sub-2-chain':{wrong:3,help:1,correct:0}},seen:{}},6,'concept-qa-sheet',Date.now(),random),codeHash:'a'.repeat(64)};document.getElementById('ws-pages')!.innerHTML=worksheetPages(sheet);}
document.getElementById('app')!.innerHTML='<main class="workbook"><div class="workbook-toolbar"><button id="qa-new">다른 문항 보기</button><button id="qa-print">A4 한 쪽 인쇄 확인</button></div><div id="ws-pages"></div></main>';
document.getElementById('qa-new')!.onclick=render;document.getElementById('qa-print')!.onclick=()=>window.print();render();
