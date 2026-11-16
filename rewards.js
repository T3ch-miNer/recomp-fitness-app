// Reward moments that earn the iridescent foil: personal bests and habit
// streak milestones. Pure functions so they are easy to test.

const num=v=>{const x=Number(v);return Number.isFinite(x)?x:0;};
export const STREAK_MILESTONES=Object.freeze([7,14,30,60,100,365]);

// The heaviest completed set for each exercise in this session that beats every
// earlier session. First-ever attempts are not counted: there is nothing to beat.
export function personalBests(history=[],exercises=[]){
 const before=new Map();
 for(const w of history)for(const ex of w?.exercises||[]){
  for(const set of ex?.sets||[]){
   if(!set?.done)continue;
   const name=set.exerciseName||ex.name,kg=num(set.kg);
   if(name&&kg>0)before.set(name,Math.max(before.get(name)||0,kg));
  }
 }
 const now=new Map();
 for(const ex of exercises||[])for(const set of ex?.sets||[]){
  if(!set?.done)continue;
  const name=set.exerciseName||ex.name,kg=num(set.kg);
  if(name&&kg>0)now.set(name,Math.max(now.get(name)||0,kg));
 }
 const out=[];
 for(const [name,kg] of now){const prev=before.get(name);if(prev>0&&kg>prev)out.push({name,kg,prev});}
 return out.sort((a,b)=>(b.kg-b.prev)-(a.kg-a.prev));
}

// The highest milestone a streak has reached, or null below the first one.
export function streakMilestone(days){
 const d=num(days);let hit=null;
 for(const m of STREAK_MILESTONES)if(d>=m)hit=m;
 return hit;
}

const kgText=kg=>`${Math.round(kg*10)/10} kg`;
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function personalBestBadge(pbs=[]){
 if(!pbs.length)return '';
 const top=pbs[0],more=pbs.length-1;
 return `<div class="reward-badge pb-badge" data-foil role="img" aria-label="Personal best: ${esc(top.name)} ${kgText(top.kg)}, up from ${kgText(top.prev)}${more?`, plus ${more} more`:''}"><span class="reward-kicker">Personal best${pbs.length>1?'s':''}</span><b>${kgText(top.kg)}</b><small>${esc(top.name)} · up from ${kgText(top.prev)}</small>${more?`<small>+${more} more beat${more===1?'s':''} your best</small>`:''}</div>`;
}
export function streakBadge(days){
 const m=streakMilestone(days);
 if(!m)return '';
 return `<div class="reward-badge streak-badge" data-foil role="img" aria-label="${days} day habit streak, past the ${m} day milestone"><b>${days}</b><span class="reward-kicker">Day streak</span><small>${m}-day milestone</small></div>`;
}
