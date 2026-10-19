// Recomp recipe book and weekly batch-cooking planner.
// Data lives in the existing app state, so device backups and cloud snapshots include it.
const defaultExclusions = 'tomato, citrus, coffee, tofu, soya';
const days = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
const e = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const id = () => crypto.randomUUID?.() || 'recipe-' + Date.now() + '-' + Math.random().toString(36).slice(2);
const localISO = d => d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
const dateAt = value => new Date(value + 'T12:00:00');
export function monday(value) { const d = typeof value === 'string' ? dateAt(value) : new Date(value); d.setHours(12,0,0,0); d.setDate(d.getDate() - ((d.getDay()+6)%7)); return localISO(d); }
export function addDays(value,count) { const d=dateAt(value);d.setDate(d.getDate()+count);return localISO(d); }
const shortDate = value => dateAt(value).toLocaleDateString('en-GB',{day:'numeric',month:'short'});
const SEEDS = [
 {name:'Chicken vegetable pulao',base:'Rice',mins:35,ingredients:'700 g chicken breast\n260 g dry rice\n350 g carrots\n300 g courgette\n15 g cooking oil\n10 g ginger',steps:'Rinse rice. Gently fry grated ginger and cumin in oil, then add chicken and chopped vegetables. Add rice and water, cover and simmer until the rice and chicken are cooked. Portion into four containers and cool lunch servings promptly.',kcal:2100,protein:187,carbs:260,fat:40,fibre:17},
 {name:'Chicken vegetable pasta',base:'Pasta',mins:30,ingredients:'700 g chicken breast\n260 g dry pasta\n400 g carrots\n300 g courgette\n15 g cooking oil\n10 g ginger',steps:'Boil pasta separately. Cook the chicken through with ginger and a little oil. Simmer carrot and courgette until soft, then blend part with cooking water to make a tomato-free sauce. Combine and portion into four servings.',kcal:2090,protein:191,carbs:260,fat:42,fibre:25},
 {name:'Moong dal palak, eggs and chapati',base:'Chapati',mins:35,ingredients:'220 g dry yellow moong dal\n8 pcs eggs\n400 g spinach\n8 pcs whole-wheat tortillas\n15 g cooking oil\n10 g ginger',steps:'Simmer moong dal until very soft, then add spinach, ginger and cumin. Boil the eggs until fully cooked and heat the chapatis. Divide dal and eggs with chapatis into dinner and next-day lunch portions.',kcal:2540,protein:141,carbs:330,fat:86,fibre:34},
 {name:'Mild coconut fish curry and rice',base:'Rice',mins:30,ingredients:'700 g white fish\n260 g dry rice\n50 g grated coconut\n350 g courgette\n250 g carrots\n15 g cooking oil\n10 g ginger',steps:'Cook rice. Simmer finely chopped vegetables with ginger, cumin, water and grated coconut. Add fish and cook through until opaque and flaky. Serve with rice, refrigerating lunch portions promptly.',kcal:1900,protein:152,carbs:260,fat:52,fibre:16},
 {name:'Tomato-free palak paneer and chapati',base:'Chapati',mins:30,ingredients:'500 g paneer\n450 g spinach\n8 pcs whole-wheat tortillas\n15 g cooking oil\n10 g ginger',steps:'Wilt spinach with ginger, cumin and a little water, then blend for a smooth tomato-free sauce. Stir in cubed paneer and warm through. Serve with heated chapatis.',kcal:2590,protein:132,carbs:235,fat:160,fibre:27},
 {name:'Air-fryer chicken and chapati',base:'Chapati',mins:40,ingredients:'700 g chicken breast\n8 pcs whole-wheat tortillas\n600 g frozen wok vegetables\n15 g cooking oil\n10 g ginger',steps:'Coat chicken lightly with oil, ginger and mild spices. Air-fry in batches until its centre reaches 74°C. Cook frozen vegetables thoroughly in a pan and warm the chapatis. Check the vegetable pack for onion or any other personal trigger.',kcal:2070,protein:195,carbs:250,fat:66,fibre:26},
 {name:'Masoor dal rice with eggs',base:'Rice',mins:35,ingredients:'200 g dry masoor dal\n220 g dry rice\n8 pcs eggs\n350 g carrots\n250 g courgette\n15 g cooking oil',steps:'Cook rice and red lentils with chopped vegetables, cumin and turmeric until very soft. Boil eggs until cooked. Divide between dinner and next-day lunch, cooling the rice quickly.',kcal:2100,protein:128,carbs:350,fat:55,fibre:32}
];
const units=['g','kg','ml','l','pcs','tbsp','tsp'];
export function parseIngredients(input) {
 const lines=String(input||'').split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
 if(!lines.length || lines.length>60) throw new Error('Add 1–60 ingredient lines.');
 return lines.map((line,i)=>{
  const m=line.match(/^(\d+(?:[.,]\d+)?)\s*(kg|g|ml|l|pcs|tbsp|tsp)\s+(.+)$/i);
  if(!m)throw new Error('Ingredient line '+(i+1)+': use "700 g chicken" or "8 pcs eggs".');
  const amount=Number(m[1].replace(',','.')),unit=m[2].toLowerCase(),name=m[3].trim().slice(0,90);
  if(!Number.isFinite(amount)||amount<=0||amount>100000||!name)throw new Error('Check ingredient line '+(i+1)+'.');
  return {name,amount,unit};
 });
}
const ingredientLines = ingredients => ingredients.map(x=>x.amount+' '+x.unit+' '+x.name).join('\n');
function starter() {
 const recipes=SEEDS.map((s,i)=>({id:'starter-'+(i+1),name:s.name,base:s.base,mins:s.mins,ingredients:parseIngredients(s.ingredients),steps:s.steps,kcal:s.kcal,protein:s.protein,carbs:s.carbs,fat:s.fat,fibre:s.fibre}));
 const now=monday(new Date());
 return {recipes,weeks:{[now]:recipes.map(x=>x.id)},stock:{},exclusions:defaultExclusions,rahulShare:57,diaryPerson:'Rahul'};
}
function ensure(state) {
 if(!state.recipePlanner||typeof state.recipePlanner!=='object')state.recipePlanner=starter();
 const p=state.recipePlanner;
 if(!Array.isArray(p.recipes))p.recipes=[];
 if(!p.weeks||typeof p.weeks!=='object')p.weeks={};
 if(!p.stock||typeof p.stock!=='object')p.stock={};
 if(typeof p.exclusions!=='string')p.exclusions=defaultExclusions;
 if(!Number.isFinite(p.rahulShare))p.rahulShare=57;
 if(!['Rahul','Nivedita'].includes(p.diaryPerson))p.diaryPerson='Rahul';
 return p;
}
const normal = text => String(text||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
function excludedTokens(text) {
 return text.split(',').map(x=>normal(x)).filter(Boolean).flatMap(x=>x==='citrus'?['citrus','citric','lemon','lime','orange','grapefruit']:
 x==='soya'||x==='soy'?['soy','soya','tofu','soybean']: [x]);
}
export function avoidedIngredients(recipe,exclusions) {
 const tokens=excludedTokens(exclusions);
 return recipe.ingredients.filter(item=>{
  const name=' '+normal(item.name)+' ';
  return tokens.some(token=>name.includes(' '+token+' ')||name.includes(' '+token+'s ')||name.includes(' '+token+'es '));
 }).map(x=>x.name);
}
const recipeById=(p,idValue)=>p.recipes.find(x=>x.id===idValue);
export function groceryItems(p,week) {
 const totals=new Map();
 for(const key of p.weeks[week]||[]) {
  const recipe=recipeById(p,key);
  if(!recipe)continue;
  for(const item of recipe.ingredients) {
   const unit=item.unit==='kg'?'g':item.unit==='l'?'ml':item.unit;
   const amount=item.amount*(item.unit==='kg'||item.unit==='l'?1000:1);
   const name=normal(item.name), k=name+'|'+unit;
   const prev=totals.get(k);
   if(prev)prev.amount+=amount;else totals.set(k,{name:item.name,unit,amount});
  }
 }
 return [...totals.values()].sort((a,b)=>a.name.localeCompare(b.name));
}
const stockKey=(item)=>normal(item.name)+'|'+item.unit;
const amountText = v => Number.isInteger(v)?String(v):v.toFixed(1).replace(/\.0$/,'');
const shoppingText=(p,week)=>{
 const skipped=p.stock[week]||[];
 return 'Recomp groceries · '+shortDate(week)+'–'+shortDate(addDays(week,6))+'\n'+groceryItems(p,week).filter(item=>!skipped.includes(stockKey(item))).map(i=>'☐ '+amountText(i.amount)+' '+i.unit+' '+i.name).join('\n')+'\n\nQuantities cover all planned four-serving dinner batches. Check what is already at home.';
};
const completeNutrition=r=>['kcal','protein','carbs','fat','fibre'].every(k=>Number.isFinite(r[k])&&r[k]>=0)&&r.kcal>0&&r.protein>0;
const estimate=(r,p,person)=>{
 const share=person==='Rahul'?p.rahulShare/100:(100-p.rahulShare)/100;
 return Object.fromEntries(['kcal','protein','carbs','fat','fibre'].map(k=>[k,k==='kcal'?Math.round(r[k]*share/2):Math.round(r[k]*share/2*10)/10]));
};
export function openMealPlanner({state,save,log,notify}) {
 const p=ensure(state);
 let week=monday(new Date()),view='week',editing=null,showAvoided=false,query='',message='';
 const overlay=document.createElement('div');overlay.className='mp-overlay';
 overlay.setAttribute('role','presentation');document.body.appendChild(overlay);
 const focusBefore=document.activeElement;
 function close(){document.removeEventListener('keydown',keys);overlay.remove();focusBefore?.focus?.();}
 function keys(event){if(event.key==='Escape'){event.preventDefault();close();}}
 document.addEventListener('keydown',keys);
 const button=(action,label,props='')=>'<button type="button" '+(props.includes('class=')?props:'class="mp-button" '+props)+' data-mp="'+action+'">'+label+'</button>';
 const activePlan=()=>p.weeks[week]||Array(7).fill('');
 const card=r=>'<article class="mp-card"><div class="mp-between"><div><b>'+e(r.name)+'</b><div class="mp-muted">'+e(r.base)+' · '+Number(r.mins||30)+' min · 4 servings</div></div><div class="mp-actions">'+button('edit','Edit','data-id="'+e(r.id)+'"')+button('remove','Delete','data-id="'+e(r.id)+'"')+'</div></div><div class="mp-muted">'+r.ingredients.length+' ingredients'+(r.kcal?' · approx. '+r.kcal+' kcal per batch':'')+'</div>'+(avoidedIngredients(r,p.exclusions).length?'<div class="mp-alert">Contains: '+e(avoidedIngredients(r,p.exclusions).join(', '))+'</div>':'')+'</article>';
 function weekView(){
  const plan=activePlan();
  const previous=p.weeks[addDays(week,-7)]||[];
  return '<div class="mp-between"><div><h2>Evening meal plan</h2><p class="mp-muted">Week of '+shortDate(week)+' · Make four servings every evening.</p></div><div class="mp-actions">'+button('previous','← Previous')+button('next','Next →')+'</div></div>'+
  '<p class="mp-note">Dinner tonight becomes lunch tomorrow. Each batch makes Rahul’s and Nivedita’s dinners plus their lunches the next day. Only one person’s meals should be logged to a single food diary.</p>'+
  '<div class="mp-actions">'+button('copy-week','Use previous week')+button('clear-week','Clear this week')+'</div>'+
  days.map((day,i)=>{
   const chosen=recipeById(p,plan[i]);const lunch=recipeById(p,i===0?previous[6]:plan[i-1]);
   const options=p.recipes.filter(r=>showAvoided||!avoidedIngredients(r,p.exclusions).length||r.id===plan[i])
    .map(r=>'<option value="'+e(r.id)+'" '+(r.id===plan[i]?'selected':'')+'>'+e(r.name)+(avoidedIngredients(r,p.exclusions).length?' ⚠':'')+'</option>').join('');
   const date=addDays(week,i);
   const key=week+'-'+i+'-'+p.diaryPerson,logged=state.food.some(f=>f.plannerKey===key);
   const servings=chosen&&completeNutrition(chosen)?estimate(chosen,p,p.diaryPerson):null;
   return '<article class="mp-card"><div class="mp-between"><b>'+day+' · '+shortDate(date)+'</b><span class="mp-muted">Dinner + next lunch</span></div>'+
    '<label class="mp-field">Cook dinner <select data-mp-select="assign" data-day="'+i+'"><option value="">Choose a recipe</option>'+options+'</select></label>'+
    '<p class="mp-muted">Lunch: '+(lunch?e(lunch.name):'Not planned (previous dinner missing)')+'</p>'+
    (chosen?'<div class="mp-between"><span>'+e(chosen.base)+' · '+Number(chosen.mins||30)+' minutes'+(servings?' · ~'+servings.kcal+' kcal / '+servings.protein+' g protein per '+p.diaryPerson+' meal':'')+'</span>'+button('details','Recipe','data-id="'+e(chosen.id)+'"')+'</div>':'')+
    (chosen&&avoidedIngredients(chosen,p.exclusions).length?'<p class="mp-alert">Contains avoided ingredient: '+e(avoidedIngredients(chosen,p.exclusions).join(', '))+'</p>':'')+
    (chosen&&servings?button('log-batch',logged?'Already logged':'Log dinner + tomorrow’s lunch','data-day="'+i+'" '+(logged?'disabled':'')):'')+
    '</article>';
  }).join('')+
  '<label class="mp-check"><input type="checkbox" id="mp-show-avoided" '+(showAvoided?'checked':'')+'> Show recipes containing avoided ingredients in the dinner choices</label>';
 }
 function recipesView(){
  const visible=p.recipes.filter(r=>(showAvoided||!avoidedIngredients(r,p.exclusions).length)&&r.name.toLowerCase().includes(query.toLowerCase()));
  return '<div class="mp-between"><div><h2>Recipe book</h2><p class="mp-muted">'+p.recipes.length+' saved recipes. Edit ingredients and step-by-step cooking methods.</p></div>'+button('new','+ Add recipe')+'</div>'+
  '<label class="mp-field">Find a recipe <input type="search" id="mp-search" placeholder="Search chicken, paneer, dal…" value="'+e(query)+'"></label>'+
  '<label class="mp-check"><input type="checkbox" id="mp-show-avoided" '+(showAvoided?'checked':'')+'> Show recipes with avoided ingredients</label>'+
  (visible.length?visible.map(card).join(''):'<div class="mp-card">No matching recipes. Remove a filter or add your own.</div>');
 }
 function detailView(r){
  if(!r)return '<div class="mp-card">Recipe not found.</div>';
  return '<div class="mp-actions">'+button('back','← Back')+button('edit','Edit recipe','data-id="'+e(r.id)+'"')+'</div>'+
  '<h2>'+e(r.name)+'</h2><p class="mp-muted">'+e(r.base)+' · '+r.mins+' min · Makes four servings (dinner for two, lunch for two)</p>'+
  (avoidedIngredients(r,p.exclusions).length?'<p class="mp-alert">Avoided ingredients: '+e(avoidedIngredients(r,p.exclusions).join(', '))+'</p>':'')+
  '<div class="mp-card"><h3>Ingredients for four servings</h3><ul>'+r.ingredients.map(i=>'<li>'+amountText(i.amount)+' '+e(i.unit)+' '+e(i.name)+'</li>').join('')+'</ul>'+
  '<h3>Method</h3><p class="mp-method">'+e(r.steps||'No cooking method recorded yet.')+'</p>'+
  '<p class="mp-muted">Illustrative batch estimate: '+(completeNutrition(r)?Math.round(r.kcal)+' kcal, '+Number(r.protein)+' g protein, '+Number(r.carbs)+' g carbs, '+Number(r.fat)+' g fat, '+Number(r.fibre)+' g fibre':'Incomplete / not entered')+'. Check brands, oil and actual cooking yields.</p></div>';
 }
 function editorView(){
  const r=editing?recipeById(p,editing):null;
  const item=r||{name:'',base:'Rice',mins:30,ingredients:[],steps:'',kcal:'',protein:'',carbs:'',fat:'',fibre:''};
  return '<div class="mp-actions">'+button('back','← Recipes')+'</div><h2>'+(r?'Edit recipe':'New recipe')+'</h2>'+
  '<form id="mp-form" class="mp-card">'+
  '<label class="mp-field">Recipe name<input name="name" required maxlength="90" value="'+e(item.name)+'"></label>'+
  '<div class="mp-two"><label class="mp-field">Main carbohydrate<select name="base">'+['Rice','Chapati','Pasta','Other'].map(x=>'<option '+(x===item.base?'selected':'')+'>'+x+'</option>').join('')+'</select></label>'+
  '<label class="mp-field">Cooking minutes<input name="mins" type="number" min="5" max="240" required value="'+e(item.mins)+'"></label></div>'+
  '<label class="mp-field">Ingredients for four servings<textarea name="ingredients" rows="9" required placeholder="700 g chicken breast&#10;260 g dry rice&#10;300 g carrots">'+e(ingredientLines(item.ingredients))+'</textarea><small>One per line, such as “700 g chicken breast” or “8 pcs eggs”. Units: '+units.join(', ')+'.</small></label>'+
  '<label class="mp-field">Cooking instructions<textarea name="steps" rows="7" required maxlength="4000" placeholder="Describe your steps, air fryer timings and storage advice.">'+e(item.steps)+'</textarea></label>'+
  '<div class="mp-two"><label class="mp-field">Estimated kcal per full batch (optional)<input name="kcal" type="number" min="0" max="25000" step="1" value="'+e(item.kcal)+'"></label>'+
  '<label class="mp-field">Estimated protein per full batch, g (optional)<input name="protein" type="number" min="0" max="1500" step="0.1" value="'+e(item.protein)+'"></label></div>'+
  '<div class="mp-three"><label class="mp-field">Batch carbs (g)<input name="carbs" type="number" min="0" max="5000" step="0.1" value="'+e(item.carbs??'')+'"></label><label class="mp-field">Batch fat (g)<input name="fat" type="number" min="0" max="3000" step="0.1" value="'+e(item.fat??'')+'"></label><label class="mp-field">Batch fibre (g)<input name="fibre" type="number" min="0" max="1000" step="0.1" value="'+e(item.fibre??'')+'"></label></div>'+ '<p class="mp-muted">All nutrition figures are optional, manually estimated totals for the entire four-serving batch. Fill all five fields to enable diary logging.</p>'+
  '<button class="mp-button mp-primary" type="submit">Save recipe</button></form>';
 }
 function groceriesView(){
  const items=groceryItems(p,week),skip=p.stock[week]||[];
  return '<div class="mp-between"><div><h2>Grocery list</h2><p class="mp-muted">'+shortDate(week)+'–'+shortDate(addDays(week,6))+' · All planned dinner ingredients summed</p></div>'+button('copy-groceries','Copy list')+'</div>'+
  '<p class="mp-note">Tick ingredients you already have, such as rice, lentils and frozen vegetables. The copied list excludes ticked items.</p>'+
  (items.length?items.map(item=>'<label class="mp-grocery"><input type="checkbox" data-mp-stock="'+e(stockKey(item))+'" '+(skip.includes(stockKey(item))?'checked':'')+'><span>'+e(item.name)+'</span><b>'+amountText(item.amount)+' '+e(item.unit)+'</b></label>').join(''):'<div class="mp-card">Plan some dinners to generate your groceries.</div>')+
  '<p class="mp-muted">'+items.filter(i=>!skip.includes(stockKey(i))).length+' items still to buy. Shop twice weekly if your fridge is small.</p>';
 }
 function settingsView(){
  return '<h2>Household preferences</h2><form id="mp-preferences" class="mp-card">'+
  '<label class="mp-field">Ingredients to avoid (comma-separated)<input name="avoid" value="'+e(p.exclusions)+'"></label>'+
  '<p class="mp-muted">“Citrus” also flags lemon, lime and orange. “Soya” also flags soy and tofu. We never automatically assume a recipe is safe for a medical condition.</p>'+
  '<label class="mp-field">Rahul’s share of each two-person dinner, % <input name="share" type="number" min="40" max="70" required value="'+p.rahulShare+'"></label>'+
  '<p class="mp-muted">Nivedita receives the remainder. The same shares are used for next-day lunch, giving four portions from every batch.</p>'+
  '<label class="mp-field">Whose diary is this?<select name="person">'+['Rahul','Nivedita'].map(x=>'<option '+(p.diaryPerson===x?'selected':'')+'>'+x+'</option>').join('')+'</select></label>'+
  '<p class="mp-alert">Recomp has one food diary. Changing this setting does not create a second profile or separate earlier food logs.</p>'+
  '<button class="mp-button mp-primary" type="submit">Save preferences</button></form>';
 }
 function render() {
  const scroll=overlay.querySelector('.mp-body')?.scrollTop||0;
  overlay.innerHTML='<section class="mp-sheet" role="dialog" aria-modal="true" aria-label="Recipe book and weekly meal planner">'+
   '<header class="mp-header"><div><strong>Recipes & weekly plan</strong><small>Recomp · Dinner today, lunch tomorrow</small></div>'+button('close','Close ×')+'</header>'+
   '<nav class="mp-tabs" aria-label="Meal planner sections">'+[['week','Week'],['recipes','Recipes'],['groceries','Groceries'],['settings','Preferences']].map(([key,label])=>button('tab',label,'data-view="'+key+'" class="mp-button '+(view===key?'mp-active':'')+'"')).join('')+'</nav>'+
   '<div class="mp-body">'+(message?'<p role="status" class="mp-message">'+e(message)+'</p>':'')+
   (view==='week'?weekView():view==='recipes'?recipesView():view==='groceries'?groceriesView():view==='settings'?settingsView():view==='detail'?detailView(recipeById(p,editing)):editorView())+
   '</div></section>';
  overlay.querySelector('.mp-body').scrollTop=scroll;
 }
 async function persist(messageText='Saved') {await save();message=messageText;render();notify?.(messageText);}
 async function action(element) {
  const kind=element.dataset.mp;
  if(kind==='close'){close();return;}
  if(kind==='tab'){view=element.dataset.view;editing=null;message='';render();return;}
  if(kind==='previous'||kind==='next'){week=addDays(week,kind==='next'?7:-7);message='';render();return;}
  if(kind==='back'){view=view==='detail'?'week':'recipes';editing=null;message='';render();return;}
  if(kind==='new'){view='editor';editing=null;message='';render();return;}
  if(kind==='edit'){view='editor';editing=element.dataset.id;message='';render();return;}
  if(kind==='details'){view='detail';editing=element.dataset.id;message='';render();return;}
  if(kind==='remove'){
   const rec=recipeById(p,element.dataset.id);
   if(rec&&confirm('Delete '+rec.name+'? It will be removed from all planned weeks.')) {
    p.recipes=p.recipes.filter(x=>x.id!==rec.id);
    for(const arr of Object.values(p.weeks))for(let i=0;i<arr.length;i++)if(arr[i]===rec.id)arr[i]='';
    await persist('Recipe removed');
   }
  }
  if(kind==='clear-week'&&confirm('Clear dinners for this week?')){p.weeks[week]=Array(7).fill('');await persist('Week cleared');}
  if(kind==='copy-week'){const old=p.weeks[addDays(week,-7)]||[];if(!old.some(Boolean)){message='No previous week to copy.';render();return;}p.weeks[week]=Array.from({length:7},(_,i)=>recipeById(p,old[i])?old[i]:'');await persist('Previous dinners copied');}
  if(kind==='copy-groceries'){
   const list=shoppingText(p,week);
   try{if(!navigator.clipboard?.writeText)throw new Error('Clipboard unavailable');await navigator.clipboard.writeText(list);message='Grocery list copied.';render();}
   catch{window.prompt('Copy your grocery list',list);}
  }
  if(kind==='log-batch'){
   const i=Number(element.dataset.day),recipe=recipeById(p,activePlan()[i]);
   if(!recipe||!completeNutrition(recipe))throw new Error('Enter complete batch nutrition before logging.');
   const key=week+'-'+i+'-'+p.diaryPerson;
   if(state.food.some(x=>x.plannerKey===key))throw new Error('Already logged. Delete the existing entries before logging again.');
   const amounts=estimate(recipe,p,p.diaryPerson),date=addDays(week,i);
   const entries=[{date,meal:'Dinner'},{date:addDays(date,1),meal:'Lunch'}].map(x=>({
    id:id(),name:recipe.name+' ('+p.diaryPerson+' portion)',date:x.date,meal:x.meal,
    calories:amounts.kcal,protein:amounts.protein,carbs:amounts.carbs,fat:amounts.fat,fibre:amounts.fibre,
    foodSource:'recomp-recipe-estimate',plannerKey:key,plannerPerson:p.diaryPerson
   }));
   await log(entries);message='Dinner and next-day lunch added for '+p.diaryPerson+'.';render();notify?.(message);
  }
 }
 overlay.addEventListener('click',async event=>{
  if(event.target===overlay){close();return;}
  const btn=event.target.closest('[data-mp]');
  if(!btn)return;
  event.preventDefault();
  try{await action(btn);}catch(err){message=err.message||'Unable to complete the action.';render();}
 });
 overlay.addEventListener('change',async event=>{
  const target=event.target;
  try{
   if(target.id==='mp-show-avoided'){showAvoided=target.checked;render();}
   if(target.dataset.mpSelect==='assign'){
    const i=Number(target.dataset.day),rid=target.value,rec=recipeById(p,rid);
    if(rec&&avoidedIngredients(rec,p.exclusions).length&&!confirm('This recipe contains an avoided ingredient: '+avoidedIngredients(rec,p.exclusions).join(', ')+'. Plan it anyway?')){render();return;}
    if(!p.weeks[week])p.weeks[week]=Array(7).fill('');
    p.weeks[week][i]=rid;await persist('Dinner planned');
   }
   if(target.hasAttribute('data-mp-stock')) {
    const k=target.dataset.mpStock,stock=new Set(p.stock[week]||[]);
    if(target.checked)stock.add(k);else stock.delete(k);
    p.stock[week]=[...stock];await persist('Grocery list updated');
   }
  }catch(err){message=err.message;render();}
 });
 overlay.addEventListener('input',event=>{
  if(event.target.id==='mp-search'){query=event.target.value;const pos=event.target.selectionStart;render();const input=overlay.querySelector('#mp-search');input?.focus();input?.setSelectionRange(pos,pos);}
 });
 overlay.addEventListener('submit',async event=>{
  if(!['mp-form','mp-preferences'].includes(event.target.id))return;
  event.preventDefault();
  try{
   const form=event.target,d=new FormData(form);
   if(form.id==='mp-form'){
    const name=String(d.get('name')||'').trim().slice(0,90);
    const mins=Number(d.get('mins')),steps=String(d.get('steps')||'').trim().slice(0,4000);
    const macro={};for(const key of ['kcal','protein','carbs','fat','fibre'])macro[key]=d.get(key)===''?null:Number(d.get(key));
    if(!name||!steps||!(mins>=5&&mins<=240)||!Number.isFinite(mins))throw new Error('Check recipe name, cooking time and steps.');
    for(const [key,value] of Object.entries(macro))if(value!==null&&(!Number.isFinite(value)||value<0||value>(key==='kcal'?25000:5000)))throw new Error('Check batch '+key+'.');
    const ingredients=parseIngredients(d.get('ingredients'));
    const r=editing?recipeById(p,editing):null;
    const values={name,base:String(d.get('base')||'Other'),mins,steps,ingredients,...macro};
    if(r)Object.assign(r,values);else p.recipes.push({id:id(),...values});
    view='recipes';editing=null;await persist('Recipe saved');
   }else{
    const share=Number(d.get('share'));
    if(!Number.isFinite(share)||share<40||share>70)throw new Error('Rahul’s share must be between 40 and 70%.');
    p.exclusions=String(d.get('avoid')||'').slice(0,350);
    p.rahulShare=share;p.diaryPerson=d.get('person')==='Nivedita'?'Nivedita':'Rahul';
    await persist('Preferences saved');
   }
  }catch(err){message=err.message||'Please check the form.';render();}
 });
 render();
}
