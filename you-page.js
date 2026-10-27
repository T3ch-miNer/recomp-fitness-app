// The You dashboard keeps wellbeing events device-local. It is deliberately not part
// of Recomp's cloud-backed fitness state, so phone usage is never uploaded by backup.
const KEY='recomp-you-local-v1';
const DEFAULT_HABITS=[
 {id:'rest',label:'Make time to unwind'},
 {id:'focus',label:'Take a screen-free break'},
 {id:'sleep',label:'Keep a regular sleep routine'}
];
export const isNativeWellbeingAvailable=()=>Boolean(globalThis.Capacitor?.isNativePlatform?.()&&
 typeof globalThis.Capacitor?.Plugins?.RecompWellbeing?.readDay==='function');
export function getYouData(){
 try {
  const data=JSON.parse(localStorage.getItem(KEY)||'{}');
  return {
   habits:Array.isArray(data.habits)?data.habits.filter(h=>h&&typeof h.id==='string'&&typeof h.label==='string').slice(0,12):DEFAULT_HABITS,
   checks:data.checks&&typeof data.checks==='object'?data.checks:{},
   device:data.device&&typeof data.device==='object'?data.device:{}
  };
 }catch{return {habits:DEFAULT_HABITS,checks:{},device:{}};}
}
const store=data=>localStorage.setItem(KEY,JSON.stringify(data));
export function setYouHabit(id,date,checked){
 const d=getYouData();
 if(!d.habits.some(h=>h.id===id))return;
 d.checks[date]??={};
 d.checks[date][id]=Boolean(checked);
 store(d);
}
export function addYouHabit(label){
 const cleaned=String(label||'').trim().slice(0,70);
 if(!cleaned)throw Error('Enter a habit name.');
 const d=getYouData();
 if(d.habits.length>=12)throw Error('Maximum 12 habits.');
 d.habits.push({id:'custom-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,7),label:cleaned});
 store(d);
}
export function removeYouHabit(id){
 const d=getYouData();
 d.habits=d.habits.filter(h=>h.id!==id);
 store(d);
}
export function todayHabitStats(data,date){
 const list=data.habits||[];
 const completed=list.filter(h=>data.checks?.[date]?.[h.id]===true).length;
 return {completed,total:list.length,all:list.length>0&&completed===list.length};
}
export function habitStreak(data,date){
 // An unfinished current day does not immediately reset yesterday's streak.
 let cursor=new Date(date+'T12:00:00');
 let days=0;
 if(!todayHabitStats(data,date).all)cursor.setDate(cursor.getDate()-1);
 for(let i=0;i<365;i++){
  const key=cursor.getFullYear()+'-'+String(cursor.getMonth()+1).padStart(2,'0')+'-'+String(cursor.getDate()).padStart(2,'0');
  if(!todayHabitStats(data,key).all)break;
  days++;cursor.setDate(cursor.getDate()-1);
 }
 return days;
}
export function validateDeviceDay(payload,date){
 if(!payload||payload.date!==date)throw Error('Unexpected date returned by Android.');
 const minutes=Number(payload.screenMinutes),unlocks=Number(payload.unlocks);
 if(!Number.isFinite(minutes)||minutes<0||minutes>1440||!Number.isInteger(unlocks)||unlocks<0||unlocks>3000)throw Error('Invalid wellbeing statistics.');
 return {date,screenMinutes:Math.round(minutes),unlocks,recordedAt:new Date().toISOString()};
}
export async function readAndroidWellbeingDay(date){
 if(!isNativeWellbeingAvailable())throw Error('Automatic phone usage is only available in the Android app.');
 return validateDeviceDay(await globalThis.Capacitor.Plugins.RecompWellbeing.readDay({date}),date);
}
export async function openUsageSettings(){
 if(!isNativeWellbeingAvailable())throw Error('Install the Recomp Android app to access Android Usage Access settings.');
 await globalThis.Capacitor.Plugins.RecompWellbeing.openUsageSettings();
}
export function rememberDeviceDay(data){
 const d=getYouData();d.device[data.date]=validateDeviceDay(data,data.date);
 const cutoff=Date.now()-31*86400000;
 for(const key of Object.keys(d.device))if(Date.parse(key+'T12:00:00')<cutoff)delete d.device[key];
 store(d);
}
export function clearDeviceDays(){const d=getYouData();d.device={};store(d);}
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const prettyMinutes=value=>value==null?'Not connected':Math.floor(value/60)+'h '+String(value%60).padStart(2,'0')+'m';
export function renderYouPage({date,activity,stepGoal,dailyTasksDone=0,dailyTasksTotal=0}){
 const data=getYouData(),habit=todayHabitStats(data,date),streak=habitStreak(data,date);
 const device=data.device[date],native=isNativeWellbeingAvailable();
 const steps=Math.max(0,Number(activity?.steps)||0),goal=Math.max(1,Number(stepGoal)||8000);
 return `<header class="you-header"><span class="eyebrow">Your wellbeing</span><h1 class="page-title">You.</h1><p class="subhead">Small daily wins, without the pressure.</p></header>
 <section class="you-card you-hero" aria-label="Daily consistency">
  <div class="you-card-top"><span class="eyebrow">Habit streak</span><span class="you-flame" aria-hidden="true">✦</span></div>
  <div class="you-big">${streak} <small>day${streak===1?'':'s'}</small></div>
  <p>${habit.all?'Your wellbeing habits are complete today.':'Check off your habits when they genuinely fit your day.'}</p>
  <div class="you-bar" role="progressbar" aria-valuemin="0" aria-valuemax="${habit.total}" aria-valuenow="${habit.completed}" aria-label="Habits completed"><span style="width:${habit.total?Math.round(100*habit.completed/habit.total):0}%"></span></div>
  <p class="you-caption">${habit.completed} of ${habit.total} wellbeing habits · ${dailyTasksDone} of ${dailyTasksTotal} Recomp tasks today</p>
 </section>
 <div class="you-section-title"><h2>Daily movement</h2><span>${esc(activity?.source||'Manual or not recorded')}</span></div>
 <section class="you-card">
  <div class="you-card-top"><strong>Steps</strong><span class="you-muted">Goal ${goal.toLocaleString('en-GB')}</span></div>
  <div class="you-big">${steps.toLocaleString('en-GB')}</div>
  <div class="you-bar" role="progressbar" aria-valuemin="0" aria-valuemax="${goal}" aria-valuenow="${Math.min(steps,goal)}" aria-label="Step goal progress"><span style="width:${Math.min(100,Math.round(steps/goal*100))}%"></span></div>
  <div class="you-actions">${native?'<button type="button" class="btn primary" data-action="you-sync-steps">Sync Health Connect</button>':'<button type="button" class="btn" data-action="activity">Enter steps manually</button>'}</div>
  <p class="you-caption">No direct Google Fit access. On Android, Recomp reads permitted Health Connect totals.</p>
 </section>
 <div class="you-section-title"><h2>Digital wellbeing</h2><span>${native?'Android device':'Web version'}</span></div>
 <div class="you-metrics">
  <section class="you-card"><span class="you-muted">Screen-on time</span><strong class="you-metric-value">${device?prettyMinutes(device.screenMinutes):'—'}</strong><small class="you-caption">Approximate, today</small></section>
  <section class="you-card"><span class="you-muted">Phone unlocks</span><strong class="you-metric-value">${device?device.unlocks:'—'}</strong><small class="you-caption">Estimated keyguard unlocks</small></section>
 </div>
 <section class="you-card">
  <p class="you-caption">${native?'Usage Access is optional. Android only supplies local statistics after you enable it in system settings.':'Automatic screen time and phone unlocks require the Android APK. iPhone and other browsers can still use habits and fitness tracking.'}</p>
  ${native?'<div class="you-actions"><button class="btn" data-action="you-usage-settings">Usage Access settings</button><button class="btn primary" data-action="you-refresh-device">Refresh usage</button></div>':''}
  ${device?'<button class="btn ghost" data-action="you-clear-device">Clear local usage history</button>':''}
 </section>
 <div class="you-section-title"><h2>Daily wellbeing habits</h2><span>${habit.completed} of ${habit.total}</span></div>
 <section class="you-card you-habit-list" aria-label="Daily habits">
  ${data.habits.length?data.habits.map(h=>`<div class="you-habit"><label><input type="checkbox" data-you-habit="${esc(h.id)}" ${data.checks?.[date]?.[h.id]?'checked':''}/><span>${esc(h.label)}</span></label><button class="you-remove-habit" data-action="you-remove-habit" data-id="${esc(h.id)}" aria-label="Remove ${esc(h.label)}">×</button></div>`).join(''):'<p class="you-caption">Add one small habit to begin.</p>'}
  <form id="you-add-habit-form" class="you-add-form"><input class="input" name="habit" type="text" maxlength="70" placeholder="Add your own habit" required aria-label="New wellbeing habit"/><button type="submit" class="btn primary">Add</button></form>
  <p class="you-caption">Habits and phone usage are saved only on this device, not in cloud backup. You can take rest days.</p>
 </section>`;
}
