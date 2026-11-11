import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {dirname,resolve} from 'node:path';
import {FOOD_ITEMS} from '../food-db.js';
import {FTS_WORKOUTS} from '../fts-workouts.js';
import {FTS_WORKOUTS_5_TO_15} from '../fts-workouts-5-15.js';
import {FTS_WORKOUTS_16_TO_41} from '../fts-workouts-16-41.js';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
test('Cloudflare D1 seed contains current food estimates and all 41 workouts, with no personal data',()=>{
 const run=spawnSync(process.execPath,['catalogue-worker/scripts/build-seed.mjs'],{
  cwd:root,encoding:'utf8',maxBuffer:12*1024*1024
 });
 assert.equal(run.status,0,run.stderr);
 const sql=run.stdout;
 const expectedWorkouts=[...FTS_WORKOUTS,...FTS_WORKOUTS_5_TO_15,...FTS_WORKOUTS_16_TO_41];
 assert.equal(expectedWorkouts.length,41);
 const foodRows=[...sql.matchAll(/^INSERT OR IGNORE INTO foods /gm)];
 const workoutRows=[...sql.matchAll(/^INSERT OR IGNORE INTO workout_plans /gm)];
 const exerciseRows=[...sql.matchAll(/^INSERT OR IGNORE INTO exercises /gm)];
 assert.equal(foodRows.length,FOOD_ITEMS.length);
 assert.equal(workoutRows.length,41);
 assert.ok(exerciseRows.length>75,'expect genuine exercise library entries');
 for(let i=1;i<=41;i++)
  assert.match(sql,new RegExp("'fts-workout-"+i+"',"),'must include workout '+i);
 for(const line of sql.split('\n').filter(s=>s.startsWith('INSERT ')))
  assert.match(line,/^INSERT OR IGNORE/,'never overwrite owner-edited rows');
 assert.doesNotMatch(sql,/^(BEGIN|COMMIT|DELETE|UPDATE|DROP|REPLACE)\b/gm);
 assert.match(run.stderr,/41 workout plans \(1–41\)/);
 assert.doesNotMatch(sql,/HF_TOKEN|SCAN_ACCESS_TOKEN|Authorization:/);
});
