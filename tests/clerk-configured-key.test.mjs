import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=readFileSync(new URL('../clerk-auth.js',import.meta.url),'utf8');
const auth=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));

test('Clerk public key is configured for the selected instance with a valid frontend domain',()=>{
 const key=auth.getClerkKey();
 assert.match(key,/^pk_(test|live)_[A-Za-z0-9_-]{15,}$/);
 const host=auth.clerkDomain(key);
 assert.ok(host && /^(?:[a-z0-9-]+\.)+[a-z]{2,}$/i.test(host));
 assert.ok(!host.includes('/'));
 assert.equal(key,auth.CLERK_PUBLISHABLE_KEY);
 if(key.startsWith('pk_test_')){
  assert.match(host,/\.clerk\.accounts\.dev$/,'development key should use Clerk development frontend domain');
 }
});

test('frontend loader imports official Clerk v6 browser bundle with optional Google account',()=>{
 assert.match(source,/\/npm\/@clerk\/ui@1\/dist\/ui\.browser\.js/);
 assert.match(source,/\/npm\/@clerk\/clerk-js@6\/dist\/clerk\.browser\.js/);
 assert.match(source,/data-clerk-publishable-key/);
 assert.match(source,/openSignIn\(/);
 assert.match(source,/signOut\(/);
 assert.ok(!/deleteDatabase|\bindexedDB\b|uploadSnapshot|downloadSnapshot/.test(source));
 assert.ok(!/sk_(?:test|live)_[A-Za-z0-9]+/.test(source));
});
