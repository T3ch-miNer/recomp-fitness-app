import {GOAL_FIELDS,readGoalDraft,validateGoalDraft} from './goal-draft.js';

// First-use setup is deliberately light. Default values come from the existing
// Recomp goals; users can edit every target before anything is saved.
export const DAILY_TARGETS_SETUP_NOTE='This is a temporary setup. More questions and personalized goal options are coming soon.';
const GROUPS=[
 {title:'Food & nutrition',description:'Daily intake goals',fields:[
  ['calories','Calories','kcal'],['protein','Protein','g'],
  ['carbs','Carbohydrates','g'],['fat','Fat','g'],['fibre','Fibre','g']
 ]},
 {title:'Water & movement',description:'Daily activity goals',fields:[
  ['water','Water','ml'],['steps','Steps','steps']
 ]}
];
const escape=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
export function shouldShowDailyTargetsSetup({hasSavedState=false,completed=false}={}){
 // A pre-existing state is not newly onboarded. Older saves are migrated as done.
 return !completed&&!hasSavedState;
}
export function dailyTargetsSetupHtml(goals){
 const inputs=GROUPS.map(group=>`<fieldset class="targets-setup-group">
  <legend>${group.title}</legend><p>${group.description}</p>
  <div class="targets-setup-grid">${group.fields.map(([key,label,unit])=>`<label class="targets-setup-field" for="targets-setup-${key}"><span>${label} <small>(${unit})</small></span><input id="targets-setup-${key}" name="${key}" inputmode="numeric" type="number" min="0" step="1" required value="${escape(goals?.[key]??0)}"/></label>`).join('')}</div>
 </fieldset>`).join('');
 return `<div class="targets-setup-overlay" id="recomp-targets-setup">
 <section class="targets-setup-card" role="dialog" aria-modal="true" aria-labelledby="targets-setup-title" aria-describedby="targets-setup-description">
  <div class="targets-setup-eyebrow">WELCOME TO RECOMP <span>·</span> STEP 1 OF 1</div>
  <h1 id="targets-setup-title">Set your daily targets</h1>
  <p class="targets-setup-description" id="targets-setup-description">A few quick questions to help you start tracking. You can change these targets anytime under Settings.</p>
  <div class="targets-setup-note" role="note"><span aria-hidden="true">✧</span><span>${DAILY_TARGETS_SETUP_NOTE}</span></div>
  <form id="recomp-targets-form" novalidate>${inputs}
   <p class="targets-setup-footnote">These pre-filled numbers are starting placeholders, not personalized nutrition or medical advice.</p>
   <p class="targets-setup-error" id="targets-setup-error" role="alert" hidden></p>
   <button class="targets-setup-submit" type="submit">Save targets & start tracking <span aria-hidden="true">→</span></button>
  </form>
 </section></div>`;
}
export function showDailyTargetsSetup({goals,onSave}){
 if(typeof onSave!=='function')throw new Error('Daily target saving is required.');
 if(document.getElementById('recomp-targets-setup'))return false;
 const overlay=document.createElement('div');
 overlay.innerHTML=dailyTargetsSetupHtml(goals);
 const root=overlay.firstElementChild;
 document.body.appendChild(root);
 const form=root.querySelector('#recomp-targets-form');
 const error=root.querySelector('#targets-setup-error');
 const button=form.querySelector('button[type="submit"]');
 const first=form.querySelector('input');
 first?.focus({preventScroll:true});
 form.addEventListener('submit',async event=>{
  event.preventDefault();
  if(button.disabled)return;
  button.disabled=true;button.setAttribute('aria-busy','true');
  error.hidden=true;error.textContent='';
  try{
   const values=validateGoalDraft(readGoalDraft(form));
   // Only accept exactly the editable daily goal fields, no extras.
   if(Object.keys(values).length!==GOAL_FIELDS.length)throw new Error('Please complete all daily targets.');
   await onSave(values);
   root.remove();
  }catch(err){
   error.textContent=err?.message||'Could not save your targets. Please try again.';
   error.hidden=false;
  }finally{button.disabled=false;button.removeAttribute('aria-busy');}
 });
 root.addEventListener('keydown',event=>{
  if(event.key==='Escape'){event.preventDefault();return;}
  if(event.key!=='Tab')return;
  const controls=[...root.querySelectorAll('input:not(:disabled),button:not(:disabled)')];
  if(!controls.length)return;
  const first=controls[0],last=controls.at(-1);
  if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
  else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
 });
 return true;
}
