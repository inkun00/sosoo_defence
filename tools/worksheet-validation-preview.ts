import {CONCEPT_KINDS,ArithmeticLearningKind,LearningProfile,kindLabel} from '../src/learning';
import {numberText} from '../src/math';
import {Worksheet,WorksheetQuestion,generateWorksheet,makeQuestion,questionAnswer,validQuestion,validWorksheet,worksheetCode,codeHash} from '../src/worksheet';
import {worksheetPages,worksheetQuestionHTML} from '../src/worksheet-view';
import '../src/game.css';
import '../src/worksheet.css';

function rng(initial:number){let seed=initial;return ()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
const profile:LearningProfile={version:1,counts:{},seen:{}};
const arithmetic:ArithmeticLearningKind[]=['add-1-basic','add-1-regroup','sub-1-basic','sub-1-regroup','add-2-basic','add-2-regroup','add-2-chain','add-2-align','sub-2-basic','sub-2-regroup','sub-2-chain','sub-2-align'];
const regression:WorksheetQuestion={a:3700,b:0,operation:'+',digits:1,kind:'concept-numberline',context:'concept',type:'concept-numberline',data:[3000,100,7]};
const malformed:WorksheetQuestion={a:1250,b:1100,operation:'+',digits:1,kind:'add-2-align',context:'wall'};
const usedAnswers=new Set([questionAnswer(regression)]),random=rng(20261009);
const concepts=CONCEPT_KINDS.map(kind=>kind==='concept-numberline'?regression:makeQuestion(kind,usedAnswers,random,6));
const calculations=arithmetic.map(kind=>makeQuestion(kind,usedAnswers,random,6));
const gallery=[...concepts,...calculations];
const printQuestions=[concepts[0],regression,...concepts.filter(q=>q!==regression&&q!==concepts[0]),...calculations.slice(0,7)];

async function preview(){
  const generated=generateWorksheet(profile,6,'worksheet-validation-20261009',1791500400000,rng(3941));
  const originalCode=worksheetCode(generated);
  const decoder=printQuestions.map((q,i)=>({answer:questionAnswer(q),rune:generated.decoder.find(entry=>entry.answer===questionAnswer(generated.questions[i]))!.rune}));
  const decoderAnswers=new Set(decoder.map(entry=>entry.answer));
  for(let value=10;decoder.length<30;value+=10){if(decoderAnswers.has(value))continue;decoderAnswers.add(value);decoder.push({answer:value,rune:Math.floor(random()*10)});}
  decoder.sort((a,b)=>a.answer-b.answer);
  const sheet:Worksheet={...generated,questions:printQuestions,decoder,codeHash:await codeHash(generated.id,originalCode)};
  if(!validWorksheet(sheet)||worksheetCode(sheet)!==originalCode)throw Error('QA 학습지 생성 검증에 실패했어요.');
  const styles=document.createElement('style');
  styles.textContent=`
    .qa-toolbar{position:sticky;top:0;z-index:5;background:#0c111df5;padding:12px 0;max-width:1420px;margin:0 auto;display:flex;align-items:center;gap:10px;flex-wrap:wrap}
    .qa-toolbar h1{font-size:21px;margin:0 20px 0 0}.qa-toolbar button{font-size:13px;min-height:38px;padding:8px 12px}.qa-status{font-size:13px;color:#f1cc90;max-width:1420px;margin:12px auto}
    .qa-panel[hidden]{display:none!important}.qa-gallery{max-width:1420px;margin:auto}.qa-gallery h2{font-size:18px;margin:20px 0 12px}
    .qa-regressions{display:grid;grid-template-columns:1fr 1fr;gap:14px}.qa-check-card{padding:15px;border:1px solid #b99556;border-radius:7px;background:#202633}.qa-check-card>p{font-size:12px;line-height:1.65;color:#d1c7b3;margin:10px 0 0}.qa-check-card h3{font-size:15px;margin:0 0 12px;color:#ffda97}
    .qa-regressions .ws-question{box-sizing:border-box;width:min(390px,100%);height:54px;color:#252b32;background:#fffaf0}.qa-regressions .ws-equation{font-size:17px}
    .qa-type-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.qa-type-card{min-width:0;padding:12px;border:1px solid #716246;border-radius:6px;background:#1d2431}.qa-type-card h3{font-size:12px;color:#e9c589;margin:0 0 10px;line-height:1.45}.qa-type-card .ws-question{min-height:54px;padding:5px;background:#fffaf0;color:#252b32;border-radius:4px}.qa-type-card .ws-question-body{min-width:0}.qa-type-card .ws-concept-text{font-size:11px}.qa-type-card .ws-concept-text>div{font-size:12px}.qa-type-card .ws-equation{font-size:16px}.qa-type-card output{display:block;font-size:12px;margin-top:8px;color:#bfe4b9}.qa-type-card output[hidden]{display:none}
    .qa-print-panel{overflow:auto;padding:14px 0}.qa-print-panel #ws-pages{min-width:210mm}.qa-expected{display:inline-block;padding:3px 8px;border:1px solid #73623f;border-radius:4px;margin-right:8px}
    @media(max-width:1000px){.qa-type-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.qa-regressions{grid-template-columns:1fr}}
    @media(max-width:600px){.qa-type-grid{grid-template-columns:1fr}.qa-toolbar{position:static}.qa-toolbar h1{width:100%}.workbook{padding:18px 12px}}
    @media print{.qa-toolbar,.qa-status,#qa-gallery{display:none!important}#qa-print-panel{display:block!important;padding:0!important;overflow:visible!important}.workbook>#qa-print-panel{display:block!important}#qa-print-panel #ws-pages{min-width:0}}
  `;
  document.head.append(styles);
  const questionCard=(q:WorksheetQuestion,index:number)=>'<article class="qa-type-card" data-qa-kind="'+q.kind+'"><h3>'+String(index+1).padStart(2,'0')+' · '+kindLabel(q.kind)+'</h3><div class="ws-question'+(q.type?' ws-concept':'')+'"><div class="ws-question-body">'+worksheetQuestionHTML(q)+'</div></div><output hidden>정답 '+(questionAnswer(q)%1000===0?questionAnswer(q)/1000:numberText(questionAnswer(q)))+' · 문항 검증 '+(validQuestion(q)?'통과':'실패')+'</output></article>';
  document.getElementById('app')!.innerHTML='<main class="workbook"><div class="qa-toolbar"><h1>학습지 전체 유형 검증</h1><button id="qa-show-sheet" type="button">A4 학습지 보기</button><button id="qa-show-gallery" type="button">전체 유형 보기</button><button id="qa-show-answers" type="button">정답 및 검증 결과 보기</button><button id="qa-print" type="button">A4 한 쪽 인쇄 확인</button></div><p class="qa-status" role="status">13개 개념과 12개 계산 유형 · 20문항 A4 학습지 검증 통과 · 수직선은 02번에 배치</p><section id="qa-gallery" class="qa-panel qa-gallery"><h2>신고된 문항과 자릿수 보호 검증</h2><div class="qa-regressions"><article class="qa-check-card" id="qa-regression-numberline"><h3>수직선: 3부터 4까지 10등분, 7칸 오른쪽</h3><div class="ws-question ws-concept"><b class="ws-qnumber">02</b><div class="ws-question-body">'+worksheetQuestionHTML(regression)+'</div><label class="ws-rune">룬 <i></i></label></div><p><span class="qa-expected">확인값 3.7</span>양 끝 숫자와 실제 끝 눈금이 일치하며 화살표는 7번째 구간 끝에 있어야 해요.</p></article><article class="qa-check-card" id="qa-regression-precision"><h3>손상된 문항의 소수 자릿수 보호</h3><div class="ws-question"><div class="ws-question-body">'+worksheetQuestionHTML(malformed)+'</div></div><p><span class="qa-expected">확인식 1.25 + 1.10</span>digits: 1로 저장된 문항은 검증에서 '+(validQuestion(malformed)?'잘못 통과':'거부')+'해요. 표시도 피연산자를 잘라 내지 않아야 해요.</p></article></div><h2>전체 25개 문항 유형</h2><div class="qa-type-grid">'+gallery.map(questionCard).join('')+'</div></section><section id="qa-print-panel" class="qa-panel qa-print-panel" hidden><div id="ws-pages">'+worksheetPages(sheet)+'</div></section></main>';
  const saveButton=document.createElement('button');
  saveButton.id='qa-save';saveButton.type='button';saveButton.textContent='학습지 저장';
  document.getElementById('qa-print')!.insertAdjacentElement('afterend',saveButton);
  const galleryPanel=document.getElementById('qa-gallery')!,printPanel=document.getElementById('qa-print-panel')!,status=document.querySelector<HTMLParagraphElement>('.qa-status')!;
  function view(print:boolean){galleryPanel.hidden=print;printPanel.hidden=!print;document.getElementById('qa-show-sheet')!.setAttribute('aria-pressed',String(print));document.getElementById('qa-show-gallery')!.setAttribute('aria-pressed',String(!print));window.scrollTo(0,0);}
  document.getElementById('qa-show-sheet')!.onclick=()=>view(true);
  document.getElementById('qa-show-gallery')!.onclick=()=>view(false);
  document.getElementById('qa-show-answers')!.onclick=()=>{view(false);for(const output of Array.from(document.querySelectorAll<HTMLOutputElement>('.qa-type-card output')))output.hidden=!output.hidden;};
  document.getElementById('qa-print')!.onclick=()=>{view(true);window.print();};
  saveButton.onclick=async()=>{
    if(saveButton.disabled)return;
    view(true);saveButton.disabled=true;saveButton.textContent='PDF 만드는 중…';status.textContent='A4 학습지 PDF를 만들고 있어요.';
    try{
      const {worksheetPageImage,worksheetImagePdf,downloadWorksheetPdf}=await import('../src/worksheet-pdf');
      await document.fonts.ready;
      view(true);
      // Capture only the A4 worksheet: QA answers and gallery stay outside the PDF.
      const page=printPanel.querySelector<HTMLElement>('.ws-sheet');
      if(!page)throw Error('A4 학습지 화면을 찾지 못했어요.');
      const image=await worksheetPageImage(page);
      const blob=await worksheetImagePdf(image,sheet);
      downloadWorksheetPdf(blob,sheet);
      status.textContent='학습지 PDF 저장 요청 완료 · '+blob.size.toLocaleString('ko-KR')+'바이트 ('+(blob.size/1024).toFixed(1)+' KiB) · A4 1쪽, 20문항';
    }catch(error){
      status.textContent='학습지 저장에 실패했어요. '+(error instanceof Error?error.message:String(error))+' 다시 저장을 눌러 주세요.';
    }finally{
      saveButton.disabled=false;saveButton.textContent='학습지 저장';
    }
  };
  view(false);
}
void preview().catch(error=>{document.getElementById('app')!.textContent=(error as Error).message;});
