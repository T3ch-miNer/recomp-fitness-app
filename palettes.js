// Colour themes the user can pick in Settings › Look & feel. Light and dark
// mode work with every theme. Each theme's colours live in themes.css under
// :root[data-palette="…"]; "mint" is the original look, so it adds no overrides.
export const PALETTE_KEY='recomp-palette';
export const DEFAULT_PALETTE='indigo';
export const PALETTES=Object.freeze([
 {id:'indigo',name:'Indigo',desc:'Onyx black, electric indigo and tropical mint.',
  swatches:['#01010D','#6331FB','#88F9C0'],chrome:{dark:'#01010D',light:'#F5F4FB'}},
 {id:'mint',name:'Mint',desc:'The original Recomp look: deep ink with fresh mint and lime.',
  swatches:['#050709','#5DF2C2','#BFF56A'],chrome:{dark:'#050709',light:'#F3F2EE'}},
 {id:'blossom',name:'Blossom',desc:'Plum black, hot pink and soft lilac.',
  swatches:['#0C0510','#E8287A','#C9A7FF'],chrome:{dark:'#0C0510',light:'#FFF6FA'}}
]);
export function normalisePalette(id){return PALETTES.some(p=>p.id===id)?id:DEFAULT_PALETTE;}
export function paletteById(id){return PALETTES.find(p=>p.id===normalisePalette(id));}

// Remembered outside the main database too, so the launch screen can use the
// right colours before the app has loaded (see palette-boot.js).
export function rememberPalette(id){try{localStorage.setItem(PALETTE_KEY,normalisePalette(id));}catch{}}

export function paletteSettingsHtml(selected,escape=String){
 const current=normalisePalette(selected);
 return `<fieldset class="palette-picker"><legend class="label">Colour theme</legend><div class="palette-options">${PALETTES.map(p=>`<label class="palette-option${p.id===current?' selected':''}">
  <input type="radio" name="palette" value="${p.id}" ${p.id===current?'checked':''}/>
  <span class="palette-swatches" aria-hidden="true">${p.swatches.map(c=>`<i style="background:${c}"></i>`).join('')}</span>
  <span class="palette-text"><b>${escape(p.name)}</b><small>${escape(p.desc)}</small></span>
 </label>`).join('')}</div></fieldset>`;
}
