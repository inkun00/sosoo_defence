import {DUEL_MAPS,duelMap,duelLaneOffset} from './duel-maps';

export function duelMapPreviewHTML(mapId:string){
 const map=duelMap(mapId),lanes=([0,1] as const).map(side=>{
  const offset=duelLaneOffset(side),points=map.points.map(p=>`${p.x},${p.y+offset}`).join(' '),color=side===0?'#6bd5d2':'#ecad59',arrow=side===0?'M12 2.6 L11.4 3 12 3.4':'M11 10.6 L11.6 11 11 11.4';
  return `<g data-map-lane="${side}"><rect x="-.5" y="${offset-.5}" width="24" height="7" rx=".3" fill="#0a1420"/><rect x="-.5" y="${offset-.5}" width="24" height="7" fill="url(#grid-${map.id})"/><polyline points="${points}" fill="none" stroke="#5d4930" stroke-width=".9" stroke-linejoin="round" stroke-linecap="round"/><polyline data-lane-route="${side}" points="${points}" fill="none" stroke="${color}" stroke-width=".36" stroke-linejoin="round" stroke-linecap="round"/><circle cx="0" cy="${3+offset}" r=".52" fill="#6bd5d2" stroke="#c9ffff" stroke-width=".12"/><circle cx="23" cy="${3+offset}" r=".52" fill="#ecad59" stroke="#ffe9b5" stroke-width=".12"/><path d="${arrow}" fill="none" stroke="#fff0ce" stroke-width=".13" stroke-linejoin="round"/></g>`;
 }).join('');
 return `<svg class="duel-map-preview" viewBox="-1 -1 25 17" aria-hidden="true" focusable="false"><defs><pattern id="grid-${map.id}" width="1" height="1" patternUnits="userSpaceOnUse"><path d="M 1 0 L 0 0 0 1" fill="none" stroke="#cfa967" stroke-opacity=".12" stroke-width=".035"/></pattern></defs>${lanes}<path data-lane-divider="true" d="M-.5 7 H23.5" stroke="#b4a58a" stroke-opacity=".55" stroke-width=".08" stroke-dasharray=".3 .3"/></svg>`;
}
export function duelMapSummaryHTML(mapId:string){
 const map=duelMap(mapId);
 return `<button type="button" class="duel-map-summary" id="choose-duel-map" aria-label="대전 맵 변경 · ${map.name}">${duelMapPreviewHTML(mapId)}<span><small>위·아래 독립 경로 · 10종 중 선택</small><strong>${map.name}</strong><span>맵 변경 ↗</span></span></button>`;
}
export function duelMapPickerHTML(mapId:string){
 return `<p class="eyebrow">위·아래 두 수호자의 독립 전장</p><h2>대전 맵 선택</h2><p class="duel-intro">두 진영은 위·아래로 나뉜 같은 모양의 길에서 각자 방어해요. 몬스터 동선은 겹치지 않아요. 온라인 대전은 방을 만드는 수호자가 맵을 선택해요.</p><div class="duel-map-grid" aria-label="대전 맵 10종">${DUEL_MAPS.map((map,index)=>`<button type="button" class="duel-map-card${map.id===mapId?' selected':''}" data-duel-map="${map.id}" aria-pressed="${map.id===mapId}">${duelMapPreviewHTML(map.id)}<small>전장 ${String(index+1).padStart(2,'0')}</small><strong>${map.name}</strong><span>${map.description}</span><em>${map.id===mapId?'선택됨':'선택하기'}</em></button>`).join('')}</div><div class="duel-row"><button class="duel-primary" id="map-selection-done">선택 완료</button></div>`;
}
