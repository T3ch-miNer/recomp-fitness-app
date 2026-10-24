import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const js=readFileSync(new URL('../app.js',import.meta.url),'utf8');
const markup=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const css=readFileSync(new URL('../premium.css',import.meta.url),'utf8');
const clerk=readFileSync(new URL('../clerk-auth.js',import.meta.url),'utf8');
const onboarding=readFileSync(new URL('../first-run.js',import.meta.url),'utf8');
const sw=readFileSync(new URL('../sw.js',import.meta.url),'utf8');

test('mobile navigation uses original mint glass and labelled controls, without the white override',()=>{
 assert.doesNotMatch(js,/dock-cloud-surface/);
 assert.match(css,/--nav-float:rgba\(13,18,22,\.82\)/);
 assert.match(css,/#recomp-bottom-dock\.bottom-nav\.premium-dock/);
 assert.match(css,/backdrop-filter:blur\(22px\) saturate\(160%\)/);
 assert.match(css,/\.dock-selection/);
 assert.match(css,/\.bottom-btn\.active \.icon/);
 assert.ok(js.includes('aria-label="${label}"'));
 for(const id of ['home','workouts','nutrition','body'])assert.match(js,new RegExp("\\['"+id+"'"));
 assert.match(markup,/premium\.css/);
 assert.doesNotMatch(markup,/nav-capsule\.css|nav-cloud\.css/);
 assert.match(sw,/premium\.css/);
 assert.doesNotMatch(sw,/nav-capsule\.css|nav-cloud\.css/);
});

test('Clerk account is optional and separated from existing private backups',()=>{
 assert.match(js,/getClerkAccount\(\)/);
 assert.match(js,/case 'clerk-login':/);
 assert.match(js,/case 'clerk-signout':/);
 assert.match(js,/case 'clerk-setup':/);
 assert.match(js,/case 'google-login':/);
 assert.match(js,/Advanced cloud backup/);
 assert.match(js,/const hadSavedState=/);
 assert.match(js,/hasSavedState:hadSavedState/);
 assert.match(onboarding,/Continue without signing in/);
 assert.match(onboarding,/Optional Google sign-in uses Clerk/);
 assert.match(js,/await openClerkSignIn\(\)/);
 assert.match(js,/No authentication/);
 assert.match(js,/clerkClient\.addListener/);
 assert.match(js,/getElementById\('recomp-first-run'\)\?\.remove\(\)/);
});

test('Clerk integration requires a public key; no secrets or record migration',()=>{
 // A public Clerk key may be configured later; no test should require it to stay blank.
 assert.match(clerk,/export const CLERK_PUBLISHABLE_KEY=/);
 assert.match(clerk,/const KEY='recomp-clerk-publishable-key-v1'/);
 assert.match(clerk,/pk_\(test\|live\)/);
 assert.ok(!/sk_(?:test|live)_[A-Za-z0-9]+/.test(clerk));
 assert.ok(!/indexedDB|deleteDatabase|uploadSnapshot|downloadSnapshot/.test(clerk));
 assert.ok(!/fetch\(.*health/.test(clerk));
 assert.match(sw,/clerk-auth\.js/);
 assert.ok(markup.includes('src="./app.js?v=2.9.3-universal-warmup"'));
});
