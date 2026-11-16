// Optional Anime.js motion, shared by the website and the Android app.
// If it fails to load, the app stays fully usable without animation.
let modulePromise=null;
function loadMotion(){
 if(!modulePromise)modulePromise=import('./recomp-motion.js').catch(error=>{
   console.warn('Optional Recomp motion unavailable; static UI remains usable.',error?.message);
   return null;
 });
 return modulePromise;
}
export function runMotion(name,element,...args){
 return loadMotion().then(mod=>{if(mod?.[name])return mod[name](element,...args);}).catch(error=>console.warn('Optional motion skipped:',error?.message));
}
let wantedClockActive=false,wantedClockTick=null;
export function refreshMotionClock(active,onTick){
 wantedClockActive=Boolean(active);
 wantedClockTick=onTick;
 return loadMotion().then(mod=>{
  mod?.syncWorkoutTimer(wantedClockActive,wantedClockTick);
 }).catch(()=>{});
}
// If motion can't load, app.js falls back to a plain half-second timer.
export function motionBundleReady(){return loadMotion().then(Boolean);}
