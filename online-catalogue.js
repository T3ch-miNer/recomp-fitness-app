// Recomp public catalogue. Only published foods/exercises/workout templates.
// The existing Cloudflare D1 Worker is read-only and requires no app credentials.
// Personal diaries, sessions and photos never leave the phone through this module.
import {get,put} from './db.js';

export const ONLINE_CATALOGUE_URL='https://recomp-catalogue.rahul-dbz95.workers.dev/v1/catalogue';
const KEY='recomp-public-catalogue-v1';
const LIMIT=2_000_000;
const MACROS=['calories','protein','carbs','fat','fibre'];
const reasonable=(n,max)=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=max;
const safe=(s,n)=>typeof s==='string'&&s.trim()&&s.length<=n;
function foodEntry(e){
 if(!e||!safe(e.id,90)||!safe(e.name,130)||!reasonable(e.defaultGrams,5000)||e.defaultGrams===0||
    !e.per100||MACROS.some(k=>!reasonable(e.per100[k],1000)))return null;
 return {id:e.id,name:e.name,category:safe(e.category,100)?e.category:'Other',
  aliases:typeof e.aliases==='string'?e.aliases.slice(0,350):'',
  per100:Object.fromEntries(MACROS.map(k=>[k,e.per100[k]])),
  defaultGrams:e.defaultGrams,source:safe(e.source,130)?e.source:'Recomp online estimate',
  type:'estimated',online:true};
}
function workoutEntry(e){
 if(!e||!safe(e.id,90)||!safe(e.name,130)||!Array.isArray(e.items)||e.items.length>100)return null;
 const items=e.items.map(item=>{
  if(!Array.isArray(item)||item.length<7||item.length>16||!safe(item[0],100)||!safe(item[1],130)||
     !reasonable(item[2],100)||!reasonable(item[3],500)||!Array.isArray(item[6]))return null;
  // Preserve Recomp's complete tuple, including giant-set metadata and coach notes.
  // JSON from the API is already inert data; it never becomes executable code.
  return item;
 });
 if(items.some(x=>!x))return null;
 return {id:e.id,name:e.name,subtitle:safe(e.subtitle,160)?e.subtitle:'Online catalogue',
  items,source:'Recomp online catalogue'};
}
function exerciseEntry(e){
 if(!e||!safe(e.id,100)||!safe(e.name,130))return null;
 return {id:e.id,name:e.name,muscleGroup:typeof e.muscleGroup==='string'?e.muscleGroup.slice(0,100):'',
  equipment:typeof e.equipment==='string'?e.equipment.slice(0,100):'',
  guidance:typeof e.guidance==='string'?e.guidance.slice(0,800):''};
}
export function validateOnlineCatalogue(data){
 if(!data||data.version!==1||!Array.isArray(data.foods)||!Array.isArray(data.workouts)||!Array.isArray(data.exercises))
  throw Error('The online catalogue returned an unsupported format.');
 if(data.foods.length>1500||data.workouts.length>120||data.exercises.length>600)
  throw Error('The online catalogue is unexpectedly large.');
 function clean(rows,fn){
  const result=new Map();
  for(const entry of rows){const parsed=fn(entry);if(parsed)result.set(parsed.id,parsed);}
  return [...result.values()];
 }
 return {version:1,updatedAt:typeof data.updatedAt==='string'?data.updatedAt.slice(0,35):null,
  foods:clean(data.foods,foodEntry),workouts:clean(data.workouts,workoutEntry),
  exercises:clean(data.exercises,exerciseEntry)};
}
export async function loadCachedOnlineCatalogue(read=get){
 try{
  const record=await read(KEY);
  return record?.url===ONLINE_CATALOGUE_URL?validateOnlineCatalogue(record.data):null;
 }catch{return null;}
}
export async function refreshOnlineCatalogue({fetchImpl=fetch,write=put}={}){
 const controller=new AbortController();
 const timer=setTimeout(()=>controller.abort(),12000);
 let data;
 try{
  const response=await fetchImpl(ONLINE_CATALOGUE_URL,{
   method:'GET',credentials:'omit',cache:'no-store',headers:{Accept:'application/json'},signal:controller.signal
  });
  if(!response.ok)throw Error('Catalogue service returned HTTP '+response.status+'.');
  const length=Number(response.headers.get('Content-Length'));
  if(Number.isFinite(length)&&length>LIMIT)throw Error('Catalogue download exceeded the safety limit.');
  const body=await response.text();
  if(body.length>LIMIT)throw Error('Catalogue download exceeded the safety limit.');
  data=validateOnlineCatalogue(JSON.parse(body));
 }catch(error){
  if(error?.name==='AbortError')throw Error('Catalogue request timed out; saved foods remain available.');
  throw error;
 }finally{clearTimeout(timer);}
 // Cache only the published shared catalogue. Never store user records in it.
 try{await write(KEY,{url:ONLINE_CATALOGUE_URL,data,savedAt:Date.now()});}catch{}
 return data;
}
