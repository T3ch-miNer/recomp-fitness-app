// One-time seeding of the public D1 catalogue with bundled Recomp estimates and FTS plans.
// Run: node catalogue-worker/scripts/build-seed.mjs > catalogue-worker/seed-catalogue.sql
// Then import the generated SQL in Cloudflare D1 (or Wrangler d1 execute --file).
// INSERT OR IGNORE preserves owner edits if a seed is accidentally rerun.
import {FOOD_ITEMS} from '../../food-db.js';
import {FTS_WORKOUTS} from '../../fts-workouts.js';
const q=value=>"'"+String(value??'').replaceAll("'","''")+"'";
const val=value=>{
 const n=Number(value);
 if(!Number.isFinite(n)||n<0||n>10000)throw Error('Invalid public catalogue number');
 return n;
};
const sql=['-- Recomp public catalogue seed. Estimates are for review, not lab-verified.',
 '-- Import only into your public recomp-catalogue database; never into personal-data tables.',
 'BEGIN TRANSACTION;'];
for(const food of FOOD_ITEMS){
 const p=food.per100;
 sql.push('INSERT OR IGNORE INTO foods (id,name,category,aliases,default_grams,calories,protein,carbs,fat,fibre,source) VALUES ('+
 [q(food.id),q(food.name),q(food.category),q(food.aliases),val(food.defaultGrams),
 val(p.calories),val(p.protein),val(p.carbs),val(p.fat),val(p.fibre),q(food.source)].join(',')+');');
}
for(const [index,plan] of FTS_WORKOUTS.entries()){
 const items=plan.items.map(item=>JSON.parse(JSON.stringify(item)));
 sql.push('INSERT OR IGNORE INTO workout_plans (id,name,subtitle,items_json,sort_order) VALUES ('+
 [q(plan.id),q(plan.name),q(plan.subtitle),q(JSON.stringify(items)),index+1].join(',')+');');
}
const exercises=new Map();
for(const plan of FTS_WORKOUTS)for(const item of plan.items){
 if(!item?.[0]||!item?.[1])continue;
 const id=String(item[0]);
 if(!exercises.has(id)){
  const note=typeof item[8]==='string'?item[8]:'';
  exercises.set(id,{name:String(item[1]),guidance:note});
 }
}
for(const [id,{name,guidance}] of exercises){
 sql.push('INSERT OR IGNORE INTO exercises (id,name,muscle_group,equipment,guidance) VALUES ('+
 [q(id),q(name),q(''),q(''),q(guidance)].join(',')+');');
}
sql.push('COMMIT;');
process.stdout.write(sql.join('\n')+'\n');
process.stderr.write('Generated seed: '+FOOD_ITEMS.length+' foods, '+FTS_WORKOUTS.length+' workout plans, '+exercises.size+' exercise entries.\n');
