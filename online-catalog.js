// Recomp v2.9: read-only access to the owner's PUBLIC reference library.
// No personal food diary, workout results, credentials or photos are uploaded.
// A local snapshot is available when the internet is offline.
import {get,put} from './db.js';
import {applyOnlineFoods} from './food-db.js';
const CONFIG='recomp-public-catalog-url-v1';
const CACHE='public-content-catalog-v1';
export const MAX_REMOTE_FOODS=2000;
let workouts=[];
let info={status:'not-connected',version:null,foodCount:0,workoutCount:0};
export function getOnlineCatalogUrl(){
 try{return String(localStorage.getItem(CONFIG)||'');}catch{return '';}
}
export function saveOnlineCatalogUrl(input){
 const raw=String(input||'').trim();
 if(!raw){try{localStorage.removeItem(CONFIG);}catch{};return '';}
 const url=new URL(raw);
 if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash||
    !/\/v1\/catalog\/?$/.test(url.pathname))
  throw Error('Enter a secure HTTPS Worker URL ending in /v1/catalog, with no password or query parameters.');
 const safe=url.origin+'/v1/catalog';
 try{localStorage.setItem(CONFIG,safe);}catch{}
 return safe;
}
export function validatePublicCatalog(body){
 if(!body||typeof body!=='object'||!Number.isSafeInteger(body.version)||body.version<1||
   !Array.isArray(body.foods)||body.foods.length>MAX_REMOTE_FOODS||
   !Array.isArray(body.workouts)||body.workouts.length>200)
  throw Error('The content library returned an invalid catalogue.');
 // Food details are validated by applyOnlineFoods, which is applied only after
 // the complete workout catalogue has also passed validation.
 const plans=body.workouts.map(plan=>{
  if(!plan||typeof plan.id!=='string'||!\/^[a-z0-9][a-z0-9._-]{1,79}$/i.test(plan.id)||
    typeof plan.name!=='string'||plan.name.length<2||plan.name.length>120||
    !Array.isArray(plan.items)||plan.items.length<1||plan.items.length>80||
    plan.items.some(e=>!Array.isArray(e)||e.length<6||typeof e[0]!=='string'||typeof e[1]!=='string'||
      e[1].length>120||!Number.isFinite(Number(e[2]))||Number(e[2])<1||Number(e[2])>30))
   throw Error('The online workout catalogue contains an invalid plan.');
  return structuredClone(plan);
 });
 if(new Set(plans.map(x=>x.id)).size!==plans.length)throw Error('Duplicate workout IDs in online library.');
 return {version:body.version,foods:body.foods,workouts:plans};
}
function applySnapshot(data){
 const clean=validatePublicCatalog(data);
 const count=applyOnlineFoods(clean.foods);
 workouts=clean.workouts;
 info={status:'ready',version:clean.version,foodCount:count,workoutCount:workouts.length};
 return {...info,workouts:getOnlineWorkouts()};
}
export function getOnlineWorkouts(){return workouts.map(p=>structuredClone(p));}
export function getOnlineCatalogInfo(){return {...info};}
export async function loadCachedOnlineCatalog(url=getOnlineCatalogUrl(),read=get){
 if(!url)return {status:'not-configured'};
 try{
  const saved=await read(CACHE);
  if(saved?.url!==url||!saved?.data)return {status:'no-cache'};
  return applySnapshot(saved.data);
 }catch{return {status:'cache-unavailable'};}
}
export async function refreshOnlineCatalog({fetchImpl=fetch,write=put,timeoutMs=8500}={}){
 const url=getOnlineCatalogUrl();
 if(!url)return {status:'not-configured'};
 const controller=new AbortController();
 const timer=setTimeout(()=>controller.abort(),timeoutMs);
 try{
  const response=await fetchImpl(url,{method:'GET',cache:'no-store',credentials:'omit',signal:controller.signal});
  if(!response.ok)throw Error('Library unavailable (HTTP '+response.status+').');
  const data=validatePublicCatalog(await response.json());
  const result=applySnapshot(data);
  await write(CACHE,{url,data,savedAt:new Date().toISOString()}).catch(()=>{});
  return {...result,updated:true};
 }catch(error){
  return {status:'offline',message:String(error.message||'Could not reach content library.'),...info,updated:false};
 }finally{clearTimeout(timer);}
}
