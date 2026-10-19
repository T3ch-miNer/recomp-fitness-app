import {INGREDIENT_REFERENCE} from './food-db.js';
// Optional approximate batch nutrition calculator. No AI or remote calls.
// Ingredient reference values are illustrative, not a nutrition-label database.
// Do not silently fill unknown items with zero.
const keys=['kcal','protein','carbs','fat','fibre'];
const normal=s=>String(s||'').toLowerCase().replace(/([a-z])([A-Z])/g,'$1 $2').replace(/[^a-z0-9]+/g,' ').trim();
const custom={
 'chicken breast':[120,22.5,0,2.6,0],
 'white fish':[82,18,0,1,0],
 'dry rice':[365,7.1,80,0.7,1.3],
 'dry pasta':[360,12,73,1.8,3],
 'dry yellow moong dal':[347,24,59,1.2,15],
 'dry masoor dal':[352,25,60,1.2,11],
 'whole wheat tortilla':[280,9,48,6,6],
 'whole wheat tortillas':[280,9,48,6,6],
 'frozen wok vegetables':[45,2,7,0.5,3],
 courgette:[17,1.2,3.1,0.3,1],
 ginger:[80,1.8,18,0.8,2],
 'unripe mango':[60,0.5,14,0.4,1.6]
};
const alias={
 'whole wheat flour atta':'atta','atta flour':'atta',
 'cooked rice':'riceCooked','cooked brown rice':'brownRiceCooked',
 'cooked toor dal':'toorDalCooked','cooked moong dal':'moongDalCooked','cooked masoor dal':'masoorDalCooked',
 'cooked chana dal':'chanaDalCooked','cooked chickpeas':'chanaCooked','cooked black chickpeas':'blackChanaCooked',
 'cooked kidney beans':'rajmaCooked','cooked urad dal':'uradDalCooked',
 'cooked whole moong':'wholeMoongCooked','cooked cowpeas':'cowpeasCooked',
 'sprouted green moong':'greenMoongSprouted',
 'rehydrated soya chunks':'soyChunksHydrated',
 'cooked chicken':'chickenCooked','cooked fish':'fishCooked','cooked prawns':'prawnsCooked',
 'cooked potato':'potatoCooked','cooked sweet potato':'sweetPotatoCooked',
 'rice flour':'riceFlour','gram flour besan':'gramFlour',
 'jowar flour':'jowarFlour','bajra flour':'bajraFlour','ragi flour':'ragiFlour',
 'coconut water':'coconutWater','idli batter':'idliBatter','dosa batter':'dosaBatter',
 'egg white':'eggWhite','whole wheat bread':'wheatBread',
 'roasted gram':'roastedGram','puffed rice':'puffedRice','sweetcorn':'sweetCorn',
 'bottle gourd':'bottleGourd','raw mango':'rawMango',
 'mixed spices':'spices','cooking oil':'oil',
 'carrots':'carrot','eggs':'egg','spinach leaves':'spinach','tomatoes':'tomato',
 'yellow moong dal':'moongDalCooked','white rice cooked':'riceCooked'
};
const byName=new Map();
for(const [k,v] of Object.entries(INGREDIENT_REFERENCE))byName.set(normal(k),v);
for(const [k,v] of Object.entries(custom))byName.set(normal(k),v);
for(const [k,v] of Object.entries(alias)) {
 const entry=INGREDIENT_REFERENCE[v]||custom[v];
 if(entry)byName.set(normal(k),entry);
}
const pieceWeights={'egg':50,'eggs':50,'whole wheat tortilla':45,'whole wheat tortillas':45};
const liquids=new Set(['milk','coconut water','buttermilk','water']);
export function estimateBatchNutrition(ingredients) {
 if(!Array.isArray(ingredients)||!ingredients.length||ingredients.length>60)throw new Error('Enter 1–60 ingredients first.');
 const totals={kcal:0,protein:0,carbs:0,fat:0,fibre:0},missing=[];
 for(const item of ingredients){
  const name=normal(item?.name),value=Number(item?.amount),unit=String(item?.unit||'').toLowerCase();
  const reference=byName.get(name);
  if(!reference||!Number.isFinite(value)||value<=0){missing.push(String(item?.name||'Unknown ingredient'));continue;}
  let grams;
  if(unit==='g')grams=value;
  else if(unit==='kg')grams=value*1000;
  else if(unit==='pcs'&&pieceWeights[name])grams=value*pieceWeights[name];
  else if(unit==='ml'&&liquids.has(name))grams=value;
  else if(unit==='l'&&liquids.has(name))grams=value*1000;
  else{missing.push(String(item.name)+' ('+unit+' unit needs a verified weight)');continue;}
  if(grams>100000||!Number.isFinite(grams)){missing.push(String(item.name));continue;}
  keys.forEach((key,i)=>totals[key]+=reference[i]*grams/100);
 }
 for(const key of keys)totals[key]=Math.round(totals[key]*10)/10;
 return {complete:missing.length===0,totals,missing,ingredientCount:ingredients.length,
   note:'Approximate per-ingredient estimates, not measured. Review labels, raw versus cooked weights and cooking losses.'};
}
