// Recomp v3.2: private, resumable Advanced fitness interview.
// Drafts are device-local. No network request or AI service is used here.
export const JOURNEY_DRAFT_KEY='recomp-advanced-journey-draft-v3.2';
export const JOURNEY_STAGES=Object.freeze([
 {name:'Your ambition',title:'What does progress look like to you?',sub:'Choose your main goal. There is no wrong answer.'},
 {name:'Starting point',title:'Start where you are.',sub:'Your age, height, weight and sex let your AI coach estimate realistic targets, so these four are required.'},
 {name:'Measurements',title:'Your body, your baseline.',sub:'Tap a body area, then add what you can. Measurements are optional, but the more you add, the better your plan can be tailored.'},
 {name:'Training',title:'Build a routine that fits real life.',sub:'Your programme should fit your week, not the other way round.'},
 {name:'Food & life',title:'Food you actually enjoy.',sub:'Your culture, schedule and preferences belong in your plan.'},
 {name:'Your profile',title:'This is your starting line.',sub:'Review and edit any answers before generating your own AI planning prompt.'}
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
const GOALS=[['body-recomposition','Lose fat & build muscle'],['lose-fat','Lose body fat'],['build-muscle','Build muscle'],['maintain','Maintain my progress'],['improve-fitness','Improve fitness']];
const SECONDARY=[['strength','Get stronger'],['endurance','Build endurance'],['mobility','Improve mobility'],['consistency','Build consistency']];
const ACTIVITY=[
 ['sedentary','Mostly sitting','Desk job or studying, little walking. Under about 5,000 steps a day.'],
 ['light','Lightly active','Short walks, errands and some time on your feet. About 5,000–7,500 steps.'],
 ['moderate','Moderately active','Brisk daily walks, an active commute or on your feet for part of the day. About 7,500–10,000 steps.'],
 ['active','Very active','A physical job or on your feet most of the day, such as building, nursing or warehouse work. Over 10,000 steps.']];
const EXPERIENCE=[['beginner','Getting started'],['intermediate','Some experience'],['advanced','Experienced']];
const EQUIPMENT=[['gym','Gym access'],['home','Home equipment'],['bodyweight','Bodyweight only']];
const DIETS=[['omnivore','Mixed diet'],['vegetarian','Vegetarian'],['vegan','Vegan'],['pescatarian','Pescatarian'],['halal','Halal'],['other','Other']];
const CUISINES=[['indian','Indian favourites'],['mixed','Indian + global'],['global','Global'],['mediterranean','Mediterranean'],['east-asian','East Asian'],['other','Other']];
const TRAINING_STYLE=[['balanced','Balanced strength'],['strength','Strength focused'],['hypertrophy','Muscle building'],['cardio','Cardio focused'],['mobility','Movement & mobility']];
const SEX=[['','Choose…'],['female','Female'],['male','Male'],['not-specified','Prefer not to say']];
const INJURY_ANSWERS=[['no','No'],['yes','Yes']];
const INJURY_WHEN=[['','Choose…'],['under-6-weeks','Less than 6 weeks ago'],['6-weeks-6-months','6 weeks to 6 months ago'],['6-12-months','6 to 12 months ago'],['over-1-year','More than a year ago'],['long-term','It is long-term or comes and goes']];
const INJURY_RECOVERY=[['','Choose…'],['recovered','Fully recovered'],['mostly','Mostly recovered, some discomfort'],['recovering','Still recovering'],['unsure','Not sure']];
// Questions where several answers can be picked. Stored as arrays.
const PLANT_BASED=['vegetarian','vegan','pescatarian'];
const MULTI=Object.freeze({secondaryGoal:SECONDARY,trainingStyle:TRAINING_STYLE,diet:DIETS});
export const JOURNEY_MULTI_CHOICE=Object.freeze(Object.keys(MULTI));
const START={
 goal:'body-recomposition',secondaryGoal:[],diet:['omnivore'],dietOther:'',equipment:'gym',
 activity:'moderate',experience:'beginner',days:'3',minutes:'45',trainingTime:'flexible',
 trainingStyle:['balanced'],targetWeeks:'12',cuisine:'mixed',cuisineOther:'',mealPrep:'flexible',budget:'flexible',
 sleepHours:'',stress:'moderate',age:'',heightCm:'',weightKg:'',waistCm:'',
 allergies:'',avoidFoods:'',exerciseLimits:'',foodNotes:'',notes:'',sexForEstimate:'',
 hasInjury:'no',injuryDetails:'',injuryWhen:'',injuryRecovery:'',injuryCare:''
};
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const bounded=(s,max=300)=>String(s??'').slice(0,max);
// Accepts an array, a comma-separated string or a single legacy value such as
// 'vegetarian' or 'none', and keeps only known options.
export function choiceList(value,key){
 const allowed=(MULTI[key]||[]).map(o=>o[0]);
 const raw=Array.isArray(value)?value:String(value??'').split(',');
 return [...new Set(raw.map(x=>String(x).trim()).filter(x=>allowed.includes(x)))];
}
const fieldValue=(key,value)=>MULTI[key]?choiceList(value,key):bounded(value,650);
const round=n=>Math.round(n*10)/10;
export function toInches(value,unit='cm'){
 const n=Number(value);return Number.isFinite(n)&&n>0?round(unit==='cm'?n/2.54:n):null;
}
export function fromInches(value,unit='cm'){
 const n=Number(value);return Number.isFinite(n)&&n>0?round(unit==='cm'?n*2.54:n):'';
}
export function draftFromSaved(profile={},measurements={}){
 const fields={...START};
 for(const key of Object.keys(START))if(profile&&profile[key]!=null&&profile[key]!=='')fields[key]=fieldValue(key,profile[key]);
 const values={};
 for(const [key] of JOURNEY_MEASUREMENTS){
  const n=Number(measurements?.[key]);
  if(measurements?.[key]!=null&&measurements[key]!==''&&Number.isFinite(n)&&n>0&&n<=120)values[key]=n;
 }
 return {version:1,step:0,zone:'upper',unit:'cm',tapeReady:Object.keys(values).length>0,editingFromReview:false,fields,measurements:values};
}
export function readJourneyDraft(storage,profile,measurements){
 const fallback=draftFromSaved(profile,measurements);
 try{
  const text=storage?.getItem(JOURNEY_DRAFT_KEY);
  if(!text||text.length>16000)return fallback;
  const saved=JSON.parse(text);
  if(saved?.version!==1||!saved.fields||typeof saved.fields!=='object')return fallback;
  const fields={...fallback.fields};
  for(const key of Object.keys(fields))if(saved.fields[key]!=null)fields[key]=fieldValue(key,saved.fields[key]);
  const values={};
  for(const [key] of JOURNEY_MEASUREMENTS){
   const n=Number(saved.measurements?.[key]);
   if(saved.measurements?.[key]!=null&&Number.isFinite(n)&&n>0&&n<=120)values[key]=n;
  }
  return {version:1,fields,measurements:values,step:Math.min(5,Math.max(0,Math.trunc(Number(saved.step)||0))),
   zone:['upper','core','lower'].includes(saved.zone)?saved.zone:'upper',unit:saved.unit==='in'?'in':'cm',
   tapeReady:Boolean(saved.tapeReady)||Object.keys(values).length>0,editingFromReview:Boolean(saved.editingFromReview)};
 }catch{return fallback;}
}
export function validateJourneyStep(draft,step){
 const f=draft.fields||{};
 const check=(key,min,max,label,required=false)=>{
  const raw=String(f[key]??'').trim();
  if(!raw){if(required)throw Error('Enter your '+label.toLowerCase()+'.');return;}
  if(!Number.isFinite(Number(raw))||Number(raw)<min||Number(raw)>max)throw Error(label+' must be between '+min+' and '+max+'.');
 };
 if(step===0&&!GOALS.some(o=>o[0]===f.goal))throw Error('Choose a main fitness goal.');
 if(step===1){
  check('age',18,100,'Age',true);check('heightCm',100,230,'Height in cm',true);check('weightKg',30,350,'Weight in kg',true);
  if(!SEX.some(o=>o[0]&&o[0]===f.sexForEstimate))throw Error('Choose an option for sex. It is used for the calorie estimate.');
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
  if(!choiceList(f.trainingStyle,'trainingStyle').length)throw Error('Choose at least one training style.');
  if(f.hasInjury==='yes'){
   if(!String(f.injuryDetails||'').trim())throw Error('Describe the injury or physical issue, and where it is.');
   if(!INJURY_WHEN.some(o=>o[0]&&o[0]===f.injuryWhen))throw Error('Choose when the injury happened.');
   if(!INJURY_RECOVERY.some(o=>o[0]&&o[0]===f.injuryRecovery))throw Error('Choose how the injury is now.');
  }
 }
 if(step===4){
  const diets=choiceList(f.diet,'diet');
  if(!diets.length)throw Error('Choose at least one way you like to eat.');
  if(diets.includes('other')&&!String(f.dietOther||'').trim())throw Error('Describe your diet in the "Other" box.');
  if(f.cuisine==='other'&&!String(f.cuisineOther||'').trim())throw Error('Describe the food that feels like home in the "Other" box.');
  check('sleepHours',1,16,'Sleep hours');
 }
 return true;
}
export function makeJourneyResult(draft){
 for(let i=0;i<5;i++)validateJourneyStep(draft,i);
 const fields={...draft.fields};
 for(const key of Object.keys(fields))fields[key]=MULTI[key]?choiceList(fields[key],key):bounded(fields[key],key==='notes'?650:300);
 // Drop follow-up answers that no longer apply.
 if(!fields.diet.includes('other'))fields.dietOther='';
 if(fields.cuisine!=='other')fields.cuisineOther='';
 if(fields.hasInjury!=='yes')Object.assign(fields,{hasInjury:'no',injuryDetails:'',injuryWhen:'',injuryRecovery:'',injuryCare:''});
 const parts=JOURNEY_MEASUREMENTS.filter(([k])=>draft.measurements[k]!=null);
 const waist=draft.measurements.naturalWaist??draft.measurements.belly;
 if(waist!=null)fields.waistCm=String(round(waist*2.54));
 else fields.waistCm=fields.waistCm||'';
 return {profile:fields,measurements:Object.fromEntries(parts.map(([k])=>[k,draft.measurements[k]]))};
}
// Line icons in the app's own style (24px grid, round caps), inlined so the
// journey does not depend on the main app's icon sprite being rendered.
const ICON_PATHS={
 check:'<path d="M5 12.5l4.5 4.5L19 7.5"/>',
 close:'<path d="M6 6l12 12M18 6L6 18"/>',
 back:'<path d="M19 12H5M11 6l-6 6 6 6"/>',
 forward:'<path d="M5 12h14M13 6l6 6-6 6"/>',
 tape:'<path d="M3 8h18v8H3z"/><path d="M7 8v3M11 8v4M15 8v3M19 8v4"/>'
};
const icon=name=>'<svg class="journey-icon" viewBox="0 0 24 24" aria-hidden="true">'+ICON_PATHS[name]+'</svg>';
const choices=(key,options,value)=>{
 const multi=Boolean(MULTI[key]),picked=multi?choiceList(value,key):[value];
 return '<div class="journey-choices'+(options.some(o=>o[2])?' has-descriptions':'')+'" role="group" aria-label="'+esc(key)+'">'+options.map(([v,label,desc])=>{
  const on=picked.includes(v);
  const text='<span class="journey-choice-text"><span>'+esc(label)+'</span>'+(desc?'<small>'+esc(desc)+'</small>':'')+'</span>';
  return '<button type="button" class="journey-choice '+(on?'is-selected':'')+'" data-journey-choice="'+esc(key)+'" data-value="'+esc(v)+'" aria-pressed="'+on+'">'+text+
   '<span class="journey-mark '+(multi?'is-multi':'')+'" aria-hidden="true">'+icon('check')+'</span></button>';
 }).join('')+'</div>';
};
const labelOf=(options,value)=>{const o=options.find(x=>x[0]===value);return o?o[1]:'';};
const listLabels=(key,value)=>choiceList(value,key).map(v=>labelOf(MULTI[key],v)).join(', ');
const select=(key,label,options,f)=>'<label class="journey-field"><span>'+esc(label)+'</span><select name="'+esc(key)+'">'+options.map(([v,t])=>'<option value="'+esc(v)+'" '+(f[key]===v?'selected':'')+'>'+esc(t)+'</option>').join('')+'</select></label>';
const field=(key,label,f,{type='text',placeholder='',min='',max='',step='',help='',limit=160}={})=>
 '<label class="journey-field"><span>'+esc(label)+'</span><input name="'+esc(key)+'" type="'+type+'" value="'+esc(f[key]??'')+'"'+(placeholder?' placeholder="'+esc(placeholder)+'"':'')+
 (min!==''?' min="'+min+'"':'')+(max!==''?' max="'+max+'"':'')+(step!==''?' step="'+step+'"':'')+
 (type==='number'?' inputmode="decimal"':'')+' maxlength="'+limit+'" autocomplete="off"/>'+(help?'<small>'+esc(help)+'</small>':'')+'</label>';
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
  group('Anything else you would love to improve?','Optional. Pick as many as you like.',choices('secondaryGoal',SECONDARY,f.secondaryGoal));
 if(step===1)return group('Your starting point','Required. These help estimate your energy needs, including sex for the calorie estimate. They do not define your worth.',
  '<div class="journey-fields">'+field('age','Age in years',f,{type:'number',min:18,max:100})+
  field('heightCm','Height in cm',f,{type:'number',min:100,max:230,step:'0.1'})+
  field('weightKg','Weight in kg',f,{type:'number',min:30,max:350,step:'0.1'})+
  select('sexForEstimate','Sex',SEX,f)+'</div>')+
  group('How much do you move?','On a typical day, outside of planned workouts.',choices('activity',ACTIVITY,f.activity))+
  group('How familiar are you with structured exercise?',null,choices('experience',EXPERIENCE,f.experience));
 if(step===2){
  if(!d.tapeReady)return '<div class="journey-tape-intro"><span class="journey-tape-icon">'+icon('tape')+'</span>'+
   '<h3>Grab a measuring tape</h3><p>Measuring takes about five minutes. Use a soft, flexible tape and wear light clothing.</p>'+
   '<p>Measurements are optional, but every one you add helps your AI coach tailor your workouts and track real progress.</p>'+
   '<button type="button" class="journey-tape-ready" data-journey-tape>I have my tape, let’s measure</button>'+
   '<p class="journey-tape-skip">No tape right now? Press <b>Skip for now</b>. You can add measurements later from the Body page.</p></div>';
  const options=JOURNEY_MEASUREMENTS.filter(x=>x[2]===d.zone);
  return '<div class="journey-unit-switch"><span>Measure in</span><button type="button" data-journey-unit="cm" aria-pressed="'+(d.unit==='cm')+'" class="'+(d.unit==='cm'?'selected':'')+'">cm</button><button type="button" data-journey-unit="in" aria-pressed="'+(d.unit==='in')+'" class="'+(d.unit==='in'?'selected':'')+'">inches</button></div>'+
   bodyDiagram(d.zone)+
   '<p class="journey-tip">Measure with a flexible tape without pulling it tight. Skip unknown values. We store centimetre or inch answers consistently in inches for Recomp’s existing Body records.</p>'+
   '<div class="journey-measurement-grid">'+options.map(([key,label])=>
    '<label class="journey-field"><span>'+esc(label)+'<span class="journey-sr"> in '+(d.unit==='cm'?'centimetres':'inches')+'</span></span><span class="journey-affix"><input type="number" inputmode="decimal" data-journey-measure="'+key+'" min="0.1" max="'+(d.unit==='cm'?'305':'120')+'" step="0.1" value="'+esc(fromInches(d.measurements[key],d.unit))+'"/><span aria-hidden="true">'+esc(d.unit)+'</span></span></label>').join('')+'</div>';
 }
 if(step===3)return group('Where will you train?',null,choices('equipment',EQUIPMENT,f.equipment))+
  group('What is realistic for your week?',null,'<div class="journey-fields">'+field('days','Training days per week',f,{type:'number',min:1,max:7,step:1})+
  field('minutes','Minutes per session',f,{type:'number',min:10,max:180,step:5})+
  field('targetWeeks','Target timeframe (weeks)',f,{type:'number',min:4,max:52,step:1})+
  select('trainingTime','Preferred training time',[['flexible','Flexible'],['morning','Morning'],['afternoon','Afternoon'],['evening','Evening']],f)+'</div>')+
  group('Your training style','Pick as many as you like.',choices('trainingStyle',TRAINING_STYLE,f.trainingStyle))+
  group('Any injuries or physical issues?','For example a knee injury, back pain or a sore shoulder. Your plan will start these areas gently.',
   choices('hasInjury',INJURY_ANSWERS,f.hasInjury)+(f.hasInjury==='yes'?'<div class="journey-injury">'+
   textarea('injuryDetails','What is it, and where?',f,'For example: left knee ligament strain, pain on stairs')+
   '<div class="journey-fields">'+select('injuryWhen','When did it happen?',INJURY_WHEN,f)+select('injuryRecovery','How is it now?',INJURY_RECOVERY,f)+'</div>'+
   textarea('injuryCare','Anything your coach should be careful with? (optional)',f,'For example: no jumping, avoid deep squats, physio cleared light weights')+
   '<p class="journey-tip">If it is recent or still painful, check with a doctor or physiotherapist before you start.</p></div>':''))+
  group('Any exercises you want to avoid?','Optional. Preferences or movements that do not feel right.',textarea('exerciseLimits','Exercises to avoid (optional)',f,'For example: avoid overhead presses'));
 if(step===4)return group('How do you like to eat?','Pick all that apply, for example vegetarian and pescatarian.',choices('diet',DIETS,f.diet)+
   (choiceList(f.diet,'diet').includes('other')?field('dietOther','Describe your diet',f,{placeholder:'For example: Jain, no onion or garlic',limit:80}):''))+
  group('Which food feels like home?',null,choices('cuisine',CUISINES,f.cuisine)+
   (f.cuisine==='other'?field('cuisineOther','Which cuisine?',f,{placeholder:'For example: Mexican, Ethiopian, Korean',limit:80}):''))+
  group('Your routine','Optional details help us suggest realistic meals.', '<div class="journey-fields">'+
   select('mealPrep','Cooking time',[['quick','Under 20 minutes'],['moderate','20–45 minutes'],['flexible','Flexible']],f)+
   select('budget','Food budget',[['low','Budget-conscious'],['moderate','Moderate'],['flexible','Flexible']],f)+
   field('sleepHours','Average sleep in hours (optional)',f,{type:'number',min:1,max:16,step:0.5})+
   select('stress','Typical stress level',[['low','Low'],['moderate','Moderate'],['high','High'],['unsure','Prefer not to say']],f)+'</div>')+
  group('Anything we should respect?','All optional.',textarea('allergies','Food allergies',f,'For example: peanuts')+
   textarea('avoidFoods','Disliked or avoided foods',f,'For example: mushrooms')+
   textarea('foodNotes','Foods you enjoy or usually eat',f,'For example: home-cooked Indian lunches')+
   textarea('notes','Other guidance for your AI coach',f,'Anything that would help tailor your plan'));
 const secondary=listLabels('secondaryGoal',f.secondaryGoal);
 const diets=choiceList(f.diet,'diet').map(v=>v==='other'&&f.dietOther?f.dietOther:labelOf(DIETS,v)).join(', ');
 const cuisine=f.cuisine==='other'&&f.cuisineOther?f.cuisineOther:labelOf(CUISINES,f.cuisine);
 const tags=[
  ['Goal',(labelOf(GOALS,f.goal)||'Not chosen')+(secondary?' · also '+secondary:''),0],
  ['Starting point',[f.age&&f.age+' years',f.heightCm&&f.heightCm+' cm',f.weightKg&&f.weightKg+' kg',labelOf(SEX,f.sexForEstimate),labelOf(ACTIVITY,f.activity)].filter(Boolean).join(' · '),1],
  ['Measurements',(Object.keys(d.measurements).length||'None')+' recorded'+(Object.keys(d.measurements).length?', private on this device':' yet'),2],
  ['Training',f.days+' days per week · '+f.minutes+' minutes · '+labelOf(EQUIPMENT,f.equipment)+' · '+listLabels('trainingStyle',f.trainingStyle),3],
  ['Injuries',f.hasInjury==='yes'?bounded(f.injuryDetails,80)+' · '+labelOf(INJURY_RECOVERY,f.injuryRecovery):'None reported',3],
  ['Food',diets+' · '+cuisine,4]
 ];
 return '<div class="journey-review-list">'+tags.map(([label,value,index])=>
  '<div class="journey-review-card"><div><small>'+esc(label)+'</small><strong>'+esc(value)+'</strong></div><button type="button" data-journey-edit="'+index+'">Edit</button></div>').join('')+'</div>'+
  '<div class="journey-privacy"><strong>Your data, your decision.</strong><p>Unfinished answers stay on this device. Once saved, your profile follows Recomp’s existing optional backup settings. Nothing is sent to an AI service automatically. Review the prompt before sharing it.</p></div>';
}
// Applies a tap on a choice button. Multi-select questions toggle the value.
export function applyJourneyChoice(draft,key,value){
 if(!Object.hasOwn(START,key))return draft;
 if(MULTI[key]){
  let list=choiceList(draft.fields[key],key);
  if(list.includes(value))list=list.filter(v=>v!==value);
  else{
   // "Mixed diet" contradicts vegetarian, vegan and pescatarian, so picking one
   // side unticks the other. Halal and Other combine with anything.
   if(key==='diet'&&value==='omnivore')list=list.filter(v=>!PLANT_BASED.includes(v));
   if(key==='diet'&&PLANT_BASED.includes(value))list=list.filter(v=>v!=='omnivore');
   list=[...list,value];
  }
  draft.fields[key]=choiceList(list,key);
 }else draft.fields[key]=String(value);
 return draft;
}
// After moving forward, editing from the review step goes straight back to it.
export function nextJourneyStep(draft){
 if(draft.editingFromReview){draft.editingFromReview=false;draft.step=5;}
 else draft.step=Math.min(5,draft.step+1);
 return draft;
}
function nextLabel(d){
 if(d.step===5)return 'Save & create prompt';
 if(d.editingFromReview)return 'Save & back to review';
 if(d.step===2&&!d.tapeReady)return 'Skip for now';
 return 'Continue';
}
// Only plain forward moves carry the arrow; saving does not.
const nextButton=d=>esc(nextLabel(d))+(d.step===5||d.editingFromReview?'':icon('forward'));
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
 // keepPlace re-renders the same step without jumping: scroll position and
 // keyboard focus return to where they were.
 // keepPlace re-renders the same step without jumping: scroll position and
 // keyboard focus return to where they were. Otherwise this is a step change:
 // the new step slides in from `direction` and focus moves to its heading.
 function render(keepPlace=null,direction=''){
  const scrollTop=keepPlace?root.querySelector('.journey-scroll')?.scrollTop||0:0;
  const stage=JOURNEY_STAGES[draft.step],total=JOURNEY_STAGES.length,percent=Math.round((draft.step+1)/total*100);
  root.innerHTML='<div class="journey-dialog" role="dialog" aria-modal="true" aria-labelledby="journey-heading">'+
   '<header class="journey-topbar"><div class="journey-brand">Recomp <span>Advanced</span></div>'+
   '<button type="button" class="journey-close" data-journey-close aria-label="Save progress and close">'+icon('close')+'</button>'+
   '<div class="journey-progress" role="progressbar" aria-label="Interview progress" aria-valuenow="'+(draft.step+1)+'" aria-valuemin="1" aria-valuemax="'+total+'" aria-valuetext="Step '+(draft.step+1)+' of '+total+': '+esc(stage.name)+'"><span style="width:'+percent+'%"></span></div>'+
   '<p class="journey-progress-label" aria-hidden="true">Step '+(draft.step+1)+' of '+total+'</p></header>'+
   '<div class="journey-scroll'+(direction?' is-entering-'+direction:'')+'" tabindex="-1"><h1 id="journey-heading" tabindex="-1">'+esc(stage.title)+'</h1><p class="journey-subtitle">'+esc(stage.sub)+'</p>'+
   '<div class="journey-step-content">'+content(draft)+'</div></div>'+
   '<p class="journey-error" role="alert" hidden></p>'+
   '<footer class="journey-footer'+(draft.step===5||draft.editingFromReview?' has-long-action':'')+'"><button type="button" class="journey-back" data-journey-back '+(draft.step===0?'disabled':'')+'>'+icon('back')+'Back</button>'+
   '<span class="journey-saved">Progress saved on this device</span>'+
   '<button type="button" class="journey-next" data-journey-next>'+nextButton(draft)+'</button></footer></div>';
  if(!keepPlace){root.querySelector('#journey-heading')?.focus({preventScroll:true});return;}
  const scroller=root.querySelector('.journey-scroll');
  if(scroller)scroller.scrollTop=scrollTop;
  if(keepPlace!==true)root.querySelector(keepPlace)?.focus({preventScroll:true});
 }
 const same=(attr,value)=>'['+attr+'="'+String(value).replace(/["\\]/g,'')+'"]';
 function alertError(error){
  const target=root.querySelector('.journey-error');if(target){target.textContent=error.message||String(error);target.hidden=false;}
 }
 root.addEventListener('click',async event=>{
  const button=event.target.closest('button');if(!button||busy)return;
  if(button.hasAttribute('data-journey-close')){saveDraft(storage,draft);close();return;}
  if(button.dataset.journeyChoice){
   applyJourneyChoice(draft,button.dataset.journeyChoice,button.dataset.value);
   saveDraft(storage,draft);
   render(same('data-journey-choice',button.dataset.journeyChoice)+same('data-value',button.dataset.value));return;
  }
  if(button.dataset.journeyZone){
   draft.zone=button.dataset.journeyZone;saveDraft(storage,draft);render(same('data-journey-zone',draft.zone));return;
  }
  if(button.dataset.journeyUnit){
   draft.unit=button.dataset.journeyUnit;saveDraft(storage,draft);render(same('data-journey-unit',draft.unit));return;
  }
  if(button.hasAttribute('data-journey-tape')){
   draft.tapeReady=true;saveDraft(storage,draft);render(null,'forward');return;
  }
  if(button.dataset.journeyEdit!=null){
   draft.step=Number(button.dataset.journeyEdit);draft.editingFromReview=true;saveDraft(storage,draft);render(null,'back');return;
  }
  if(button.hasAttribute('data-journey-back')){
   draft.step=Math.max(0,draft.step-1);saveDraft(storage,draft);render(null,'back');return;
  }
  if(!button.hasAttribute('data-journey-next'))return;
  try{
   validateJourneyStep(draft,draft.step);
   if(draft.step!==5){
    nextJourneyStep(draft);saveDraft(storage,draft);render(null,'forward');
    return;
   }
   busy=true;button.disabled=true;button.textContent='Saving…';
   await onSave(makeJourneyResult(draft));
   try{storage?.removeItem(JOURNEY_DRAFT_KEY);}catch{}
   close();
  }catch(error){alertError(error);button.disabled=false;busy=false;button.innerHTML=nextButton(draft);}
 });
 const clearError=()=>{const target=root.querySelector('.journey-error');if(target)target.hidden=true;};
 root.addEventListener('input',event=>{
  const input=event.target;clearError();
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
  if(key&&Object.hasOwn(START,key)&&!MULTI[key]){draft.fields[key]=bounded(input.value,key==='notes'?650:300);saveDraft(storage,draft);}
 });
 root.addEventListener('change',event=>{
  const input=event.target;clearError();
  if(input.name&&Object.hasOwn(START,input.name)&&!MULTI[input.name]){
   draft.fields[input.name]=bounded(input.value,input.name==='notes'?650:300);saveDraft(storage,draft);
  }
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
 return true;
}
