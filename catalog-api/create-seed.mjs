// Run from repo root: node catalog-api/create-seed.mjs
// Exports public bundled food estimates and the base FTS workout plans to SQL.
// Never exports personal records (the app's IndexedDB is not accessed).
import {writeFileSync} from 'node:fs';
import {FOOD_ITEMS} from '../food-db.js';
import {FTS_WORKOUTS} from '../fts-workouts.js';
const quote=value=>"'"+String(value).replaceAll("'","''")+"'";
const rows=[];
for(const food of FOOD_ITEMS){
 const data={id:food.id,name:food.name,aliases:Array.isArray(food.aliases)?food.aliases:
  String(food.aliases||'').split(/[;,]/).map(v=>v.trim()).filter(Boolean),
  category:food.category,per100:food.per100,defaultGrams:food.defaultGrams,
  ingredients:food.ingredients||[],yieldGrams:food.yieldGrams,source:food.source};
 rows.push('INSERT OR IGNORE INTO catalog_foods(id,payload_json) VALUES('+quote(data.id)+','+quote(JSON.stringify(data))+');');
}
for(const plan of FTS_WORKOUTS){
 const data={id:plan.id,name:plan.name,subtitle:plan.subtitle||'',notes:plan.notes||'',items:plan.items};
 rows.push('INSERT OR IGNORE INTO catalog_workouts(id,payload_json) VALUES('+quote(data.id)+','+quote(JSON.stringify(data))+');');
}
const sql='-- Generated Recomp public seed data; no personal records.\n'+rows.join('\n')+'\n';
const out=process.argv[2]||'catalog-api/seed.generated.sql';
writeFileSync(out,sql);
process.stdout.write('Wrote '+FOOD_ITEMS.length+' sample foods and '+FTS_WORKOUTS.length+' base workouts to '+out+'\n');
