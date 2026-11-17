// Recomp recipe collection: batch-cook dinners for the meal planner.
// Every recipe makes four servings (dinner for two, lunch for two the next day)
// and avoids tomato, citrus, coffee, tofu and soya, matching the planner's
// default avoid list. Nutrition is calculated from the ingredient reference in
// recipe-estimates.js, so it is an estimate, not a label value.
// Keep ids stable: recipes added to a recipe book remember where they came from.
import {estimateBatchNutrition} from './recipe-estimates.js';
import {INDIAN_RECIPES} from './recipes-indian.js';
import {ASIAN_RECIPES} from './recipes-asian.js';
import {MEDITERRANEAN_RECIPES} from './recipes-mediterranean.js';
import {GLOBAL_RECIPES} from './recipes-global.js';

export const COLLECTION_TAGS=Object.freeze([
 ['all','All'],['chicken','Chicken'],['fish','Fish & prawns'],['beef-turkey','Beef, lamb & turkey'],['eggs','Eggs'],
 ['paneer','Paneer'],['vegetarian','Vegetarian'],['vegan','Vegan'],['quick','30 min or less'],['high-protein','High protein']
]);

// Cuisines grouped for the region filter. Anything unlisted counts as Europe & Africa.
export const COLLECTION_REGIONS=Object.freeze([
 ['all','All cuisines'],['indian','Indian'],['asian','East & Southeast Asian'],
 ['mediterranean','Mediterranean & Middle Eastern'],['americas','The Americas & Caribbean'],['europe-africa','British, European & African']
]);
const REGION_OF={
 indian:/indian|goan|maharashtrian|kerala|kolkata|andhra|mumbai|hyderabadi|punjabi|bengali|mangalorean|konkan|kashmiri|mughlai|parsi|gujarati|indo-chinese/i,
 asian:/thai|malaysian|vietnamese|singaporean|japanese|chinese|sichuan|indonesian|cantonese|korean|east asian/i,
 mediterranean:/italian|levantine|greek|lebanese|moroccan|north african|turkish|persian|spanish|portuguese|french|middle eastern|cypriot|mediterranean/i,
 americas:/mexican|american|tex-mex|cajun|peruvian|brazilian|cuban|jamaican|caribbean/i
};
export function regionOf(cuisine){
 const c=String(cuisine||'');
 if(/anglo-indian/i.test(c))return 'europe-africa';
 for(const [region,pattern] of Object.entries(REGION_OF))if(pattern.test(c))return region;
 return 'europe-africa';
}

// [id, name, base, minutes, cuisine, protein tag, diet, ingredients, steps]
const R=[
 ['chicken-korma','Mild chicken korma and rice','Rice',40,'Indian','chicken','meat',
  '700 g chicken breast\n260 g dry rice\n300 g plain yoghurt\n40 g cashews\n200 g onion\n15 g ghee\n15 g garlic\n10 g ginger\n8 g mixed spices',
  'Soak the cashews in hot water for 10 minutes, then blend with the yoghurt until smooth.\nCook the rice.\nSoften the sliced onion in ghee, then add garlic, ginger and the spices for a minute.\nAdd bite-size chicken and cook until sealed.\nStir in the cashew yoghurt off the heat, then simmer very gently for 12 minutes so it doesn\'t split.\nCool half quickly for tomorrow\'s lunch. Keeps 2 days in the fridge.'],
 ['chicken-saag','Chicken saag and chapati','Chapati',35,'Indian','chicken','meat',
  '700 g chicken thigh\n450 g spinach\n200 g onion\n15 g garlic\n10 g ginger\n15 g cooking oil\n8 g mixed spices\n8 pcs whole-wheat tortillas',
  'Wilt the spinach with a splash of water, then blend roughly.\nFry the onion in oil until golden, add garlic, ginger and spices.\nAdd the chicken in pieces and brown on all sides.\nStir in the spinach and simmer 15 minutes until the chicken is cooked through.\nWarm the tortillas or chapatis to serve.'],
 ['chicken-tikka-traybake','Chicken tikka traybake with sweet potato','Other',40,'Indian','chicken','meat',
  '700 g chicken breast\n250 g plain yoghurt\n800 g sweet potato\n300 g bell peppers\n200 g red onion\n20 g cooking oil\n10 g mixed spices\n10 g garlic',
  'Mix the yoghurt, garlic and spices, and coat the chicken. Marinate for at least 15 minutes.\nCut the sweet potato into wedges, toss with half the oil and roast at 210 °C for 15 minutes.\nAdd the chicken, peppers and onion with the rest of the oil.\nRoast another 20 minutes until the chicken is cooked through and lightly charred.'],
 ['chicken-peanut-noodles','Chicken and broccoli peanut noodles','Other',25,'East Asian','chicken','meat',
  '650 g chicken breast\n250 g dry rice noodles\n400 g broccoli\n250 g carrots\n200 g bell peppers\n15 g garlic\n10 g ginger\n20 g cooking oil\n35 g peanut butter',
  'Soak or boil the noodles as the pack says, then rinse in cold water.\nWhisk the peanut butter with garlic, ginger and 100 ml hot water for the sauce.\nStir-fry thin strips of chicken in oil until cooked, then set aside.\nStir-fry the vegetables for 4 minutes so they stay crisp.\nToss everything with the noodles and sauce.'],
 ['chicken-mushroom-pasta','Creamy chicken, mushroom and spinach pasta','Pasta',30,'Mediterranean','chicken','meat',
  '650 g chicken breast\n300 g dry pasta\n300 g mushrooms\n200 g spinach\n250 g cottage cheese\n15 g garlic\n15 g cooking oil\n4 g mixed spices',
  'Boil the pasta, keeping a mug of the cooking water.\nBlend the cottage cheese with a little pasta water until smooth.\nBrown the chicken in oil, then add mushrooms and garlic and cook until golden.\nWilt in the spinach, then stir through the pasta and the cottage cheese sauce off the heat. Loosen with pasta water.'],
 ['greek-chicken-bowls','Greek chicken rice bowls with garlic yoghurt','Rice',35,'Mediterranean','chicken','meat',
  '700 g chicken thigh\n260 g dry rice\n300 g cucumber\n200 g red onion\n300 g fat-free Greek yoghurt\n100 g feta\n15 g garlic\n15 g cooking oil\n6 g mixed spices',
  'Rub the chicken with oil, half the garlic and oregano-style spices. Grill or air-fry at 200 °C for 18–20 minutes.\nCook the rice.\nMix the yoghurt with the rest of the garlic and some grated cucumber.\nChop the remaining cucumber and onion, and crumble the feta.\nSlice the chicken and build the bowls. Keep the yoghurt separate for lunch boxes.'],
 ['chicken-fajita-wraps','Chicken fajita wraps','Chapati',25,'Mexican','chicken','meat',
  '650 g chicken breast\n400 g bell peppers\n200 g onion\n8 pcs whole-wheat tortillas\n200 g fat-free Greek yoghurt\n15 g cooking oil\n8 g mixed spices',
  'Slice the chicken, peppers and onion into strips and toss with oil and smoked paprika, cumin and garlic powder.\nCook in a very hot pan in two batches for 8–10 minutes until charred and cooked through.\nWarm the tortillas and serve with the yoghurt.\nFor lunch, pack the filling and wraps separately so they don\'t go soggy.'],
 ['chicken-chickpea-curry','Coconut chicken and chickpea curry','Rice',40,'Indian','chicken','meat',
  '600 g chicken breast\n400 g cooked chickpeas\n200 g light coconut milk\n200 g onion\n200 g spinach\n220 g dry rice\n15 g cooking oil\n10 g garlic\n10 g ginger\n8 g mixed spices',
  'Cook the rice.\nFry the onion until soft, then add garlic, ginger and spices.\nAdd the chicken and seal, then the chickpeas, coconut milk and 150 ml water.\nSimmer 15 minutes, then stir in the spinach until wilted.'],
 ['chicken-biryani','Chicken and pea biryani','Rice',50,'Indian','chicken','meat',
  '700 g chicken thigh\n280 g dry rice\n250 g plain yoghurt\n250 g onion\n150 g peas\n20 g ghee\n10 g ginger\n10 g garlic\n10 g mixed spices',
  'Marinate the chicken in yoghurt, ginger, garlic and spices for 20 minutes or overnight.\nParboil the rinsed rice for 5 minutes and drain.\nFry thinly sliced onion in ghee until deep golden, and keep a third aside.\nCook the chicken with the remaining onion for 10 minutes, add the peas, then layer the rice on top.\nCover tightly and cook on the lowest heat for 20 minutes. Top with the saved onion.'],
 ['chicken-hakka-noodles','Chicken Hakka noodles','Other',25,'Indo-Chinese','chicken','meat',
  '600 g chicken breast\n250 g dry egg noodles\n300 g cabbage\n250 g carrots\n200 g bell peppers\n20 g cooking oil\n15 g garlic\n10 g ginger\n6 g mixed spices',
  'Boil the noodles until just tender, drain and toss with a little oil.\nStir-fry thin strips of chicken in a very hot wok, then set aside.\nStir-fry garlic, ginger and the shredded vegetables for 3 minutes.\nAdd the noodles, chicken, black pepper and a pinch of chilli, and toss on high heat.'],
 ['chicken-quinoa-bowls','Chicken, quinoa and roast vegetable bowls','Other',35,'Mediterranean','chicken','meat',
  '600 g chicken breast\n240 g dry quinoa\n300 g courgette\n300 g bell peppers\n300 g broccoli\n100 g feta\n15 g cooking oil\n10 g garlic\n4 g mixed spices',
  'Rinse the quinoa and simmer in twice its volume of water for 15 minutes.\nRoast the chopped vegetables with oil and garlic at 210 °C for 20 minutes.\nSeason and pan-fry or air-fry the chicken for 15–18 minutes.\nBuild the bowls and crumble the feta over the top.'],
 ['chicken-mushroom-rice','One-pot chicken and mushroom brown rice','Rice',45,'Global','chicken','meat',
  '650 g chicken thigh\n260 g dry brown rice\n300 g mushrooms\n200 g onion\n200 g peas\n15 g cooking oil\n10 g garlic\n4 g mixed spices',
  'Brown the chicken in oil in a large lidded pan and set aside.\nCook the onion, mushrooms and garlic until golden.\nAdd the rice, 650 ml water and the chicken. Cover and simmer for 30 minutes.\nStir in the peas for the last 5 minutes and rest off the heat with the lid on.'],
 ['turkey-keema-matar','Turkey keema matar and chapati','Chapati',35,'Indian','beef-turkey','meat',
  '600 g turkey mince\n250 g peas\n250 g onion\n200 g carrots\n15 g cooking oil\n10 g garlic\n10 g ginger\n8 g mixed spices\n8 pcs whole-wheat tortillas',
  'Fry the onion until golden, then add garlic, ginger and spices.\nAdd the mince and break it up as it browns.\nStir in finely diced carrot and 150 ml water, and simmer 12 minutes.\nAdd the peas and cook 5 minutes more. Serve with warm chapatis.'],
 ['beef-black-bean-chilli','Beef and black bean chilli with rice','Rice',45,'Mexican','beef-turkey','meat',
  '600 g lean beef mince\n400 g cooked black beans\n300 g bell peppers\n250 g onion\n200 g carrots\n240 g dry rice\n15 g cooking oil\n15 g garlic\n10 g mixed spices',
  'Brown the mince in a hot pan and drain off any fat.\nAdd the onion, peppers, grated carrot and garlic and cook until soft.\nStir in cumin, smoked paprika and chilli, then the beans and 250 ml water.\nSimmer 25 minutes until thick. The grated carrot gives body without tomato.\nServe with rice.'],
 ['turkey-meatball-pasta','Turkey meatballs with courgette and spinach pasta','Pasta',35,'Mediterranean','beef-turkey','meat',
  '600 g turkey mince\n300 g dry pasta\n400 g courgette\n200 g spinach\n1 pcs eggs\n15 g cooking oil\n15 g garlic\n6 g mixed spices',
  'Mix the mince, egg, half the garlic and the herbs, and roll into 20 meatballs.\nAir-fry at 200 °C for 12 minutes, or brown in a pan.\nBoil the pasta.\nFry grated courgette with the rest of the garlic until soft and jammy, then wilt in the spinach.\nToss with the pasta, a splash of cooking water and the meatballs.'],
 ['beef-broccoli-bowls','Garlic beef and broccoli rice bowls','Rice',30,'East Asian','beef-turkey','meat',
  '600 g lean beef mince\n260 g dry rice\n400 g broccoli\n200 g carrots\n30 g peanut butter\n15 g garlic\n10 g ginger\n15 g cooking oil',
  'Cook the rice.\nBrown the mince until crisp at the edges.\nAdd garlic and ginger, then the peanut butter loosened with 80 ml hot water.\nSteam or stir-fry the broccoli and carrot ribbons, and serve everything over the rice.'],
 ['salmon-coconut-curry','Coconut salmon curry and rice','Rice',30,'Indian','fish','pescatarian',
  '600 g salmon\n240 g dry rice\n200 g light coconut milk\n300 g spinach\n200 g onion\n10 g ginger\n10 g garlic\n10 g cooking oil\n6 g mixed spices',
  'Cook the rice.\nSoften the onion in oil, then add garlic, ginger and turmeric-based spices.\nPour in the coconut milk and 100 ml water and bring to a gentle simmer.\nAdd chunks of salmon and poach for 6–8 minutes, then fold in the spinach.\nReheat lunch portions gently so the fish stays moist.'],
 ['air-fryer-salmon-potatoes','Air-fryer salmon with potatoes and green beans','Other',35,'Global','fish','pescatarian',
  '600 g salmon\n800 g potatoes\n400 g green beans\n15 g cooking oil\n10 g garlic\n4 g mixed spices',
  'Cut the potatoes into chunks, toss with oil and air-fry at 200 °C for 20 minutes, shaking halfway.\nSeason the salmon with garlic and herbs.\nAdd the salmon for the last 10–12 minutes.\nSteam or boil the green beans for 4 minutes.'],
 ['prawn-pea-pulao','Prawn and pea pulao','Rice',30,'Indian','fish','pescatarian',
  '500 g raw prawns\n260 g dry rice\n250 g peas\n200 g onion\n200 g carrots\n15 g ghee\n10 g ginger\n10 g garlic\n6 g mixed spices',
  'Fry the onion in ghee with whole spices until golden.\nAdd ginger, garlic, diced carrot and the rinsed rice, and stir for a minute.\nAdd 520 ml water, cover and cook on low for 12 minutes.\nTuck in the prawns and peas, cover again and cook 6 minutes until the prawns are pink.\nCool quickly and keep refrigerated. Eat the lunch portion the next day.'],
 ['garlic-prawn-noodles','Garlic prawn noodles','Other',25,'East Asian','fish','pescatarian',
  '500 g raw prawns\n250 g dry egg noodles\n400 g broccoli\n250 g bell peppers\n15 g garlic\n10 g ginger\n20 g cooking oil',
  'Cook the noodles and drain.\nStir-fry the prawns in half the oil until just pink, then set aside.\nStir-fry garlic, ginger, broccoli and peppers for 4 minutes.\nToss in the noodles and prawns with black pepper and a splash of water.'],
 ['fish-tikka-raita','Fish tikka with jeera rice and raita','Rice',35,'Indian','fish','pescatarian',
  '700 g white fish\n450 g plain yoghurt\n260 g dry rice\n300 g cucumber\n15 g cooking oil\n10 g mixed spices\n10 g garlic',
  'Coat the fish in 150 g yoghurt with garlic and spices.\nCook the rice with cumin seeds.\nAir-fry or grill the fish at 200 °C for 10–12 minutes.\nMix the rest of the yoghurt with grated cucumber for the raita.'],
 ['tuna-pasta-bake','Tuna, sweetcorn and broccoli pasta bake','Pasta',35,'British','fish','pescatarian',
  '480 g tinned tuna\n300 g dry pasta\n250 g sweetcorn\n300 g broccoli\n350 g cottage cheese\n2 pcs eggs\n4 g mixed spices',
  'Boil the pasta and add the broccoli for the last 3 minutes. Drain.\nBlend the cottage cheese with the eggs and black pepper.\nMix everything with the drained tuna and sweetcorn in a baking dish.\nBake at 200 °C for 20 minutes until set and golden on top.'],
 ['fish-sweet-potato-traybake','Fish and sweet potato traybake with garlic yoghurt','Other',35,'Global','fish','pescatarian',
  '700 g white fish\n800 g sweet potato\n300 g courgette\n200 g red onion\n250 g fat-free Greek yoghurt\n15 g cooking oil\n10 g garlic\n6 g mixed spices',
  'Roast the sweet potato wedges with oil at 210 °C for 15 minutes.\nAdd the courgette and onion, lay the seasoned fish on top and roast 12 minutes more.\nMix the yoghurt with grated garlic to serve.'],
 ['fish-chips-peas','Air-fryer fish, chips and peas','Other',35,'British','fish','pescatarian',
  '700 g white fish\n900 g potatoes\n300 g peas\n60 g whole-wheat bread\n15 g cooking oil\n6 g mixed spices',
  'Cut the potatoes into chips, toss with most of the oil and air-fry at 200 °C for 22 minutes.\nBlitz the bread into crumbs with the spices and the rest of the oil, and press onto the fish.\nAir-fry the fish for 10–12 minutes until the crumbs are golden.\nBoil the peas and crush them lightly.'],
 ['egg-bhurji-chapati','Egg bhurji with peas and chapati','Chapati',20,'Indian','eggs','vegetarian',
  '12 pcs eggs\n300 g egg white\n250 g peas\n200 g onion\n200 g bell peppers\n10 g cooking oil\n6 g mixed spices\n8 pcs whole-wheat tortillas',
  'Soften the onion and peppers in oil with the spices.\nAdd the peas, then the beaten eggs and egg whites.\nStir gently over a medium heat until just set.\nServe with warm chapatis. For lunch, reheat until piping hot.'],
 ['green-shakshuka','Green shakshuka with peppers, spinach and feta','Other',25,'Mediterranean','eggs','vegetarian',
  '10 pcs eggs\n400 g bell peppers\n300 g spinach\n200 g onion\n100 g feta\n15 g cooking oil\n10 g garlic\n8 g mixed spices\n240 g whole-wheat bread',
  'Cook the onion and sliced peppers in oil until very soft and sweet.\nAdd garlic, cumin and paprika, then wilt in the spinach with a splash of water.\nMake 10 wells, crack in the eggs, cover and cook 6–8 minutes until the whites set.\nCrumble the feta over and serve with toasted bread.\nFor lunch boxes, cook the eggs until firm.'],
 ['egg-fried-rice','Egg fried rice with peas and sweetcorn','Rice',25,'East Asian','eggs','vegetarian',
  '8 pcs eggs\n300 g egg white\n260 g dry rice\n250 g peas\n250 g carrots\n150 g sweetcorn\n20 g cooking oil\n10 g garlic\n10 g ginger',
  'Cook the rice ahead and cool it. Day-old rice fries best.\nScramble the eggs and whites in half the oil, then set aside.\nStir-fry garlic, ginger and the vegetables for 3 minutes.\nAdd the rice and fry on high heat, then fold the egg back in with black pepper and spring onion.'],
 ['kerala-egg-curry','Kerala-style egg curry and rice','Rice',35,'Indian','eggs','vegetarian',
  '12 pcs eggs\n200 g light coconut milk\n250 g onion\n240 g dry rice\n200 g spinach\n10 g cooking oil\n10 g ginger\n10 g garlic\n6 g mixed spices',
  'Hard-boil the eggs for 9 minutes, then cool and peel.\nCook the rice.\nFry the sliced onion slowly until golden, then add ginger, garlic, curry leaves and spices.\nAdd the coconut milk and 100 ml water and simmer 5 minutes.\nAdd the halved eggs and spinach and warm through.'],
 ['paneer-bhurji','Paneer bhurji with peas and chapati','Chapati',20,'Indian','paneer','vegetarian',
  '400 g paneer\n200 g peas\n200 g bell peppers\n200 g onion\n10 g cooking oil\n6 g mixed spices\n8 pcs whole-wheat tortillas',
  'Soften the onion and peppers in oil with cumin and turmeric.\nAdd the peas and a splash of water.\nCrumble in the paneer and stir for 3 minutes.\nServe with warm chapatis.'],
 ['paneer-tikka-bowls','Paneer tikka rice bowls','Rice',35,'Indian','paneer','vegetarian',
  '450 g paneer\n250 g plain yoghurt\n260 g dry rice\n400 g bell peppers\n200 g onion\n10 g cooking oil\n8 g mixed spices',
  'Coat cubes of paneer, peppers and onion in the yoghurt, oil and spices.\nThread onto skewers or spread on a tray, and roast at 220 °C for 15 minutes.\nCook the rice and build the bowls.'],
 ['matar-paneer','Matar paneer and rice','Rice',35,'Indian','paneer','vegetarian',
  '400 g paneer\n300 g peas\n200 g onion\n200 g plain yoghurt\n30 g cashews\n240 g dry rice\n15 g ghee\n10 g ginger\n6 g mixed spices',
  'Blend the onion, cashews and ginger into a paste.\nCook the paste in ghee for 8 minutes until it smells sweet.\nAdd the spices, then the yoghurt off the heat, and loosen with 150 ml water.\nSimmer with the peas for 5 minutes, then add the paneer cubes for 3 minutes.\nServe with rice.'],
 ['moong-sprout-paneer-bowls','Sprouted moong and paneer bowls','Other',15,'Indian','paneer','vegetarian',
  '500 g sprouted green moong\n300 g paneer\n300 g cucumber\n200 g carrots\n150 g onion\n80 g roasted peanuts\n6 g mixed spices',
  'Steam the sprouts for 3 minutes if you prefer them softer, then cool.\nPan-fry the paneer cubes until golden.\nChop the cucumber, carrot and onion, and toss with the sprouts, chaat masala and peanuts.\nTop with the paneer. No reheating needed for lunch.'],
 ['besan-chilla-paneer','Besan chilla with paneer and spinach','Other',30,'Indian','paneer','vegetarian',
  '300 g gram flour (besan)\n250 g paneer\n200 g spinach\n150 g onion\n15 g cooking oil\n6 g mixed spices\n400 g plain yoghurt',
  'Whisk the gram flour with about 400 ml water, spices and finely chopped onion into a pouring batter.\nCook thin pancakes in a lightly oiled pan, 2 minutes per side.\nFill with crumbled paneer and wilted spinach.\nServe with the yoghurt. Reheat lunch chillas in a dry pan.'],
 ['dal-tadka-raita','Toor dal tadka, jeera rice and raita','Rice',35,'Indian','beans','vegetarian',
  '800 g cooked toor dal\n260 g dry rice\n200 g onion\n200 g spinach\n15 g ghee\n10 g garlic\n6 g mixed spices\n400 g fat-free Greek yoghurt\n200 g cucumber',
  'Warm the cooked dal with turmeric and water until creamy, then stir in the spinach.\nCook the rice with cumin.\nFor the tadka, sizzle the garlic, onion and cumin in ghee and pour over the dal.\nMix the yoghurt and cucumber for a high-protein raita.'],
 ['dal-makhani-style','Tomato-free dal makhani and rice','Rice',45,'Indian','beans','vegetarian',
  '700 g cooked urad dal\n300 g cooked kidney beans\n200 g onion\n150 g plain yoghurt\n15 g butter\n220 g dry rice\n10 g ginger\n10 g garlic\n6 g mixed spices',
  'Cook the onion, ginger and garlic in butter until soft.\nAdd the spices, the dal and beans and 300 ml water.\nSimmer for 25 minutes, mashing some against the pan for creaminess.\nStir in the yoghurt off the heat. Serve with rice.'],
 ['rajma-rice','Rajma rice','Rice',40,'Indian','beans','vegan',
  '700 g cooked kidney beans\n260 g dry rice\n250 g onion\n200 g carrots\n15 g cooking oil\n15 g garlic\n10 g ginger\n8 g mixed spices',
  'Fry the onion slowly until deep golden.\nAdd garlic, ginger, finely grated carrot and spices.\nAdd the beans and 300 ml water and simmer 20 minutes, mashing a few beans to thicken.\nServe with rice.'],
 ['chickpea-spinach-chapati','Chickpea and spinach masala with chapati','Chapati',30,'Indian','beans','vegan',
  '800 g cooked chickpeas\n300 g spinach\n250 g onion\n15 g cooking oil\n10 g garlic\n10 g ginger\n8 g mixed spices\n8 pcs whole-wheat tortillas',
  'Fry the onion until golden, then add garlic, ginger and chana masala.\nAdd the chickpeas and 200 ml water, and simmer 10 minutes.\nStir in the spinach until it wilts.\nServe with chapatis.'],
 ['aloo-gobi-chana','Aloo gobi with chickpeas and chapati','Chapati',35,'Indian','beans','vegan',
  '500 g cauliflower\n500 g potatoes\n400 g cooked chickpeas\n200 g onion\n20 g cooking oil\n8 g mixed spices\n8 pcs whole-wheat tortillas',
  'Fry the onion in oil with cumin seeds.\nAdd the potatoes, then the turmeric and spices, cover and cook 10 minutes.\nAdd the cauliflower and chickpeas with a splash of water and cook covered until tender.\nServe with chapatis.'],
 ['lentil-veg-soup','Red lentil and vegetable soup with bread','Other',40,'Global','beans','vegan',
  '300 g dry masoor dal\n300 g carrots\n300 g courgette\n200 g onion\n15 g garlic\n15 g cooking oil\n6 g mixed spices\n240 g whole-wheat bread',
  'Soften the onion, carrot and garlic in oil.\nAdd the rinsed lentils, courgette, spices and 1.2 litres of water.\nSimmer 25 minutes until the lentils collapse, then blend half for body.\nServe with bread. The soup thickens overnight, so loosen with water when reheating.'],
 ['black-bean-burrito-bowls','Black bean and sweet potato burrito bowls','Rice',35,'Mexican','beans','vegan',
  '500 g cooked black beans\n600 g sweet potato\n240 g dry rice\n250 g sweetcorn\n200 g bell peppers\n15 g cooking oil\n8 g mixed spices',
  'Roast the cubed sweet potato and peppers with oil, cumin and smoked paprika at 210 °C for 25 minutes.\nCook the rice.\nWarm the beans and sweetcorn with a pinch of cumin.\nBuild the bowls.'],
 ['peanut-chickpea-noodles','Peanut chickpea and vegetable noodles','Other',25,'East Asian','beans','vegan',
  '400 g cooked chickpeas\n250 g dry rice noodles\n400 g broccoli\n250 g carrots\n60 g peanut butter\n10 g garlic\n10 g ginger\n10 g cooking oil',
  'Cook the noodles and rinse in cold water.\nWhisk the peanut butter, garlic, ginger and 120 ml hot water.\nStir-fry the chickpeas until crisp, then add the vegetables for 4 minutes.\nToss with the noodles and sauce.'],
 ['mushroom-pea-pasta','Mushroom, pea and spinach pasta with cottage cheese sauce','Pasta',25,'Mediterranean','beans','vegetarian',
  '300 g dry whole-wheat pasta\n400 g mushrooms\n250 g peas\n400 g cottage cheese\n150 g spinach\n15 g garlic\n10 g cooking oil',
  'Boil the pasta and add the peas for the last 2 minutes.\nFry the mushrooms in oil until deeply golden, then add garlic and spinach.\nBlend the cottage cheese with a little pasta water.\nToss everything together off the heat.']
];

const normalName=s=>String(s).replace(/whole-wheat/g,'whole wheat').replace(/fat-free/g,'fat free').replace(/Greek/g,'greek').replace(/\(besan\)/,'besan').replace(/\s*\([^)]*\)/g,'');
function parse(lines){
 return lines.split('\n').map(line=>{
  const m=line.match(/^(\d+(?:\.\d+)?)\s*(g|ml|pcs)\s+(.+)$/);
  if(!m)throw Error('Bad ingredient line: '+line);
  return {amount:Number(m[1]),unit:m[2],name:m[3]};
 });
}

let built=null;
export function recipeCollection(){
 if(built)return built;
 built=Object.freeze([...R,...INDIAN_RECIPES,...ASIAN_RECIPES,...MEDITERRANEAN_RECIPES,...GLOBAL_RECIPES].map(([id,name,base,mins,cuisine,protein,diet,ingredients,steps])=>{
  const items=parse(ingredients);
  const estimate=estimateBatchNutrition(items.map(i=>({...i,name:normalName(i.name)})));
  if(!estimate.complete)throw Error('Recipe '+id+' has ingredients without nutrition: '+estimate.missing.join(', '));
  const t=estimate.totals,perServing=Math.round(t.protein/4);
  const tags=new Set(['all',protein]);
  if(diet==='vegetarian'||diet==='vegan')tags.add('vegetarian');
  if(diet==='vegan')tags.add('vegan');
  if(mins<=30)tags.add('quick');
  if(perServing>=35)tags.add('high-protein');
  return Object.freeze({id:'collection-'+id,name,base,mins,cuisine,region:regionOf(cuisine),diet,tags:[...tags],
   ingredients:items,steps:steps.split('\n').map((s,i)=>(i+1)+'. '+s).join('\n'),
   kcal:Math.round(t.kcal),protein:t.protein,carbs:t.carbs,fat:t.fat,fibre:t.fibre});
 }));
 return built;
}
export function filterCollection(list,{tag='all',query='',region='all'}={}){
 const q=String(query).trim().toLowerCase();
 return list.filter(r=>r.tags.includes(tag)&&(region==='all'||r.region===region)&&(!q||(r.name+' '+r.cuisine+' '+r.ingredients.map(i=>i.name).join(' ')).toLowerCase().includes(q)));
}
// A copy for the user's recipe book, which they can edit freely.
export function recipeFromCollection(r){
 return {id:r.id,sourceCollectionId:r.id,name:r.name,base:r.base,mins:r.mins,
  ingredients:r.ingredients.map(i=>({...i})),steps:r.steps,
  kcal:r.kcal,protein:r.protein,carbs:r.carbs,fat:r.fat,fibre:r.fibre};
}
