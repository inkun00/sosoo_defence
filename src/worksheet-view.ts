import {artURL} from './art';
import {Worksheet,WorksheetQuestion} from './worksheet';
import {decimal,numberText} from './math';
import {kindLabel} from './learning';
const shortId=(s:Worksheet)=>s.id.slice(0,8).toUpperCase();
const answer='<span class="ws-answer"></span>';
const text=(value:number)=>value%1000===0?String(value/1000):numberText(value);
function header(s:Worksheet){return '<header class="ws-header"><div><p class="ws-eyebrow">소수 디펜스 · 수호자의 훈련소</p><h1>오답 풀이 연습 학습지</h1><p class="ws-meta">이름 ______________  4학년 ___반 ___번 · '+new Date(s.createdAt).toLocaleDateString('ko-KR')+'</p></div><div class="ws-emblem"><span class="ws-guide" aria-hidden="true" style="background-image:url('+artURL('heroes-level-4-v1')+')"></span><span class="ws-egg" aria-hidden="true"></span><b>1 / 1</b></div></header><div class="ws-mission">훈련서 '+shortId(s)+' · 20개의 정답으로 봉인된 돌 알을 깨워라!</div>';}
function hundredGrid(n:number){return '<svg class="ws-grid-art" viewBox="0 0 100 100" role="img" aria-label="전체가 1인 모눈, 100칸 중 '+n+'칸 색칠">'+Array.from({length:100},(_,i)=>'<rect x="'+i%10*10+'" y="'+Math.floor(i/10)*10+'" width="10" height="10" fill="'+(i<n?'#b3a078':'#ffffff')+'" stroke="#605b50" stroke-width=".65"/>').join('')+'</svg>';}
function numberline(d:number[]){const [start,step,index]=d;return '<svg class="ws-numberline" viewBox="0 0 160 40" role="img" aria-label="'+text(start)+'부터 '+text(start+step*10)+'까지 열 등분한 수직선의 '+index+'번째 눈금"><path d="M9 18H151" fill="none" stroke="#30363d" stroke-width="1.3"/>'+Array.from({length:11},(_,i)=>'<path d="M'+(10+i*14)+' 13v10" stroke="#30363d"/>').join('')+'<path d="M'+(10+index*14)+' 1v10m-3-4 3 4 3-4" fill="none" stroke="#956829" stroke-width="1.5"/><text x="2" y="37" font-size="10">'+text(start)+'</text><text x="136" y="37" text-anchor="middle" font-size="10">'+text(start+step*10)+'</text></svg>';}
const koreanDigits=['영','일','이','삼','사','오','육','칠','팔','구'];
function readDecimal(value:number){return numberText(value).split('').map(c=>c==='.'?'점':koreanDigits[Number(c)]).join(' ');}
function placeText(value:number,place:number){const parts=decimal(value,2).split(''),position=place===1000?0:place===100?2:3;parts[position]='<u>'+parts[position]+'</u>';return parts.join('');}
export function worksheetQuestionHTML(q:WorksheetQuestion){
 if(!q.type)return '<div class="ws-equation">'+decimal(q.a,q.digits)+' '+(q.operation==='+'?'+':'−')+' '+decimal(q.b,q.digits)+' = '+answer+'</div>';
 const d=q.data!,body=(prompt:string,detail:string)=>'<div class="ws-concept-text"><span>'+prompt+'</span><div>'+detail+'</div></div>';
 switch(q.type){
  case 'concept-compose':return body('1이 '+d[0]+'개, 0.1이 '+d[1]+'개'+(d[2]?', 0.01이 '+d[2]+'개':''),'이 수는 '+answer);
  case 'concept-fraction':return body('분수를 소수로 나타내요.','<span class="ws-fraction">'+(d[0]?'<b>'+d[0]+'</b>':'')+'<span><i>'+d[1]+'</i><i>'+d[2]+'</i></span></span> = '+answer);
  case 'concept-grid':return hundredGrid(d[0])+body('전체가 1인 모눈이에요.','색칠한 부분: '+answer);
  case 'concept-numberline':return numberline(d)+body('화살표의 소수는?',answer);
  case 'concept-place':return body('밑줄 친 숫자의 자릿값은?',placeText(d[0],d[1])+' → '+answer);
  case 'concept-scale':return body('□에 알맞은 수를 써요.',text(d[0])+'의 '+(d[1]===1?'1/'+d[2]+'배':d[1]+'배')+' = '+answer);
  case 'concept-compare':return body('세 수 중 가장 큰 수는?',d.map(text).join(' · ')+' → '+answer);
  case 'concept-cards':return body(d.slice(0,3).join(' · ')+'을 각각 한 번 사용해요.','가장 '+(d[3]?'큰':'작은')+' 소수 두 자리 수: '+answer);
  case 'concept-missing':{const left=d[3]===0?answer:text(d[0]),right=d[3]===1?answer:text(d[1]),result=d[2]?d[0]-d[1]:d[0]+d[1];return body('빈 수를 구해요.',left+' '+(d[2]?'−':'+')+' '+right+' = '+text(result));}
  case 'concept-units':return body(text(d[0])+'에는 '+text(d[1])+'이 몇 개 있나요?',answer+' 개');
  case 'concept-story':return body('물약 '+text(d[0])+' L와 '+text(d[1])+' L를 합쳐 '+text(d[2])+' L 사용.','남은 물약: '+answer+' L');
  case 'concept-read':return body('읽은 수를 소수로 써요.',readDecimal(d[0])+' → '+answer);
  case 'concept-inequality':return body('□에 가능한 가장 '+(d[2]?'작은':'큰')+' 숫자는?',d[0]+'.□ '+(d[2]?'&gt;':'&lt;')+' '+text(d[1])+' → '+answer);
 }
}
export function worksheetPages(s:Worksheet){
 const groups=s.groups.map((group,i)=>'<div class="ws-cipher-group"><b>암호 '+(i+1)+'</b><div>'+group.map((n,j)=>(j?'<span>+</span>':'')+'<label><small>'+String(n+1).padStart(2,'0')+'번 룬</small><i></i></label>').join('')+'<span>=</span><label><small>룬의 합</small><i></i></label><span>→</span><label><small>알파벳</small><i></i></label></div></div>').join('');
 const decoder='<div class="ws-map"><h2>01 · 정답 → 룬 숫자 지도</h2><p class="ws-map-note">내 정답의 룬 숫자를 문제 옆에 적어요. 3과 3.0은 같은 수예요. 가짜 답도 있어요.</p><div class="ws-decoder">'+s.decoder.map(d=>'<span><b>'+text(d.answer)+'</b><i>→</i><strong>'+d.rune+'</strong></span>').join('')+'</div></div>';
 const cipher='<div class="ws-map"><h2>02 · 룬의 합 → 알파벳 표</h2><div class="ws-alphabet">'+Array.from({length:26},(_,i)=>'<span><b>'+i+'</b><strong>'+String.fromCharCode(65+i)+'</strong></span>').join('')+'</div><h2>03 · 20개의 룬으로 여섯 글자 해독하기</h2><p class="ws-map-note">각 문항의 룬을 더하고, 합에 해당하는 알파벳을 찾아요. 룬 0도 합에 포함해요.</p><div class="ws-cipher-groups">'+groups+'</div><div class="ws-final-code"><b>나의 6자리 암호</b>'+Array.from({length:6},()=>'<i></i>').join('')+'</div></div>';
 return '<section class="ws-sheet" aria-label="학습지 1쪽">'+header(s)+'<div class="ws-question-grid">'+s.questions.map((q,i)=>'<article class="ws-question'+(q.type?' ws-concept':'')+'" data-question="'+(i+1)+'" data-kind="'+q.kind+'"><b class="ws-qnumber">'+String(i+1).padStart(2,'0')+'</b><div class="ws-question-body">'+worksheetQuestionHTML(q)+'</div><label class="ws-rune">룬 <i></i></label></article>').join('')+'</div>'+decoder+cipher+'<footer class="ws-footer"><b>학습지 출력 화면에서 돌 알의 암호를 입력해요.</b><span>sosoo-defence.vercel.app · 훈련서 '+shortId(s)+' · 출력한 같은 브라우저에서 입력해요.</span></footer></section>';
}
export function worksheetFocus(s:Worksheet){return s.focus.length?s.focus.map(kindLabel).join(' / ')+' · 단원 개념 함께 연습':'현재 단계의 계산과 소수의 구성·자릿값·크기 비교 등 단원 개념을 함께 골랐어요.';}
