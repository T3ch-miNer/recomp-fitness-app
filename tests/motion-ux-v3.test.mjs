import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=f=>readFileSync(new URL('../'+f,import.meta.url),'utf8');
const motion=read('recomp-motion.js');
const app=read('app.js');
const basic=read('basic-onboarding.js');
const css=read('motion-effects.css');

test('Home motivational message fades in, stays readable, and never touches health numbers',()=>{
 assert.doesNotMatch(motion,/scrambleText/,'scrambled letters looked broken on Android');
 assert.doesNotMatch(motion,/innerHTML:/);
 assert.match(motion,/export function playDashboardMotivation[\s\S]{0,400}opacity:\[\.35,1\]/);
 assert.match(app,/data-motion-motivation aria-hidden="true"/);
 assert.match(app,/class="dashboard-intro" role="text" aria-label=/);
 assert.doesNotMatch(app,/class="rings-num"[^>]*data-motion-motivation/);
});
test('plan cards and Basic questions rise in with one consistent, light stagger',()=>{
 assert.match(motion,/playProgrammeCards/);
 assert.match(motion,/waapi\.animate\(cards,\{y:\['14px','0px'\],opacity:\[\.6,1\]/);
 assert.match(motion,/waapi\.animate\(fields,/);
 assert.match(motion,/delay:stagger\(70\)/);
 assert.match(basic,/runMotion\('playBasicProgrammeChoices',root\)/);
 assert.match(app,/runMotion\('playProgrammeCards',page\)/);
});
test('Weight graph glides only when actual history chart is present',()=>{
 assert.match(motion,/root\.querySelector\('\.weight-chart svg'\)/);
 assert.match(motion,/if\(!graph\)return/);
 assert.match(motion,/cubic-bezier\(\.7,\.1,\.5,\.9\)/);
 assert.match(app,/tab==='body'&&bodyPanel==='weight'/);
});
test('Habit checks bounce and bottom navigation reacts, while real streak rules stay unchanged',()=>{
 assert.match(motion,/playHabitCheck/);
 assert.match(motion,/playNavigationFeedback/);
 assert.match(app,/runMotion\('playHabitCheck',updatedHabit\.closest\('label'\)\)/);
 assert.match(app,/runMotion\('playNavigationFeedback',document\.body\)/);
 assert.match(app,/currentStreak>previousStreak/);
});
test('motion is not repeated on every tracking re-render or enabled for reduced motion',()=>{
 assert.match(motion,/prefers-reduced-motion: reduce/);
 for(const name of ['playDashboardMotivation','playProgrammeCards','playBasicProgrammeChoices','playBodyTrend','playHabitCheck','playNavigationFeedback'])
  assert.match(motion,new RegExp('export function '+name));
 assert.match(app,/if\(pageKey!==lastMotionPage\)/);
 assert.match(app,/if\(!modal && !confirmation\)/);
 assert.match(motion,/from '\.\/anime\.esm\.min\.js'/);
});
test('pre-existing Session banked celebration and rest timer are retained exactly',()=>{
 assert.match(motion,/export function playWorkoutSuccess/);
 assert.match(app,/runMotion\('playWorkoutSuccess',document\.getElementById\('recomp-workout-win'\)\)/);
 assert.match(app,/modalShell\('Session banked'/);
 assert.match(motion,/createTimer\(\{/);
 assert.match(css,/recomp-workout-win/);
});
