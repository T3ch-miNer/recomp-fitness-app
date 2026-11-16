// Next-weight suggestions (double progression). Hit the target reps on every
// set last time, so add a small jump. Fell short, so stay and beat the reps.
// Pure functions: app.js passes in last session's sets and the plan's target.

const num=v=>{const x=Number(v);return Number.isFinite(x)?x:0;};
const round=(v,step)=>Math.round(v/step)*step;
const trim=v=>String(+num(v).toFixed(2));

// Smaller jumps for light weights, so a 6 kg dumbbell doesn't leap to 8.5 kg.
export function weightStep(kg){
 const k=num(kg);
 if(k<10)return 0.5;
 if(k<20)return 1;
 return 2.5;
}

// lastSets: completed sets from the last session of this exercise.
// target: the plan's rep goal per set. unit: 'reps' (others are not suggested).
export function suggestNext(lastSets,{target=0,unit='reps'}={}){
 if(unit&&unit!=='reps')return null;
 const sets=(lastSets||[]).filter(s=>s?.done!==false&&num(s.kg)>0&&num(s.reps)>0);
 if(!sets.length)return null;
 const top=Math.max(...sets.map(s=>num(s.kg)));
 const working=sets.filter(s=>num(s.kg)===top);
 const goal=num(target)>0?num(target):Math.max(...working.map(s=>num(s.reps)));
 const reps=working.map(s=>num(s.reps));
 const lowest=Math.min(...reps);
 if(lowest>=goal&&working.length>=Math.min(2,sets.length)){
  const step=weightStep(top);
  const kg=round(top+step,step);
  return {kind:'add',kg,reps:goal,from:top,text:`Try ${trim(kg)} kg × ${goal}`,why:`You hit ${goal} reps on every set at ${trim(top)} kg last time.`};
 }
 const short=reps.filter(r=>r<goal).length;
 return {kind:'stay',kg:top,reps:goal,from:top,text:`Stay at ${trim(top)} kg`,why:`Aim for ${goal} reps on ${short===1?'the set you missed':`the ${short} sets you missed`} before adding weight.`};
}

// The undone sets an apply would change, so the button can hide when there's nothing to do.
export function setsToChange(exercise,suggestion){
 if(!suggestion)return [];
 return (exercise?.sets||[]).map((s,i)=>({s,i})).filter(({s})=>!s.done&&num(s.kg)!==suggestion.kg).map(({i})=>i);
}
