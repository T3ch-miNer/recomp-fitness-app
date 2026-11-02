// Optional Anime.js runtime loaded only after the Android/local bundle exists.
// The static PWA remains functional if motion assets have not been built.
let modulePromise=null;
function loadMotion(){
 if(!modulePromise)modulePromise=import('./recomp-motion.js').catch(error=>{
   console.warn('Optional Recomp motion unavailable; static UI remains usable.',error?.message);
   return null;
 });
 return modulePromise;
}
export function runMotion(name,element){
 return loadMotion().then(mod=>{if(mod?.[name])return mod[name](element);}).catch(error=>console.warn('Optional motion skipped:',error?.message));
}
let wantedClockActive=false,wantedClockTick=null;
export function refreshMotionClock(active,onTick){
 wantedClockActive=Boolean(active);
 wantedClockTick=onTick;
 return loadMotion().then(mod=>{
  mod?.syncWorkoutTimer(wantedClockActive,wantedClockTick);
 }).catch(()=>{});
}
// A half-second fallback is intentional for the hosted website until its
// deployment has locally bundled Anime.js, never when the native clock runs.
export function motionBundleReady(){return loadMotion().then(Boolean);}
