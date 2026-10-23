// Public read-only Recomp catalogue Worker. Edit rows in Cloudflare D1 dashboard.
// It never sees Hugging Face tokens or any user's diary, workouts or identity.
const ORIGIN='https://t3ch-miner.github.io';
const json=(data,status=200,origin='',cache='no-store')=>new Response(JSON.stringify(data),{
 status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':cache,
 'X-Content-Type-Options':'nosniff','Vary':'Origin',
 ...(origin===ORIGIN?{'Access-Control-Allow-Origin':ORIGIN}:{})}
});
const str=(value,max)=>String(value??'').slice(0,max);
const parseItems=(value)=>{try{return JSON.parse(value);}catch{return [];}};
export async function handleCatalogue(request,env){
 const url=new URL(request.url);
 const origin=request.headers.get('Origin')||'';
 if(request.method==='OPTIONS'){
  return new Response(null,{status:204,headers:{'Access-Control-Allow-Origin':origin===ORIGIN?ORIGIN:'null',
   'Access-Control-Allow-Methods':'GET, HEAD, OPTIONS','Access-Control-Allow-Headers':'Content-Type',
   'Access-Control-Max-Age':'86400','Vary':'Origin'}});
 }
 if(!['GET','HEAD'].includes(request.method))return json({error:'Read-only API.'},405,origin);
 if(url.pathname==='/health')return json({ok:true,database:!!env.CATALOGUE_DB},200,origin);
 if(url.pathname!=='/v1/catalogue')return json({error:'Not found.'},404,origin);
 if(!env.CATALOGUE_DB)return json({error:'Catalogue database is not connected.'},503,origin);
 if(origin&&origin!==ORIGIN)return json({error:'Origin not allowed.'},403,origin);
 try{
  const [f,w,e]=await Promise.all([
   env.CATALOGUE_DB.prepare('SELECT id,name,category,aliases,default_grams,calories,protein,carbs,fat,fibre,source,updated_at FROM foods WHERE active=1 ORDER BY name LIMIT 1500').all(),
   env.CATALOGUE_DB.prepare('SELECT id,name,subtitle,items_json,updated_at FROM workout_plans WHERE active=1 ORDER BY sort_order,name LIMIT 120').all(),
   env.CATALOGUE_DB.prepare('SELECT id,name,muscle_group,equipment,guidance,updated_at FROM exercises WHERE active=1 ORDER BY name LIMIT 600').all()
  ]);
  const foods=(f.results||[]).map(x=>({id:str(x.id,90),name:str(x.name,100),aliases:str(x.aliases,350),category:str(x.category,80),
   defaultGrams:x.default_grams,per100:{calories:x.calories,protein:x.protein,carbs:x.carbs,fat:x.fat,fibre:x.fibre},
   source:str(x.source,90)}));
  const workouts=(w.results||[]).map(x=>({id:str(x.id,90),name:str(x.name,100),subtitle:str(x.subtitle,140),items:parseItems(x.items_json)}));
  const exercises=(e.results||[]).map(x=>({id:str(x.id,90),name:str(x.name,100),muscleGroup:str(x.muscle_group,80),
   equipment:str(x.equipment,80),guidance:str(x.guidance,800)}));
  const stamps=[...(f.results||[]),...(w.results||[]),...(e.results||[])].map(x=>x.updated_at||'');
  const updatedAt=stamps.sort().at(-1)||null;
  return json({version:1,updatedAt,foods,workouts,exercises},200,origin,'public, max-age=300');
 }catch(err){return json({error:'Catalogue query failed. Check migrations and database binding.'},503,origin);}
}
export default {fetch:handleCatalogue};
