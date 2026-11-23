import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync,statSync} from 'node:fs';

const read=f=>readFileSync(new URL('../'+f,import.meta.url),'utf8');
const exists=f=>existsSync(new URL('../'+f,import.meta.url));

test('the web icon uses the Indigo brand',()=>{
 const svg=read('icon.svg');
 assert.match(svg,/#01010D/);assert.match(svg,/#9378FF/);assert.match(svg,/#88F9C0/);
 assert.ok(!/#6ef5c8|#bff56a/i.test(svg),'old mint and lime are gone');
 const manifest=JSON.parse(read('manifest.webmanifest'));
 assert.equal(manifest.theme_color,'#01010D');assert.equal(manifest.background_color,'#01010D');
});

test('every Android density has launcher, round, foreground and background icons',()=>{
 for(const d of ['mdpi','hdpi','xhdpi','xxhdpi','xxxhdpi'])
  for(const n of ['ic_launcher','ic_launcher_round','ic_launcher_foreground','ic_launcher_background'])
   assert.ok(exists(`android-icons/mipmap-${d}/${n}.png`),`${d}/${n}`);
});

test('launch images replace every Capacitor splash and stay small',()=>{
 const dirs=['drawable','drawable-land-mdpi','drawable-land-hdpi','drawable-land-xhdpi','drawable-land-xxhdpi','drawable-land-xxxhdpi','drawable-port-mdpi','drawable-port-hdpi','drawable-port-xhdpi','drawable-port-xxhdpi','drawable-port-xxxhdpi'];
 let total=0;
 for(const d of dirs){const f=`android-icons/splash/${d}/splash.png`;assert.ok(exists(f),f);total+=statSync(new URL('../'+f,import.meta.url)).size;}
 assert.ok(total<2.5*1024*1024,'splash images total '+Math.round(total/1024)+' KB');
});

test('the Android build installs the icon, themed icon and Onyx splash',()=>{
 const py=read('scripts/integrate-android-native.py');
 assert.match(py,/<monochrome android:drawable="@drawable\/ic_launcher_monochrome"\/>/);
 assert.match(py,/<color name="ic_launcher_background">#01010D<\/color>/);
 assert.match(py,/windowSplashScreenBackground/);
 assert.match(py,/drawable-v24'\/'ic_launcher_foreground\.xml'/);
});
