import {runMotion} from './motion-bridge.js';
// Two short, accessible first-run steps. Profiles never leave the device merely
// because they are entered here. Returning users can edit them in Settings.
import {validateBasicProfile,BASIC_GOALS} from './basic-programmes.js';
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
function options(values,selected){
 return values.map(([value,label])=>'<option value="'+esc(value)+'" '+(selected===value?'selected':'')+'>'+esc(label)+'</option>').join('');
}
function field(name,label,value,attributes){
 return '<label>'+label+'<input name="'+name+'" inputmode="decimal" type="number" value="'+esc(value)+'" '+attributes+' required></label>';
}
function select(name,label,values,current){
 return '<label>'+label+'<select name="'+name+'">'+options(values,current)+'</select></label>';
}
export function showBasicOnboarding({onSave,initial={}}){
 if(typeof onSave!=='function')throw Error('Profile save action is required.');
 if(document.getElementById('recomp-basic-onboarding'))return false;
 const root=document.createElement('div');
 root.className='basic-onboarding-overlay';root.id='recomp-basic-onboarding';
 let step=1,saving=false;
 let data={age:initial.age||'',gender:initial.gender||'prefer-not-to-say',
  heightCm:initial.heightCm||'',weightKg:initial.weightKg||'',
  goal:initial.goal||'recomposition',equipment:initial.equipment||'gym',
  experience:initial.experience||'beginner',focus:initial.focus||'balanced',
  days:initial.days||3,minutes:initial.minutes||45};
 const pageOne=()=>'<p class="basic-step">STEP 1 OF 2 · ABOUT YOU</p>'+
  '<h1 id="basic-title">Start with the basics.</h1>'+
  '<p class="basic-intro">A few details help you track progress. Everything stays on this device unless you choose to back it up.</p>'+
  '<div class="basic-grid">'+
   field('age','Age',data.age,'min="18" max="100" step="1"')+
   select('gender','Gender (optional)',[['prefer-not-to-say','Prefer not to say'],['female','Woman'],['male','Man'],['non-binary','Non-binary']],data.gender)+
   field('heightCm','Height (cm)',data.heightCm,'min="100" max="230" step="0.1"')+
   field('weightKg','Current weight (kg)',data.weightKg,'min="30" max="350" step="0.1"')+
  '</div><p class="basic-note">Your gender won’t limit your workouts. You choose your training focus in the next step.</p>';
 const pageTwo=()=>'<p class="basic-step">STEP 2 OF 2 · YOUR ROUTINE</p>'+
  '<h1 id="basic-title">Build your first four weeks.</h1>'+
  '<p class="basic-intro">Choose what fits your life. All plans can be adjusted later.</p>'+
  '<div class="basic-grid">'+
  select('goal','Main goal',BASIC_GOALS,data.goal)+
  select('equipment','Where will you train?',[['gym','Gym'],['home','Home · dumbbells or bands'],['bodyweight','Anywhere · no equipment']],data.equipment)+
  select('experience','Training experience',[['beginner','New or returning'],['regular','Train regularly']],data.experience)+
  select('focus','Preferred focus',[['balanced','Balanced whole body'],['lower','Legs and glutes'],['upper','Upper body']],data.focus)+
  select('days','Training days per week',[[2,'2 days'],[3,'3 days'],[4,'4 days']].map(([a,b])=>[String(a),b]),String(data.days))+
  select('minutes','Time per workout',[[30,'30 minutes'],[45,'45 minutes'],[60,'60 minutes']].map(([a,b])=>[String(a),b]),String(data.minutes))+
  '</div><p class="basic-note">Designed for adults without activity restrictions. If you have an injury, pregnancy-related concerns or a medical condition, get appropriate individual advice before starting.</p>';
 function render(){
  root.innerHTML='<section class="basic-onboarding-card" role="dialog" aria-modal="true" aria-labelledby="basic-title">'+
  '<div class="basic-brand">RECOMP · BASIC</div>'+
  '<form id="basic-form">'+(step===1?pageOne():pageTwo())+
  '<p class="basic-error" id="basic-error" role="alert" hidden></p>'+
  '<div class="basic-actions">'+(step===2?'<button type="button" data-basic-back class="basic-secondary">Back</button>':'')+
  '<button type="submit" class="basic-primary">'+(step===1?'Continue':'Create my workout plan')+'</button></div>'+
  '</form></section>';
  root.querySelector('[data-basic-back]')?.addEventListener('click',()=>{record();step=1;render();});
  root.querySelector('form').addEventListener('submit',async e=>{
   e.preventDefault();
   if(saving)return;
   record();
   const error=root.querySelector('#basic-error');
   try{
    if(step===1){
     // Validate the measurements without requiring the rest of the survey yet.
     validateBasicProfile(data);
     step=2;render();
     return;
    }
    const profile=validateBasicProfile(data);
    saving=true;
    const submit=root.querySelector('.basic-primary');submit.disabled=true;
    await onSave(profile);
    root.remove();
   }catch(e){
    error.textContent=e?.message||'Please review your answers and try again.';
    error.hidden=false;
    const button=root.querySelector('.basic-primary');button.disabled=false;
   }finally{saving=false;}
  });
  root.querySelector('input,select')?.focus();
  if(step===2)runMotion('playBasicProgrammeChoices',root);
 }
 function record(){
  const form=root.querySelector('form');
  if(!form)return;
  for(const [key,value] of new FormData(form))data[key]=value;
 }
 document.body.appendChild(root);
 render();
 return true;
}
