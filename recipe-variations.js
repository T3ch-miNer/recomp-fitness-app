// Recomp's expandable collection of Indian and popular meal *variations*.
// Values are calculated from the existing Recomp ingredient references and
// baseline recipe estimates. They are NOT verified nutrition-label values.
// Every item has a distinct ingredient composition, not merely a new portion size.
// Keep stable IDs because saved food diaries reference them.
const MACROS=['calories','protein','carbs','fat','fibre'];
const PAIRINGS=[
 ['jeera-rice','Jeera Rice',[['riceCooked',150],['ghee',4],['spices',2]]],
 ['chapati','Wholewheat Chapati',[['atta',55],['water',35]]],
 ['raita','Cucumber Raita',[['curd',105],['cucumber',45],['spices',1]]],
 ['dal','Yellow Moong Dal',[['moongDalCooked',145],['tomato',35],['oil',4],['spices',2]]],
 ['kachumber','Kachumber Salad',[['cucumber',65],['tomato',65],['onion',20]]],
 ['chana','Masala Chickpeas',[['chanaCooked',125],['onion',25],['spices',3]]],
 ['saag','Sautéed Spinach',[['spinach',110],['oil',5],['spices',2]]],
 ['paneer','Pepper Paneer',[['paneer',95],['capsicum',40],['spices',2]]],
 ['tofu','Pepper Tofu',[['tofu',125],['capsicum',45],['spices',2]]],
 ['eggs','Masala Eggs',[['egg',105],['onion',20],['spices',2]]],
 ['chicken','Tandoori-Style Chicken',[['chickenCooked',120],['curd',30],['oil',5],['spices',3]]],
 ['mushrooms','Spiced Mushrooms',[['mushroom',145],['onion',35],['oil',5],['spices',2]]],
 ['peas','Jeera Peas',[['peas',140],['oil',4],['spices',2]]],
 ['potatoes','Spiced Potatoes',[['potatoCooked',155],['oil',5],['spices',2]]],
 ['brown-rice','Brown Rice',[['brownRiceCooked',160],['spices',1]]],
 ['sweet-potato','Roasted Sweet Potato',[['sweetPotatoCooked',165],['oil',4],['spices',2]]]
];
// Sides are meals, not secret ingredients: e.g. "Dal Tadka with Jeera Rice".
// Avoid claiming that meal variants are 1,000 individually researched recipes.
const SKIP_CATEGORY=/dessert|sweet|drink|beverage|chutney|pickle|sauce|condiment|fruit|snack bar/i;
const SKIP_NAME=/^(?:plain )?(?:milk|banana|apple|orange|water|papaya)\b/i;
const rounded=n=>Math.round(n*10)/10;
export function makeRecipeVariations(baseFoods,ingredientReference,target=1000){
 if(!Array.isArray(baseFoods)||!ingredientReference||!Number.isInteger(target)||target<1||target>2000)
  throw Error('Invalid recipe expansion request.');
 const mains=baseFoods.filter(food=>food?.id&&food?.name&&food?.per100&&Number.isFinite(food.yieldGrams)&&
  food.yieldGrams>0&&!SKIP_CATEGORY.test(food.category||'')&&!SKIP_NAME.test(food.name));
 if(mains.length<65)throw Error('Need at least 65 existing meal recipes for meaningful variants.');
 const results=[],seen=new Set(baseFoods.map(f=>f.id)),seenNames=new Set(baseFoods.map(f=>f.name.toLocaleLowerCase('en')));
 // Interleave pairings so the first 1000 cover many types of meals, not just one.
 for(const [suffix,title,side] of PAIRINGS){
  for(const base of mains){
   if(results.length>=target)break;
   const name=base.name+' with '+title;
   const id='meal-v3-'+base.id+'-'+suffix;
   if(seen.has(id)||seenNames.has(name.toLocaleLowerCase('en')))continue;
   // Avoid repeating the same explicit side and obvious protein duplicates.
   const key=base.name.toLowerCase();
   if((suffix==='eggs'&&/egg|omelette|anda|bhurji/.test(key))||
      (suffix==='chicken'&&/chicken|murgh/.test(key))||
      (suffix==='paneer'&&/paneer/.test(key))||
      (suffix==='tofu'&&/tofu/.test(key))||
      (suffix==='jeera-rice'&&/jeera rice/.test(key))||
      (suffix==='raita'&&/raita|curd rice/.test(key)))continue;
   const sideGrams=side.reduce((sum,[,grams])=>sum+grams,0);
   const mass=base.yieldGrams+sideGrams;
   const sums=MACROS.map(k=>base.per100[k]*base.yieldGrams/100);
   for(const [ingredient,grams] of side){
    const nutrients=ingredientReference[ingredient];
    if(!nutrients||!Number.isFinite(grams)||grams<=0)throw Error('Unknown side ingredient: '+ingredient);
    for(let n=0;n<MACROS.length;n++)sums[n]+=nutrients[n]*grams/100;
   }
   const per100=Object.fromEntries(MACROS.map((macro,i)=>[macro,rounded(sums[i]*100/mass)]));
   if(Object.values(per100).some(v=>!Number.isFinite(v)||v<0||v>1000))throw Error('Unreasonable nutrition for '+id);
   // A default serving includes the original serving + one side serving, proportional to the batch.
   const serving=Math.round(Math.min(1500,Math.max(70,base.defaultGrams+sideGrams)));
   results.push(Object.freeze({
    id,name,aliases:[base.aliases,title,'Indian meal','meal combination'].filter(Boolean).join(' ').slice(0,350),
    category:/indian|dal|sabji|paneer|rice|roti|breads|breakfast|beans/i.test(base.category||'')?'Indian meal variations':'Popular meal variations',
    yieldGrams:mass,defaultGrams:serving,
    ingredients:[...(base.ingredients||[]).map(i=>({name:i.name,grams:i.grams})),...side.map(([name,grams])=>({name,grams}))],
    per100:Object.freeze(per100),type:'estimated',
    source:'Recomp ingredient-derived meal variation (approximate)'
   }));
   seen.add(id);seenNames.add(name.toLocaleLowerCase('en'));
  }
  if(results.length>=target)break;
 }
 if(results.length!==target)throw Error('Only '+results.length+' valid meal variations generated, expected '+target);
 return Object.freeze(results);
}
