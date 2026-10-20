import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const db=readFileSync(new URL('../db.js',import.meta.url),'utf8');
const cloud=readFileSync(new URL('../cloud.js',import.meta.url),'utf8');
const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
const index=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const welcome=readFileSync(new URL('../first-run.js',import.meta.url),'utf8');

test('preview has zero IndexedDB access and uses disposable memory records',async()=>{
 assert.ok(!db.includes('indexedDB'));
 assert.ok(!db.includes('localStorage'));
 const data=await import('data:text/javascript;base64,'+Buffer.from(db).toString('base64'));
 assert.equal((await data.openDb()).persistent,false);
 assert.equal(await data.get('state'),undefined);
 const state={food:[{id:'x',calories:123}]};
 await data.put('state',state);
 state.food[0].calories=666;
 assert.equal((await data.get('state')).food[0].calories,123);
 const read=await data.get('state');
 read.food[0].calories=777;
 assert.equal((await data.get('state')).food[0].calories,123);
 await data.putPhoto('demo-1',new Blob(['x']));
 assert.deepEqual(await data.getAllPhotos(),['demo-1']);
});

test('all cloud and Google login attempts remain disabled in preview',async()=>{
 assert.ok(!cloud.includes('localStorage'));
 const auth=await import('data:text/javascript;base64,'+Buffer.from(cloud).toString('base64'));
 assert.equal(auth.getSession(),null);
 assert.equal(auth.getConfig(),null);
 assert.throws(()=>auth.startGoogleLogin(),/disabled in this temporary demo/);
 assert.throws(()=>auth.uploadSnapshot({}),/disabled in this temporary demo/);
});

test('preview has a prominent warning and does not register SW on CDN',()=>{
 assert.ok(index.includes('Sample data only'));
 assert.ok(index.includes('Changes are not saved'));
 assert.ok(welcome.includes('temporary demo'));
 assert.ok(app.includes("!location.hostname.endsWith('githack.com')"));
 assert.ok(app.includes('Version 2.5.1 · Demo'));
 assert.ok(!index.includes('https://t3ch-miner.github.io/recomp-fitness-app/'));
});
