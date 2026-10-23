// Recomp public-content Worker. D1 contains reference food and workout data ONLY.
// Personal diaries, progress photos, workout history and authentication never go here.
const ORIGIN='https://t3ch-miner.github.io';
const TABLE={foods:'catalog_foods',workouts:'catalog_workouts'};
const ID=/^[a-z0-9][a-z0-9._-]{1,79}$/i;
const MACROS=['calories','protein','carbs','fat','fibre'];
const BODY_LIMIT=64000;
const json=(body,status=200,headers={})=>new Response(JSON.stringify(body),{status,headers:{
 'Content-Type':'application/json; charset=utf-8','X-Content-Type-Options':'nosniff',...headers
}});
function cors(origin){
 return origin===ORIGIN?{'Access-Control-Allow-Origin':ORIGIN,'Vary':'Origin'}:{};
}
function validate(item,type){
 if(!item||typeof item!=='object'||Array.isArray(item))throw Error('Enter a JSON object.');
 if(typeof item.id!=='string'||!ID.test(item.id))throw Error('Invalid item ID (2–80 letters/numbers/dashes).');
 if(typeof item.name!=='string'||item.name.trim().length<2||item.name.length>120)throw Error('Enter a name (2–120 characters).');
 if(type==='foods'){
  if(typeof item.category!=='string'||!item.category.trim()||item.category.length>80)throw Error('Enter a food category.');
  if(!item.per100||typeof item.per100!=='object'||Array.isArray(item.per100))throw Error('Enter a per100 nutrition object.');
  const nutrition={};
  for(const key of MACROS){
   const value=item.per100[key];
   if(typeof value!=='number'||!Number.isFinite(value)||value<0||value>(key==='calories'?1200:120))throw Error('Invalid per100 '+key+'.');
   nutrition[key]=Math.round(value*10)/10;
  }
  const serving=Number(item.defaultGrams);
  if(!Number.isFinite(serving)||serving<1||serving>5000)throw Error('Enter a serving weight between 1 and 5000 g.');
  const aliases=item.aliases??[];
  if(!Array.isArray(aliases)||aliases.length>20||aliases.some(v=>typeof v!=='string'||v.length>80))throw Error('Invalid aliases.');
  const ingredients=item.ingredients??[];
  if(!Array.isArray(ingredients)||ingredients.length>60)throw Error('Invalid ingredients.');
  return {id:item.id,name:item.name.trim(),aliases,category:item.category.trim(),
   per100:nutrition,defaultGrams:serving,
   ingredients,yieldGrams:Number.isFinite(item.yieldGrams)?item.yieldGrams:serving,
   source:String(item.source||'Recomp community estimate').slice(0,120),type:'estimated'};
 }
 if(type==='workouts'){
  if(!Array.isArray(item.items)||item.items.length<1||item.items.length>80)throw Error('Workout needs 1–80 exercises.');
  // Preserve current Recomp's versioned workout tuple format; reject malformed data.
  for(const entry of item.items){
   if(!Array.isArray(entry)||entry.length<6||entry.length>15||
      typeof entry[0]!=='string'||typeof entry[1]!=='string'||
      entry[0].length>100||entry[1].length>120||
      !Number.isFinite(Number(entry[2]))||Number(entry[2])<1||Number(entry[2])>30)
    throw Error('Workout contains an invalid exercise tuple.');
  }
  return {id:item.id,name:item.name.trim(),subtitle:String(item.subtitle||'').slice(0,140),
   notes:String(item.notes||'').slice(0,2000),items:item.items};
 }
 throw Error('Unknown catalogue type.');
}
async function catalog(db){
 const [v,foods,workouts]=await Promise.all([
  db.prepare("SELECT value FROM catalog_meta WHERE key='version'").first(),
  db.prepare('SELECT payload_json FROM catalog_foods WHERE active=1 ORDER BY id LIMIT 2001').all(),
  db.prepare('SELECT payload_json FROM catalog_workouts WHERE active=1 ORDER BY id LIMIT 201').all()
 ]);
 if(foods.results.length>2000||workouts.results.length>200)throw Error('Catalogue limit reached.');
 return {version:Number(v?.value||1),updatedAt:'versioned',foods:foods.results.map(r=>JSON.parse(r.payload_json)),
  workouts:workouts.results.map(r=>JSON.parse(r.payload_json))};
}
async function adminWrite(request,env,type,id,action){
 if(!env?.CATALOG_ADMIN_TOKEN||env.CATALOG_ADMIN_TOKEN.length<24)
  return json({error:'Admin secret has not been configured.'},503,{'Cache-Control':'no-store'});
 if(request.headers.get('Authorization')!=='Bearer '+env.CATALOG_ADMIN_TOKEN)
  return json({error:'Incorrect admin access token.'},401,{'Cache-Control':'no-store'});
 if(!ID.test(id))return json({error:'Invalid item ID.'},400);
 const table=TABLE[type];if(!table)return json({error:'Unknown type.'},404);
 if(action==='DELETE'){
  const result=await env.DB.batch([
   env.DB.prepare('UPDATE '+table+' SET active=0,updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(id),
   env.DB.prepare("UPDATE catalog_meta SET value=value+1 WHERE key='version'")
  ]);
  return json({ok:true,id,deleted:result[0]?.meta?.changes>0},200,{'Cache-Control':'no-store'});
 }
 if(action!=='PUT')return json({error:'Unsupported method.'},405);
 const raw=await request.text();
 if(raw.length>BODY_LIMIT)return json({error:'Item too large.'},413);
 let body;try{body=JSON.parse(raw);}catch{return json({error:'Invalid JSON.'},400);}
 if(body.id!==id)return json({error:'Record ID does not match URL.'},400);
 let entry;try{entry=validate(body,type);}catch(e){return json({error:e.message},400);}
 await env.DB.batch([
  env.DB.prepare('INSERT INTO '+table+' (id,payload_json,active,updated_at) VALUES(?,?,1,CURRENT_TIMESTAMP) ON CONFLICT(id) DO UPDATE SET payload_json=excluded.payload_json,active=1,updated_at=CURRENT_TIMESTAMP')
   .bind(id,JSON.stringify(entry)),
  env.DB.prepare("UPDATE catalog_meta SET value=value+1 WHERE key='version'")
 ]);
 return json({ok:true,id},200,{'Cache-Control':'no-store'});
}
export async function handleCatalog(request,env){
 const url=new URL(request.url),path=url.pathname,origin=request.headers.get('Origin')||'';
 if(path==='/health'&&request.method==='GET')return json({service:'Recomp public catalogue',ready:Boolean(env?.DB)});
 if(path==='/admin'&&request.method==='GET'){
  return new Response(ADMIN_HTML,{headers:{
   'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store',
   'X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY',
   'Content-Security-Policy':"default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; base-uri 'none'; form-action 'none'"
  }});
 }
 if(path==='/v1/catalog'&&request.method==='OPTIONS'){
  return new Response(null,{status:204,headers:{...cors(origin),
   'Access-Control-Allow-Methods':'GET, OPTIONS',
   'Access-Control-Allow-Headers':'Content-Type, If-None-Match','Access-Control-Max-Age':'600'}});
 }
 if(!env?.DB)return json({error:'D1 catalogue binding missing.'},503,cors(origin));
 if(path==='/v1/catalog'&&request.method==='GET'){
  try{
   const data=await catalog(env.DB),etag='W/"recomp-catalog-'+data.version+'"';
   const headers={...cors(origin),ETag:etag,'Cache-Control':'public,max-age=300'};
   if(request.headers.get('If-None-Match')===etag)return new Response(null,{status:304,headers});
   return json(data,200,headers);
  }catch{return json({error:'Catalogue temporarily unavailable.'},503,cors(origin));}
 }
 const match=path.match(/^\/v1\/admin\/(foods|workouts)\/([a-zA-Z0-9._-]+)$/);
 if(match){
  if(!['PUT','DELETE'].includes(request.method))return json({error:'Method not allowed.'},405);
  if(origin&&origin!==url.origin)return json({error:'Admin requests must be same-origin.'},403);
  return adminWrite(request,env,match[1],match[2],request.method);
 }
 return json({error:'Not found.'},404,cors(origin));
}
// Static admin UI is only an editing convenience. Admin secrets never ship with the app.
import {ADMIN_HTML} from './admin.js';
export default {fetch:handleCatalog};
