import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

// No build step or third-party packages. Import the browser ES module as a data URL.
const source=readFileSync(new URL('../food-db.js',import.meta.url),'utf8');
const foods=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const {FOOD_ITEMS,FOOD_COUNT,findFood,searchFoods,nutrientsForGrams}=foods;
const BASELINE_IDS=["roti","paratha","aloo-paratha","methi-paratha","plain-rice","jeera-rice","veg-pulao","khichdi","curd-rice","lemon-rice","tamarind-rice","dal-tadka","moong-dal","masoor-dal","dal-palak","rajma","chole","kala-chana","sambar","rasam","aloo-gobi","bhindi","palak-paneer","paneer-bhurji","matar-paneer","paneer-curry","soya-chunks","tofu-bhurji","baingan-bharta","lauki","cabbage-sabji","beans-poriyal","mix-veg","aloo-matar","mushroom-masala","pumpkin-sabji","poha","upma","idli","dosa","masala-dosa","besan-chilla","oats-porridge","egg-bhurji","boiled-egg","omelette","chicken-curry","chicken-bhurji","vegetable-soup","raita","plain-curd","banana","milk","puri","bhatura","missi-roti","gobi-paratha","paneer-paratha","onion-paratha","dal-paratha","jowar-roti","bajra-roti","ragi-roti","lachha-paratha","tandoori-roti","aloo-kulcha","brown-rice","peas-pulao","tomato-rice","coconut-rice","ghee-rice","mushroom-rice","vegetable-biryani","chicken-biryani","egg-biryani","paneer-biryani","vegetable-fried-rice","egg-fried-rice","bisi-bele-bath","ven-pongal","dal-makhani","chana-dal","moong-dal-fry","whole-moong-curry","lobia-curry","methi-dal","tomato-pappu","panchmel-dal","kadhi","dry-kala-chana","sprouted-moong-salad","lauki-chana-dal","aloo-palak","aloo-methi","aloo-jeera","aloo-beans","aloo-capsicum","aloo-baingan","gobi-matar","bhindi-do-pyaza","baingan-curry","carrot-beans","gajar-matar","beetroot-poriyal","tinda-sabji","tindora-sabji","corn-capsicum","palak-corn","stuffed-capsicum","cucumber-kachumber","kadai-paneer","paneer-butter-masala","paneer-tikka","paneer-jalfrezi","paneer-do-pyaza","paneer-palak-dry","tofu-tikka","tofu-masala","palak-tofu","soya-keema","masala-uttapam","onion-uttapam","ragi-dosa","pesarattu","paniyaram","akki-roti","sabudana-khichdi","vegetable-daliya","sweet-daliya","aloo-poha","bread-upma","oats-chilla","egg-dosa","idli-upma","dhokla","khandvi","bhel-puri","samosa","onion-pakora","vegetable-cutlet","roasted-chana","boiled-sweetcorn","peanut-chaat","sprouts-chaat","paneer-sandwich","egg-sandwich","chicken-sandwich","fruit-chaat","boiled-egg-whites","scrambled-eggs","egg-curry","egg-masala","grilled-chicken","chicken-tikka","chicken-palak","chicken-stir-fry","fish-curry","grilled-fish","prawn-curry","prawn-fry","tomato-soup","palak-soup","paneer-salad","egg-salad","buttermilk","sweet-lassi","mango-lassi","masala-chai","coffee-milk","coconut-water","rice-kheer","suji-halwa","gajar-halwa","seviyan-kheer","shrikhand","besan-ladoo"];

test('catalogue expands beyond 176 dishes without changing historical food IDs',()=>{
 assert.ok(FOOD_COUNT>=290);
 assert.equal(FOOD_COUNT,FOOD_ITEMS.length);
 assert.equal(new Set(FOOD_ITEMS.map(x=>x.id)).size,FOOD_COUNT);
 for(const id of BASELINE_IDS)assert.ok(findFood(id),'Missing old recipe '+id);
});

test('each food has finite non-negative per-100 g estimated values',()=>{
 for(const food of FOOD_ITEMS){
  assert.ok(food.name && food.id && food.category,food?.id);
  assert.ok(food.defaultGrams>0 && food.defaultGrams<=5000,food.id);
  assert.ok(food.ingredients.length>0,food.id);
  assert.equal(food.type,'estimated',food.id);
  for(const key of ['calories','protein','carbs','fat','fibre']){
   assert.ok(Number.isFinite(food.per100[key]),food.id+' missing '+key);
   assert.ok(food.per100[key]>=0,food.id+' negative '+key);
  }
  assert.ok(food.per100.calories<=900,food.id+' implausible energy per 100 g');
  assert.ok(food.per100.protein<=100 && food.per100.fat<=100 && food.per100.carbs<=100,food.id+' implausible macros');
 }
});

test('new regional dishes and alternative spellings can be found offline',()=>{
 const searches=[
  ['thepla','thepla'],['mooli','mooli-paratha'],['sattu','sattu-paratha'],
  ['shakarkand','sweetpotato-chaat'],['macher','mustard-fish-curry'],
  ['pappu','tomato-dal-rice'],['haldi doodh','spiced-turmeric-milk']
 ];
 for(const [query,id] of searches)assert.ok(searchFoods(query,60).some(x=>x.id===id),'Search '+query);
});

test('cooked portion scaling remains consistent and bounded',()=>{
 for(const id of ['roti','chole','mooli-paratha','chana-pulao','fish-tikka','banana-lassi']){
  const f=findFood(id),twice=nutrientsForGrams(f,200);
  for(const k of ['calories','protein','carbs','fat','fibre']){
   assert.equal(twice[k],Math.round(f.per100[k]*20)/10,id+' '+k);
  }
 }
 for(const invalid of [0,-100,5001,'bad',Infinity])assert.throws(()=>nutrientsForGrams(findFood('roti'),invalid));
});

test('recipe data is read-only and retains original per-100 gram schema',()=>{
 assert.ok(Object.isFrozen(FOOD_ITEMS));
 assert.ok(Object.isFrozen(findFood('roti')));
 assert.deepEqual(Object.keys(findFood('roti').per100).sort(),['calories','carbs','fat','fibre','protein']);
});
