// Premium touches: hold to confirm, dynamic button labels, iridescent foil and
// scroll fades. Plain JS ports of the React components, built for an app that
// re-renders with innerHTML. Everything is delegated or picked up by one
// MutationObserver, so markup only needs data attributes:
//   data-hold="1500"   press and hold to confirm (ms). Held buttons get data-held="1".
//   data-dyn="key"     label slides and width eases when the label for that key changes.
//   data-foil          full holographic reward surface.
//   class="foil-tint"  faint, scroll-only tint for large surfaces.
//   data-fade="v|h"    fade the edges of a scroller that has more to show.

const reduce=()=>globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches===true;
const CHECK='<svg class="tiny-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12l5 5 9-10"/></svg>';
export const SAVED_LABEL=CHECK+'Saved';

// ---------- 1. Hold to confirm ----------
export const HOLD_DEFAULT_MS=1500;
export function holdMs(el){const ms=Number(el?.dataset?.hold);return Number.isFinite(ms)&&ms>=300?ms:HOLD_DEFAULT_MS;}
// True once a hold has completed on this element. The app skips its old confirm pop-up.
export const wasHeld=el=>el?.dataset?.held==='1';

let hold=null;
function holdStart(btn,input,pointerId=null){
 if(hold||btn.disabled||btn.classList.contains('is-held'))return;
 if(!btn.querySelector(':scope > .hold-fill')){
  const fill=document.createElement('span');
  fill.className='hold-fill';fill.setAttribute('aria-hidden','true');fill.innerHTML=btn.innerHTML;
  btn.appendChild(fill);
 }
 const ms=holdMs(btn);
 btn.style.setProperty('--hold-ms',ms+'ms');
 btn.dataset.input=input;
 btn.classList.toggle('hold-instant',input==='keyboard'||reduce());
 void btn.offsetWidth;
 btn.classList.add('is-holding');btn.setAttribute('aria-busy','true');
 hold={btn,pointerId,timer:setTimeout(holdDone,ms)};
 globalThis.navigator?.vibrate?.(8);
}
function holdCancel(){
 if(!hold)return;
 const {btn,timer,pointerId}=hold;hold=null;clearTimeout(timer);
 btn.classList.remove('is-holding');btn.removeAttribute('aria-busy');
 if(pointerId!=null&&btn.hasPointerCapture?.(pointerId))btn.releasePointerCapture(pointerId);
}
function holdDone(){
 if(!hold)return;
 const {btn,pointerId}=hold;hold=null;
 if(pointerId!=null&&btn.hasPointerCapture?.(pointerId))btn.releasePointerCapture(pointerId);
 btn.classList.remove('is-holding');btn.classList.add('is-held');btn.removeAttribute('aria-busy');
 btn.dataset.held='1';
 globalThis.navigator?.vibrate?.([12,40,18]);
 // Hand over to the app's normal click delegation, now marked as confirmed.
 btn.click();
 setTimeout(()=>{if(btn.isConnected){btn.classList.remove('is-held');delete btn.dataset.held;}},1400);
}
let holdHintAt=0;
export function initHoldToConfirm(doc=document,{hint=()=>{}}={}){
 doc.addEventListener('pointerdown',e=>{
  const btn=e.target.closest?.('[data-hold]');
  if(!btn||!e.isPrimary||e.button!==0)return;
  btn.setPointerCapture?.(e.pointerId);
  holdStart(btn,'pointer',e.pointerId);
 });
 doc.addEventListener('pointermove',e=>{
  if(!hold||e.pointerId!==hold.pointerId)return;
  const r=hold.btn.getBoundingClientRect(),p=8;
  if(e.clientX<r.left-p||e.clientX>r.right+p||e.clientY<r.top-p||e.clientY>r.bottom+p)holdCancel();
 });
 const end=e=>{if(hold&&e.pointerId===hold.pointerId)holdCancel();};
 doc.addEventListener('pointerup',end);doc.addEventListener('pointercancel',end);
 doc.addEventListener('lostpointercapture',end,true);
 doc.addEventListener('keydown',e=>{
  const btn=e.target.closest?.('[data-hold]');
  if(!btn||(e.key!=='Enter'&&e.key!==' '))return;
  e.preventDefault();if(!e.repeat)holdStart(btn,'keyboard');
 });
 doc.addEventListener('keyup',e=>{if(hold&&(e.key==='Enter'||e.key===' ')){e.preventDefault();holdCancel();}});
 doc.addEventListener('focusout',e=>{if(hold&&e.target===hold.btn)holdCancel();});
 doc.addEventListener('contextmenu',e=>{if(e.target.closest?.('[data-hold]'))e.preventDefault();});
 // A plain tap on a hold button does nothing except remind people to hold.
 doc.addEventListener('click',e=>{
  const btn=e.target.closest?.('[data-hold]');
  if(!btn||wasHeld(btn))return;
  e.preventDefault();e.stopImmediatePropagation();
  const now=Date.now();if(now-holdHintAt>1500){holdHintAt=now;hint('Press and hold to confirm');}
 },true);
}

// ---------- 2. Dynamic button ----------
const dynMemory=new Map();
function dynSlide(btn,fromHtml,toHtml,fromWidth){
 const full=btn.classList.contains('block')||btn.dataset.dynWidth==='full';
 const natural=btn.getBoundingClientRect().width;
 btn.classList.add('dyn-busy');
 btn.innerHTML=`<span class="dyn-slot"><span class="dyn-old" aria-hidden="true">${fromHtml}</span><span class="dyn-new">${toHtml}</span></span>`;
 if(!full&&fromWidth&&Math.abs(natural-fromWidth)>1){
  btn.style.width=fromWidth+'px';void btn.offsetWidth;
  btn.style.width=natural+'px';
 }
 clearTimeout(btn._dynT);
 btn._dynT=setTimeout(()=>{if(!btn.isConnected)return;btn.classList.remove('dyn-busy');btn.style.width='';btn.innerHTML=toHtml;},300);
}
// Animate a label change on an element that stays in the DOM.
export function setDynamicLabel(btn,html){
 if(!btn)return;
 const key=btn.dataset.dyn,prev=dynMemory.get(key)?.html??btn.innerHTML;
 if(prev===html)return;
 const width=btn.getBoundingClientRect().width;
 btn.innerHTML=html;
 if(!reduce())dynSlide(btn,prev,html,width);
 dynMemory.set(key,{html,width:btn.getBoundingClientRect().width});
}
function syncDynamic(root){
 for(const btn of root.querySelectorAll('[data-dyn]:not([data-dyn-ready])')){
  btn.dataset.dynReady='1';
  const key=btn.dataset.dyn,html=btn.innerHTML,prev=dynMemory.get(key);
  if(prev&&prev.html!==html&&!reduce())dynSlide(btn,prev.html,html,prev.width);
  dynMemory.set(key,{html,width:btn.getBoundingClientRect().width});
 }
}

// ---------- 3. Iridescent foil ----------
const foils=new Set();let foilFrame=null,foilPointer={x:.5,y:.5,at:0},foilListening=false;
const clamp=(v,a,b)=>Math.min(Math.max(v,a),b),pct=v=>(+(v*100).toFixed(2))+'%';
function foilApply(){
 foilFrame=null;
 const vh=innerHeight||1;
 for(const el of foils){
  if(!el.isConnected){foils.delete(el);continue;}
  const r=el.getBoundingClientRect();
  if(r.bottom<0||r.top>vh)continue;
  const s=clamp((vh-r.top)/(vh+r.height),0,1);
  const fresh=Date.now()-foilPointer.at<4000;
  const x=fresh&&r.width?clamp((foilPointer.cx-r.left)/r.width,.08,.92):.5+Math.sin(s*Math.PI*2)*.18;
  const y=fresh&&r.height?clamp((foilPointer.cy-r.top)/r.height,.08,.92):.5;
  const st=el.style;
  st.setProperty('--foil-shift',pct(s*.82+(x-.5)*.18));st.setProperty('--foil-y-shift',pct(s*.28+(y-.5)*.12));
  st.setProperty('--glare-x',pct(x));st.setProperty('--glare-y',pct(y));
  st.setProperty('--pointer-x',pct(x));st.setProperty('--pointer-y',pct(y));
  st.setProperty('--shine-angle',(+(105+s*80+(x-.5)*28).toFixed(2))+'deg');
  st.setProperty('--shine-opacity',String(+(.56+Math.abs(x-.5)*.24+s*.12).toFixed(3)));
 }
 if(!foils.size)foilListen(false);
}
const foilSchedule=()=>{if(foilFrame===null)foilFrame=requestAnimationFrame(foilApply);};
const foilMove=e=>{foilPointer={cx:e.clientX,cy:e.clientY,at:Date.now()};foilSchedule();};
function foilListen(on){
 if(on===foilListening)return;foilListening=on;
 const m=on?'addEventListener':'removeEventListener';
 globalThis[m]('pointermove',foilMove,{passive:true});
 document[m]('scroll',foilSchedule,{passive:true,capture:true});
 globalThis[m]('resize',foilSchedule,{passive:true});
 // Phone tilt nudges the foil too, where the browser allows it without a prompt.
 globalThis[m]('deviceorientation',foilTilt,{passive:true});
}
function foilTilt(e){
 if(e.gamma==null)return;
 const r={left:0,top:0,width:innerWidth,height:innerHeight};
 foilPointer={cx:r.width*clamp(.5+e.gamma/60,0,1),cy:r.height*clamp(.5+((e.beta||45)-45)/60,0,1),at:Date.now()};foilSchedule();
}
function syncFoils(root){
 for(const el of root.querySelectorAll('[data-foil]:not([data-foil-ready])')){
  el.dataset.foilReady='1';el.classList.add('foil-surface');
  el.insertAdjacentHTML('afterbegin','<span aria-hidden="true" class="f-pearl"></span><span aria-hidden="true" class="f-film"></span><span aria-hidden="true" class="f-foil"></span>');
  el.insertAdjacentHTML('beforeend','<span aria-hidden="true" class="f-shine"></span><span aria-hidden="true" class="f-glare"></span>');
  if(!reduce()){foils.add(el);foilListen(true);}
 }
 if(foils.size)foilSchedule();
}

// Faint tint: one CSS variable on the root, updated from scroll only.
let tintFrame=null,tintOn=false;
function tintApply(){
 tintFrame=null;
 const main=document.querySelector('main.main');
 const y=Math.max(globalThis.scrollY||0,main?.scrollTop||0,document.scrollingElement?.scrollTop||0);
 document.documentElement.style.setProperty('--tint-shift',((y/9)%400).toFixed(1)+'%');
}
const tintSchedule=()=>{if(tintFrame===null)tintFrame=requestAnimationFrame(tintApply);};
function syncTint(){
 const want=!reduce()&&Boolean(document.querySelector('.foil-tint'));
 if(want===tintOn)return;tintOn=want;
 document[want?'addEventListener':'removeEventListener']('scroll',tintSchedule,{passive:true,capture:true});
 if(want)tintSchedule();
}

// ---------- 4. Scroll fade ----------
export function fadeEdges(el,max=Number(el?.dataset?.fadeMax)||(el?.dataset?.fade==='h'?36:64)){
 if(!el)return;
 if(el.dataset.fade==='h'){
  const m=Math.max(0,el.scrollWidth-el.clientWidth);
  el.style.setProperty('--fade-start',Math.min(max,el.scrollLeft)+'px');
  el.style.setProperty('--fade-end',Math.min(max,Math.max(0,m-el.scrollLeft))+'px');
 }else{
  const m=Math.max(0,el.scrollHeight-el.clientHeight);
  el.style.setProperty('--fade-start',Math.min(max,el.scrollTop)+'px');
  el.style.setProperty('--fade-end',Math.min(max,Math.max(0,m-el.scrollTop))+'px');
 }
}
const fadeRO=typeof ResizeObserver==='function'?new ResizeObserver(entries=>entries.forEach(e=>{if(e.target.isConnected)fadeEdges(e.target);else fadeRO.unobserve(e.target);})):null;
// Existing scrollers that get a fade without touching their markup.
export const FADE_VERTICAL='.nf-food-results,.food-search-results,.custom-group-members';
export const FADE_SIDEWAYS='.part-chips,.mw-tabs,.tab-row,.you-day-photos';
function syncFades(root){
 for(const el of root.querySelectorAll(FADE_VERTICAL))if(!el.dataset.fade)el.dataset.fade='v';
 for(const el of root.querySelectorAll(FADE_SIDEWAYS))if(!el.dataset.fade)el.dataset.fade='h';
 for(const el of root.querySelectorAll('[data-fade]:not([data-fade-ready])')){
  el.dataset.fadeReady='1';fadeEdges(el);fadeRO?.observe(el);
 }
}

// ---------- Wiring ----------
export function refreshPremiumTouches(root=document){syncDynamic(root);syncFoils(root);syncFades(root);syncTint();}
export function initPremiumTouches({hint}={}){
 initHoldToConfirm(document,{hint});
 document.addEventListener('scroll',e=>{const t=e.target;if(t?.dataset?.fade)fadeEdges(t);},{passive:true,capture:true});
 // Runs as a microtask after each render, before the browser paints the new markup.
 new MutationObserver(()=>refreshPremiumTouches(document)).observe(document.body,{childList:true,subtree:true});
 refreshPremiumTouches(document);
}
