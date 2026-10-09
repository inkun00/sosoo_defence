import {createUserWithEmailAndPassword,signInWithEmailAndPassword,updateProfile,sendPasswordResetEmail,User} from 'firebase/auth';
import {auth,firebaseConfigured,firebaseEmulator} from './multiplayer/firebase';
import {ProtectedPageMode} from './page-access';
import './account-gate.css';
export function accountErrorText(error:unknown){
 const code=(error as {code?:string})?.code||'',labels:Record<string,string>={
  'auth/email-already-in-use':'이미 가입한 이메일이에요. 로그인해 주세요.',
  'auth/invalid-credential':'이메일 또는 비밀번호를 확인해 주세요.',
  'auth/weak-password':'비밀번호는 6글자 이상 적어 주세요.',
  'auth/invalid-email':'이메일 주소를 확인해 주세요.',
  'auth/too-many-requests':'잠시 기다렸다가 다시 로그인해 주세요.',
  'auth/network-request-failed':'인터넷 연결을 확인해 주세요.',
 };
 return labels[code]||(error as Error)?.message||'연결을 확인하고 다시 시도해 주세요.';
}
export function mountAccountForm(container:HTMLElement,context:ProtectedPageMode,onSignedIn:(user:User)=>void,mode:'login'|'register'='login'){
 const worksheet=context==='worksheet',enabled=firebaseConfigured;
 container.innerHTML=`<section class="duel-auth-form"><p class="eyebrow">${worksheet?'수호자의 훈련소':'수호자의 결투장'}${firebaseEmulator?' · 로컬 테스트':''}</p><h2 id="account-heading">${mode==='register'?'나만의 수호자 계정':'수호자 로그인'}</h2><p class="duel-intro">${mode==='register'?'이름을 정하고 새로운 여정을 시작하세요.':worksheet?'계정으로 로그인하면 요청한 학습지를 준비해요.':'1:1 대전과 컴퓨터 대결은 계정으로 로그인한 뒤 즐길 수 있어요.'}</p>${enabled?'':'<p class="duel-warning">계정 연결은 준비 중이에요.<br>시작 화면에서 혼자 모험을 즐길 수 있어요.</p>'}<form id="auth-form">${mode==='register'?'<label>수호자 이름<input name="nickname" minlength="2" maxlength="16" required autocomplete="nickname" placeholder="게임에서 사용할 이름"></label>':''}<label>이메일<input type="email" name="email" required autocomplete="email" placeholder="이메일 주소"></label><label>비밀번호<input type="password" name="password" minlength="6" required autocomplete="${mode==='register'?'new-password':'current-password'}" placeholder="6글자 이상"></label><p data-feedback role="status" aria-live="polite"></p><button class="duel-primary" ${enabled?'':'disabled'}>${mode==='register'?'회원가입':worksheet?'학습지로 계속':'결투장 입장'}</button></form><div class="duel-auth-links"><button id="switch-auth">${mode==='register'?'이미 계정이 있어요':'회원가입'}</button><button id="reset-password" ${enabled?'':'disabled'}>비밀번호 찾기</button></div><a class="duel-adventure account-nav" href="/?mode=adventure">혼자 모험하기</a><a class="account-home" href="/?mode=title">시작 화면으로</a></section>`;
 const feedback=container.querySelector<HTMLElement>('[data-feedback]')!,form=container.querySelector<HTMLFormElement>('#auth-form')!,submit=form.querySelector<HTMLButtonElement>('button')!,switchAuth=container.querySelector<HTMLButtonElement>('#switch-auth')!,reset=container.querySelector<HTMLButtonElement>('#reset-password')!;
 switchAuth.onclick=()=>mountAccountForm(container,context,onSignedIn,mode==='login'?'register':'login');
 form.onsubmit=async event=>{
  event.preventDefault();if(!auth||submit.disabled)return;
  const data=new FormData(form);container.dataset.accountSubmitting='true';submit.disabled=true;switchAuth.disabled=true;reset.disabled=true;feedback.textContent='계정을 확인하고 있어요…';
  try{
   const credential=mode==='register'?await createUserWithEmailAndPassword(auth,String(data.get('email')),String(data.get('password'))):await signInWithEmailAndPassword(auth,String(data.get('email')),String(data.get('password')));
   if(mode==='register'){await updateProfile(credential.user,{displayName:String(data.get('nickname')).trim()});await credential.user.getIdToken(true);}
   if(auth.currentUser?.uid!==credential.user.uid)throw Error('로그인이 해제됐어요. 다시 로그인해 주세요.');
   delete container.dataset.accountSubmitting;onSignedIn(credential.user);
  }catch(error){delete container.dataset.accountSubmitting;feedback.textContent=accountErrorText(error);submit.disabled=false;switchAuth.disabled=false;reset.disabled=!enabled;}
 };
 reset.onclick=async()=>{
  const email=form.querySelector<HTMLInputElement>('[name=email]')!.value;
  if(!email||!auth){feedback.textContent='이메일을 먼저 적어 주세요.';return;}
  try{await sendPasswordResetEmail(auth,email);feedback.textContent='비밀번호 재설정 안내를 요청했어요. 이메일을 확인해 주세요.';}catch(error){feedback.textContent=accountErrorText(error);}
 };
}
