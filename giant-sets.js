// Pure, read-only selectors for FTS giant sets. All set values and completed
// flags stay in the existing session.exercises[].sets[] IndexedDB schema.
const key=x=>String(x||'').trim().toUpperCase();
export function getGiantGroups(session){
 const candidates=new Map();
 for(const [index,e] of (session?.exercises||[]).entries()){
  const id=key(e?.group);
  if(!/^[A-Z]$/.test(id)||!Array.isArray(e.sets)||!e.sets.length)continue;
  if(!candidates.has(id))candidates.set(id,[]);
  candidates.get(id).push({index,exercise:e});
 }
 return [...candidates].flatMap(([id,items])=>{
  // Irregular descending pyramids are not the same as repeated giant rounds.
  // Leave them in Detailed View instead of inventing/misplacing sets.
  const rounds=items[0].exercise.sets.length;
  if(items.length<2||rounds<2||items.some(it=>it.exercise.sets.length!==rounds))return [];
  return [{id,items,rounds}];
 });
}
export function isRoundDone(group,round){
 return group.items.every(({exercise})=>Boolean(exercise.sets[round]?.done));
}
export function firstIncompleteStep(groups){
 for(const group of groups)for(let round=0;round<group.rounds;round++)
  for(const {index,exercise} of group.items)
   if(!exercise.sets[round]?.done)return {group:group.id,round,index};
 return null;
}
export function nextIncompleteStep(groups,from){
 const all=groups.flatMap(group=>Array.from({length:group.rounds},(_,round)=>group.items.map(({index,exercise})=>({group:group.id,round,index,done:Boolean(exercise.sets[round]?.done)}))).flat());
 if(!all.length)return null;
 const at=from?all.findIndex(step=>step.group===from.group&&step.round===from.round&&step.index===from.index):-1;
 for(let offset=1;offset<=all.length;offset++){
  const step=all[(at+offset+all.length)%all.length];
  if(!step.done)return {group:step.group,round:step.round,index:step.index};
 }
 return null;
}
export function pickGiantCursor(session,groups){
 const preferred=session?.giantCursor;
 if(preferred){
  const g=groups.find(group=>group.id===preferred.group);
  if(g&&Number.isInteger(preferred.round)&&preferred.round>=0&&preferred.round<g.rounds&&
     g.items.some(item=>item.index===preferred.index)){
   const selected=g.items.find(item=>item.index===preferred.index).exercise.sets[preferred.round];
   if(!selected?.done || !firstIncompleteStep(groups))return {...preferred};
   const next=nextIncompleteStep(groups,preferred);
   if(next)return next;
  }
 }
 return firstIncompleteStep(groups)||{group:groups[0]?.id||'',round:0,index:groups[0]?.items[0]?.index??0};
}
export function ungroupedExerciseIndices(session,groups){
 const grouped=new Set(groups.flatMap(group=>group.items.map(item=>item.index)));
 return (session?.exercises||[]).map((_,index)=>index).filter(index=>!grouped.has(index));
}
