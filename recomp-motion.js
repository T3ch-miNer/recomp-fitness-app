// Recomp motion engine: Anime.js 4.2.2, shipped as a local file so the website
// and the Android app load the same code, online or offline, with no build step.
// Animations are brief and non-essential. All fitness records remain independent.
import { animate, stagger, splitText, createTimer, waapi, spring } from './anime.esm.min.js';

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
  // Twice a second, matching the website. A faster refresh redraws every
  // timer on screen for no visible gain and makes Android feel sluggish.
  workoutTicker=createTimer({
    duration:1000,
    loop:true,
    frameRate:2,
    onUpdate:()=>onTick()
  });
}
export function stopWorkoutTimer(){syncWorkoutTimer(false,()=>{});}

// v3.3: Short, opt-in-by-screen motion. Never animate fitness numbers or fields.
// Recomp's pre-existing workout completion celebration is intentionally unchanged.
export function playDashboardMotivation(root){
  if(prefersLessMotion() || !root?.isConnected)return;
  const text=root.querySelector('.dashboard-intro [data-motion-motivation]');
  if(!text || !text.textContent?.trim())return;
  // A soft fade keeps the words readable the whole time. Numbers never move.
  waapi.animate(text,{opacity:[.35,1],y:['4px','0px'],duration:520,ease:'cubic-bezier(.2,.7,.3,1)'});
}

export function playProgrammeCards(root){
  if(prefersLessMotion() || !root?.isConnected)return;
  const cards=[...root.querySelectorAll('.workout-template-card')].slice(0,4);
  if(!cards.length)return;
  // Cards start visible (opacity .6), so nothing is hidden if motion is cut short.
  waapi.animate(cards,{y:['14px','0px'],opacity:[.6,1],
    duration:480,delay:stagger(70),ease:'cubic-bezier(.2,.7,.3,1)'});
}

export function playBasicProgrammeChoices(root){
  if(prefersLessMotion() || !root?.isConnected)return;
  const fields=[...root.querySelectorAll('.basic-grid label')].slice(0,6);
  if(!fields.length)return;
  waapi.animate(fields,{y:['10px','0px'],opacity:[.6,1],
    duration:420,delay:stagger(45),ease:'cubic-bezier(.2,.7,.3,1)'});
}

export function playBodyTrend(root){
  if(prefersLessMotion() || !root?.isConnected)return;
  const graph=root.querySelector('.weight-chart svg');
  if(!graph)return; // A single weight entry does not produce a chart.
  waapi.animate(graph,{y:['12px','0px'],opacity:[.35,1],
    duration:660,ease:'cubic-bezier(.7,.1,.5,.9)'});
}

export function playHabitCheck(label){
  if(prefersLessMotion() || !label?.isConnected)return;
  // Only the checkbox row moves, never a user's real streak or progress count.
  waapi.animate(label,{scale:[.96,1.08,1],
    duration:610,ease:spring({bounce:.32})});
}

export function playNavigationFeedback(root){
  if(prefersLessMotion() || !root?.isConnected)return;
  const selected=root.querySelector('#recomp-bottom-dock .bottom-btn.active svg')||
                 root.querySelector('.sidebar .nav-btn.active svg');
  if(selected){
    waapi.animate(selected,{y:['6px','0px'],scale:[.88,1],
      duration:470,ease:spring({bounce:.2})});
  }
}

// Fade in the supporting line under the title. The text stays readable
// throughout: scrambling it looked broken and replayed on every tab switch.
export function playPageBody(root){
 if(prefersLessMotion() || !root?.isConnected)return;
 const targets=[root.querySelector('.top .subhead'),root.querySelector('.dashboard-intro [data-motion-motivation]')].filter(Boolean);
 for(const body of targets){
  if(body.dataset.recompBodyAnimated==='yes')continue;
  body.dataset.recompBodyAnimated='yes';
  waapi.animate(body,{opacity:[.35,1],y:['4px','0px'],duration:520,delay:60,ease:'cubic-bezier(.2,.7,.3,1)'});
 }
}

// Keep the title readable and stable, with a restrained spring lift on entry.
export function playPageTitle(root){
 if(prefersLessMotion() || !root?.isConnected)return;
 const title=root.querySelector('.top .page-title, .you-header .page-title, .workout-title-block .page-title');
 if(!title || title.dataset.recompTitleAnimated==='yes')return;
 title.dataset.recompTitleAnimated='yes';
 waapi.animate(title,{y:['7px','0px'],opacity:[.72,1],scale:[.985,1],
   duration:560,ease:spring({bounce:.12})});
}
