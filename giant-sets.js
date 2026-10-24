// Read-only selectors for ALL FTS/custom workout groups. Workout data remains in
// session.exercises[].sets[]; group navigation never invents or completes a set.
const key=x=>String(x||'').trim().toUpperCase();
const sequencePattern=/(?:20\s*[–-]\s*15\s*[–-]\s*10\s*[–-]\s*5|30\s*[–-]\s*20\s*[–-]\s*10|10\s*[–-]\s*20\s*[–-]\s*30|descending|rep ladder)/i;
export function getGiantGroups(session){
 const candidates=new Map();
 for(const [index,e] of (session?.exercises||[]).entries()){
  const id=key(e?.group);
  if(!/^[A-Z]$/.test(id)||!Array.isArray(e.sets)||!e.sets.length)continue;
  if(!candidates.has(id))candidates.set(id,[]);
  candidates.get(id).push({index,exercise:e});
 }
 return [...candidates].map(([id,items])=>{
  const lengths=items.map(({exercise})=>exercise.sets.length);
  const rounds=Math.max(...lengths);
  const mixed=lengths.some(length=>length!==rounds);
  const sequence=items.some(({exercise})=>sequencePattern.test(
   String(exercise.targetLabel||'')+' '+String(exercise.notes||'')));
  const configured=session?.groupSettings?.[id];
  const kind=items.length===1?'single':mixed?'mixed':sequence?'sequence':'giant';
  return {id,items,rounds,kind,
   custom:configured?.kind==='giant',
   restSeconds:configured?.kind==='giant'?configured.restSeconds:60,
   notes:configured?.kind==='giant'?configured.notes||'':''};
 });
}

export function availableItemsForStage(group,stage){
 return (group?.items||[]).filter(({exercise})=>Boolean(exercise.sets?.[stage]));
}
export function isRoundDone(group,round){
 const available=availableItemsForStage(group,round);
 return available.length>0&&available.every(({exercise})=>Boolean(exercise.sets[round]?.done));
}
export function firstIncompleteStep(groups){
 for(const group of groups)for(let round=0;round<group.rounds;round++)
  for(const {index,exercise} of availableItemsForStage(group,round))
   if(!exercise.sets[round].done)return {group:group.id,round,index};
 return null;
}
export function nextIncompleteStep(groups,from){
 const all=groups.flatMap(group=>Array.from({length:group.rounds},(_,round)=>
  availableItemsForStage(group,round).map(({index,exercise})=>({
   group:group.id,round,index,done:Boolean(exercise.sets[round]?.done)
  })) ).flat());
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
    availableItemsForStage(g,preferred.round).some(item=>item.index===preferred.index)){
   // Manual selection of completed sets is retained for Undo.
   return {...preferred};
  }
 }
 return firstIncompleteStep(groups)||{
  group:groups[0]?.id||'',round:0,index:groups[0]?.items[0]?.index??0
 };
}
export function ungroupedExerciseIndices(session,groups){
 const grouped=new Set(groups.flatMap(group=>group.items.map(item=>item.index)));
 return (session?.exercises||[]).map((_,index)=>index).filter(index=>!grouped.has(index));
}
