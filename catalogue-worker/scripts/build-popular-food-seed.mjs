// From the repo root:
// node catalogue-worker/scripts/build-popular-food-seed.mjs > catalogue-worker/seed-popular-foods.sql
// npx wrangler d1 execute recomp-catalogue --remote --file=catalogue-worker/seed-popular-foods.sql
// Only shared, approximate recipe estimates. No personal/medical data or credentials.
import {SUPPLEMENTAL_RECIPE_ESTIMATES} from '../../popular-foods.js';
const quote=s=>"'"+String(s??'').replaceAll("'","''")+"'";
const sql=['-- Additional popular and Indian dishes, calculated from Recomp approximate ingredient references.',
 '-- Recipe yields, cooking oil and household ingredients vary. These are not verified nutrition facts.',
 '-- All values are estimates PER 100g; INSERT OR IGNORE never overwrites owner edits.'];
for(const f of SUPPLEMENTAL_RECIPE_ESTIMATES){
 const n=k=>{
  const value=Number(f.per100[k]);
  if(!Number.isFinite(value)||value<0||value>1000)throw Error('Invalid nutrient: '+k+' in '+f.id);
  return value;
 };
 sql.push('INSERT OR IGNORE INTO foods(id,name,category,aliases,default_grams,calories,protein,carbs,fat,fibre,source) VALUES ('+
 [quote(f.id),quote(f.name),quote(f.category),quote(f.aliases),f.defaultGrams,
 n('calories'),n('protein'),n('carbs'),n('fat'),n('fibre'),quote(f.source)].join(',')+');');
}
process.stdout.write(sql.join('\n')+'\n');
process.stderr.write('Generated '+SUPPLEMENTAL_RECIPE_ESTIMATES.length+' additional estimated Indian and global foods.\n');
