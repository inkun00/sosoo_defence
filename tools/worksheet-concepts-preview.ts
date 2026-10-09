import {generateWorksheet} from '../src/worksheet';
import {worksheetPages} from '../src/worksheet-view';
import '../src/game.css';
import '../src/worksheet.css';
let seed=7;let currentSheet:ReturnType<typeof generateWorksheet>;
const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
function render(){const sheet={...generateWorksheet({version:1,counts:{'sub-2-chain':{wrong:3,help:1,correct:0}},seen:{}},6,'concept-qa-sheet',Date.now(),random),codeHash:'a'.repeat(64)};currentSheet=sheet;document.getElementById('ws-pages')!.innerHTML=worksheetPages(sheet);}
document.getElementById('app')!.innerHTML='<main class="workbook"><div class="workbook-toolbar"><button id="qa-new">다른 문항 보기</button><button id="qa-print">A4 한 쪽 인쇄 확인</button><button id="qa-save">A4 PDF 저장 검증</button><output id="qa-pdf-status" role="status"></output></div><div id="ws-pages"></div><img id="qa-pdf-image" hidden alt="휴대폰 화면에서 저장한 원래 A4 두 열 학습지" style="max-width:100%;height:auto"></main>';
document.getElementById('qa-new')!.onclick=render;document.getElementById('qa-print')!.onclick=()=>window.print();render();
document.getElementById('qa-save')!.onclick=async()=>{
 const button=document.getElementById('qa-save') as HTMLButtonElement,output=document.getElementById('qa-pdf-status')!,image=document.getElementById('qa-pdf-image') as HTMLImageElement;
 button.disabled=true;output.textContent='A4 복제본을 저장하는 중…';
 try{
  const {worksheetPageImage,worksheetImagePdf,downloadWorksheetPdf}=await import('../src/worksheet-pdf');
  const jpeg=await worksheetPageImage(document.querySelector('.ws-sheet') as HTMLElement);image.src=jpeg;await image.decode();
  const pdf=await worksheetImagePdf(jpeg,currentSheet);output.textContent=`원래 A4 이미지 ${image.naturalWidth} × ${image.naturalHeight} · PDF ${pdf.size}바이트`;image.hidden=false;downloadWorksheetPdf(pdf,currentSheet);
 }catch(error){output.textContent=(error as Error).message;}finally{button.disabled=false;}
};
