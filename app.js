import {get,put,getPhoto,putPhoto,deletePhoto,getAllPhotos} from './db.js';
import * as cloud from './cloud.js';

const $ = s => document.querySelector(s);
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
const n = (v,otherwise=0) => Number.isFinite(Number(v)) ? Number(v) : otherwise;
const uid = () => (crypto.randomUUID?.() || (Date.now()+'-'+Math.random().toString(36).slice(2)));
const escapeHtml = t => String(t??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const dateDisplay = date => new Date(date+'T12:00:00').toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'});
const num = x => Math.round(n(x)).toLocaleString('en-GB');
const svg = (name,cls='icon') => `<svg class="${cls}" aria-hidden="true"><use href="#ico-${name}"></use></svg>`;
const svgSymbols = `<svg xmlns="http://www.w3.org/2000/svg" style="display:none"><defs>
<symbol id="ico-home" viewBox="0 0 24 24"><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/><path d="M9 21v-9h6v9"/></symbol>
<symbol id="ico-dumbbell" viewBox="0 0 24 24"><path d="M6.5 6.5 17.5 17.5M3 8l5-5M16 21l5-5M2 11l9-9M13 22l9-9"/></symbol>
<symbol id="ico-food" viewBox="0 0 24 24"><path d="M4 3v7a3 3 0 0 0 6 0V3M7 3v18M19 21V3c-4 3-5 8-5 12h5"/></symbol>
<symbol id="ico-chart" viewBox="0 0 24 24"><path d="M3 3v18h18M7 16v-4M12 16V7M17 16V10"/></symbol>
<symbol id="ico-water" viewBox="0 0 24 24"><path d="M12 2C9 7 5 11 5 15a7 7 0 0 0 14 0c0-4-4-8-7-13z"/><path d="M9 16a3 3 0 0 0 3 3"/></symbol>
<symbol id="ico-flame" viewBox="0 0 24 24"><path d="M12 22a8 8 0 0 0 8-8c0-4-3-6-5-10 0 4-2 5-3 6C11 7 10 6 9 4 9 9 4 11 4 15a8 8 0 0 0 8 7z"/><path d="M12 22a4 4 0 0 0 4-4c0-2-2-4-4-6-1 3-4 4-4 6a4 4 0 0 0 4 4z"/></symbol>
<symbol id="ico-bolt" viewBox="0 0 24 24"><path d="M13.5 2 5 13h6.5l-1 9L20 10h-7L13.5 2z"/></symbol>
	<symbol id="ico-walk" viewBox="0 0 24 24"><circle cx="13" cy="4" r="2"/><path d="m8 22 2-7 2-4-4-2-3 5M12 11l4 3 4 1M9 7l3 4 1 5 4 6"/></symbol>
<symbol id="ico-protein" viewBox="0 0 24 24"><path d="M15.8 3.2c3.8-.1 6.2 2.7 5.7 6.5-.5 3.3-3.2 6.3-7.2 7.7L9 19l-4-4.1 1.8-5.3c1.5-4 4.7-6.2 9-6.4z"/><path d="M6 15 3.7 17.3a2.1 2.1 0 1 0 3 3l2.4-2.4"/><path d="M3.7 17.3a2.1 2.1 0 0 0-2.2 3 2.2 2.2 0 0 0 3 .5"/></symbol>
<symbol id="ico-timer" viewBox="0 0 24 24"><circle cx="12" cy="13" r="9"/><path d="M12 8v5l4 3M9 2h6"/></symbol>
<symbol id="ico-plus" viewBox="0 0 24 24"><path d="M12 4v16M4 12h16"/></symbol>
<symbol id="ico-check" viewBox="0 0 24 24"><path d="m4 12 5 5L20 6"/></symbol>
<symbol id="ico-x" viewBox="0 0 24 24"><path d="M5 5l14 14M19 5 5 19"/></symbol>
<symbol id="ico-chevron" viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></symbol>
<symbol id="ico-settings" viewBox="0 0 24 24"><path d="M10 2h4l.6 2.6 2.1.9L19 4.1l2.8 2.8-1.5 2.3.9 2.2 2.6.6v4l-2.6.6-.9 2.1 1.5 2.3-2.8 2.8-2.3-1.5-2.1.9-.6 2.6h-4l-.6-2.6-2.1-.9-2.3 1.5-2.8-2.8 1.5-2.3-.9-2.1L.2 16v-4l2.6-.6.9-2.2-1.5-2.3L5 4.1l2.3 1.4 2.1-.9z" transform="translate(1.8 1.8) scale(.85)"/><circle cx="12" cy="12" r="3.3"/></symbol>
<symbol id="ico-camera" viewBox="0 0 24 24"><path d="M3 7h4l2-3h6l2 3h4v13H3z"/><circle cx="12" cy="13" r="4"/></symbol>
<symbol id="ico-bell" viewBox="0 0 24 24"><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 22h4"/></symbol>
<symbol id="ico-cloud" viewBox="0 0 24 24"><path d="M6 19a5 5 0 0 1-1-10 8 8 0 0 1 15 3 4 4 0 0 1-1 7z"/></symbol>
<symbol id="ico-history" viewBox="0 0 24 24"><path d="M3 9V3h6M3 9a9 9 0 1 1 0 6M12 7v6l4 2"/></symbol>
<symbol id="ico-pencil" viewBox="0 0 24 24"><path d="m3 17 11-11 4 4L7 21H3zM13 7l4 4M16 4l2-2 4 4-2 2"/></symbol>
<symbol id="ico-minimise" viewBox="0 0 24 24"><path d="m4 8 8 8 8-8"/></symbol>
<symbol id="ico-arrow" viewBox="0 0 24 24"><path d="M4 12h16m-7-7 7 7-7 7"/></symbol>
<symbol id="ico-info" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 11v6M12 7h.01"/></symbol>
<symbol id="ico-download" viewBox="0 0 24 24"><path d="M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4"/></symbol>
<symbol id="ico-play" viewBox="0 0 24 24"><path d="m7 4 13 8L7 20z"/></symbol>
<symbol id="ico-pause" viewBox="0 0 24 24"><path d="M8 5v14M16 5v14"/></symbol>
<symbol id="ico-stop" viewBox="0 0 24 24"><rect x="5" y="5" width="14" height="14" rx="2"/></symbol>
<symbol id="ico-trash" viewBox="0 0 24 24"><path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14M10 11v7M14 11v7"/></symbol>
<symbol id="ico-refresh" viewBox="0 0 24 24"><path d="M20 6v6h-6M4 18v-6h6"/><path d="M6 9a7 7 0 0 1 12-2l2 5M4 12l2 5a7 7 0 0 0 12-2"/></symbol>
<symbol id="ico-edit" viewBox="0 0 24 24"><path d="m4 17 12-12 3 3L7 20H4z"/></symbol>
<symbol id="ico-swap" viewBox="0 0 24 24"><path d="M4 7h16m-5-4 5 4-5 4M20 17H4m5-4-5 4 5 4"/></symbol>
<symbol id="ico-calendar" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 2v6M17 2v6M3 10h18"/></symbol>
<symbol id="ico-moon" viewBox="0 0 24 24"><path d="M20.6 15.1A8.5 8.5 0 0 1 8.9 3.4a8.6 8.6 0 1 0 11.7 11.7z"/></symbol>
<symbol id="ico-sun" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4.2"/><path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></symbol>
<symbol id="ico-volume" viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9zM17 9a5 5 0 0 1 0 6M20 6a9 9 0 0 1 0 12"/></symbol>
</defs></svg>`;
const mkEx = (id,name,sets,reps,weight,rest,alts=[])=>({id,name,sets:Array.from({length:sets},()=>({id:uid(),kg:weight,reps,done:false})),restSeconds:rest,alts});
const TEMPLATES = [
 {id:'A',name:'Full Body A',subtitle:'Foundation · 6 exercises',items:[['legpress','Leg Press',3,10,0,120,['Goblet Squat','Smith Machine Squat','Bulgarian Split Squat']],['chestpress','Machine Chest Press',3,10,0,120,['Dumbbell Bench Press','Push-ups','Barbell Bench Press']],['row','Seated Cable Row',3,10,0,90,['One-arm Dumbbell Row','Chest-supported Row']],['rdl','Dumbbell Romanian Deadlift',2,10,0,120,['Barbell Romanian Deadlift','Lying Leg Curl']],['lateral','Dumbbell Lateral Raise',2,12,0,60,['Cable Lateral Raise','Machine Lateral Raise']],['plank','Plank',2,40,0,60,['Dead Bug','Pallof Press']]]},
 {id:'B',name:'Full Body B',subtitle:'Build · 7 exercises',items:[['goblet','Goblet Squat',3,10,0,120,['Leg Press','Smith Machine Squat']],['incline','Incline Dumbbell Press',3,10,0,120,['Incline Chest Press Machine','Push-ups']],['pulldown','Lat Pulldown',3,10,0,90,['Assisted Pull-up','Band Pulldown']],['curl','Seated Leg Curl',2,12,0,90,['Lying Leg Curl','Romanian Deadlift']],['shoulders','Machine Shoulder Press',2,10,0,90,['Seated Dumbbell Press','Landmine Press']],['biceps','Dumbbell Biceps Curl',2,12,0,60,['Cable Curl','EZ-bar Curl']],['triceps','Cable Triceps Pushdown',2,12,0,60,['Overhead Dumbbell Extension','Close-grip Push-ups']]]}
];
// An independent quick-reference, never used for calorie or macro calculations.
const DEFAULT_MEAL_GUIDE = [
 {id:'guide-breakfast',group:'Breakfast',label:'Eggs & toast',description:'2 eggs + 1 slice of toast'},
 {id:'guide-carbs',group:'Lunch & Dinner',label:'Carbs',description:'2 rotis or 150 g cooked rice or 150 g cooked pasta'},
 {id:'guide-protein',group:'Lunch & Dinner',label:'Protein foods',description:'170 g meat or 90 g paneer/beans'},
 {id:'guide-veg',group:'Lunch & Dinner',label:'Vegetables',description:'170–200 g sautéed vegetables or sabji'}
];
function mealGuideItems(){
 if(!Array.isArray(state.mealGuideItems))state.mealGuideItems=structuredClone(DEFAULT_MEAL_GUIDE);
 return state.mealGuideItems;
}
const INITIAL = () => ({
 version:1, goals:{calories:2200,protein:150,carbs:250,fat:65,fibre:30,water:2500,steps:8000},
 waterPresets:[150,250,500],waterDefault:250,preferences:{haptics:true,waterSound:true},
 tasks:[{id:'protein',label:'Reach protein target',auto:'protein'},{id:'walk',label:'Reach step goal',auto:'steps'},{id:'water',label:'Reach water goal',auto:'water'},{id:'training',label:'Complete planned workout',auto:'workout'}],
 taskChecks:{}, mealGuideItems:structuredClone(DEFAULT_MEAL_GUIDE), food:[],water:[],activity:[],weights:[],
 measurements:[],
 photos:[],workoutHistory:[],session:null,templates:structuredClone(TEMPLATES),
 lastTab:'home',lastBodyPanel:'measurements',lastNutritionPanel:'diary',dirty:false,lastSync:null
});
let state,tab='home',modal=null,restSheet=false,exerciseOpen=null,foodMeal='Breakfast',bodyPanel='measurements',nutritionPanel='diary',chartPeriod=4,appMode='normal';
let photoUrls=new Map(),currentTimerText=0,restAlertedFor=null,waterCelebration=null,stepRefresh=false,stepRefreshInfo=false;
let taskActionsId=null,taskHoldTimer=null,taskHoldPoint=null,suppressTaskClickUntil=0,swipeGesture=null;
let planActionsId=null,planHoldTimer=null,planHoldPoint=null;
let mealGuideActionsId=null,mealGuideHoldTimer=null,mealGuideHoldPoint=null;
let guideStream=null,guideView='Front',guideDate=today(),compareView='Front';
const renderLater=()=>{render();};
const reducedMotion=()=>window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches===true;
function themeChoice(){return ['light','dark'].includes(state?.preferences?.themeMode)?state.preferences.themeMode:'system';}
function effectiveTheme(){const selected=themeChoice();return selected==='system'?(window.matchMedia?.('(prefers-color-scheme: dark)')?.matches?'dark':'light'):selected;}
function applyTheme(){const mode=effectiveTheme();document.documentElement.dataset.theme=mode;document.documentElement.style.colorScheme=mode;for(const el of document.querySelectorAll('meta[name="theme-color"]')){if(el.media?.includes('dark')&&mode==='dark'||el.media?.includes('light')&&mode==='light'||!el.media){el.content=mode==='dark'?'#081018':'#f4f7f9';}}}

function haptic(kind='tap',force=false){
  // PWAs can only request vibration. Android, the browser and user settings decide whether it is felt.
  if(!force && state?.preferences?.haptics===false)return false;
  if(typeof navigator.vibrate!=='function')return false;
  const patterns={tap:22,check:34,success:[23,38,29],hold:40,warning:[42,55,42],test:[55,50,65]};
  try{return navigator.vibrate(patterns[kind]||patterns.tap)===true;}catch{return false;}
}
function motionChange(change,kind='tab',direction=1){
 // Avoid full-document view-transition snapshots. They repaint image grids and blurred glass
 // on low-powered Android phones, causing stutter. Animate the new content only.
 change();
 if(reducedMotion())return;
 const target=document.querySelector('.main');
 if(!target?.animate)return;
 const isTab=kind==='tab',dx=isTab?(direction<0?-13:13):0;
 // Animate only on the compositor. Large-page opacity fades make charts and cards
 // repaint on some Android devices, which can cause a visible jump.
 for(const running of target.getAnimations())running.cancel();
 target.animate([
  {transform:`translate3d(${dx}px,${isTab?0:10}px,0) scale(${isTab?1:.995})`},
  {transform:'translate3d(0,0,0) scale(1)'}
 ],{duration:isTab?190:240,easing:'cubic-bezier(.2,.78,.24,1)',fill:'none'});
}

function notify(message){const el=$('#toast');el.textContent=message;el.classList.add('show');clearTimeout(notify.timeout);notify.timeout=setTimeout(()=>el.classList.remove('show'),3000);}
async function persist(){state.dirty=true;await put('state',state);}
async function commit(){await persist();render();}
async function addQuickWater(ml){ml=Math.round(ml);if(ml<1)return;playWaterSound();const entry={id:uid(),date:today(),ml};state.water.push(entry);waterCelebration={id:entry.id,ml};haptic('success');await commit();const id=entry.id;setTimeout(()=>{if(waterCelebration?.id===id){waterCelebration=null;if(tab==='home'&&!modal)render();}},5200);}
async function undoCelebrationWater(){if(!waterCelebration)return;const {id}=waterCelebration;state.water=state.water.filter(x=>x.id!==id);waterCelebration=null;await commit();notify('Water entry undone.');}
async function removeRecentWater(){let left=n(state.waterDefault,250)||250,removed=0;for(let i=state.water.length-1;i>=0&&left>0;i--){const entry=state.water[i];if(entry.date!==today())continue;const deduction=Math.min(left,n(entry.ml));entry.ml-=deduction;removed+=deduction;left-=deduction;if(waterCelebration?.id===entry.id)waterCelebration=null;if(entry.ml<=0)state.water.splice(i,1);}if(!removed){notify('No water logged today to subtract.');return;}await commit();notify(`−${num(removed)} ml. Adjusted your water total.`);}

function daily(list,day=today()){return list.filter(x=>x.date===day);}
function nutritionTotals(day=today()){return daily(state.food,day).reduce((a,x)=>{for(const k of ['calories','protein','carbs','fat','fibre'])a[k]+=n(x[k]);return a;},{calories:0,protein:0,carbs:0,fat:0,fibre:0});}
function waterSum(day=today()){return daily(state.water,day).reduce((s,x)=>s+n(x.ml),0);}
function activityToday(day=today()){return state.activity.find(x=>x.date===day)||{steps:0,activeCalories:0};}
function checkboxDone(task){let d=today();if(Object.prototype.hasOwnProperty.call(state.taskChecks?.[d]||{},task.id))return Boolean(state.taskChecks[d][task.id]);if(task.auto==='protein')return nutritionTotals(d).protein >= state.goals.protein;if(task.auto==='steps')return activityToday(d).steps >= state.goals.steps;if(task.auto==='water')return waterSum(d)>=state.goals.water;if(task.auto==='workout')return state.workoutHistory.some(w=>w.date===d);return Boolean(state.taskChecks[d]?.[task.id]);}
function progress(value,max){return `<div class="progress"><div style="width:${Math.min(100,Math.max(0,max?n(value)/n(max)*100:0))}%"></div></div>`;}
function iconButton(icon,action,extra='',title=''){return `<button class="btn ${extra}" data-action="${action}" ${title?`aria-label="${escapeHtml(title)}"`:''}>${svg(icon)}</button>`;}
function heading(title,desc='',action=''){const isDark=effectiveTheme()==='dark';return `<header class="top"><div><div class="eyebrow">RECOMP • YOUR JOURNEY</div><h1 class="page-title">${title}</h1>${desc?`<div class="subhead">${desc}</div>`:''}</div><div class="right-actions">${action}<button type="button" class="btn round theme-trigger" title="Switch to ${isDark?'day':'night'} mode" aria-label="Switch to ${isDark?'light':'dark'} mode" data-action="toggle-theme">${svg(isDark?'sun':'moon')}</button><button class="btn round settings-trigger" title="Open settings" aria-label="Open settings" data-action="settings">${svg('settings')}</button></div></header>`;}
function metric(title,value,goal,unit,iconName,action='',quip=''){
 const logged=value!==null&&value!==undefined&&value!=='';
 const tag=action?'button':'div';
 return `<${tag} class="card metric ${action?'metric-interactive':''} ${iconName==='flame'?'energy-out':''}" ${action?`type="button" data-action="${action}" aria-label="${escapeHtml(title)}: ${logged?num(value):'not recorded'} ${unit}. Tap to ${action==='metric-water'?'log water':action==='refresh-steps'?'refresh steps':'update activity'}."`:''}><div class="metric-top"><span class="muted strong small">${title}</span><span class="metric-icon">${svg(iconName,'sm-icon')}</span></div><div class="big">${logged?num(value):'—'} <span class="small muted">${logged?unit:''}</span></div>${progress(value,goal)}<div class="metric-foot"><span>${quip|| (!logged?'Not recorded yet':goal===null?'Manually tracked':`Goal: ${num(goal)} ${unit}`)}</span><span>${goal?Math.round(value/goal*100)+'%':''}</span></div></${tag}>`;
}
function taskList(){
 if(!state.tasks.length)return `<div class="empty-tasks">A fresh start. Add a daily task to build your routine.</div>`;
 return state.tasks.map(t=>{
   const done=checkboxDone(t);
   const id=escapeHtml(t.id),name=escapeHtml(t.label);
   const managing=taskActionsId===t.id;
   return `<div class="check-task ${done?'is-done':''} ${managing?'task-management-open':''}" data-task-row="${id}" tabindex="0" role="group" aria-label="${name}. Tap the checkbox to complete; press and hold to edit or delete.">
    <label class="task-check-label"><input class="checkbox" type="checkbox" data-task-id="${id}" ${done?'checked':''} aria-label="Mark ${name} as ${done?'not done':'done'}"/><span class="task-text">${name}</span></label>
    ${managing?`<div class="task-row-actions" aria-label="Actions for ${name}"><button type="button" class="task-icon-btn" data-action="edit-task" data-id="${id}" aria-label="Edit ${name}" title="Edit task">${svg('edit','tiny-icon')}</button><button type="button" class="task-icon-btn delete-task" data-action="delete-task" data-id="${id}" aria-label="Delete ${name}" title="Delete task">${svg('trash','tiny-icon')}</button></div>`:''}
   </div>`;
 }).join('');
}
function homeTasksSection(checked){return `<section class="dashboard-tasks" aria-label="Daily tasks">
  <div class="section-head"><div><h2 class="section-title">Daily tasks</h2><div class="muted small">Tap to tick · hold to edit.</div></div><div class="row"><span class="pill">${checked}/${state.tasks.length} done</span><button type="button" class="btn task-add-btn" data-action="add-task">${svg('plus','tiny-icon')} Add</button></div></div>
  <div class="card daily-tasks">${taskList()}</div>
 </section>`;}
function homeView(){const nutr=nutritionTotals(),act=activityToday(),w=waterSum(),checked=state.tasks.filter(checkboxDone).length;const waterAmount=n(state.waterDefault,250)||250;return `
${heading('Make today count.',new Date().toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long'}))}
<div class="dashboard-intro"><span class="orbit-dot"></span><span class="mini-kicker">Your daily pulse</span><span>Consistency looks good on you. <span class="subtle-star">✳</span></span></div>
<section class="summary-hero"><div class="row space"><div><span class="eyebrow">FUEL IN · CALORIES EATEN</span><div class="hero-number">${num(nutr.calories)} <span class="muted hero-goal">/ ${num(state.goals.calories)} kcal</span></div></div><span class="metric-icon">${svg('food')}</span></div><div style="margin-top:18px">${progress(nutr.calories,state.goals.calories)}</div><div class="row space small muted hero-foot" style="margin-top:10px"><span>${num(Math.max(0,state.goals.calories-nutr.calories))} kcal to go</span><span>Move more. Eat smart.</span></div></section>
<div class="metric-grid">${metric('Protein',nutr.protein,state.goals.protein,'g','protein','','Feed the gains')}${metric('Steps',act.steps,state.goals.steps,'','walk','refresh-steps',stepRefresh?'Checking…':'Tap to refresh')}${metric('Calories burnt',act.activeCalories,null,'kcal','flame','metric-active','Come on, burn it ↗')}${metric('Water',w,state.goals.water,'ml','water','metric-water',`Tap for +${num(waterAmount)} ml`)}</div>
${stepRefreshInfo?`<div class="connection-note">${svg('info','tiny-icon')} <span><b>Watch sync is coming.</b> Steps currently reflect your last manual entry.</span><button class="btn ghost" data-action="activity">Edit</button></div>`:''}
${homeTasksSection(checked)}
<div class="home-tools"><div><div class="section-head"><h2 class="section-title">Shortcuts, not detours.</h2></div><div class="card quick-panel"><div class="quick-grid">${[['plus','Food','add-food'],['water','Water','metric-water'],['dumbbell','Workout','start-workout'],['chart','Weight','add-weight']].map(([ic,label,action])=>`<button class="quick-btn" data-action="${action}"><span>${svg(ic)}</span><span>${label}</span></button>`).join('')}</div></div></div>
<div><div class="section-head"><div><h2 class="section-title">Hydration station</h2><div class="muted small">Sip. Repeat. Celebrate.</div></div><span class="small muted">${num(w)} / ${num(state.goals.water)} ml</span></div><div class="card water-panel"><button type="button" class="btn ghost water-settings water-settings-top" data-action="water-config" aria-label="Configure water amount and goal" title="Configure water">${svg('settings')}</button><div class="water-inline">${svg('water','big-icon')}<div><b>${num(w)} <span class="muted small">ml</span></b><p class="muted small">Your body says cheers.</p></div></div><div class="water-stepper"><button class="water-step-button" data-action="water-minus" title="Subtract configured amount" aria-label="Subtract configured water amount">−</button><span class="water-step-amount">${num(waterAmount)} <span class="muted">ml</span><small>per tap</small></span><button class="water-step-button plus" data-action="metric-water" title="Add water" aria-label="Add ${waterAmount} millilitres of water">+</button></div></div></div></div>
${state.session?`<div class="section-head"><h2 class="section-title">Still going strong?</h2></div><div class="card row space"><div><b>${escapeHtml(state.session.name)}</b><div class="small muted">Your session is saved and waiting for you.</div></div><button class="btn primary" data-action="resume-workout">Resume</button></div>`:''}`;}
function mealGuideView(){
 const items=mealGuideItems();
 const renderGroup=(group)=>{
  const list=items.filter(item=>item.group===group);
  return list.map(item=>{
   const open=mealGuideActionsId===item.id;
   // Presentation labels are short, but saved guide entries are never rewritten.
   const visibleLabel=item.id==='guide-breakfast'&&['Eggs & toast','Breakfast'].includes(item.label)?'Breakfast':
       item.id==='guide-protein'&&item.label==='Protein foods'?'Protein':
       item.id==='guide-veg'&&item.label==='Vegetables'?'Fibre':item.label;
   return `<div class="meal-guide-entry meal-guide-option ${open?'meal-guide-edit-open':''}" data-guide-item="${escapeHtml(item.id)}" tabindex="0" role="group" aria-label="${escapeHtml(visibleLabel)}. Press and hold to edit or delete.">
     <div class="meal-guide-entry-copy"><span class="meal-guide-type">${escapeHtml(visibleLabel)}</span><p>${escapeHtml(item.description)}</p></div>
     ${open?`<div class="meal-guide-entry-actions"><button type="button" class="btn guide-item-button" data-action="edit-guide-item" data-id="${escapeHtml(item.id)}" aria-label="Edit ${escapeHtml(visibleLabel)}">${svg('edit','tiny-icon')} Edit</button><button type="button" class="btn danger guide-item-button" data-action="delete-guide-item" data-id="${escapeHtml(item.id)}" aria-label="Delete ${escapeHtml(visibleLabel)}">${svg('trash','tiny-icon')} Delete</button></div>`:''}
    </div>`;
  }).join('') || `<p class="meal-guide-no-items">No options yet. Tap Add to create one.</p>`;
 };
 return `<section class="meal-guide meal-guide-compact" aria-label="Your Everyday Meal">
  <div class="meal-guide-heading"><h3>Your Everyday Meal</h3><button type="button" class="btn meal-guide-add" data-action="add-guide-item" aria-label="Add meal guide option">${svg('plus','tiny-icon')} Add</button></div>
  <div class="meal-guide-compact-list" aria-label="Breakfast options">${renderGroup('Breakfast')}</div>
  <div class="meal-guide-compact-subhead">Lunch / Dinner</div>
  <div class="meal-guide-compact-list" aria-label="Lunch and dinner options">${renderGroup('Lunch & Dinner')}</div>
  <p class="meal-guide-compact-note">Portion guide · Nothing logged automatically · Hold an entry to edit</p>
 </section>`;
}
function nutritionView(){const t=nutritionTotals(),entries=daily(state.food);let bar= ['protein','carbs','fat','fibre'].map(k=>`<div class="row space small" style="margin-bottom:6px"><span class="strong">${k[0].toUpperCase()+k.slice(1)}</span><span>${Math.round(t[k])} / ${state.goals[k]} g</span></div>${progress(t[k],state.goals[k])}`).join('<div style="height:11px"></div>');return `${heading('Nutrition','Keep your food logging simple and consistent.')}<div class="nutrition-guide-first">${mealGuideView()}</div><div class="summary-hero nutrition-intake-card"><div class="eyebrow">TODAY'S INTAKE</div><div class="hero-number">${num(t.calories)} <span class="muted small">/ ${num(state.goals.calories)} kcal</span></div><div style="margin:14px 0">${progress(t.calories,state.goals.calories)}</div><div class="small muted">Protein, carbohydrates, fat and fibre goals</div><div style="margin-top:15px">${bar}</div></div><div class="tab-row"><button class="tab ${nutritionPanel==='diary'?'active':''}" data-action="nutrition-panel" data-panel="diary">Food diary</button><button class="tab ${nutritionPanel==='favourites'?'active':''}" data-action="nutrition-panel" data-panel="favourites">Quick add</button></div>${nutritionPanel==='diary'?['Breakfast','Lunch','Dinner','Snack'].map(meal=>{let foods=entries.filter(x=>x.meal===meal);return `<div class="card" style="margin-bottom:12px"><div class="row space"><h3 class="section-title">${meal}</h3><button class="btn ghost" data-action="add-food" data-meal="${meal}">${svg('plus','tiny-icon')} Add</button></div>${foods.length?foods.map(f=>`<div class="list-entry"><div class="list-icon">${svg('food')}</div><div style="flex:1"><div class="strong">${escapeHtml(f.name)}</div><div class="small muted">${num(f.protein)} g protein · ${num(f.carbs)} g carbs</div></div><div style="text-align:right"><div class="log-amount">${num(f.calories)} kcal</div><button class="btn ghost" data-action="delete-food" data-id="${f.id}" title="Delete food">${svg('trash','tiny-icon')}</button></div></div>`).join(''):`<div class="hint" style="padding:16px 0">No foods logged yet.</div>`}</div>`}).join(''):`<div class="card"><h3 style="margin-top:0">Recent foods</h3>${[...state.food].reverse().filter((f,i,arr)=>arr.findIndex(x=>x.name===f.name)===i).slice(0,15).map(f=>`<div class="list-entry"><div style="flex:1"><b>${escapeHtml(f.name)}</b><div class="hint">${f.calories} kcal · ${f.protein} g protein</div></div><button class="btn" data-action="repeat-food" data-id="${f.id}">Add today</button></div>`).join('')||'<p class="muted small">Log a meal to make it available here.</p>'}</div>`}<div class="outline-banner" style="margin-top:15px">${svg('info','sm-icon')} <b>Coming in later phases:</b> AI food photographs, label scanning, recipes, meal planning and reminder notifications. Your diary works fully offline today.</div>`;}
const PHOTO_VIEWS=['Front','Left side','Right side','Back'];
function photoThumb(p){
 const url=photoUrls.get(p.id),alt=escapeHtml(p.view+' progress photograph from '+dateDisplay(p.date));
 return `<div class="album-photo"><div class="album-frame">${url?`<img loading="lazy" src="${url}" alt="${alt}"/>`:`<div class="photo-empty">${svg('camera')}</div>`}</div><div class="album-caption"><span>${escapeHtml(p.view)}</span><button class="album-delete" data-action="delete-photo" data-id="${p.id}" aria-label="Delete ${alt}" title="Delete photo">${svg('trash','tiny-icon')}</button></div></div>`;
}
function photosView(){
 const groups=new Map();
 for(const p of [...state.photos].sort((a,b)=>b.date.localeCompare(a.date))){if(!groups.has(p.date))groups.set(p.date,[]);groups.get(p.date).push(p);}
 const pairs=state.photos.filter(p=>p.view===compareView).sort((a,b)=>a.date.localeCompare(b.date));
 const choices=pairs.map(p=>`<option value="${p.id}">${dateDisplay(p.date)}</option>`).join('');
 return `<section class="photos-page">
 <div class="photo-toolbar"><div><h2 class="section-title">Your photo timeline</h2><p class="hint">A consistent pose tells a clearer story.</p></div><button class="btn primary" data-action="open-photo-guide">${svg('camera','tiny-icon')} Guided camera</button></div>
 <div class="photo-toolbar secondary"><span class="muted small">Every two weeks · Front, sides, back</span><button class="btn" data-action="add-photo">${svg('plus','tiny-icon')} Upload photos</button></div>
 <p class="hint">Photos stay on your device unless you deliberately use your private cloud backup. The guide overlays your earlier image, not an AI-altered body.</p>
 ${groups.size?[...groups].map(([date,photos])=>`<article class="photo-album card"><div class="photo-album-head"><div class="eyebrow">PROGRESS LOG</div><div class="album-date">${dateDisplay(date)}</div><span class="muted micro">${photos.length} view${photos.length>1?'s':''}</span></div><div class="album-grid">${photos.map(photoThumb).join('')}</div></article>`).join(''):'<div class="photo-empty-state"><span class="camera-emoji">◌</span><strong>The first frame is yours.</strong><p class="muted small">Start with front, side and back. Return in two weeks for a fair comparison.</p></div>'}
 <section class="photo-compare-card card"><div class="row space"><div><h2 class="section-title">Compare the changes</h2><p class="hint">Same angle, same framing, different date.</p></div></div>
 <div class="compare-controls"><label class="field"><span class="label">View</span><select id="compare-view" class="input">${PHOTO_VIEWS.map(x=>`<option value="${x}" ${x===compareView?'selected':''}>${x}</option>`).join('')}</select></label><label class="field"><span class="label">Before</span><select id="compare-first" class="input" ${pairs.length<2?'disabled':''}>${choices}</select></label><label class="field"><span class="label">After</span><select id="compare-second" class="input" ${pairs.length<2?'disabled':''}>${choices}</select></label></div>
 <div id="compare-result" class="compare-mount"></div><p class="hint">Images are fitted to equal frames. For true like-for-like positioning, use the camera guide.</p></section></section>`;
}
function latestReferencePhoto(view){return [...state.photos].filter(p=>p.view===view&&photoUrls.has(p.id)).sort((a,b)=>b.date.localeCompare(a.date))[0]||null;}
function updateGuideReference(){const ghost=$('#guide-ghost'),note=$('#guide-reference-note');if(!ghost)return;const ref=latestReferencePhoto(guideView);ghost.hidden=!ref;ghost.src=ref?photoUrls.get(ref.id):'';if(note)note.textContent=ref?`Overlay: your ${dateDisplay(ref.date)} ${guideView.toLowerCase()} photo`:'No previous photo for this angle, use the framing guides.';}
async function stopGuideCamera(){if(guideStream){guideStream.getTracks().forEach(track=>track.stop());guideStream=null;}}
async function startGuideCamera(){
 if(modal?.type!=='photo-guide')return;
 const status=$('#guide-status'),video=$('#guide-video');if(!video)return;
 updateGuideReference();
 if(!navigator.mediaDevices?.getUserMedia){if(status)status.textContent='Camera access is not available here. Use Upload photo instead.';return;}
 if(status)status.textContent='Opening your camera…';
 try{
  await stopGuideCamera();
  const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:1706}},audio:false});
  if(modal?.type!=='photo-guide'){stream.getTracks().forEach(t=>t.stop());return;}
  guideStream=stream;video.srcObject=stream;await video.play();
  if(status)status.textContent='Match your shoulders, feet and distance to the ghost image.';
 }catch(err){if(status)status.textContent='Camera unavailable or permission denied. You can still upload a photograph.';console.warn('Camera guide:',err);}
}
async function savePhotoBlob(blob,date,view){
 const id=uid();await putPhoto(id,blob);photoUrls.set(id,URL.createObjectURL(blob));
 state.photos.push({id,date,view,capturedAt:new Date().toISOString(),cloudPath:null});
 bodyPanel='photos';state.lastBodyPanel='photos';modal=null;await persist();render();notify('Photo saved privately on this device');
}
async function captureGuidePhoto(){
 const video=$('#guide-video');if(!guideStream||!video?.videoWidth)throw Error('Camera not ready. Please wait or upload instead.');
 guideDate=$('#guide-date')?.value||today();guideView=$('#guide-view')?.value||'Front';
 const canvas=document.createElement('canvas');canvas.width=900;canvas.height=1200;
 const w=video.videoWidth,h=video.videoHeight,ratio=Math.max(900/w,1200/h);
 const ww=w*ratio,hh=h*ratio;canvas.getContext('2d').drawImage(video,(900-ww)/2,(1200-hh)/2,ww,hh);
 const blob=await new Promise((resolve,reject)=>canvas.toBlob(x=>x?resolve(x):reject(Error('Camera photo failed')),'image/jpeg',.85));
 await stopGuideCamera();await savePhotoBlob(blob,guideDate,guideView);haptic('success');
}
function photoGuideView(){
 return `<div class="modal-shade" data-action="close-modal"><div class="modal photo-guide-modal"><div class="modal-title"><div><div class="eyebrow">FRAME IT RIGHT</div><h2>Guided progress photo</h2></div><button class="btn round" data-action="close-modal" aria-label="Close camera guide">${svg('x')}</button></div>
 <div class="field-row"><label class="field"><span class="label">View</span><select class="input" id="guide-view">${PHOTO_VIEWS.map(v=>`<option ${v===guideView?'selected':''}>${v}</option>`).join('')}</select></label><label class="field"><span class="label">Date</span><input id="guide-date" type="date" class="input" value="${guideDate}"/></label></div>
 <div class="camera-stage"><video id="guide-video" autoplay playsinline muted></video><img id="guide-ghost" class="camera-ghost" alt="Your previous pose alignment guide" hidden/><div class="camera-guidelines" aria-hidden="true"><span></span><span></span><span></span></div><div class="camera-foot-mark" aria-hidden="true">Feet on the lower line · camera at a consistent height</div></div>
 <p id="guide-reference-note" class="hint"></p><p class="hint" id="guide-status">Checking camera access…</p>
 <div class="row wrap"><button class="btn primary" data-action="take-guided-photo">${svg('camera','tiny-icon')} Capture</button><button class="btn" data-action="photo-upload-mode">Choose existing image</button></div>
 <p class="hint">Camera preview stays on this device. Your older photo is an on-screen alignment guide and is not added to the captured image.</p></div></div>`;
}
function updateCompare(){
 const where=$('#compare-result');if(!where)return;
 const photos=[...state.photos].filter(p=>p.view===compareView).sort((a,b)=>a.date.localeCompare(b.date));
 const before=$('#compare-first'),after=$('#compare-second');if(!before||!after)return;
 if(photos.length<2){where.innerHTML='<p class="muted small">Add two photos from different dates with the same view to compare them.</p>';return;}
 let a=state.photos.find(p=>p.id===before.value)||photos[0],b=state.photos.find(p=>p.id===after.value)||photos[photos.length-1];
 if(a.id===b.id){a=photos[0];b=photos[photos.length-1];}
 before.value=a.id;after.value=b.id;
 const u1=photoUrls.get(a.id),u2=photoUrls.get(b.id);
 if(!u1||!u2){where.innerHTML='<p class="muted small">One of these photos is unavailable offline.</p>';return;}
 where.innerHTML=`<div class="compare-head"><span>${dateDisplay(a.date)}</span><span>${dateDisplay(b.date)}</span></div><div class="photo-compare-stage" aria-label="Before and after photo slider"><img class="compare-photo" src="${u2}" alt="After photograph"/><div id="compare-before-layer" class="compare-before-layer"><img class="compare-photo" src="${u1}" alt="Before photograph"/></div><div class="compare-handle" id="compare-handle"></div></div><label class="label" for="compare-range">Slide to reveal your progress</label><input id="compare-range" class="input-compare-range" type="range" min="0" max="100" value="50" aria-label="Reveal before or after photo"/>`;
}
function bodyView(){const lastWeight=[...state.weights].sort((a,b)=>a.date.localeCompare(b.date)).at(-1);const baseline=state.measurements.at(-1);let weights=[...state.weights].sort((a,b)=>a.date.localeCompare(b.date)).slice(-12);const minW=weights.length?Math.min(...weights.map(w=>w.kg))-1:0;const maxW=weights.length?Math.max(...weights.map(w=>w.kg))+1:1;return `${heading('Body tracker','See the changes beyond the scales.')}<div class="metric-grid">${metric('Latest weight',lastWeight?.kg ?? null,null,'kg','chart')}${metric('Belly-button waist',baseline?.belly ?? null,null,'in','chart')}</div><div class="tab-row" style="margin-top:21px"><button class="tab ${bodyPanel==='measurements'?'active':''}" data-action="body-panel" data-panel="measurements">Measurements</button><button class="tab ${bodyPanel==='photos'?'active':''}" data-action="body-panel" data-panel="photos">Photos</button><button class="tab ${bodyPanel==='weight'?'active':''}" data-action="body-panel" data-panel="weight">Weight history</button></div>${bodyPanel==='measurements'?`<div class="card"><div class="row space"><div><h2 class="section-title">Latest measurements</h2><div class="small muted">${baseline?dateDisplay(baseline.date):'No measurements yet'}</div></div><button class="btn" data-action="add-measurement">${svg('plus','tiny-icon')} Update</button></div><div class="divider"></div>${[['chest','Chest'],['belly','Belly button'],['below','Below belly button'],['shoulders','Shoulders'],['neck','Neck'],['rightBicep','Right bicep (relaxed)'],['leftBicep','Left bicep (relaxed)'],['rightThigh','Right thigh'],['leftThigh','Left thigh'],['rightCalf','Right calf'],['leftCalf','Left calf'],['wrist','Wrist']].map(([k,label])=>`<div class="split-line" style="padding:8px 0"><span class="muted">${label}</span><b>${baseline?.[k]!=='' && baseline?.[k]!=null?baseline[k]+' in':'Not recorded'}</b></div>`).join('')}</div>`:bodyPanel==='weight'?`<div class="card"><div class="row space"><h2 class="section-title">Weekly weight</h2><button class="btn" data-action="add-weight">Add entry</button></div>${weights.length?`<div class="chart-bars" style="margin:15px 0">${weights.map(w=>`<div class="chart-bar" title="${escapeHtml(w.date)}: ${w.kg} kg" style="height:${Math.max(8,(w.kg-minW)/(maxW-minW)*100)}%"></div>`).join('')}</div>`:''}${weights.map(w=>`<div class="list-entry"><span style="flex:1">${dateDisplay(w.date)}</span><b>${w.kg} kg</b><button class="btn ghost" data-action="delete-weight" data-id="${w.id}">${svg('trash','tiny-icon')}</button></div>`).join('')||'<p class="muted">Your first weekly weigh-in goes here.</p>'}</div>`:photosView()}`;}
function workoutView(){
 const activeSession=state.session;
 if(activeSession&&!activeSession.minimized)return activeWorkoutView();
 const recent=[...state.workoutHistory].reverse().slice(0,5);
 return `${heading('Workouts','Build strength, one session at a time.')}
 ${activeSession?`<div class="card row space active-session-notice"><div><b>${escapeHtml(activeSession.name)} is in progress</b><div class="small muted">${elapsed(activeSession.startedAt)} elapsed · Another plan requires your choice.</div></div><button class="btn primary" data-action="resume-workout">Continue</button></div>`:''}
 <div class="section-head"><div><h2 class="section-title">Your workout plans</h2><span class="muted small">Build, personalise and repeat. Hold a plan to edit.</span></div><button class="btn" data-action="create-template">${svg('plus','tiny-icon')} New plan</button></div>
 ${state.templates.map((t,i)=>`<div class="card workout-template-card ${planActionsId===t.id?'plan-actions-open':''}" data-plan-card="${escapeHtml(t.id)}" tabindex="0" role="group" aria-label="${escapeHtml(t.name)}. Long press to reveal edit plan button, or use your keyboard context menu."><div class="row space"><div><div class="eyebrow">PLAN ${i+1}</div><h2 class="section-title" style="margin-top:4px">${escapeHtml(t.name)}</h2><div class="small muted">${t.items.length} exercise${t.items.length===1?'':'s'} · Customisable</div></div><div class="plan-card-tools">${planActionsId===t.id?`<button type="button" class="plan-edit-icon" data-action="edit-template" data-id="${escapeHtml(t.id)}" title="Edit ${escapeHtml(t.name)}" aria-label="Edit ${escapeHtml(t.name)}">${svg('edit','tiny-icon')}</button>`:''}<span class="list-icon">${svg('dumbbell')}</span></div></div><div class="template-exercise-summary">${t.items.slice(0,4).map(e=>escapeHtml(e[1])).join(' · ')||'Start with your first exercise'}${t.items.length>4?' …':''}</div><div class="template-actions"><button class="btn primary" data-action="begin-template" data-id="${escapeHtml(t.id)}" ${!t.items.length?'disabled title="Add an exercise first"':''}>${svg('play','tiny-icon')} ${activeSession?.templateId===t.id?'Continue / manage':'Start workout'}</button></div></div>`).join('')}
 <div class="section-head"><h2 class="section-title">Recent sessions</h2></div><div class="card">${recent.length?recent.map(w=>`<div class="list-entry"><div class="list-icon">${svg('check')}</div><div style="flex:1"><b>${escapeHtml(w.name)}</b><div class="small muted">${dateDisplay(w.date)} · ${w.sets} working sets</div></div><span class="strong">${w.durationMin} min</span></div>`).join(''):'<p class="muted small">Your completed workout history will appear here.</p>'}</div>`;
}

function elapsed(ts){const secs=Math.max(0,Math.floor((Date.now()-ts)/1000));return `${Math.floor(secs/60)}:${String(secs%60).padStart(2,'0')}`;}
function restLeft(){let r=state.session?.rest;return r?(r.paused?Math.ceil(r.remainingMs/1000):Math.max(0,Math.ceil((r.endsAt-Date.now())/1000))):0;}
function clock(seconds){return `${String(Math.floor(Math.max(0,seconds)/60)).padStart(2,'0')}:${String(Math.max(0,seconds)%60).padStart(2,'0')}`;}
function activeWorkoutView(){const s=state.session;if(!s) return workoutView();const total=s.exercises.reduce((acc,e)=>acc+e.sets.length,0),completed=s.exercises.reduce((acc,e)=>acc+e.sets.filter(x=>x.done).length,0);return `<div class="row space" style="margin-bottom:16px"><button class="btn" data-action="minimise-workout">${svg('minimise','tiny-icon')} Minimise</button><span class="pill"><span class="status-dot" style="display:inline-block"></span> Session saved</span><button class="btn danger" data-action="discard-workout">Discard</button></div><div class="top"><div><div class="eyebrow">FOCUSED WORKOUT</div><h1 class="page-title">${escapeHtml(s.name)}</h1><div class="subhead">${svg('timer','tiny-icon')} <span class="elapsed">${elapsed(s.startedAt)}</span> &nbsp; · &nbsp; ${completed}/${total} sets complete</div></div><div class="metric-icon">${svg('dumbbell')}</div></div><div style="margin:0 0 17px">${progress(completed,total)}</div>${s.rest?`<button class="rest-status-banner" data-action="open-rest" aria-label="Open the running rest timer">${svg('timer')} <span><b>Rest in progress</b><small>Tap to reopen your countdown</small></span><strong class="inline-timer">${clock(restLeft())}</strong> ${svg('arrow','tiny-icon')}</button>`:''}${s.exercises.map((e,i)=>{const open=exerciseOpen===i;const done=e.sets.every(x=>x.done);return `<div class="workout-card ${done?'completed':''}"><button class="workout-head" data-action="expand-exercise" data-index="${i}"><span class="workout-num">${done?svg('check'):i+1}</span><span style="flex:1"><b>${escapeHtml(e.name)}</b><span class="small muted" style="display:block">${e.sets.length} sets · ${e.sets.filter(x=>x.done).length} complete </span></span>${svg('chevron','sm-icon')}</button>${open?`<div class="workout-inner"><div class="divider" style="margin-top:0"></div><div class="set-grid set-head"><span>Set</span><span>kg</span><span>Reps</span><span>Done</span></div>${e.sets.map((set,j)=>`<div class="set-grid"><b style="text-align:center">${j+1}</b><input class="input set-input" aria-label="Weight for set ${j+1}" data-setfield="kg" data-ex="${i}" data-set="${j}" type="number" inputmode="decimal" min="0" step="0.5" value="${escapeHtml(set.kg)}"/><input class="input set-input" aria-label="Repetitions for set ${j+1}" data-setfield="reps" data-ex="${i}" data-set="${j}" type="number" inputmode="numeric" min="0" step="1" value="${escapeHtml(set.reps)}"/><button class="set-done ${set.done?'done':''}" data-action="tick-set" data-ex="${i}" data-set="${j}" aria-label="${set.done?'Unmark':'Complete'} set ${j+1}">${svg('check','sm-icon')}</button></div>`).join('')}<div class="workout-footer"><span class="small muted">Rest ${clock(e.restSeconds)}</span><span class="row"><button class="btn ghost" data-action="rest-setting" data-index="${i}">${svg('timer','tiny-icon')} Edit</button><button class="btn ghost" data-action="add-set" data-index="${i}">${svg('plus','tiny-icon')} Set</button></span></div><div class="exercise-actions"><button class="btn" data-action="swap-exercise" data-index="${i}">${svg('swap','tiny-icon')} Swap</button><button class="btn" data-action="exercise-notes" data-index="${i}">${svg('edit','tiny-icon')} Notes</button><button class="btn" data-action="exercise-video" data-index="${i}">${svg('play','tiny-icon')} Demonstration</button><button class="btn danger" data-action="remove-session-exercise" data-index="${i}">${svg('trash','tiny-icon')} Remove</button></div>${e.notes?`<p class="hint">Note: ${escapeHtml(e.notes)}</p>`:''}</div>`:''}</div>`}).join('')}<button class="btn block add-current-exercise" data-action="add-session-exercise">${svg('plus','tiny-icon')} Add exercise to this workout</button><div class="card"><div class="row space"><div><b>Ready to finish?</b><div class="small muted">Completed sets will be saved to your workout history.</div></div><button class="btn primary" data-action="finish-workout">Finish workout</button></div></div>`;}
function settingsView(){const cfg=cloud.getConfig(),ses=cloud.getSession();return `${heading('Settings','Your goals, account and data controls.')}<div class="card"><h2 class="section-title">Daily targets</h2><p class="small muted">Change any target without losing past entries.</p><form id="settings-goals"><div class="field-row">${[['calories','Calories (kcal)'],['protein','Protein (g)'],['carbs','Carbohydrates (g)'],['fat','Fat (g)'],['fibre','Fibre (g)'],['water','Water (ml)'],['steps','Steps']].map(([k,label])=>`<div class="field"><label class="label" for="goal-${k}">${label}</label><input class="input" id="goal-${k}" name="${k}" type="number" min="0" value="${escapeHtml(state.goals[k])}"/></div>`).join('')}</div><button class="btn primary" type="submit">Save goals</button></form></div>
<div class="section-head"><div><h2 class="section-title">Daily tasks</h2><div class="muted small">Build a routine that belongs to you.</div></div><button class="btn" data-action="add-task">${svg('plus','tiny-icon')} Add task</button></div><div class="card task-manager">${state.tasks.map(t=>`<div class="task-manage-row"><span class="task-manage-label">${escapeHtml(t.label)}${t.auto?'<small>Auto-linked to your logs, but you can tick manually</small>':'<small>Manually completed from the dashboard</small>'}</span>${t.auto?'<span class="pill">AUTO</span>':''}<button class="btn ghost" data-action="edit-task" data-id="${escapeHtml(t.id)}" aria-label="Edit ${escapeHtml(t.label)}">${svg('edit','tiny-icon')}</button><button class="btn ghost danger" data-action="delete-task" data-id="${escapeHtml(t.id)}" aria-label="Delete ${escapeHtml(t.label)}">${svg('trash','tiny-icon')}</button></div>`).join('')}</div>
<div class="section-head"><h2 class="section-title">Galaxy Watch and activity</h2></div><div class="card"><p class="small muted">Health Connect is planned for the native Android integration phase. In this version, enter values manually on your dashboard.</p><button class="btn" data-action="activity">${svg('pencil','tiny-icon')} Update steps and active calories</button></div>
<div class="section-head"><h2 class="section-title">Cloud backup · Google Sign-In</h2></div><div class="card"><div class="row space"><span class="strong">${ses?`Signed in as ${escapeHtml(ses.user?.email||'Google user')}`:'Not signed in'}</span><span class="pill">${state.lastSync?'Last saved '+dateDisplay(state.lastSync.slice(0,10)):'Device-first'}</span></div><p class="small muted">${ses?'You can back up your data and restore it on another device. Automatic uploads can be enabled after your first manual backup.':'To enable private cloud sync, create your own Supabase project and configure Google OAuth using the provided SQL and setup guide.'}</p>${cfg?`<p class="hint">Project: ${escapeHtml(new URL(cfg.url).host)}</p>`:''}<div class="row" style="flex-wrap:wrap"><button class="btn" data-action="configure-cloud">${svg('settings','tiny-icon')} Configure</button>${ses?`<button class="btn" data-action="cloud-upload">Back up now</button><button class="btn" data-action="cloud-download">Restore</button><button class="btn ghost" data-action="cloud-logout">Sign out</button>`:`<button class="btn primary" data-action="google-login">Google Sign-In</button>`}</div>${ses?`<label class="check-task"><input type="checkbox" class="checkbox" id="auto-cloud-sync" ${localStorage.getItem('recomp-auto-sync')==='yes'?'checked':''}/> Automatically back up changes after initial sync</label>`:''}</div>
<div class="section-head"><h2 class="section-title">Appearance</h2></div><div class="card"><label class="label" for="appearance-mode">Theme</label><select class="input" id="appearance-mode" aria-label="Theme"><option value="system" ${themeChoice()==='system'?'selected':''}>Follow phone settings</option><option value="light" ${themeChoice()==='light'?'selected':''}>Day · Light</option><option value="dark" ${themeChoice()==='dark'?'selected':''}>Night · Dark</option></select><p class="small muted" style="margin-bottom:0">Use the sun and moon beside Settings to switch instantly.</p></div>
<div class="section-head"><h2 class="section-title">Feel and sound</h2></div><div class="card stack"><p class="small muted" style="margin:0">A tiny bit of feedback, just where it matters. Sound plays through your phone’s media volume. Vibration depends on Android and browser support.</p><label class="check-task"><input class="checkbox" type="checkbox" id="enable-haptics" ${state.preferences?.haptics===false?'':'checked'}/> Gentle haptics</label><label class="check-task"><input class="checkbox" type="checkbox" id="enable-water-sound" ${state.preferences?.waterSound===false?'':'checked'}/> Water sound effects</label><div class="row feel-test-actions"><button class="btn" data-action="test-haptics">${svg('check','tiny-icon')} Test haptics</button><button class="btn" data-action="test-water-sound">${svg('volume','tiny-icon')} Test water sound</button></div></div>
<div class="section-head"><h2 class="section-title">Notifications</h2></div><div class="card"><p class="small muted">Preferred rest alert: chime + vibration, normal priority. This web prototype plays an alert while the app is running. Locked-screen alerts need native Android testing and implementation.</p><button class="btn" data-action="test-chime">${svg('volume','tiny-icon')} Test chime</button> <button class="btn" data-action="notification-permission">${svg('bell','tiny-icon')} Allow notifications</button></div>
<div class="section-head"><h2 class="section-title">Privacy and backups</h2></div><div class="card stack"><p class="small muted" style="margin:0">Your personal records are saved locally in IndexedDB. Cloud sync is opt-in and uses your project. Progress photos are not sent to AI services.</p><button class="btn block" data-action="export-backup">${svg('download','tiny-icon')} Export full backup (including photos)</button><button class="btn block" data-action="import-backup">${svg('refresh','tiny-icon')} Import backup</button><input type="file" id="import-file" accept="application/json" hidden/><p class="hint">Keep the exported file private. It contains sensitive fitness details and photographs if you've added them.</p></div>`;}
function restOverlay(){if(!restSheet||!state.session?.rest)return '';const r=state.session.rest;return `<div class="sheet-backdrop" data-action="close-rest"></div><section class="timer-sheet" role="dialog" aria-label="Rest timer"><div class="sheet-handle"></div><div class="row space"><h2 class="section-title">Rest time</h2><button class="btn ghost" data-action="close-rest">${svg('x')}</button></div><div class="timer-number" id="main-timer">${clock(restLeft())}</div><p class="muted small" style="text-align:center;margin-top:-8px">${r.paused?'Timer paused':'Breathe, recover and get ready for your next set'}</p><div class="timer-actions"><button class="btn" data-action="timer-minus">−15 sec</button><button class="btn" data-action="timer-pause">${svg(r.paused?'play':'pause','tiny-icon')} ${r.paused?'Resume':'Pause'}</button><button class="btn" data-action="timer-plus">+15 sec</button></div><button class="btn block" style="margin-top:15px" data-action="timer-skip">Skip rest</button><p class="hint" style="text-align:center">Countdown is saved if you minimise or reopen the app.</p></section>`;}
function modalField(key,label,value='',type='text',other=''){return `<div class="field"><label for="modal-${key}" class="label">${label}</label><input class="input" id="modal-${key}" name="${key}" type="${type}" ${other} value="${escapeHtml(value)}"/></div>`;}
function modalShell(title,content,formName='',button='Save'){return `<div class="modal-shade" data-action="close-modal"><div class="modal" role="dialog" aria-label="${escapeHtml(title)}"><div class="modal-title"><h2 class="section-title">${title}</h2><button class="btn round" data-action="close-modal" aria-label="Close">${svg('x')}</button></div>${formName?`<form id="${formName}">${content}<button class="btn primary block" type="submit">${button}</button></form>`:content}</div></div>`;}
function templateById(id){return state.templates.find(t=>t.id===id);}
function templateEditorView(t){
 const entries=t.items.map((entry,i)=>`<div class="template-editor-row"><div class="editor-exercise-num">${i+1}</div><div class="template-editor-info"><b>${escapeHtml(entry[1])}</b><span class="muted small">${entry[2]} sets · ${entry[3]} reps · ${entry[5]} sec rest</span></div><button type="button" class="btn ghost" data-action="edit-template-exercise" data-id="${escapeHtml(t.id)}" data-index="${i}" aria-label="Edit ${escapeHtml(entry[1])}">${svg('edit','tiny-icon')}</button><button type="button" class="btn ghost danger" data-action="delete-template-exercise" data-id="${escapeHtml(t.id)}" data-index="${i}" aria-label="Remove ${escapeHtml(entry[1])}">${svg('trash','tiny-icon')}</button></div>`).join('');
 return `<p class="small muted" style="margin:0 0 15px">Changes to plans apply to future workouts. Your active session and history won't change.</p>
 <div class="template-edit-tools"><button type="button" class="btn" data-action="rename-template" data-id="${escapeHtml(t.id)}">${svg('edit','tiny-icon')} Rename</button><button type="button" class="btn danger" data-action="delete-template" data-id="${escapeHtml(t.id)}">${svg('trash','tiny-icon')} Delete plan</button></div>
 <div class="template-editor-list">${entries||'<p class="muted small">No exercises yet. Add one below.</p>'}</div><button class="btn primary block" data-action="add-template-exercise" data-id="${escapeHtml(t.id)}">${svg('plus','tiny-icon')} Add exercise</button>`;
}
function pendingPlanSwitch(targetId){
 const session=state.session,desired=templateById(targetId);
 if(!session||!desired)return;
 if(session.templateId===targetId){resumeWorkout();return;}
 state.session.minimized=false;
 tab='workouts';state.lastTab='workouts';exerciseOpen=session.activeIndex||0;
 restSheet=false;
 modal={type:'switch-workout',targetId};
 haptic('warning');
 motionChange(()=>render(),'expand');
 persist().catch(console.error);
}
function resumeWorkout(){
 if(!state.session)return;
 motionChange(()=>{
  state.session.minimized=false;tab='workouts';state.lastTab='workouts';exerciseOpen=state.session.activeIndex||0;render();
 },'expand');
 haptic('tap');persist().catch(console.error);
 window.scrollTo({top:0,behavior:'instant'});
}
async function switchWorkoutTo(targetId,shouldSave){
 const prior=state.session,desired=templateById(targetId);
 if(!prior||!desired)return;
 if(shouldSave){
  const done=prior.exercises.flatMap(e=>e.sets.filter(x=>x.done));
  if(!done.length){notify('Complete at least one set to save. Use Discard instead.');return;}
  state.workoutHistory.push({id:uid(),date:today(),name:prior.name,startedAt:prior.startedAt,endedAt:Date.now(),durationMin:Math.max(1,Math.round((Date.now()-prior.startedAt)/60000)),sets:done.length,volume:done.reduce((v,x)=>v+n(x.kg)*n(x.reps),0),exercises:prior.exercises});
 }
 const next={id:uid(),name:desired.name,templateId:desired.id,startedAt:Date.now(),minimized:false,exercises:desired.items.map(args=>mkEx(...args)),activeIndex:0,rest:null};
 motionChange(()=>{state.session=next;modal=null;restSheet=false;restAlertedFor=null;tab='workouts';state.lastTab='workouts';exerciseOpen=0;render();},'expand');
 haptic('success');await persist();window.scrollTo({top:0,behavior:'instant'});
}
function modalView(){if(!modal)return '';
if(modal.type==='switch-workout'){
 const current=state.session,next=templateById(modal.targetId),done=current?.exercises.flatMap(e=>e.sets.filter(x=>x.done)).length||0;
 if(!current||!next)return '';
 return modalShell('Another workout is running',`<div class="switch-workout-notice"><span class="status-dot"></span><b>${escapeHtml(current.name)}</b><span class="muted small">${done} sets completed</span></div><p>You're still in <b>${escapeHtml(current.name)}</b>. Would you like to end it and start <b>${escapeHtml(next.name)}</b>?</p><div class="stack"><button class="btn primary block" data-action="keep-workout">Continue ${escapeHtml(current.name)}</button><button class="btn block" data-action="switch-save" data-id="${escapeHtml(next.id)}" ${done===0?'disabled':''}>${svg('check','tiny-icon')} Finish ${escapeHtml(current.name)} and start ${escapeHtml(next.name)}</button><button class="btn danger block" data-action="switch-discard" data-id="${escapeHtml(next.id)}">Discard ${escapeHtml(current.name)} and start ${escapeHtml(next.name)}</button></div><p class="hint">Finish saves completed sets to your workout history. Discard permanently removes this unfinished session.</p>`);
}
if(modal.type==='session-exercise')return modalShell('Add exercise to this session',`${modalField('name','Exercise name','','text','required maxlength="90" placeholder="e.g. Face Pull"')}<div class="field-row">${modalField('sets','Sets',3,'number','min="1" max="12" required')}${modalField('reps','Target reps',10,'number','min="1" max="100" required')}${modalField('kg','Starting weight (kg)',0,'number','min="0" max="2000" step="0.5" required')}${modalField('rest','Rest between sets (seconds)',90,'number','min="0" max="1800" step="15" required')}</div><label class="check-task"><input type="checkbox" name="saveToTemplate" class="checkbox"/> Also add this to my saved workout plan for next time</label><p class="hint">This exercise will appear immediately in your current session. Other completed sets stay saved.</p>`,'form-session-exercise','Add to current workout');
if(modal.type==='new-template')return modalShell('Create workout plan',`${modalField('name','Workout name','','text','required maxlength="70" placeholder="e.g. Upper Body C"')}<p class="hint">Once created, add your own exercises and start whenever you're ready.</p>`,'form-new-template','Create plan');
if(modal.type==='edit-template'){const t=templateById(modal.id);return t?modalShell(`Edit ${escapeHtml(t.name)}`,templateEditorView(t)):'';}
if(modal.type==='rename-template'){const t=templateById(modal.id);return t?modalShell('Rename workout plan',`${modalField('name','Workout name',t.name,'text','required maxlength="70"')}`,'form-rename-template','Rename plan'):'';}
if(modal.type==='template-exercise'){
 const t=templateById(modal.id),old=modal.index==null?null:t?.items[modal.index];if(!t)return '';
 return modalShell(old?'Edit exercise':'Add custom exercise',`${modalField('name','Exercise name',old?.[1]||'','text','required maxlength="90" placeholder="e.g. Cable Face Pull"')}<div class="field-row">${modalField('sets','Sets',old?.[2]??3,'number','min="1" max="12" required')}${modalField('reps','Target reps',old?.[3]??10,'number','min="1" max="100" required')}${modalField('kg','Starting weight (kg)',old?.[4]??0,'number','min="0" max="2000" step="0.5" required')}${modalField('rest','Rest (seconds)',old?.[5]??90,'number','min="0" max="1800" step="15" required')}</div>${modalField('alternatives','Alternative exercises (optional, comma separated)',old?.[6]?.join(', ')||'','text','maxlength="500"')}<p class="hint">Set up the default for future sessions. Weights and reps can always be changed while training.</p>`,'form-template-exercise',old?'Save exercise':'Add exercise');
}
if(modal.type==='water')return modalShell('Log water',`${modalField('amount','Water amount (ml)',250,'number','min="1" max="15000" required')}${modalField('date','Date',today(),'date','required')}<p class="hint">Use any amount. Set your preferred quick-add size with the water controls on the dashboard.</p>`,'form-water','Add water');
if(modal.type==='water-config')return modalShell('Water controls',`${modalField('waterDefault','Amount added by + or a Water card tap (ml)',state.waterDefault||250,'number','min="1" max="5000" required')}${modalField('waterGoal','Daily water goal (ml)',state.goals.water,'number','min="1" max="15000" required')}<p class="hint">The − and + buttons subtract or add this amount. Set your usual glass size here.</p>`,'form-water-config','Save water settings');
if(modal.type==='edit-task'){const t=state.tasks.find(t=>t.id===modal.id);return t?modalShell('Edit daily task',`${modalField('name','Task description',t.label,'text','maxlength="100" required')}`,'form-edit-task','Save task'):'';}
if(modal.type==='meal-guide-item'){
 const item=mealGuideItems().find(x=>x.id===modal.id);
 const group=item?.group||'Breakfast',label=item?.label||'',description=item?.description||'';
 return modalShell(item?'Edit guide entry':'Add guide entry',`<div class="field"><label class="label" for="guide-group">Meal</label><select class="input" id="guide-group" name="group">${['Breakfast','Lunch & Dinner'].map(g=>`<option value="${g}" ${g===group?'selected':''}>${g}</option>`).join('')}</select></div>${modalField('label','Title',label,'text','required maxlength="50" placeholder="e.g. Protein foods"')}<div class="field"><label class="label" for="guide-description">Portions / options</label><textarea class="input" id="guide-description" name="description" rows="3" maxlength="350" required placeholder="e.g. 2 rotis or 150 g cooked rice">${escapeHtml(description)}</textarea></div><p class="hint">Reference only. No food entries or calorie targets are changed.</p>`,'form-meal-guide-item',item?'Save changes':'Add to guide');
}
if(modal.type==='food')return modalShell('Log a meal',`${modalField('name','Food or meal name','','text','required maxlength="100"')}<div class="field"><label class="label">Meal</label><select class="input" name="meal">${['Breakfast','Lunch','Dinner','Snack'].map(m=>`<option ${m===(modal.meal||'Breakfast')?'selected':''}>${m}</option>`).join('')}</select></div><div class="field-row">${modalField('calories','Calories (kcal)',0,'number','min="0" required')}${modalField('protein','Protein (g)',0,'number','min="0" step="0.1"')}${modalField('carbs','Carbs (g)',0,'number','min="0" step="0.1"')}${modalField('fat','Fat (g)',0,'number','min="0" step="0.1"')}${modalField('fibre','Fibre (g)',0,'number','min="0" step="0.1"')}${modalField('date','Date',today(),'date','required')}</div><p class="hint">Enter values from the package or a reliable recipe estimate. AI photo analysis comes in a later phase.</p>`,'form-food','Add to diary');
if(modal.type==='weight')return modalShell('Add weekly weight',`${modalField('weight','Body weight (kg)',state.weights.at(-1)?.kg ?? '','number','step="0.1" min="20" max="400" required')}${modalField('date','Measurement date',today(),'date','required')}`,'form-weight','Save weigh-in');
if(modal.type==='measurement') {const old=state.measurements.at(-1)||{};return modalShell('Body measurements',`${modalField('date','Date',today(),'date','required')}<p class="hint">All body measurements below are in inches. Leave unknown values blank.</p><div class="field-row">${[['chest','Chest'],['belly','Belly button'],['below','Below belly button'],['shoulders','Shoulders'],['neck','Neck'],['rightBicep','Right bicep'],['leftBicep','Left bicep'],['rightThigh','Right thigh'],['leftThigh','Left thigh'],['rightCalf','Right calf'],['leftCalf','Left calf'],['wrist','Wrist']].map(([k,l])=>modalField(k,l,old[k]??'','number','step="0.1" min="0"')).join('')}</div>`,'form-measurement','Save measurements');}
if(modal.type==='photo-guide')return photoGuideView();
if(modal.type==='photo')return modalShell('Add progress photo',`${modalField('date','Photo date',today(),'date','required')}<div class="field"><label class="label">View</label><select class="input" name="view"><option>Front</option><option>Left side</option><option>Right side</option><option>Back</option></select></div><div class="field"><label class="label">Choose photo</label><input class="input" type="file" name="photo" accept="image/*" required/></div><p class="hint">The photo is compressed locally and stored offline. It will only be uploaded if you connect and back up to your own cloud.</p>`,'form-photo','Save photo');
if(modal.type==='activity'){let a=activityToday();return modalShell('Manual activity entry',`${modalField('steps','Steps today',a.steps,'number','min="0" required')}${modalField('activeCalories','Calories burnt during activity (kcal)',a.activeCalories,'number','min="0" required')}${modalField('date','Date',today(),'date','required')}<p class="hint">Samsung Health/Health Connect automatic import is planned for a native Android development phase.</p>`,'form-activity','Update activity');}
if(modal.type==='task')return modalShell('Add a daily task',`${modalField('name','Task description','','text','maxlength="100" required')}`,'form-task','Add task');
if(modal.type==='rest-setting'){let e=state.session.exercises[modal.index];return modalShell('Exercise rest time',`${modalField('seconds','Rest duration (seconds)',e.restSeconds,'number','min="0" max="1800" step="15" required')}`,'form-rest-setting','Save duration');}
if(modal.type==='swap'){let e=state.session.exercises[modal.index];return modalShell('Swap exercise',`<p class="muted small">Replacing <b>${escapeHtml(e.name)}</b>. Your completed sets and their values will stay in the session, but progression history is separate for each exercise.</p><div class="field"><label class="label">Suggested alternatives</label><select class="input" name="exercise">${[...e.alts,e.name].map(x=>`<option>${escapeHtml(x)}</option>`).join('')}</select></div>${modalField('custom','Or enter another exercise name','')}`,'form-swap','Replace exercise');}
if(modal.type==='notes'){let e=state.session.exercises[modal.index];return modalShell('Exercise notes',`<div class="field"><label class="label">Form cues or reminders</label><textarea class="input" name="notes" rows="5" maxlength="500">${escapeHtml(e.notes||'')}</textarea></div>`,'form-notes','Save note');}
if(modal.type==='video'){const e=state.session.exercises[modal.index];let title=escapeHtml(e.name);let url='https://www.youtube.com/results?search_query='+encodeURIComponent('Muscle and Strength '+e.name+' exercise');return modalShell('Exercise demonstration',`<h3>${title}</h3><div class="outline-banner">In-app YouTube playback will be enabled when the verified Muscle & Strength video ID is added to the exercise library. Video embedding depends on the video owner's settings.</div><p class="small">For now, find the demonstration on YouTube:</p><a class="btn primary" href="${url}" target="_blank" rel="noopener noreferrer">Find ${title} video ${svg('arrow','tiny-icon')}</a>`);}
if(modal.type==='cloud'){const cfg=cloud.getConfig();return modalShell('Configure private cloud',`${modalField('url','Supabase project URL',cfg?.url||'','url','placeholder="https://your-project.supabase.co" required')}${modalField('key','Supabase public publishable/anon key',cfg?.key||'','text','required')}<p class="hint">Never use the Supabase service-role or secret API key in this field. Configure OAuth redirect URLs and database policies using the SQL instructions in the ZIP.</p>`,'form-cloud','Save cloud configuration');}
if(modal.type==='workout-summary')return modalShell('Workout complete',`<div class="hero-number" style="text-align:center">${modal.duration} min</div><p style="text-align:center" class="muted">${modal.sets} sets · ${num(modal.volume)} kg total lifted</p><p class="small muted">Well done. Your completed session is recorded in workout history.</p><button class="btn primary block" data-action="close-modal">Continue</button>`);
return '';
}
function navHtml(){return `<nav class="nav" aria-label="Main navigation">${[['home','home','Dashboard'],['workouts','dumbbell','Workouts'],['nutrition','food','Nutrition'],['body','chart','Body tracker']].map(([id,iconName,label])=>`<button class="nav-btn ${tab===id?'active':''}" data-action="tab" data-tab="${id}">${svg(iconName)} ${label}</button>`).join('')}<button class="nav-btn ${tab==='settings'?'active':''}" data-action="tab" data-tab="settings">${svg('settings')} Settings</button></nav>`;}
function syncDock(visible){
 let dock=document.getElementById('recomp-bottom-dock');
 const pages=[['home','home','Home'],['workouts','dumbbell','Workouts'],['nutrition','food','Nutrition'],['body','chart','Body']];
 if(!dock){
  dock=document.createElement('nav');dock.id='recomp-bottom-dock';dock.className='bottom-nav premium-dock';dock.setAttribute('aria-label','Main navigation');
  dock.innerHTML=pages.map(([id,ico,label])=>`<button class="bottom-btn" data-action="tab" data-tab="${id}" type="button">${svg(ico)}<span>${label}</span></button>`).join('');
  dock.style.setProperty('--active-tab-index',String(Math.max(0,pages.findIndex(([id])=>id===tab))));
  document.body.appendChild(dock);
 }
 dock.hidden=!visible;
 dock.style.display=visible?'':'none';
 dock.setAttribute('aria-hidden',visible?'false':'true');
 for(const button of dock.querySelectorAll('.bottom-btn')){
  const isActive=button.dataset.tab===tab;
  button.classList.toggle('active',isActive);
  if(isActive)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');
 }
 if(visible){dock.style.setProperty('--active-tab-index',String(Math.max(0,pages.findIndex(([id])=>id===tab))));}
}
function render(){applyTheme();const active=Boolean(state.session&&!state.session.minimized&&tab==='workouts');document.body.classList.toggle('screen-mode',active);
// The bottom dock is mounted once on document.body and never rebuilt with page content.
let section=active?activeWorkoutView():({home:homeView,workouts:workoutView,nutrition:nutritionView,body:bodyView,settings:settingsView}[tab]||homeView)();
$('#app').innerHTML=svgSymbols+`<div class="layout"><aside class="sidebar"><div class="brand"><span class="brand-mark">${svg('chart','big-icon')}</span><span class="brand-name">recomp<span style="color:var(--accent)">.</span></span></div>${navHtml()}<div class="sidebar-foot"><div class="row">${svg('cloud','tiny-icon')} Offline-first personal tracker</div><p>Version 1.8</p></div></aside><main class="main ${active?'workout-focus-shell':''}">${section}</main></div>${!active&&(tab==='nutrition'||tab==='body')?`<button type="button" class="quick-fab ${state.session?'above-workout':''}" data-action="${tab==='nutrition'?'add-food':'add-weight'}" aria-label="${tab==='nutrition'?'Log food':'Log weight'}" title="${tab==='nutrition'?'Log food':'Log weight'}">${svg('plus')}<span class="quick-fab-label">${tab==='nutrition'?'Food':'Weight'}</span></button>`:''}${state.session&&!active?`<div class="floating-workout" role="button" tabindex="0" data-action="resume-workout">${svg('dumbbell')}<span style="flex:1"><b>Workout in progress</b><span style="display:block" class="muted small">${escapeHtml(state.session.name)} · <span class="elapsed">${elapsed(state.session.startedAt)}</span></span></span>${svg('minimise','lift-icon')}</div>`:''}${waterCelebration&&tab==='home'&&!modal?`<div class="water-cheers" role="status" aria-live="polite"><span class="cheers-bubbles" aria-hidden="true">✧ ✦ ✧</span><div><b>Cheers! +${num(waterCelebration.ml)} ml 💧</b><small>Another sip, another win.</small></div><button class="btn water-undo" data-action="undo-water">Undo</button></div>`:''}${restOverlay()}${modalView()}`;
syncDock(!active);
if(bodyPanel==='photos'&&tab==='body')updateCompare();
}
function setTab(dest,swipeDirection=null){
 if(tab===dest)return;
 const order=['home','workouts','nutrition','body'];
 const direction=swipeDirection??(order.indexOf(dest)>=order.indexOf(tab)?1:-1);
 motionChange(()=>{window.scrollTo({top:0,behavior:'instant'});tab=dest;planActionsId=null;mealGuideActionsId=null;state.lastTab=dest;render();},'tab',direction);
 haptic('tap');put('state',state).catch(console.error);
}
function beginWorkout(id){
 const template=templateById(id);if(!template)return;
 if(state.session){pendingPlanSwitch(id);return;}
 if(!template.items.length){notify('Add an exercise to this plan first.');return;}
 motionChange(()=>{state.session={id:uid(),name:template.name,templateId:id,startedAt:Date.now(),minimized:false,exercises:template.items.map(args=>mkEx(...args)),activeIndex:0,rest:null};exerciseOpen=0;tab='workouts';state.lastTab='workouts';render();},'expand');
 haptic('success');persist().catch(console.error);
}
function setRest(exIndex){const s=state.session,e=s.exercises[exIndex];s.rest={exerciseIndex:exIndex,endsAt:Date.now()+e.restSeconds*1000,paused:false,remainingMs:e.restSeconds*1000,id:uid()};restAlertedFor=null;restSheet=true;}
function tickSet(exI,setI){const s=state.session,e=s?.exercises?.[exI],set=e?.sets[setI];if(!set)return;set.done=!set.done;set.completedAt=set.done?new Date().toISOString():null;set.exerciseName=set.done?e.name:null;
 if(set.done){haptic('check');const all=e.sets.every(x=>x.done);if(all){s.rest=null;restSheet=false;const next=s.exercises.findIndex((x,i)=>i>exI && x.sets.some(a=>!a.done));if(next!==-1){s.activeIndex=next;exerciseOpen=next;}else{const first=s.exercises.findIndex(x=>x.sets.some(a=>!a.done));if(first!==-1){s.activeIndex=first;exerciseOpen=first;}}}else if(e.restSeconds>0){setRest(exI);}}
 persist().then(render);
}
function finishWorkout(){if(!state.session)return;const s=state.session;const done=s.exercises.flatMap(e=>e.sets.filter(x=>x.done).map(set=>({...set,exercise:set.exerciseName||e.name})));if(!done.length){notify('Complete at least one set before finishing');return;}if(!confirm('Finish this workout and save your completed sets?'))return;const minutes=Math.max(1,Math.round((Date.now()-s.startedAt)/60000));const volume=done.reduce((v,x)=>v+n(x.kg)*n(x.reps),0);state.workoutHistory.push({id:uid(),date:today(),name:s.name,startedAt:s.startedAt,endedAt:Date.now(),durationMin:minutes,sets:done.length,volume,exercises:s.exercises});state.session=null;restSheet=false;tab='workouts';state.lastTab='workouts';modal={type:'workout-summary',duration:minutes,volume,sets:done.length};commit();}
function timerControl(action){const r=state.session?.rest;if(!r)return;const leftMs=r.paused?r.remainingMs:Math.max(0,r.endsAt-Date.now());if(action==='timer-plus'||action==='timer-minus'){let newMs=Math.max(0,leftMs+(action==='timer-plus'?15000:-15000));if(!newMs){state.session.rest=null;restSheet=false;}else if(r.paused)r.remainingMs=newMs;else r.endsAt=Date.now()+newMs;}
if(action==='timer-pause'){if(r.paused){r.paused=false;r.endsAt=Date.now()+r.remainingMs;}else{r.remainingMs=leftMs;r.paused=true;}}
if(action==='timer-skip'){state.session.rest=null;restSheet=false;}
persist().then(render);}
let audioContext;
function playWaterSound(force=false){
 if(!force && state?.preferences?.waterSound===false)return;
 try{
  const AudioAPI=window.AudioContext||window.webkitAudioContext;
  if(!AudioAPI)return;
  audioContext=audioContext||new AudioAPI();
  // Unlock audio synchronously in the tap's user gesture, before any async save.
  if(audioContext.state==='suspended')audioContext.resume().catch(()=>{});
  const at=audioContext.currentTime+.008;
  for(const [i,startHz,endHz] of [[0,680,400],[1,520,300]]){
   const t=at+i*.12,osc=audioContext.createOscillator(),gain=audioContext.createGain();
   osc.type='sine';osc.frequency.setValueAtTime(startHz,t);osc.frequency.exponentialRampToValueAtTime(endHz,t+.14);
   gain.gain.setValueAtTime(.0001,t);gain.gain.exponentialRampToValueAtTime(.055,t+.015);
   gain.gain.exponentialRampToValueAtTime(.0001,t+.18);
   osc.connect(gain);gain.connect(audioContext.destination);osc.start(t);osc.stop(t+.19);
  }
 }catch(e){console.warn('Water sound unavailable',e);}
}
async function chime(){try{audioContext=audioContext||new(window.AudioContext||window.webkitAudioContext)();await audioContext.resume();const start=audioContext.currentTime;for(let i=0;i<3;i++){const osc=audioContext.createOscillator(),gain=audioContext.createGain();osc.type='sine';osc.frequency.value=[660,880,1046][i];gain.gain.setValueAtTime(.0001,start+i*.16);gain.gain.exponentialRampToValueAtTime(.2,start+i*.16+.015);gain.gain.exponentialRampToValueAtTime(.0001,start+i*.16+.2);osc.connect(gain).connect(audioContext.destination);osc.start(start+i*.16);osc.stop(start+i*.16+.22);}navigator.vibrate?.([150,80,150]);}catch(err){console.warn('Sound unavailable',err);}}
function timerTick(){const s=state?.session;if(!s)return;for(const el of document.querySelectorAll('.elapsed'))el.textContent=elapsed(s.startedAt);if(s.rest){let remaining=restLeft();for(const el of document.querySelectorAll('.inline-timer,#main-timer'))el.textContent=clock(remaining);if(remaining<=0&&!s.rest.paused){let id=s.rest.id;if(restAlertedFor!==id){restAlertedFor=id;chime();notify('Rest finished. Time for your next set!');if(typeof Notification !== 'undefined' && Notification.permission==='granted' && navigator.serviceWorker?.controller){navigator.serviceWorker.ready.then(reg=>reg.showNotification('Rest complete',{body:'You’re ready for your next set.',icon:'./icon.svg',tag:'rest-complete'})).catch(()=>{});}}
s.rest=null;restSheet=false;persist().then(render);}}}

async function loadPhotoUrls(){for(const p of state.photos){if(photoUrls.has(p.id))continue;try{let blob=await getPhoto(p.id);if(!blob && p.cloudPath && cloud.getSession() && navigator.onLine){blob=await cloud.downloadPhoto(p.cloudPath);await putPhoto(p.id,blob);}if(blob)photoUrls.set(p.id,URL.createObjectURL(blob));}catch(err){console.warn('Photo unavailable',err);}}}
function makePhotoJpeg(file){return new Promise((resolve,reject)=>{const img=new Image(),url=URL.createObjectURL(file);img.onload=()=>{try{const scale=Math.min(1,1400/Math.max(img.width,img.height));const canvas=document.createElement('canvas');canvas.width=Math.round(img.width*scale);canvas.height=Math.round(img.height*scale);canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);canvas.toBlob(blob=>{URL.revokeObjectURL(url);blob?resolve(blob):reject(new Error('Could not process photo'));},'image/jpeg',.82);}catch(e){URL.revokeObjectURL(url);reject(e);}};img.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('Unsupported photo format'));};img.src=url;});}
async function download(name,blob){const url=URL.createObjectURL(blob),anchor=document.createElement('a');anchor.href=url;anchor.download=name;document.body.append(anchor);anchor.click();anchor.remove();setTimeout(()=>URL.revokeObjectURL(url),15000);}
function toDataUrl(blob){return new Promise((res,rej)=>{let reader=new FileReader();reader.onload=()=>res(reader.result);reader.onerror=()=>rej(reader.error);reader.readAsDataURL(blob);});}
async function exportData(){notify('Preparing private backup…');const photos=[];for(const p of state.photos){const blob=await getPhoto(p.id);if(blob)photos.push({id:p.id,data:await toDataUrl(blob)});}const safeState=structuredClone(state);delete safeState.dirty;await download(`recomp-backup-${today()}.json`,new Blob([JSON.stringify({format:'recomp-backup-v1',exportedAt:new Date().toISOString(),state:safeState,photos})],{type:'application/json'}));notify('Backup exported. Store it privately.');}
async function importData(file){const backup=JSON.parse(await file.text());if(backup.format!=='recomp-backup-v1'||!backup.state||!Array.isArray(backup.photos))throw new Error('Unrecognised backup file');if(!confirm('Restore this backup? This replaces your current local fitness data.'))return;let newState=backup.state;if(!newState.goals||!Array.isArray(newState.food)||!Array.isArray(newState.templates))throw new Error('Invalid backup state');for(const x of backup.photos){if(!x.data.startsWith('data:image/'))continue;let blob=await(await fetch(x.data)).blob();await putPhoto(x.id,blob);}state={...newState,dirty:true};await put('state',state);for(const url of photoUrls.values())URL.revokeObjectURL(url);photoUrls.clear();await loadPhotoUrls();tab='home';state.lastTab='home';render();notify('Backup restored');}
async function pushCloud(){if(!navigator.onLine)throw new Error('An internet connection is required');const ses=await cloud.usableSession();if(!ses)throw new Error('Sign in with Google first');for(const photo of state.photos){if(photo.cloudPath)continue;const blob=await getPhoto(photo.id);if(!blob)continue;photo.cloudPath=await cloud.uploadPhoto(photo.id,blob);}const syncedAt=new Date().toISOString();await cloud.uploadSnapshot({...state,lastSync:syncedAt,dirty:false});state.lastSync=syncedAt;state.dirty=false;await put('state',state);render();notify('Private cloud backup completed');}
async function pullCloud(){if(!navigator.onLine)throw new Error('An internet connection is required');const remote=await cloud.downloadSnapshot();if(!remote){notify('No cloud backup found');return;}if(!confirm('Replace the local data on this device with your cloud backup? Unsynchronised local changes will be lost.'))return;const replacement=remote.payload;if(!replacement?.goals||!Array.isArray(replacement.photos))throw new Error('Cloud backup has unexpected data');state={...replacement,dirty:false};await put('state',state);for(const url of photoUrls.values())URL.revokeObjectURL(url);photoUrls.clear();await loadPhotoUrls();tab='home';state.lastTab='home';render();notify('Cloud backup restored');}
async function handleAction(el,event){const a=el.dataset.action;if(a==='close-modal' && el.classList.contains('modal-shade') && event.target!==el)return;
 switch(a){
 case 'tab':setTab(el.dataset.tab);break;
 case 'settings':setTab('settings');break;
 case 'toggle-theme':{
  state.preferences??={haptics:true,waterSound:true};
  state.preferences.themeMode=effectiveTheme()==='dark'?'light':'dark';
  applyTheme();haptic('tap');render();await persist();break;
 }
 case 'add-water':modal={type:'water'};render();break;
 case 'metric-water':case 'water-plus':await addQuickWater(n(state.waterDefault,250)||250);break;
 case 'water-minus':await removeRecentWater();break;
 case 'undo-water':await undoCelebrationWater();break;
 case 'water-config':modal={type:'water-config'};render();break;
 case 'test-haptics':{const accepted=haptic('test',true);notify(accepted?'Vibration requested. If you felt nothing, check Android vibration settings and battery saver.':'Vibration not available in this browser or device.');break;}
 case 'test-water-sound':playWaterSound(true);notify('Water sound test. Check your media volume if it is silent.');break;
 case 'refresh-steps':{if(stepRefresh)break;stepRefresh=true;stepRefreshInfo=false;render();setTimeout(()=>{stepRefresh=false;stepRefreshInfo=true;render();notify('No watch connection yet. Steps are currently entered manually.');},950);break;}
 case 'metric-active':modal={type:'activity'};render();notify('Come on, burn it. Log your move!');break;
 case 'quick-water':await addQuickWater(n(el.dataset.amount));break;
 case 'add-guide-item':mealGuideActionsId=null;modal={type:'meal-guide-item',id:null};render();break;
 case 'edit-guide-item':{
  const item=mealGuideItems().find(x=>x.id===el.dataset.id);
  if(item){mealGuideActionsId=null;modal={type:'meal-guide-item',id:item.id};render();}break;
 }
 case 'delete-guide-item':{
  const item=mealGuideItems().find(x=>x.id===el.dataset.id);
  if(item&&confirm(`Delete “${item.label}” from your meal guide? This won't change your food diary.`)){
   mealGuideActionsId=null;state.mealGuideItems=mealGuideItems().filter(x=>x.id!==item.id);await commit();haptic('check');notify('Guide entry deleted');
  }break;
 }
 case 'add-food':modal={type:'food',meal:el.dataset.meal||'Breakfast'};render();break;
 case 'add-weight':modal={type:'weight'};render();break;
 case 'add-measurement':modal={type:'measurement'};render();break;
 case 'add-photo':modal={type:'photo'};render();break;
 case 'open-photo-guide':guideDate=today();guideView='Front';modal={type:'photo-guide'};render();await startGuideCamera();break;
 case 'photo-upload-mode':await stopGuideCamera();modal={type:'photo'};render();break;
 case 'take-guided-photo':try{await captureGuidePhoto();}catch(err){notify(err.message);}break;
 case 'activity':modal={type:'activity'};render();break;
 case 'add-task':modal={type:'task'};render();break;
 case 'edit-task':{const t=state.tasks.find(t=>t.id===el.dataset.id);if(t){taskActionsId=null;modal={type:'edit-task',id:t.id};render();}break;}
 case 'delete-task':{const t=state.tasks.find(t=>t.id===el.dataset.id);if(t&&confirm(`Remove “${t.label}” from your daily tasks?`)){taskActionsId=null;state.tasks=state.tasks.filter(x=>x.id!==t.id);await commit();}break;}
 case 'close-modal':if(modal?.type==='photo-guide')await stopGuideCamera();modal=null;render();break;
 case 'nutrition-panel':nutritionPanel=el.dataset.panel;state.lastNutritionPanel=nutritionPanel;render();put('state',state).catch(console.error);break;
 case 'body-panel':bodyPanel=el.dataset.panel;state.lastBodyPanel=bodyPanel;render();put('state',state).catch(console.error);break;
 case 'delete-food':if(confirm('Delete this food entry?')){state.food=state.food.filter(f=>f.id!==el.dataset.id);await commit();}break;
 case 'delete-weight':if(confirm('Delete this weight entry?')){state.weights=state.weights.filter(f=>f.id!==el.dataset.id);await commit();}break;
 case 'delete-photo':if(confirm('Delete this progress photograph from the device? A cloud copy, if already backed up, may remain until you delete it from cloud storage.')){let id=el.dataset.id;state.photos=state.photos.filter(f=>f.id!==id);await deletePhoto(id);const url=photoUrls.get(id);if(url)URL.revokeObjectURL(url);photoUrls.delete(id);await commit();}break;
 case 'repeat-food':{let x=state.food.find(x=>x.id===el.dataset.id);if(x){state.food.push({...x,id:uid(),date:today()});await commit();notify('Added to today’s food diary');}break;}
 case 'begin-template':beginWorkout(el.dataset.id);break;
 case 'create-template':modal={type:'new-template'};render();break;
 case 'edit-template':planActionsId=null;modal={type:'edit-template',id:el.dataset.id};render();break;
 case 'rename-template':modal={type:'rename-template',id:el.dataset.id};render();break;
 case 'delete-template':{const t=templateById(el.dataset.id);if(t&&confirm(`Delete plan “${t.name}” and its exercise list? Saved sessions won't change.`)){state.templates=state.templates.filter(x=>x.id!==t.id);modal=null;await commit();notify('Plan deleted. History is intact.');}break;}
 case 'add-template-exercise':modal={type:'template-exercise',id:el.dataset.id,index:null};render();break;
 case 'edit-template-exercise':modal={type:'template-exercise',id:el.dataset.id,index:Number(el.dataset.index)};render();break;
 case 'delete-template-exercise':{const t=templateById(el.dataset.id),idx=Number(el.dataset.index),item=t?.items?.[idx];if(item&&confirm(`Remove “${item[1]}” from ${t.name}? Existing sessions won't change.`)){t.items.splice(idx,1);await persist();modal={type:'edit-template',id:t.id};render();haptic('check');}break;}
 case 'keep-workout':modal=null;render();break;
 case 'switch-save':await switchWorkoutTo(el.dataset.id,true);break;
 case 'switch-discard':if(confirm(`Discard the unfinished ${state.session?.name} workout? Completed sets will be lost.`))await switchWorkoutTo(el.dataset.id,false);break;
 case 'start-workout':setTab('workouts');break;
 case 'resume-workout':if(state.session){resumeWorkout();}break;
 case 'minimise-workout':if(state.session){motionChange(()=>{state.session.minimized=true;tab='home';state.lastTab='home';restSheet=false;render();},'minimize');haptic('tap');await persist();}break;
 case 'discard-workout':if(confirm('Discard this unfinished workout? Completed sets will not be added to history.')){state.session=null;restSheet=false;await commit();}break;
 case 'expand-exercise':exerciseOpen=Number(el.dataset.index);if(state.session)state.session.activeIndex=exerciseOpen;await put('state',state);render();break;
 case 'tick-set':tickSet(Number(el.dataset.ex),Number(el.dataset.set));break;
 case 'add-session-exercise':if(state.session){modal={type:'session-exercise'};render();}break;
 case 'remove-session-exercise':{
  const s=state.session,index=Number(el.dataset.index),exercise=s?.exercises?.[index];
  if(!exercise)break;
  const done=exercise.sets.filter(x=>x.done).length;
  if(!confirm(`Remove “${exercise.name}” from this session? ${done?`${done} completed set(s) from this exercise will be lost.`:'Your saved plan will be unchanged.'}`))break;
  s.exercises.splice(index,1);
  if(s.rest){if(s.rest.exerciseIndex===index){s.rest=null;restSheet=false;}else if(s.rest.exerciseIndex>index)s.rest.exerciseIndex-=1;}
  s.activeIndex=Math.max(0,Math.min(s.exercises.length-1,s.activeIndex>index?s.activeIndex-1:s.activeIndex));
  exerciseOpen=s.activeIndex;haptic('check');await commit();
  break;
 }
 case 'add-set':{let e=state.session?.exercises?.[Number(el.dataset.index)];if(e){const last=e.sets.at(-1);e.sets.push({id:uid(),kg:last?.kg||0,reps:last?.reps||10,done:false});await commit();}break;}
 case 'rest-setting':modal={type:'rest-setting',index:Number(el.dataset.index)};render();break;
 case 'swap-exercise':modal={type:'swap',index:Number(el.dataset.index)};render();break;
 case 'exercise-notes':modal={type:'notes',index:Number(el.dataset.index)};render();break;
 case 'exercise-video':modal={type:'video',index:Number(el.dataset.index)};render();break;
 case 'close-rest':restSheet=false;render();break;
 case 'open-rest':if(state.session?.rest){restSheet=true;haptic('tap');render();}break;
 case 'timer-plus':case 'timer-minus':case 'timer-pause':case 'timer-skip':timerControl(a);break;
 case 'finish-workout':finishWorkout();break;
 case 'configure-cloud':modal={type:'cloud'};render();break;
 case 'google-login':{if(window.Capacitor?.isNativePlatform?.()){notify('Native Google OAuth needs the Android deep-link integration phase. Use the hosted web app to connect for now.');break;}await cloud.startGoogleLogin();break;}
 case 'cloud-upload':await pushCloud();break;
 case 'cloud-download':await pullCloud();break;
 case 'cloud-logout':if(confirm('Sign out of cloud backup on this device? Your offline data will remain.')){cloud.signOut();render();}break;
 case 'test-chime':await chime();notify('Chime test played, if audio is permitted');break;
 case 'notification-permission':if(typeof Notification==='undefined')notify('Notifications are not supported in this browser');else{let status=await Notification.requestPermission();notify('Notification permission: '+status);}break;
 case 'export-backup':await exportData();break;
 case 'import-backup':$('#import-file')?.click();break;
 }
}
async function onSubmit(form){let data=new FormData(form),id=form.id;
 if(id==='form-water'){let amount=n(data.get('amount'));if(amount<=0||amount>15000)throw new Error('Enter a water amount between 1 and 15,000 ml');state.water.push({id:uid(),date:data.get('date'),ml:amount});notify(`Added ${amount} ml`);}
 else if(id==='form-meal-guide-item'){
  const label=String(data.get('label')||'').trim().slice(0,50),description=String(data.get('description')||'').trim().slice(0,350),group=String(data.get('group')||'');
  if(!label||!description||!['Breakfast','Lunch & Dinner'].includes(group))throw new Error('Enter a title, portion guide and valid meal');
  const item=mealGuideItems().find(x=>x.id===modal?.id);
  if(modal?.id&&!item)throw new Error('This guide entry no longer exists');
  if(item){item.label=label;item.description=description;item.group=group;}
  else state.mealGuideItems.push({id:uid(),group,label,description});
  mealGuideActionsId=null;haptic('success');notify(item?'Guide entry updated':'Added to meal guide');
 }
 else if(id==='form-food'){let item={id:uid(),date:data.get('date'),name:String(data.get('name')).trim().slice(0,100),meal:data.get('meal')};for(let k of ['calories','protein','carbs','fat','fibre']){item[k]=n(data.get(k));if(item[k]<0||item[k]>100000)throw new Error('Check the nutrition amounts');}if(!item.name)throw new Error('Enter a food name');state.food.push(item);}
 else if(id==='form-weight'){let kg=n(data.get('weight'));if(kg<20||kg>400)throw new Error('Enter a valid body weight');state.weights.push({id:uid(),date:data.get('date'),kg});}
 else if(id==='form-measurement'){let m={id:uid(),date:data.get('date')};for(const k of ['chest','belly','below','shoulders','neck','rightBicep','leftBicep','rightThigh','leftThigh','rightCalf','leftCalf','wrist']){let val=data.get(k);m[k]=val===''?'':n(val);}state.measurements.push(m);}
 else if(id==='form-photo'){const file=data.get('photo');if(!(file instanceof File)||!file.size)throw new Error('Choose a photograph');if(file.size>40*1024*1024)throw new Error('Photo is too large (maximum 40 MB)');if(!file.type.startsWith('image/'))throw new Error('Choose an image file');const blob=await makePhotoJpeg(file);await savePhotoBlob(blob,data.get('date'),data.get('view'));return;}
 else if(id==='form-activity'){let entry={date:data.get('date'),steps:Math.max(0,n(data.get('steps'))),activeCalories:Math.max(0,n(data.get('activeCalories')))};state.activity=state.activity.filter(a=>a.date!==entry.date);state.activity.push(entry);}
 else if(id==='form-task'){let name=String(data.get('name')).trim();if(!name)throw new Error('Enter a task');state.tasks.push({id:uid(),label:name,auto:null});}
 else if(id==='form-edit-task'){let t=state.tasks.find(x=>x.id===modal.id),name=String(data.get('name')).trim();if(!t||!name)throw new Error('Enter a valid task');t.label=name.slice(0,100);}
 else if(id==='form-session-exercise'){
  const session=state.session;if(!session)throw new Error('Start a workout first');
  const name=String(data.get('name')||'').trim().slice(0,90),sets=Number(data.get('sets')),reps=Number(data.get('reps')),kg=Number(data.get('kg')),rest=Number(data.get('rest'));
  if(!name||!Number.isInteger(sets)||sets<1||sets>12||!Number.isInteger(reps)||reps<1||reps>100||!Number.isFinite(kg)||kg<0||kg>2000||!Number.isInteger(rest)||rest<0||rest>1800)throw new Error('Please check all exercise fields');
  const spec=['custom-ex-'+uid(),name,sets,reps,kg,rest,[]];
  session.exercises.push(mkEx(...spec));
  if(data.get('saveToTemplate')==='on'){
    const original=templateById(session.templateId);if(original)original.items.push(spec);
  }
  session.activeIndex=session.exercises.length-1;exerciseOpen=session.activeIndex;
  modal=null;await persist();render();haptic('success');return;
 }
 else if(id==='form-new-template'){
  const name=String(data.get('name')||'').trim().slice(0,70);if(!name)throw new Error('Enter a workout name');
  const newId='custom-'+uid();state.templates.push({id:newId,name,subtitle:'Custom plan',items:[]});
  modal={type:'edit-template',id:newId};await persist();render();haptic('success');return;
 }
 else if(id==='form-rename-template'){
  const t=templateById(modal.id),name=String(data.get('name')||'').trim().slice(0,70);
  if(!t||!name)throw new Error('Enter a workout name');t.name=name;
  modal={type:'edit-template',id:t.id};await persist();render();haptic('check');return;
 }
 else if(id==='form-template-exercise'){
  const t=templateById(modal.id),ix=modal.index,name=String(data.get('name')||'').trim().slice(0,90);
  if(!t||!name)throw new Error('Enter a valid exercise name');
  const sets=Number(data.get('sets')),reps=Number(data.get('reps')),kg=Number(data.get('kg')),rest=Number(data.get('rest'));
  if(!Number.isInteger(sets)||sets<1||sets>12||!Number.isInteger(reps)||reps<1||reps>100||!Number.isFinite(kg)||kg<0||kg>2000||!Number.isInteger(rest)||rest<0||rest>1800)throw new Error('Check exercise sets, reps, weight and rest duration');
  const alternatives=String(data.get('alternatives')||'').split(',').map(x=>x.trim().slice(0,90)).filter(Boolean).slice(0,8);
  const eid=ix==null?'custom-ex-'+uid():t.items[ix]?.[0];
  if(!eid)throw new Error('Exercise no longer available');
  const item=[eid,name,sets,reps,kg,rest,alternatives];
  if(ix==null)t.items.push(item);else t.items[ix]=item;
  modal={type:'edit-template',id:t.id};await persist();render();haptic('check');return;
 }
 else if(id==='form-water-config'){let amount=n(data.get('waterDefault')),goal=n(data.get('waterGoal'));if(amount<1||amount>5000||goal<1||goal>15000)throw new Error('Check your water amounts');state.waterDefault=Math.round(amount);state.goals.water=Math.round(goal);}
 else if(id==='form-rest-setting'){state.session.exercises[modal.index].restSeconds=Math.max(0,Math.min(1800,n(data.get('seconds'))));}
 else if(id==='form-swap'){let e=state.session.exercises[modal.index],newName=String(data.get('custom')).trim()||String(data.get('exercise')).trim();if(!newName)throw new Error('Choose an exercise');e.swappedFrom=e.swappedFrom||e.name;e.name=newName;for(const set of e.sets){if(!set.done)set.kg=0;}}
 else if(id==='form-notes'){state.session.exercises[modal.index].notes=String(data.get('notes')).slice(0,500);}
 else if(id==='form-cloud'){cloud.saveConfig(String(data.get('url')),String(data.get('key')));notify('Cloud configuration saved');}
 else if(id==='settings-goals'){for(const k of Object.keys(state.goals))state.goals[k]=Math.max(0,n(data.get(k)));await commit();notify('Daily goals saved');return;}
 else return;
 modal=null;await commit();}

document.addEventListener('click',async event=>{const target=event.target.closest('[data-action]');if(!target)return;if(target.dataset.action==='close-modal'&&target.classList.contains('modal-shade')&&event.target!==target)return;event.preventDefault();try{await handleAction(target,event);}catch(err){console.error(err);notify(err.message||'Something went wrong');}});
document.addEventListener('submit',async event=>{const form=event.target;if(!form.id)return;event.preventDefault();try{await onSubmit(form);}catch(err){console.error(err);notify(err.message||'Could not save the entry');}});
document.addEventListener('change',async event=>{const el=event.target;
if(el.id==='appearance-mode'){
 state.preferences??={haptics:true,waterSound:true};
 state.preferences.themeMode=el.value;
 applyTheme();await persist();render();return;
}

if(el.id==='enable-haptics'||el.id==='enable-water-sound'){
 state.preferences??={haptics:true,waterSound:true};
 state.preferences[el.id==='enable-haptics'?'haptics':'waterSound']=el.checked;
 await persist();notify(el.id==='enable-haptics'?(el.checked?'Haptics enabled':'Haptics disabled'):(el.checked?'Water sound enabled':'Water sound muted'));
 return;
}
if(el.matches('[data-setfield]')){let i=n(el.dataset.ex),j=n(el.dataset.set);if(!state.session?.exercises?.[i]?.sets?.[j])return;state.session.exercises[i].sets[j][el.dataset.setfield]=Math.max(0,n(el.value));await persist();}
if(el.matches('[data-task-id]')){const date=today(),id=el.dataset.taskId;taskActionsId=null;state.taskChecks[date]??={};state.taskChecks[date][id]=el.checked;haptic('check');await commit();}
if(el.id==='auto-cloud-sync'){localStorage.setItem('recomp-auto-sync',el.checked?'yes':'no');notify(el.checked?'Automatic cloud backup enabled':'Automatic cloud backup disabled');}
if(el.id==='compare-view'){compareView=el.value;const photos=state.photos.filter(p=>p.view===compareView).sort((a,b)=>a.date.localeCompare(b.date));const options=photos.map(p=>`<option value="${p.id}">${dateDisplay(p.date)}</option>`).join('');$('#compare-first').innerHTML=options;$('#compare-second').innerHTML=options;updateCompare();}
if(el.id==='compare-first'||el.id==='compare-second')updateCompare();
if(el.id==='guide-view'){guideView=el.value;updateGuideReference();}
if(el.id==='guide-date')guideDate=el.value;
if(el.id==='import-file'&&el.files?.[0])try{await importData(el.files[0]);}catch(err){console.error(err);notify(err.message||'Backup could not be imported');}
});

// The dashboard keeps editing controls out of sight until a deliberate long press.
function showTaskActions(id){
 if(tab!=='home'||modal||!state.tasks.some(t=>t.id===id))return;
 taskActionsId=id;suppressTaskClickUntil=Date.now()+850;
 haptic('hold');render();
}
function clearTaskHold(){if(taskHoldTimer!==null)clearTimeout(taskHoldTimer);taskHoldTimer=null;taskHoldPoint=null;}
document.addEventListener('pointerdown',event=>{
 if(event.button!==0||modal||tab!=='home')return;
 const row=event.target.closest('.dashboard-tasks [data-task-row]');
 if(!row||event.target.closest('input,button'))return;
 clearTaskHold();taskHoldPoint={x:event.clientX,y:event.clientY,id:row.dataset.taskRow};
 taskHoldTimer=setTimeout(()=>{const id=taskHoldPoint?.id;clearTaskHold();if(id)showTaskActions(id);},560);
},{passive:true});
document.addEventListener('pointermove',event=>{
 if(taskHoldPoint && Math.hypot(event.clientX-taskHoldPoint.x,event.clientY-taskHoldPoint.y)>12)clearTaskHold();
},{passive:true});
document.addEventListener('pointerup',clearTaskHold,{passive:true});
document.addEventListener('pointercancel',clearTaskHold,{passive:true});
document.addEventListener('contextmenu',event=>{
 const row=event.target.closest('.dashboard-tasks [data-task-row]');
 if(!row)return;
 event.preventDefault();clearTaskHold();showTaskActions(row.dataset.taskRow);
});
document.addEventListener('click',event=>{
 const row=event.target.closest('.dashboard-tasks [data-task-row]');
 if(row && Date.now()<suppressTaskClickUntil && event.target.closest('.task-check-label')){
   event.preventDefault();event.stopImmediatePropagation();return;
 }
 if(taskActionsId && (!row||row.dataset.taskRow!==taskActionsId))taskActionsId=null;
},true);
document.addEventListener('keydown',event=>{
 const row=event.target.closest?.('.dashboard-tasks [data-task-row]');
 if(row && ((event.shiftKey&&event.key==='F10')||event.key==='ContextMenu'||event.key==='Enter')){
   event.preventDefault();showTaskActions(row.dataset.taskRow);
 }
});

// Workout plan editing stays hidden until a deliberate long press / keyboard menu.
function clearPlanHold(){if(planHoldTimer!==null)clearTimeout(planHoldTimer);planHoldTimer=null;planHoldPoint=null;}
function revealPlanEditor(id){
 if(tab!=='workouts'||modal||!state.templates.some(t=>t.id===id))return;
 planActionsId=id;haptic('hold');render();
}
document.addEventListener('pointerdown',event=>{
 if(event.button!==0||tab!=='workouts'||modal||state.session&&!state.session.minimized)return;
 const card=event.target.closest('[data-plan-card]');
 if(!card||event.target.closest('button,input,select,textarea,a'))return;
 clearPlanHold();planHoldPoint={x:event.clientX,y:event.clientY,id:card.dataset.planCard};
 planHoldTimer=setTimeout(()=>{const id=planHoldPoint?.id;clearPlanHold();if(id)revealPlanEditor(id);},520);
},{passive:true});
document.addEventListener('pointermove',event=>{
 if(planHoldPoint&&Math.hypot(event.clientX-planHoldPoint.x,event.clientY-planHoldPoint.y)>13)clearPlanHold();
},{passive:true});
document.addEventListener('pointerup',clearPlanHold,{passive:true});
document.addEventListener('pointercancel',clearPlanHold,{passive:true});
document.addEventListener('contextmenu',event=>{
 const card=event.target.closest('[data-plan-card]');if(!card)return;
 event.preventDefault();clearPlanHold();revealPlanEditor(card.dataset.planCard);
});
document.addEventListener('keydown',event=>{
 const card=event.target.closest?.('[data-plan-card]');
 if(card&&((event.shiftKey&&event.key==='F10')||event.key==='ContextMenu'||event.key==='Enter')){
  event.preventDefault();revealPlanEditor(card.dataset.planCard);
 }
});
// The meal guide uses press-and-hold to expose edit/delete, just like workout plans.
function clearMealGuideHold(){if(mealGuideHoldTimer!==null)clearTimeout(mealGuideHoldTimer);mealGuideHoldTimer=null;mealGuideHoldPoint=null;}
function showMealGuideActions(id){
 if(tab!=='nutrition'||modal||!mealGuideItems().some(x=>x.id===id))return;
 mealGuideActionsId=id;haptic('hold');render();
}
document.addEventListener('pointerdown',event=>{
 if(event.button!==0||tab!=='nutrition'||modal)return;
 const item=event.target.closest('[data-guide-item]');
 if(!item||event.target.closest('button,input,textarea,select,a'))return;
 clearMealGuideHold();mealGuideHoldPoint={x:event.clientX,y:event.clientY,id:item.dataset.guideItem};
 mealGuideHoldTimer=setTimeout(()=>{const id=mealGuideHoldPoint?.id;clearMealGuideHold();if(id)showMealGuideActions(id);},520);
},{passive:true});
document.addEventListener('pointermove',event=>{
 if(mealGuideHoldPoint&&Math.hypot(event.clientX-mealGuideHoldPoint.x,event.clientY-mealGuideHoldPoint.y)>12)clearMealGuideHold();
},{passive:true});
document.addEventListener('pointerup',clearMealGuideHold,{passive:true});
document.addEventListener('pointercancel',clearMealGuideHold,{passive:true});
document.addEventListener('contextmenu',event=>{
 const item=event.target.closest('[data-guide-item]');if(!item)return;
 event.preventDefault();clearMealGuideHold();showMealGuideActions(item.dataset.guideItem);
});
document.addEventListener('keydown',event=>{
 const item=event.target.closest?.('[data-guide-item]');
 if(item&&((event.shiftKey&&event.key==='F10')||event.key==='ContextMenu'||event.key==='Enter'||event.key===' ')){
  event.preventDefault();showMealGuideActions(item.dataset.guideItem);
 }
});
document.addEventListener('click',event=>{
 if(!mealGuideActionsId)return;
 const item=event.target.closest?.('[data-guide-item]');
 if(!item||item.dataset.guideItem!==mealGuideActionsId){mealGuideActionsId=null;}
},true);

// Horizontal page gestures, without hijacking vertical scroll, fields or active workouts.
const swipeTabs=['home','workouts','nutrition','body'];
function canSwipePages(){return window.matchMedia('(max-width:760px)').matches &&
  !modal && !restSheet && !(state?.session && !state.session.minimized && tab==='workouts') && swipeTabs.includes(tab);
}
document.addEventListener('touchstart',event=>{
 swipeGesture=null;
 if(!canSwipePages()||event.touches.length!==1)return;
 const target=event.target;
 if(target.closest('input,textarea,select,[contenteditable="true"],.tab-row,.photo-compare,.chart-bars,.video-embed,.modal-shade,.timer-sheet,.water-stepper,[role="slider"]'))return;
 const touch=event.touches[0];
 if(touch.clientX<22 || touch.clientX>window.innerWidth-22)return; // Android system back gestures
 swipeGesture={x:touch.clientX,y:touch.clientY,time:Date.now(),tab,tracking:false,frame:null};
},{passive:true});
document.addEventListener('touchmove',event=>{
 const g=swipeGesture;if(!g||!canSwipePages()||event.touches.length!==1)return;
 const t=event.touches[0],dx=t.clientX-g.x,dy=t.clientY-g.y;
 if(Math.abs(dx)<13||Math.abs(dx)<Math.abs(dy)*1.5)return;
 // Navigation wraps from Home to Body and Body to Home.
 g.tracking=true;
 if(g.frame)cancelAnimationFrame(g.frame);
 g.frame=requestAnimationFrame(()=>{const main=$('.main');if(main){main.style.transform=`translate3d(${Math.max(-42,Math.min(42,dx*.17))}px,0,0)`;main.style.opacity=String(Math.max(.8,1-Math.abs(dx)/650));}});
},{passive:true});
document.addEventListener('touchend',event=>{
 const g=swipeGesture;swipeGesture=null;if(g?.frame)cancelAnimationFrame(g.frame);
 const main=$('.main');if(main){main.style.transform='';main.style.opacity='';}
 if(!g||!canSwipePages()||g.tab!==tab||event.changedTouches.length!==1)return;
 const t=event.changedTouches[0],dx=t.clientX-g.x,dy=t.clientY-g.y;
 if(Math.abs(dx)<75 || Math.abs(dx)<Math.abs(dy)*1.5 || Date.now()-g.time>1300)return;
 const index=swipeTabs.indexOf(tab),direction=dx<0?1:-1;
 const next=(index+direction+swipeTabs.length)%swipeTabs.length;
 event.preventDefault();taskActionsId=null;setTab(swipeTabs[next],direction);
},{passive:false});
document.addEventListener('touchcancel',()=>{if(swipeGesture?.frame)cancelAnimationFrame(swipeGesture.frame);swipeGesture=null;const main=$('.main');if(main){main.style.transform='';main.style.opacity='';}},{passive:true});

document.addEventListener('input',event=>{if(event.target.id==='compare-range'){const pct=Number(event.target.value);const layer=$('#compare-before-layer'),handle=$('#compare-handle');if(layer)layer.style.clipPath=`inset(0 ${100-pct}% 0 0)`;if(handle)handle.style.left=pct+'%';}});

document.addEventListener('keydown',event=>{if(event.key==='Escape'){if(modal){if(modal.type==='photo-guide')stopGuideCamera().catch(console.warn);modal=null;render();}else if(restSheet){restSheet=false;render();}}if((event.key==='Enter'||event.key===' ')&&event.target.classList?.contains('floating-workout')){event.preventDefault();event.target.click();}});

async function init(){try{state=await get('state')||INITIAL();if(!state.goals||!state.templates)state=INITIAL();if(!Number.isFinite(n(state.waterDefault))||n(state.waterDefault)<=0)state.waterDefault=250;if(!Array.isArray(state.tasks))state.tasks=INITIAL().tasks;if(!state.preferences||typeof state.preferences!=='object')state.preferences={haptics:true,waterSound:true};if(!['system','light','dark'].includes(state.preferences.themeMode))state.preferences.themeMode='system';if(!state.taskChecks || typeof state.taskChecks!=='object')state.taskChecks={};if(!Array.isArray(state.mealGuideItems))state.mealGuideItems=structuredClone(DEFAULT_MEAL_GUIDE);const defaultBreakfast=state.mealGuideItems.find(item=>item.id==='guide-breakfast');if(defaultBreakfast?.label==='Breakfast'&&defaultBreakfast.description==='2 eggs + 1 slice of toast')defaultBreakfast.label='Eggs & toast';tab=['home','workouts','nutrition','body','settings'].includes(state.lastTab)?state.lastTab:'home';
 bodyPanel=['measurements','photos','weight'].includes(state.lastBodyPanel)?state.lastBodyPanel:'measurements';
 nutritionPanel=['diary','favourites'].includes(state.lastNutritionPanel)?state.lastNutritionPanel:'diary';
 if(state.session){
  exerciseOpen=state.session.activeIndex||0;
  // A focused workout should restore as focused. A minimised session must NOT hijack the last tab.
  if(!state.session.minimized && tab!=='workouts')state.session.minimized=true;
 }await loadPhotoUrls();await put('state',state);render();
window.matchMedia?.('(prefers-color-scheme: dark)')?.addEventListener?.('change',()=>{if(themeChoice()==='system'){applyTheme();render();}});
if('serviceWorker' in navigator && location.protocol!=='file:')navigator.serviceWorker.register('./sw.js').catch(err=>console.warn('Offline install unavailable',err));
try{if(new URLSearchParams(location.search).has('code')){await cloud.finishGoogleLogin();notify('Google Sign-In connected. Open Settings to back up your data.');render();}}catch(err){notify('Google Sign-In: '+err.message);}
setInterval(timerTick,500);
setInterval(async()=>{if(!state.dirty||localStorage.getItem('recomp-auto-sync')!=='yes'||!navigator.onLine||!cloud.getSession())return;try{await pushCloud();}catch(e){console.warn('Auto-sync waiting:',e.message);}},60000);
}catch(err){console.error(err);document.body.innerHTML=`<div style="max-width:500px;margin:10vh auto;padding:25px"><h1>Unable to open Recomp</h1><p>${escapeHtml(err.message)}</p><p>IndexedDB may be blocked in this browser. Please enable site storage and reload.</p></div>`;}}
init();