// Recomp v3.2: private, resumable Advanced fitness interview.
// Drafts are device-local. No network request or AI service is used here.
export const JOURNEY_DRAFT_KEY='recomp-advanced-journey-draft-v3.2';
export const JOURNEY_STAGES=Object.freeze([
 {name:'Your ambition',tag:'01 / DIRECTION',title:'What does progress look like to you?',sub:'Choose your main goal. There is no wrong answer.'},
 {name:'Starting point',tag:'02 / FOUNDATION',title:'Start where you are.',sub:'A little context makes your plan more realistic. Skip anything you prefer not to share.'},
 {name:'Measurements',tag:'03 / BODY MAP',title:'Your body, your baseline.',sub:'Tap a body area, then add any measurements you know. Every tape measurement is optional.'},
 {name:'Training',tag:'04 / TRAINING',title:'Build a routine that fits real life.',sub:'Your programme should fit your week, not the other way round.'},
 {name:'Food & life',tag:'05 / FUEL',title:'Food you actually enjoy.',sub:'Your culture, schedule and preferences belong in your plan.'},
 {name:'Your profile',tag:'06 / REVIEW',title:'This is your starting line.',sub:'Review and edit any answers before generating your own AI planning prompt.'}
]);
export const JOURNEY_MEASUREMENTS=Object.freeze([
 ['neck','Neck','upper'],['shoulders','Shoulder circumference','upper'],['chest','Chest','upper'],
 ['underChest','Under chest','upper'],['rightBicep','Right upper arm','upper'],['leftBicep','Left upper arm','upper'],
 ['rightForearm','Right forearm','upper'],['leftForearm','Left forearm','upper'],['wrist','Wrist','upper'],
 ['naturalWaist','Natural waist','core'],['belly','At belly button','core'],['below','Below belly button','core'],
 ['hips','Hips','core'],
 ['rightThigh','Right thigh','lower'],['leftThigh','Left thigh','lower'],
 ['rightKnee','Right knee','lower'],['leftKnee','Left knee','lower'],
 ['rightCalf','Right calf','lower'],['leftCalf','Left calf','lower'],
 ['rightAnkle','Right ankle','lower'],['leftAnkle','Left ankle','lower']
]);
const GOALS=[['body-recomposition','⚡','Lose fat & build muscle'],['lose-fat','🔥','Lose body fat'],['build-muscle','🏋️','Build muscle'],['maintain','🌿','Maintain my progress'],['improve-fitness','💚','Improve fitness']];
const SECONDARY=[['none','No secondary goal'],['strength','Get stronger'],['endurance','Build endurance'],['mobility','Improve mobility'],['consistency','Build consistency']];
const ACTIVITY=[['sedentary','Mostly sitting'],['light','Lightly active'],['moderate','Moderately active'],['active','Very active']];
const EXPERIENCE=[['beginner','Getting started'],['intermediate','Some experience'],['advanced','Experienced']];
const EQUIPMENT=[['gym','🏟️','Gym access'],['home','🏠','Home equipment'],['bodyweight','🧘','Bodyweight only']];
const DIETS=[['omnivore','🥗','Mixed diet'],['vegetarian','🌱','Vegetarian'],['vegan','🥬','Vegan'],['pescatarian','🐟','Pescatarian'],['halal','🍲','Halal'],['other','✏️','Other']];
const CUISINES=[['indian','🇮🇳','Indian favourites'],['mixed','🌍','Indian + global'],['global','🍽️','Global'],['mediterranean','🫒','Mediterranean'],['east-asian','🍜','East Asian']];
const TRAINING_STYLE=[['balanced','Balanced strength'],['strength','Strength focused'],['hypertrophy','Muscle building'],['cardio','Cardio focused'],['mobility','Movement & mobility']];
const START={
 goal:'body-recomposition',secondaryGoal:'none',diet:'omnivore',equipment:'gym',
 activity:'moderate',experience:'beginner',days:'3',minutes:'45',trainingTime:'flexible',
 trainingStyle:'balanced',targetWeeks:'12',cuisine:'mixed',mealPrep:'flexible',budget:'flexible',
 sleepHours:'',stress:'moderate',age:'',heightCm:'',weightKg:'',waistCm:'',
 allergies:'',avoidFoods:'',exerciseLimits:'',foodNotes:'',notes:'',sexForEstimate:'not-specified'
};
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const bounded=(s,max=300)=>String(s??'').slice(0,max);
const cssID=v=>String(v).replace(/[^a-zA-Z0-9-]/g,'');
const round=n=>Math.round(n*10)/10;
export function toInches(value,unit='cm'){
 const n=Number(value);return Number.isFinite(n)&&n>0?round(unit==='cm'?n/2.54:n):null;
}
export function fromInches(value,unit='cm'){
 const n=Number(value);return Number.isFinite(n)&&n>0?round(unit==='cm'?n*2.54:n):'';
}
export function draftFromSaved(profile={},measurements={}){
 const fields={...START};
 for(const key of Object.keys(START))if(profile&&profile[key]!=null&&profile[key]!=='')fields[key]=bounded(profile[key],650);
 const values={};
 for(const [key] of JOURNEY_MEASUREMENTS){
  const n=Number(measurements?.[key]);
  if(measurements?.[key]!=null&&measurements[key]!==''&&Number.isFinite(n)&&n>0&&n<=120)values[key]=n;
 }
 return {version:1,step:0,zone:'upper',unit:'cm',fields,measurements:values};
}
export function readJourneyDraft(storage,profile,measurements){
 const fallback=draftFromSaved(profile,measurements);
 try{
  const text=storage?.getItem(JOURNEY_DRAFT_KEY);
  if(!text||text.length>16000)return fallback;
  const saved=JSON.parse(text);
  if(saved?.version!==1||!saved.fields||typeof saved.fields!=='object')return fallback;
  const fields={...fallback.fields};
  for(const key of Object.keys(fields))if(saved.fields[key]!=null)fields[key]=bounded(saved.fields[key],650);
  const values={};
  for(const [key] of JOURNEY_MEASUREMENTS){
   const n=Number(saved.measurements?.[key]);
   if(saved.measurements?.[key]!=null&&Number.isFinite(n)&&n>0&&n<=120)values[key]=n;
  }
  return {version:1,fields,measurements:values,step:Math.min(5,Math.max(0,Math.trunc(Number(saved.step)||0))),
   zone:['upper','core','lower'].includes(saved.zone)?saved.zone:'upper',unit:saved.unit==='in'?'in':'cm'};
 }catch{return fallback;}
}
export function validateJourneyStep(draft,step){
 const f=draft.fields||{};
 const check=(key,min,max,label,required=false)=>{
  const raw=String(f[key]??'').trim();
  if(!raw){if(required)throw Error('Enter '+label+'.');return;}
  if(!Number.isFinite(Number(raw))||Number(raw)<min||Number(raw)>max)throw Error(label+' must be between '+min+' and '+max+'.');
 };
 if(step===0&&!GOALS.some(o=>o[0]===f.goal))throw Error('Choose a main fitness goal.');
 if(step===1){
  check('age',18,100,'Age');check('heightCm',100,230,'Height');check('weightKg',30,350,'Weight');
 }
 if(step===2){
  for(const [key,label] of JOURNEY_MEASUREMENTS){
   const n=draft.measurements?.[key];
   if(n!=null&&(!Number.isFinite(Number(n))||Number(n)<=0||Number(n)>120))throw Error(label+' needs a valid measurement.');
  }
 }
 if(step===3){
  check('days',1,7,'Training days',true);check('minutes',10,180,'Workout duration',true);
  check('targetWeeks',4,52,'Target timeframe');
 }
 if(step===4)check('sleepHours',1,16,'Sleep hours');
 return true;
}
export function makeJourneyResult(draft){
 for(let i=0;i<5;i++)validateJourneyStep(draft,i);
 const fields={...draft.fields};
 for(const key of Object.keys(fields))fields[key]=bounded(fields[key],key==='notes'?650:300);
 const parts=JOURNEY_MEASUREMENTS.filter(([k])=>draft.measurements[k]!=null);
 const waist=draft.measurements.naturalWaist??draft.measurements.belly;
 if(waist!=null)fields.waistCm=String(round(waist*2.54));
 else fields.waistCm=fields.waistCm||'';
 return {profile:fields,measurements:Object.fromEntries(parts.map(([k])=>[k,draft.measurements[k]]))};
}
const choices=(key,options,value)=>'<div class="journey-choices" role="group" aria-label="'+esc(key)+'">'+options.map(([v,symbol,label])=>{
 const title=label||symbol;
 const emoji=label?'<span aria-hidden="true" class="journey-choice-emoji">'+symbol+'</span>':'';
 return '<button type="button" class="journey-choice '+(value===v?'is-selected':'')+'" data-journey-choice="'+esc(key)+'" data-value="'+esc(v)+'" aria-pressed="'+(value===v)+'">'+emoji+'<span>'+esc(title)+'</span><span class="journey-choice-check" aria-hidden="true">'+(value===v?'✓':'○')+'</span></button>';
}).join('')+'</div>';
const select=(key,label,options,f)=>'<label class="journey-field"><span>'+esc(label)+'</span><select name="'+esc(key)+'">'+options.map(([v,t])=>'<option value="'+esc(v)+'" '+(f[key]===v?'selected':'')+'>'+esc(t)+'</option>').join('')+'</select></label>';
const field=(key,label,f,{type='text',placeholder='',min='',max='',step='',help='',limit=160}={})=>
 '<label class="journey-field"><span>'+esc(label)+'</span><input name="'+esc(key)+'" type="'+type+'" value="'+esc(f[key]??'')+'"'+(placeholder?' placeholder="'+esc(placeholder)+'"':'')+
 (min!==''?' min="'+min+'"':'')+(max!==''?' max="'+max+'"':'')+(step!==''?' step="'+step+'"':'')+
 ' maxlength="'+limit+'" autocomplete="off"/>'+(help?'<small>'+esc(help)+'</small>':'')+'</label>';
const textarea=(key,label,f,placeholder='')=>'<label class="journey-field"><span>'+esc(label)+'</span><textarea name="'+esc(key)+'" maxlength="'+(key==='notes'?650:300)+'" rows="2" placeholder="'+esc(placeholder)+'">'+esc(f[key]||'')+'</textarea></label>';
const group=(title,text,html)=>'<section class="journey-question"><div class="journey-question-head"><h3>'+esc(title)+'</h3>'+(text?'<p>'+esc(text)+'</p>':'')+'</div>'+html+'</section>';
function bodyDiagram(zone){
 const active=zone==='upper'?'upper':zone==='core'?'core':'lower';
 return '<div class="journey-body-map"><svg viewBox="0 0 190 305" role="img" aria-label="Simple body silhouette highlighting '+esc(active)+' measurements">'+
 '<circle cx="95" cy="31" r="20" fill="none" stroke="currentColor" stroke-width="3"/>'+
 '<path d="M73 57 Q49 64 44 96 L32 173 M117 57 Q141 64 146 96 L158 173 M71 60 L75 141 L67 215 L64 288 M119 60 L115 141 L123 215 L126 288 M75 141 Q95 155 115 141 M67 215 L85 218 M105 218 L123 215" fill="none" stroke="currentColor" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>'+
 '<ellipse cx="95" cy="94" rx="33" ry="40" fill="'+(active==='upper'?'#57d9ad':'#7d918d')+'" fill-opacity="'+(active==='upper'?'0.44':'0.12')+'" stroke="'+(active==='upper'?'#6cf3c5':'#596e68')+'" stroke-width="2"/>'+
 '<ellipse cx="95" cy="154" rx="24" ry="28" fill="'+(active==='core'?'#57d9ad':'#7d918d')+'" fill-opacity="'+(active==='core'?'0.44':'0.12')+'" stroke="'+(active==='core'?'#6cf3c5':'#596e68')+'" stroke-width="2"/>'+
 '<ellipse cx="76" cy="230" rx="17" ry="60" fill="'+(active==='lower'?'#57d9ad':'#7d918d')+'" fill-opacity="'+(active==='lower'?'0.40':'0.12')+'" stroke="'+(active==='lower'?'#6cf3c5':'#596e68')+'" stroke-width="2"/>'+
 '<ellipse cx="114" cy="230" rx="17" ry="60" fill="'+(active==='lower'?'#57d9ad':'#7d918d')+'" fill-opacity="'+(active==='lower'?'0.40':'0.12')+'" stroke="'+(active==='lower'?'#6cf3c5':'#596e68')+'" stroke-width="2"/></svg>'+
 '<div class="journey-body-zones" role="group" aria-label="Body areas">'+
 [['upper','Upper body'],['core','Midsection'],['lower','Lower body']].map(([k,label])=>'<button type="button" data-journey-zone="'+k+'" class="'+(zone===k?'selected':'')+'">'+esc(label)+'</button>').join('')+
 '</div></div>';
}
function content(d){
 const f=d.fields,step=d.step;
 if(step===0)return group('Your main goal','We will prioritise this when designing your workouts.',choices('goal',GOALS,f.goal))+
  group('Anything else you would love to improve?','Optional, pick one.',choices('secondaryGoal',SECONDARY,f.secondaryGoal));
 if(step===1)return group('Your starting point','These are optional. Age and body size help estimate energy targets but do not determine your worth.',
  '<div class="journey-fields">'+field('age','Age in years',f,{type:'number',min:18,max:100,placeholder:'Optional'})+
  field('heightCm','Height in cm',f,{type:'number',min:100,max:230,step:'0.1',placeholder:'Optional'})+
  field('weightKg','Weight in kg',f,{type:'number',min:30,max:350,step:'0.1',placeholder:'Optional'})+
  select('sexForEstimate','Sex for calorie estimate (optional)',[['not-specified','Prefer not to say'],['female','Female'],['male','Male']],f)+'</div>')+
  group('How much do you move?',null,choices('activity',ACTIVITY,f.activity))+
  group('How familiar are you with structured exercise?',null,choices('experience',EXPERIENCE,f.experience));
 if(step===2){
  const options=JOURNEY_MEASUREMENTS.filter(x=>x[2]===d.zone);
  return '<div class="journey-unit-switch"><span>Measure in</span><button type="button" data-journey-unit="cm" aria-pressed="'+(d.unit==='cm')+'" class="'+(d.unit==='cm'?'selected':'')+'">cm</button><button type="button" data-journey-unit="in" aria-pressed="'+(d.unit==='in')+'" class="'+(d.unit==='in'?'selected':'')+'">inches</button></div>'+
   bodyDiagram(d.zone)+
   '<p class="journey-tip">Measure with a flexible tape without pulling it tight. Skip unknown values. We store centimetre or inch answers consistently in inches for Recomp’s existing Body records.</p>'+
   '<div class="journey-measurement-grid">'+options.map(([key,label])=>
    '<label class="journey-field"><span>'+esc(label)+'</span><input type="number" inputmode="decimal" data-journey-measure="'+key+'" min="0.1" max="'+(d.unit==='cm'?'305':'120')+'" step="0.1" value="'+esc(fromInches(d.measurements[key],d.unit))+'" placeholder="Optional"/><small>'+esc(d.unit)+' · optional</small></label>').join('')+'</div>';
 }
 if(step===3)return group('Where will you train?',null,choices('equipment',EQUIPMENT,f.equipment))+
  group('What is realistic for your week?',null,'<div class="journey-fields">'+field('days','Training days per week',f,{type:'number',min:1,max:7,step:1})+
  field('minutes','Minutes per session',f,{type:'number',min:10,max:180,step:5})+
  field('targetWeeks','Target timeframe (weeks)',f,{type:'number',min:4,max:52,step:1})+
  select('trainingTime','Preferred training time',[['flexible','Flexible'],['morning','Morning'],['afternoon','Afternoon'],['evening','Evening']],f)+'</div>')+
  group('Your training style',null,choices('trainingStyle',TRAINING_STYLE,f.trainingStyle))+
  group('Any exercises you want to avoid?','Mention pain, injury-related limitations or preferences, without needing to disclose a diagnosis.',textarea('exerciseLimits','Movement restrictions (optional)',f,'For example: avoid overhead presses'));
 if(step===4)return group('How do you like to eat?',null,choices('diet',DIETS,f.diet))+
  group('Which food feels like home?',null,choices('cuisine',CUISINES,f.cuisine))+
  group('Your routine','Optional details help us suggest realistic meals.', '<div class="journey-fields">'+
   select('mealPrep','Cooking time',[['quick','Under 20 minutes'],['moderate','20–45 minutes'],['flexible','Flexible']],f)+
   select('budget','Food budget',[['low','Budget-conscious'],['moderate','Moderate'],['flexible','Flexible']],f)+
   field('sleepHours','Average sleep (hours)',f,{type:'number',min:1,max:16,step:0.5,placeholder:'Optional'})+
   select('stress','Typical stress level',[['low','Low'],['moderate','Moderate'],['high','High'],['unsure','Prefer not to say']],f)+'</div>')+
  group('Anything we should respect?','All optional.',textarea('allergies','Food allergies',f,'For example: peanuts')+
   textarea('avoidFoods','Disliked or avoided foods',f,'For example: mushrooms')+
   textarea('foodNotes','Foods you enjoy or usually eat',f,'For example: home-cooked Indian lunches')+
   textarea('notes','Other guidance for your AI coach',f,'Anything that would help tailor your plan'));
 const tags=[
  ['Goal',GOALS.find(x=>x[0]===f.goal)?.[2]||'Not chosen',0],
  ['Starting point',[f.age&&f.age+' years',f.heightCm&&f.heightCm+' cm',f.weightKg&&f.weightKg+' kg'].filter(Boolean).join(' · ')||'Optional details skipped',1],
  ['Measurements',Object.keys(d.measurements).length+' recorded, private on this device',2],
  ['Training',f.days+' days per week · '+f.minutes+' minutes · '+f.equipment,3],
  ['Food',f.diet+' · '+f.cuisine,4]
 ];
 return '<div class="journey-review-list">'+tags.map(([label,value,index])=>
  '<div class="journey-review-card"><div><small>'+esc(label)+'</small><strong>'+esc(value)+'</strong></div><button type="button" data-journey-edit="'+index+'">Edit</button></div>').join('')+'</div>'+
  '<div class="journey-privacy"><strong>🔒 Your data, your decision.</strong><p>Unfinished answers stay on this device. Once saved, your profile follows Recomp’s existing optional backup settings. Nothing is sent to an AI service automatically. Review the prompt before sharing it.</p></div>';
}
function saveDraft(storage,d){try{storage?.setItem(JOURNEY_DRAFT_KEY,JSON.stringify(d));}catch{/* Storage is optional; user can still finish. */}}
export function showPersonalJourney({profile=null,measurements=null,onSave,onExit=()=>{},storage=globalThis.localStorage}={}){
 if(typeof document==='undefined'||typeof onSave!=='function')throw Error('Journey requires a document and save callback.');
 if(document.getElementById('recomp-personal-journey'))return false;
 const draft=readJourneyDraft(storage,profile,measurements);
 const root=document.createElement('section');
 root.id='recomp-personal-journey';
 root.className='journey-overlay';
 root.setAttribute('aria-label','Advanced personal fitness interview');
 document.body.append(root);
 const close=()=>{root.remove();onExit();};
 let busy=false;
 function render(){
  const stage=JOURNEY_STAGES[draft.step],percent=Math.round((draft.step+1)/JOURNEY_STAGES.length*100);
  root.innerHTML='<div class="journey-dialog" role="dialog" aria-modal="true" aria-labelledby="journey-heading">'+
   '<header class="journey-topbar"><div class="journey-brand"><span class="journey-brand-dot"></span> RECOMP <span> / ADVANCED</span></div>'+
   '<button type="button" class="journey-close" data-journey-close aria-label="Save progress and close">✕</button></header>'+
   '<div class="journey-progress" role="progressbar" aria-label="Interview progress" aria-valuenow="'+(draft.step+1)+'" aria-valuemin="1" aria-valuemax="6"><span style="width:'+percent+'%"></span></div>'+
   '<div class="journey-progress-label"><span>'+esc(stage.tag)+'</span><span>STEP '+(draft.step+1)+' OF '+JOURNEY_STAGES.length+'</span></div>'+
   '<div class="journey-scroll" tabindex="-1"><h1 id="journey-heading">'+esc(stage.title)+'</h1><p class="journey-subtitle">'+esc(stage.sub)+'</p>'+
   '<div class="journey-step-content">'+content(draft)+'</div><p class="journey-error" role="alert" hidden></p></div>'+
   '<footer class="journey-footer"><button type="button" data-journey-back '+(draft.step===0?'disabled':'')+'>← Back</button>'+
   '<span class="journey-saved">◉ Progress saved locally</span>'+
   '<button type="button" class="journey-next" data-journey-next>'+(draft.step===5?'Save & create prompt':'Continue →')+'</button></footer></div>';
 }
 function alertError(error){
  const target=root.querySelector('.journey-error');if(target){target.textContent=error.message||String(error);target.hidden=false;}
 }
 root.addEventListener('click',async event=>{
  const button=event.target.closest('button');if(!button||busy)return;
  if(button.hasAttribute('data-journey-close')){saveDraft(storage,draft);close();return;}
  if(button.dataset.journeyChoice){
   draft.fields[button.dataset.journeyChoice]=button.dataset.value;
   saveDraft(storage,draft);render();return;
  }
  if(button.dataset.journeyZone){
   draft.zone=button.dataset.journeyZone;saveDraft(storage,draft);render();return;
  }
  if(button.dataset.journeyUnit){
   draft.unit=button.dataset.journeyUnit;saveDraft(storage,draft);render();return;
  }
  if(button.dataset.journeyEdit!=null){
   draft.step=Number(button.dataset.journeyEdit);saveDraft(storage,draft);render();return;
  }
  if(button.hasAttribute('data-journey-back')){
   draft.step=Math.max(0,draft.step-1);saveDraft(storage,draft);render();return;
  }
  if(!button.hasAttribute('data-journey-next'))return;
  try{
   validateJourneyStep(draft,draft.step);
   if(draft.step!==5){
    draft.step++;saveDraft(storage,draft);render();
    root.querySelector('.journey-scroll')?.scrollTo(0,0);
    root.querySelector('.journey-next')?.focus();
    return;
   }
   busy=true;button.disabled=true;button.textContent='Saving…';
   await onSave(makeJourneyResult(draft));
   try{storage?.removeItem(JOURNEY_DRAFT_KEY);}catch{}
   close();
  }catch(error){alertError(error);button.disabled=false;busy=false;if(draft.step===5)button.textContent='Save & create prompt';}
 });
 root.addEventListener('input',event=>{
  const input=event.target;
  if(input.dataset.journeyMeasure){
   const key=input.dataset.journeyMeasure,raw=String(input.value).trim();
   if(!raw){delete draft.measurements[key];}
   else{
    const value=toInches(raw,draft.unit);
    if(value!=null)draft.measurements[key]=value;
   }
   saveDraft(storage,draft);return;
  }
  const key=input.name;
  if(key&&Object.hasOwn(START,key)){draft.fields[key]=bounded(input.value,key==='notes'?650:300);saveDraft(storage,draft);}
 });
 root.addEventListener('change',event=>{
  const input=event.target;
  if(input.name&&Object.hasOwn(START,input.name)){draft.fields[input.name]=bounded(input.value,650);saveDraft(storage,draft);}
 });
 root.addEventListener('keydown',event=>{
  if(event.key==='Escape'){event.preventDefault();saveDraft(storage,draft);close();}
  if(event.key==='Tab'){
   const all=[...root.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled)')].filter(x=>x.getClientRects().length);
   const first=all[0],last=all.at(-1);
   if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
   else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
  }
 });
 render();
 root.querySelector('.journey-close')?.focus();
 return true;
}
