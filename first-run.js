// Lightweight guest-first welcome. A local UI preference only: fitness records stay in IndexedDB.
export const FIRST_RUN_KEY='recomp-first-run-choice-v1';

export function shouldOfferFirstRun({hasSavedState=false,hasChoice=false,hasSession=false,hasOAuthCallback=false}={}){
 return !hasSavedState && !hasChoice && !hasSession && !hasOAuthCallback;
}

export function showFirstRunWelcome({onGuest,onGoogle,googleEnabled=true,developmentMode=false}){
 if(document.getElementById('recomp-first-run'))return;
 if(typeof onGuest!=='function'||typeof onGoogle!=='function')throw new Error('First-run actions are required.');
 const overlay=document.createElement('div');
 overlay.id='recomp-first-run';overlay.className='first-run-overlay';
 overlay.innerHTML=`<section class="first-run-card" role="dialog" aria-modal="true" aria-labelledby="first-run-title" aria-describedby="first-run-description">
  <div class="first-run-mark" aria-hidden="true">recomp<span>.</span></div>
  <div class="first-run-icon" aria-hidden="true">✦</div>
  <div class="first-run-eyebrow">YOUR FITNESS. YOUR RULES.</div>
  <h1 id="first-run-title">Start strong.</h1>
  <p id="first-run-description">Track workouts, nutrition and progress without an account. Optional Google sign-in uses Clerk when configured. Cloud backup is a separate feature.</p>
  ${developmentMode?'<p class="first-run-dev-note" role="note"><b>Development mode · Google sign-in testing</b><span>This is a test account, not production login. Signing in will not back up your fitness data. You may continue as a guest.</span></p>':''}
  <div class="first-run-actions">
    <button class="first-run-google" type="button" data-first-run="google" ${googleEnabled?'':'disabled aria-disabled="true" title="Google sign-in is coming later"'}><span class="first-run-google-letter" aria-hidden="true">G</span> Continue with Google</button>
    <button class="first-run-guest" type="button" data-first-run="guest">Continue without signing in <span aria-hidden="true">→</span></button>
  </div>
  ${googleEnabled?'':'<p class="first-run-google-note">Google sign-in is coming later. You can track everything privately as a guest.</p>'}
  <p class="first-run-error" id="first-run-error" role="status" aria-live="polite" hidden></p>
  <p class="first-run-privacy">Your fitness records stay on this device. You can connect Google later from Settings.</p>
 </section>`;
 document.body.appendChild(overlay);
 const guest=overlay.querySelector('[data-first-run="guest"]');
 const google=overlay.querySelector('[data-first-run="google"]');
 const error=overlay.querySelector('#first-run-error');
 guest.focus();
 const finishGuest=()=>{
  onGuest();
  overlay.remove();
 };
 guest.addEventListener('click',finishGuest);
 overlay.addEventListener('keydown',event=>{
  if(event.key==='Escape'){event.preventDefault();finishGuest();return;}
  if(event.key==='Tab'){
   const first=google,last=guest;
   if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
   else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
  }
 });
 google.addEventListener('click',async()=>{
  if(google.disabled)return;
  google.disabled=true;error.hidden=true;google.setAttribute('aria-busy','true');
  try{
   const status=await onGoogle();
   if(typeof status==='string'&&status){error.textContent=status;error.hidden=false;}
   else overlay.remove(); // Clerk sign-in has opened: avoid covering its modal.
  }catch(err){error.textContent=err?.message||'Google login could not start. You can continue without signing in.';error.hidden=false;}
  finally{google.disabled=false;google.removeAttribute('aria-busy');}
 });
}
