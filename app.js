import {get,put,getPhoto,putPhoto,deletePhoto,getAllPhotos,clearAllLocalRecords} from './db.js';
import {FTS_WORKOUTS} from './fts-workouts.js';
import {FTS_WORKOUTS_5_TO_15,mergeFtsWorkoutExpansion} from './fts-workouts-5-15.js';
import {FTS_WORKOUTS_16_TO_41,mergeFtsFinalWorkouts,mergeFtsReviewedWorkouts} from './fts-workouts-16-41.js';
import {renderExerciseDemonstration} from './exercise-demonstration.js';
import {createWorkoutBackGuard} from './workout-back.js';
import {getGiantGroups,isRoundDone,pickGiantCursor,nextIncompleteStep} from './giant-sets.js';
import {renderGiantSetView} from './giant-set-view.js';
import {renderMuscleFocus} from './muscle-focus.js';
import {reopenCompletedWorkout,saveSessionDetails} from './workout-recovery.js';
import {nextScrollChromeState} from './scroll-chrome.js';
import {warmupView,WARMUP_VIDEO_ID} from './warmup.js';
import {orderedWorkoutPlans,workoutHistoryHtml,foodHistoryHtml} from './history-view.js';
import {nextAvailableGroup,listCustomGiantSets,saveCustomGiantSet,removeCustomGiantSet} from './custom-giant-sets.js';
import {confirmationHtml} from './confirmation-dialog.js';
import * as cloud from './cloud.js';
import {openNutrition,mealForHour} from './nutrition-v2.js';
import {FOOD_ITEMS,FOOD_COUNT,findFood,searchFoods,nutrientsForGrams} from './food-db.js';
import {openMealPlanner} from './meal-planner.js';
import {nativeHealthAvailable,readHealthConnectDay,mergeDailyActivity} from './health-connect.js';
import {FIRST_RUN_KEY,shouldOfferFirstRun,showFirstRunWelcome} from './first-run.js';
import {getClerkKey,isClerkLoginAvailable,isClerkDevelopmentMode,getClerkAccount,loadClerk,openClerkSignIn,clerkSignOut,saveClerkKey} from './clerk-auth.js';
import {readGoalDraft,validateGoalDraft} from './goal-draft.js';

const $ = s => document.querySelector(s);
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
const n = (v,otherwise=0) => Number.isFinite(Number(v)) ? Number(v) : otherwise;
const uid = () => (crypto.randomUUID?.() || (Date.now()+'-'+Math.random().toString(36).slice(2)));
const escapeHtml = t => String(t??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const dateDisplay = date => new Date(date+'T12:00:00').toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'});
const num = x => Math.round(n(x)).toLocaleString('en-GB');
const svg = (name,cls='icon') => `<svg class="${cls}" aria-hidden="true"><use href="#ico-${name}"></use></svg>`;
const svgSymbols = `<svg xmlns="http://www.w3.org/2000/svg" style="display:none"><defs>
<symbol id="ico-home" viewBox="0 0 24 24"><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/><path d="M9 21v-9h6v9"/></symbol>
<symbol id="ico-dumbbell" viewBox="0 0 24 24"><path d="M6.5 6.5 17.5 17.5M3 8l5-5M16 21l5-5M2 11l9-9M13 22l9-9"/></symbol>
<symbol id="ico-food" viewBox="0 0 24 24"><path d="M4 3v7a3 3 0 0 0 6 0V3M7 3v18M19 21V3c-4 3-5 8-5 12h5"/></symbol>
<symbol id="ico-chart" viewBox="0 0 24 24"><path d="M3 3v18h18M7 16v-4M12 16V7M17 16V10"/></symbol>
<symbol id="ico-water" viewBox="0 0 24 24"><path d="M12 2C9 7 5 11 5 15a7 7 0 0 0 14 0c0-4-4-8-7-13z"/><path d="M9 16a3 3 0 0 0 3 3"/></symbol>
<symbol id="ico-flame" viewBox="0 0 24 24"><path d="M12 22a8 8 0 0 0 8-8c0-4-3-6-5-10 0 4-2 5-3 6C11 7 10 6 9 4 9 9 4 11 4 15a8 8 0 0 0 8 7z"/><path d="M12 22a4 4 0 0 0 4-4c0-2-2-4-4-6-1 3-4 4-4 6a4 4 0 0 0 4 4z"/></symbol>
<symbol id="ico-bolt" viewBox="0 0 24 24"><path d="M13.5 2 5 13h6.5l-1 9L20 10h-7L13.5 2z"/></symbol>
	<symbol id="ico-walk" viewBox="0 0 24 24"><circle cx="13" cy="4" r="2"/><path d="m8 22 2-7 2-4-4-2-3 5M12 11l4 3 4 1M9 7l3 4 1 5 4 6"/></symbol>
<symbol id="ico-protein" viewBox="0 0 24 24"><path d="M15.8 3.2c3.8-.1 6.2 2.7 5.7 6.5-.5 3.3-3.2 6.3-7.2 7.7L9 19l-4-4.1 1.8-5.3c1.5-4 4.7-6.2 9-6.4z"/><path d="M6 15 3.7 17.3a2.1 2.1 0 1 0 3 3l2.4-2.4"/><path d="M3.7 17.3a2.1 2.1 0 0 0-2.2 3 2.2 2.2 0 0 0 3 .5"/></symbol>
<symbol id="ico-timer" viewBox="0 0 24 24"><circle cx="12" cy="13" r="9"/><path d="M12 8v5l4 3M9 2h6"/></symbol>
<symbol id="ico-plus" viewBox="0 0 24 24"><path d="M12 4v16M4 12h16"/></symbol>
<symbol id="ico-check" viewBox="0 0 24 24"><path d="m4 12 5 5L20 6"/></symbol>
<symbol id="ico-x" viewBox="0 0 24 24"><path d="M5 5l14 14M19 5 5 19"/></symbol>
<symbol id="ico-chevron" viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></symbol>
<symbol id="ico-settings" viewBox="0 0 24 24"><path d="M10 2h4l.6 2.6 2.1.9L19 4.1l2.8 2.8-1.5 2.3.9 2.2 2.6.6v4l-2.6.6-.9 2.1 1.5 2.3-2.8 2.8-2.3-1.5-2.1.9-.6 2.6h-4l-.6-2.6-2.1-.9-2.3 1.5-2.8-2.8 1.5-2.3-.9-2.1L.2 16v-4l2.6-.6.9-2.2-1.5-2.3L5 4.1l2.3 1.4 2.1-.9z" transform="translate(1.8 1.8) scale(.85)"/><circle cx="12" cy="12" r="3.3"/></symbol>
<symbol id="ico-camera" viewBox="0 0 24 24"><path d="M3 7h4l2-3h6l2 3h4v13H3z"/><circle cx="12" cy="13" r="4"/></symbol>
<symbol id="ico-bell" viewBox="0 0 24 24"><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 22h4"/></symbol>
<symbol id="ico-cloud" viewBox="0 0 24 24"><path d="M6 19a5 5 0 0 1-1-10 8 8 0 0 1 15 3 4 4 0 0 1-1 7z"/></symbol>
<symbol id="ico-history" viewBox="0 0 24 24"><path d="M3 9V3h6M3 9a9 9 0 1 1 0 6M12 7v6l4 2"/></symbol>
<symbol id="ico-pencil" viewBox="0 0 24 24"><path d="m3 17 11-11 4 4L7 21H3zM13 7l4 4M16 4l2-2 4 4-2 2"/></symbol>
<symbol id="ico-minimise" viewBox="0 0 24 24"><path d="m4 8 8 8 8-8"/></symbol>
<symbol id="ico-arrow" viewBox="0 0 24 24"><path d="M4 12h16m-7-7 7 7-7 7"/></symbol>
<symbol id="ico-info" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 11v6M12 7h.01"/></symbol>
<symbol id="ico-download" viewBox="0 0 24 24"><path d="M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4"/></symbol>
<symbol id="ico-play" viewBox="0 0 24 24"><path d="m7 4 13 8L7 20z"/></symbol>
<symbol id="ico-pause" viewBox="0 0 24 24"><path d="M8 5v14M16 5v14"/></symbol>
<symbol id="ico-stop" viewBox="0 0 24 24"><rect x="5" y="5" width="14" height="14" rx="2"/></symbol>
<symbol id="ico-trash" viewBox="0 0 24 24"><path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14M10 11v7M14 11v7"/></symbol>
<symbol id="ico-refresh" viewBox="0 0 24 24"><path d="M20 6v6h-6M4 18v-6h6"/><path d="M6 9a7 7 0 0 1 12-2l2 5M4 12l2 5a7 7 0 0 0 12-2"/></symbol>
<symbol id="ico-edit" viewBox="0 0 24 24"><path d="m4 17 12-12 3 3L7 20H4z"/></symbol>
<symbol id="ico-swap" viewBox="0 0 24 24"><path d="M4 7h16m-5-4 5 4-5 4M20 17H4m5-4-5 4 5 4"/></symbol>
<symbol id="ico-calendar" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 2v6M17 2v6M3 10h18"/></symbol>
<symbol id="ico-moon" viewBox="0 0 24 24"><path d="M20.6 15.1A8.5 8.5 0 0 1 8.9 3.4a8.6 8.6 0 1 0 11.7 11.7z"/></symbol>
<symbol id="ico-sun" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4.2"/><path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></symbol>
<symbol id="ico-volume" viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9zM17 9a5 5 0 0 1 0 6M20 6a9 9 0 0 1 0 12"/></symbol>
<symbol id="ico-search" viewBox="0 0 24 24"><circle cx="10.7" cy="10.7" r="6.7"/><path d="m15.8 15.8 5.2 5.2"/></symbol>
<symbol id="ico-barcode" viewBox="0 0 24 24"><path d="M3 6V3h3m12 0h3v3M3 18v3h3m12 0h3v-3M6 8v8m3-8v8m2-8v8m3-8v8m2-8v8m2-8v8"/></symbol>
</defs></svg>`;
// Each plan can remember individual set values from its last completed session.
// Saved-set data is optional, keeping the original seven-element template format compatible.
const mkEx = (id,name,sets,reps,weight,rest,alts=[],savedSets=[])=>({id,name,
 sets:Array.from({length:sets},(_,i)=>({id:uid(),kg:n(savedSets?.[i]?.kg,weight),
  reps:n(savedSets?.[i]?.reps,reps),done:false,
  manualKg:i>0&&savedSets?.[i]?.kg!=null&&n(savedSets[i].kg)!==n(savedSets[0]?.kg,weight)})),restSeconds:rest,alts});
function buildWorkoutExercises(template){
 // Existing v1.8 history can prefill v1.9 without altering older records.
 const previous=(state.workoutHistory||[]).slice().reverse().find(h=>h.name===template.name);
 return template.items.map(item=>{
  const fromHistory=previous?.exercises?.find(e=>e.id===item[0]&&e.name===item[1]);
  const sets=Array.isArray(item[7])?item[7]:fromHistory?.sets?.map(set=>({kg:n(set.kg),reps:n(set.reps)}));
  return {...mkEx(...item.slice(0,7),sets),notes:item[8]||'',targetLabel:item[9]||'',unit:item[10]||'reps',ref:item[11]||'',group:item[12]||''};
 });
}
function rememberWorkoutSets(session){
 const template=state.templates.find(t=>t.id===session.templateId);
 if(!template)return;
 for(const exercise of session.exercises){
  const item=template.items.find(x=>x[0]===exercise.id&&x[1]===exercise.name);
  if(!item)continue; // Never carry a swapped exercise's weights into a different movement.
  const previous=Array.isArray(item[7])?item[7]:[];
  item[7]=exercise.sets.map((set,i)=>set.done?
   {kg:Math.max(0,n(set.kg)),reps:Math.max(0,n(set.reps))}:
   (previous[i]||{kg:n(item[4]),reps:n(item[3])}));
 }
}

const TEMPLATES = [
 {id:'A',name:'Full Body A',subtitle:'Foundation · 6 exercises',items:[['legpress','Leg Press',3,10,0,120,['Goblet Squat','Smith Machine Squat','Bulgarian Split Squat']],['chestpress','Machine Chest Press',3,10,0,120,['Dumbbell Bench Press','Push-ups','Barbell Bench Press']],['row','Seated Cable Row',3,10,0,90,['One-arm Dumbbell Row','Chest-supported Row']],['rdl','Dumbbell Romanian Deadlift',2,10,0,120,['Barbell Romanian Deadlift','Lying Leg Curl']],['lateral','Dumbbell Lateral Raise',2,12,0,60,['Cable Lateral Raise','Machine Lateral Raise']],['plank','Plank',2,40,0,60,['Dead Bug','Pallof Press']]]},
 {id:'B',name:'Full Body B',subtitle:'Build · 7 exercises',items:[['goblet','Goblet Squat',3,10,0,120,['Leg Press','Smith Machine Squat']],['incline','Incline Dumbbell Press',3,10,0,120,['Incline Chest Press Machine','Push-ups']],['pulldown','Lat Pulldown',3,10,0,90,['Assisted Pull-up','Band Pulldown']],['curl','Seated Leg Curl',2,12,0,90,['Lying Leg Curl','Romanian Deadlift']],['shoulders','Machine Shoulder Press',2,10,0,90,['Seated Dumbbell Press','Landmine Press']],['biceps','Dumbbell Biceps Curl',2,12,0,60,['Cable Curl','EZ-bar Curl']],['triceps','Cable Triceps Pushdown',2,12,0,60,['Overhead Dumbbell Extension','Close-grip Push-ups']]]}
];
// An independent quick-reference, never used for calorie or macro calculations.
const DEFAULT_MEAL_GUIDE = [
 {id:'guide-breakfast',group:'Breakfast',label:'Eggs & toast',description:'2 eggs + 1 slice of toast'},
 {id:'guide-carbs',group:'Lunch & Dinner',label:'Carbs',description:'2 rotis or 150 g cooked rice or 150 g cooked pasta'},
 {id:'guide-protein',group:'Lunch & Dinner',label:'Protein foods',description:'170 g meat or 90 g paneer/beans'},
 {id:'guide-veg',group:'Lunch & Dinner',label:'Vegetables',description:'170–200 g sautéed vegetables or sabji'}
];
function mealGuideItems(){
 if(!Array.isArray(state.mealGuideItems))state.mealGuideItems=structuredClone(DEFAULT_MEAL_GUIDE);
 return state.mealGuideItems;
}
const INITIAL = () => ({
 version:1, goals:{calories:2200,protein:150,carbs:250,fat:65,fibre:30,water:2500,steps:8000},
 waterPresets:[150,250,500],waterDefault:250,preferences:{haptics:true,waterSound:true,appSounds:true},
 tasks:[{id:'protein',label:'Reach protein target',auto:'protein'},{id:'walk',label:'Reach step goal',auto:'steps'},{id:'water',label:'Reach water goal',auto:'water'},{id:'training',label:'Complete planned workout',auto:'workout'}],
 taskChecks:{}, mealGuideItems:structuredClone(DEFAULT_MEAL_GUIDE), food:[],water:[],activity:[],weights:[],
 measurements:[],
 photos:[],workoutHistory:[],session:null,templates:structuredClone([...FTS_WORKOUTS,...FTS_WORKOUTS_5_TO_15,...FTS_WORKOUTS_16_TO_41]),ftsWorkoutImportVersion:5,
 lastTab:'home',lastBodyPanel:'measurements',lastNutritionPanel:'diary',dirty:false,lastSync:null
});
let confirmation=null,workoutBackGuard=null;
let state,tab='home',modal=null,restSheet=false,exerciseOpen=null,foodMeal='Breakfast',bodyPanel='measurements',nutritionPanel='diary',chartPeriod=4,appMode='normal';
let settingsCloudOpen=false;
let goalDraft=null; // In-progress targets, never committed until Save goals.
let photoUrls=new Map(),currentTimerText=0,restAlertedFor=null,waterCelebration=null,stepRefresh=false,stepRefreshInfo=false;
let taskActionsId=null,taskHoldTimer=null,taskHoldPoint=null,suppressTaskClickUntil=0,swipeGesture=null;
let wasAllTasksComplete=false,taskCelebration=null;
let planActionsId=null,planHoldTimer=null,planHoldPoint=null;
let mealGuideActionsId=null,mealGuideHoldTimer=null,mealGuideHoldPoint=null;
let guideStream=null,guideView='Front',guideDate=today(),compareView='Front';
let foodMenuOpen=false;
let historyPanel=null; // View-only navigation, never written to fitness records.
// Transient camera/photo state. Food photographs are never written to IndexedDB or uploaded.
let barcodeStream=null,barcodeFrame=0,barcodeBusy=false,barcodeLastRead=0;
let foodPhotoUrl=null,photoMealItems=[],photoSearchQuery='';
const MEALS=['Breakfast','Lunch','Dinner','Snack'];
function releaseFoodPhoto(){if(foodPhotoUrl){URL.revokeObjectURL(foodPhotoUrl);foodPhotoUrl=null;}photoMealItems=[];photoSearchQuery='';}
async function stopBarcodeCamera(){if(barcodeFrame){cancelAnimationFrame(barcodeFrame);barcodeFrame=0;}if(barcodeStream){barcodeStream.getTracks().forEach(t=>t.stop());barcodeStream=null;}const video=document.getElementById('barcode-video');if(video)video.srcObject=null;}
async function leaveFoodModal(){if(modal?.type==='barcode')await stopBarcodeCamera();if(modal?.type==='food-photo')releaseFoodPhoto();}
function normaliseBarcode(code){const value=String(code||'').trim();if(!/^\d{8,14}$/.test(value))throw new Error('Enter a barcode of 8–14 digits');return value;}
function validateOpenFoodProduct(data,code){
 const prod=data?.product;
 if(data?.status!==1)throw new Error('No product found. You can enter this food manually.');
 if(!prod||typeof prod!=='object')throw new Error('Product not found');
 const nutr=prod.nutriments||{};
 const read=key=>{const v=Number(nutr[key]);return nutr[key]==null||!Number.isFinite(v)||v<0||v>100000?null:v;};
 let calories=read('energy-kcal_100g');
 if(calories==null)calories=read('energy-kcal');
 if(calories==null){const kJ=read('energy-kj_100g')??read('energy_100g');if(kJ!=null)calories=Math.round(kJ/4.184*10)/10;}
 if(calories==null)throw new Error('This product has no per-100 g energy information. Use manual entry.');
 const rawName=String(prod.product_name_de||prod.product_name||prod.product_name_en||prod.generic_name_de||'').trim();
 if(!rawName)throw new Error('Product name is missing. Use manual entry.');
 const name=rawName.slice(0,100),brand=String(prod.brands||'').slice(0,75);
 // Retailer names are reported only when listed in the community record.
 const stores=String(prod.stores||'').split(',').map(x=>x.trim()).filter(Boolean).slice(0,5).join(', ').slice(0,140);
 const missing=['protein','carbs','fat','fibre'].filter(k=>({protein:read('proteins_100g'),carbs:read('carbohydrates_100g'),fat:read('fat_100g'),fibre:read('fiber_100g')})[k]===null);
 const numbers={calories,protein:read('proteins_100g'),carbs:read('carbohydrates_100g'),fat:read('fat_100g'),fibre:read('fiber_100g')};
 return {code,name,brand,stores,source:'Open Food Facts',per100:numbers,missing,quantity:String(prod.quantity||'').slice(0,60),defaultGrams:100,cached:false};
}
async function lookupBarcode(raw){
 const code=normaliseBarcode(raw);
 const cached=await get('barcode-cache-'+code).catch(()=>null);
 if(!navigator.onLine){if(cached?.product)return {...cached.product,cached:true};throw new Error('Offline: this barcode has not been looked up before.');}
 if(cached?.product && Date.now()-cached.savedAt<30*86400000)return {...cached.product,cached:true};
 let response;
 try{response=await fetch('https://world.openfoodfacts.org/api/v2/product/'+encodeURIComponent(code)+'.json?fields=code,product_name_de,product_name,product_name_en,generic_name_de,brands,quantity,nutriments,stores&lc=de&cc=de',{
  signal:AbortSignal.timeout(15000),cache:'no-store'
 });}catch(error){if(cached?.product)return {...cached.product,cached:true};throw new Error('Lookup unavailable. Check your connection or enter this food manually.');}
 if(!response.ok){if(cached?.product)return {...cached.product,cached:true};throw new Error(response.status===429?'Food database is busy. Please wait and try again.':'Food database unavailable ('+response.status+').');}
 const product=validateOpenFoodProduct(await response.json(),code);
 await put('barcode-cache-'+code,{product,savedAt:Date.now()});
 return product;
}
async function resolveBarcode(code){
 if(barcodeBusy)return;
 barcodeBusy=true;
 const status=document.getElementById('barcode-status');if(status)status.textContent='Looking up packaged food…';
 try{
  const product=await lookupBarcode(code);
  await stopBarcodeCamera();modal={type:'barcode-portion',product,meal:foodMeal,grams:100};render();
 }catch(error){if(status)status.textContent=error.message;notify(error.message);}
 finally{barcodeBusy=false;}
}
async function startBarcodeCamera(){
 if(!('BarcodeDetector' in window)){notify('Camera barcode recognition is unavailable here. Enter the code manually.');return;}
 if(!navigator.mediaDevices?.getUserMedia){notify('Camera unavailable. Enter the barcode manually.');return;}
 await stopBarcodeCamera();
 const video=document.getElementById('barcode-video');if(!video)return;
 try{
  const detector=new BarcodeDetector({formats:['ean_13','ean_8','upc_a','upc_e','code_128']});
  barcodeStream=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:'environment'},width:{ideal:1280}}});
  video.srcObject=barcodeStream;await video.play();
  const status=document.getElementById('barcode-status');if(status)status.textContent='Point the camera at a barcode. Scanning stays on your phone.';
  const loop=async(t)=>{
   if(!barcodeStream||modal?.type!=='barcode')return;
   if(t-barcodeLastRead>650&&!barcodeBusy&&video.readyState>=2){barcodeLastRead=t;
    try{const found=await detector.detect(video);const code=found.map(x=>x.rawValue).find(x=>/^\d{8,14}$/.test(x));if(code){await resolveBarcode(code);return;}}catch(err){console.debug('Frame scan unavailable',err);}
   }
   if(barcodeStream&&modal?.type==='barcode')barcodeFrame=requestAnimationFrame(loop);
  };
  barcodeFrame=requestAnimationFrame(loop);
 }catch(err){await stopBarcodeCamera();notify('Camera unavailable. You can still enter the barcode manually.');}
}
function barcodeView(){return modalShell('Scan a barcode',`<p class="food-search-intro">Packaged products from <b>Open Food Facts</b>. Recognition happens on your device, then only the barcode is sent for lookup.</p><video id="barcode-video" class="food-barcode-video" autoplay muted playsinline aria-label="Barcode camera preview"></video><button type="button" class="btn block" data-action="barcode-camera">${svg('camera','tiny-icon')} Start camera scanner</button><p id="barcode-status" class="hint" role="status">Use the camera if supported, or type the product barcode.</p><form id="form-barcode-lookup"><div class="field"><label class="label" for="barcode-input">Barcode (8–14 digits)</label><input class="input" id="barcode-input" name="barcode" inputmode="numeric" autocomplete="off" pattern="[0-9]{8,14}" maxlength="14" placeholder="e.g. 3017620422003" required/></div><button class="btn primary block" type="submit">Find packaged food</button></form><p class="hint">Free community database. Some products or nutrition fields may be missing. Requires internet for a new barcode; previously looked-up products are cached on this device. <a href="https://world.openfoodfacts.org/" target="_blank" rel="noopener noreferrer">Open Food Facts</a> · ODbL.</p><button class="btn block" data-action="manual-food">Enter product manually</button>`);}
function barcodePortionView(){
 const item=modal.product,grams=n(modal.grams,100),meal=modal.meal||foodMeal;
 const vals=barcodeNutrients(item,grams),missing=item.missing;
 return modalShell('Review packaged food',`<form id="form-barcode-food"><div class="food-picked"><span class="eyebrow">OPEN FOOD FACTS · BARCODE ${escapeHtml(item.code)}</span><h3>${escapeHtml(item.name)}</h3><p class="hint">${escapeHtml(item.brand||'Community-submitted product')} · ${item.cached?'Saved lookup':'Live lookup'}${item.stores?' · Shops listed: '+escapeHtml(item.stores):''}</p></div><div class="field"><label class="label" for="barcode-grams">Quantity eaten (grams / ml)</label><input class="input" id="barcode-grams" type="number" name="grams" inputmode="decimal" step="1" min="1" max="5000" value="${grams}" required/></div><div class="field"><label class="label" for="barcode-meal">Add to</label><select class="input" name="meal" id="barcode-meal">${MEALS.map(m=>`<option ${m===meal?'selected':''}>${m}</option>`).join('')}</select></div><div class="field"><label class="label" for="barcode-date">Date</label><input class="input" id="barcode-date" type="date" name="date" value="${today()}" required/></div><div id="barcode-macros" class="food-preview-macros">${barcodePreview(item,vals)}</div><p class="hint">${missing.length?'Some macros are missing and shown as “—”. Edit missing values here before saving.':'Review package values and serving units before saving.'} Community records may contain errors.</p>${missing.map(k=>`<div class="field"><label class="label">${escapeHtml(k)} (g, total for selected portion)</label><input class="input barcode-missing-field" data-nutrient="${k==='proteins'?'protein':k==='carbohydrates'?'carbs':k==='fiber'?'fibre':k}" type="number" inputmode="decimal" min="0" max="5000" step="0.1" placeholder="Please enter from the label" required/></div>`).join('')}<button type="submit" class="btn primary block">Add to food diary</button></form>`);
}
function barcodeNutrients(item,grams){const vals={};for(const k of ['calories','protein','carbs','fat','fibre'])vals[k]=item.per100[k]==null?null:Math.round(item.per100[k]*grams/10)/10;return vals;}
function barcodePreview(item,vals){const display={...vals};for(const k of Object.keys(display))if(display[k]===null)display[k]='—';return `<div class="food-calorie-head"><span>Energy from label</span><b>${num(vals.calories)} <small>kcal</small></b></div><div class="food-macro-grid">${[['protein','Protein'],['carbs','Carbs'],['fat','Fat'],['fibre','Fibre']].map(([k,name])=>`<div><b>${vals[k]==null?'—':n(vals[k]).toFixed(1)+' g'}</b><span>${name}</span></div>`).join('')}</div>`;}
function photoMealView(){
 const matches=searchFoods(photoSearchQuery,8);
 const names=photoMealItems.map(x=>findFood(x.foodId)).filter(Boolean);
 const totals={calories:0,protein:0,carbs:0,fat:0,fibre:0};
 for(const item of photoMealItems){const food=findFood(item.foodId);if(!food)continue;const v=nutrientsForGrams(food,Math.max(1,n(item.grams,100)));for(const k of Object.keys(totals))totals[k]+=v[k];}
 return modalShell('Photo-assisted meal',`<p class="food-search-intro">Your photo stays on your phone. Select each food and enter its cooked weight. For experimental on-device suggestions, open Photo meal from the + Food menu.</p><div class="field"><label class="label" for="food-photo-input">Take or choose a meal photograph (optional)</label><input id="food-photo-input" class="input" type="file" accept="image/*" capture="environment"/></div><div class="meal-photo-preview" id="meal-photo-preview">${foodPhotoUrl?`<img src="${foodPhotoUrl}" alt="Your selected meal photograph"/>`:'<span>Food photo preview (kept on this device only)</span>'}</div><div class="field"><label class="label" for="photo-food-search">Add items from Indian food catalogue</label><input class="input" type="search" id="photo-food-search" placeholder="Try dal, rice or sabji…" value="${escapeHtml(photoSearchQuery)}" autocomplete="off"/></div><div id="photo-food-results" class="photo-food-results">${matches.map(f=>`<button type="button" class="photo-food-match" data-action="photo-food-add" data-id="${escapeHtml(f.id)}">${svg('plus','tiny-icon')} ${escapeHtml(f.name)}</button>`).join('')}</div><form id="form-photo-meal"><div id="photo-meal-lines">${photoMealItems.map(item=>{const food=findFood(item.foodId);return food?`<div class="photo-meal-line"><span>${escapeHtml(food.name)}</span><input class="input" aria-label="Cooked weight for ${escapeHtml(food.name)}" type="number" name="grams-${escapeHtml(item.id)}" data-photo-line="${escapeHtml(item.id)}" value="${n(item.grams,food.defaultGrams)}" min="1" max="5000" step="1" inputmode="decimal" required/><span>g</span><button type="button" class="btn round" data-action="photo-food-remove" data-id="${escapeHtml(item.id)}" aria-label="Remove ${escapeHtml(food.name)}">${svg('x','tiny-icon')}</button></div>`:'';}).join('')||'<p class="hint">Choose each item in the photograph above.</p>'}</div><div class="field"><label class="label">Meal</label><select name="meal" class="input">${MEALS.map(m=>`<option ${m===foodMeal?'selected':''}>${m}</option>`).join('')}</select></div><div class="field"><label class="label">Date</label><input name="date" class="input" type="date" value="${today()}" required/></div><div class="food-preview-macros" id="photo-total-preview">${foodNutritionPreview(totals)}</div><p class="hint">Home-recipe estimates, not measured values. Oil, ghee and cooking method may change the totals. No original image is saved.</p><button class="btn primary block" type="submit" ${photoMealItems.length?'':'disabled'}>Review and save ${photoMealItems.length} ${photoMealItems.length===1?'food':'foods'}</button></form>`);
}

const renderLater=()=>{render();};
const reducedMotion=()=>window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches===true;
function themeChoice(){return ['light','dark'].includes(state?.preferences?.themeMode)?state.preferences.themeMode:'system';}
function effectiveTheme(){const selected=themeChoice();return selected==='system'?(window.matchMedia?.('(prefers-color-scheme: dark)')?.matches?'dark':'light'):selected;}
function applyTheme(){const mode=effectiveTheme();document.documentElement.dataset.theme=mode;document.documentElement.style.colorScheme=mode;for(const el of document.querySelectorAll('meta[name="theme-color"]')){if(el.media?.includes('dark')&&mode==='dark'||el.media?.includes('light')&&mode==='light'||!el.media){el.content=mode==='dark'?'#050709':'#f3f2ee';}}}

function haptic(kind='tap',force=false){
  // PWAs can only request vibration. Android, the browser and user settings decide whether it is felt.
  if(!force && state?.preferences?.haptics===false)return false;
  if(typeof navigator.vibrate!=='function')return false;
  const patterns={tap:22,check:34,success:[23,38,29],hold:40,warning:[42,55,42],test:[55,50,65]};
  try{return navigator.vibrate(patterns[kind]||patterns.tap)===true;}catch{return false;}
}
function motionChange(change,kind='tab',direction=1){
 const isMorph=kind==='expand'||kind==='minimize';
 const oldEl=isMorph?(kind==='expand'?document.querySelector('.floating-workout'):document.querySelector('.workout-focus-shell .top')):null;
 const oldRect=oldEl?.getBoundingClientRect();
 change();
 if(reducedMotion())return;
 const target=document.querySelector('.main');
 if(!target?.animate)return;
 for(const running of target.getAnimations())running.cancel();
 if(isMorph&&oldRect){
  const newEl=kind==='expand'?document.querySelector('.workout-focus-shell .top'):document.querySelector('.floating-workout');
  const dest=newEl?.getBoundingClientRect();
  if(dest?.width&&dest?.height){
   const ghost=document.createElement('div');ghost.className='workout-morph-ghost';
   ghost.style.cssText=`left:${oldRect.left}px;top:${oldRect.top}px;width:${oldRect.width}px;height:${oldRect.height}px`;
   document.body.appendChild(ghost);
   const dx=dest.left-oldRect.left,dy=dest.top-oldRect.top;
   const scaleX=Math.min(3,Math.max(.3,dest.width/oldRect.width));
   const scaleY=Math.min(3,Math.max(.3,dest.height/oldRect.height));
   const animation=ghost.animate([
    {transform:'translate3d(0,0,0) scale(1)',opacity:.84},
    {transform:`translate3d(${dx}px,${dy}px,0) scale(${scaleX},${scaleY})`,opacity:0}
   ],{duration:365,easing:'cubic-bezier(.22,1,.36,1)',fill:'forwards'});
   animation.finished.catch(()=>{}).finally(()=>ghost.remove());
  }
 }
 const isTab=kind==='tab',dx=isTab?0:0;
 if(isTab){target.classList.add('page-enter');clearTimeout(motionChange.t);motionChange.t=setTimeout(()=>document.querySelector('.main')?.classList.remove('page-enter'),1500);}
 target.animate([
  {transform:`translate3d(${dx}px,${isTab?0:9}px,0) scale(${isTab?1:.995})`,opacity:isTab?1:isMorph?.77:.94},
  {transform:'translate3d(0,0,0) scale(1)',opacity:1}
 ],{duration:isTab?190:300,easing:'cubic-bezier(.22,1,.36,1)',fill:'none'});
}

function notify(message){const el=$('#toast');el.textContent=message;el.classList.add('show');clearTimeout(notify.timeout);notify.timeout=setTimeout(()=>el.classList.remove('show'),3000);}
async function persist(){state.dirty=true;await put('state',state);}
function allTasksComplete(){return state.tasks.length>0 && state.tasks.every(checkboxDone);}
function celebrateAllTasksIfNew(){
 const complete=allTasksComplete(),day=today();
 if(complete&&!wasAllTasksComplete&&state.taskCelebratedOn!==day){
  state.taskCelebratedOn=day;taskCelebration=day;
  haptic('success');playUiSound('celebrate');
  setTimeout(()=>{if(taskCelebration===day){taskCelebration=null;document.querySelector('.task-win-celebration')?.remove();}},5000);
 }
 wasAllTasksComplete=complete;
}
async function commit(){celebrateAllTasksIfNew();await persist();render();}
async function addQuickWater(ml){ml=Math.round(ml);if(ml<1)return;playWaterSound();const entry={id:uid(),date:today(),ml};state.water.push(entry);waterCelebration={id:entry.id,ml};haptic('success');await commit();const id=entry.id;setTimeout(()=>{if(waterCelebration?.id===id){waterCelebration=null;if(tab==='home'&&!modal)render();}},5200);}
async function undoCelebrationWater(){if(!waterCelebration)return;const {id}=waterCelebration;state.water=state.water.filter(x=>x.id!==id);waterCelebration=null;await commit();notify('Sip un-sipped.');}
async function removeRecentWater(){let left=n(state.waterDefault,250)||250,removed=0;for(let i=state.water.length-1;i>=0&&left>0;i--){const entry=state.water[i];if(entry.date!==today())continue;const deduction=Math.min(left,n(entry.ml));entry.ml-=deduction;removed+=deduction;left-=deduction;if(waterCelebration?.id===entry.id)waterCelebration=null;if(entry.ml<=0)state.water.splice(i,1);}if(!removed){notify('No water logged today to subtract.');return;}await commit();notify(`−${num(removed)} ml. Adjusted your water total.`);}

function daily(list,day=today()){return list.filter(x=>x.date===day);}
function nutritionTotals(day=today()){return daily(state.food,day).reduce((a,x)=>{for(const k of ['calories','protein','carbs','fat','fibre'])a[k]+=n(x[k]);return a;},{calories:0,protein:0,carbs:0,fat:0,fibre:0});}
function waterSum(day=today()){return daily(state.water,day).reduce((s,x)=>s+n(x.ml),0);}
function activityToday(day=today()){return state.activity.find(x=>x.date===day)||{steps:0,activeCalories:0};}
async function syncNativeActivity(){
 if(!nativeHealthAvailable())throw new Error('Health Connect requires the Recomp Android wrapper. A PWA cannot read it directly.');
 const date=today(),previous=state.activity.find(x=>x.date===date);
 const next=await readHealthConnectDay(date);
 if(previous&&previous.source!=='Health Connect'&&(Number(previous.steps)>0||Number(previous.activeCalories)>0)){
  if(!await confirmInApp("Replace today\'s manually entered steps and active calories with Health Connect totals? Older dates remain unchanged."))return;
 }
 if(next.steps===0&&next.activeCalories===0&&previous&&(previous.steps||previous.activeCalories)){
  notify('No activity returned from Health Connect; existing manual values were kept.');return;
 }
 state.activity=mergeDailyActivity(state.activity,next);
 await commit();
 notify('Health Connect: '+num(next.steps)+' steps · '+num(next.activeCalories)+' active kcal');
}
function checkboxDone(task){let d=today();if(Object.prototype.hasOwnProperty.call(state.taskChecks?.[d]||{},task.id))return Boolean(state.taskChecks[d][task.id]);if(task.auto==='protein')return nutritionTotals(d).protein >= state.goals.protein;if(task.auto==='steps')return activityToday(d).steps >= state.goals.steps;if(task.auto==='water')return waterSum(d)>=state.goals.water;if(task.auto==='workout')return state.workoutHistory.some(w=>w.date===d);return Boolean(state.taskChecks[d]?.[task.id]);}
function progress(value,max){return `<div class="progress"><div style="width:${Math.min(100,Math.max(0,max?n(value)/n(max)*100:0))}%"></div></div>`;}
function iconButton(icon,action,extra='',title=''){return `<button class="btn ${extra}" data-action="${action}" ${title?`aria-label="${escapeHtml(title)}"`:''}>${svg(icon)}</button>`;}
// ---- Premium UI helpers (v2.2): greetings, rings, witty status lines, charts -------------
const EYEBROWS={home:'Today',workouts:'Train',nutrition:'Fuel',body:'Progress',settings:'Settings'};
const METRIC_COLOURS={protein:'var(--c-protein)',walk:'var(--c-steps)',flame:'var(--c-burn)',water:'var(--c-water)',chart:'var(--accent)'};
function greeting(hour=new Date().getHours(),name=''){
 const who=name?escapeHtml(String(name).trim().slice(0,40)):'';
 if(hour<5)return who?'Still up, '+who+'?':'Night owl.';
 if(hour<12)return who?'Morning, '+who+'.':'Morning, champ.';
 if(hour<17)return who?'Afternoon, '+who+'.':'Afternoon push.';
 if(hour<22)return who?'Evening, '+who+'.':'Evening, closer.';
 return who?'Good night, '+who+'.':'Last call.';
}
function ringSvg(rings){ // rings: [{pct,cls,r}] drawn from the outside in
 const SIZE=200,C=SIZE/2;
 return `<svg class="rings" viewBox="0 0 ${SIZE} ${SIZE}" aria-hidden="true">${rings.map(({pct,cls,r})=>{const circ=2*Math.PI*r,off=circ*(1-Math.min(1,Math.max(0,pct)));return `<circle class="ring-track" cx="${C}" cy="${C}" r="${r}"/><circle class="ring-bar ${cls}" cx="${C}" cy="${C}" r="${r}" style="--c:${circ.toFixed(1)}" stroke-dasharray="${circ.toFixed(1)}" stroke-dashoffset="${off.toFixed(1)}"/>`;}).join('')}</svg>`;
}
function dayQuip({nutr,w,act,checked,totalTasks}){
 const g=state.goals,pCal=n(nutr.calories)/n(g.calories,1),pPro=n(nutr.protein)/n(g.protein,1),pWat=w/n(g.water,1),pSteps=n(act.steps)/n(g.steps,1);
 const hour=new Date().getHours();
 if(totalTasks&&checked===totalTasks)return 'Every box ticked. Frankly, show-off behaviour.';
 if(pCal>1.1)return 'Over target. One good meal does not undo a good week.';
 if(pPro>=1&&pWat>=1)return 'Protein and water both done. The gains department salutes you.';
 if(pPro>=1)return 'Protein target smashed. Your muscles are writing you a thank-you note.';
 if(pWat>=1)return 'Hydration complete. You are basically a houseplant now.';
 if(pSteps>=1)return 'Step goal done. Your watch is thrilled.';
 if(!state.food.some(f=>f.date===today())&&hour<11)return 'Blank slate. Log breakfast and make it interesting.';
 if(!state.food.some(f=>f.date===today())&&hour>=15)return 'Nothing logged yet. Your future self would like receipts.';
 if(pCal>0.6)return 'Past halfway on fuel. Steady, not stressed.';
 return 'Small wins stack. Pick one and go get it.';
}
function weightDeltaQuip(list){const sorted=[...list].sort((a,b)=>a.date.localeCompare(b.date));if(sorted.length<2)return sorted.length?'Baseline set':'Step on the scale';const d=Math.round((sorted.at(-1).kg-sorted.at(-2).kg)*10)/10;return d===0?'Steady as a rock':`${d>0?'+':'−'}${Math.abs(d)} kg since last`;}
function weightChart(points){
 if(points.length<2)return points.length?`<p class="hint" style="margin:14px 0 4px">One weigh-in logged. Add another next week and the line shows up.</p>`:'';
 const W=320,H=130,padX=12,padTop=16,padBot=22;
 const vals=points.map(p=>p.kg),lo=Math.min(...vals),hi=Math.max(...vals),span=Math.max(0.6,hi-lo);
 const min=lo-span*0.25,max=hi+span*0.25;
 const x=i=>padX+(W-padX*2)*(i/(points.length-1));
 const y=v=>padTop+(H-padTop-padBot)*(1-(v-min)/(max-min));
 const pts=points.map((p,i)=>[x(i),y(p.kg)]);
 // smooth (Catmull-Rom → cubic Bézier) line
 let d=`M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
 for(let i=0;i<pts.length-1;i++){const p0=pts[i-1]||pts[i],p1=pts[i],p2=pts[i+1],p3=pts[i+2]||p2;
  d+=` C${(p1[0]+(p2[0]-p0[0])/6).toFixed(1)},${(p1[1]+(p2[1]-p0[1])/6).toFixed(1)} ${(p2[0]-(p3[0]-p1[0])/6).toFixed(1)},${(p2[1]-(p3[1]-p1[1])/6).toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;}
 const area=`${d} L${pts.at(-1)[0].toFixed(1)},${H-padBot} L${pts[0][0].toFixed(1)},${H-padBot} Z`;
 const last=pts.at(-1);
 return `<div class="weight-chart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Weight trend from ${lo} to ${hi} kilograms"><defs><linearGradient id="wcFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--accent)" stop-opacity=".32"/><stop offset="1" stop-color="var(--accent)" stop-opacity="0"/></linearGradient></defs>
  ${[0,1,2].map(i=>`<line class="wc-grid" x1="${padX}" x2="${W-padX}" y1="${(padTop+(H-padTop-padBot)*i/2).toFixed(1)}" y2="${(padTop+(H-padTop-padBot)*i/2).toFixed(1)}"/>`).join('')}
  <path d="${area}" fill="url(#wcFill)"/><path class="wc-line" d="${d}"/>
  ${pts.slice(0,-1).map(p=>`<circle class="wc-dot" cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="3.2"/>`).join('')}
  <circle class="wc-pulse" cx="${last[0].toFixed(1)}" cy="${last[1].toFixed(1)}" r="6"/><circle class="wc-dot last" cx="${last[0].toFixed(1)}" cy="${last[1].toFixed(1)}" r="5"/>
  <text class="wc-label" x="${padX}" y="${H-5}">${escapeHtml(dateDisplay(points[0].date).replace(/ \d{4}$/,''))}</text>
  <text class="wc-label" x="${W-padX}" y="${H-5}" text-anchor="end">${escapeHtml(dateDisplay(points.at(-1).date).replace(/ \d{4}$/,''))}</text></svg></div>`;
}
function heading(title,desc='',action=''){const isDark=effectiveTheme()==='dark';return `<header class="top"><div>${tab==='settings'?'':`<div class="eyebrow">${EYEBROWS[tab]||'Recomp'}</div>`}<h1 class="page-title">${title}</h1>${desc?`<div class="subhead">${desc}</div>`:''}</div><div class="right-actions">${action}<button type="button" class="btn round theme-trigger" title="Switch to ${isDark?'day':'night'} mode" aria-label="Switch to ${isDark?'light':'dark'} mode" data-action="toggle-theme">${svg(isDark?'sun':'moon')}</button><button class="btn round settings-trigger" title="Open settings" aria-label="Open settings" data-action="settings">${svg('settings')}</button></div></header>`;}
function metric(title,value,goal,unit,iconName,action='',quip=''){
 const logged=value!==null&&value!==undefined&&value!=='';
 const tag=action?'button':'div';
 return `<${tag} class="card metric ${action?'metric-interactive':''} ${iconName==='flame'?'energy-out':''}" style="--mc:${METRIC_COLOURS[iconName]||'var(--accent)'}" ${action?`type="button" data-action="${action}" aria-label="${escapeHtml(title)}: ${logged?num(value):'not recorded'} ${unit}. Tap to ${action==='metric-water'?'log water':action==='refresh-steps'?'refresh steps':'update activity'}."`:''}><div class="metric-top"><span class="muted strong small">${title}</span><span class="metric-icon">${svg(iconName,'sm-icon')}</span></div><div class="big">${logged?num(value):'—'} <span class="small muted">${logged?unit:''}</span></div>${goal?progress(value,goal):'<div></div>'}<div class="metric-foot"><span>${quip|| (!logged?'Not recorded yet':goal===null?'Manually tracked':`Goal: ${num(goal)} ${unit}`)}</span><span>${goal?Math.round(value/goal*100)+'%':''}</span></div></${tag}>`;
}
function taskList(){
 if(!state.tasks.length)return `<div class="empty-tasks">A fresh start. Add a daily task to build your routine.</div>`;
 return state.tasks.map(t=>{
   const done=checkboxDone(t);
   const id=escapeHtml(t.id),name=escapeHtml(t.label);
   const managing=taskActionsId===t.id;
   return `<div class="check-task ${done?'is-done':''} ${managing?'task-management-open':''}" data-task-row="${id}" tabindex="0" role="group" aria-label="${name}. Tap the checkbox to complete; press and hold to edit or delete.">
    <label class="task-check-label"><input class="checkbox" type="checkbox" data-task-id="${id}" ${done?'checked':''} aria-label="Mark ${name} as ${done?'not done':'done'}"/><span class="task-text">${name}</span></label>
    ${managing?`<div class="task-row-actions" aria-label="Actions for ${name}"><button type="button" class="task-icon-btn" data-action="edit-task" data-id="${id}" aria-label="Edit ${name}" title="Edit task">${svg('edit','tiny-icon')}</button><button type="button" class="task-icon-btn delete-task" data-action="delete-task" data-id="${id}" aria-label="Delete ${name}" title="Delete task">${svg('trash','tiny-icon')}</button></div>`:''}
   </div>`;
 }).join('');
}
function taskWinView(){
 const bits=Array.from({length:32},(_,i)=>{
  const angle=i*2*Math.PI/32,dist=125+(i%5)*25;
  return `<i style="--tx:${Math.round(Math.cos(angle)*dist)}px;--ty:${Math.round(Math.sin(angle)*dist)}px;--delay:${i%5*28}ms;--hue:${i%3===0?'156':i%3===1?'48':'192'}"></i>`;
 }).join('');
 return `<div class="task-win-celebration" role="status" aria-live="polite">
  <div class="task-win-burst" aria-hidden="true">${bits}</div>
  <div class="task-win-message"><span class="task-win-star" aria-hidden="true">✦</span><strong>Every task, done!</strong><span>You've crushed today's list. Keep that momentum.</span></div>
 </div>`;
}
function homeTasksSection(checked){return `<section class="dashboard-tasks" aria-label="Daily tasks">
  <div class="section-head"><div><h2 class="section-title">Daily tasks</h2><div class="muted small">Tap to tick · hold to edit.</div></div><div class="row"><span class="pill">${checked}/${state.tasks.length} done</span><button type="button" class="btn task-add-btn" data-action="add-task">${svg('plus','tiny-icon')} Add</button></div></div>
  <div class="card daily-tasks">${taskList()}</div>
 </section>`;}
function homeView(){const nutr=nutritionTotals(),act=activityToday(),w=waterSum(),checked=state.tasks.filter(checkboxDone).length;const waterAmount=n(state.waterDefault,250)||250;const account=getClerkAccount(),viewerName=account?.firstName||account?.name?.split(/\s+/)[0]||'';return `
${heading(greeting(new Date().getHours(),viewerName),new Date().toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long'}))}
<div class="dashboard-intro"><span class="orbit-dot"></span><span>${escapeHtml(dayQuip({nutr,w,act,checked,totalTasks:state.tasks.length}))}</span></div>
<section class="summary-hero hero-rings" aria-label="Today's rings"><div class="rings-wrap">${ringSvg([{pct:n(nutr.calories)/n(state.goals.calories,1),cls:'fuel',r:90},{pct:n(nutr.protein)/n(state.goals.protein,1),cls:'protein',r:75},{pct:w/n(state.goals.water,1),cls:'water',r:60}])}<div class="rings-center"><span class="rings-num">${num(Math.max(0,state.goals.calories-nutr.calories))}</span><span class="rings-label">kcal left</span></div></div><div class="rings-legend"><div class="legend-row" style="--c:var(--c-fuel)"><i></i><span>Fuel</span><b>${num(nutr.calories)}<small>/ ${num(state.goals.calories)}</small></b></div><div class="legend-row" style="--c:var(--c-protein)"><i></i><span>Protein</span><b>${num(nutr.protein)}<small>/ ${num(state.goals.protein)} g</small></b></div><div class="legend-row" style="--c:var(--c-water)"><i></i><span>Water</span><b>${num(w)}<small>/ ${num(state.goals.water)} ml</small></b></div></div></section>
<div class="metric-grid">${metric('Protein',nutr.protein,state.goals.protein,'g','protein','',nutr.protein>=state.goals.protein?'Gains secured':'Feed the gains')}${metric('Steps',act.steps,state.goals.steps,'','walk','refresh-steps',stepRefresh?'Checking…':'Tap to refresh')}${metric('Calories burnt',act.activeCalories,null,'kcal','flame','metric-active',act.activeCalories?'Tap to update':'Go on, break a sweat ↗')}${metric('Water',w,state.goals.water,'ml','water','metric-water',`Tap for +${num(waterAmount)} ml`)}</div>
${stepRefreshInfo?`<div class="connection-note">${svg('info','tiny-icon')} <span><b>Health Connect is not available in this browser.</b> You can still enter steps and calories manually.</span><button class="btn ghost" data-action="activity">Edit</button></div>`:''}
${homeTasksSection(checked)}
<div class="home-tools"><div><div class="section-head"><div><h2 class="section-title">Hydration station</h2><div class="muted small">Sip. Repeat. Celebrate.</div></div><span class="small muted">${num(w)} / ${num(state.goals.water)} ml</span></div><div class="card water-panel ${w>0?'':'is-empty'}" style="--fill:${Math.min(100,Math.round(w/Math.max(1,n(state.goals.water,1))*100))}%"><button type="button" class="btn ghost water-settings water-settings-top" data-action="water-config" aria-label="Configure water amount and goal" title="Configure water">${svg('settings')}</button><div class="water-inline">${svg('water','big-icon')}<div><b>${num(w)} <span class="muted small">ml</span></b><p class="muted small">${w>=state.goals.water?'Fully hydrated. Smug, but earned.':w>0?'Your body says cheers.':'Day one of the water arc.'}</p></div></div><div class="water-stepper"><button class="water-step-button" data-action="water-minus" title="Subtract configured amount" aria-label="Subtract configured water amount">−</button><span class="water-step-amount">${num(waterAmount)} <span class="muted">ml</span><small>per tap</small></span><button class="water-step-button plus" data-action="metric-water" title="Add water" aria-label="Add ${waterAmount} millilitres of water">+</button></div></div></div></div>
${state.session?`<div class="section-head"><h2 class="section-title">Unfinished business</h2></div><div class="card row space"><div><b>${escapeHtml(state.session.name)}</b><div class="small muted">Your session is saved and the bar is still warm.</div></div><button class="btn primary" data-action="resume-workout">Resume</button></div>`:''}`;}
function mealGuideView(){
 const items=mealGuideItems();
 const renderGroup=(group)=>{
  const list=items.filter(item=>item.group===group);
  return list.map(item=>{
   const open=mealGuideActionsId===item.id;
   // Presentation labels are short, but saved guide entries are never rewritten.
   const visibleLabel=item.id==='guide-breakfast'&&['Eggs & toast','Breakfast'].includes(item.label)?'Breakfast':
       item.id==='guide-protein'&&item.label==='Protein foods'?'Protein':
       item.id==='guide-veg'&&item.label==='Vegetables'?'Fibre':item.label;
   return `<div class="meal-guide-entry meal-guide-option ${open?'meal-guide-edit-open':''}" data-guide-item="${escapeHtml(item.id)}" tabindex="0" role="group" aria-label="${escapeHtml(visibleLabel)}. Press and hold to edit or delete.">
     <div class="meal-guide-entry-copy"><span class="meal-guide-type">${escapeHtml(visibleLabel)}</span><p>${escapeHtml(item.description)}</p></div>
     ${open?`<div class="meal-guide-entry-actions"><button type="button" class="btn guide-item-button" data-action="edit-guide-item" data-id="${escapeHtml(item.id)}" aria-label="Edit ${escapeHtml(visibleLabel)}">${svg('edit','tiny-icon')} Edit</button><button type="button" class="btn danger guide-item-button" data-action="delete-guide-item" data-id="${escapeHtml(item.id)}" aria-label="Delete ${escapeHtml(visibleLabel)}">${svg('trash','tiny-icon')} Delete</button></div>`:''}
    </div>`;
  }).join('') || `<p class="meal-guide-no-items">No entries in this section.</p>`;
 };
 return `<section class="meal-guide meal-guide-compact" aria-label="Your Everyday Plate">
  <div class="meal-guide-heading"><h3>Your Everyday Plate</h3></div>
  <div class="meal-guide-compact-list" aria-label="Breakfast options">${renderGroup('Breakfast')}</div>
  <div class="meal-guide-compact-subhead">Lunch / Dinner</div>
  <div class="meal-guide-compact-list" aria-label="Lunch and dinner options">${renderGroup('Lunch & Dinner')}</div>
  <p class="meal-guide-compact-note">Portion guide · Hold an entry to edit</p>
 </section>`;
}
function nutritionView(){if(historyPanel==='food')return foodHistoryHtml(state.food);
 const t=nutritionTotals(),entries=daily(state.food);const MACRO_COLOUR={protein:'var(--c-protein)',carbs:'var(--c-carb)',fat:'var(--c-fat)',fibre:'var(--c-fibre)'};let bar= ['protein','carbs','fat','fibre'].map(k=>`<div class="macro-row" style="--mc:${MACRO_COLOUR[k]}"><div class="row space small"><span class="strong"><i class="macro-dot"></i>${k[0].toUpperCase()+k.slice(1)}</span><span><strong>${Math.round(t[k])}</strong> / ${state.goals[k]} g</span></div>${progress(t[k],state.goals[k])}</div>`).join('');return `${heading('Fuel up.','Logging beats guessing. Every single time.')}<div class="mp-launch card"><div><b>Recipes & weekly plan</b><p class="hint">Save recipes, plan dinner and next-day lunch, and build your grocery list.</p></div><button type="button" class="btn primary" data-action="open-meal-planner">Open planner</button></div><div class="nutrition-guide-first">${mealGuideView()}</div><div class="summary-hero nutrition-intake-card"><div class="eyebrow">Today's intake</div><div class="hero-number" style="margin-top:12px">${num(t.calories)} <span class="muted small">/ ${num(state.goals.calories)} kcal</span></div><div style="margin:16px 0 20px;--mc:var(--c-fuel)">${progress(t.calories,state.goals.calories)}</div><div style="margin-top:4px">${bar}</div></div><div class="tab-row"><button class="tab ${nutritionPanel==='diary'?'active':''}" data-action="nutrition-panel" data-panel="diary">Food diary</button><button class="tab ${nutritionPanel==='favourites'?'active':''}" data-action="nutrition-panel" data-panel="favourites">Quick add</button></div>${nutritionPanel==='diary'?['Breakfast','Lunch','Dinner','Snack'].map(meal=>{let foods=entries.filter(x=>x.meal===meal);return `<div class="card" style="margin-bottom:12px"><div class="row space"><h3 class="section-title">${meal}</h3><button class="btn ghost" data-action="add-food" data-meal="${meal}">${svg('plus','tiny-icon')} Add</button></div>${foods.length?foods.map(f=>`<div class="list-entry"><div class="list-icon">${svg('food')}</div><div style="flex:1"><div class="strong">${escapeHtml(f.name)}</div><div class="small muted">${f.grams?`${num(f.grams)} g cooked · `:''}${num(f.protein)} g protein · ${num(f.carbs)} g carbs${f.aiEstimate?' · AI photo estimate':f.foodSource==='recomp-estimate-v1'?' · estimate':''}</div></div><div style="text-align:right"><div class="log-amount">${num(f.calories)} kcal</div><button class="btn ghost" data-action="delete-food" data-id="${f.id}" title="Delete food">${svg('trash','tiny-icon')}</button></div></div>`).join(''):`<div class="hint" style="padding:16px 0">Empty plate, clean slate. Tap Add to fix that.</div>`}</div>`}).join(''):`<div class="card"><h3 style="margin-top:0">Recent foods</h3>${[...state.food].reverse().filter((f,i,arr)=>arr.findIndex(x=>x.name===f.name)===i).slice(0,15).map(f=>`<div class="list-entry"><div style="flex:1"><b>${escapeHtml(f.name)}</b><div class="hint">${f.calories} kcal · ${f.protein} g protein</div></div><button class="btn" data-action="repeat-food" data-id="${f.id}">Add today</button></div>`).join('')||'<p class="muted small">Log a few meals and your regulars will queue up here for one-tap repeats.</p>'}</div>`}<div class="outline-banner" style="margin-top:15px">${svg('info','sm-icon')} <b>New:</b> Search ${FOOD_COUNT} Indian home-food estimates offline. Packaged-food barcode lookup is available. Photo recognition is optional; confirm foods and weights. Review cooking oil and ingredients before logging.</div>`;}
const PHOTO_VIEWS=['Front','Left side','Right side','Back'];
function photoThumb(p){
 const url=photoUrls.get(p.id),alt=escapeHtml(p.view+' progress photograph from '+dateDisplay(p.date));
 return `<div class="album-photo"><div class="album-frame">${url?`<img loading="lazy" src="${url}" alt="${alt}"/>`:`<div class="photo-empty">${svg('camera')}</div>`}</div><div class="album-caption"><span>${escapeHtml(p.view)}</span><button class="album-delete" data-action="delete-photo" data-id="${p.id}" aria-label="Delete ${alt}" title="Delete photo">${svg('trash','tiny-icon')}</button></div></div>`;
}
function photosView(){
 const groups=new Map();
 for(const p of [...state.photos].sort((a,b)=>b.date.localeCompare(a.date))){if(!groups.has(p.date))groups.set(p.date,[]);groups.get(p.date).push(p);}
 const pairs=state.photos.filter(p=>p.view===compareView).sort((a,b)=>a.date.localeCompare(b.date));
 const choices=pairs.map(p=>`<option value="${p.id}">${dateDisplay(p.date)}</option>`).join('');
 return `<section class="photos-page">
 <div class="photo-toolbar"><div><h2 class="section-title">Your photo timeline</h2><p class="hint">A consistent pose tells a clearer story.</p></div><button class="btn primary" data-action="open-photo-guide">${svg('camera','tiny-icon')} Guided camera</button></div>
 <div class="photo-toolbar secondary"><span class="muted small">Every two weeks · Front, sides, back</span><button class="btn" data-action="add-photo">${svg('plus','tiny-icon')} Upload photos</button></div>
 <p class="hint">Photos stay on your device unless you deliberately use your private cloud backup. The guide overlays your earlier image, not an AI-altered body.</p>
 ${groups.size?[...groups].map(([date,photos])=>`<article class="photo-album card"><div class="photo-album-head"><div class="eyebrow">PROGRESS LOG</div><div class="album-date">${dateDisplay(date)}</div><span class="muted micro">${photos.length} view${photos.length>1?'s':''}</span></div><div class="album-grid">${photos.map(photoThumb).join('')}</div></article>`).join(''):'<div class="photo-empty-state"><span class="camera-emoji">◌</span><strong>The first frame is yours.</strong><p class="muted small">Start with front, side and back. Return in two weeks for a fair comparison.</p></div>'}
 <section class="photo-compare-card card"><div class="row space"><div><h2 class="section-title">Compare the changes</h2><p class="hint">Same angle, same framing, different date.</p></div></div>
 <div class="compare-controls"><label class="field"><span class="label">View</span><select id="compare-view" class="input">${PHOTO_VIEWS.map(x=>`<option value="${x}" ${x===compareView?'selected':''}>${x}</option>`).join('')}</select></label><label class="field"><span class="label">Before</span><select id="compare-first" class="input" ${pairs.length<2?'disabled':''}>${choices}</select></label><label class="field"><span class="label">After</span><select id="compare-second" class="input" ${pairs.length<2?'disabled':''}>${choices}</select></label></div>
 <div id="compare-result" class="compare-mount"></div><p class="hint">Images are fitted to equal frames. For true like-for-like positioning, use the camera guide.</p></section></section>`;
}
function latestReferencePhoto(view){return [...state.photos].filter(p=>p.view===view&&photoUrls.has(p.id)).sort((a,b)=>b.date.localeCompare(a.date))[0]||null;}
function updateGuideReference(){const ghost=$('#guide-ghost'),note=$('#guide-reference-note');if(!ghost)return;const ref=latestReferencePhoto(guideView);ghost.hidden=!ref;ghost.src=ref?photoUrls.get(ref.id):'';if(note)note.textContent=ref?`Overlay: your ${dateDisplay(ref.date)} ${guideView.toLowerCase()} photo`:'No previous photo for this angle, use the framing guides.';}
async function stopGuideCamera(){if(guideStream){guideStream.getTracks().forEach(track=>track.stop());guideStream=null;}}
async function startGuideCamera(){
 if(modal?.type!=='photo-guide')return;
 const status=$('#guide-status'),video=$('#guide-video');if(!video)return;
 updateGuideReference();
 if(!navigator.mediaDevices?.getUserMedia){if(status)status.textContent='Camera access is not available here. Use Upload photo instead.';return;}
 if(status)status.textContent='Opening your camera…';
 try{
  await stopGuideCamera();
  const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:1706}},audio:false});
  if(modal?.type!=='photo-guide'){stream.getTracks().forEach(t=>t.stop());return;}
  guideStream=stream;video.srcObject=stream;await video.play();
  if(status)status.textContent='Match your shoulders, feet and distance to the ghost image.';
 }catch(err){if(status)status.textContent='Camera unavailable or permission denied. You can still upload a photograph.';console.warn('Camera guide:',err);}
}
async function savePhotoBlob(blob,date,view){
 const id=uid();await putPhoto(id,blob);photoUrls.set(id,URL.createObjectURL(blob));
 state.photos.push({id,date,view,capturedAt:new Date().toISOString(),cloudPath:null});
 bodyPanel='photos';state.lastBodyPanel='photos';modal=null;await persist();render();notify('Photo saved. Private, on-device, yours.');
}
async function captureGuidePhoto(){
 const video=$('#guide-video');if(!guideStream||!video?.videoWidth)throw Error('Camera not ready. Please wait or upload instead.');
 guideDate=$('#guide-date')?.value||today();guideView=$('#guide-view')?.value||'Front';
 const canvas=document.createElement('canvas');canvas.width=900;canvas.height=1200;
 const w=video.videoWidth,h=video.videoHeight,ratio=Math.max(900/w,1200/h);
 const ww=w*ratio,hh=h*ratio;canvas.getContext('2d').drawImage(video,(900-ww)/2,(1200-hh)/2,ww,hh);
 const blob=await new Promise((resolve,reject)=>canvas.toBlob(x=>x?resolve(x):reject(Error('Camera photo failed')),'image/jpeg',.85));
 await stopGuideCamera();await savePhotoBlob(blob,guideDate,guideView);haptic('success');
}
function photoGuideView(){
 return `<div class="modal-shade" data-action="close-modal"><div class="modal photo-guide-modal"><div class="modal-title"><div><div class="eyebrow">FRAME IT RIGHT</div><h2>Guided progress photo</h2></div><button class="btn round" data-action="close-modal" aria-label="Close camera guide">${svg('x')}</button></div>
 <div class="field-row"><label class="field"><span class="label">View</span><select class="input" id="guide-view">${PHOTO_VIEWS.map(v=>`<option ${v===guideView?'selected':''}>${v}</option>`).join('')}</select></label><label class="field"><span class="label">Date</span><input id="guide-date" type="date" class="input" value="${guideDate}"/></label></div>
 <div class="camera-stage"><video id="guide-video" autoplay playsinline muted></video><img id="guide-ghost" class="camera-ghost" alt="Your previous pose alignment guide" hidden/><div class="camera-guidelines" aria-hidden="true"><span></span><span></span><span></span></div><div class="camera-foot-mark" aria-hidden="true">Feet on the lower line · camera at a consistent height</div></div>
 <p id="guide-reference-note" class="hint"></p><p class="hint" id="guide-status">Checking camera access…</p>
 <div class="row wrap"><button class="btn primary" data-action="take-guided-photo">${svg('camera','tiny-icon')} Capture</button><button class="btn" data-action="photo-upload-mode">Choose existing image</button></div>
 <p class="hint">Camera preview stays on this device. Your older photo is an on-screen alignment guide and is not added to the captured image.</p></div></div>`;
}
function updateCompare(){
 const where=$('#compare-result');if(!where)return;
 const photos=[...state.photos].filter(p=>p.view===compareView).sort((a,b)=>a.date.localeCompare(b.date));
 const before=$('#compare-first'),after=$('#compare-second');if(!before||!after)return;
 if(photos.length<2){where.innerHTML='<p class="muted small">Add two photos from different dates with the same view to compare them.</p>';return;}
 let a=state.photos.find(p=>p.id===before.value)||photos[0],b=state.photos.find(p=>p.id===after.value)||photos[photos.length-1];
 if(a.id===b.id){a=photos[0];b=photos[photos.length-1];}
 before.value=a.id;after.value=b.id;
 const u1=photoUrls.get(a.id),u2=photoUrls.get(b.id);
 if(!u1||!u2){where.innerHTML='<p class="muted small">One of these photos is unavailable offline.</p>';return;}
 where.innerHTML=`<div class="compare-head"><span>${dateDisplay(a.date)}</span><span>${dateDisplay(b.date)}</span></div><div class="photo-compare-stage" aria-label="Before and after photo slider"><img class="compare-photo" src="${u2}" alt="After photograph"/><div id="compare-before-layer" class="compare-before-layer"><img class="compare-photo" src="${u1}" alt="Before photograph"/></div><div class="compare-handle" id="compare-handle"></div></div><label class="label" for="compare-range">Slide to reveal your progress</label><input id="compare-range" class="input-compare-range" type="range" min="0" max="100" value="50" aria-label="Reveal before or after photo"/>`;
}
function bodyView(){const lastWeight=[...state.weights].sort((a,b)=>a.date.localeCompare(b.date)).at(-1);const baseline=state.measurements.at(-1);let weights=[...state.weights].sort((a,b)=>a.date.localeCompare(b.date)).slice(-12);const minW=weights.length?Math.min(...weights.map(w=>w.kg))-1:0;const maxW=weights.length?Math.max(...weights.map(w=>w.kg))+1:1;return `${heading('Receipts.','The mirror lies. The tape measure does not.')}<div class="metric-grid">${metric('Latest weight',lastWeight?.kg ?? null,null,'kg','chart','',weightDeltaQuip(state.weights))}${metric('Belly-button waist',baseline?.belly ?? null,null,'in','chart')}</div><div class="tab-row" style="margin-top:21px"><button class="tab ${bodyPanel==='measurements'?'active':''}" data-action="body-panel" data-panel="measurements">Measurements</button><button class="tab ${bodyPanel==='photos'?'active':''}" data-action="body-panel" data-panel="photos">Photos</button><button class="tab ${bodyPanel==='weight'?'active':''}" data-action="body-panel" data-panel="weight">Weight history</button></div>${bodyPanel==='measurements'?`<div class="card"><div class="row space"><div><h2 class="section-title">Latest measurements</h2><div class="small muted">${baseline?dateDisplay(baseline.date):'No measurements yet'}</div></div><button class="btn" data-action="add-measurement">${svg('plus','tiny-icon')} Update</button></div><div class="divider"></div>${[['chest','Chest'],['belly','Belly button'],['below','Below belly button'],['shoulders','Shoulders'],['neck','Neck'],['rightBicep','Right bicep (relaxed)'],['leftBicep','Left bicep (relaxed)'],['rightThigh','Right thigh'],['leftThigh','Left thigh'],['rightCalf','Right calf'],['leftCalf','Left calf'],['wrist','Wrist']].map(([k,label])=>`<div class="split-line" style="padding:8px 0"><span class="muted">${label}</span><b>${baseline?.[k]!=='' && baseline?.[k]!=null?baseline[k]+' in':'Not recorded'}</b></div>`).join('')}</div>`:bodyPanel==='weight'?`<div class="card"><div class="row space"><h2 class="section-title">Weekly weight</h2><button class="btn" data-action="add-weight">Add entry</button></div>${weightChart(weights)}${weights.map(w=>`<div class="list-entry"><span style="flex:1">${dateDisplay(w.date)}</span><b>${w.kg} kg</b><button class="btn ghost" data-action="delete-weight" data-id="${w.id}">${svg('trash','tiny-icon')}</button></div>`).join('')||'<p class="muted">Your first weigh-in goes here. The scale is nervous too.</p>'}</div>`:photosView()}`;}
function workoutView(){
 if(historyPanel==='workouts')return workoutHistoryHtml(state.workoutHistory);
 const activeSession=state.session;
 if(activeSession&&!activeSession.minimized)return activeWorkoutView();
 const recent=[...state.workoutHistory].reverse().slice(0,5);
 return `${heading('Lift something.','Heavy things, repeated, on purpose.')}
 ${activeSession?`<div class="card row space active-session-notice"><div><b>${escapeHtml(activeSession.name)} is in progress</b><div class="small muted">${elapsed(activeSession.startedAt)} elapsed · Another plan requires your choice.</div></div><button class="btn primary" data-action="resume-workout">Continue</button></div>`:''}
 <div class="section-head"><div><h2 class="section-title">Your workout plans</h2><span class="muted small">Build, personalise and repeat. Hold a plan to edit.</span></div></div>
 ${orderedWorkoutPlans(state.templates,state.workoutHistory).map((t,i)=>`<div class="card workout-template-card ${planActionsId===t.id?'plan-actions-open':''}" data-plan-card="${escapeHtml(t.id)}" tabindex="0" role="group" aria-label="${escapeHtml(t.name)}. Long press to reveal edit plan button, or use your keyboard context menu."><div class="row space"><div><div class="eyebrow">PLAN ${i+1}</div><h2 class="section-title" style="margin-top:4px">${escapeHtml(t.name)}</h2><div class="small muted">${t.items.length} exercise${t.items.length===1?'':'s'} · ${escapeHtml(t.subtitle||'Customisable')}</div></div><div class="plan-card-tools">${planActionsId===t.id?`<button type="button" class="plan-edit-icon" data-action="edit-template" data-id="${escapeHtml(t.id)}" title="Edit ${escapeHtml(t.name)}" aria-label="Edit ${escapeHtml(t.name)}">${svg('edit','tiny-icon')}</button>`:''}<span class="list-icon">${svg('dumbbell')}</span></div></div><div class="template-exercise-summary">${t.items.slice(0,4).map(e=>escapeHtml(e[1])).join(' · ')||'Start with your first exercise'}${t.items.length>4?' …':''}</div><div class="template-actions"><button class="btn primary" data-action="begin-template" data-id="${escapeHtml(t.id)}" ${!t.items.length?'disabled title="Add an exercise first"':''}>${svg('play','tiny-icon')} ${activeSession?.templateId===t.id?'Continue / manage':'Start workout'}</button><button class="btn" data-action="edit-template" data-id="${escapeHtml(t.id)}">${svg('edit','tiny-icon')} Edit plan</button></div></div>`).join('')}
 <div class="section-head"><h2 class="section-title">Recent sessions</h2></div><div class="card">${recent.length?recent.map(w=>`<div class="list-entry"><div class="list-icon">${svg('check')}</div><div style="flex:1"><b>${escapeHtml(w.name)}</b><div class="small muted">${dateDisplay(w.date)} · ${w.sets} working sets</div></div><span class="strong">${w.durationMin} min</span></div>`).join(''):'<p class="muted small">No sessions yet. The barbell is patient, but not that patient.</p>'}</div>`;
}

function elapsed(ts){const secs=Math.max(0,Math.floor((Date.now()-ts)/1000));return `${Math.floor(secs/60)}:${String(secs%60).padStart(2,'0')}`;}
function restLeft(){let r=state.session?.rest;return r?(r.paused?Math.ceil(r.remainingMs/1000):Math.max(0,Math.ceil((r.endsAt-Date.now())/1000))):0;}
function clock(seconds){return `${String(Math.floor(Math.max(0,seconds)/60)).padStart(2,'0')}:${String(Math.max(0,seconds)%60).padStart(2,'0')}`;}
function activeWorkoutView(){const s=state.session;if(!s) return workoutView();const giantGroups=getGiantGroups(s),roundMode=giantGroups.length>0&&s.giantView!=='detailed';const total=s.exercises.reduce((acc,e)=>acc+e.sets.length,0),completed=s.exercises.reduce((acc,e)=>acc+e.sets.filter(x=>x.done).length,0);return `<header class="workout-scroll-header" aria-label="Workout controls"><button class="btn workout-header-action" data-action="minimise-workout">${svg("minimise","tiny-icon")} Minimise</button><div class="workout-sticky-status"><span class="pill workout-header-saved"><span class="status-dot" aria-hidden="true"></span> Session saved</span><span class="workout-header-progress" aria-hidden="true"><span class="elapsed">${elapsed(s.startedAt)}</span><span class="workout-progress-divider">·</span><span>${completed}/${total}</span><small>sets</small></span></div><button class="btn danger workout-header-action" data-action="discard-workout">Discard</button></header><div class="top"><div class="workout-title-block"><div class="eyebrow">FOCUSED WORKOUT</div><h1 class="page-title">${escapeHtml(s.name)}</h1><div class="subhead workout-start-progress">${svg("timer","tiny-icon")} <span class="elapsed">${elapsed(s.startedAt)}</span> &nbsp; · &nbsp; ${completed}/${total} sets complete</div></div><div class="metric-icon">${svg("dumbbell")}</div></div><div style="margin:0 0 17px">${progress(completed,total)}</div>${warmupView(s)}${giantGroups.length?`<div class="giant-view-toggle" role="group" aria-label="Workout view"><button class="btn ${roundMode?'primary':''}" data-action="giant-view" data-mode="rounds" aria-pressed="${roundMode}">Giant set rounds</button><button class="btn ${!roundMode?'primary':''}" data-action="giant-view" data-mode="detailed" aria-pressed="${!roundMode}">Detailed View</button></div>`:''}${s.instructions?(roundMode?`<details class="giant-coach-notes"><summary>Coach notes from FTS · Tap to expand</summary><p>${escapeHtml(s.instructions)}</p></details>`:`<div class="card" style="margin-bottom:14px"><b>Coach notes from FTS</b><p class="small muted" style="white-space:pre-line;margin:8px 0 0">${escapeHtml(s.instructions)}</p></div>`):''}${!roundMode?renderMuscleFocus(s.exercises):''}${s.rest?`<button class="rest-status-banner" data-action="open-rest" aria-label="Open the running rest timer">${svg('timer')} <span><b>${s.rest.suggested?'Suggested rest between rounds or sets':'Rest in progress'}</b><small>${s.rest.suggested?`${s.rest.totalSeconds||60} seconds suggested · skip whenever ready`:'Tap to reopen your countdown'}</small></span><strong class="inline-timer">${clock(restLeft())}</strong> ${svg('arrow','tiny-icon')}</button>`:''}${roundMode?renderGiantSetView(s):''}${!roundMode?s.exercises.map((e,i)=>{const open=exerciseOpen===i;const done=e.sets.every(x=>x.done);return `<div class="workout-card ${done?'completed':''}"><button class="workout-head" data-action="expand-exercise" data-index="${i}"><span class="workout-num">${done?svg('check'):i+1}</span><span style="flex:1"><b>${escapeHtml(e.name)}</b><span class="small muted" style="display:block">${e.targetLabel?escapeHtml(e.targetLabel)+" · ":""}${e.sets.filter(x=>x.done).length}/${e.sets.length} complete${e.ref?" · "+escapeHtml(e.ref):""}</span></span>${svg('chevron','sm-icon')}</button>${open?`<div class="workout-inner"><div class="divider" style="margin-top:0"></div><div class="set-grid set-head"><span>Set</span><span>kg</span><span>${e.unit==='seconds'?'Sec':e.unit==='minutes'?'Min':'Reps'}</span><span>Done</span></div>${e.sets.map((set,j)=>`<div class="set-grid"><b style="text-align:center">${j+1}</b><input class="input set-input" aria-label="Weight for set ${j+1}" data-setfield="kg" data-ex="${i}" data-set="${j}" type="number" inputmode="decimal" min="0" step="0.5" value="${n(set.kg)>0?escapeHtml(set.kg):''}" placeholder="—"/><input class="input set-input" aria-label="${e.unit==='seconds'?'Seconds':e.unit==='minutes'?'Minutes':'Repetitions'} for set ${j+1}" data-setfield="reps" data-ex="${i}" data-set="${j}" type="number" inputmode="numeric" min="0" step="1" value="${n(set.reps)>0?escapeHtml(set.reps):''}"/><button class="set-done ${set.done?'done':''}" data-action="tick-set" data-ex="${i}" data-set="${j}" aria-label="${set.done?'Unmark':'Complete'} set ${j+1}">${svg('check','sm-icon')}</button></div>`).join('')}<div class="workout-footer"><span class="small muted">Rest ${clock(e.restSeconds)}</span><span class="row"><button class="btn ghost" data-action="rest-setting" data-index="${i}">${svg('timer','tiny-icon')} Edit</button><button class="btn ghost" data-action="add-set" data-index="${i}">${svg('plus','tiny-icon')} Set</button></span></div><div class="exercise-actions"><button class="btn" data-action="swap-exercise" data-index="${i}">${svg('swap','tiny-icon')} Swap</button><button class="btn" data-action="exercise-notes" data-index="${i}">${svg('edit','tiny-icon')} Notes</button><button class="btn" data-action="exercise-video" data-index="${i}">${svg('play','tiny-icon')} Demonstration</button><button class="btn danger" data-action="remove-session-exercise" data-index="${i}">${svg('trash','tiny-icon')} Remove</button></div>${e.notes?`<p class="hint">Note: ${escapeHtml(e.notes)}</p>`:''}</div>`:''}</div>`}).join(''):''}<button class="btn block add-current-exercise" data-action="add-session-exercise">${svg('plus','tiny-icon')} Add exercise to this workout</button><div class="card"><div class="row space"><div><b>Done and dusted?</b><div class="small muted">Every completed set goes on the board.</div></div><button class="btn primary" data-action="finish-workout">Finish workout</button></div></div>`;}
function settingsSectionHeading(icon,title,description){
 return `<header class="settings-section-head"><span class="settings-section-icon" aria-hidden="true">${svg(icon,'tiny-icon')}</span><span class="settings-section-text"><h2>${title}</h2><p>${description}</p></span></header>`;
}
function settingsView(){
 const cfg=cloud.getConfig(),ses=cloud.getSession(),clerkUser=getClerkAccount(),clerkReady=isClerkLoginAvailable(),clerkDev=isClerkDevelopmentMode();
 return `${heading('Make it yours.','Your goals, account and preferences in one place.')}
 <div class="settings-hub">
 <nav class="settings-shortcuts" aria-label="Jump to settings section">
 <a href="#settings-account">Account</a><a href="#settings-targets">Daily targets</a><a href="#settings-routine">Activity &amp; routine</a><a href="#settings-appearance">Look &amp; feel</a><a href="#settings-data">Data &amp; privacy</a>
 </nav>
 <section id="settings-account" class="settings-section" aria-label="Account">
 ${settingsSectionHeading('home','Your account','Manage your Google sign-in and profile.')}

<div class="card settings-account-card">${clerkDev?'<div class="auth-dev-notice" role="note"><b>Development mode · test sign-in</b><span>Clerk Google login is for testing, not production. Signing in does not back up or transfer your Recomp data. You can always stay a guest.</span></div>':''}<div class="row space"><b>${clerkUser?'Signed in as '+escapeHtml(clerkUser.name||clerkUser.email||'Google account'):'Guest mode'}</b><span class="pill">${clerkUser?(clerkDev?'Development account':'Signed in'):clerkReady?(clerkDev?'Development mode':'Clerk ready'):'Guest access'}</span></div>${clerkUser?.email?`<p class="small muted">${escapeHtml(clerkUser.email)}</p>`:''}<p class="small muted">Google sign-in through Clerk is optional and separate from cloud backup. All your saved workouts and meals remain on this device unless you explicitly choose a backup.</p><div class="row wrap">${clerkUser?'<button class="btn" data-action="clerk-signout">Sign out</button>':clerkReady?'<button class="btn primary" data-action="clerk-login">Continue with Google</button>':'<span class="pill">Google login coming later</span>'}${!getClerkKey()?'<button class="btn" data-action="clerk-setup">Set up Clerk</button>':''}</div>${!clerkReady?'<p class="hint">Google sign-in is unavailable on this GitHub Pages release until a production Clerk domain is ready. All tracking works without an account.</p>':''}</div>
</section>
 <section id="settings-targets" class="settings-section" aria-label="Daily targets">
 ${settingsSectionHeading('chart','Daily targets','Your personal nutrition and activity goals.')}

<div class="card settings-targets-card"><p class="small muted settings-targets-intro">Edit freely. Targets change only when you press Save goals.</p><form id="settings-goals"><div class="field-row">${[['calories','Calories (kcal)'],['protein','Protein (g)'],['carbs','Carbohydrates (g)'],['fat','Fat (g)'],['fibre','Fibre (g)'],['water','Water (ml)'],['steps','Steps']].map(([k,label])=>`<div class="field"><label class="label" for="goal-${k}">${label}</label><input class="input" id="goal-${k}" name="${k}" type="number" inputmode="numeric" min="0" step="1" required value="${escapeHtml(goalDraft?.[k] ?? state.goals[k])}"/></div>`).join('')}</div><button class="btn primary" type="submit">Save goals</button></form></div>
</section>
 <section id="settings-routine" class="settings-section" aria-label="Activity and routine">
 ${settingsSectionHeading('dumbbell','Activity &amp; routine','Manage daily tasks, movement and your watch.')}

<div class="section-head"><div><h2 class="section-title">Daily tasks</h2><div class="muted small">Build a routine that belongs to you.</div></div><button class="btn" data-action="add-task">${svg('plus','tiny-icon')} Add task</button></div><div class="card task-manager settings-tasks-card">${state.tasks.map(t=>`<div class="task-manage-row"><span class="task-manage-label">${escapeHtml(t.label)}${t.auto?'<small>Auto-linked to your logs, but you can tick manually</small>':'<small>Manually completed from the dashboard</small>'}</span>${t.auto?'<span class="pill">AUTO</span>':''}<button class="btn ghost" data-action="edit-task" data-id="${escapeHtml(t.id)}" aria-label="Edit ${escapeHtml(t.label)}">${svg('edit','tiny-icon')}</button><button class="btn ghost danger" data-action="delete-task" data-id="${escapeHtml(t.id)}" aria-label="Delete ${escapeHtml(t.label)}">${svg('trash','tiny-icon')}</button></div>`).join('')}</div>
<div class="section-head"><h2 class="section-title">Galaxy Watch and activity</h2></div><div class="card settings-activity-card"><p class="small muted">${nativeHealthAvailable()?'Health Connect is ready to request step and active calorie permissions on your Android device.':'Google Fit is being retired. Health Connect is the Android path for compatible Google Fit and Samsung Health data, but browser-only PWAs cannot read it directly.'}</p><div class="row wrap"><button class="btn" data-action="activity">${svg('pencil','tiny-icon')} Enter steps &amp; active calories</button>${nativeHealthAvailable()?'<button class="btn primary" data-action="refresh-steps">Sync from Health Connect</button>':''}</div><p class="hint">Read-only access, requested when you tap Sync. Your activity stays local unless you opt in to a cloud backup. Google sign-in never grants health permissions.</p></div>
</section>
 <section id="settings-appearance" class="settings-section" aria-label="Appearance and sound">
 ${settingsSectionHeading('sun','Look &amp; feel','Make the experience feel like yours.')}

<div class="section-head"><h2 class="section-title">Appearance</h2></div><div class="card settings-appearance-card"><label class="label" for="appearance-mode">Theme</label><select class="input" id="appearance-mode" aria-label="Theme"><option value="system" ${themeChoice()==='system'?'selected':''}>Follow phone settings</option><option value="light" ${themeChoice()==='light'?'selected':''}>Day · Light</option><option value="dark" ${themeChoice()==='dark'?'selected':''}>Night · Dark</option></select><p class="small muted" style="margin-bottom:0">Use the sun and moon beside Settings to switch instantly.</p></div>
<div class="section-head"><h2 class="section-title">Feel and sound</h2></div><div class="card stack settings-sound-card"><p class="small muted" style="margin:0">A tiny bit of feedback, just where it matters. Sound plays through your phone’s media volume. Vibration depends on Android and browser support.</p><label class="check-task"><input class="checkbox" type="checkbox" id="enable-haptics" ${state.preferences?.haptics===false?'':'checked'}/> Gentle haptics</label><label class="check-task"><input class="checkbox" type="checkbox" id="enable-water-sound" ${state.preferences?.waterSound===false?'':'checked'}/> Water sound effects</label><label class="check-task"><input class="checkbox" type="checkbox" id="enable-app-sounds" ${state.preferences?.appSounds===false?'':'checked'}/> App sound effects <span class="small muted">· taps, tasks & saves</span></label><div class="row feel-test-actions"><button class="btn" data-action="test-haptics">${svg('check','tiny-icon')} Test haptics</button><button class="btn" data-action="test-water-sound">${svg('volume','tiny-icon')} Test water sound</button><button class="btn" data-action="test-app-sound">${svg('volume','tiny-icon')} Test app sound</button></div></div>
<div class="section-head"><h2 class="section-title">Notifications</h2></div><div class="card settings-notifications-card"><p class="small muted">Preferred rest alert: chime + vibration, normal priority. This web prototype plays an alert while the app is running. Locked-screen alerts need native Android testing and implementation.</p><button class="btn" data-action="test-chime">${svg('volume','tiny-icon')} Test chime</button> <button class="btn" data-action="notification-permission">${svg('bell','tiny-icon')} Allow notifications</button></div>
</section>
 <section id="settings-data" class="settings-section" aria-label="Data and privacy">
 ${settingsSectionHeading('cloud','Data &amp; privacy','Your records stay on your device unless you choose to back them up.')}

<div class="card stack settings-data-card"><p class="small muted" style="margin:0">Your personal records are saved locally in IndexedDB. Cloud sync is opt-in and uses your project. Progress photos are not sent to AI services.</p><button class="btn block" data-action="export-backup">${svg('download','tiny-icon')} Export full backup (including photos)</button><button class="btn block" data-action="import-backup">${svg('refresh','tiny-icon')} Import backup</button><input type="file" id="import-file" accept="application/json" hidden/><div class="local-reset-control"><b>Delete data from this device</b><p class="small muted">Delete completed workouts, food logs, measurements, photos, custom plans and other personal settings saved here. Built-in workout plans will still appear. Cloud backups are separate.</p><button class="btn danger block" type="button" data-action="reset-all-local-data">${svg('trash','tiny-icon')} Delete all local fitness data</button></div><p class="hint">Keep the exported file private. It contains sensitive fitness details and photographs if you've added them.</p></div>
<details class="settings-advanced" id="settings-cloud-details" ${settingsCloudOpen?'open':''}>
 <summary class="settings-advanced-summary">
 <span class="settings-advanced-summary-icon" aria-hidden="true">${svg('cloud','tiny-icon')}</span>
 <span class="settings-advanced-summary-text"><strong>Advanced cloud backup</strong><small>Optional Supabase sync and recovery</small></span>
 ${svg('chevron','tiny-icon')}
 </summary><div class="settings-advanced-body">

<div class="card settings-cloud-card"><div class="row space"><span class="strong">${ses?`Signed in as ${escapeHtml(ses.user?.email||'Google user')}`:'Not signed in'}</span><span class="pill">${state.lastSync?'Last saved '+dateDisplay(state.lastSync.slice(0,10)):'Device-first'}</span></div><p class="small muted">${ses?'You can back up your data and restore it on another device. Automatic uploads can be enabled after your first manual backup.':'To enable private cloud sync, create your own Supabase project and configure Google OAuth using the provided SQL and setup guide.'}</p>${cfg?`<p class="hint">Project: ${escapeHtml(new URL(cfg.url).host)}</p>`:''}<div class="row" style="flex-wrap:wrap"><button class="btn" data-action="configure-cloud">${svg('settings','tiny-icon')} Configure</button>${ses?`<button class="btn" data-action="cloud-upload">Back up now</button><button class="btn" data-action="cloud-download">Restore</button><button class="btn ghost" data-action="cloud-logout">Sign out</button><button class="btn danger" data-action="delete-cloud-backup">Delete cloud backup</button>`:`<button class="btn primary" data-action="google-login">Continue with Google</button>`}</div>${ses?`<label class="check-task"><input type="checkbox" class="checkbox" id="auto-cloud-sync" ${localStorage.getItem('recomp-auto-sync')==='yes'?'checked':''}/> Automatically back up changes after initial sync</label>`:''}</div>
</div></details></section></div>`;
}
const REST_CIRC=2*Math.PI*88;
function restFraction(){const r=state.session?.rest;if(!r)return 0;const total=Math.max(1,n(r.totalSeconds??state.session.exercises?.[r.exerciseIndex]?.restSeconds,60));return Math.min(1,restLeft()/total);}
function restOverlay(){if(!restSheet||!state.session?.rest)return '';const r=state.session.rest;return `<div class="sheet-backdrop" data-action="close-rest"></div><section class="timer-sheet" role="dialog" aria-label="Rest timer"><div class="sheet-handle"></div><div class="row space"><h2 class="section-title">Catch your breath</h2><button class="btn ghost" data-action="close-rest">${svg('x')}</button></div><div class="timer-ring"><svg viewBox="0 0 200 200" aria-hidden="true"><circle class="ring-track" cx="100" cy="100" r="88"/><circle class="ring-bar" id="rest-ring-bar" cx="100" cy="100" r="88" stroke-dasharray="${REST_CIRC.toFixed(1)}" stroke-dashoffset="${(REST_CIRC*(1-restFraction())).toFixed(1)}"/></svg><div class="timer-number" id="main-timer">${clock(restLeft())}</div></div><p class="muted small" style="text-align:center;margin-top:-8px">${r.paused?'Timer paused':'Breathe. The weights are not going anywhere.'}</p><div class="timer-actions"><button class="btn" data-action="timer-minus">−15 sec</button><button class="btn" data-action="timer-pause">${svg(r.paused?'play':'pause','tiny-icon')} ${r.paused?'Resume':'Pause'}</button><button class="btn" data-action="timer-plus">+15 sec</button></div><button class="btn block" style="margin-top:15px" data-action="timer-skip">Skip rest</button><p class="hint" style="text-align:center">Countdown is saved if you minimise or reopen the app.</p></section>`;}
function modalField(key,label,value='',type='text',other=''){return `<div class="field"><label for="modal-${key}" class="label">${label}</label><input class="input" id="modal-${key}" name="${key}" type="${type}" ${other} value="${escapeHtml(value)}"/></div>`;}
function confirmInApp(message,{title='Please confirm',approveLabel='Confirm',danger=true}={}){
 return new Promise(resolve=>{
  if(confirmation){resolve(false);return;}
  confirmation={message,title,approveLabel,danger,resolve};
  render();
  document.querySelector('[data-action="confirm-cancel"]')?.focus();
 });
}
function settleConfirmation(approved){
 const pending=confirmation;
 if(!pending)return;
 confirmation=null;
 render();
 pending.resolve(Boolean(approved));
}
function modalShell(title,content,formName='',button='Save'){return `<div class="modal-shade" data-action="close-modal"><div class="modal" role="dialog" aria-label="${escapeHtml(title)}"><div class="modal-title"><h2 class="section-title">${title}</h2><button class="btn round" data-action="close-modal" aria-label="Close">${svg('x')}</button></div>${formName?`<form id="${formName}">${content}<button class="btn primary block" type="submit">${button}</button></form>`:content}</div></div>`;}
function templateById(id){return state.templates.find(t=>t.id===id);}
function customGroupControls(t){
 const groups=listCustomGiantSets(t);
 const ungrouped=t.items.filter(item=>!item[12]).length;
 const enabled=ungrouped>=2&&nextAvailableGroup(t);
 return `<section class="custom-group-tools" aria-label="Your giant sets">
  <div class="row space"><div><b>Giant sets</b><p class="hint">Group two or more exercises, choose rounds and rest, and track them together.</p></div></div>
  ${groups.map(g=>`<div class="template-editor-row"><div class="editor-exercise-num">${escapeHtml(g.id)}</div><div class="template-editor-info"><b>Giant set ${escapeHtml(g.id)}</b><span class="small muted">${g.items.length} exercises · ${g.items[0]?.[2]} rounds · ${g.restSeconds} seconds rest</span></div><button class="btn ghost" data-action="edit-custom-giant-set" data-id="${escapeHtml(t.id)}" data-group="${escapeHtml(g.id)}" aria-label="Edit giant set ${escapeHtml(g.id)}">${svg('edit','tiny-icon')}</button><button class="btn ghost danger" data-action="remove-custom-giant-set" data-id="${escapeHtml(t.id)}" data-group="${escapeHtml(g.id)}" aria-label="Remove giant set ${escapeHtml(g.id)}">${svg('trash','tiny-icon')}</button></div>`).join('')}
  <button type="button" class="btn block" data-action="add-custom-giant-set" data-id="${escapeHtml(t.id)}" ${enabled?'':'disabled'}>${svg('plus','tiny-icon')} Create giant set</button>
  ${enabled?'':'<p class="hint">Add at least two exercises not already assigned to another group.</p>'}
  <p class="hint">Exercises run in their saved plan order. Group changes affect future sessions only.</p>
 </section>`;
}
function templateEditorView(t){
 const entries=t.items.map((entry,i)=>`<div class="template-editor-row"><div class="editor-exercise-num">${i+1}</div><div class="template-editor-info"><b>${escapeHtml(entry[1])}</b><span class="muted small">${escapeHtml(entry[9]||`${entry[2]} sets · ${entry[3]} reps`)} · ${entry[5]} sec rest${entry[12]?' · Group '+escapeHtml(entry[12]):''}</span></div><button type="button" class="btn ghost" data-action="edit-template-exercise" data-id="${escapeHtml(t.id)}" data-index="${i}" aria-label="Edit ${escapeHtml(entry[1])}">${svg('edit','tiny-icon')}</button><button type="button" class="btn ghost" data-action="preview-template-exercise" data-id="${escapeHtml(t.id)}" data-index="${i}" aria-label="Watch demonstration for ${escapeHtml(entry[1])}" title="Exercise video">${svg('play','tiny-icon')}</button><button type="button" class="btn ghost danger" data-action="delete-template-exercise" data-id="${escapeHtml(t.id)}" data-index="${i}" aria-label="Remove ${escapeHtml(entry[1])}">${svg('trash','tiny-icon')}</button></div>`).join('');
 return `<p class="small muted" style="margin:0 0 15px">Changes to plans apply to future workouts. Your active session and history won't change.</p>${t.notes?`<p class="hint" style="white-space:pre-line">Coach notes: ${escapeHtml(t.notes)}</p>`:''}
 <div class="template-edit-tools"><button type="button" class="btn" data-action="rename-template" data-id="${escapeHtml(t.id)}">${svg('edit','tiny-icon')} Rename</button><button type="button" class="btn" data-action="browse-template-videos" data-id="${escapeHtml(t.id)}" ${!t.items.length?'disabled':''}>${svg('play','tiny-icon')} Exercise videos</button><button type="button" class="btn danger" data-action="delete-template" data-id="${escapeHtml(t.id)}">${svg('trash','tiny-icon')} Delete plan</button></div>
 <div class="template-editor-list">${entries||'<p class="muted small">No exercises yet. Add one below.</p>'}</div><button class="btn primary block" data-action="add-template-exercise" data-id="${escapeHtml(t.id)}">${svg('plus','tiny-icon')} Add exercise</button>${customGroupControls(t)}`;
}
function pendingPlanSwitch(targetId){
 const session=state.session,desired=templateById(targetId);
 if(!session||!desired)return;
 if(session.templateId===targetId){resumeWorkout();return;}
 state.session.minimized=false;
 tab='workouts';state.lastTab='workouts';exerciseOpen=session.activeIndex||0;
 restSheet=false;
 modal={type:'switch-workout',targetId};
 haptic('warning');
 motionChange(()=>render(),'expand');
 persist().catch(console.error);
}
function resumeWorkout(){
 if(!state.session)return;
 motionChange(()=>{
  state.session.minimized=false;tab='workouts';state.lastTab='workouts';exerciseOpen=state.session.activeIndex||0;render();
 },'expand');
 haptic('tap');persist().catch(console.error);
 window.scrollTo({top:0,behavior:'instant'});
}
async function switchWorkoutTo(targetId,shouldSave){
 const prior=state.session,desired=templateById(targetId);
 if(!prior||!desired)return;
 if(shouldSave){
  const done=prior.exercises.flatMap(e=>e.sets.filter(x=>x.done));
  if(!done.length){notify('Complete at least one set to save. Use Discard instead.');return;}
  state.workoutHistory.push({id:uid(),templateId:prior.templateId,date:today(),name:prior.name,startedAt:prior.startedAt,endedAt:Date.now(),durationMin:Math.max(1,Math.round((Date.now()-prior.startedAt)/60000)),sets:done.length,volume:done.reduce((v,x)=>v+n(x.kg)*n(x.reps),0),exercises:prior.exercises});rememberWorkoutSets(prior);
 }
 const next={id:uid(),name:desired.name,templateId:desired.id,startedAt:Date.now(),minimized:false,instructions:desired.notes||'',groupSettings:structuredClone(desired.groupSettings||{}),exercises:buildWorkoutExercises(desired),activeIndex:0,rest:null,warmupStatus:'pending'};
 motionChange(()=>{state.session=next;modal=null;restSheet=false;restAlertedFor=null;tab='workouts';state.lastTab='workouts';exerciseOpen=0;render();},'expand');
 haptic('success');await persist();window.scrollTo({top:0,behavior:'instant'});
}
// Search never makes a network request. Estimates are calculated from locally authored recipes.
function foodSearchResults(query=''){
 const list=searchFoods(query,24);
 const total=query.trim()?list.length:FOOD_COUNT;
 return `<div class="food-search-count">${query.trim()?`${list.length} ${list.length===1?'match':'matches'}`:`${total} sample foods · popular picks`}</div>${list.length?list.map(item=>`<button type="button" class="food-result" data-action="food-pick" data-id="${escapeHtml(item.id)}"><span class="food-result-symbol">${svg('food')}</span><span class="food-result-info"><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.category)} · estimated per 100 g</small></span><span class="food-result-cal">${num(item.per100.calories)}<small>kcal</small></span>${svg('chevron','tiny-icon')}</button>`).join(''):`<div class="food-search-empty"><b>No matching sample food yet</b><p>Try another spelling (such as bhindi, okra or chapati), or add your own dish manually.</p></div>`}`;
}
function foodSearchView(){
 const q=modal.query||'';
 return modalShell('Search Indian foods',`<p class="food-search-intro">Offline Indian home-food estimates. Choose a dish, enter its <b>cooked weight</b>, then review before saving.</p><label class="label" for="food-search-input">Find a food</label><div class="food-search-control">${svg('search')}<input class="input" id="food-search-input" type="search" placeholder="Try dal, roti, paneer, sabji…" value="${escapeHtml(q)}" autocomplete="off" spellcheck="false" maxlength="80"/></div><div id="food-search-results" class="food-search-results" aria-live="polite">${foodSearchResults(q)}</div><div class="food-search-footer"><p class="hint">Recipe-based estimates, not laboratory-tested values. Cooking oil and portions vary by home.</p><button type="button" class="btn block" data-action="manual-food">${svg('plus','tiny-icon')} Enter my own food</button></div>`);
}
function foodPortionView(){
 const food=findFood(modal.foodId);
 if(!food)return foodSearchView();
 const grams=Number.isFinite(Number(modal.grams))?Number(modal.grams):food.defaultGrams;
 const vals=nutrientsForGrams(food,grams||food.defaultGrams);
 const meal=modal.meal||'Breakfast';
 return modalShell('Log a food',`<form id="form-catalogue-food"><button type="button" class="food-back" data-action="food-back">${svg('chevron','tiny-icon')} Back to search</button><div class="food-picked"><span class="eyebrow">RECOMP INDIAN FOODS</span><h3>${escapeHtml(food.name)}</h3><p class="hint">Home-recipe estimate · ${escapeHtml(food.category)}</p></div><div class="field"><label class="label" for="food-grams">Cooked portion (grams)</label><div class="food-grams-row"><input class="input" id="food-grams" name="grams" type="number" inputmode="decimal" step="1" min="1" max="5000" required value="${grams}"/><span>g</span></div></div><div class="field"><label class="label" for="food-meal">Add to</label><select id="food-meal" name="meal" class="input">${['Breakfast','Lunch','Dinner','Snack'].map(name=>`<option value="${name}" ${name===meal?'selected':''}>${name}</option>`).join('')}</select></div><div class="field"><label class="label" for="food-date">Date</label><input class="input" id="food-date" name="date" type="date" value="${today()}" required/></div><div class="food-preview-macros" id="food-preview-macros">${foodNutritionPreview(vals)}</div><p class="hint">Estimates use representative ingredients. Some dishes include oil or ghee. Actual portions and cooking methods vary; you can use manual entry instead.</p><button class="btn primary block" type="submit">Add to food diary</button></form>`);
}
function foodNutritionPreview(values){return `<div class="food-calorie-head"><span>Estimated energy</span><b>${num(values.calories)} <small>kcal</small></b></div><div class="food-macro-grid">${[['protein','Protein'],['carbs','Carbs'],['fat','Fat'],['fibre','Fibre']].map(([key,label])=>`<div><b>${n(values[key]).toFixed(1)} g</b><span>${label}</span></div>`).join('')}</div>`;}
function launchNutrition(mode='home', meal=null){
 toggleFoodMenu(false);
 openNutrition({mode,meal:meal||mealForHour(),lookupProduct:lookupBarcode,
  save:async entries=>{
   // Save chosen dates, never replace existing diary rows.
   state.food.push(...entries.map(item=>({...item,id:uid(),foodSource:item.source==='Open Food Facts'?'openfoodfacts':'recomp-estimate-v1'})));
   if(entries[0]?.meal)foodMeal=entries[0].meal;
   await commit();notify(entries.length===1?'Logged. Future you says thanks.':`${entries.length} foods logged. Thorough.`);
  },
  manual:selected=>{modal={type:'food',meal:selected||mealForHour()};render();},notify
 });
}
function toggleFoodMenu(open){
 foodMenuOpen=Boolean(open);const cluster=document.getElementById('food-fab-cluster');
 const button=document.getElementById('food-fab-button');if(!cluster||!button)return;
 cluster.classList.toggle('is-open',foodMenuOpen);
 button.setAttribute('aria-expanded',String(foodMenuOpen));
 const menu=document.getElementById('food-fab-menu');if(menu)menu.setAttribute('aria-hidden',String(!foodMenuOpen));
 for(const action of cluster.querySelectorAll('.food-fab-option'))action.tabIndex=foodMenuOpen?0:-1;
}
function modalView(){if(!modal)return '';
if(modal.type==='switch-workout'){
 const current=state.session,next=templateById(modal.targetId),done=current?.exercises.flatMap(e=>e.sets.filter(x=>x.done)).length||0;
 if(!current||!next)return '';
 return modalShell('Another workout is running',`<div class="switch-workout-notice"><span class="status-dot"></span><b>${escapeHtml(current.name)}</b><span class="muted small">${done} sets completed</span></div><p>You're still in <b>${escapeHtml(current.name)}</b>. Would you like to end it and start <b>${escapeHtml(next.name)}</b>?</p><div class="stack"><button class="btn primary block" data-action="keep-workout">Continue ${escapeHtml(current.name)}</button><button class="btn block" data-action="switch-save" data-id="${escapeHtml(next.id)}" ${done===0?'disabled':''}>${svg('check','tiny-icon')} Finish ${escapeHtml(current.name)} and start ${escapeHtml(next.name)}</button><button class="btn danger block" data-action="switch-discard" data-id="${escapeHtml(next.id)}">Discard ${escapeHtml(current.name)} and start ${escapeHtml(next.name)}</button></div><p class="hint">Finish saves completed sets to your workout history. Discard permanently removes this unfinished session.</p>`);
}
if(modal.type==='session-exercise')return modalShell('Add exercise to this session',`${modalField('name','Exercise name','','text','required maxlength="90" placeholder="e.g. Face Pull"')}<div class="field-row">${modalField('sets','Sets',3,'number','min="1" max="12" required')}${modalField('reps','Target reps',10,'number','min="1" max="100" required')}${modalField('kg','Starting weight (kg)',0,'number','min="0" max="2000" step="0.5" required')}${modalField('rest','Rest between sets (seconds)',90,'number','min="0" max="1800" step="15" required')}</div><label class="check-task"><input type="checkbox" name="saveToTemplate" class="checkbox"/> Also add this to my saved workout plan for next time</label><p class="hint">This exercise will appear immediately in your current session. Other completed sets stay saved.</p>`,'form-session-exercise','Add to current workout');
if(modal.type==='new-template')return modalShell('Create workout plan',`${modalField('name','Workout name','','text','required maxlength="70" placeholder="e.g. Upper Body C"')}<p class="hint">Once created, add your own exercises and start whenever you're ready.</p>`,'form-new-template','Create plan');
if(modal.type==='edit-template'){const t=templateById(modal.id);return t?modalShell(`Edit ${escapeHtml(t.name)}`,templateEditorView(t)):'';}
if(modal.type==='video-library'){
 const t=templateById(modal.id);if(!t)return '';
 const entries=t.items.map((e,i)=>`<div class="template-editor-row"><div class="editor-exercise-num">${i+1}</div><div class="template-editor-info"><b>${escapeHtml(e[1])}</b><span class="muted small">${escapeHtml(e[9]||'Technique demo')}</span></div><button type="button" class="btn" data-action="preview-template-exercise" data-id="${escapeHtml(t.id)}" data-index="${i}">${svg('play','tiny-icon')} Watch</button></div>`).join('');
 return modalShell('Exercise videos · '+escapeHtml(t.name),`<p class="hint">Open any exercise for a checked demonstration or a YouTube search for its precise variation. Videos load only when you press Play.</p><div class="template-editor-list">${entries||'<p class="hint">No exercises in this plan yet.</p>'}</div>`);
}
if(modal.type==='rename-template'){const t=templateById(modal.id);return t?modalShell('Rename workout plan',`${modalField('name','Workout name',t.name,'text','required maxlength="70"')}`,'form-rename-template','Rename plan'):'';}
if(modal.type==='custom-giant-set'){
 const t=templateById(modal.id);if(!t)return '';
 const old=modal.groupId?listCustomGiantSets(t).find(g=>g.id===modal.groupId):null;
 if(modal.groupId&&!old)return '';
 const candidates=t.items.map((item,i)=>({item,index:i})).filter(({item})=>!item[12]||item[12]===modal.groupId);
 const memberRows=candidates.map(({item,index})=>`<label class="check-task"><input type="checkbox" class="checkbox" name="member" value="${index}" ${item[12]===modal.groupId?'checked':''}/> <span>${escapeHtml(item[1])} <span class="muted small">· ${item[2]} sets</span></span></label>`).join('');
 const rounds=old?Math.max(...old.items.map(item=>item[2])):Math.min(12,candidates[0]?.item?.[2]||3);
 const rest=old?.restSeconds??60;
 return modalShell(old?'Edit giant set '+escapeHtml(old.id):'Create a giant set',`
  <p class="hint">Choose 2–12 exercises. They'll run in the order they appear in your saved workout plan, without stopping between movements.</p>
  <fieldset class="custom-group-members"><legend class="label">Exercises in this giant set</legend>${memberRows||'<p class="hint">Add some ungrouped exercises first.</p>'}</fieldset>
  <div class="field-row">${modalField('rounds','Rounds',rounds,'number','required min="1" max="12" step="1"')}${modalField('restSeconds','Rest between rounds (seconds)',rest,'number','required min="0" max="900" step="15"')}</div>
  <div class="field"><label class="label" for="modal-groupNotes">Instructions (optional)</label><textarea class="input" id="modal-groupNotes" name="groupNotes" rows="3" maxlength="350" placeholder="e.g. A1 to A3 back-to-back, then rest">${escapeHtml(old?.notes||'')}</textarea></div>
  <p class="hint">Changing rounds updates the selected exercises' future targets. Existing sessions, logged history and starting weights remain saved.</p>
  `,'form-custom-giant-set',old?'Save giant set':'Create giant set');
}
if(modal.type==='template-exercise'){
 const t=templateById(modal.id),old=modal.index==null?null:t?.items[modal.index];if(!t)return '';
 return modalShell(old?'Edit exercise':'Add custom exercise',`${modalField('name','Exercise name',old?.[1]||'','text','required maxlength="90" placeholder="e.g. Cable Face Pull"')}<div class="field-row">${modalField('sets','Sets',old?.[2]??3,'number','min="1" max="12" required')}${modalField('reps','Target reps',old?.[3]??10,'number','min="1" max="100" required')}${modalField('kg','Starting weight (kg)',old?.[4]??0,'number','min="0" max="2000" step="0.5" required')}${modalField('rest','Rest (seconds)',old?.[5]??90,'number','min="0" max="1800" step="15" required')}</div>${modalField('alternatives','Alternative exercises (optional, comma separated)',old?.[6]?.join(', ')||'','text','maxlength="500"')}${modalField('target','Target shown in plan (optional)',old?.[9]||'','text','maxlength="100"')}<div class="field"><label class="label" for="modal-coach-notes">Exercise notes / FTS instructions</label><textarea class="input" id="modal-coach-notes" name="coachNotes" rows="4" maxlength="1200">${escapeHtml(old?.[8]||'')}</textarea></div><div class="field"><label class="label" for="modal-unit">Track repetitions or time</label><select class="input" id="modal-unit" name="unit">${[['reps','Reps'],['seconds','Seconds'],['minutes','Minutes']].map(([value,label])=>`<option value="${value}" ${value===(old?.[10]||'reps')?'selected':''}>${label}</option>`).join('')}</select></div><p class="hint">Set up the default for future sessions. Weights and reps can always be changed while training.</p>`,'form-template-exercise',old?'Save exercise':'Add exercise');
}
if(modal.type==='water')return modalShell('Log water',`${modalField('amount','Water amount (ml)',250,'number','min="1" max="15000" required')}${modalField('date','Date',today(),'date','required')}<p class="hint">Use any amount. Set your preferred quick-add size with the water controls on the dashboard.</p>`,'form-water','Add water');
if(modal.type==='water-config')return modalShell('Water controls',`${modalField('waterDefault','Amount added by + or a Water card tap (ml)',state.waterDefault||250,'number','min="1" max="5000" required')}${modalField('waterGoal','Daily water goal (ml)',state.goals.water,'number','min="1" max="15000" required')}<p class="hint">The − and + buttons subtract or add this amount. Set your usual glass size here.</p>`,'form-water-config','Save water settings');
if(modal.type==='edit-task'){const t=state.tasks.find(t=>t.id===modal.id);return t?modalShell('Edit daily task',`${modalField('name','Task description',t.label,'text','maxlength="100" required')}`,'form-edit-task','Save task'):'';}
if(modal.type==='meal-guide-item'){
 const item=mealGuideItems().find(x=>x.id===modal.id);
 const group=item?.group||'Breakfast',label=item?.label||'',description=item?.description||'';
 return modalShell(item?'Edit guide entry':'Add guide entry',`<div class="field"><label class="label" for="guide-group">Meal</label><select class="input" id="guide-group" name="group">${['Breakfast','Lunch & Dinner'].map(g=>`<option value="${g}" ${g===group?'selected':''}>${g}</option>`).join('')}</select></div>${modalField('label','Title',label,'text','required maxlength="50" placeholder="e.g. Protein foods"')}<div class="field"><label class="label" for="guide-description">Portions / options</label><textarea class="input" id="guide-description" name="description" rows="3" maxlength="350" required placeholder="e.g. 2 rotis or 150 g cooked rice">${escapeHtml(description)}</textarea></div><p class="hint">Reference only. No food entries or calorie targets are changed.</p>`,'form-meal-guide-item',item?'Save changes':'Add to guide');
}
if(modal.type==='barcode')return barcodeView();
if(modal.type==='barcode-portion')return barcodePortionView();
if(modal.type==='food-photo')return photoMealView();
if(modal.type==='food-search')return foodSearchView();
if(modal.type==='food-portion')return foodPortionView();
if(modal.type==='food')return modalShell('Log a meal',`${modalField('name','Food or meal name','','text','required maxlength="100"')}<div class="field"><label class="label">Meal</label><select class="input" name="meal">${['Breakfast','Lunch','Dinner','Snack'].map(m=>`<option ${m===(modal.meal||'Breakfast')?'selected':''}>${m}</option>`).join('')}</select></div><div class="field-row">${modalField('calories','Calories (kcal)',0,'number','min="0" required')}${modalField('protein','Protein (g)',0,'number','min="0" step="0.1"')}${modalField('carbs','Carbs (g)',0,'number','min="0" step="0.1"')}${modalField('fat','Fat (g)',0,'number','min="0" step="0.1"')}${modalField('fibre','Fibre (g)',0,'number','min="0" step="0.1"')}${modalField('date','Date',today(),'date','required')}</div><p class="hint">Enter values from the package or a reliable recipe estimate. For a mixed meal, add each food separately or use Photo meal.</p>`,'form-food','Add to diary');
if(modal.type==='weight')return modalShell('Add weekly weight',`${modalField('weight','Body weight (kg)',state.weights.at(-1)?.kg ?? '','number','step="0.1" min="20" max="400" required')}${modalField('date','Measurement date',today(),'date','required')}`,'form-weight','Save weigh-in');
if(modal.type==='measurement') {const old=state.measurements.at(-1)||{};return modalShell('Body measurements',`${modalField('date','Date',today(),'date','required')}<p class="hint">All body measurements below are in inches. Leave unknown values blank.</p><div class="field-row">${[['chest','Chest'],['belly','Belly button'],['below','Below belly button'],['shoulders','Shoulders'],['neck','Neck'],['rightBicep','Right bicep'],['leftBicep','Left bicep'],['rightThigh','Right thigh'],['leftThigh','Left thigh'],['rightCalf','Right calf'],['leftCalf','Left calf'],['wrist','Wrist']].map(([k,l])=>modalField(k,l,old[k]??'','number','step="0.1" min="0"')).join('')}</div>`,'form-measurement','Save measurements');}
if(modal.type==='photo-guide')return photoGuideView();
if(modal.type==='photo')return modalShell('Add progress photo',`${modalField('date','Photo date',today(),'date','required')}<div class="field"><label class="label">View</label><select class="input" name="view"><option>Front</option><option>Left side</option><option>Right side</option><option>Back</option></select></div><div class="field"><label class="label">Choose photo</label><input class="input" type="file" name="photo" accept="image/*" required/></div><p class="hint">The photo is compressed locally and stored offline. It will only be uploaded if you connect and back up to your own cloud.</p>`,'form-photo','Save photo');
if(modal.type==='activity'){let a=activityToday();return modalShell('Manual activity entry',`${modalField('steps','Steps today',a.steps,'number','min="0" required')}${modalField('activeCalories','Calories burnt during activity (kcal)',a.activeCalories,'number','min="0" required')}${modalField('date','Date',today(),'date','required')}<p class="hint">Samsung Health/Health Connect automatic import is planned for a native Android development phase.</p>`,'form-activity','Update activity');}
if(modal.type==='task')return modalShell('Add a daily task',`${modalField('name','Task description','','text','maxlength="100" required')}`,'form-task','Add task');
if(modal.type==='rest-setting'){let e=state.session.exercises[modal.index];return modalShell('Exercise rest time',`${modalField('seconds','Rest duration (seconds)',e.restSeconds,'number','min="0" max="1800" step="15" required')}`,'form-rest-setting','Save duration');}
if(modal.type==='swap'){let e=state.session.exercises[modal.index];return modalShell('Swap exercise',`<p class="muted small">Replacing <b>${escapeHtml(e.name)}</b>. Your completed sets and their values will stay in the session, but progression history is separate for each exercise.</p><div class="field"><label class="label">Suggested alternatives</label><select class="input" name="exercise">${[...e.alts,e.name].map(x=>`<option>${escapeHtml(x)}</option>`).join('')}</select></div>${modalField('custom','Or enter another exercise name','')}`,'form-swap','Replace exercise');}
if(modal.type==='notes'){let e=state.session.exercises[modal.index];return modalShell('Exercise notes',`<div class="field"><label class="label">Form cues or reminders</label><textarea class="input" name="notes" rows="5" maxlength="500">${escapeHtml(e.notes||'')}</textarea></div>`,'form-notes','Save note');}
if(modal.type==='video'){
 const item=modal.templateId?templateById(modal.templateId)?.items?.[modal.index]:null;
 const exercise=modal.templateId?(item?{name:item[1],notes:item[8]||''}:null):state.session?.exercises?.[modal.index];
 return modalShell('Exercise demonstration',renderExerciseDemonstration(exercise,{playing:modal.playing}));
}
if(modal.type==='clerk')return modalShell('Set up Clerk sign-in',`${modalField('key','Clerk publishable key (pk_test_ or pk_live_)','','text','required autocomplete="off" spellcheck="false"')}<p class="hint">Paste only the public publishable key from your Clerk Dashboard. This enables your own phone to test the sign-in flow. For all users, set the key in clerk-auth.js before releasing. Do not use a secret key here.</p>`,'form-clerk','Save publishable key');
if(modal.type==='cloud'){const cfg=cloud.getConfig();return modalShell('Configure private cloud',`${modalField('url','Supabase project URL',cfg?.url||'','url','placeholder="https://your-project.supabase.co" required')}${modalField('key','Supabase public publishable/anon key',cfg?.key||'','text','required')}<p class="hint">Use only a Supabase public publishable/anon key, never a service-role or secret key. Google OAuth must first be enabled in your Google Cloud and Supabase projects. Sign-in is optional and does not erase local records.</p>`,'form-cloud','Save cloud configuration');}
if(modal.type==='workout-summary')return modalShell('Session banked',`<div class="hero-number" style="text-align:center;margin-top:6px">${modal.duration} min</div><p style="text-align:center" class="muted">${modal.sets} sets · ${num(modal.volume)} kg moved</p><p class="small muted" style="text-align:center">Legend behaviour. Eat, hydrate, sleep. Repeat.</p><div class="history-summary-actions"><button class="btn block" data-action="undo-finish-workout" data-id="${escapeHtml(modal.historyId||'')}" ${modal.historyId?'':'disabled'}>↶ Undo finish · Reopen workout</button><button class="btn primary block" data-action="view-workout-history">View workout history</button><button class="btn block" data-action="close-modal">Back to workout plans</button></div>`);
return '';
}
function navHtml(){return `<nav class="nav" aria-label="Main navigation">${[['home','home','Dashboard'],['workouts','dumbbell','Workouts'],['nutrition','food','Nutrition'],['body','chart','Body tracker']].map(([id,iconName,label])=>`<button class="nav-btn ${tab===id?'active':''}" data-action="tab" data-tab="${id}">${svg(iconName)} ${label}</button>`).join('')}<button class="nav-btn ${tab==='settings'?'active':''}" data-action="tab" data-tab="settings">${svg('settings')} Settings</button></nav>`;}
function syncDock(visible){
 let dock=document.getElementById('recomp-bottom-dock');
 const pages=[['home','home','Home'],['workouts','dumbbell','Workouts'],['nutrition','food','Nutrition'],['body','chart','Body']];
 if(!dock){
  dock=document.createElement('nav');dock.id='recomp-bottom-dock';dock.className='bottom-nav premium-dock';dock.setAttribute('aria-label','Main navigation');
  dock.innerHTML='<span class="dock-selection" aria-hidden="true"></span>'+pages.map(([id,ico,label])=>`<button class="bottom-btn" data-action="tab" data-tab="${id}" type="button" aria-label="${label}" title="${label}">${svg(ico)}<span>${label}</span></button>`).join('');
  dock.style.setProperty('--active-tab-index',String(Math.max(0,pages.findIndex(([id])=>id===tab))));
  document.body.appendChild(dock);
 }
 dock.hidden=!visible;
 dock.style.display=visible?'':'none';
 dock.setAttribute('aria-hidden',visible?'false':'true');
 for(const button of dock.querySelectorAll('.bottom-btn')){
  const isActive=button.dataset.tab===tab;
  button.classList.toggle('active',isActive);
  if(isActive)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');
 }
 if(visible){
   const selected=dock.querySelector('.bottom-btn.active');
   const selection=dock.querySelector('.dock-selection');
   if(selected&&selection){
    // Use real button geometry, not percentage transforms that drift at the edges.
    selection.style.width=`${selected.offsetWidth}px`;
    selection.style.transform=`translate3d(${selected.offsetLeft}px,0,0)`;
   }
  }
}
// Move elapsed time and set count into the sticky header as the title scrolls away.
let workoutScrollFrame=0;
function updateWorkoutScrollHeader(){
 const main=document.querySelector('.main.workout-focus-shell');
 const titleCounter=main?.querySelector('.workout-start-progress');
 const header=main?.querySelector('.workout-scroll-header');
 if(!main||!titleCounter||!header)return;
 const amount=Math.min(1,Math.max(0,(170-titleCounter.getBoundingClientRect().top)/100));
 main.style.setProperty('--focus-amount',String(amount));
 header.classList.toggle('is-scrolled',amount>.06);
 header.querySelector('.workout-header-progress')?.setAttribute('aria-hidden',String(amount<.5));
 titleCounter.setAttribute('aria-hidden',String(amount>=.5));
}
function scheduleWorkoutScrollHeader(){
 if(workoutScrollFrame)return;
 workoutScrollFrame=requestAnimationFrame(()=>{workoutScrollFrame=0;updateWorkoutScrollHeader();});
}
window.addEventListener('scroll',scheduleWorkoutScrollHeader,{passive:true});
window.addEventListener('resize',scheduleWorkoutScrollHeader,{passive:true});
// Reveal mobile navigation and floating actions when scrolling up.
// Active workout mode keeps its own persistent Minimise / Discard glass header.
let scrollChromeState={lastY:0,hidden:false,down:0},scrollChromeFrame=0;
function resetScrollChrome(){
 scrollChromeState={lastY:window.scrollY,hidden:false,down:0};
 document.body.classList.remove('scroll-chrome-hidden');
}
function updateScrollChrome(){
 const editing=document.activeElement?.matches?.('input,textarea,select,[contenteditable="true"]');
 const focused=Boolean(state.session&&!state.session.minimized&&tab==='workouts');
 const locked=window.innerWidth>760||focused||Boolean(modal||confirmation)||Boolean(editing);
 const next=nextScrollChromeState(scrollChromeState,window.scrollY,{locked});
 if(next.hidden&&!scrollChromeState.hidden&&foodMenuOpen)toggleFoodMenu(false);
 scrollChromeState=next;
 document.body.classList.toggle('scroll-chrome-hidden',next.hidden);
}
function scheduleScrollChrome(){
 if(scrollChromeFrame)return;
 scrollChromeFrame=requestAnimationFrame(()=>{scrollChromeFrame=0;updateScrollChrome();});
}
window.addEventListener('scroll',scheduleScrollChrome,{passive:true});
window.addEventListener('resize',scheduleScrollChrome,{passive:true});
document.addEventListener('focusin',scheduleScrollChrome);
function render(){const focusedGoal=tab==='settings'&&document.activeElement?.closest?.('#settings-goals')?document.activeElement.name:null;foodMenuOpen=false;applyTheme();const active=Boolean(state.session&&!state.session.minimized&&tab==='workouts');document.body.classList.toggle('screen-mode',active);
// The bottom dock is mounted once on document.body and never rebuilt with page content.
let section=active?activeWorkoutView():({home:homeView,workouts:workoutView,nutrition:nutritionView,body:bodyView,settings:settingsView}[tab]||homeView)();
$('#app').innerHTML=svgSymbols+`<div class="layout"><aside class="sidebar"><div class="brand"><span class="brand-mark"><svg class="big-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 13h4l2.5-6 4 11 3-8 2 3h3.5"/></svg></span><span class="brand-name">recomp<span style="color:var(--accent)">.</span></span></div>${navHtml()}<div class="sidebar-foot"><div class="row">${svg('cloud','tiny-icon')} Offline-first personal tracker</div><p>Version 2.7 · Preview</p></div></aside><main class="main ${active?'workout-focus-shell':''}">${section}</main></div>${!active&&(tab==='nutrition'||tab==='body'||tab==='workouts')?(tab==='nutrition'?`<div id="food-fab-cluster" class="food-fab-cluster history-action-cluster ${state.session?'above-workout':''}"><button class="quick-fab quick-history-fab" type="button" data-action="toggle-history" aria-label="${historyPanel==='food'?'Back to food diary':'View food history'}" title="Food history">${svg('history')}<span class="quick-fab-label">${historyPanel==='food'?'Diary':'History'}</span></button><button id="food-fab-button" type="button" class="quick-fab" data-action="toggle-food-menu" aria-label="Add food" title="Add food">${svg('plus')}<span class="quick-fab-label">Food</span></button></div>`:tab==='body'?`<button type="button" class="quick-fab ${state.session?'above-workout':''}" data-action="add-weight" aria-label="Log weight" title="Log weight">${svg('plus')}<span class="quick-fab-label">Weight</span></button>`:`<div class="plan-fab-cluster history-action-cluster ${state.session?'above-workout':''}"><button type="button" class="quick-fab quick-history-fab" data-action="toggle-history" aria-label="${historyPanel==='workouts'?'Back to workout plans':'View workout history'}" title="Workout history">${svg('history')}<span class="quick-fab-label">${historyPanel==='workouts'?'Plans':'History'}</span></button><button type="button" class="quick-fab" data-action="create-template" aria-label="Create workout plan" title="Create workout plan">${svg('plus')}<span class="quick-fab-label">Plan</span></button></div>`):''}${state.session&&!active?`<div class="floating-workout" role="button" tabindex="0" data-action="resume-workout" aria-label="Resume current workout">${svg('dumbbell')}<span style="flex:1"><b>Workout in progress</b><span style="display:block" class="muted mini-workout-details">${escapeHtml(state.session.name)} · <span class="elapsed">${elapsed(state.session.startedAt)}</span></span></span>${svg('minimise','lift-icon')}</div>`:''}${waterCelebration&&tab==='home'&&!modal?`<div class="water-cheers" role="status" aria-live="polite"><span class="cheers-bubbles" aria-hidden="true">✧ ✦ ✧</span><div><b>Cheers! +${num(waterCelebration.ml)} ml 💧</b><small>Another sip, another win.</small></div><button class="btn water-undo" data-action="undo-water">Undo</button></div>`:''}${taskCelebration?taskWinView():''}${restOverlay()}${modalView()}${confirmation?confirmationHtml(confirmation):''}`;
syncDock(!active);
if(active)resetScrollChrome();
if(active)updateWorkoutScrollHeader();
if(focusedGoal)document.getElementById('goal-'+focusedGoal)?.focus({preventScroll:true});
if(bodyPanel==='photos'&&tab==='body')updateCompare();
workoutBackGuard?.arm();
}
function setTab(dest,swipeDirection=null){toggleFoodMenu(false);resetScrollChrome();
 if(tab===dest)return;
 const order=['home','workouts','nutrition','body'];
 const direction=swipeDirection??(order.indexOf(dest)>=order.indexOf(tab)?1:-1);
 historyPanel=null;
 motionChange(()=>{window.scrollTo({top:0,behavior:'instant'});tab=dest;planActionsId=null;mealGuideActionsId=null;state.lastTab=dest;render();},'tab',direction);
 haptic('tap');put('state',state).catch(console.error);
}
function beginWorkout(id){
 const template=templateById(id);if(!template)return;
 if(state.session){pendingPlanSwitch(id);return;}
 if(!template.items.length){notify('Add an exercise to this plan first.');return;}
 motionChange(()=>{window.scrollTo({top:0,behavior:'instant'});state.session={id:uid(),name:template.name,templateId:id,startedAt:Date.now(),minimized:false,instructions:template.notes||'',groupSettings:structuredClone(template.groupSettings||{}),exercises:buildWorkoutExercises(template),activeIndex:0,rest:null,warmupStatus:'pending'};exerciseOpen=0;tab='workouts';state.lastTab='workouts';render();},'expand');
 haptic('success');persist().catch(console.error);
}
function setRest(exIndex){const s=state.session,e=s.exercises[exIndex];s.rest={exerciseIndex:exIndex,endsAt:Date.now()+e.restSeconds*1000,paused:false,remainingMs:e.restSeconds*1000,id:uid()};restAlertedFor=null;restSheet=true;}
function tickSet(exI,setI){
 const s=state.session,e=s?.exercises?.[exI],set=e?.sets?.[setI];if(!set)return;
 const groups=s.giantView==='detailed'?[]:getGiantGroups(s);
 const group=groups.find(g=>g.items.some(item=>item.index===exI));
 const roundWasDone=group?isRoundDone(group,setI):false;
 set.done=!set.done;
 set.completedAt=set.done?new Date().toISOString():null;
 set.exerciseName=set.done?e.name:null;
 if(group){
  // The same saved set is used in both views. Advance A1 → A2 → A3, then round 2.
  // Never mark any other set complete automatically.
  const current={group:group.id,round:setI,index:exI};
  if(set.done){
   haptic('check');
   const roundNowDone=isRoundDone(group,setI);
   if(!roundWasDone&&roundNowDone&&setI<group.rounds-1){
    // FTS did not specify a fixed rest. This is a skippable 60 s suggestion.
    const seconds=group.custom?Math.max(0,Math.min(900,Number(group.restSeconds)||0)):
     group.kind==='single'&&/(?:EMOM|every minute)/i.test(String(e.targetLabel||'')+' '+String(e.notes||''))?0:
     group.kind==='single'&&e.restSeconds>0?e.restSeconds:60;
    if(seconds>0)s.rest={exerciseIndex:exI,endsAt:Date.now()+seconds*1000,
     paused:false,remainingMs:seconds*1000,totalSeconds:seconds,id:uid(),
     suggested:true,giantGroup:group.id,round:setI};
    restSheet=false;restAlertedFor=null;
   }
   const next=nextIncompleteStep(groups,current);
   s.giantCursor=next||current;
   s.activeIndex=s.giantCursor.index;exerciseOpen=s.giantCursor.index;
  }else{s.giantCursor=current;s.activeIndex=exI;exerciseOpen=exI;}
 }else if(set.done){
  // Keep the established per-exercise workflow for non-giant sets / Detailed View.
  haptic('check');
  const all=e.sets.every(x=>x.done);
  if(all){s.rest=null;restSheet=false;const next=s.exercises.findIndex((x,i)=>i>exI&&x.sets.some(a=>!a.done));
   if(next!==-1){s.activeIndex=next;exerciseOpen=next;}
   else{const first=s.exercises.findIndex(x=>x.sets.some(a=>!x.done));if(first!==-1){s.activeIndex=first;exerciseOpen=first;}}
  }else if(e.restSeconds>0)setRest(exI);
 }
 persist().then(render).catch(console.error);
}
// Undo moves one saved entry back to the active workout; it keeps each completed set.
async function restoreFinishedSession(id){
 if(state.session){notify('Finish or discard the current workout before reopening saved history.');return false;}
 const record=state.workoutHistory.find(item=>String(item.id)===String(id));
 if(!record){notify('Saved workout not found.');return false;}
 const session=reopenCompletedWorkout(record,templateById(record.templateId),Date.now());
 if(!session){notify('This old history entry cannot be reopened.');return false;}
 state.session={id:uid(),...session};state.workoutHistory=state.workoutHistory.filter(item=>item!==record);
 tab='workouts';state.lastTab='workouts';historyPanel=null;modal=null;restSheet=false;
 exerciseOpen=state.session.activeIndex||0;window.scrollTo({top:0,behavior:'instant'});
 await commit();notify('Workout reopened. Edit your sets and finish again when ready.');return true;
}
async function eraseLocalFitnessData(){
 // Do not remove the independently hosted optional Supabase backup.
 localStorage.removeItem('recomp-auto-sync');
 await clearAllLocalRecords();
 for(const url of photoUrls.values())URL.revokeObjectURL(url);
 photoUrls.clear();
 for(let index=localStorage.length-1;index>=0;index--){
  const key=localStorage.key(index);
  if(key?.startsWith('recomp-'))localStorage.removeItem(key);
 }
 cloud.signOut();
 state=INITIAL();tab='home';state.lastTab='home';modal=null;historyPanel=null;restSheet=false;
 settingsCloudOpen=false;exerciseOpen=null;goalDraft=null;foodMenuOpen=false;
 await put('state',state);
 window.scrollTo({top:0,behavior:'instant'});render();
 notify('Local fitness data cleared. Built-in workout plans remain available.');
}
async function finishWorkout(){if(!state.session)return;const s=state.session;const done=s.exercises.flatMap(e=>e.sets.filter(x=>x.done).map(set=>({...set,exercise:set.exerciseName||e.name})));if(!done.length){notify('Complete at least one set before finishing');return;}if(!await confirmInApp('Finish this workout and save your completed sets?',{title:'Finish workout?',approveLabel:'Save workout',danger:false}))return;const minutes=Math.max(1,Math.round((Date.now()-s.startedAt)/60000));const volume=done.reduce((v,x)=>v+n(x.kg)*n(x.reps),0);const historyId=uid();state.workoutHistory.push({id:historyId,templateId:s.templateId,date:today(),name:s.name,startedAt:s.startedAt,endedAt:Date.now(),durationMin:minutes,sets:done.length,volume,exercises:s.exercises,sessionDetails:saveSessionDetails(s)});rememberWorkoutSets(s);state.session=null;restSheet=false;tab='workouts';state.lastTab='workouts';modal={type:'workout-summary',historyId,duration:minutes,volume,sets:done.length};await commit();}
function timerControl(action){const r=state.session?.rest;if(!r)return;const leftMs=r.paused?r.remainingMs:Math.max(0,r.endsAt-Date.now());if(action==='timer-plus'||action==='timer-minus'){let newMs=Math.max(0,leftMs+(action==='timer-plus'?15000:-15000));if(!newMs){state.session.rest=null;restSheet=false;}else if(r.paused)r.remainingMs=newMs;else r.endsAt=Date.now()+newMs;}
if(action==='timer-pause'){if(r.paused){r.paused=false;r.endsAt=Date.now()+r.remainingMs;}else{r.remainingMs=leftMs;r.paused=true;}}
if(action==='timer-skip'){state.session.rest=null;restSheet=false;}
persist().then(render);}
let audioContext;
// Small, synthesised UI sounds. Never load audio files or transmit any user data.
function playUiSound(kind='tap',force=false){
 if(!force && state?.preferences?.appSounds===false)return;
 try{
  const AudioAPI=window.AudioContext||window.webkitAudioContext;
  if(!AudioAPI)return;
  audioContext=audioContext||new AudioAPI();
  if(audioContext.state==='suspended')audioContext.resume().catch(()=>{});
  const notes={
   tap:[[0,520,610,.065,.024]],
   navigate:[[0,360,490,.075,.027]],
   check:[[0,570,760,.09,.033]],
   uncheck:[[0,590,420,.09,.024]],
   success:[[0,520,630,.11,.037],[.09,780,980,.13,.034]],
   celebrate:[[0,540,660,.13,.06],[.12,680,840,.15,.055],[.24,850,1080,.22,.058]]
  }[kind]||[[0,520,610,.065,.024]];
  const now=audioContext.currentTime+.01;
  for(const [offset,from,to,duration,volume] of notes){
   const t=now+offset,osc=audioContext.createOscillator(),gain=audioContext.createGain();
   osc.type='sine';osc.frequency.setValueAtTime(from,t);osc.frequency.exponentialRampToValueAtTime(to,t+duration);
   gain.gain.setValueAtTime(.0001,t);gain.gain.linearRampToValueAtTime(volume,t+.012);
   gain.gain.exponentialRampToValueAtTime(.0001,t+duration);
   osc.connect(gain);gain.connect(audioContext.destination);osc.start(t);osc.stop(t+duration+.015);
  }
 }catch(err){console.warn('App sound unavailable',err);}
}
function playWaterSound(force=false){
 if(!force && state?.preferences?.waterSound===false)return;
 try{
  const AudioAPI=window.AudioContext||window.webkitAudioContext;
  if(!AudioAPI)return;
  audioContext=audioContext||new AudioAPI();
  // Unlock audio synchronously in the tap's user gesture, before any async save.
  if(audioContext.state==='suspended')audioContext.resume().catch(()=>{});
  const at=audioContext.currentTime+.008;
  for(const [i,startHz,endHz] of [[0,680,400],[1,520,300]]){
   const t=at+i*.12,osc=audioContext.createOscillator(),gain=audioContext.createGain();
   osc.type='sine';osc.frequency.setValueAtTime(startHz,t);osc.frequency.exponentialRampToValueAtTime(endHz,t+.14);
   gain.gain.setValueAtTime(.0001,t);gain.gain.exponentialRampToValueAtTime(.055,t+.015);
   gain.gain.exponentialRampToValueAtTime(.0001,t+.18);
   osc.connect(gain);gain.connect(audioContext.destination);osc.start(t);osc.stop(t+.19);
  }
 }catch(e){console.warn('Water sound unavailable',e);}
}
async function chime(){try{audioContext=audioContext||new(window.AudioContext||window.webkitAudioContext)();await audioContext.resume();const start=audioContext.currentTime;for(let i=0;i<3;i++){const osc=audioContext.createOscillator(),gain=audioContext.createGain();osc.type='sine';osc.frequency.value=[660,880,1046][i];gain.gain.setValueAtTime(.0001,start+i*.16);gain.gain.exponentialRampToValueAtTime(.2,start+i*.16+.015);gain.gain.exponentialRampToValueAtTime(.0001,start+i*.16+.2);osc.connect(gain).connect(audioContext.destination);osc.start(start+i*.16);osc.stop(start+i*.16+.22);}navigator.vibrate?.([150,80,150]);}catch(err){console.warn('Sound unavailable',err);}}
function timerTick(){const s=state?.session;if(!s)return;for(const el of document.querySelectorAll('.elapsed'))el.textContent=elapsed(s.startedAt);if(s.rest){let remaining=restLeft();for(const el of document.querySelectorAll('.inline-timer,#main-timer'))el.textContent=clock(remaining);const ringBar=document.getElementById('rest-ring-bar');if(ringBar)ringBar.style.strokeDashoffset=(REST_CIRC*(1-restFraction())).toFixed(1);if(remaining<=0&&!s.rest.paused){let id=s.rest.id;if(restAlertedFor!==id){restAlertedFor=id;chime();notify('Rest over. The bar misses you.');if(typeof Notification !== 'undefined' && Notification.permission==='granted' && navigator.serviceWorker?.controller){navigator.serviceWorker.ready.then(reg=>reg.showNotification('Rest complete',{body:'You’re ready for your next set.',icon:'./icon.svg',tag:'rest-complete'})).catch(()=>{});}}
s.rest=null;restSheet=false;persist().then(render);}}}

async function loadPhotoUrls(){for(const p of state.photos){if(photoUrls.has(p.id))continue;try{let blob=await getPhoto(p.id);if(!blob && p.cloudPath && cloud.getSession() && navigator.onLine){blob=await cloud.downloadPhoto(p.cloudPath);await putPhoto(p.id,blob);}if(blob)photoUrls.set(p.id,URL.createObjectURL(blob));}catch(err){console.warn('Photo unavailable',err);}}}
function makePhotoJpeg(file){return new Promise((resolve,reject)=>{const img=new Image(),url=URL.createObjectURL(file);img.onload=()=>{try{const scale=Math.min(1,1400/Math.max(img.width,img.height));const canvas=document.createElement('canvas');canvas.width=Math.round(img.width*scale);canvas.height=Math.round(img.height*scale);canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);canvas.toBlob(blob=>{URL.revokeObjectURL(url);blob?resolve(blob):reject(new Error('Could not process photo'));},'image/jpeg',.82);}catch(e){URL.revokeObjectURL(url);reject(e);}};img.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('Unsupported photo format'));};img.src=url;});}
async function download(name,blob){const url=URL.createObjectURL(blob),anchor=document.createElement('a');anchor.href=url;anchor.download=name;document.body.append(anchor);anchor.click();anchor.remove();setTimeout(()=>URL.revokeObjectURL(url),15000);}
function toDataUrl(blob){return new Promise((res,rej)=>{let reader=new FileReader();reader.onload=()=>res(reader.result);reader.onerror=()=>rej(reader.error);reader.readAsDataURL(blob);});}
async function exportData(){notify('Preparing private backup…');const photos=[];for(const p of state.photos){const blob=await getPhoto(p.id);if(blob)photos.push({id:p.id,data:await toDataUrl(blob)});}const safeState=structuredClone(state);delete safeState.dirty;await download(`recomp-backup-${today()}.json`,new Blob([JSON.stringify({format:'recomp-backup-v1',exportedAt:new Date().toISOString(),state:safeState,photos})],{type:'application/json'}));notify('Backup exported. Store it privately.');}
async function importData(file){const backup=JSON.parse(await file.text());if(backup.format!=='recomp-backup-v1'||!backup.state||!Array.isArray(backup.photos))throw new Error('Unrecognised backup file');if(!await confirmInApp('Restore this backup? This replaces your current local fitness data.',{title:'Replace local data?',approveLabel:'Restore backup'}))return;let newState=backup.state;if(!newState.goals||!Array.isArray(newState.food)||!Array.isArray(newState.templates))throw new Error('Invalid backup state');for(const x of backup.photos){if(!x.data.startsWith('data:image/'))continue;let blob=await(await fetch(x.data)).blob();await putPhoto(x.id,blob);}state={...newState,dirty:true};await put('state',state);for(const url of photoUrls.values())URL.revokeObjectURL(url);photoUrls.clear();await loadPhotoUrls();tab='home';state.lastTab='home';render();notify('Backup restored');}
async function pushCloud(){if(!navigator.onLine)throw new Error('An internet connection is required');const ses=await cloud.usableSession();if(!ses)throw new Error('Sign in with Google first');for(const photo of state.photos){if(photo.cloudPath)continue;const blob=await getPhoto(photo.id);if(!blob)continue;photo.cloudPath=await cloud.uploadPhoto(photo.id,blob);}const syncedAt=new Date().toISOString();await cloud.uploadSnapshot({...state,lastSync:syncedAt,dirty:false});state.lastSync=syncedAt;state.dirty=false;await put('state',state);render();notify('Private cloud backup completed');}
async function pullCloud(){if(!navigator.onLine)throw new Error('An internet connection is required');const remote=await cloud.downloadSnapshot();if(!remote){notify('No cloud backup found');return;}if(!await confirmInApp('Replace the local data on this device with your cloud backup? Unsynchronised local changes will be lost.',{title:'Replace local data?',approveLabel:'Restore cloud backup'}))return;const replacement=remote.payload;if(!replacement?.goals||!Array.isArray(replacement.photos))throw new Error('Cloud backup has unexpected data');state={...replacement,dirty:false};await put('state',state);for(const url of photoUrls.values())URL.revokeObjectURL(url);photoUrls.clear();await loadPhotoUrls();tab='home';state.lastTab='home';render();notify('Cloud backup restored');}
async function handleAction(el,event){const a=el.dataset.action;if(a==='close-modal' && el.classList.contains('modal-shade') && event.target!==el)return;
 switch(a){
 case 'confirm-accept':settleConfirmation(true);break;
 case 'confirm-cancel':settleConfirmation(false);break;
 case 'tab':setTab(el.dataset.tab);break;
 case 'settings':setTab('settings');break;
 case 'toggle-theme':{
  state.preferences??={haptics:true,waterSound:true};
  state.preferences.themeMode=effectiveTheme()==='dark'?'light':'dark';
  applyTheme();haptic('tap');render();await persist();break;
 }
 case 'add-water':modal={type:'water'};render();break;
 case 'metric-water':case 'water-plus':await addQuickWater(n(state.waterDefault,250)||250);break;
 case 'water-minus':await removeRecentWater();break;
 case 'undo-water':await undoCelebrationWater();break;
 case 'water-config':modal={type:'water-config'};render();break;
 case 'test-haptics':{const accepted=haptic('test',true);notify(accepted?'Vibration requested. If you felt nothing, check Android vibration settings and battery saver.':'Vibration not available in this browser or device.');break;}
 case 'test-water-sound':playWaterSound(true);notify('Water sound test. Check your media volume if it is silent.');break;
 case 'test-app-sound':playUiSound('success',true);notify('App sound test. Check your media volume if it is silent.');break;
 case 'refresh-steps':{if(stepRefresh)break;if(nativeHealthAvailable()){stepRefresh=true;try{await syncNativeActivity();}finally{stepRefresh=false;}}else{stepRefreshInfo=true;render();notify('Health Connect is only available through the native Android app. Manual tracking still works.');}break;}
 case 'metric-active':modal={type:'activity'};render();notify('Come on, burn it. Log your move!');break;
 case 'quick-water':await addQuickWater(n(el.dataset.amount));break;
 case 'add-guide-item':mealGuideActionsId=null;modal={type:'meal-guide-item',id:null};render();break;
 case 'edit-guide-item':{
  const item=mealGuideItems().find(x=>x.id===el.dataset.id);
  if(item){mealGuideActionsId=null;modal={type:'meal-guide-item',id:item.id};render();}break;
 }
 case 'delete-guide-item':{
  const item=mealGuideItems().find(x=>x.id===el.dataset.id);
  if(item&&await confirmInApp(`Delete “${item.label}” from your meal guide? This won't change your food diary.`)){
   mealGuideActionsId=null;state.mealGuideItems=mealGuideItems().filter(x=>x.id!==item.id);await commit();haptic('check');notify('Guide entry deleted');
  }break;
 }
 case 'toggle-food-menu':launchNutrition('home');haptic('tap');break;
 case 'food-search':launchNutrition('search',el.dataset.meal);break;
 case 'food-photo':launchNutrition('photo',el.dataset.meal);break;
 case 'food-barcode':launchNutrition('barcode',el.dataset.meal);break;
 case 'barcode-camera':await startBarcodeCamera();break;
 case 'photo-food-add':{
  const item=findFood(el.dataset.id);if(!item)throw new Error('Food not found');
  if(photoMealItems.length>=12)throw new Error('Maximum 12 foods in one meal');
  photoMealItems.push({id:uid(),foodId:item.id,grams:item.defaultGrams});
  render();break;
 }
 case 'photo-food-remove':photoMealItems=photoMealItems.filter(x=>x.id!==el.dataset.id);render();break;
 case 'food-pick':{
  const food=findFood(el.dataset.id);if(!food)throw new Error('Food unavailable');
  const meal=modal?.meal||foodMeal,query=modal?.query||'';
  modal={type:'food-portion',foodId:food.id,meal,grams:food.defaultGrams,query};render();break;
 }
 case 'food-back':{const meal=modal?.meal||foodMeal,query=modal?.query||'';modal={type:'food-search',meal,query};render();break;}
 case 'manual-food':{const meal=modal?.meal||foodMeal;await leaveFoodModal();modal={type:'food',meal};render();break;}
 case 'add-food':launchNutrition('search',el.dataset.meal);break;
  case 'open-meal-planner':openMealPlanner({state,save:commit,log:async entries=>{state.food.push(...entries);await commit();},notify});break;
 case 'add-weight':modal={type:'weight'};render();break;
 case 'add-measurement':modal={type:'measurement'};render();break;
 case 'add-photo':modal={type:'photo'};render();break;
 case 'open-photo-guide':guideDate=today();guideView='Front';modal={type:'photo-guide'};render();await startGuideCamera();break;
 case 'photo-upload-mode':await stopGuideCamera();modal={type:'photo'};render();break;
 case 'take-guided-photo':try{await captureGuidePhoto();}catch(err){notify(err.message);}break;
 case 'activity':modal={type:'activity'};render();break;
 case 'add-task':modal={type:'task'};render();break;
 case 'edit-task':{const t=state.tasks.find(t=>t.id===el.dataset.id);if(t){taskActionsId=null;modal={type:'edit-task',id:t.id};render();}break;}
 case 'delete-task':{const t=state.tasks.find(t=>t.id===el.dataset.id);if(t&&await confirmInApp(`Remove “${t.label}” from your daily tasks?`)){taskActionsId=null;state.tasks=state.tasks.filter(x=>x.id!==t.id);await commit();}break;}
 case 'close-modal':if(modal?.type==='video'&&modal.templateId){modal={type:modal.returnTo==='video-library'?'video-library':'edit-template',id:modal.templateId};render();break;}if(modal?.type==='photo-guide')await stopGuideCamera();await leaveFoodModal();modal=null;render();break;
 case 'nutrition-panel':nutritionPanel=el.dataset.panel;state.lastNutritionPanel=nutritionPanel;render();put('state',state).catch(console.error);break;
 case 'body-panel':bodyPanel=el.dataset.panel;state.lastBodyPanel=bodyPanel;render();put('state',state).catch(console.error);break;
 case 'delete-food':if(await confirmInApp('Delete this food entry?')){state.food=state.food.filter(f=>f.id!==el.dataset.id);await commit();}break;
 case 'delete-weight':if(await confirmInApp('Delete this weight entry?')){state.weights=state.weights.filter(f=>f.id!==el.dataset.id);await commit();}break;
 case 'delete-photo':if(await confirmInApp('Delete this progress photograph from the device? A cloud copy, if already backed up, may remain until you delete it from cloud storage.')){let id=el.dataset.id;state.photos=state.photos.filter(f=>f.id!==id);await deletePhoto(id);const url=photoUrls.get(id);if(url)URL.revokeObjectURL(url);photoUrls.delete(id);await commit();}break;
 case 'repeat-food':{let x=state.food.find(x=>x.id===el.dataset.id);if(x){state.food.push({...x,id:uid(),date:today()});await commit();notify('Added to today’s food diary');}break;}
 case 'begin-template':beginWorkout(el.dataset.id);break;
 case 'create-template':modal={type:'new-template'};render();break;
 case 'toggle-history':historyPanel=(historyPanel===(tab==='nutrition'?'food':'workouts'))?null:(tab==='nutrition'?'food':'workouts');window.scrollTo({top:0,behavior:'instant'});render();break;
 case 'history-close':historyPanel=null;window.scrollTo({top:0,behavior:'instant'});render();break;
 case 'view-workout-history':modal=null;historyPanel='workouts';window.scrollTo({top:0,behavior:'instant'});render();break;
  case 'browse-template-videos':if(templateById(el.dataset.id)){modal={type:'video-library',id:el.dataset.id};render();}break;
 case 'edit-template':planActionsId=null;modal={type:'edit-template',id:el.dataset.id};render();break;
 case 'rename-template':modal={type:'rename-template',id:el.dataset.id};render();break;
 case 'delete-template':{const t=templateById(el.dataset.id);if(t&&await confirmInApp(`Delete plan “${t.name}” and its exercise list? Saved sessions won't change.`)){state.templates=state.templates.filter(x=>x.id!==t.id);modal=null;await commit();notify('Plan deleted. History is intact.');}break;}
 case 'add-custom-giant-set':if(templateById(el.dataset.id)){modal={type:'custom-giant-set',id:el.dataset.id,groupId:null};render();}break;
 case 'edit-custom-giant-set':if(templateById(el.dataset.id)){modal={type:'custom-giant-set',id:el.dataset.id,groupId:el.dataset.group};render();}break;
 case 'remove-custom-giant-set':{
  const t=templateById(el.dataset.id),group=el.dataset.group;
  if(t&&listCustomGiantSets(t).some(g=>g.id===group)&&await confirmInApp(
   'Remove giant set '+group+'? Its exercises, sets and weights remain in the plan, but are no longer grouped.',
   {title:'Remove giant set?',approveLabel:'Remove grouping'})){
   const updated=removeCustomGiantSet(t,group);
   state.templates=state.templates.map(plan=>plan===t?updated:plan);
   modal={type:'edit-template',id:updated.id};await persist();render();haptic('check');
  }
  break;
 }
 case 'add-template-exercise':modal={type:'template-exercise',id:el.dataset.id,index:null};render();break;
 case 'edit-template-exercise':modal={type:'template-exercise',id:el.dataset.id,index:Number(el.dataset.index)};render();break;
 case 'delete-template-exercise':{const t=templateById(el.dataset.id),idx=Number(el.dataset.index),item=t?.items?.[idx];if(item&&await confirmInApp(`Remove “${item[1]}” from ${t.name}? Existing sessions won't change.`)){
    const group=item[12];
    t.items.splice(idx,1);
    // A giant set needs at least two exercises. Keep the remaining exercise
    // but automatically remove a user-created grouping reduced to one member.
    if(group&&listCustomGiantSets(t).some(g=>g.id===group&&g.items.length<2)){
      const updated=removeCustomGiantSet(t,group);
      state.templates=state.templates.map(plan=>plan===t?updated:plan);
    }
    await persist();modal={type:'edit-template',id:t.id};render();haptic('check');
   }break;}
 case 'keep-workout':modal=null;render();break;
 case 'switch-save':await switchWorkoutTo(el.dataset.id,true);break;
 case 'switch-discard':if(await confirmInApp(`Discard the unfinished ${state.session?.name} workout? Completed sets will be lost.`))await switchWorkoutTo(el.dataset.id,false);break;
 case 'start-workout':setTab('workouts');break;
 case 'resume-workout':if(state.session){resumeWorkout();}break;
 case 'minimise-workout':if(state.session){motionChange(()=>{state.session.minimized=true;tab='home';state.lastTab='home';restSheet=false;render();},'minimize');haptic('tap');await persist();}break;
 case 'discard-workout':if(await confirmInApp('Discard this unfinished workout? Completed sets will not be added to history.',{title:'Discard workout?',approveLabel:'Discard workout'})){state.session=null;restSheet=false;await commit();}break;
 case 'warmup-show-video':{
  const player=document.getElementById('recomp-warmup-player');
  if(!player)break;
  const showing=player.hidden;
  if(showing){
   const frame=document.createElement('iframe');
   frame.title='Rowan Row full-body warm-up video';
   frame.loading='lazy';
   frame.allow='accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture';
   frame.allowFullscreen=true;
   frame.referrerPolicy='strict-origin-when-cross-origin';
   frame.src='https://www.youtube-nocookie.com/embed/'+WARMUP_VIDEO_ID+'?autoplay=1&playsinline=1&rel=0';
   player.replaceChildren(frame);player.hidden=false;
  }else{player.replaceChildren();player.hidden=true;}
  el.textContent=showing?'Close warm-up video':'▶ Play the warm-up video';
  el.setAttribute('aria-expanded',String(showing));
  break;
 }
 case 'warmup-finish':
 case 'warmup-skip':
 case 'warmup-reset':{
  if(!state.session)break;
  state.session.warmupStatus=a==='warmup-finish'?'done':a==='warmup-skip'?'skipped':'pending';
  await commit();
  haptic(a==='warmup-finish'?'success':'tap');
  break;
 }
 case 'giant-view':{
  const s=state.session;if(!s)break;
  s.giantView=el.dataset.mode==='detailed'?'detailed':'rounds';
  if(s.giantView==='rounds'&&!s.giantCursor)s.giantCursor=pickGiantCursor(s,getGiantGroups(s));
  render();await persist();break;
 }
 case 'giant-group':{
  const s=state.session,group=getGiantGroups(s).find(g=>g.id===el.dataset.group);if(!s||!group)break;
  let chosen=null;
  for(let round=0;round<group.rounds&&!chosen;round++)
   for(const item of group.items)if(!item.exercise.sets[round].done){chosen={group:group.id,round,index:item.index};break;}
  s.giantCursor=chosen||{group:group.id,round:group.rounds-1,index:group.items[0].index};
  s.activeIndex=s.giantCursor.index;render();await persist();break;
 }
 case 'giant-round':{
  const s=state.session;if(!s)break;
  const groups=getGiantGroups(s),cursor=pickGiantCursor(s,groups),group=groups.find(g=>g.id===cursor.group);if(!group)break;
  const round=Number(el.dataset.round);if(!Number.isInteger(round)||round<0||round>=group.rounds)break;
  const item=group.items.find(it=>!it.exercise.sets[round].done)||group.items[0];
  s.giantCursor={group:group.id,round,index:item.index};s.activeIndex=item.index;render();await persist();break;
 }
 case 'giant-exercise':{
  const s=state.session,groups=getGiantGroups(s);if(!s||!groups.length)break;
  const cursor=pickGiantCursor(s,groups),group=groups.find(g=>g.id===cursor.group);
  const index=Number(el.dataset.ex);if(!group?.items.some(item=>item.index===index))break;
  s.giantCursor={group:group.id,round:cursor.round,index};s.activeIndex=index;render();await persist();break;
 }
 case 'expand-exercise':exerciseOpen=Number(el.dataset.index);if(state.session)state.session.activeIndex=exerciseOpen;await put('state',state);render();break;
 case 'tick-set':tickSet(Number(el.dataset.ex),Number(el.dataset.set));break;
 case 'add-session-exercise':if(state.session){modal={type:'session-exercise'};render();}break;
 case 'remove-session-exercise':{
  const s=state.session,index=Number(el.dataset.index),exercise=s?.exercises?.[index];
  if(!exercise)break;
  const done=exercise.sets.filter(x=>x.done).length;
  if(!await confirmInApp(`Remove “${exercise.name}” from this session? ${done?`${done} completed set(s) from this exercise will be lost.`:'Your saved plan will be unchanged.'}`))break;
  s.exercises.splice(index,1);
  if(s.rest){if(s.rest.exerciseIndex===index){s.rest=null;restSheet=false;}else if(s.rest.exerciseIndex>index)s.rest.exerciseIndex-=1;}
  s.activeIndex=Math.max(0,Math.min(s.exercises.length-1,s.activeIndex>index?s.activeIndex-1:s.activeIndex));
  exerciseOpen=s.activeIndex;haptic('check');await commit();
  break;
 }
 case 'add-set':{let e=state.session?.exercises?.[Number(el.dataset.index)];if(e){const last=e.sets.at(-1);e.sets.push({id:uid(),kg:n(last?.kg),reps:n(last?.reps,10),done:false});await commit();}break;}
 case 'rest-setting':modal={type:'rest-setting',index:Number(el.dataset.index)};render();break;
 case 'swap-exercise':modal={type:'swap',index:Number(el.dataset.index)};render();break;
 case 'exercise-notes':modal={type:'notes',index:Number(el.dataset.index)};render();break;
 case 'exercise-video':modal={type:'video',index:Number(el.dataset.index),playing:false};render();break;
  case 'preview-template-exercise':if(templateById(el.dataset.id)?.items?.[Number(el.dataset.index)]){modal={type:'video',templateId:el.dataset.id,index:Number(el.dataset.index),returnTo:modal?.type==='video-library'?'video-library':'edit-template',playing:false};render();}break;
 case 'load-exercise-video':if(modal?.type==='video'){modal.playing=true;render();}break;
 case 'close-rest':restSheet=false;render();break;
 case 'open-rest':if(state.session?.rest){restSheet=true;haptic('tap');render();}break;
 case 'timer-plus':case 'timer-minus':case 'timer-pause':case 'timer-skip':timerControl(a);break;
 case 'finish-workout':await finishWorkout();break;
 case 'configure-cloud':modal={type:'cloud'};render();break;
 case 'clerk-login':{
  if(!isClerkLoginAvailable()){notify('Clerk sign-in is not configured yet. Continue as a guest.');break;}
  await openClerkSignIn();
  render();break;
 }
 case 'clerk-signout':{
  await clerkSignOut();render();notify('Signed out. Your locally saved fitness records remain on this device.');break;
 }
 case 'clerk-setup':modal={type:'clerk'};render();break;
 case 'google-login':{if(window.Capacitor?.isNativePlatform?.()){notify('Native Google OAuth deep links need Android testing. Sign in through the hosted website for now.');break;}if(!cloud.getConfig()){modal={type:'cloud'};render();notify('Configure your private Supabase project before Google sign-in.');break;}await cloud.startGoogleLogin();break;}
 case 'cloud-upload':await pushCloud();break;
 case 'cloud-download':await pullCloud();break;
 case 'cloud-logout':if(await confirmInApp('Sign out of cloud backup on this device? Your offline data will remain.')){cloud.signOut();render();}break;
 case 'test-chime':await chime();notify('Chime test played, if audio is permitted');break;
 case 'notification-permission':if(typeof Notification==='undefined')notify('Notifications are not supported in this browser');else{let status=await Notification.requestPermission();notify('Notification permission: '+status);}break;
  case 'undo-finish-workout':
 case 'reopen-workout-history':await restoreFinishedSession(el.dataset.id);break;
 case 'delete-workout-history':{
  const record=state.workoutHistory.find(item=>String(item.id)===String(el.dataset.id));
  if(!record)break;
  if(!await confirmInApp('Permanently delete this completed workout from local History? This cannot be undone. Cloud backups, if any, are separate.',{title:'Delete saved workout?',approveLabel:'Delete workout'}))break;
  state.workoutHistory=state.workoutHistory.filter(item=>item!==record);
  await commit();notify('Workout deleted from local History.');break;
 }
 case 'reset-all-local-data':{
  if(!await confirmInApp('Erase ALL locally saved Recomp workouts, food, measurements, photos, custom plans and settings? Built-in FTS plans will still appear. Optional cloud backups will NOT be deleted.',{title:'Reset local fitness data?',approveLabel:'Review final warning'}))break;
  if(!await confirmInApp('Final confirmation: permanently delete all Recomp fitness records stored on this device? Only a previously exported backup could restore them.',{title:'Delete all local fitness data?',approveLabel:'Yes, delete local data'}))break;
  await eraseLocalFitnessData();break;
 }
 case 'delete-cloud-backup':{
  if(!cloud.getSession())throw new Error('Sign in to Advanced cloud backup first');
  if(!await confirmInApp('Permanently delete your Supabase backup and any progress photos stored with it? Local Recomp records stay on this device. This cannot be undone.',{title:'Delete cloud backup?',approveLabel:'Delete cloud backup'}))break;
  localStorage.removeItem('recomp-auto-sync');
  const result=await cloud.deleteRemoteBackup();
  state.lastSync=null;state.dirty=false;await put('state',state);render();
  notify(result.deleted?'Cloud backup and linked photos deleted.':'No cloud backup was found.');break;
 }
case 'export-backup':await exportData();break;
 case 'import-backup':$('#import-file')?.click();break;
 }
}
async function onSubmit(form){let data=new FormData(form),id=form.id;
 if(id==='form-water'){let amount=n(data.get('amount'));if(amount<=0||amount>15000)throw new Error('Enter a water amount between 1 and 15,000 ml');state.water.push({id:uid(),date:data.get('date'),ml:amount});notify(`Added ${amount} ml`);}
 else if(id==='form-meal-guide-item'){
  const label=String(data.get('label')||'').trim().slice(0,50),description=String(data.get('description')||'').trim().slice(0,350),group=String(data.get('group')||'');
  if(!label||!description||!['Breakfast','Lunch & Dinner'].includes(group))throw new Error('Enter a title, portion guide and valid meal');
  const item=mealGuideItems().find(x=>x.id===modal?.id);
  if(modal?.id&&!item)throw new Error('This guide entry no longer exists');
  if(item){item.label=label;item.description=description;item.group=group;}
  else state.mealGuideItems.push({id:uid(),group,label,description});
  mealGuideActionsId=null;haptic('success');notify(item?'Guide entry updated':'Added to meal guide');
 }
 else if(id==='form-barcode-lookup'){
  await resolveBarcode(String(data.get('barcode')||''));return;
 }
 else if(id==='form-barcode-food'){
  const item=modal?.product,grams=Number(data.get('grams')),meal=String(data.get('meal')||''),date=String(data.get('date')||'');
  if(!item||!Number.isFinite(grams)||grams<1||grams>5000)throw new Error('Enter a valid portion');
  if(!MEALS.includes(meal)||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(date)||Number.isNaN(Date.parse(date)))throw new Error('Choose a meal and valid date');
  const totals=barcodeNutrients(item,grams);
  for(const field of form.querySelectorAll('.barcode-missing-field')){
   const value=Number(field.value);if(field.value===''||!Number.isFinite(value)||value<0||value>5000)throw new Error('Enter each missing nutritional value from the label');
   totals[field.dataset.nutrient]=value;
  }
  if(Object.values(totals).some(v=>v==null))throw new Error('Please enter missing nutritional values');
  state.food.push({id:uid(),date,name:item.name,meal,grams,foodSource:'openfoodfacts',barcode:item.code,...totals});
  foodMeal=meal;notify('Added '+item.name+' · '+grams+' g');
 }
 else if(id==='form-photo-meal'){
  if(!photoMealItems.length)throw new Error('Choose at least one food');
  const meal=String(data.get('meal')||''),date=String(data.get('date')||'');
  if(!MEALS.includes(meal)||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(date)||Number.isNaN(Date.parse(date)))throw new Error('Choose a valid date and meal');
  const batch=uid(),entries=[];
  for(const line of photoMealItems){
   const food=findFood(line.foodId),grams=Number(data.get('grams-'+line.id));
   if(!food||!Number.isFinite(grams)||grams<1||grams>5000)throw new Error('Please check every food weight');
   entries.push({id:uid(),date,meal,name:food.name,grams,foodId:food.id,foodSource:'photo-guided-estimate',photoBatch:batch,...nutrientsForGrams(food,grams)});
  }
  state.food.push(...entries);foodMeal=meal;notify('Added '+entries.length+' foods');releaseFoodPhoto();
 }
 else if(id==='form-catalogue-food'){
  const food=findFood(modal?.foodId);if(!food)throw new Error('Choose a food');
  const grams=Number(data.get('grams')),meal=String(data.get('meal')||''),date=String(data.get('date')||'');
  if(!Number.isFinite(grams)||grams<1||grams>5000)throw new Error('Enter a portion from 1 to 5,000 g');
  if(!['Breakfast','Lunch','Dinner','Snack'].includes(meal))throw new Error('Choose a meal');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||Number.isNaN(Date.parse(date)))throw new Error('Choose a valid date');
  const values=nutrientsForGrams(food,grams);
  state.food.push({id:uid(),date,name:food.name,meal,grams,foodId:food.id,foodSource:'recomp-estimate-v1',...values});
  foodMeal=meal;notify(`Added ${food.name} · ${grams} g`);
 }
 else if(id==='form-food'){let item={id:uid(),date:data.get('date'),name:String(data.get('name')).trim().slice(0,100),meal:data.get('meal')};for(let k of ['calories','protein','carbs','fat','fibre']){item[k]=n(data.get(k));if(item[k]<0||item[k]>100000)throw new Error('Check the nutrition amounts');}if(!item.name)throw new Error('Enter a food name');state.food.push(item);}
 else if(id==='form-weight'){let kg=n(data.get('weight'));if(kg<20||kg>400)throw new Error('Enter a valid body weight');state.weights.push({id:uid(),date:data.get('date'),kg});}
 else if(id==='form-measurement'){let m={id:uid(),date:data.get('date')};for(const k of ['chest','belly','below','shoulders','neck','rightBicep','leftBicep','rightThigh','leftThigh','rightCalf','leftCalf','wrist']){let val=data.get(k);m[k]=val===''?'':n(val);}state.measurements.push(m);}
 else if(id==='form-photo'){const file=data.get('photo');if(!(file instanceof File)||!file.size)throw new Error('Choose a photograph');if(file.size>40*1024*1024)throw new Error('Photo is too large (maximum 40 MB)');if(!file.type.startsWith('image/'))throw new Error('Choose an image file');const blob=await makePhotoJpeg(file);await savePhotoBlob(blob,data.get('date'),data.get('view'));return;}
 else if(id==='form-activity'){let entry={date:data.get('date'),steps:Math.max(0,n(data.get('steps'))),activeCalories:Math.max(0,n(data.get('activeCalories')))};state.activity=state.activity.filter(a=>a.date!==entry.date);state.activity.push(entry);}
 else if(id==='form-task'){let name=String(data.get('name')).trim();if(!name)throw new Error('Enter a task');state.tasks.push({id:uid(),label:name,auto:null});}
 else if(id==='form-edit-task'){let t=state.tasks.find(x=>x.id===modal.id),name=String(data.get('name')).trim();if(!t||!name)throw new Error('Enter a valid task');t.label=name.slice(0,100);}
 else if(id==='form-session-exercise'){
  const session=state.session;if(!session)throw new Error('Start a workout first');
  const name=String(data.get('name')||'').trim().slice(0,90),sets=Number(data.get('sets')),reps=Number(data.get('reps')),kg=Number(data.get('kg')),rest=Number(data.get('rest'));
  if(!name||!Number.isInteger(sets)||sets<1||sets>12||!Number.isInteger(reps)||reps<0||reps>2000||!Number.isFinite(kg)||kg<0||kg>2000||!Number.isInteger(rest)||rest<0||rest>1800)throw new Error('Please check all exercise fields');
  const spec=['custom-ex-'+uid(),name,sets,reps,kg,rest,[]];
  session.exercises.push(mkEx(...spec));
  if(data.get('saveToTemplate')==='on'){
    const original=templateById(session.templateId);if(original)original.items.push(spec);
  }
  session.activeIndex=session.exercises.length-1;exerciseOpen=session.activeIndex;
  modal=null;await persist();render();haptic('success');return;
 }
 else if(id==='form-new-template'){
  const name=String(data.get('name')||'').trim().slice(0,70);if(!name)throw new Error('Enter a workout name');
  const newId='custom-'+uid();state.templates.push({id:newId,name,subtitle:'Custom plan',items:[]});
  modal={type:'edit-template',id:newId};await persist();render();haptic('success');return;
 }
 else if(id==='form-rename-template'){
  const t=templateById(modal.id),name=String(data.get('name')||'').trim().slice(0,70);
  if(!t||!name)throw new Error('Enter a workout name');t.name=name;
  modal={type:'edit-template',id:t.id};await persist();render();haptic('check');return;
 }
 else if(id==='form-custom-giant-set'){
  const t=templateById(modal?.id);if(!t)throw new Error('Workout plan is no longer available');
  const next=saveCustomGiantSet(t,{
   groupId:modal.groupId||null,
   indices:data.getAll('member').map(Number),
   rounds:Number(data.get('rounds')),
   restSeconds:Number(data.get('restSeconds')),
   notes:String(data.get('groupNotes')||'')
  });
  state.templates=state.templates.map(plan=>plan===t?next:plan);
  modal={type:'edit-template',id:next.id};
  await persist();render();haptic('success');notify('Giant set saved for future workouts');return;
 }
 else if(id==='form-template-exercise'){
  const t=templateById(modal.id),ix=modal.index,name=String(data.get('name')||'').trim().slice(0,90);
  if(!t||!name)throw new Error('Enter a valid exercise name');
  const sets=Number(data.get('sets')),reps=Number(data.get('reps')),kg=Number(data.get('kg')),rest=Number(data.get('rest'));
  if(!Number.isInteger(sets)||sets<1||sets>12||!Number.isInteger(reps)||reps<0||reps>2000||!Number.isFinite(kg)||kg<0||kg>2000||!Number.isInteger(rest)||rest<0||rest>1800)throw new Error('Check exercise sets, reps, weight and rest duration');
  const alternatives=String(data.get('alternatives')||'').split(',').map(x=>x.trim().slice(0,90)).filter(Boolean).slice(0,8);
  const eid=ix==null?'custom-ex-'+uid():t.items[ix]?.[0];
  if(!eid)throw new Error('Exercise no longer available');
  const previous=ix==null?null:t.items[ix];
  const remembered=previous?.[1]===name?previous[7]:undefined;
  const unit=String(data.get('unit')||'reps'),target=String(data.get('target')||'').trim().slice(0,100),coachNotes=String(data.get('coachNotes')||'').slice(0,1200);
   if(!['reps','seconds','minutes'].includes(unit))throw new Error('Choose a valid unit');
   const item=[eid,name,sets,reps,kg,rest,alternatives,Array.isArray(remembered)?remembered.slice(0,sets):undefined,coachNotes,target,unit,previous?.[11],previous?.[12]];
  if(ix==null)t.items.push(item);else t.items[ix]=item;
  modal={type:'edit-template',id:t.id};await persist();render();haptic('check');return;
 }
 else if(id==='form-water-config'){let amount=n(data.get('waterDefault')),goal=n(data.get('waterGoal'));if(amount<1||amount>5000||goal<1||goal>15000)throw new Error('Check your water amounts');state.waterDefault=Math.round(amount);state.goals.water=Math.round(goal);}
 else if(id==='form-rest-setting'){state.session.exercises[modal.index].restSeconds=Math.max(0,Math.min(1800,n(data.get('seconds'))));}
 else if(id==='form-swap'){let e=state.session.exercises[modal.index],newName=String(data.get('custom')).trim()||String(data.get('exercise')).trim();if(!newName)throw new Error('Choose an exercise');e.swappedFrom=e.swappedFrom||e.name;e.name=newName;for(const set of e.sets){if(!set.done)set.kg=0;}}
 else if(id==='form-notes'){state.session.exercises[modal.index].notes=String(data.get('notes')).slice(0,500);}
 else if(id==='form-clerk'){saveClerkKey(String(data.get('key')));notify('Clerk public key saved. Tap Continue with Google to test it.');}
 else if(id==='form-cloud'){cloud.saveConfig(String(data.get('url')),String(data.get('key')));notify('Cloud configuration saved');}
 else if(id==='settings-goals'){const next=validateGoalDraft(readGoalDraft(form));const previousGoals=state.goals,previousDraft=goalDraft;goalDraft=null;state.goals={...state.goals,...next};try{await commit();}catch(error){state.goals=previousGoals;goalDraft=previousDraft;render();throw error;}notify('Targets updated. Aim high.');return;}
 else return;
 modal=null;await commit();if(taskCelebration!==today())playUiSound('success');}

// A soft tap across every view, including the modular nutrition interface.
// A listener in capture phase keeps it working without changing screen handlers.
document.addEventListener('click',event=>{
 const control=event.target.closest?.('button,[role="button"],a[href]');
 if(!control||control.matches(':disabled,[aria-disabled="true"]'))return;
 const action=control.dataset.action||'';
 if(['test-app-sound','test-water-sound','test-chime','test-haptics','metric-water','water-plus','water-minus','quick-water','undo-water'].includes(action))return;
 playUiSound(action==='tab'?'navigate':'tap');
},true);

document.addEventListener('click',async event=>{const target=event.target.closest('[data-action]');if(!target){if(foodMenuOpen&&!event.target.closest('#food-fab-cluster'))toggleFoodMenu(false);return;}if(target.dataset.action==='close-modal'&&target.classList.contains('modal-shade')&&event.target!==target)return;event.preventDefault();try{await handleAction(target,event);}catch(err){console.error(err);notify(err.message||'Something went wrong');}});
document.addEventListener('submit',async event=>{const form=event.target;if(!form.id)return;event.preventDefault();if(form.dataset.submitting==='yes')return;form.dataset.submitting='yes';try{await onSubmit(form);}catch(err){console.error(err);notify(err.message||'Could not save the entry');}finally{delete form.dataset.submitting;}});
// Preserve every settings target, including temporarily empty fields, during unrelated redraws.
document.addEventListener('click',event=>{
 const summary=event.target.closest?.('#settings-cloud-details > summary');
 if(summary)settingsCloudOpen=!summary.parentElement.open;
},true);
document.addEventListener('input',event=>{if(event.target.matches?.('#settings-goals input[name]'))goalDraft=readGoalDraft(event.target.form);});
// Mirror the first working weight as soon as it is typed, without touching
// separately edited sets or another exercise.
document.addEventListener('input',event=>{
 const el=event.target;
 if(!el.matches('input[data-setfield="kg"][data-set="0"]'))return;
 const i=Number(el.dataset.ex),exercise=state.session?.exercises?.[i];
 if(!exercise)return;
 const first=Math.max(0,n(el.value));exercise.sets[0].kg=first;
 exercise.sets.slice(1).forEach((set,offset)=>{
  if(set.done||set.manualKg)return;
  set.kg=first;
  const sibling=document.querySelector(`input[data-setfield="kg"][data-ex="${i}"][data-set="${offset+1}"]`);
  if(sibling)sibling.value=first>0?String(first):'';
 });
});
document.addEventListener('change',async event=>{
 const el=event.target;
 if(el.id==='food-photo-input'&&modal?.type==='food-photo'){
  const file=el.files?.[0];if(!file)return;
  if(!file.type.startsWith('image/')||file.size>15*1024*1024){notify('Choose an image smaller than 15 MB');el.value='';return;}
  if(foodPhotoUrl)URL.revokeObjectURL(foodPhotoUrl);
  foodPhotoUrl=URL.createObjectURL(file);
  const preview=document.getElementById('meal-photo-preview');if(preview)preview.innerHTML=`<img src="${foodPhotoUrl}" alt="Your selected meal photograph"/>`;
  return;
 }
 if(el.matches('[data-photo-line]')&&modal?.type==='food-photo'){
  const line=photoMealItems.find(item=>item.id===el.dataset.photoLine);
  if(line&&Number.isFinite(Number(el.value))&&Number(el.value)>=1&&Number(el.value)<=5000)line.grams=Number(el.value);
  const total=document.getElementById('photo-total-preview');if(total){const vals={calories:0,protein:0,carbs:0,fat:0,fibre:0};for(const f of photoMealItems){const item=findFood(f.foodId);if(!item)continue;const v=nutrientsForGrams(item,f.grams);for(const k of Object.keys(vals))vals[k]+=v[k];}total.innerHTML=foodNutritionPreview(vals);}return;
 }
});
document.addEventListener('change',async event=>{const el=event.target;
if(el.id==='appearance-mode'){
 state.preferences??={haptics:true,waterSound:true};
 state.preferences.themeMode=el.value;
 applyTheme();await persist();render();return;
}

if(el.id==='enable-haptics'||el.id==='enable-water-sound'||el.id==='enable-app-sounds'){
 state.preferences??={haptics:true,waterSound:true};
 state.preferences[el.id==='enable-haptics'?'haptics':el.id==='enable-water-sound'?'waterSound':'appSounds']=el.checked;
 if(el.id==='enable-app-sounds'&&el.checked)playUiSound('check');
 await persist();notify(el.id==='enable-haptics'?(el.checked?'Haptics enabled':'Haptics disabled'):el.id==='enable-water-sound'?(el.checked?'Water sound enabled':'Water sound muted'):(el.checked?'App sounds enabled':'App sounds muted'));
 return;
}
if(el.matches('[data-setfield]')){
 const i=Number(el.dataset.ex),j=Number(el.dataset.set),field=el.dataset.setfield;
 const exercise=state.session?.exercises?.[i],set=exercise?.sets?.[j];if(!set)return;
 set[field]=Math.max(0,n(el.value));
 if(field==='kg'){
  set.manualKg=j!==0 && el.value.trim()!=='';
  if(j===0){
   // Fill untouched later sets. Never replace completed or manually adjusted weights.
   for(let k=1;k<exercise.sets.length;k++){
    const target=exercise.sets[k];if(target.done||target.manualKg)continue;
    target.kg=set.kg;
    const input=document.querySelector(`input[data-setfield="kg"][data-ex="${i}"][data-set="${k}"]`);
    if(input)input.value=set.kg>0?String(set.kg):'';
   }
  }
 }
 await persist();
}
if(el.matches('[data-task-id]')){const date=today(),id=el.dataset.taskId;taskActionsId=null;state.taskChecks[date]??={};state.taskChecks[date][id]=el.checked;haptic('check');playUiSound(el.checked?'check':'uncheck');await commit();}
if(el.id==='auto-cloud-sync'){localStorage.setItem('recomp-auto-sync',el.checked?'yes':'no');notify(el.checked?'Automatic cloud backup enabled':'Automatic cloud backup disabled');}
if(el.id==='compare-view'){compareView=el.value;const photos=state.photos.filter(p=>p.view===compareView).sort((a,b)=>a.date.localeCompare(b.date));const options=photos.map(p=>`<option value="${p.id}">${dateDisplay(p.date)}</option>`).join('');$('#compare-first').innerHTML=options;$('#compare-second').innerHTML=options;updateCompare();}
if(el.id==='compare-first'||el.id==='compare-second')updateCompare();
if(el.id==='guide-view'){guideView=el.value;updateGuideReference();}
if(el.id==='guide-date')guideDate=el.value;
if(el.id==='import-file'&&el.files?.[0])try{await importData(el.files[0]);}catch(err){console.error(err);notify(err.message||'Backup could not be imported');}
});

// The dashboard keeps editing controls out of sight until a deliberate long press.
function showTaskActions(id){
 if(tab!=='home'||modal||!state.tasks.some(t=>t.id===id))return;
 taskActionsId=id;suppressTaskClickUntil=Date.now()+850;
 haptic('hold');render();
}
function clearTaskHold(){if(taskHoldTimer!==null)clearTimeout(taskHoldTimer);taskHoldTimer=null;taskHoldPoint=null;}
document.addEventListener('pointerdown',event=>{
 if(event.button!==0||modal||tab!=='home')return;
 const row=event.target.closest('.dashboard-tasks [data-task-row]');
 if(!row||event.target.closest('input,button'))return;
 clearTaskHold();taskHoldPoint={x:event.clientX,y:event.clientY,id:row.dataset.taskRow};
 taskHoldTimer=setTimeout(()=>{const id=taskHoldPoint?.id;clearTaskHold();if(id)showTaskActions(id);},560);
},{passive:true});
document.addEventListener('pointermove',event=>{
 if(taskHoldPoint && Math.hypot(event.clientX-taskHoldPoint.x,event.clientY-taskHoldPoint.y)>12)clearTaskHold();
},{passive:true});
document.addEventListener('pointerup',clearTaskHold,{passive:true});
document.addEventListener('pointercancel',clearTaskHold,{passive:true});
document.addEventListener('contextmenu',event=>{
 const row=event.target.closest('.dashboard-tasks [data-task-row]');
 if(!row)return;
 event.preventDefault();clearTaskHold();showTaskActions(row.dataset.taskRow);
});
document.addEventListener('click',event=>{
 const row=event.target.closest('.dashboard-tasks [data-task-row]');
 if(row && Date.now()<suppressTaskClickUntil && event.target.closest('.task-check-label')){
   event.preventDefault();event.stopImmediatePropagation();return;
 }
 if(taskActionsId && (!row||row.dataset.taskRow!==taskActionsId))taskActionsId=null;
},true);
document.addEventListener('keydown',event=>{
 const row=event.target.closest?.('.dashboard-tasks [data-task-row]');
 if(row && ((event.shiftKey&&event.key==='F10')||event.key==='ContextMenu'||event.key==='Enter')){
   event.preventDefault();showTaskActions(row.dataset.taskRow);
 }
});

// Workout plan editing stays hidden until a deliberate long press / keyboard menu.
function clearPlanHold(){if(planHoldTimer!==null)clearTimeout(planHoldTimer);planHoldTimer=null;planHoldPoint=null;}
function revealPlanEditor(id){
 if(tab!=='workouts'||modal||!state.templates.some(t=>t.id===id))return;
 planActionsId=id;haptic('hold');render();
}
document.addEventListener('pointerdown',event=>{
 if(event.button!==0||tab!=='workouts'||modal||state.session&&!state.session.minimized)return;
 const card=event.target.closest('[data-plan-card]');
 if(!card||event.target.closest('button,input,select,textarea,a'))return;
 clearPlanHold();planHoldPoint={x:event.clientX,y:event.clientY,id:card.dataset.planCard};
 planHoldTimer=setTimeout(()=>{const id=planHoldPoint?.id;clearPlanHold();if(id)revealPlanEditor(id);},520);
},{passive:true});
document.addEventListener('pointermove',event=>{
 if(planHoldPoint&&Math.hypot(event.clientX-planHoldPoint.x,event.clientY-planHoldPoint.y)>13)clearPlanHold();
},{passive:true});
document.addEventListener('pointerup',clearPlanHold,{passive:true});
document.addEventListener('pointercancel',clearPlanHold,{passive:true});
document.addEventListener('contextmenu',event=>{
 const card=event.target.closest('[data-plan-card]');if(!card)return;
 event.preventDefault();clearPlanHold();revealPlanEditor(card.dataset.planCard);
});
document.addEventListener('keydown',event=>{
 const card=event.target.closest?.('[data-plan-card]');
 if(card&&((event.shiftKey&&event.key==='F10')||event.key==='ContextMenu'||event.key==='Enter')){
  event.preventDefault();revealPlanEditor(card.dataset.planCard);
 }
});
// The meal guide uses press-and-hold to expose edit/delete, just like workout plans.
function clearMealGuideHold(){if(mealGuideHoldTimer!==null)clearTimeout(mealGuideHoldTimer);mealGuideHoldTimer=null;mealGuideHoldPoint=null;}
function showMealGuideActions(id){
 if(tab!=='nutrition'||modal||!mealGuideItems().some(x=>x.id===id))return;
 mealGuideActionsId=id;haptic('hold');render();
}
document.addEventListener('pointerdown',event=>{
 if(event.button!==0||tab!=='nutrition'||modal)return;
 const item=event.target.closest('[data-guide-item]');
 if(!item||event.target.closest('button,input,textarea,select,a'))return;
 clearMealGuideHold();mealGuideHoldPoint={x:event.clientX,y:event.clientY,id:item.dataset.guideItem};
 mealGuideHoldTimer=setTimeout(()=>{const id=mealGuideHoldPoint?.id;clearMealGuideHold();if(id)showMealGuideActions(id);},520);
},{passive:true});
document.addEventListener('pointermove',event=>{
 if(mealGuideHoldPoint&&Math.hypot(event.clientX-mealGuideHoldPoint.x,event.clientY-mealGuideHoldPoint.y)>12)clearMealGuideHold();
},{passive:true});
document.addEventListener('pointerup',clearMealGuideHold,{passive:true});
document.addEventListener('pointercancel',clearMealGuideHold,{passive:true});
document.addEventListener('contextmenu',event=>{
 const item=event.target.closest('[data-guide-item]');if(!item)return;
 event.preventDefault();clearMealGuideHold();showMealGuideActions(item.dataset.guideItem);
});
document.addEventListener('keydown',event=>{
 const item=event.target.closest?.('[data-guide-item]');
 if(item&&((event.shiftKey&&event.key==='F10')||event.key==='ContextMenu'||event.key==='Enter'||event.key===' ')){
  event.preventDefault();showMealGuideActions(item.dataset.guideItem);
 }
});
document.addEventListener('click',event=>{
 if(!mealGuideActionsId)return;
 const item=event.target.closest?.('[data-guide-item]');
 if(!item||item.dataset.guideItem!==mealGuideActionsId){mealGuideActionsId=null;}
},true);

// Horizontal page gestures, without hijacking vertical scroll, fields or active workouts.
const swipeTabs=['home','workouts','nutrition','body'];
function canSwipePages(){return window.matchMedia('(max-width:760px)').matches &&
  !modal && !restSheet && !(state?.session && !state.session.minimized && tab==='workouts') && swipeTabs.includes(tab);
}
document.addEventListener('touchstart',event=>{
 swipeGesture=null;
 if(!canSwipePages()||event.touches.length!==1)return;
 const target=event.target;
 if(target.closest('input,textarea,select,[contenteditable="true"],.tab-row,.photo-compare,.chart-bars,.video-embed,.modal-shade,.timer-sheet,.water-stepper,[role="slider"]'))return;
 const touch=event.touches[0];
 if(touch.clientX<22 || touch.clientX>window.innerWidth-22)return; // Android system back gestures
 swipeGesture={x:touch.clientX,y:touch.clientY,time:Date.now(),tab,tracking:false,frame:null};
},{passive:true});
document.addEventListener('touchmove',event=>{
 const g=swipeGesture;if(!g||!canSwipePages()||event.touches.length!==1)return;
 const t=event.touches[0],dx=t.clientX-g.x,dy=t.clientY-g.y;
 if(Math.abs(dx)<13||Math.abs(dx)<Math.abs(dy)*1.5)return;
 // Navigation wraps from Home to Body and Body to Home.
 g.tracking=true;
 if(g.frame)cancelAnimationFrame(g.frame);
 g.frame=requestAnimationFrame(()=>{const main=$('.main');if(main){main.style.transform=`translate3d(${Math.max(-42,Math.min(42,dx*.17))}px,0,0)`;main.style.opacity=String(Math.max(.8,1-Math.abs(dx)/650));}});
},{passive:true});
document.addEventListener('touchend',event=>{
 const g=swipeGesture;swipeGesture=null;if(g?.frame)cancelAnimationFrame(g.frame);
 const main=$('.main');if(main){main.style.transform='';main.style.opacity='';}
 if(!g||!canSwipePages()||g.tab!==tab||event.changedTouches.length!==1)return;
 const t=event.changedTouches[0],dx=t.clientX-g.x,dy=t.clientY-g.y;
 if(Math.abs(dx)<75 || Math.abs(dx)<Math.abs(dy)*1.5 || Date.now()-g.time>1300)return;
 const index=swipeTabs.indexOf(tab),direction=dx<0?1:-1;
 const next=(index+direction+swipeTabs.length)%swipeTabs.length;
 event.preventDefault();taskActionsId=null;setTab(swipeTabs[next],direction);
},{passive:false});
document.addEventListener('touchcancel',()=>{if(swipeGesture?.frame)cancelAnimationFrame(swipeGesture.frame);swipeGesture=null;const main=$('.main');if(main){main.style.transform='';main.style.opacity='';}},{passive:true});

 document.addEventListener('input',event=>{
  const el=event.target;
  if(el.id==='barcode-grams'&&modal?.type==='barcode-portion'){
   const amount=Number(el.value);if(Number.isFinite(amount)&&amount>=1&&amount<=5000){modal.grams=amount;const preview=document.getElementById('barcode-macros');if(preview)preview.innerHTML=barcodePreview(modal.product,barcodeNutrients(modal.product,amount));}
  }
  if(el.id==='photo-food-search'&&modal?.type==='food-photo'){
   photoSearchQuery=el.value;const results=document.getElementById('photo-food-results');if(results)results.innerHTML=searchFoods(el.value,8).map(f=>`<button type="button" class="photo-food-match" data-action="photo-food-add" data-id="${escapeHtml(f.id)}">${svg('plus','tiny-icon')} ${escapeHtml(f.name)}</button>`).join('');
  }
  if(el.id==='food-search-input'&&modal?.type==='food-search'){
   modal.query=el.value;
   const results=$('#food-search-results');if(results)results.innerHTML=foodSearchResults(el.value);
  }
  if(el.id==='food-grams'&&modal?.type==='food-portion'){
   const food=findFood(modal.foodId),preview=$('#food-preview-macros');
   if(!food||!preview)return;
   const grams=Number(el.value);
   if(Number.isFinite(grams)&&grams>0&&grams<=5000){modal.grams=grams;preview.innerHTML=foodNutritionPreview(nutrientsForGrams(food,grams));}
   else preview.innerHTML='<p class="hint">Enter a portion between 1 and 5,000 g.</p>';
  }
 });
 document.addEventListener('input',event=>{if(event.target.id==='compare-range'){const pct=Number(event.target.value);const layer=$('#compare-before-layer'),handle=$('#compare-handle');if(layer)layer.style.clipPath=`inset(0 ${100-pct}% 0 0)`;if(handle)handle.style.left=pct+'%';}});

document.addEventListener('keydown',event=>{if(event.key==='Escape'){if(confirmation){event.preventDefault();settleConfirmation(false);return;}if(modal){if(modal.type==='photo-guide')stopGuideCamera().catch(console.warn);leaveFoodModal().catch(console.warn);modal=null;render();}else if(restSheet){restSheet=false;render();}}if((event.key==='Enter'||event.key===' ')&&event.target.classList?.contains('floating-workout')){event.preventDefault();event.target.click();}});

// Do not interrupt a workout when an updated service worker becomes active.
function showUpdateNotice(){
 if(document.querySelector('.recomp-update-notice'))return;
 const banner=document.createElement('aside');
 banner.className='recomp-update-notice';
 banner.setAttribute('role','status');
 const message=document.createElement('span');
 message.textContent='Recomp update ready. Your saved records are safe.';
 const button=document.createElement('button');
 button.type='button';button.textContent='Reload';
 button.addEventListener('click',()=>window.location.reload());
 banner.append(message,button);
 document.body.appendChild(banner);
}
async function init(){try{
 const saved=await get('state');
 const hadSavedState=Boolean(saved&&typeof saved==='object'&&!Array.isArray(saved));
 state=hadSavedState?saved:INITIAL();
 const defaults=INITIAL();
 // Safely repair an old or partial schema in memory, preserving all existing logs.
 if(!state.goals||typeof state.goals!=='object')state.goals=defaults.goals;
 else state.goals={...defaults.goals,...state.goals};
 for(const key of ['food','water','activity','weights','measurements','photos','workoutHistory','templates']){
  if(!Array.isArray(state[key]))state[key]=defaults[key];
 }
 // One-time FTS expansion. Keep existing edits, session records and personal workout plans.
 if(hadSavedState && Number(state.ftsWorkoutImportVersion||0)<5){
  const previousVersion=Number(state.ftsWorkoutImportVersion||0);
  if(previousVersion<2)state.templates=mergeFtsWorkoutExpansion(state.templates);
  if(previousVersion<3)state.templates=mergeFtsFinalWorkouts(state.templates);
  // Version 3 shipped an intentionally empty Workout 40. Replace only that untouched
  // placeholder after verifying its Strength exercises in the FTS screen recording.
  if(previousVersion>=3){
   const empty=state.templates.find(t=>t?.id==='fts-workout-40');
   if(empty?.name==='Workout 40 · Details needed (video unclear)' && Array.isArray(empty.items) && empty.items.length===0){
    const verified=FTS_WORKOUTS_16_TO_41.find(t=>t.id==='fts-workout-40');
    if(verified)state.templates=state.templates.map(t=>t===empty?structuredClone(verified):t);
   }
  }
  // Finish only the three previously marked incomplete FTS groups (17, 24, 29).
  // Existing edited sets, personal plans and workout history are not replaced.
  state.templates=mergeFtsReviewedWorkouts(state.templates);
  state.ftsWorkoutImportVersion=5;
  await put('state',state);
 }
 if(state.session&&(!Array.isArray(state.session.exercises)||!Number.isFinite(Number(state.session.startedAt)))){
  // Do not erase the original stored state during recovery.
  state.session=null;
 }
 if(!Number.isFinite(n(state.waterDefault))||n(state.waterDefault)<=0)state.waterDefault=250;if(!Array.isArray(state.tasks))state.tasks=INITIAL().tasks;if(!state.preferences||typeof state.preferences!=='object')state.preferences={haptics:true,waterSound:true};if(!['system','light','dark'].includes(state.preferences.themeMode))state.preferences.themeMode='system';if(!state.taskChecks || typeof state.taskChecks!=='object')state.taskChecks={};if(!Array.isArray(state.mealGuideItems))state.mealGuideItems=structuredClone(DEFAULT_MEAL_GUIDE);const defaultBreakfast=state.mealGuideItems.find(item=>item.id==='guide-breakfast');if(defaultBreakfast?.label==='Breakfast'&&defaultBreakfast.description==='2 eggs + 1 slice of toast')defaultBreakfast.label='Eggs & toast';tab=['home','workouts','nutrition','body','settings'].includes(state.lastTab)?state.lastTab:'home';
 bodyPanel=['measurements','photos','weight'].includes(state.lastBodyPanel)?state.lastBodyPanel:'measurements';
 nutritionPanel=['diary','favourites'].includes(state.lastNutritionPanel)?state.lastNutritionPanel:'diary';
 if(state.session){
  exerciseOpen=state.session.activeIndex||0;
  // A focused workout should restore as focused. A minimised session must NOT hijack the last tab.
  if(!state.session.minimized && tab!=='workouts')state.session.minimized=true;
 }
 // A same-page history entry allows Android / Chrome Back to minimise rather than exit.
 // It also closes in-app overlays before minimising. The current session is persisted.
 workoutBackGuard=createWorkoutBackGuard({
  history:window.history,
  subscribe:(name,callback)=>window.addEventListener(name,callback),
  shouldGuard:()=>Boolean(state.session&&!state.session.minimized&&tab==='workouts'),
  onBack:()=>{
   if(confirmation){settleConfirmation(false);return true;}
   if(modal){
    if(modal.type==='photo-guide')stopGuideCamera().catch(console.warn);
    leaveFoodModal().catch(console.warn);
    modal=null;render();return true;
   }
   if(restSheet){restSheet=false;render();return true;}
   if(state.session&&!state.session.minimized&&tab==='workouts'){
    state.session.minimized=true;restSheet=false;
    tab='home';state.lastTab='home';
    render();persist().catch(console.error);
   }
   return false;
  }
 });
 // Seed completion state before first paint: opening the app never replays the celebration.
 wasAllTasksComplete=allTasksComplete();
 // Render immediately; failed IndexedDB writes and slow photo loads cannot block startup.
 render();
 // The approved Pulse intro overlays the first app paint, then gracefully disappears.
 // Keep the approved intro for at least 2.5 seconds; slow boots add no further delay.
 // Reduced-motion users enter immediately. No training data is accessed here.
 const pulse=document.getElementById('recomp-pulse');
 if(pulse){
  const still=window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  const elapsed=window.performance?.now?.()??0;
  const hold=still?0:Math.max(0,2500-elapsed);
  window.setTimeout(()=>{
   pulse.classList.add('rb-leaving');
   window.setTimeout(()=>pulse.remove(),still?0:320);
  },hold);
 }
 if(!reducedMotion()){const first=document.querySelector('.main');first?.classList.add('page-enter');setTimeout(()=>first?.classList.remove('page-enter'),1600);}
 loadPhotoUrls().then(()=>{if(tab==='body'&&bodyPanel==='photos')render();}).catch(err=>console.warn('Photos can be opened later:',err));
window.matchMedia?.('(prefers-color-scheme: dark)')?.addEventListener?.('change',()=>{if(themeChoice()==='system'){applyTheme();render();}});
if('serviceWorker' in navigator && location.protocol!=='file:'){
  const previouslyControlled=Boolean(navigator.serviceWorker.controller);
  navigator.serviceWorker.addEventListener('controllerchange',()=>{if(previouslyControlled)showUpdateNotice();});
  navigator.serviceWorker.register('./sw.js').then(reg=>{
   if(reg.waiting && navigator.serviceWorker.controller)showUpdateNotice();
   reg.addEventListener('updatefound',()=>{
    const worker=reg.installing;
    worker?.addEventListener('statechange',()=>{
     if(worker.state==='installed' && navigator.serviceWorker.controller)showUpdateNotice();
    });
   });
   let lastChecked=Date.now();
   document.addEventListener('visibilitychange',()=>{
    if(!document.hidden && Date.now()-lastChecked>5*60*1000){
     lastChecked=Date.now();reg.update().catch(()=>{});
    }
   });
  }).catch(err=>console.warn('Offline install unavailable',err));
 }
try{if(new URLSearchParams(location.search).has('code')){await cloud.finishGoogleLogin();try{localStorage.setItem(FIRST_RUN_KEY,'google');}catch{}notify('Google Sign-In connected. Open Settings to back up your data.');render();}}catch(err){notify('Google Sign-In: '+err.message);}
 // Load Clerk identity if the app owner has configured it. No authentication
 // is ever required to access existing IndexedDB fitness records.
 if(isClerkLoginAvailable()){
  try{
   const clerkClient=await loadClerk();
   // Keep the account display in sync and close the first-run welcome after
   // Clerk confirms authentication. This listener never modifies fitness data.
   clerkClient.addListener(({user})=>{
    if(user){
     try{localStorage.setItem(FIRST_RUN_KEY,'google');}catch{}
     document.getElementById('recomp-first-run')?.remove();
    }
    if((tab==='settings'||tab==='home') && !modal)render();
   },{skipInitialEmit:true});
  }catch(e){console.warn('Optional Clerk sign-in unavailable:',e.message);}
 }
 // Guest-first welcome is only for genuinely new installations. Never interrupt
 // users who already have IndexedDB fitness records, even without a Google session.
 let firstRunChoice=false;
 try{firstRunChoice=Boolean(localStorage.getItem(FIRST_RUN_KEY));}catch{}
 if(shouldOfferFirstRun({
  hasSavedState:hadSavedState,
  hasChoice:firstRunChoice,
  hasSession:Boolean(cloud.getSession()||getClerkAccount()),
  hasOAuthCallback:new URLSearchParams(location.search).has('code')
 })){
  showFirstRunWelcome({
   googleEnabled:isClerkLoginAvailable(),
   developmentMode:isClerkDevelopmentMode(),
   onGuest:()=>{try{localStorage.setItem(FIRST_RUN_KEY,'guest');}catch{}},
   onGoogle:async()=>{
    if(window.Capacitor?.isNativePlatform?.())return 'Google sign-in still needs testing in the native Android wrapper. Continue as a guest for now.';
    if(!isClerkLoginAvailable())return 'Clerk sign-in is not configured yet. Continue without signing in for now.';
    await openClerkSignIn();
   }
  });
 }
setInterval(timerTick,500);
setInterval(async()=>{if(!state.dirty||localStorage.getItem('recomp-auto-sync')!=='yes'||!navigator.onLine||!cloud.getSession())return;try{await pushCloud();}catch(e){console.warn('Auto-sync waiting:',e.message);}},60000);
}catch(err){console.error(err);document.body.innerHTML=`<div style="max-width:500px;margin:10vh auto;padding:25px"><h1>Unable to open Recomp</h1><p>${escapeHtml(err.message)}</p><p>Your locally stored data has not been cleared. Try reloading. If the problem continues, do not clear site data, as it may contain your only copy of your records.</p><button id="recomp-retry" type="button" style="padding:12px 24px;border-radius:12px;background:#75eac4;color:#09241c;font:inherit">Reload Recomp</button></div>`;document.getElementById('recomp-retry')?.addEventListener('click',()=>location.reload());}}
init();
