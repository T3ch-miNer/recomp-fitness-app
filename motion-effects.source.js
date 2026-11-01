// Recomp motion engine: Anime.js v4, bundled locally for offline Android builds.
// Animations are brief and non-essential. All fitness records remain independent.
import { animate, stagger, splitText, createTimer } from 'animejs';

export const prefersLessMotion=()=>globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches===true;

export function playWelcomeHeading(root){
  if(prefersLessMotion() || !root?.isConnected)return;
  const title=root.querySelector('#first-run-title');
  if(!title || title.dataset.motionPlayed)return;
  title.dataset.motionPlayed='yes';
  // Anime.js splitText retains an accessible text representation.
  const {chars}=splitText(title,{words:false,chars:true});
  if(!chars?.length)return;
  animate(chars,{
    y:[
      {to:'-1.65rem',ease:'outExpo',duration:530},
      {to:0,ease:'outBounce',duration:700,delay:80}
    ],
    rotate:{from:'-1turn',delay:0},
    delay:stagger(42),
    ease:'inOutCirc',
    loop:false
  });
}

export function playWorkoutSuccess(root){
  if(prefersLessMotion() || !root?.isConnected)return;
  const mark=root.querySelector('.recomp-win-mark');
  const tick=root.querySelector('.recomp-win-tick');
  if(mark)animate(mark,{scale:[{from:.4,to:1.12,duration:400,ease:'outBack'},{to:1,duration:300,ease:'out(3)'}],opacity:{from:0,to:1,duration:280}});
  if(tick)animate(tick,{strokeDashoffset:{from:90,to:0,duration:680,ease:'outExpo',delay:180}});
  const sparks=[...root.querySelectorAll('.recomp-win-spark')];
  if(sparks.length)animate(sparks,{
    x:el=>el.dataset.dx+'px',
    y:el=>el.dataset.dy+'px',
    rotate:el=>el.dataset.rot+'deg',
    scale:[{from:.4,to:1,duration:250},{to:.3,duration:670}],
    opacity:[{from:0,to:1,duration:160},{to:0,duration:640}],
    delay:stagger(35),
    ease:'out(3)'
  });
}

export function playStreakMilestone(root){
  if(prefersLessMotion() || !root?.isConnected)return;
  const big=root.querySelector('.you-hero .you-big');
  const flame=root.querySelector('.you-hero .you-flame');
  const bar=root.querySelector('.you-hero .you-bar > span');
  if(big)animate(big,{scale:[{from:.68,to:1.16,duration:430,ease:'outBack'},{to:1,duration:380,ease:'out(3)'}],opacity:{from:.45,to:1,duration:300}});
  if(flame)animate(flame,{rotate:[{to:'-20deg',duration:250},{to:'20deg',duration:300},{to:0,duration:300}],scale:[{from:.7,to:1.4,duration:300},{to:1,duration:470}],ease:'inOutCirc'});
  if(bar)animate(bar,{scaleX:[{from:.65,to:1,duration:900,ease:'outExpo'}]});
}

// Anime.js drives visual refresh. Date.now() remains the source of truth for
// elapsed and rest countdowns, so loop boundaries, backgrounding, pauses,
// app restarts, and Android battery scheduling never change workout duration.
let workoutTicker=null;
export function syncWorkoutTimer(isActive,onTick){
  if(!isActive){
    workoutTicker?.cancel();
    workoutTicker=null;
    return;
  }
  if(workoutTicker)return;
  workoutTicker=createTimer({
    duration:1000,
    loop:true,
    frameRate:30,
    onUpdate:()=>onTick(),
    onLoop:()=>onTick()
  });
}
export function stopWorkoutTimer(){syncWorkoutTimer(false,()=>{});}
