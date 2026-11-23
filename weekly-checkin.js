// Weekly check-in: one card that looks back over the week ending Sunday and
// gives a single suggestion. It shows on Today on Sundays and Mondays until
// dismissed, and on the You page any time. Pure functions; app.js passes data.

import {daysBack} from './you-insights.js';

const num=v=>{const x=Number(v);return Number.isFinite(x)?x:null;};
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pad=n=>String(n).padStart(2,'0');
const iso=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const shift=(date,days)=>{const d=new Date(date+'T12:00:00');d.setDate(d.getDate()+days);return iso(d);};
const avg=list=>list.length?list.reduce((t,v)=>t+v,0)/list.length:null;
const round1=v=>Math.round(v*10)/10;
const hm=min=>{const m=Math.round(min);return m<60?`${m} min`:`${Math.floor(m/60)}h ${pad(m%60)}m`;};

// The week under review ends on the latest Sunday: today on a Sunday,
// yesterday on a Monday, otherwise the Sunday just gone.
export function reviewWeekEnd(today){
 const day=new Date(today+'T12:00:00').getDay();
 return shift(today,-(day%7));
}
export function checkinKey(today){return reviewWeekEnd(today);}
export function shouldShowCheckin(today,seenKey){
 const day=new Date(today+'T12:00:00').getDay();
 return (day===0||day===1)&&seenKey!==checkinKey(today);
}

export function weeklyCheckin({today,weights=[],history=[],food=[],goals={},device={},target=null,goal=''}={}){
 const end=reviewWeekEnd(today);
 const days=daysBack(end,7),prevDays=daysBack(shift(end,-7),7);
 const inWeek=new Set(days),inPrev=new Set(prevDays);

 const kg=list=>weights.filter(w=>list.has(w?.date)&&num(w.kg)!=null).map(w=>num(w.kg));
 const wNow=avg(kg(inWeek)),wPrev=avg(kg(inPrev));
 const weight={now:wNow==null?null:round1(wNow),prev:wPrev==null?null:round1(wPrev),
  delta:wNow!=null&&wPrev!=null?round1(wNow-wPrev):null,count:kg(inWeek).length};

 const sessions=history.filter(w=>inWeek.has(w?.date)).length;
 const sessionTarget=num(target)&&num(target)>0?num(target):3;
 const workouts={done:sessions,target:sessionTarget,prev:history.filter(w=>inPrev.has(w?.date)).length};

 const goalProtein=num(goals.protein)||0;
 const proteinByDay=new Map();
 for(const f of food)if(inWeek.has(f?.date))proteinByDay.set(f.date,(proteinByDay.get(f.date)||0)+(num(f.protein)||0));
 const logged=proteinByDay.size;
 const hit=goalProtein?[...proteinByDay.values()].filter(g=>g>=goalProtein*0.9).length:0;
 const protein={hit,logged,goal:goalProtein,avg:logged?Math.round([...proteinByDay.values()].reduce((t,v)=>t+v,0)/logged):null};

 const mins=list=>list.map(d=>num(device?.[d]?.screenMinutes)).filter(v=>v!=null);
 const sNow=avg(mins(days)),sPrev=avg(mins(prevDays));
 const screen={avg:sNow==null?null:Math.round(sNow),prev:sPrev==null?null:Math.round(sPrev),
  change:sNow!=null&&sPrev?Math.round((sNow-sPrev)/sPrev*100):null};

 return {start:days[0],end,weight,workouts,protein,screen,suggestion:suggestionFor({weight,workouts,protein,screen,goal})};
}

// One suggestion, in priority order: training, food, weight against the goal, phone.
export function suggestionFor({weight,workouts,protein,screen,goal}){
 if(workouts.done<workouts.target)
  return {kind:'training',title:workouts.done?`${workouts.done} of ${workouts.target} sessions`:'No sessions this week',
   text:`Pick your ${workouts.target} training days now and switch on workout reminders, so the week plans itself.`};
 if(protein.logged<3)
  return {kind:'logging',title:'Log food on more days',text:'A few quick logs a day are enough to see whether protein and calories are on track.'};
 if(protein.goal&&protein.hit<4)
  return {kind:'protein',title:`Protein on ${protein.hit} of 7 days`,
   text:`Give breakfast a 30 g protein anchor, like Greek yoghurt with oats or eggs on toast, to reach ${protein.goal} g more often.`};
 if(weight.delta!=null&&/lose|recomp/.test(goal)&&weight.delta>=0.3)
  return {kind:'weight',title:`Weight up ${weight.delta} kg`,text:'One week can be water. If it rises again next week, trim about 200 kcal a day.'};
 if(weight.delta!=null&&/build|muscle/.test(goal)&&weight.delta<=-0.3)
  return {kind:'weight',title:`Weight down ${Math.abs(weight.delta)} kg`,text:'Building muscle needs a small surplus. Add about 200 kcal a day, mostly from carbs around training.'};
 if(screen.change!=null&&screen.change>=15&&screen.avg>=120)
  return {kind:'screen',title:`Screen time up ${screen.change}%`,text:'Try a phone-free first hour, or leave it in another room during your workout.'};
 return {kind:'keep',title:'Strong week',text:'Keep the same plan, and add a little weight wherever you hit all your reps.'};
}

const range=(a,b)=>{
 const s=new Date(a+'T12:00:00'),e=new Date(b+'T12:00:00');
 const sm=s.toLocaleDateString('en-GB',{month:'short'}),em=e.toLocaleDateString('en-GB',{month:'short'});
 return sm===em?`${s.getDate()}–${e.getDate()} ${em}`:`${s.getDate()} ${sm} – ${e.getDate()} ${em}`;
};
const trend=(delta,unit,{goodWhen='down'}={})=>{
 if(delta==null)return '';
 if(Math.abs(delta)<0.05)return `<small class="wc-flat">Same as last week</small>`;
 const up=delta>0,good=goodWhen==='either'?null:(goodWhen==='down'?!up:up);
 return `<small class="${good==null?'wc-flat':good?'wc-good':'wc-warn'}">${up?'↑':'↓'} ${Math.abs(delta)}${unit} vs last week</small>`;
};

export function renderCheckin(c,{dismissible=false,goal=''}={}){
 const weightGood=/build|muscle/.test(goal)?'up':/lose|recomp/.test(goal)?'down':'either';
 const tiles=[
  ['Weight',c.weight.now!=null?`${c.weight.now} kg`:'—',c.weight.now!=null?(trend(c.weight.delta,' kg',{goodWhen:weightGood})||`<small class="wc-flat">${c.weight.count} weigh-in${c.weight.count===1?'':'s'}</small>`):'<small class="wc-flat">No weigh-ins</small>'],
  ['Workouts',`${c.workouts.done}<span>/${c.workouts.target}</span>`,`<small class="${c.workouts.done>=c.workouts.target?'wc-good':'wc-flat'}">${c.workouts.done>=c.workouts.target?'Target hit':`${c.workouts.target-c.workouts.done} to go`}</small>`],
  ['Protein',`${c.protein.hit}<span>/7 days</span>`,`<small class="wc-flat">${c.protein.logged?`Avg ${c.protein.avg} g on ${c.protein.logged} logged day${c.protein.logged===1?'':'s'}`:'Nothing logged'}</small>`],
  ['Screen time',c.screen.avg!=null?hm(c.screen.avg):'—',c.screen.change!=null?`<small class="${c.screen.change>5?'wc-warn':c.screen.change<-5?'wc-good':'wc-flat'}">${c.screen.change>0?'↑':c.screen.change<0?'↓':''} ${Math.abs(c.screen.change)}% vs last week</small>`:`<small class="wc-flat">${c.screen.avg!=null?'Daily average':'No data yet'}</small>`]
 ];
 return `<section class="card weekly-checkin" aria-labelledby="wc-title">
 <div class="wc-head"><div><span class="wc-kicker">Weekly check-in</span><h2 id="wc-title">${esc(range(c.start,c.end))}</h2></div>${dismissible?'<button type="button" class="btn ghost wc-dismiss" data-action="dismiss-checkin">Got it</button>':''}</div>
 <div class="wc-grid">${tiles.map(([label,value,sub])=>`<div class="wc-tile"><span class="wc-label">${label}</span><b class="wc-value">${value}</b>${sub}</div>`).join('')}</div>
 <div class="wc-suggestion ${c.suggestion.kind}"><b>${esc(c.suggestion.title)}</b><span>${esc(c.suggestion.text)}</span></div>
 </section>`;
}
