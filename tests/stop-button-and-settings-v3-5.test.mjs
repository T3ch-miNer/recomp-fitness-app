import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {nextBackStep} from '../back-navigation.js';

const read=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
const app=read('app.js');

test('the floating workout bar has a stop button that offers Save, Discard or Cancel',()=>{
 assert.match(app,/<button type="button" class="mini-workout-stop" data-action="stop-workout" aria-label="Stop workout"/);
 assert.match(app,/case 'stop-workout':if\(state\.session\)\{restSheet=false;modal=\{type:'stop-workout'\}/);
 const view=app.slice(app.indexOf('function stopWorkoutView(){'),app.indexOf('function modalView(){'));
 const save=view.indexOf('data-action="stop-save"'),discard=view.indexOf('data-action="stop-discard"'),cancel=view.indexOf('data-action="close-modal">Cancel');
 assert.ok(save>0&&discard>save&&cancel>discard,'Save, then Discard, then Cancel');
 assert.match(view,/\$\{done\?'':'disabled/,'Save needs at least one completed set');
});

test('Save from the stop dialog saves without asking twice; Discard clears only the session',()=>{
 assert.match(app,/async function finishWorkout\(\{confirmed=false\}=\{\}\)/);
 assert.match(app,/if\(!confirmed&&!await confirmInApp\('Finish this workout/);
 assert.match(app,/case 'stop-save':modal=null;render\(\);await finishWorkout\(\{confirmed:true\}\);/);
 assert.match(app,/case 'stop-discard':if\(state\.session\)\{modal=null;musclePage=false;state\.session=null;/);
});

test('Android Back closes a Settings page before leaving Settings',()=>{
 assert.equal(nextBackStep({tab:'settings',settingsPage:'reminders',previousPage:'home'}),'close-settings-page');
 assert.equal(nextBackStep({tab:'settings',settingsPage:null,previousPage:'body'}),'previous-page');
 assert.equal(nextBackStep({tab:'home',settingsPage:'reminders'}),'ask-exit','a stale page is ignored outside Settings');
 assert.match(app,/case 'close-settings-page':settingsPage=null;/);
 assert.match(app,/if\(dest==='settings'\|\|tab==='settings'\)settingsPage=null;/,'Settings always opens on its menu');
});

test('You uses the shared page header, so theme and settings buttons are there too',()=>{
 assert.match(app,/renderYouPage\(\{headerHtml:heading\('You\.','Small daily wins, without the pressure\.'\)/);
 assert.match(read('you-page.js'),/\$\{headerHtml\|\|'<header class="you-header">/);
});
