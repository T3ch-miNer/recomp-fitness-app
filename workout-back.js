// One browser-history entry per focused workout: Android Back minimises instead of exiting.
// No workout state is stored in history; exercise data stays solely in IndexedDB.
export function createWorkoutBackGuard({history,subscribe,shouldGuard,onBack}){
 let armed=false;
 const token='recompWorkoutBackGuard';
 function arm(){
  if(armed||!shouldGuard())return;
  try{
   history.pushState({...history.state,[token]:true},'');
   armed=true;
  }catch(error){
   // In restrictive or file:// environments the app remains usable.
   console.warn('Workout Back navigation guard unavailable:',error);
  }
 }
 subscribe('popstate',()=>{
  if(!armed)return;
  armed=false;
  // Close overlays first; next press can minimise the workout.
  if(onBack()===true)arm();
 });
 return {arm};
}
