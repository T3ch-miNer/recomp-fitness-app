// New-user choice only. Existing fitness data must never be reset by onboarding.
export const FITNESS_MODES=Object.freeze(['basic','advanced']);
export function requiresModeSelection({hasSavedState=false,mode=null,hasWelcome=false}={}){
 return !hasSavedState&&!FITNESS_MODES.includes(mode)&&!hasWelcome;
}
export function showFitnessModeSelection({onChoose}){
 if(typeof onChoose!=='function')throw Error('Mode choice handler required.');
 if(document.getElementById('recomp-mode-select'))return false;
 const root=document.createElement('div');
 root.id='recomp-mode-select';root.className='fitness-mode-overlay';
 root.innerHTML=`<section class="fitness-mode-card" role="dialog" aria-modal="true" aria-labelledby="fitness-mode-title">
   <div class="fitness-mode-eyebrow">WELCOME TO YOUR RECOMP</div>
   <h1 id="fitness-mode-title">How would you like to train?</h1>
   <p class="fitness-mode-hint">You can switch modes later. Your saved workouts and meals will never be erased just by changing modes.</p>
   <div class="fitness-mode-choices">
    <button type="button" data-fitness-mode="basic"><b>Basic mode</b><span>Keep it simple with Full Body A and Full Body B. Start tracking today.</span></button>
    <button type="button" data-fitness-mode="advanced"><b>Advanced mode</b><span>Describe your goals, preferences and measurements. Copy a GPT prompt, import a reviewed personal plan.</span></button>
   </div>
   <p class="fitness-mode-hint">No account or AI subscription required for Basic mode. Advanced planning is optional and happens on the GPT service you choose.</p>
   <p id="fitness-mode-error" role="alert" hidden></p>
  </section>`;
 document.body.append(root);
 root.querySelector('[data-fitness-mode="basic"]').focus();
 root.addEventListener('click',async event=>{
  const button=event.target.closest?.('[data-fitness-mode]');
  if(!button)return;
  const mode=button.dataset.fitnessMode;
  if(!FITNESS_MODES.includes(mode))return;
  for(const b of root.querySelectorAll('button'))b.disabled=true;
  try{await onChoose(mode);root.remove();}
  catch(error){root.querySelector('#fitness-mode-error').textContent=error?.message||'Could not save your choice';root.querySelector('#fitness-mode-error').hidden=false;for(const b of root.querySelectorAll('button'))b.disabled=false;}
 });
 root.addEventListener('keydown',event=>{
  if(event.key==='Tab'){
   const first=root.querySelector('[data-fitness-mode="basic"]'),last=root.querySelector('[data-fitness-mode="advanced"]');
   if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
   else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
  }
 });
 return true;
}
