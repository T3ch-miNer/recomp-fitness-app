// Reminders: water on a schedule, nudges to log meals, and a workout alarm.
// The Android app hands them to the system so they arrive even when Recomp is
// closed. The website can only remind you while it's open.

export const WEEKDAYS=Object.freeze(['Mon','Tue','Wed','Thu','Fri','Sat','Sun']);
export const WATER_INTERVALS=Object.freeze([60,90,120,180]);
const MEALS=Object.freeze([
 {key:'breakfast',label:'Breakfast',default:'09:30'},
 {key:'lunch',label:'Lunch',default:'13:30'},
 {key:'dinner',label:'Dinner',default:'20:00'}
]);
export {MEALS as MEAL_REMINDERS};

// ID ranges keep each kind separate, so saving one never clears another app's alarms.
const IDS={water:41000,meal:42000,workout:43000};
export const MANAGED_ID_MIN=41000,MANAGED_ID_MAX=43999;

export function defaultReminders(){
 return {
  water:{enabled:false,every:120,from:'09:00',to:'21:00'},
  meals:{enabled:false,breakfast:'09:30',lunch:'13:30',dinner:'20:00'},
  workout:{enabled:false,time:'18:00',days:['Mon','Wed','Fri']}
 };
}

const TIME=/^([01]\d|2[0-3]):([0-5]\d)$/;
const cleanTime=(value,fallback)=>TIME.test(String(value||''))?String(value):fallback;
const minutesOf=t=>{const [h,m]=t.split(':').map(Number);return h*60+m;};
const timeOf=min=>`${String(Math.floor(min/60)).padStart(2,'0')}:${String(min%60).padStart(2,'0')}`;

export function cleanReminders(input){
 const d=defaultReminders(),r=input&&typeof input==='object'?input:{};
 const water=r.water||{},meals=r.meals||{},workout=r.workout||{};
 const days=Array.isArray(workout.days)?WEEKDAYS.filter(day=>workout.days.includes(day)):d.workout.days;
 return {
  water:{enabled:Boolean(water.enabled),every:WATER_INTERVALS.includes(Number(water.every))?Number(water.every):d.water.every,
   from:cleanTime(water.from,d.water.from),to:cleanTime(water.to,d.water.to)},
  meals:{enabled:Boolean(meals.enabled),...Object.fromEntries(MEALS.map(m=>[m.key,cleanTime(meals[m.key],m.default)]))},
  workout:{enabled:Boolean(workout.enabled),time:cleanTime(workout.time,d.workout.time),days}
 };
}

// Times for water reminders between "from" and "to", inclusive, capped at 16 a day.
export function waterTimes({every,from,to}){
 const start=minutesOf(from),end=minutesOf(to);
 if(end<=start)return [];
 const out=[];
 for(let t=start;t<=end&&out.length<16;t+=every)out.push(timeOf(t));
 return out;
}

// One daily or weekly repeating notification per time. Weekday follows
// Capacitor's numbering: Sunday is 1, Monday 2 and so on.
export function buildSchedule(settings){
 const r=cleanReminders(settings),out=[];
 const at=t=>{const [hour,minute]=t.split(':').map(Number);return {hour,minute};};
 if(r.water.enabled)waterTimes(r.water).forEach((t,i)=>out.push({id:IDS.water+i,kind:'water',title:'Time for some water',body:'A glass now keeps you on track for your daily goal.',on:at(t)}));
 if(r.meals.enabled)MEALS.forEach((m,i)=>out.push({id:IDS.meal+i,kind:'meal',title:`Log your ${m.label.toLowerCase()}`,body:'Add it while you remember. It only takes a moment.',on:at(r.meals[m.key])}));
 if(r.workout.enabled)r.workout.days.forEach(day=>{
  const weekday=WEEKDAYS.indexOf(day)===6?1:WEEKDAYS.indexOf(day)+2;
  out.push({id:IDS.workout+weekday,kind:'workout',title:'Workout time',body:'Your session is ready. Open Recomp to start.',on:{weekday,...at(r.workout.time)}});
 });
 return out;
}

export function reminderSummary(settings){
 const r=cleanReminders(settings),parts=[];
 if(r.water.enabled){const n=waterTimes(r.water).length;parts.push(`Water ${n}× a day`);}
 if(r.meals.enabled)parts.push('Meal logging 3× a day');
 if(r.workout.enabled&&r.workout.days.length)parts.push(`Workout ${r.workout.days.join(', ')} at ${r.workout.time}`);
 return parts.length?parts.join(' · '):'No reminders on';
}

const plugin=()=>globalThis.Capacitor?.isNativePlatform?.()?globalThis.Capacitor?.Plugins?.LocalNotifications:null;
export const nativeRemindersAvailable=()=>typeof plugin()?.schedule==='function';

// Replaces every reminder Recomp manages with the new schedule.
export async function applyReminders(settings){
 const ln=plugin();
 if(!ln)return {scheduled:0,native:false};
 const wanted=buildSchedule(settings);
 const pending=await ln.getPending().catch(()=>({notifications:[]}));
 const ours=(pending?.notifications||[]).filter(n=>n.id>=MANAGED_ID_MIN&&n.id<=MANAGED_ID_MAX);
 if(ours.length)await ln.cancel({notifications:ours.map(n=>({id:n.id}))});
 if(!wanted.length)return {scheduled:0,native:true};
 let perm=await ln.checkPermissions();
 if(perm.display!=='granted')perm=await ln.requestPermissions();
 if(perm.display!=='granted')throw Error('Notifications are turned off for Recomp. Allow them in Android settings to get reminders.');
 await ln.schedule({notifications:wanted.map(n=>({id:n.id,title:n.title,body:n.body,
  schedule:{on:n.on,allowWhileIdle:true},extra:{recompReminder:n.kind}}))});
 return {scheduled:wanted.length,native:true};
}

export async function exactAlarmStatus(){
 const ln=plugin();
 if(typeof ln?.checkExactNotificationSetting!=='function')return 'granted';
 try{return (await ln.checkExactNotificationSetting()).exact_alarm||'granted';}catch{return 'granted';}
}
export async function openExactAlarmSettings(){
 const ln=plugin();
 if(typeof ln?.changeExactNotificationSetting==='function')await ln.changeExactNotificationSetting();
}

// Tapping a reminder opens the page it's about.
export function onReminderTap(navigate){
 const ln=plugin();
 if(typeof ln?.addListener!=='function')return;
 ln.addListener('localNotificationActionPerformed',event=>{
  const kind=event?.notification?.extra?.recompReminder;
  navigate(kind==='workout'?'workouts':kind==='meal'?'nutrition':'home');
 });
}

// Website: while Recomp is open, return reminders due in the last minute.
export function dueNow(settings,now=new Date()){
 const hhmm=timeOf(now.getHours()*60+now.getMinutes());
 const weekday=now.getDay()===0?1:now.getDay()+1;
 return buildSchedule(settings).filter(n=>timeOf(n.on.hour*60+n.on.minute)===hhmm&&(n.on.weekday==null||n.on.weekday===weekday));
}

const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function renderReminderSettings(settings,{native=false,exact='granted'}={}){
 const r=cleanReminders(settings);
 const sw=(name,on,label)=>`<label class="reminder-switch"><input type="checkbox" name="${name}" ${on?'checked':''}/><span class="reminder-switch-track" aria-hidden="true"></span><span class="reminder-switch-label">${label}</span></label>`;
 return `<form id="form-reminders" class="reminders-form">
 <fieldset class="reminder-group"><legend class="sr-only">Water</legend>
  ${sw('water-enabled',r.water.enabled,'Drink water')}
  <div class="reminder-fields">
   <label class="field"><span class="label">Every</span><select class="input" name="water-every">${WATER_INTERVALS.map(m=>`<option value="${m}" ${m===r.water.every?'selected':''}>${m<60?m+' min':m%60?`${Math.floor(m/60)}h ${m%60}m`:`${m/60} hour${m===60?'':'s'}`}</option>`).join('')}</select></label>
   <label class="field"><span class="label">From</span><input class="input" type="time" name="water-from" value="${esc(r.water.from)}"/></label>
   <label class="field"><span class="label">Until</span><input class="input" type="time" name="water-to" value="${esc(r.water.to)}"/></label>
  </div>
 </fieldset>
 <fieldset class="reminder-group"><legend class="sr-only">Meal logging</legend>
  ${sw('meals-enabled',r.meals.enabled,'Log my meals')}
  <div class="reminder-fields">${MEALS.map(m=>`<label class="field"><span class="label">${m.label}</span><input class="input" type="time" name="meal-${m.key}" value="${esc(r.meals[m.key])}"/></label>`).join('')}</div>
 </fieldset>
 <fieldset class="reminder-group"><legend class="sr-only">Workout alarm</legend>
  ${sw('workout-enabled',r.workout.enabled,'Workout alarm')}
  <div class="reminder-fields reminder-fields-workout">
   <label class="field"><span class="label">Time</span><input class="input" type="time" name="workout-time" value="${esc(r.workout.time)}"/></label>
   <div class="reminder-days" role="group" aria-label="Workout days">${WEEKDAYS.map(d=>`<label class="reminder-day"><input type="checkbox" name="workout-day" value="${d}" ${r.workout.days.includes(d)?'checked':''}/><span>${d.slice(0,2)}</span></label>`).join('')}</div>
  </div>
 </fieldset>
 ${native&&r.workout.enabled&&exact!=='granted'?'<div class="reminder-note"><p>Android may deliver alarms a few minutes late. Allow on-time alarms for the workout alarm to ring exactly.</p><button type="button" class="btn" data-action="reminders-exact">Allow on-time alarms</button></div>':''}
 <p class="hint">${native?'Reminders arrive even when Recomp is closed. They are set on this phone only.':'On the website, reminders only appear while Recomp is open. Install the Android app to get them when it\'s closed.'}</p>
 <button type="submit" class="btn primary block">Save reminders</button>
</form>`;
}

export function readReminderForm(form){
 const data=new FormData(form);
 return cleanReminders({
  water:{enabled:data.get('water-enabled')==='on',every:Number(data.get('water-every')),from:data.get('water-from'),to:data.get('water-to')},
  meals:{enabled:data.get('meals-enabled')==='on',...Object.fromEntries(MEALS.map(m=>[m.key,data.get('meal-'+m.key)]))},
  workout:{enabled:data.get('workout-enabled')==='on',time:data.get('workout-time'),days:data.getAll('workout-day')}
 });
}
