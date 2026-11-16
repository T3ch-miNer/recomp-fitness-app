// Fails loudly if code under test tries to reach the network.
// The LLM tests run entirely on local fixtures: no API keys, no model calls.
import {after} from 'node:test';
import assert from 'node:assert/strict';

export function blockNetwork(){
 const attempts=[];
 const originalFetch=globalThis.fetch;
 globalThis.fetch=async(input)=>{
  attempts.push(String(input?.url??input));
  throw new Error('Network access is blocked in tests: '+attempts.at(-1));
 };
 after(()=>{
  globalThis.fetch=originalFetch;
  assert.deepEqual(attempts,[],'tests must not make network requests');
 });
 return attempts;
}
