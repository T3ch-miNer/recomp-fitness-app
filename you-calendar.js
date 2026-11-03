// You page calendar: a month view of the days you trained, weighed in, took a
// progress photo or wrote a note, plus a one-day overview with a journal note.
// Pure functions only. app.js passes in the saved records and handles saving.

export const MOODS=Object.freeze([
 {id:'great',label:'Great'},
 {id:'good',label:'Good'},
 {id:'okay',label:'Okay'},
 {id:'tough',label:'Tough'}
]);
export const NOTE_LIMIT=1000;

const pad=n=>String(n).padStart(2,'0');
export const isoDate=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
export const monthKey=date=>String(date).slice(0,7);
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export function shiftMonth(key,delta){
 const [y,m]=String(key).split('-').map(Number);
 const d=new Date(y,m-1+delta,1,12);
 return `${d.getFullYear()}-${pad(d.getMonth()+1)}`;
}

// Weeks start on Monday. Days outside the month are null so the grid lines up.
export function monthGrid(key){
 const [y,m]=String(key).split('-').map(Number);
 const first=new Date(y,m-1,1,12);
 const days=new Date(y,m,0,12).getDate();
 const lead=(first.getDay()+6)%7;
 const cells=Array(lead).fill(null);
 for(let day=1;day<=days;day++)cells.push(`${y}-${pad(m)}-${pad(day)}`);
 while(cells.length%7)cells.push(null);
 const weeks=[];
 for(let i=0;i<cells.length;i+=7)weeks.push(cells.slice(i,i+7));
 return weeks;
}

export function cleanNote(input){
 const text=String(input?.text??'').replace(/\r\n/g,'\n').trim().slice(0,NOTE_LIMIT);
 const mood=MOODS.some(m=>m.id===input?.mood)?input.mood:null;
 return {text,mood};
}

// Everything recorded for one date, gathered from the app's saved records.
export function dayOverview(date,{workoutHistory=[],food=[],activity=[],weights=[],photos=[],dayNotes={},device={},habits=[],checks={}}={}){
 const workouts=workoutHistory.filter(w=>w?.date===date).map(w=>({name:w.name,durationMin:Number(w.durationMin)||0,sets:Number(w.sets)||0}));
 const meals=food.filter(f=>f?.date===date);
 const kcal=Math.round(meals.reduce((t,f)=>t+(Number(f.calories)||0),0));
 const protein=Math.round(meals.reduce((t,f)=>t+(Number(f.protein)||0),0));
 const steps=Number(activity.find(a=>a?.date===date)?.steps)||0;
 const weightEntries=weights.filter(w=>w?.date===date&&Number.isFinite(Number(w.kg)));
 const weight=weightEntries.length?Number(weightEntries.at(-1).kg):null;
 const dayPhotos=photos.filter(p=>p?.date===date);
 const note=dayNotes?.[date]?cleanNote(dayNotes[date]):{text:'',mood:null};
 const usage=device?.[date]||null;
 const habitsDone=habits.filter(h=>checks?.[date]?.[h.id]===true).length;
 return {date,workouts,meals:meals.length,kcal,protein,steps,weight,photos:dayPhotos,note,
  screenMinutes:usage?Number(usage.screenMinutes):null,unlocks:usage?Number(usage.unlocks):null,
  habitsDone,habitsTotal:habits.length};
}

export function dayMarks(overview){
 return {
  workout:overview.workouts.length>0,
  weight:overview.weight!=null,
  photo:overview.photos.length>0,
  note:Boolean(overview.note.text||overview.note.mood)
 };
}

const MARK_LABELS={workout:'Workout',weight:'Weight',photo:'Photo',note:'Note'};
const longDate=date=>new Date(date+'T12:00:00').toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long'});
const shortDate=date=>new Date(date+'T12:00:00').toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short'});
const monthTitle=key=>new Date(key+'-01T12:00:00').toLocaleDateString('en-GB',{month:'long',year:'numeric'});
const hm=min=>`${Math.floor(min/60)}h ${pad(min%60)}m`;

export function renderCalendar({month,selected,today,marksFor}){
 const atCurrent=month>=monthKey(today);
 const weeks=monthGrid(month);
 const cells=weeks.flat().map(date=>{
  if(!date)return '<span class="you-cal-empty" aria-hidden="true"></span>';
  const future=date>today;
  const marks=future?{}:marksFor(date);
  const dots=Object.keys(MARK_LABELS).filter(k=>marks[k]).map(k=>`<i class="you-cal-dot ${k}"></i>`).join('');
  const said=Object.keys(MARK_LABELS).filter(k=>marks[k]).map(k=>MARK_LABELS[k]).join(', ');
  const day=Number(date.slice(8));
  return `<button type="button" class="you-cal-day${date===today?' today':''}${date===selected?' selected':''}" data-action="you-cal-day" data-date="${date}" ${future?'disabled':''} aria-pressed="${date===selected}" aria-label="${esc(longDate(date))}${said?': '+said:''}"><span>${day}</span><span class="you-cal-dots" aria-hidden="true">${dots}</span></button>`;
 }).join('');
 return `<section class="you-card you-calendar" aria-label="Calendar">
 <div class="you-cal-head">
  <button type="button" class="btn round you-cal-nav" data-action="you-cal-prev" aria-label="Previous month">‹</button>
  <h2>${esc(monthTitle(month))}</h2>
  <button type="button" class="btn round you-cal-nav" data-action="you-cal-next" aria-label="Next month" ${atCurrent?'disabled':''}>›</button>
 </div>
 <div class="you-cal-grid" role="group" aria-label="${esc(monthTitle(month))}">
  ${['M','T','W','T','F','S','S'].map(d=>`<span class="you-cal-weekday" aria-hidden="true">${d}</span>`).join('')}
  ${cells}
 </div>
 <div class="you-cal-legend" aria-hidden="true">${Object.entries(MARK_LABELS).map(([k,l])=>`<span><i class="you-cal-dot ${k}"></i>${l}</span>`).join('')}</div>
 </section>`;
}

export function renderDayDetail(o,{today,photoUrlFor=()=>null}={}){
 const isToday=o.date===today;
 const workout=o.workouts.length?o.workouts.map(w=>`${esc(w.name)} · ${w.durationMin} min · ${w.sets} set${w.sets===1?'':'s'}`).join('<br/>'):'Rest day';
 const stats=[
  ['Food',o.meals?`${o.kcal.toLocaleString('en-GB')} kcal`:'—',o.meals?`${o.protein} g protein`:'Not logged'],
  ['Steps',o.steps?o.steps.toLocaleString('en-GB'):'—',''],
  ['Weight',o.weight!=null?`${o.weight} kg`:'—',''],
  ['Screen',o.screenMinutes!=null?hm(o.screenMinutes):'—',o.unlocks!=null?`${o.unlocks} unlocks`:'']
 ];
 if(o.habitsTotal)stats.push(['Habits',`${o.habitsDone}/${o.habitsTotal}`,'']);
 const photos=o.photos.map(p=>{const url=photoUrlFor(p.id);return url?`<img src="${esc(url)}" alt="Progress photo, ${esc(p.view||'')} view" loading="lazy"/>`:'<span class="you-day-photo-missing">Photo saved</span>';}).join('');
 const quick=isToday&&(o.weight==null||!o.photos.length)?`<div class="you-actions">${o.weight==null?'<button type="button" class="btn" data-action="add-weight">Log weight</button>':''}${!o.photos.length?'<button type="button" class="btn" data-action="add-photo">Add photo</button>':''}</div>`:'';
 return `<section class="you-card you-day" aria-labelledby="you-day-title">
 <div class="you-card-top"><h2 id="you-day-title" aria-label="${esc(longDate(o.date))}">${esc(shortDate(o.date))}</h2>${isToday?'<span class="you-muted">Today</span>':''}</div>
 <p class="you-day-workout"><span>Workout</span><b>${workout}</b></p>
 <dl class="you-day-stats">${stats.map(([k,v,sub])=>`<div><dt>${k}</dt><dd>${v}${sub?`<small>${sub}</small>`:''}</dd></div>`).join('')}</dl>
 ${photos?`<div class="you-day-photos">${photos}</div>`:''}
 ${quick}
 <form id="you-day-note-form" class="you-day-note" data-date="${o.date}">
  <span class="you-day-label" id="you-mood-label">How did the day go?</span>
  <div class="you-moods" role="radiogroup" aria-labelledby="you-mood-label">${MOODS.map(m=>`<label class="you-mood ${m.id}"><input type="radio" name="mood" value="${m.id}" ${o.note.mood===m.id?'checked':''}/><span>${m.label}</span></label>`).join('')}</div>
  <textarea id="you-day-note" class="input" name="note" rows="2" maxlength="${NOTE_LIMIT}" placeholder="A few words about your day: energy, sleep, wins, what got in the way." aria-label="Note for ${esc(longDate(o.date))}">${esc(o.note.text)}</textarea>
  <button type="submit" class="btn primary">${o.note.text||o.note.mood?'Update note':'Save note'}</button>
 </form>
 </section>`;
}
