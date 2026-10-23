export const ADMIN_HTML = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Recomp · Content Library Admin</title>
<style>
:root{color-scheme:dark;font:14px/1.5 Inter,system-ui,sans-serif;background:#080d0f;color:#f2f6f5}
*{box-sizing:border-box}body{margin:0;padding:24px 14px 80px}
main{max-width:920px;margin:auto}.top{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
h1{font-size:27px;letter-spacing:-.04em;margin:4px 0 8px}.subtitle{color:#97a7aa;margin:0 0 21px}
.card{background:#121a1e;border:1px solid #293a3b;border-radius:18px;padding:19px;margin-bottom:14px}
label{display:grid;gap:6px;font-size:12px;font-weight:720}
input,select,textarea{display:block;width:100%;min-height:40px;padding:10px 12px;background:#081113;border:1px solid #334746;border-radius:10px;color:#f3fcf8;font:inherit}
textarea{resize:vertical;min-height:155px;font:12px/1.6 ui-monospace,monospace}
form{display:grid;gap:13px}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
.grid.macros{grid-template-columns:repeat(3,minmax(0,1fr))}
.row{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
button{min-height:39px;border:1px solid #476d5f;border-radius:10px;background:#1d3430;color:#dbfff1;font:inherit;font-weight:750;padding:10px 14px;cursor:pointer}
button.primary{background:linear-gradient(125deg,#69eaba,#bbf069);color:#071a11;border:0}
button.danger{border-color:#82535a;color:#ffb8bc;background:#361e23}
button:disabled{opacity:.5;cursor:wait}small,.note{color:#99abaa;font-size:12px}p.note{margin:5px 0}
.status{border:1px solid #325b51;padding:12px 14px;border-radius:11px;white-space:pre-wrap;overflow-wrap:anywhere;margin:0}
.list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px;max-height:370px;overflow:auto}
.list button{text-align:left;font-size:12px;display:grid;gap:2px}
.hidden{display:none!important}
@media(max-width:580px){.grid,.grid.macros,.list{grid-template-columns:1fr 1fr}.card{padding:14px}h1{font-size:23px}}
</style></head><body><main>
<div class="top"><h1>Recomp · Library Admin</h1><span style="color:#6de8b8">Cloudflare D1</span></div>
<p class="subtitle">Edit public foods and workouts without publishing the app. Your diary, photos and personal training history are not stored here.</p>
<section class="card"><label>Private content-admin token (this tab only)
<input id="token" type="password" autocomplete="off" spellcheck="false" placeholder="Secret configured as CATALOG_ADMIN_TOKEN"></label>
<p class="note">Use a different long secret from your Hugging Face or photo scan codes. It is never saved to your browser or included in public catalogue responses.</p></section>
<div class="grid" style="align-items:start">
<section class="card">
<h2 style="font-size:17px;margin-top:0">Create or edit</h2>
<form id="form" autocomplete="off">
<label>Content type<select id="kind"><option value="foods">Food / recipe</option><option value="workouts">Workout template</option></select></label>
<label>Stable ID<input id="id" pattern="[A-Za-z0-9][A-Za-z0-9._-]{1,79}" maxlength="80" required placeholder="e.g. korean-rice-bowl"></label>
<label>Name<input id="name" maxlength="120" required placeholder="Dish or workout name"></label>
<div id="foodFields" style="display:grid;gap:12px">
<label>Category<input id="category" value="Main meal"></label>
<label>Default serving (grams)<input id="grams" type="number" value="350" min="1" max="5000"></label>
<label>Other names, comma separated<input id="aliases" placeholder="Korean bowl, bibimbap"></label>
<div class="grid macros">
<label>kcal/100g<input id="calories" type="number" min="0" max="1200" value="150" step="0.1"></label>
<label>Protein<input id="protein" type="number" min="0" max="120" value="10" step="0.1"></label>
<label>Carbs<input id="carbs" type="number" min="0" max="120" value="20" step="0.1"></label>
<label>Fat<input id="fat" type="number" min="0" max="120" value="5" step="0.1"></label>
<label>Fibre<input id="fibre" type="number" min="0" max="120" value="2" step="0.1"></label>
</div>
<p class="note">Nutrition values are estimates per 100 g, not measurements. Check labels and cooking methods.</p>
</div>
<div id="workoutFields" class="hidden" style="display:grid;gap:12px">
<label>Subtitle<input id="subtitle" placeholder="Full body · 6 exercises"></label>
<label>Instructions<textarea id="notes" style="min-height:80px"></textarea></label>
<label>Workout exercises (JSON array of Recomp tuples)<textarea id="items">[["goblet","Goblet Squat",3,10,0,90,[]]]</textarea></label>
<p class="note">Each exercise uses [id, name, sets, reps, weight, restSeconds, alternatives, ...]. Existing personal plans are never overwritten automatically.</p>
</div>
<div class="row"><button type="submit" class="primary">Save to online library</button><button id="reset" type="button">New entry</button></div>
<button id="remove" class="danger" type="button">Unpublish this entry</button>
</form></section>
<section class="card"><div class="row" style="justify-content:space-between"><h2 style="font-size:17px;margin:0">Published entries</h2><button id="refresh" type="button">Refresh</button></div>
<p class="note">Select an item to edit it. Deleting unpublishes it but does not erase anyone's saved diary.</p>
<div id="list" class="list"><span class="note">Load the published library to begin.</span></div></section>
</div>
<p id="status" class="status" role="status" aria-live="polite">Ready. Enter your private admin code to save or remove content.</p>
</main>
<script>
(function(){
 const $=id=>document.getElementById(id);
 let library={foods:[],workouts:[]};
 const status=message=>$('status').textContent=message;
 const setKind=()=>{$('foodFields').classList.toggle('hidden',$('kind').value!=='foods');$('workoutFields').classList.toggle('hidden',$('kind').value!=='workouts');};
 $('kind').addEventListener('change',setKind);
 const clear=()=>{$('form').reset();setKind();$('id').focus();};
 $('reset').addEventListener('click',clear);
 function putItem(item,kind){
  $('kind').value=kind;setKind();
  $('id').value=item.id;$('name').value=item.name;
  if(kind==='foods'){
   $('category').value=item.category||'Main meal';
   $('grams').value=item.defaultGrams||350;
   $('aliases').value=(item.aliases||[]).join(', ');
   for(const k of ['calories','protein','carbs','fat','fibre'])$(k).value=item.per100?.[k]??0;
  }else{
   $('subtitle').value=item.subtitle||'';
   $('notes').value=item.notes||'';
   $('items').value=JSON.stringify(item.items||[],null,2);
  }
  window.scrollTo({top:0,behavior:'smooth'});
 }
 function show(){
  const list=$('list');list.replaceChildren();
  for(const kind of ['foods','workouts']){
   for(const item of library[kind]||[]){
    const b=document.createElement('button');b.type='button';
    const title=document.createElement('strong');title.textContent=item.name;
    const detail=document.createElement('small');detail.textContent=kind+' · '+item.id;
    b.append(title,detail);b.addEventListener('click',()=>putItem(item,kind));
    list.append(b);
   }
  }
  if(!list.children.length)list.textContent='No published entries yet. Add your first food or workout.';
 }
 async function refresh(){
  try{
   const response=await fetch('/v1/catalog',{cache:'no-store'});
   const body=await response.json();
   if(!response.ok)throw Error(body.error||'Could not read catalogue');
   library=body;show();
   status('Online catalogue v'+body.version+': '+body.foods.length+' foods, '+body.workouts.length+' workouts.');
  }catch(err){status('Could not load catalogue: '+err.message);}
 }
 const endpoint=()=>'/v1/admin/'+$('kind').value+'/'+encodeURIComponent($('id').value.trim());
 async function write(method,body){
  const token=$('token').value;
  if(!token)throw Error('Enter your separate private catalogue admin token.');
  const response=await fetch(endpoint(),{
   method,headers:{'Authorization':'Bearer '+token,'Content-Type':'application/json'},
   body:body?JSON.stringify(body):undefined,cache:'no-store',credentials:'same-origin'
  });
  const data=await response.json();
  if(!response.ok)throw Error(data.error||'Update failed, HTTP '+response.status);
  return data;
 }
 $('form').addEventListener('submit',async e=>{
  e.preventDefault();
  const submit=$('form').querySelector('[type=submit]');submit.disabled=true;
  try{
   const kind=$('kind').value;
   const entry={id:$('id').value.trim(),name:$('name').value.trim()};
   if(kind==='foods'){
    entry.category=$('category').value.trim();
    entry.defaultGrams=Number($('grams').value);
    entry.aliases=$('aliases').value.split(',').map(x=>x.trim()).filter(Boolean);
    entry.per100=Object.fromEntries(['calories','protein','carbs','fat','fibre'].map(k=>[k,Number($(k).value)]));
   }else{
    entry.subtitle=$('subtitle').value;entry.notes=$('notes').value;
    entry.items=JSON.parse($('items').value);
   }
   await write('PUT',entry);status('Saved '+entry.name+'. Recomp can fetch the update without an app release.');
   await refresh();
  }catch(err){status('Could not save: '+err.message);}
  finally{submit.disabled=false;}
 });
 $('remove').addEventListener('click',async()=>{
  if(!$('id').value.trim()||!confirm('Unpublish this record from the online library?'))return;
  try{await write('DELETE');status('Entry unpublished. Existing diary records are unaffected.');clear();await refresh();}
  catch(err){status('Could not unpublish: '+err.message);}
 });
 $('refresh').addEventListener('click',refresh);
 refresh();
})();
</script></body></html>`;
