// Recomp motion engine: Anime.js v4, bundled locally for offline Android builds.
// Animations are brief and non-essential. All fitness records remain independent.
import { animate, stagger, splitText, createTimer, scrambleText, waapi, cubicBezier, spring } from 'animejs';

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

// v3.3: Short, opt-in-by-screen motion. Never animate fitness numbers or fields.
// Recomp's pre-existing workout completion celebration is intentionally unchanged.
export function playDashboardMotivation(root){
  if(prefersLessMotion() || !root?.isConnected)return;
  const text=root.querySelector('.dashboard-intro [data-motion-motivation]');
  if(!text || !text.textContent?.trim())return;
  // Only text composed by Recomp is animated. Numeric metrics remain untouched.
  animate(text,{
    innerHTML:scrambleText({
      chars:'uppercase',
      revealRate:85,
      settleRate:55,
      settleDuration:360,
    }),
    duration:950,
    loop:false
  });
}

export function playProgrammeCards(root){
  if(prefersLessMotion() || !root?.isConnected)return;
  const cards=[...root.querySelectorAll('.workout-template-card')].slice(0,4);
  cards.forEach((card,index)=>{
    if(index===0){
      animate(card,{y:[{from:18,to:0}],opacity:[0,1],
        duration:580,delay:40,ease:'out(3)'});
    }else if(index===1){
      animate(card,{y:[{from:22,to:0}],opacity:[0,1],
        duration:620,delay:130,ease:cubicBezier(.7,.1,.5,.9)});
    }else{
      waapi.animate(card,{y:['16px','0px'],scale:[.97,1],opacity:[.45,1],
        duration:720,delay:180+(index-2)*110,ease:spring({bounce:.24})});
    }
  });
}

export function playBasicProgrammeChoices(root){
  if(prefersLessMotion() || !root?.isConnected)return;
  const fields=[...root.querySelectorAll('.basic-grid label')].slice(0,6);
  fields.forEach((field,index)=>{
    if(index%3===0){
      animate(field,{y:[{from:12,to:0}],opacity:[0,1],
        delay:index*45,duration:430,ease:'out(3)'});
    }else if(index%3===1){
      animate(field,{y:[{from:12,to:0}],opacity:[0,1],
        delay:index*45,duration:480,ease:cubicBezier(.7,.1,.5,.9)});
    }else{
      waapi.animate(field,{y:['10px','0px'],scale:[.98,1],opacity:[.6,1],
        delay:index*45,duration:600,ease:spring({bounce:.18})});
    }
  });
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

// Deliberately scramble the *main page title*, not the Home dashboard hint.
// Called once when entering Home, Workouts, Nutrition, Body, You or Settings.
export function playPageHeading(root){
 if(prefersLessMotion() || !root?.isConnected)return;
 const title=root.querySelector('.top .page-title, .you-header .page-title, .workout-title-block .page-title');
 if(!title || title.dataset.recompTitleAnimated==='yes')return;
 const original=title.textContent?.trim();
 if(!original)return;
 title.dataset.recompTitleAnimated='yes';
 title.setAttribute('aria-label',original); // The title remains readable to screen readers.
 animate(title,{
   innerHTML:scrambleText({chars:'uppercase',revealRate:88,settleRate:62,settleDuration:320}),
   duration:1050,
   loop:false
 });
}
