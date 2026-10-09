import {DUEL_MAPS,duelMap} from './duel-maps';

export function duelMapPreviewHTML(mapId:string){
 const map=duelMap(mapId),points=map.points.map(p=>`${p.x},${p.y}`).join(' ');
 return `<svg class="duel-map-preview" viewBox="-1 -1 25 9" aria-hidden="true" focusable="false"><defs><pattern id="grid-${map.id}" width="1" height="1" patternUnits="userSpaceOnUse"><path d="M 1 0 L 0 0 0 1" fill="none" stroke="#cfa967" stroke-opacity=".12" stroke-width=".035"/></pattern></defs><rect x="-.5" y="-.5" width="24" height="7" rx=".3" fill="#0a1420"/><rect x="-.5" y="-.5" width="24" height="7" fill="url(#grid-${map.id})"/><path d="M11.5 -.5 V6.5" stroke="#b4a58a" stroke-opacity=".35" stroke-width=".06" stroke-dasharray=".22 .25"/><polyline points="${points}" fill="none" stroke="#5d4930" stroke-width=".9" stroke-linejoin="round" stroke-linecap="round"/><polyline points="${points}" fill="none" stroke="#d2a462" stroke-width=".36" stroke-linejoin="round" stroke-linecap="round"/><circle cx="0" cy="3" r=".52" fill="#6bd5d2" stroke="#c9ffff" stroke-width=".12"/><circle cx="23" cy="3" r=".52" fill="#ecad59" stroke="#ffe9b5" stroke-width=".12"/><path d="M11.5 2.3 L12.2 3 11.5 3.7 10.8 3Z" fill="#ac88dd" stroke="#e5d4ff" stroke-width=".1"/></svg>`;
}
export function duelMapSummaryHTML(mapId:string){
 const map=duelMap(mapId);
 return `<button type="button" class="duel-map-summary" id="choose-duel-map" aria-label="대전 맵 변경 · ${map.name}">${duelMapPreviewHTML(mapId)}<span><small>대전 맵 · 10종 중 선택</small><strong>${map.name}</strong><span>맵 변경 ↗</span></span></button>`;
}
export function duelMapPickerHTML(mapId:string){
 return `<p class="eyebrow">두 수호자에게 같은 길</p><h2>대전 맵 선택</h2><p class="duel-intro">좌우가 대칭인 10개의 전장에서 겨뤄요. 온라인 대전은 방을 만드는 수호자가 맵을 선택해요.</p><div class="duel-map-grid" aria-label="대전 맵 10종">${DUEL_MAPS.map((map,index)=>`<button type="button" class="duel-map-card${map.id===mapId?' selected':''}" data-duel-map="${map.id}" aria-pressed="${map.id===mapId}">${duelMapPreviewHTML(map.id)}<small>전장 ${String(index+1).padStart(2,'0')}</small><strong>${map.name}</strong><span>${map.description}</span><em>${map.id===mapId?'선택됨':'선택하기'}</em></button>`).join('')}</div><div class="duel-row"><button class="duel-primary" id="map-selection-done">선택 완료</button></div>`;
}
