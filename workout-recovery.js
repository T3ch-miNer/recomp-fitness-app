// Reconstruct a finished workout without mutating the saved record or its sets.
// Keep the elapsed workout duration, but do not count time spent in History.
export function reopenCompletedWorkout(entry,template=null,now=Date.now()){
 if(!entry||!Array.isArray(entry.exercises)||entry.exercises.length===0)return null;
 const finished=Number(entry.endedAt);
 const began=Number(entry.startedAt);
 const elapsedMs=Number.isFinite(finished)&&Number.isFinite(began)&&finished>=began?
  Math.max(0,finished-began):Math.max(0,Number(entry.durationMin)||0)*60000;
 const details=entry.sessionDetails||{};
 const activeIndex=Number.isInteger(details.activeIndex)?details.activeIndex:0;
 const session={
  name:String(entry.name||template?.name||'Workout'),
  templateId:entry.templateId||template?.id||null,
  startedAt:now-elapsedMs,
  minimized:false,
  instructions:details.instructions??template?.notes??'',
  groupSettings:structuredClone(details.groupSettings??template?.groupSettings??{}),
  exercises:structuredClone(entry.exercises),
  activeIndex:Math.min(Math.max(0,activeIndex),entry.exercises.length-1),
  rest:null,
  warmupStatus:details.warmupStatus||'pending'
 };
 if(details.giantView==='rounds'||details.giantView==='detailed')session.giantView=details.giantView;
 return session;
}
export function saveSessionDetails(session){
 return {
  instructions:session.instructions||'',
  groupSettings:structuredClone(session.groupSettings||{}),
  giantView:session.giantView||null,
  warmupStatus:session.warmupStatus||'pending',
  activeIndex:session.activeIndex||0
 };
}
