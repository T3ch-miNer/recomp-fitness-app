// Recomp Indian Home Foods starter catalogue (v2.0 preview).
// Recipes and ingredient weights are authored for Recomp as illustrative averages;
// they were not extracted from commercial applications or restricted recipe datasets.
// Ingredient values are approximate common-food reference values, NOT lab measurements.
// Cooked yields and oil vary between households, so users must review the totals.
// Format for ingredients: [key, grams used in entire recipe batch].
const INGREDIENTS = {
  atta:[340,12,72,2.0,10], rice:[365,7.1,80,0.7,1.3], riceCooked:[130,2.7,28.2,0.3,0.4],
  poha:[350,7,76,1.2,1], rava:[360,12.5,73,1.1,3.9], oats:[389,16.9,66.3,6.9,10.6],
  vermicelli:[360,12,74,1.5,3], gramFlour:[387,22,58,6.7,10.8], idliBatter:[180,6,35,1.2,1.8],
  dosaBatter:[175,5.5,34,1,1.5], wheatBread:[255,9,48,3.2,4],
  toorDalCooked:[119,7.2,21,0.5,5], moongDalCooked:[105,7,19,0.4,7.6], masoorDalCooked:[116,9,20.1,0.4,7.9],
  chanaCooked:[164,8.9,27.4,2.6,7.6], rajmaCooked:[127,8.7,22.8,0.5,6.4], blackChanaCooked:[164,8.9,27.4,2.6,7.6],
  uradDalCooked:[116,8.5,20,0.6,7], soyChunksHydrated:[115,15,10,1,5],
  paneer:[296,18.3,3.4,23,0], tofu:[84,9.1,1.9,4.7,0.3], curd:[65,3.7,4.7,3.5,0],
  milk:[61,3.2,4.8,3.3,0], egg:[143,12.6,0.7,9.5,0], chickenCooked:[165,31,0,3.6,0],
  potatoCooked:[87,1.9,20.1,0.1,1.8], sweetPotatoCooked:[86,1.6,20,0.1,3],
  onion:[40,1.1,9.3,0.1,1.7], tomato:[18,0.9,3.9,0.2,1.2], carrot:[41,0.9,9.6,0.2,2.8],
  peas:[81,5.4,14.5,0.4,5.1], spinach:[23,2.9,3.6,0.4,2.2], okra:[33,1.9,7.5,0.2,3.2],
  cauliflower:[25,1.9,5,0.3,2], capsicum:[25,1,6,0.3,1.7], cabbage:[25,1.3,5.8,0.1,2.5],
  brinjal:[25,1,5.9,0.2,3], bottleGourd:[15,0.6,3.7,0.1,1.2], pumpkin:[26,1,6.5,0.1,0.5],
  beans:[31,1.8,7,0.1,2.7], cucumber:[15,0.7,3.6,0.1,0.5], methi:[43,4.4,6,0.9,1.1],
  mushroom:[22,3.1,3.3,0.3,1], banana:[89,1.1,22.8,0.3,2.6], peanuts:[567,25.8,16.1,49.2,8.5],
  coconut:[354,3.3,15.2,33.5,9], ghee:[900,0,0,100,0], oil:[900,0,0,100,0],
  sugar:[387,0,100,0,0], jaggery:[383,0,98,0,0], spices:[300,11,49,10,22], water:[0,0,0,0,0]
};
// [id, English name, synonyms, category, yield grams, ingredient recipe, typical cooked quantity]
const RECIPES = [
 ['roti','Roti / Chapati','phulka chapathi wheat roti','Breads',110,[['atta',70],['water',40]],55],
 ['paratha','Plain Paratha','wheat paratha', 'Breads',120,[['atta',75],['oil',8],['water',40]],60],
 ['aloo-paratha','Aloo Paratha','potato stuffed paratha','Breads',160,[['atta',75],['potatoCooked',75],['oil',8],['spices',2]],160],
 ['methi-paratha','Methi Paratha','fenugreek paratha thepla','Breads',145,[['atta',85],['methi',45],['oil',7],['spices',2]],145],
 ['plain-rice','Steamed Rice','chawal bhat cooked white rice','Rice',200,[['riceCooked',200]],150],
 ['jeera-rice','Jeera Rice','cumin rice','Rice',215,[['riceCooked',200],['oil',5],['spices',2]],150],
 ['veg-pulao','Vegetable Pulao','veg pulav rice','Rice',350,[['riceCooked',220],['peas',35],['carrot',30],['onion',40],['oil',8],['spices',3]],180],
 ['khichdi','Moong Dal Khichdi','khichri moong khichdi','Rice',400,[['riceCooked',195],['moongDalCooked',155],['onion',25],['ghee',6],['spices',2]],200],
 ['curd-rice','Curd Rice','dahi chawal thayir sadam','Rice',300,[['riceCooked',175],['curd',125],['spices',2]],180],
 ['lemon-rice','Lemon Rice','chitranna','Rice',265,[['riceCooked',225],['peanuts',20],['oil',8],['spices',2]],180],
 ['tamarind-rice','Tamarind Rice','puliyogare pulihora','Rice',295,[['riceCooked',240],['peanuts',20],['oil',9],['spices',3]],180],
 ['dal-tadka','Dal Tadka','dal fry tuvar dal arhar dal','Dal & Beans',365,[['toorDalCooked',270],['onion',40],['tomato',45],['ghee',9],['spices',2]],150],
 ['moong-dal','Moong Dal','yellow moong dal mung dal','Dal & Beans',350,[['moongDalCooked',290],['onion',20],['tomato',35],['oil',5],['spices',2]],150],
 ['masoor-dal','Masoor Dal','red lentil dhal','Dal & Beans',350,[['masoorDalCooked',270],['tomato',45],['onion',30],['oil',6],['spices',2]],150],
 ['dal-palak','Dal Palak','spinach dal palak dal','Dal & Beans',380,[['moongDalCooked',235],['spinach',110],['onion',30],['oil',6],['spices',2]],150],
 ['rajma','Rajma Masala','kidney bean curry','Dal & Beans',385,[['rajmaCooked',270],['onion',55],['tomato',85],['oil',9],['spices',4]],150],
 ['chole','Chole / Chana Masala','chickpea curry chana masala','Dal & Beans',395,[['chanaCooked',270],['onion',55],['tomato',85],['oil',10],['spices',4]],150],
 ['kala-chana','Kala Chana Curry','black chickpeas curry','Dal & Beans',360,[['blackChanaCooked',245],['onion',50],['tomato',80],['oil',8],['spices',3]],150],
 ['sambar','Vegetable Sambar','sambhar south indian dal','Dal & Beans',550,[['toorDalCooked',265],['pumpkin',85],['carrot',45],['tomato',55],['onion',25],['oil',6],['spices',4],['water',75]],200],
 ['rasam','Tomato Rasam','pepper rasam','Dal & Beans',420,[['toorDalCooked',85],['tomato',95],['water',230],['oil',4],['spices',3]],180],
 ['aloo-gobi','Aloo Gobi','potato cauliflower sabji subzi','Sabji',340,[['potatoCooked',175],['cauliflower',170],['onion',30],['tomato',35],['oil',9],['spices',3]],150],
 ['bhindi','Bhindi Sabji','okra fry bhindi masala ladyfinger','Sabji',270,[['okra',230],['onion',55],['oil',11],['spices',3]],150],
 ['palak-paneer','Palak Paneer','spinach cottage cheese curry','Paneer & Soy',365,[['paneer',145],['spinach',175],['onion',30],['tomato',45],['oil',8],['spices',3]],150],
 ['paneer-bhurji','Paneer Bhurji','scrambled paneer','Paneer & Soy',275,[['paneer',170],['onion',55],['tomato',50],['oil',8],['spices',3]],150],
 ['matar-paneer','Matar Paneer','peas paneer curry mutter paneer','Paneer & Soy',370,[['paneer',150],['peas',115],['onion',55],['tomato',75],['oil',10],['spices',3]],150],
 ['paneer-curry','Paneer Masala','paneer curry','Paneer & Soy',370,[['paneer',165],['onion',80],['tomato',120],['oil',11],['spices',3]],150],
 ['soya-chunks','Soya Chunks Curry','soy chunks nutrela curry','Paneer & Soy',365,[['soyChunksHydrated',235],['onion',60],['tomato',100],['oil',8],['spices',3]],150],
 ['tofu-bhurji','Tofu Bhurji','tofu scramble','Paneer & Soy',325,[['tofu',210],['onion',60],['tomato',55],['oil',6],['spices',3]],150],
 ['baingan-bharta','Baingan Bharta','roasted brinjal mash eggplant sabzi','Sabji',350,[['brinjal',260],['onion',65],['tomato',85],['oil',9],['spices',3]],150],
 ['lauki','Lauki Sabji','bottle gourd doodhi curry','Sabji',365,[['bottleGourd',315],['onion',45],['tomato',40],['oil',7],['spices',2]],150],
 ['cabbage-sabji','Cabbage Sabji','patta gobhi subzi','Sabji',350,[['cabbage',300],['peas',35],['onion',40],['oil',7],['spices',2]],150],
 ['beans-poriyal','Beans Poriyal','beans sabji thoran','Sabji',305,[['beans',235],['coconut',32],['onion',35],['oil',6],['spices',2]],150],
 ['mix-veg','Mixed Vegetable Sabji','mixed veg curry stir fry sabzi','Sabji',375,[['cauliflower',110],['carrot',85],['peas',65],['beans',85],['onion',40],['oil',9],['spices',3]],150],
 ['aloo-matar','Aloo Matar','potato peas curry','Sabji',365,[['potatoCooked',215],['peas',110],['onion',50],['tomato',60],['oil',9],['spices',2]],150],
 ['mushroom-masala','Mushroom Masala','mushroom sabzi curry','Sabji',335,[['mushroom',230],['onion',65],['tomato',100],['oil',9],['spices',2]],150],
 ['pumpkin-sabji','Kaddu Sabji','pumpkin curry','Sabji',335,[['pumpkin',275],['onion',55],['tomato',45],['oil',7],['spices',2]],150],
 ['poha','Kanda Poha','flattened rice poha breakfast','Breakfast',345,[['poha',100],['onion',65],['peas',45],['peanuts',20],['oil',9],['spices',3],['water',125]],180],
 ['upma','Rava Upma','suji upma semolina breakfast','Breakfast',375,[['rava',115],['onion',45],['carrot',40],['peas',40],['oil',9],['spices',3],['water',140]],180],
 ['idli','Plain Idli','steamed idli rice cake','Breakfast',200,[['idliBatter',200]],100],
 ['dosa','Plain Dosa','south indian dosa','Breakfast',150,[['dosaBatter',140],['oil',6]],150],
 ['masala-dosa','Masala Dosa','potato dosa','Breakfast',240,[['dosaBatter',135],['potatoCooked',90],['onion',30],['oil',10],['spices',2]],240],
 ['besan-chilla','Besan Chilla','cheela gram flour pancakes','Breakfast',235,[['gramFlour',80],['onion',40],['tomato',35],['oil',7],['water',80],['spices',2]],120],
 ['oats-porridge','Oats Porridge','oatmeal milk oats','Breakfast',290,[['oats',45],['milk',215],['banana',40]],200],
 ['egg-bhurji','Egg Bhurji','anda bhurji scrambled eggs','Egg & Chicken',270,[['egg',150],['onion',60],['tomato',45],['oil',7],['spices',2]],135],
 ['boiled-egg','Boiled Egg','hard boiled anda','Egg & Chicken',100,[['egg',100]],50],
 ['omelette','Masala Omelette','egg omelet onion tomato','Egg & Chicken',175,[['egg',115],['onion',40],['tomato',25],['oil',5],['spices',1]],100],
 ['chicken-curry','Homestyle Chicken Curry','chicken gravy murgh curry','Egg & Chicken',440,[['chickenCooked',290],['onion',100],['tomato',115],['oil',14],['spices',5]],170],
 ['chicken-bhurji','Chicken Keema','minced chicken curry','Egg & Chicken',370,[['chickenCooked',260],['onion',85],['tomato',70],['oil',10],['spices',4]],150],
 ['vegetable-soup','Mixed Vegetable Soup','veg soup','Light meals',430,[['carrot',65],['beans',60],['cabbage',65],['tomato',60],['water',225],['oil',3],['spices',2]],240],
 ['raita','Cucumber Raita','dahi kheera raita','Light meals',260,[['curd',195],['cucumber',65],['spices',1]],130],
 ['plain-curd','Plain Curd','dahi yoghurt yogurt','Light meals',150,[['curd',150]],150],
 ['banana','Banana','kela ripe banana','Light meals',100,[['banana',100]],100],
 ['milk','Milk','doodh whole milk','Light meals',200,[['milk',200]],200]
];
const FIELDS = ['calories','protein','carbs','fat','fibre'];
function compute(recipe){
 const [id,name,aliases,category,yieldG,ingredients,defaultGrams]=recipe;
 const amounts=[0,0,0,0,0];
 for(const [key,grams] of ingredients){const entry=INGREDIENTS[key];if(!entry)throw new Error('Missing recipe ingredient '+key);for(let i=0;i<5;i++)amounts[i]+=entry[i]*grams/100;}
 const per100={};FIELDS.forEach((key,i)=>{per100[key]=Math.round(amounts[i]*100/yieldG*10)/10;});
 return Object.freeze({id,name,aliases,category,per100,defaultGrams,source:'Recomp sample recipe estimate',type:'estimated',ingredients:ingredients.map(([key,grams])=>({name:key,grams}))});
}
export const FOOD_ITEMS=Object.freeze(RECIPES.map(compute));
export const FOOD_COUNT=FOOD_ITEMS.length;
export function findFood(id){return FOOD_ITEMS.find(item=>item.id===id)||null;}
function normalise(text){return String(text??'').toLocaleLowerCase('en').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^\p{L}\p{N}]+/gu,' ').trim();}
export function searchFoods(query,limit=24){
 const q=normalise(query);
 if(!q)return FOOD_ITEMS.slice(0,limit);
 const words=q.split(/\s+/).filter(Boolean);
 return FOOD_ITEMS.map((item,index)=>{
  const n=normalise(item.name),s=normalise(item.aliases),all=n+' '+s+' '+normalise(item.category);
  if(!words.every(word=>all.includes(word)))return null;
  const score=(n===q?1000:0)+(n.startsWith(q)?300:0)+(s.split(' ').includes(q)?120:0)+(n.includes(q)?80:0)-index/1000;
  return {item,score};
 }).filter(Boolean).sort((a,b)=>b.score-a.score).slice(0,limit).map(x=>x.item);
}
export function nutrientsForGrams(food,grams){
 const qty=Number(grams);
 if(!Number.isFinite(qty)||qty<=0||qty>5000)throw new Error('Enter a portion from 1 to 5,000 g');
 const val={};for(const key of FIELDS)val[key]=Math.round(food.per100[key]*qty/100*10)/10;
 return val;
}
