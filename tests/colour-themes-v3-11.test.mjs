import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PALETTES,DEFAULT_PALETTE,normalisePalette,paletteById,paletteSettingsHtml} from '../palettes.js';

const read=f=>readFileSync(new URL('../'+f,import.meta.url),'utf8');
const css=read('themes.css');

// WCAG contrast, to keep small text readable in every theme.
const lum=hex=>{const c=hex.replace('#','').match(/../g).map(h=>parseInt(h,16)/255).map(v=>v<=.03928?v/12.92:((v+.055)/1.055)**2.4);return .2126*c[0]+.7152*c[1]+.0722*c[2];};
const contrast=(a,b)=>{const [x,y]=[lum(a),lum(b)].sort((m,n)=>n-m);return (x+.05)/(y+.05);};
const token=(palette,mode,name)=>{
 const sel=mode==='dark'?`:root[data-palette="${palette}"][data-theme="dark"]{`:`:root[data-palette="${palette}"],:root[data-palette="${palette}"][data-theme="light"]{`;
 const block=css.slice(css.indexOf(sel),css.indexOf('}',css.indexOf(sel)));
 return block.match(new RegExp(name+':(#[0-9A-Fa-f]{6})'))?.[1];
};

test('there are three colour themes and Indigo is the default',()=>{
 assert.deepEqual(PALETTES.map(p=>p.id),['indigo','mint','blossom']);
 assert.equal(DEFAULT_PALETTE,'indigo');
 assert.equal(normalisePalette('blossom'),'blossom');
 assert.equal(normalisePalette('neon'),'indigo');
 assert.equal(normalisePalette(undefined),'indigo');
 for(const p of PALETTES){assert.equal(p.swatches.length,3);assert.match(p.chrome.dark,/^#/);assert.match(p.chrome.light,/^#/);}
});

test('Indigo and Blossom define light, dark and follow-the-phone tokens',()=>{
 for(const id of ['indigo','blossom']){
  assert.ok(css.includes(`:root[data-palette="${id}"],:root[data-palette="${id}"][data-theme="light"]{`),id+' light');
  assert.ok(css.includes(`:root[data-palette="${id}"][data-theme="dark"]{`),id+' dark');
  assert.ok(css.includes(`:root[data-palette="${id}"]:not([data-theme="light"]){`),id+' system dark');
 }
 assert.ok(!css.includes('data-palette="mint"'),'Mint is the original look and needs no overrides');
});

test('text and button colours stay readable in every theme',()=>{
 for(const id of ['indigo','blossom']){
  for(const mode of ['light','dark']){
   const bg=token(id,mode,'--bg'),text=token(id,mode,'--text'),accent=token(id,mode,'--accent'),muted=token(id,mode,'--muted');
   assert.ok(contrast(text,bg)>=12,`${id} ${mode} text ${contrast(text,bg).toFixed(1)}`);
   assert.ok(contrast(accent,bg)>=4.5,`${id} ${mode} accent ${contrast(accent,bg).toFixed(1)}`);
   assert.ok(contrast(muted,bg)>=4.5,`${id} ${mode} muted ${contrast(muted,bg).toFixed(1)}`);
  }
 }
 // White button labels on the filled gradient start colour (large bold text needs 3:1).
 assert.ok(contrast('#FFFFFF','#6331FB')>=3);
 assert.ok(contrast('#FFFFFF','#E8287A')>=3);
});

test('the picker marks the chosen theme and falls back safely',()=>{
 const html=paletteSettingsHtml('blossom');
 assert.equal((html.match(/type="radio" name="palette"/g)||[]).length,3);
 assert.match(html,/value="blossom" checked/);
 assert.match(paletteSettingsHtml('bogus'),/value="indigo" checked/);
 assert.equal(paletteById('mint').name,'Mint');
});

test('the theme is applied before first paint and saved with preferences',()=>{
 const index=read('index.html'),boot=read('palette-boot.js'),app=read('app.js'),sw=read('sw.js');
 assert.ok(index.indexOf('palette-boot.js')<index.indexOf('<link rel="stylesheet"'),'boot script runs before the stylesheets');
 assert.match(boot,/localStorage\.getItem\('recomp-palette'\)/);
 assert.match(index,/themes\.css\?v=3\.11/);
 assert.match(app,/document\.documentElement\.dataset\.palette=palette\.id/);
 assert.match(app,/state\.preferences\.palette=normalisePalette\(el\.value\)/);
 assert.match(app,/el\.content=palette\.chrome\[mode\]/);
 for(const f of ['themes.css','palettes.js','palette-boot.js'])assert.ok(sw.includes("'./"+f+"'"),f);
});
