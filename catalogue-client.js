// Read-only remote catalogue with IndexedDB fallback. No personal data goes online.
import {get,put} from './db.js';
const URL_KEY='recomp-catalogue-api-v1';
const CACHE_KEY='recomp-catalogue-cache-v1';
const allowUrl=value=>{
 const url=new URL(String(value||'').trim());
 if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash||!url.hostname)
  throw Error('Enter a public HTTPS catalogue URL without credentials.');
 if(url.pathname!=='/v1/catalogue')throw Error('Catalogue URL must end with /v1/catalogue.');
 return url.toString();
};
export function getCatalogueUrl(){try{return allowUrl(localStorage.getItem(URL_KEY)||'');}catch{return '';}}
export function saveCatalogueUrl(value){
 const text=String(value||'').trim();
 if(!text){try{localStorage.removeItem(URL_KEY);}catch{}return '';}
 const url=allowUrl(text);
 try{localStorage.setItem(URL_KEY,url);}catch{throw Error('Browser storage is unavailable.');}
 return url;
}
const safeText=(v,max)=>typeof v==='string'&&v.trim()&&v.length<=max?v.trim():null;
const per100Keys=['calories','protein','carbs','fat','fibre'];
const grams=v=>typeof v==='number'&&Number.isFinite(v)&&v>0&&v<=5000;
function safeFood(food){
 if(!food||typeof food!=='object'||!safeText(food.id,90)||!safeText(food.name,100)||!grams(food.defaultGrams))return null;
 if(!food.per100||per100Keys.some(key=>typeof food.per100[key]!=='number'||!Number.isFinite(food.per100[key])||food.per100[key]<0||food.per100[key]>1000))return null;
 return {id:food.id,name:food.name,category:safeText(food.category,80)||'Other',
  aliases:typeof food.aliases==='string'?food.aliases.slice(0,350):'',
  defaultGrams:food.defaultGrams,per100:Object.fromEntries(per100Keys.map(k=>[k,food.per100[k]])),
  source:safeText(food.source,90)||'Online catalogue estimate',type:'estimated'};
}
function safeWorkout(plan){
 if(!plan||!safeText(plan.id,90)||!safeText(plan.name,100)||!Array.isArray(plan.items)||plan.items.length>35)return null;
 const items=[];
 for(const item of plan.items){
  if(!Array.isArray(item)||item.length<7||item.length>13||!safeText(item[0],90)||!safeText(item[1],100)||
    ![2,3,4,5].every(i=>typeof item[i]==='number'&&Number.isFinite(item[i])&&item[i]>=0&&item[i]<=1800)||
    !Array.isArray(item[6])||item[6].length>12||item[6].some(x=>!safeText(x,90)))return null;
  if(item[2]<1||item[2]>12||item[3]>300||item[4]>1000)return null;
  items.push(item.map((x,i)=>i===6?[...x]:x));
 }
 return {id:plan.id,name:plan.name,subtitle:safeText(plan.subtitle,140)||'Online programme',items};
}
function safeExercise(e){
 if(!e||!safeText(e.id,90)||!safeText(e.name,100))return null;
 return {id:e.id,name:e.name,muscleGroup:safeText(e.muscleGroup,80)||'',
  equipment:safeText(e.equipment,80)||'',guidance:typeof e.guidance==='string'?e.guidance.slice(0,800):''};
}
export function normaliseCatalogue(response){
 if(!response||response.version!==1||!Array.isArray(response.foods)||!Array.isArray(response.workouts)||!Array.isArray(response.exercises))
  throw Error('Unsupported online catalogue format. Expected version 1.');
 if(response.foods.length>1500||response.workouts.length>120||response.exercises.length>600)
  throw Error('Catalogue response is too large.');
 const collect=(items,fn)=>[...new Map(items.map(fn).filter(Boolean).map(x=>[x.id,x])).values()];
 return {version:1,updatedAt:typeof response.updatedAt==='string'?response.updatedAt.slice(0,40):null,
  foods:collect(response.foods,safeFood),workouts:collect(response.workouts,safeWorkout),
  exercises:collect(response.exercises,safeExercise)};
}
export async function cachedCatalogue(url,read=get){
 const expected=allowUrl(url);
 try{
  const data=await read(CACHE_KEY);
  return data?.url===expected?normaliseCatalogue(data.payload):null;
 }catch{return null;}
}
export async function fetchCatalogue(url,{fetchImpl=fetch,write=put,timeoutMs=10000}={}){
 const endpoint=allowUrl(url);
 const abort=new AbortController();
 const timer=setTimeout(()=>abort.abort(),timeoutMs);
 let data;
 try{
  const response=await fetchImpl(endpoint,{method:'GET',headers:{Accept:'application/json'},cache:'no-store',signal:abort.signal,credentials:'omit'});
  if(!response.ok)throw Error('Online catalogue unavailable (HTTP '+response.status+').');
  const contentLength=Number(response.headers.get('Content-Length'));
  if(Number.isFinite(contentLength)&&contentLength>1_500_000)throw Error('Online catalogue is too large.');
  const body=await response.text();
  if(body.length>1_500_000)throw Error('Online catalogue is too large.');
  data=normaliseCatalogue(JSON.parse(body));
 }catch(error){if(error?.name==='AbortError')throw Error('Catalogue refresh timed out. Offline catalogue still works.');throw error;}
 finally{clearTimeout(timer);}
 try{await write(CACHE_KEY,{url:endpoint,payload:data,savedAt:Date.now()});}catch{}
 return data;
}
