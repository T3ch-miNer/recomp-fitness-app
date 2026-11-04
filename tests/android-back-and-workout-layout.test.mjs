import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {nextBackStep,createPageTrail} from '../back-navigation.js';
import {renderMuscleFocusLink} from '../muscle-focus.js';
import {warmupView} from '../warmup.js';

const read=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
const app=read('app.js');

test('Android Back closes what is on top first, then minimises a focused workout',()=>{
 assert.equal(nextBackStep({confirmation:true,modal:true,workoutFocused:true}),'close-confirmation');
 assert.equal(nextBackStep({modal:true,workoutFocused:true}),'close-modal');
 assert.equal(nextBackStep({restSheet:true,workoutFocused:true}),'close-rest');
 assert.equal(nextBackStep({musclePage:true,workoutFocused:true}),'close-muscle-page');
 assert.equal(nextBackStep({workoutFocused:true,tab:'workouts',previousPage:'settings'}),'minimise-workout','a workout is never discarded by Back');
});

test('Android Back returns to the previous page, then Home, then asks before exiting',()=>{
 assert.equal(nextBackStep({tab:'settings',previousPage:'workouts'}),'previous-page');
 assert.equal(nextBackStep({tab:'workouts',historyPanel:'workouts',previousPage:'home'}),'close-history');
 assert.equal(nextBackStep({tab:'body',previousPage:null}),'home');
 assert.equal(nextBackStep({tab:'body',previousPage:'body'}),'home');
 assert.equal(nextBackStep({tab:'home',previousPage:null}),'ask-exit');
 assert.equal(nextBackStep({tab:'home',previousPage:'home'}),'ask-exit');
});

test('page trail remembers where you came from, newest first, without repeats',()=>{
 const trail=createPageTrail(3);
 trail.leave('home');trail.leave('home');trail.leave('workouts');trail.leave('settings');trail.leave('body');
 assert.equal(trail.size,3);
 assert.equal(trail.pop(),'body');
 assert.equal(trail.pop(),'settings');
 assert.equal(trail.previous(),'workouts');
 trail.clear();
 assert.equal(trail.previous(),null);
});

test('the APK registers one Back handler with an exit prompt; the website keeps browser history',()=>{
 assert.match(app,/nativeApp\.addListener\('backButton'/);
 assert.match(app,/title:'Exit Recomp\?',approveLabel:'Yes, exit',cancelLabel:'No'/);
 assert.match(app,/exitApp/);
 assert.match(app,/if\(!nativeBack\)\{\n pageHistory=createPageHistory/);
 assert.ok(JSON.parse(read('package.json')).dependencies['@capacitor/app']);
 assert.match(read('confirmation-dialog.js'),/cancelLabel='Cancel'/);
});

test('the muscle map lives on its own page behind one compact row',()=>{
 const link=renderMuscleFocusLink([{name:'Leg Press',sets:[{},{},{}]},{name:'Seated Cable Row',sets:[{},{}]}]);
 assert.match(link,/data-action="open-muscle-focus"/);
 assert.match(link,/Muscles worked/);
 assert.doesNotMatch(link,/<svg/,'no body diagram inside the workout');
 assert.equal(renderMuscleFocusLink([]),'');
 assert.match(app,/\$\{!roundMode\?renderMuscleFocusLink\(s\.exercises\):''\}/);
 assert.match(app,/if\(musclePage\)return musclePageView\(s\)/);
 assert.match(app,/case 'close-muscle-focus'/);
});

test('warm-up shrinks to one row once done or skipped, and coach notes start collapsed',()=>{
 const skipped=warmupView({warmupStatus:'skipped'});
 assert.match(skipped,/recomp-warmup compact skipped/);
 assert.match(skipped,/Warm-up skipped/);
 assert.match(skipped,/data-action="warmup-reset"/);
 assert.doesNotMatch(skipped,/17 movements/);
 assert.match(warmupView({warmupStatus:'done'}),/Warm-up done/);
 assert.match(warmupView({warmupStatus:'pending'}),/data-action="warmup-show-video"/);
 assert.match(app,/<details class="giant-coach-notes"><summary>\$\{String\(s\.templateId\|\|''\)\.startsWith\('fts-'\)\?'Coach notes from FTS':'Coach notes'\}/);
});
