import {onAuthStateChanged} from 'firebase/auth';
import {auth} from './multiplayer/firebase';
import {mountAccountForm} from './account-form';
import {ProtectedPageMode} from './page-access';
import {artURL} from './art';
import './game.css';
import './multiplayer/multiplayer.css';
import './multiplayer/duel-theme.css';
import './account-gate.css';
export {auth};
export function requestAccountLogin(mode:ProtectedPageMode):Promise<void>{
 const app=document.getElementById('app')!;
 app.dataset.accountGate='true';app.dataset.duelView='hall';
 app.innerHTML=`<div class="duel-world" aria-hidden="true"><div class="duel-world-art"></div><div class="duel-world-shade"></div><div class="duel-world-glow"></div><div class="duel-world-embers"></div></div><header class="duel-hall-header"><a href="/?mode=title" aria-label="소수 디펜스 시작 화면으로"><img class="duel-hall-logo" src="${artURL('title-wordmark-v1')}" alt="" width="1200" height="297" decoding="async"></a></header><main id="duel-dialog" class="modal" data-screen="auth" aria-labelledby="account-heading"><div class="duel-card"><div id="account-content"></div></div></main>`;
 return new Promise(resolve=>{
  let completed=false,stop:(()=>void)|undefined;
  const finish=()=>{if(completed||!auth?.currentUser)return;completed=true;stop?.();delete app.dataset.accountGate;delete app.dataset.duelView;resolve();};
  const content=document.getElementById('account-content')!;
  mountAccountForm(content,mode,finish);
  if(auth)stop=onAuthStateChanged(auth,user=>{if(user&&content.dataset.accountSubmitting!=='true')finish();});
 });
}
