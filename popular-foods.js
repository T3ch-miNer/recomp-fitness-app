// Extra shared catalogue recipe examples: approximate by ingredient weight, NOT lab-verified.
// Each entry: id, name, aliases, category, cooked serving yield g, recipe ingredients, typical grams.
import {INGREDIENT_REFERENCE,FOOD_ITEMS} from './food-db.js';
const RECIPES=[
 ['extra-pav-bhaji','Pav Bhaji with Buttered Pav','Mumbai street food pav bhaji','Indian street food',450,[['potatoCooked',170],['peas',60],['capsicum',45],['tomato',85],['onion',55],['butter',12],['wheatBread',80],['spices',5]],300],
 ['extra-misal-pav','Misal Pav','Maharashtrian spicy sprouts bread','Indian street food',400,[['greenMoongSprouted',140],['chanaCooked',100],['onion',50],['tomato',45],['wheatBread',80],['oil',12],['spices',5]],275],
 ['extra-ragda-pattice','Ragda Pattice','ragda patties potato chaat','Indian street food',350,[['potatoCooked',135],['peas',140],['onion',40],['tomato',35],['oil',9],['spices',5]],240],
 ['extra-dahi-papdi-bowl','Dahi Papdi Chaat Bowl','dahi chaat yogurt potatoes','Indian street food',350,[['curd',160],['potatoCooked',90],['chanaCooked',65],['onion',25],['spices',4],['oil',6]],200],
 ['extra-egg-kathi-roll','Egg Kathi Roll','kolkata egg roll chapati','Indian street food',280,[['atta',75],['egg',110],['onion',55],['capsicum',35],['oil',9],['spices',3]],200],
 ['extra-paneer-kathi-roll','Paneer Kathi Roll','paneer wrap indian roll','Indian street food',300,[['atta',75],['paneer',120],['onion',45],['capsicum',35],['oil',8],['spices',3]],210],
 ['extra-chicken-kathi-roll','Chicken Kathi Roll','chicken tikka wrap roll','Indian street food',310,[['atta',80],['chickenCooked',160],['onion',50],['curd',35],['oil',10],['spices',4]],230],
 ['extra-butter-chicken-rice','Butter Chicken Rice Bowl','murgh makhani rice plate','Indian mains',445,[['riceCooked',225],['chickenCooked',155],['tomato',95],['curd',60],['butter',17],['onion',35],['spices',4]],350],
 ['extra-paneer-tikka-rice','Paneer Tikka Rice Bowl','tandoori paneer rice','Indian mains',420,[['riceCooked',220],['paneer',140],['capsicum',65],['onion',45],['curd',55],['oil',7],['spices',5]],320],
 ['extra-chicken-tikka-salad','Chicken Tikka Salad','chicken tandoori light salad','Indian mains',330,[['chickenCooked',170],['curd',65],['cucumber',100],['tomato',65],['onion',35],['oil',4],['spices',4]],275],
 ['extra-egg-masala-bowl','Egg Masala Rice Bowl','anda curry rice','Indian mains',420,[['riceCooked',200],['egg',135],['tomato',90],['onion',55],['oil',10],['spices',4]],310],
 ['extra-haleem-chicken','Homestyle Chicken Haleem','chicken lentil porridge','Indian mains',480,[['chickenCooked',125],['moongDalCooked',155],['masoorDalCooked',135],['onion',65],['ghee',9],['spices',5],['water',110]],270],
 ['extra-paneer-pepper-fry','Pepper Paneer Fry','paneer pepper stir fry','Indian mains',305,[['paneer',165],['capsicum',75],['onion',65],['tomato',40],['oil',10],['spices',5]],200],
 ['extra-chicken-pepper-fry','Pepper Chicken Fry','black pepper chicken spicy','Indian mains',300,[['chickenCooked',215],['onion',50],['capsicum',40],['oil',11],['spices',7]],220],
 ['extra-tawa-fish','Tawa Fish Masala','indian pan seared fish','Indian mains',290,[['fishCooked',205],['tomato',55],['onion',45],['oil',9],['spices',5]],200],
 ['extra-mango-lassi','Mango Lassi','aam yogurt drink','Indian drinks',280,[['mango',110],['curd',145],['milk',60],['sugar',12]],250],
 ['extra-masala-chaas','Masala Chaas','buttermilk spiced yogurt drink','Indian drinks',300,[['curd',90],['water',210],['spices',2]],250],
 ['extra-overnight-banana-oats','Banana Overnight Oats','overnight oats banana yoghurt breakfast','Popular breakfast',300,[['oats',55],['milk',160],['curd',65],['banana',90]],260],
 ['extra-peanut-overnight-oats','Peanut Banana Oats','peanut oat breakfast jar','Popular breakfast',350,[['oats',60],['milk',170],['curd',60],['banana',70],['peanuts',20]],250],
 ['extra-shakshuka','Shakshuka with Eggs','egg tomato pepper skillet','Popular meals',370,[['egg',170],['tomato',150],['capsicum',70],['onion',50],['oil',9],['spices',5]],250],
 ['extra-vegetarian-bibimbap','Vegetable Bibimbap-Style Bowl','korean rice veg egg bowl','Asian bowls',425,[['riceCooked',220],['egg',55],['carrot',60],['spinach',70],['mushroom',65],['oil',9],['spices',3]],330],
 ['extra-chicken-bibimbap','Chicken Bibimbap-Style Bowl','korean chicken rice vegetables','Asian bowls',460,[['riceCooked',230],['chickenCooked',130],['carrot',60],['spinach',65],['mushroom',50],['oil',9],['spices',4]],340],
 ['extra-chicken-rice-noodle-soup','Chicken Vermicelli Noodle Soup','chicken noodle soup rice noodle bowl','Asian bowls',520,[['vermicelli',60],['chickenCooked',130],['mushroom',70],['carrot',50],['cabbage',70],['water',250],['oil',5],['spices',4]],400],
 ['extra-egg-veg-noodle-bowl','Egg Vegetable Vermicelli Bowl','fried rice vermicelli egg vegetable noodles','Asian bowls',410,[['vermicelli',75],['egg',105],['capsicum',70],['carrot',60],['onion',40],['oil',9],['spices',4]],300],
 ['extra-chicken-burrito-bowl','Chicken Burrito-Style Bowl','rice chicken bean burrito bowl','Popular bowls',475,[['riceCooked',195],['chickenCooked',140],['rajmaCooked',115],['tomato',55],['onion',35],['curd',40],['oil',6],['spices',4]],350],
 ['extra-vegan-burrito-bowl','Vegan Bean Burrito-Style Bowl','vegan burrito rice beans bowl','Popular bowls',475,[['riceCooked',185],['rajmaCooked',160],['chanaCooked',70],['tomato',65],['capsicum',55],['onion',35],['oil',8],['spices',4]],350],
 ['extra-chicken-shawarma-bowl','Chicken Shawarma-Style Rice Bowl','chicken shawarma rice salad bowl','Popular bowls',480,[['riceCooked',220],['chickenCooked',160],['curd',65],['cucumber',75],['tomato',55],['onion',40],['oil',11],['spices',5]],360],
 ['extra-chickpea-power-bowl','Chickpea Power Bowl','chickpea quinoa style rice veggie bowl','Popular bowls',460,[['brownRiceCooked',170],['chanaCooked',145],['spinach',85],['carrot',50],['curd',65],['oil',8],['spices',3]],320],
 ['extra-eggs-sandwich','Egg Salad Sandwich','boiled egg sandwich curd bread','Popular meals',260,[['wheatBread',105],['egg',115],['curd',40],['onion',15],['spices',2]],220],
 ['extra-mushroom-creamy-rice','Creamy Mushroom Rice','mushroom rice risotto style','Popular meals',360,[['riceCooked',220],['mushroom',155],['milk',80],['butter',10],['onion',40],['spices',3]],275]
];
export const SUPPLEMENTAL_RECIPE_ESTIMATES=Object.freeze(RECIPES.map(([id,name,aliases,category,yieldGrams,ingredients,defaultGrams])=>{
 if(FOOD_ITEMS.some(f=>f.id===id))throw Error('Online extra recipe already bundled: '+id);
 if(!Number.isFinite(yieldGrams)||yieldGrams<=0||defaultGrams<=0||defaultGrams>5000)throw Error('Invalid recipe yield');
 const sums=[0,0,0,0,0];
 for(const [key,grams] of ingredients){
  const nutrition=INGREDIENT_REFERENCE[key];
  if(!nutrition||!Number.isFinite(grams)||grams<=0)throw Error('Missing reference ingredient: '+key);
  for(let i=0;i<5;i++)sums[i]+=nutrition[i]*grams/100;
 }
 const per100=Object.fromEntries(['calories','protein','carbs','fat','fibre'].map((k,i)=>[k,Math.round(sums[i]*100/yieldGrams*10)/10]));
 return Object.freeze({id,name,aliases,category,defaultGrams,per100,
  source:'Recomp recipe-based estimate (not lab verified)',recipeIngredients:ingredients});
}));
if(new Set(SUPPLEMENTAL_RECIPE_ESTIMATES.map(x=>x.id)).size!==RECIPES.length)throw Error('Duplicate popular food estimates');
