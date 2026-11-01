import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createPageHistory} from '../page-history.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
function mockBrowser(){
 const states=[{}],listeners={},history={
  state:states[0],index:0,
  replaceState(state){states[this.index]=state;this.state=state;},
  pushState(state){states.splice(++this.index);states.push(state);this.state=state;},
  back(){if(this.index>0){this.index--;this.state=states[this.index];listeners.popstate?.({state:this.state});}}
 };
 return {history,subscribe:(type,listener)=>listeners[type]=listener};
}
test('hardware Back from Settings returns Home instead of closing the WebView',()=>{
 const browser=mockBrowser(),visited=[];
 const nav=createPageHistory({...browser,initialPage:'home',onNavigate:page=>visited.push(page)});
 assert.equal(nav.visit('settings'),true);
 assert.equal(browser.history.index,1);
 browser.history.back();
 assert.deepEqual(visited,['home']);
 assert.equal(nav.getCurrent(),'home');
});
test('reopened Settings has a Home history root, and workouts Back guard keeps control of duplicate entries',()=>{
 const browser=mockBrowser(),visited=[];
 const nav=createPageHistory({...browser,initialPage:'settings',onNavigate:page=>visited.push(page)});
 browser.history.back();
 assert.deepEqual(visited,['home']);
 nav.visit('workouts');
 browser.history.pushState({...browser.history.state,recompWorkoutBackGuard:true});
 browser.history.back(); // Same page: the workout sentinel, not this router, handles it.
 assert.deepEqual(visited,['home']);
});
test('main headings scramble on all pages but old workout celebration is unchanged',()=>{
 const app=read('app.js'),motion=read('motion-effects.source.js');
 assert.match(motion,/export function playPageHeading\(root\)/);
 assert.match(motion,/\.top \.page-title, \.you-header \.page-title, \.workout-title-block \.page-title/);
 assert.match(motion,/innerHTML:scrambleText/);
 assert.match(motion,/title\.setAttribute\('aria-label',original\)/);
 assert.match(motion,/prefersLessMotion\(\)/);
 assert.match(app,/runMotion\('playPageBody',page\)/);
 assert.match(app,/runMotion\('playPageTitle',page\)/);
 assert.doesNotMatch(app,/runMotion\('playDashboardMotivation',page\)/);
 assert.match(app,/runMotion\('playWorkoutSuccess',document\.getElementById\('recomp-workout-win'\)\)/);
});
test('Settings Google login reports failures and Android identity is checked on return',()=>{
 const app=read('app.js'),native=read('android-health-connect/RecompAuthPlugin.kt');
 assert.match(app,/case 'clerk-login'/);
 assert.match(app,/data-clerk-login-error/);
 assert.match(app,/clerkSignInBusy/);
 assert.match(app,/refreshNativeAccountAfterReturn/);
 assert.match(app,/await restoreNativeClerkAccount\(\)/);
 assert.match(native,/Clerk\.activeUser == null/);
 assert.match(native,/Google sign-in couldn't complete/);
 assert.match(app,/pageHistory=createPageHistory/);
 assert.match(app,/pageHistory\?\.visit\(dest\)/);
 assert.match(app,/case 'settings-home'/);
 assert.match(read('sw.js'),/page-history\.js/);
});
