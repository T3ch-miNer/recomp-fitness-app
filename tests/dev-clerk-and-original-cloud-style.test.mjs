import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=(path)=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const clerkSource=read('clerk-auth.js');
const clerk=await import('data:text/javascript;base64,'+Buffer.from(clerkSource).toString('base64'));
const nav=read('nav-cloud.css');
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

test('cloud keeps its shape but restores the original premium mint colours and labels',()=>{
 assert.match(app,/dock-cloud-surface/);
 assert.match(nav,/\.dock-cloud-surface path/);
 assert.match(nav,/fill:var\(--nav-float\)/);
 assert.match(nav,/color:var\(--accent\)!important/);
 assert.match(nav,/color:var\(--muted\)!important/);
 assert.match(nav,/\.bottom-btn span/);
 assert.match(nav,/clip:auto!important/);
 assert.match(nav,/font-size:10\.5px!important/);
 assert.match(premium,/--nav-float:/);
 assert.match(premium,/--accent-glow:/);
 assert.ok(!nav.includes('#cdb7ff'),'purple buttons must be removed');
});

test('offline app shell caches the same modules without changing IndexedDB',()=>{
 for(const path of ['./clerk-auth.js','./nav-cloud.css','./first-run.js','./first-run.css']){
  assert.ok(sw.includes("'"+path+"'"));
 }
 const db=read('db.js');
 assert.match(db,/recomp-fitness-v1/);
 assert.ok(!clerkSource.includes('recomp-fitness-v1'));
});
