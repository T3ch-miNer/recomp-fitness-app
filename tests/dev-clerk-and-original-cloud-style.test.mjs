import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=(path)=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const clerkSource=read('clerk-auth.js');
const clerk=await import('data:text/javascript;base64,'+Buffer.from(clerkSource).toString('base64'));
const nav=read('premium.css');
const index=read('index.html');
const premium=read('premium.css');
const onboard=read('first-run.js');
const app=read('app.js');
const warningStyles=read('first-run.css');
const sw=read('sw.js');

test('Clerk development mode remains clearly labelled but can be tested from GitHub Pages',async()=>{
 const previousLocation=globalThis.location,previousWindow=globalThis.window;
 const calls=[];
 try{
  globalThis.location={hostname:'t3ch-miner.github.io',origin:'https://t3ch-miner.github.io',pathname:'/recomp-fitness-app/'};
  globalThis.window={Clerk:{
   load:async(props)=>calls.push(['load',props]),
   openSignIn:(props)=>calls.push(['openSignIn',props]),
   signOut:async()=>calls.push(['signOut']),
   user:null
  }};
  assert.equal(clerk.isClerkDevelopmentMode(),true);
  assert.equal(clerk.isClerkLoginAvailable(),true);
  await clerk.openClerkSignIn();
  assert.equal(calls[0][0],'load');
  assert.equal(calls[1][0],'openSignIn');
  assert.equal(calls[1][1].signInForceRedirectUrl,'https://t3ch-miner.github.io/recomp-fitness-app/');
  assert.equal(clerk.getClerkAccount(),null);
 }finally{
  if(previousLocation===undefined)delete globalThis.location;else globalThis.location=previousLocation;
  if(previousWindow===undefined)delete globalThis.window;else globalThis.window=previousWindow;
 }
});

test('guest remains optional and development warning appears in first-run and Settings',()=>{
 assert.match(onboard,/developmentMode=false/);
 assert.match(onboard,/Development mode/);
 assert.match(onboard,/Continue without signing in/);
 assert.match(app,/developmentMode:isClerkDevelopmentMode\(\)/);
 assert.match(app,/auth-dev-notice/);
 assert.match(app,/Clerk Google login is for testing, not production/);
 assert.match(warningStyles,/first-run-dev-note/);
 assert.match(warningStyles,/auth-dev-notice/);
 assert.ok(!/deleteDatabase|\bindexedDB\b|uploadSnapshot|downloadSnapshot/.test(clerkSource));
});

test('original dark glass dock uses mint accents and restores visible labels',()=>{
 assert.doesNotMatch(app,/dock-cloud-surface/);
 assert.match(nav,/--nav-float:rgba\(13,18,22,\.82\)/);
 assert.match(nav,/color:var\(--accent\)/);
 assert.match(nav,/#recomp-bottom-dock \.bottom-btn\.active \.icon/);
 assert.match(nav,/--accent-glow:/);
 assert.doesNotMatch(index,/nav-capsule\.css|nav-cloud\.css/);
 assert.match(app,/dock-selection/);
 assert.match(app,/<span>\$\{label\}<\/span>/);
});

test('offline app shell caches the same modules without changing IndexedDB',()=>{
 for(const path of ['./clerk-auth.js','./premium.css','./first-run.js','./first-run.css']){
  assert.ok(sw.includes("'"+path+"'"));
 }
 const db=read('db.js');
 assert.match(db,/recomp-fitness-v1/);
 assert.ok(!clerkSource.includes('recomp-fitness-v1'));
});
