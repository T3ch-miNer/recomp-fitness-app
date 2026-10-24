// Historical records are read-only in these views. Existing saved history is not migrated.
const safe=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const amount=value=>Number.isFinite(Number(value))?Number(value):0;
const pretty=value=>Math.round(amount(value)*10)/10;
const stamp=record=>{
 const ended=Number(record?.endedAt),started=Number(record?.startedAt);
 if(Number.isFinite(ended)&&ended>0)return ended;
 if(Number.isFinite(started)&&started>0)return started;
 const date=Date.parse(String(record?.date||''));return Number.isFinite(date)?date:0;
};
const dateLabel=value=>{
 const date=new Date(String(value||'')+'T12:00:00');
 return Number.isFinite(date.valueOf())?date.toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short',year:'numeric'}):'Undated';
};
export function orderedWorkoutPlans(plans=[],history=[]){
 const uniqueNames=new Map();
 for(const p of plans)uniqueNames.set(p.name,(uniqueNames.get(p.name)||0)+1);
 const byId=new Map(plans.map(p=>[String(p.id),p]));
 const byName=new Map(plans.filter(p=>uniqueNames.get(p.name)===1).map(p=>[p.name,p]));
 const completedAt=new Map();
 for(const entry of history){
  const plan=entry?.templateId!=null?byId.get(String(entry.templateId)):byName.get(entry?.name);
  if(!plan)continue;
  const key=String(plan.id);
  completedAt.set(key,Math.max(completedAt.get(key)||0,stamp(entry)||1));
 }
 return plans.map((plan,index)=>({plan,index,completedAt:completedAt.get(String(plan.id))||0}))
  .sort((a,b)=>{
   if(Boolean(a.completedAt)!==Boolean(b.completedAt))return a.completedAt?1:-1;
   if(a.completedAt!==b.completedAt)return a.completedAt-b.completedAt;
   return a.index-b.index;
  }).map(item=>item.plan);
}
export function workoutHistoryHtml(history=[]){
 const sorted=[...history].sort((a,b)=>stamp(b)-stamp(a));
 return `<section class="history-screen" aria-labelledby="workout-history-title">
 <button class="btn history-back" type="button" data-action="history-close">← Back to workout plans</button>
 <div class="history-page-head"><div class="eyebrow">TRAINING LOG</div><h1 class="page-title" id="workout-history-title">Workout history</h1><p class="muted small">${sorted.length} saved session${sorted.length===1?'':'s'} · newest first</p></div>
 ${sorted.length?sorted.map(entry=>{
 const exercises=Array.isArray(entry.exercises)?entry.exercises:[];
 const items=exercises.map(e=>{
  const done=(Array.isArray(e.sets)?e.sets:[]).filter(set=>set.done);
  if(!done.length)return '';
  const unit=e.unit==='seconds'?'sec':e.unit==='minutes'?'min':'reps';
  return `<div class="history-exercise"><b>${safe(e.name||'Exercise')}</b><span>${done.length} completed set${done.length===1?'':'s'}</span><div class="history-set-values">${done.map(set=>`<span>${pretty(set.kg)} kg · ${pretty(set.reps)} ${unit}</span>`).join('')}</div></div>`;
 }).filter(Boolean).join('');
 return `<details class="history-record"><summary><span class="history-record-icon" aria-hidden="true">✓</span><span class="history-record-copy"><strong>${safe(entry.name||'Workout')}</strong><small>${safe(dateLabel(entry.date))} · ${pretty(entry.sets)} sets · ${pretty(entry.durationMin)} min</small></span><span class="history-chevron" aria-hidden="true">⌄</span></summary>
 <div class="history-record-body"><div class="history-stats"><span><b>${pretty(entry.sets)}</b><small>Working sets</small></span><span><b>${pretty(entry.durationMin)} min</b><small>Duration</small></span><span><b>${Math.round(amount(entry.volume)).toLocaleString('en-GB')} kg</b><small>Volume</small></span></div>${items||'<p class="muted small">No exercise breakdown was saved for this session.</p>'}</div>
 </details>`;
 }).join(''):'<div class="card history-empty"><b>No completed workouts yet</b><p class="muted small">Finish a workout to see its sets, duration and training history here.</p></div>'}
 </section>`;
}
export function foodHistoryHtml(entries=[]){
 const groups=new Map();
 for(const item of entries){
  const date=/^\d{4}-\d{2}-\d{2}$/.test(String(item?.date||''))?item.date:'Undated';
  if(!groups.has(date))groups.set(date,[]);
  groups.get(date).push(item);
 }
 const dates=[...groups.keys()].sort((a,b)=>b.localeCompare(a));
 return `<section class="history-screen" aria-labelledby="food-history-title"><button class="btn history-back" type="button" data-action="history-close">← Back to food diary</button><div class="history-page-head"><div class="eyebrow">FOOD DIARY</div><h1 class="page-title" id="food-history-title">Food history</h1><p class="muted small">${dates.length} logged day${dates.length===1?'':'s'} · newest first</p></div>
 ${dates.length?dates.map((day,i)=>{
  const foods=groups.get(day),kcal=foods.reduce((sum,f)=>sum+amount(f.calories),0),protein=foods.reduce((sum,f)=>sum+amount(f.protein),0);
  return `<details class="history-record history-food-day" ${i===0?'open':''}><summary><span class="history-record-icon" aria-hidden="true">◷</span><span class="history-record-copy"><strong>${day==='Undated'?'Undated':safe(dateLabel(day))}</strong><small>${foods.length} food entr${foods.length===1?'y':'ies'} · ${Math.round(kcal).toLocaleString('en-GB')} kcal</small></span><span class="history-chevron" aria-hidden="true">⌄</span></summary>
 <div class="history-record-body"><div class="history-stats history-food-stats"><span><b>${Math.round(kcal).toLocaleString('en-GB')}</b><small>kcal logged</small></span><span><b>${pretty(protein)} g</b><small>Protein</small></span></div>
 ${foods.slice().reverse().map(item=>`<div class="history-food-entry"><div><b>${safe(item.name||'Food')}</b><small>${safe(item.meal||'Meal')}</small></div><span>${Math.round(amount(item.calories))} kcal</span></div>`).join('')}</div></details>`;
 }).join(''):'<div class="card history-empty"><b>No food entries yet</b><p class="muted small">Log a meal to start your food history.</p></div>'}</section>`;
}
