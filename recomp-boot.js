/**
 * Dismiss the animated Recomp Pulse only after the main application has rendered.
 * The short minimum visibility is measured from navigation start, not after loading:
 * slow starts never wait extra time, and reduced-motion users get no added delay.
 *
 * This module does not read/write workout data, make requests, or block sign-in.
 */
export function revealRecompApp({
 documentRoot=typeof document==='undefined'?null:document,
 clock=()=>typeof performance==='undefined'?0:performance.now(),
 scheduleAfter=(callback,ms)=>setTimeout(callback,ms),
 reducedMotion=()=>typeof matchMedia!=='undefined'&&matchMedia('(prefers-reduced-motion: reduce)').matches
}={}){
 const splash=documentRoot?.getElementById('recomp-splash');
 if(!splash)return false;
 const app=documentRoot.getElementById('app');
 // The app is accessible immediately after it renders; the splash remains visual only.
 app?.removeAttribute('aria-busy');
 const motionReduced=reducedMotion();
 const minimum=motionReduced?0:1200;
 const delay=Math.max(0,minimum-Math.max(0,clock()));
 scheduleAfter(()=>{
  if(!splash.isConnected)return;
  if(motionReduced){splash.remove();return;}
  splash.classList.add('rb-exit');
  const finish=()=>splash.remove();
  splash.addEventListener('transitionend',finish,{once:true});
  // Reduced motion has no transition. Also covers WebViews with missing events.
  scheduleAfter(finish,460);
 },delay);
 return true;
}
