import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=readFileSync(new URL('../first-run.js',import.meta.url),'utf8');
const {FIRST_RUN_KEY,shouldOfferFirstRun}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
const serviceWorker=readFileSync(new URL('../sw.js',import.meta.url),'utf8');
const index=readFileSync(new URL('../index.html',import.meta.url),'utf8');

test('welcome is offered only to genuine new users',()=>{
 assert.equal(typeof FIRST_RUN_KEY,'string');
 assert.equal(shouldOfferFirstRun(),true);
 assert.equal(shouldOfferFirstRun({hasSavedState:true}),false);
 assert.equal(shouldOfferFirstRun({hasChoice:true}),false);
 assert.equal(shouldOfferFirstRun({hasSession:true}),false);
 assert.equal(shouldOfferFirstRun({hasOAuthCallback:true}),false);
 assert.equal(shouldOfferFirstRun({hasSavedState:true,hasChoice:false,hasSession:false}),false);
});

test('first launch supports Google and guest without making login mandatory',()=>{
 assert.ok(source.includes('Continue with Google'));
 assert.ok(source.includes('Continue without signing in'));
 assert.ok(source.includes("guest.addEventListener('click',finishGuest)"));
 assert.ok(source.includes("google.addEventListener('click',async()=>"));
 assert.ok(source.includes("overlay.remove()"));
 assert.ok(source.includes('aria-modal="true"'));
 assert.ok(app.includes('hasSavedState:hadSavedState'));
 assert.ok(app.includes("localStorage.setItem(FIRST_RUN_KEY,'guest')"));
 assert.ok(app.includes('cloud.getSession()'));
 assert.ok(app.includes('cloud.startGoogleLogin()'));
});

test('existing IndexedDB records are not changed by welcome',()=>{
 assert.ok(!/indexedDB|deleteDatabase|objectStore\(|\.clear\(/.test(source));
 assert.ok(!source.includes("localStorage.removeItem"));
 assert.ok(!source.includes("get('state')"));
 assert.ok(app.includes('state=hadSavedState?saved:INITIAL()'));
});

test('offline cache includes onboarding module and stylesheet',()=>{
 assert.ok(serviceWorker.includes("'./first-run.js'"));
 assert.ok(serviceWorker.includes("'./first-run.css'"));
 assert.ok(index.includes('./first-run.css?v=2.5.1-guest-first'));
});

test('successful Clerk modal launch removes the guest welcome, blocked setup does not',async()=>{
 const {showFirstRunWelcome}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
 const previous=globalThis.document;
 async function attempt(status){
  let removed=false,handler=null,guestFocused=false;
  const guest={focus(){guestFocused=true},addEventListener(){}};
  const google={disabled:false,setAttribute(){},removeAttribute(){},addEventListener(kind,fn){if(kind==='click')handler=fn;}};
  const error={hidden:true,textContent:''};
  const overlay={
   innerHTML:'',addEventListener(){},remove(){removed=true},
   querySelector(selector){return selector.includes('google')?google:selector.includes('guest')?guest:error;}
  };
  globalThis.document={getElementById(){return null},createElement(){return overlay},body:{appendChild(){}}};
  showFirstRunWelcome({onGuest(){},onGoogle:async()=>status});
  assert.equal(guestFocused,true);
  await handler();
  return {removed,shown:!error.hidden,disabled:google.disabled};
 }
 try{
  const opened=await attempt(undefined);
  assert.equal(opened.removed,true,'Clerk modal should not be covered by guest welcome');
  assert.equal(opened.disabled,false);
  const blocked=await attempt('Clerk is not configured');
  assert.equal(blocked.removed,false,'Failed login should keep the guest option available');
  assert.equal(blocked.shown,true);
 }finally{
  if(previous===undefined)delete globalThis.document;
  else globalThis.document=previous;
 }
});
