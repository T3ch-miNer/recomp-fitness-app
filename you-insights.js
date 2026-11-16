// You page charts: mood over recent weeks, workouts per week, a week of
// screen time, and one plain-English line that links them. Pure functions.

const pad=n=>String(n).padStart(2,'0');
const iso=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const hm=min=>{const m=Math.round(min);return m<60?`${m} min`:`${Math.floor(m/60)}h ${pad(m%60)}m`;};
export function daysBack(today,count){
 const out=[],d=new Date(today+'T12:00:00');
 for(let i=count-1;i>=0;i--){const x=new Date(d);x.setDate(d.getDate()-i);out.push(iso(x));}
 return out;
}
// Monday of the week holding `date`.
export function weekStart(date){const d=new Date(date+'T12:00:00');d.setDate(d.getDate()-((d.getDay()+6)%7));return iso(d);}

export const MOOD_SCORE=Object.freeze({great:4,good:3,okay:2,tough:1});
const MOOD_LABEL={great:'Great',good:'Good',okay:'Okay',tough:'Tough'};

export function moodSeries(dayNotes={},today,days=28){
 return daysBack(today,days).map(date=>{const mood=dayNotes?.[date]?.mood;return {date,mood:MOOD_SCORE[mood]?mood:null};});
}

export function workoutWeeks(history=[],today,weeks=8){
 const thisWeek=weekStart(today),starts=[];
 const d=new Date(thisWeek+'T12:00:00');
 for(let i=weeks-1;i>=0;i--){const x=new Date(d);x.setDate(d.getDate()-7*i);starts.push(iso(x));}
 const counts=new Map(starts.map(s=>[s,0]));
 for(const w of history){if(!w?.date)continue;const s=weekStart(w.date);if(counts.has(s))counts.set(s,counts.get(s)+1);}
 return starts.map(start=>({start,count:counts.get(start)}));
}

// Weeks in a row with at least one workout. The current week only counts once
// it has a workout, so an early Monday never breaks a streak.
export function weekStreak(history=[],today){
 const done=new Set(history.filter(w=>w?.date).map(w=>weekStart(w.date)));
 const d=new Date(weekStart(today)+'T12:00:00');
 if(!done.has(iso(d)))d.setDate(d.getDate()-7);
 let n=0;
 while(done.has(iso(d))&&n<520){n++;d.setDate(d.getDate()-7);}
 return n;
}

export function screenWeek(device={},today){
 return daysBack(today,7).map(date=>({date,minutes:Number.isFinite(Number(device?.[date]?.screenMinutes))&&device?.[date]?Number(device[date].screenMinutes):null}));
}

// One line linking training, screen time and mood over the past two weeks.
// It only speaks when there's enough data to say something fair.
export function weeklyInsight({history=[],device={},dayNotes={},today}){
 const days=daysBack(today,14).filter(d=>d<today||device?.[d]);
 const trained=new Set(history.map(w=>w?.date));
 const screen=d=>device?.[d]?Number(device[d].screenMinutes):null;
 const avg=list=>list.reduce((a,b)=>a+b,0)/list.length;
 const on=days.filter(d=>trained.has(d)&&screen(d)!=null).map(screen),off=days.filter(d=>!trained.has(d)&&screen(d)!=null).map(screen);
 if(on.length>=2&&off.length>=2){
  const diff=Math.round(avg(off)-avg(on));
  if(diff>=15)return `On days you trained, your screen time was ${hm(diff)} lower.`;
  if(diff<=-15)return `On days you trained, your screen time was ${hm(-diff)} higher. Busy days can do that.`;
  return 'Your screen time stays about the same whether or not you train.';
 }
 const moods=d=>MOOD_SCORE[dayNotes?.[d]?.mood]||null;
 const mOn=days.filter(d=>trained.has(d)&&moods(d)).map(moods),mOff=days.filter(d=>!trained.has(d)&&moods(d)).map(moods);
 if(mOn.length>=2&&mOff.length>=2){
  const diff=avg(mOn)-avg(mOff);
  if(diff>=.4)return 'You tend to rate your day higher when you train.';
  if(diff<=-.4)return 'Training days have felt tougher lately. Check you’re resting enough.';
  return 'Your mood is steady on training and rest days alike.';
 }
 const sessions=history.filter(w=>daysBack(today,7).includes(w?.date)).length;
 if(sessions)return `${sessions} workout${sessions===1?'':'s'} this past week. Log your mood and screen time to see how they connect.`;
 return 'Log a workout, your mood or screen time for a few days and a weekly insight appears here.';
}

const MOOD_COLOR={great:'var(--you-great)',good:'var(--you-good)',okay:'var(--you-okay)',tough:'var(--you-tough)'};
export function moodCard(series){
 const logged=series.filter(s=>s.mood);
 const counts=Object.keys(MOOD_SCORE).map(k=>[k,logged.filter(s=>s.mood===k).length]).filter(([,n])=>n);
 const bars=series.map(s=>`<span class="mood-bar${s.mood?'':' none'}" style="${s.mood?`height:${MOOD_SCORE[s.mood]*25}%;background:${MOOD_COLOR[s.mood]}`:''}" title="${esc(s.date)}${s.mood?': '+MOOD_LABEL[s.mood]:''}"></span>`).join('');
 return `<section class="you-card you-chart-card" aria-labelledby="you-mood-title">
 <div class="you-card-top"><h2 id="you-mood-title">Mood</h2><span class="you-muted">Last 4 weeks</span></div>
 ${logged.length?`<div class="mood-chart" role="img" aria-label="Mood over the last 28 days: ${counts.map(([k,n])=>`${n} ${MOOD_LABEL[k].toLowerCase()}`).join(', ')}">${bars}</div>
 <div class="mood-legend">${counts.map(([k,n])=>`<span><i style="background:${MOOD_COLOR[k]}"></i>${n} ${MOOD_LABEL[k]}</span>`).join('')}</div>`:
 '<p class="you-caption">Tap a day in the calendar and pick how it went. Your moods build up here.</p>'}
 </section>`;
}

export function trainingCard(weeks,{streak=0,target=null}={}){
 const max=Math.max(target||0,...weeks.map(w=>w.count),1);
 const label=d=>new Date(d+'T12:00:00').toLocaleDateString('en-GB',{day:'numeric',month:'short'});
 const now=weeks.at(-1)?.count||0,total=weeks.reduce((a,w)=>a+w.count,0);
 return `<section class="you-card you-chart-card" aria-labelledby="you-train-title">
 <div class="you-card-top"><h2 id="you-train-title">Training</h2><span class="you-muted">${streak?`${streak}-week streak`:'Workouts per week'}</span></div>
 <div class="you-stat-row"><span><b>${now}</b>${target?` / ${target}`:''} this week</span><span><b>${total}</b> in 8 weeks</span></div>
 <div class="week-bars" role="img" aria-label="Workouts per week for 8 weeks: ${weeks.map(w=>w.count).join(', ')}">
  ${target?`<span class="week-target" style="bottom:${Math.round(target/max*100)}%"></span>`:''}
  ${weeks.map((w,i)=>`<span class="week-col"><span class="week-bar${i===weeks.length-1?' now':''}" style="height:${w.count?Math.max(6,Math.round(w.count/max*100)):0}%"></span></span>`).join('')}
 </div>
 <div class="week-labels"><span>${esc(label(weeks[0].start))}</span><span>This week</span></div>
 </section>`;
}

export function phoneCard(week,{feedbackHtml='',unlocks=null,native=false,hasToday=false}={}){
 const known=week.filter(d=>d.minutes!=null);
 const max=Math.max(...known.map(d=>d.minutes),60);
 const avg=known.length?Math.round(known.reduce((a,d)=>a+d.minutes,0)/known.length):null;
 const day=d=>new Date(d+'T12:00:00').toLocaleDateString('en-GB',{weekday:'narrow'});
 return `<section class="you-card you-chart-card" aria-labelledby="you-phone-title">
 <div class="you-card-top"><h2 id="you-phone-title">Phone use</h2><span class="you-muted">${avg!=null?`Average ${hm(avg)}`:native?'Last 7 days':'Android app only'}</span></div>
 ${known.length?`<div class="screen-bars" role="img" aria-label="Screen time for the last 7 days">${week.map((d,i)=>`<span class="screen-col"><span class="screen-val">${d.minutes!=null?Math.round(d.minutes/60*10)/10+'h':''}</span><span class="screen-bar${i===6?' now':''}${d.minutes==null?' none':''}" style="height:${d.minutes!=null?Math.max(4,Math.round(d.minutes/max*100)):4}%"></span><span class="screen-day">${esc(day(d.date))}</span></span>`).join('')}</div>`:''}
 ${hasToday&&unlocks!=null?`<p class="you-caption">${unlocks} unlocks today</p>`:''}
 ${feedbackHtml}
 ${native?(known.length?'':'<p class="you-caption">Turn on Usage Access so Recomp can read your screen time. It stays on this phone.</p>'):'<p class="you-caption">Screen time and unlocks need the Android APK. Habits and mood work in any browser.</p>'}
 </section>`;
}
