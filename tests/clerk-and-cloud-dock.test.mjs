import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const js=readFileSync(new URL('../app.js',import.meta.url),'utf8');
const markup=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const css=readFileSync(new URL('../nav-cloud.css',import.meta.url),'utf8');
const clerk=readFileSync(new URL('../clerk-auth.js',import.meta.url),'utf8');
const onboarding=readFileSync(new URL('../first-run.js',import.meta.url),'utf8');
const sw=readFileSync(new URL('../sw.js',import.meta.url),'utf8');

test('mobile navigation has a real cloud silhouette plus four accessible icon controls',()=>{
 assert.match(js,/dock-cloud-surface/);
 assert.match(css,/dock-cloud-surface path/);
 assert.match(css,/\.bottom-btn\.active/);
 assert.match(css,/prefers-reduced-motion/);
 assert.match(css,/calc\(7px \+ env\(safe-area-inset-bottom\)\)/);
 assert.ok(js.includes('aria-label="${label}"'));
 assert.match(js,/\['home','home','Home'\]/);
 assert.match(js,/\['workouts','dumbbell','Workouts'\]/);
 assert.match(js,/\['nutrition','food','Nutrition'\]/);
 assert.match(js,/\['body','chart','Body'\]/);
 assert.match(markup,/nav-cloud\.css/);
 assert.match(sw,/nav-cloud\.css/);
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
 assert.ok(markup.includes('src="./app.js?v=2.5.4-exercise-demo"'));
});
