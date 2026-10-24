import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const get=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const backSrc=get('workout-back.js');
const dialogSrc=get('confirmation-dialog.js');
const app=get('app.js'),css=get('workout-polish.css'),index=get('index.html'),sw=get('sw.js');
const back=await import('data:text/javascript;base64,'+Buffer.from(backSrc).toString('base64'));
const {confirmationHtml}=await import('data:text/javascript;base64,'+Buffer.from(dialogSrc).toString('base64'));

test('focused Android browser Back uses one same-origin history sentinel',()=>{
 let focus=false,handler=null,historyWrites=0,backCalls=0;
 const history={state:{origin:'existing'},pushState(data){historyWrites++;this.state=data;}};
 const guard=back.createWorkoutBackGuard({
  history,subscribe:(event,cb)=>{assert.equal(event,'popstate');handler=cb;},
  shouldGuard:()=>focus,onBack:()=>{backCalls++;focus=false;return false;}
 });
 guard.arm();assert.equal(historyWrites,0,'should not trap Back outside workouts');
 focus=true;guard.arm();guard.arm();guard.arm();
 assert.equal(historyWrites,1,'repeat renders must never stack history entries');
 assert.equal(history.state.origin,'existing','unrelated state must be preserved');
 assert.equal(history.state.recompWorkoutBackGuard,true);
 handler({state:{origin:'existing'}});
 assert.equal(backCalls,1);
 guard.arm();assert.equal(historyWrites,1,'minimised session must not add another entry');
});

test('Back closes an exercise overlay first, then minimises the session',()=>{
 let focus=true,panel=true,handler=null,entries=0;
 const history={state:null,pushState(value){this.state=value;entries++}};
 const guard=back.createWorkoutBackGuard({history,subscribe:(_,cb)=>{handler=cb;},shouldGuard:()=>focus,
  onBack:()=>{if(panel){panel=false;return true;}focus=false;return false;}
 });
 guard.arm();assert.equal(entries,1);
 handler();assert.equal(panel,false);assert.equal(focus,true);
 assert.equal(entries,2,'overlay closing restores the Back guard');
 handler();assert.equal(focus,false);
 assert.equal(entries,2,'after minimising, no new trap is added');
});

test('confirmation UI escapes text and provides cancel and explicit destructive action',()=>{
 const html=confirmationHtml({title:'Discard <workout>?',message:'Remove "set"? <script>bad</script>',approveLabel:'Discard workout',danger:true});
 assert.match(html,/role="alertdialog"/);
 assert.match(html,/aria-modal="true"/);
 assert.match(html,/data-action="confirm-cancel"/);
 assert.match(html,/data-action="confirm-accept"/);
 assert.match(html,/&lt;workout&gt;/);
 assert.match(html,/&lt;script&gt;/);
 assert.match(html,/Discard workout/);
 assert.doesNotMatch(html,/<script>/);
});

test('workout controls use in-app confirmations and persist Back minimisation',()=>{
 assert.match(app,/createWorkoutBackGuard\(/);
 assert.match(app,/onBack:\(\)=>/);
 assert.match(app,/state\.session\.minimized=true;restSheet=false/);
 assert.match(app,/persist\(\)\.catch\(console\.error\)/);
 assert.match(app,/confirmation\?confirmationHtml\(confirmation\):''/);
 assert.match(app,/case 'confirm-accept':settleConfirmation\(true\)/);
 assert.match(app,/case 'confirm-cancel':settleConfirmation\(false\)/);
 assert.match(app,/await confirmInApp\('Discard this unfinished workout/);
 assert.match(app,/await confirmInApp\('Restore this backup/);
 assert.match(app,/await confirmInApp\('Delete this food entry/);
 assert.ok(!/\b(?:window\.)?(?:confirm|alert|prompt)\s*\(/.test(app),'native blocking dialogs must all be gone');
 assert.ok(!/indexedDB|deleteDatabase|\bclear\(/.test(backSrc+dialogSrc),'UI modules must not modify fitness records');
});

test('16px editable kg/reps, themed dialog and updated offline shell',()=>{
 assert.match(css,/\.workout-card input\.set-input\[data-setfield\]/);
 assert.match(css,/font-size:16px!important/);
 assert.match(css,/recomp-confirm-dialog/);
 assert.match(css,/var\(--panel\)/);
 assert.match(index,/workout-polish\.css\?v=2\.5\.5/);
 assert.match(index,/app\.js\?v=2\.8\.10-recomp-pulse/);
 for(const name of ['workout-back.js','confirmation-dialog.js','workout-polish.css']){
  assert.ok(sw.includes("'./"+name+"'"),name+' must be included offline');
 }
});

test('recipe planner uses themed confirmations and manual-copy fallback instead of system prompts',()=>{
 const planner=get('meal-planner.js');
 assert.match(planner,/confirmStandalone\(/);
 assert.match(planner,/showCopyPanel\(list\)/);
 assert.match(dialogSrc,/export function confirmStandalone\(/);
 assert.match(dialogSrc,/export function showCopyPanel\(/);
 assert.ok(!/\b(?:window\.)?(?:confirm|alert|prompt)\s*\(/.test(planner));
 assert.match(css,/recomp-copy-text/);
 assert.ok(!/indexedDB|deleteDatabase|\bclear\(/.test(dialogSrc));
});
