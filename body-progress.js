// Body page: one trend graph you switch between weight and each measurement,
// step-by-step measurement entry with a body outline, and photo comparison.
// Pure functions that return HTML. app.js owns state and saving.

// Measurements are stored in inches (Recomp's original unit) so older records
// stay correct. They are shown and entered in the unit the person picks.
export const MEASURES=Object.freeze([
 {key:'chest',short:'Chest',label:'Chest',tip:'Around the fullest part of your chest, just under the armpits. Keep the tape level and breathe normally.',tape:[60,82,26,5]},
 {key:'belly',short:'Waist',label:'Belly button',tip:'Straight round your waist at belly-button height. Relax and breathe out. Don’t pull your stomach in.',tape:[60,114,23,5]},
 {key:'below',short:'Lower',label:'Below belly button',tip:'About two finger-widths below your belly button, level all the way round.',tape:[60,128,23.5,5]},
 {key:'shoulders',short:'Shoulders',label:'Shoulders',tip:'Around the widest part of your shoulders, arms relaxed by your sides.',tape:[60,63,33,5]},
 {key:'neck',short:'Neck',label:'Neck',tip:'Just below the Adam’s apple. Snug, but not tight.',tape:[60,48,9,3]},
 {key:'rightBicep',short:'R arm',label:'Right bicep (relaxed)',tip:'Around the middle of your upper arm, with the arm hanging relaxed.',tape:[29,84,8,3]},
 {key:'leftBicep',short:'L arm',label:'Left bicep (relaxed)',tip:'Around the middle of your upper arm, with the arm hanging relaxed.',tape:[91,84,8,3]},
 {key:'rightThigh',short:'R thigh',label:'Right thigh',tip:'Around the widest part of your upper thigh, weight on both feet.',tape:[48,170,12,4]},
 {key:'leftThigh',short:'L thigh',label:'Left thigh',tip:'Around the widest part of your upper thigh, weight on both feet.',tape:[72,170,12,4]},
 {key:'rightCalf',short:'R calf',label:'Right calf',tip:'Around the widest part of your calf.',tape:[49,232,9,3]},
 {key:'leftCalf',short:'L calf',label:'Left calf',tip:'Around the widest part of your calf.',tape:[71,232,9,3]},
 {key:'wrist',short:'Wrist',label:'Wrist',tip:'Just above the wrist bone, on your writing hand.',tape:[21,138,6,2.4]}
]);
export const MEASURE_KEYS=Object.freeze(MEASURES.map(m=>m.key));
export const TREND_PARTS=Object.freeze([{key:'weight',short:'Weight',label:'Body weight'},...MEASURES]);
export const PHOTO_ANGLES=Object.freeze(['Front','Left side','Right side','Back']);

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const round1=v=>Math.round(v*10)/10;
const fmt=v=>String(round1(v));
export const toDisplay=(inches,unit)=>unit==='cm'?round1(inches*2.54):round1(inches);
export const toStored=(value,unit)=>unit==='cm'?Math.round(value/2.54*100)/100:Math.round(value*100)/100;
const shortDate=d=>new Date(d+'T12:00:00').toLocaleDateString('en-GB',{day:'numeric',month:'short'});
const longDate=d=>new Date(d+'T12:00:00').toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'});
const has=v=>v!==''&&v!=null&&Number.isFinite(Number(v))&&Number(v)>0;

// One value per date for the chosen part, oldest first. A later entry on the
// same day wins, matching how the rest of the app treats corrections.
export function seriesFor(key,{weights=[],measurements=[]},unit='in'){
 const rows=key==='weight'
  ?weights.filter(w=>has(w.kg)).map(w=>({id:w.id,date:w.date,value:round1(Number(w.kg))}))
  :measurements.filter(m=>has(m[key])).map(m=>({id:m.id,date:m.date,value:toDisplay(Number(m[key]),unit)}));
 const byDate=new Map();
 for(const r of rows)byDate.set(r.date,r);
 return [...byDate.values()].sort((a,b)=>a.date.localeCompare(b.date));
}

export function trendChart(points,{unit='',width=326,height=150}={}){
 if(points.length<2)return '';
 const shown=points.slice(-12),vals=shown.map(p=>p.value);
 const lo=Math.min(...vals),hi=Math.max(...vals),span=hi-lo||1;
 const top=20,bottom=height-20,x=i=>4+i*((width-8)/(shown.length-1)),y=v=>top+(hi-v)/span*(bottom-top);
 const pts=shown.map((p,i)=>[x(i),y(p.value)]);
 const line=pts.map(([a,b],i)=>`${i?'L':'M'}${a.toFixed(1)} ${b.toFixed(1)}`).join(' ');
 const area=`${line} L${pts.at(-1)[0].toFixed(1)} ${bottom} L${pts[0][0].toFixed(1)} ${bottom} Z`;
 const first=shown[0],last=shown.at(-1),mid=shown[Math.floor((shown.length-1)/2)];
 return `<svg class="trend-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="Went from ${fmt(first.value)} to ${fmt(last.value)} ${esc(unit)} between ${esc(longDate(first.date))} and ${esc(longDate(last.date))}">
 <line class="trend-grid" x1="0" x2="${width}" y1="${top}" y2="${top}"/><line class="trend-grid" x1="0" x2="${width}" y1="${(top+bottom)/2}" y2="${(top+bottom)/2}"/><line class="trend-grid" x1="0" x2="${width}" y1="${bottom}" y2="${bottom}"/>
 <text class="trend-label" x="0" y="${top-6}">${fmt(hi)} ${esc(unit)}</text><text class="trend-label" x="0" y="${height-4}">${fmt(lo)} ${esc(unit)}</text>
 <path class="trend-area" d="${area}"/><path class="trend-line" d="${line}"/>
 ${pts.map(([a,b],i)=>`<circle class="trend-dot${i===pts.length-1?' last':''}" cx="${a.toFixed(1)}" cy="${b.toFixed(1)}" r="${i===pts.length-1?5:3}"/>`).join('')}
 </svg><div class="trend-dates"><span>${esc(shortDate(first.date))}</span>${shown.length>2?`<span>${esc(shortDate(mid.date))}</span>`:''}<span>${esc(shortDate(last.date))}</span></div>`;
}

function partIcon(part){
 if(part.key==='weight')return '<svg viewBox="0 0 26 26" aria-hidden="true" class="part-svg"><rect x="3.5" y="5" width="19" height="17" rx="4"/><path d="M9 11a4 4 0 0 1 8 0"/><path d="M13 11l1.6-2"/></svg>';
 const [cx,cy,rx]=part.tape,s=26/120,yy=(cy*26/300).toFixed(1),x1=((cx-rx)*s).toFixed(1),x2=((cx+rx)*s).toFixed(1);
 return `<svg viewBox="0 0 26 26" aria-hidden="true" class="part-svg"><circle cx="13" cy="3.4" r="2.3"/><path d="M8.6 7.2h8.8l1.4 7.6M8.6 7.2l-1.4 7.6M10 7.2v8.4l-1 9.4M16 7.2v8.4l1 9.4M10 15.6h6"/><line class="part-tape" x1="${x1}" x2="${x2}" y1="${yy}" y2="${yy}"/></svg>`;
}

export function measurementsPanel({part='belly',weights=[],measurements=[],unit='in'}){
 const p=TREND_PARTS.find(x=>x.key===part)||TREND_PARTS[2];
 const u=p.key==='weight'?'kg':unit;
 const series=seriesFor(p.key,{weights,measurements},unit);
 const last=series.at(-1),firstV=series[0];
 const diff=last&&firstV?round1(last.value-firstV.value):0;
 const change=series.length>1?`${diff>0?'+':diff<0?'−':''}${fmt(Math.abs(diff))} ${u}`:'';
 const empty=!series.length;
 const icons=TREND_PARTS.map(x=>{const on=x.key===p.key,count=seriesFor(x.key,{weights,measurements},unit).length;
  return `<button type="button" class="part-chip${on?' on':''}${count?'':' empty'}" role="tab" aria-selected="${on}" data-action="body-part" data-part="${x.key}" aria-label="${esc(x.label)}${count?'':' (no entries yet)'}">${partIcon(x)}<span>${esc(x.short)}</span></button>`;}).join('');
 const recent=[...series].reverse().slice(0,5).map(r=>`<div class="trend-row"><span>${esc(longDate(r.date))}</span><b>${fmt(r.value)} ${esc(u)}</b>${p.key==='weight'?`<button type="button" class="btn ghost icon-only" data-action="delete-weight" data-id="${esc(r.id)}" data-hold="1200" title="Hold to delete" aria-label="Hold to delete weight from ${esc(longDate(r.date))}">${'<svg class="tiny-icon" aria-hidden="true"><use href="#ico-trash"></use></svg>'}</button>`:`<button type="button" class="btn ghost icon-only" data-action="clear-measure-value" data-id="${esc(r.id)}" data-key="${esc(p.key)}" aria-label="Delete ${esc(p.label.toLowerCase())} from ${esc(longDate(r.date))}">${'<svg class="tiny-icon" aria-hidden="true"><use href="#ico-trash"></use></svg>'}</button>`}</div>`).join('');
 return `<section class="trend-card" aria-labelledby="trend-title">
 <div class="trend-head"><div><h2 id="trend-title" class="trend-kicker">Track what the scale misses</h2><span class="trend-part">${esc(p.label)}</span></div>${p.key==='weight'?'':`<div class="unit-switch" role="group" aria-label="Measurement unit">${['cm','in'].map(x=>`<button type="button" data-action="measure-unit" data-unit="${x}" aria-pressed="${x===unit}" class="${x===unit?'on':''}">${x}</button>`).join('')}</div>`}</div>
 ${empty?`<div class="trend-empty"><p>No ${esc(p.key==='weight'?'weigh-ins':p.label.toLowerCase()+' measurements')} yet.</p><button type="button" class="btn primary" data-action="${p.key==='weight'?'add-weight':'add-measurement'}">${p.key==='weight'?'Log weight':'Add measurements'}</button></div>`:
 `<div class="trend-now"><span class="trend-value">${fmt(last.value)}</span><span class="trend-unit">${esc(u)}</span>${change?`<span class="trend-change">${change}</span>`:''}</div>
 ${series.length>1?trendChart(series,{unit:u}):`<p class="trend-hint">Log ${p.key==='weight'?'another weigh-in':'this again'} next week to see your trend.</p>`}`}
 <div class="part-chips" role="tablist" aria-label="Choose what to chart">${icons}</div>
 </section>
 ${recent?`<section class="trend-history" aria-label="${esc(p.label)} entries"><h3>${esc(p.label)} entries</h3>${recent}</section>`:''}`;
}

// Step-by-step entry. `values` holds what the person typed, in their unit.
export function measureWizard({i=0,values={},unit='in',date,last={}}){
 const n=MEASURES.length,cur=MEASURES[Math.max(0,Math.min(n-1,i))];
 const filled=MEASURES.filter(m=>String(values[m.key]??'').trim()!=='').length;
 const [cx,cy,rx,ry]=cur.tape;
 const prev=has(last[cur.key])?`Last time: ${fmt(toDisplay(Number(last[cur.key]),unit))} ${unit}`:'No earlier entry';
 return `<div class="measure-wizard" role="dialog" aria-modal="true" aria-labelledby="mw-title">
 <header class="mw-head"><button type="button" class="btn round" data-action="close-modal" aria-label="Close without saving"><svg class="icon" aria-hidden="true"><use href="#ico-x"></use></svg></button>
 <div class="mw-head-text"><b>Add measurements</b><span>${filled} of ${n} filled · ${esc(longDate(date))}</span></div>
 <div class="unit-switch" role="group" aria-label="Measurement unit">${['cm','in'].map(x=>`<button type="button" data-action="mw-unit" data-unit="${x}" aria-pressed="${x===unit}" class="${x===unit?'on':''}">${x}</button>`).join('')}</div></header>
 <div class="mw-bar" aria-hidden="true"><span style="width:${Math.round((i+1)/n*100)}%"></span></div>
 <nav class="mw-tabs" aria-label="Measurements">${MEASURES.map((m,k)=>{const done=String(values[m.key]??'').trim()!=='';return `<button type="button" class="${k===i?'on':done?'done':''}" data-action="mw-go" data-step="${k}" ${k===i?'aria-current="step"':''}>${done?'✓ ':''}${esc(m.short)}</button>`;}).join('')}</nav>
 <div class="mw-body">
  <div class="mw-figure-card">
   <svg class="mw-figure" viewBox="0 0 120 300" role="img" aria-label="Body outline with the tape at the ${esc(cur.label.toLowerCase())}">
    <circle cx="60" cy="27" r="15"/><rect x="54" y="40" width="12" height="14" rx="4"/>
    <path d="M33 58Q60 50 87 58L85 100Q80 118 83 140L37 140Q40 118 35 100Z"/>
    <path class="limb" d="M34 62L24 100L20 144"/><path class="limb" d="M86 62L96 100L100 144"/>
    <path class="leg" d="M48 136L48 200L50 266"/><path class="leg" d="M72 136L72 200L70 266"/>
    <ellipse class="tape-glow" cx="${cx}" cy="${cy}" rx="${rx+6}" ry="${ry+5}"/><ellipse class="tape" cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}"/>
   </svg>
   <div class="mw-copy"><span class="mw-step">STEP ${i+1} OF ${n}</span><h2 id="mw-title">${esc(cur.label)}</h2><p>${esc(cur.tip)}</p></div>
  </div>
  <label class="mw-input" for="measure-input"><span>${esc(cur.label)} in ${unit}</span>
   <span class="mw-field"><input id="measure-input" type="number" inputmode="decimal" step="0.1" min="0" max="${unit==='cm'?400:160}" value="${esc(values[cur.key]??'')}" placeholder="${has(last[cur.key])?fmt(toDisplay(Number(last[cur.key]),unit)):'0'}" data-mw-key="${cur.key}"/><span>${unit}</span></span>
   <small>${esc(prev)}</small></label>
  <div class="mw-actions"><button type="button" class="btn" data-action="mw-step" data-dir="-1" ${i===0?'disabled':''}>Back</button><button type="button" class="btn primary" data-dyn="mw-next" data-action="${i===n-1?'mw-save':'mw-step'}" data-dir="1">${i===n-1?'Save measurements':'Next'}</button></div>
  <div class="mw-foot"><button type="button" class="link-button" data-action="mw-step" data-dir="1" ${i===n-1?'hidden':''}>Skip this one</button><button type="button" class="link-button" data-action="mw-save">Save and finish now</button></div>
 </div></div>`;
}

// Builds a stored measurement entry from typed values, or null if nothing valid.
export function measurementFromWizard(values,unit,{id,date}){
 const entry={id,date};let any=false;
 for(const m of MEASURES){
  const raw=String(values[m.key]??'').trim();
  const v=Number(raw);
  if(raw!==''&&Number.isFinite(v)&&v>0&&v<(unit==='cm'?400:160)){entry[m.key]=toStored(v,unit);any=true;}else entry[m.key]='';
 }
 return any?entry:null;
}

// Photo dates, newest first, with the angles taken that day.
export function photoDays(photos=[]){
 const map=new Map();
 for(const p of photos){if(!map.has(p.date))map.set(p.date,[]);map.get(p.date).push(p);}
 return [...map].sort((a,b)=>b[0].localeCompare(a[0])).map(([date,list])=>({date,photos:list.sort((a,b)=>PHOTO_ANGLES.indexOf(a.view)-PHOTO_ANGLES.indexOf(b.view))}));
}

export function measurementOn(date,measurements=[]){
 const same=measurements.filter(m=>m.date===date&&MEASURE_KEYS.some(k=>has(m[k])));
 return same.at(-1)||null;
}

// Rows comparing weight and each measurement both days have, older first.
export function compareRows(a,b,{weights=[],measurements=[]},unit='in'){
 const [older,newer]=a<=b?[a,b]:[b,a];
 const rows=[];
 const w=d=>{const list=weights.filter(x=>x.date===d&&has(x.kg));return list.length?Number(list.at(-1).kg):null;};
 const wa=w(older),wb=w(newer);
 if(wa!=null&&wb!=null)rows.push({label:'Weight',a:round1(wa),b:round1(wb),unit:'kg'});
 const ma=measurementOn(older,measurements),mb=measurementOn(newer,measurements);
 if(ma&&mb)for(const m of MEASURES)if(has(ma[m.key])&&has(mb[m.key]))rows.push({label:m.label,a:toDisplay(Number(ma[m.key]),unit),b:toDisplay(Number(mb[m.key]),unit),unit});
 return rows.map(r=>{const d=round1(r.b-r.a);return {...r,change:`${d>0?'+':d<0?'−':''}${fmt(Math.abs(d))} ${r.unit}`};});
}

export function photosPanel({photos=[],weights=[],measurements=[],picked=[],comparing=false,angle='Front',showMeasures=false,unit='in',urlFor=()=>null}){
 const days=photoDays(photos);
 const sel=days.filter(d=>picked.includes(d.date)).sort((x,y)=>x.date.localeCompare(y.date));
 if(comparing&&sel.length===2){
  const rows=compareRows(sel[0].date,sel[1].date,{weights,measurements},unit);
  const angles=PHOTO_ANGLES.filter(v=>sel.some(d=>d.photos.some(p=>p.view===v)));
  const view=angles.includes(angle)?angle:(angles[0]||'Front');
  const frame=d=>{const p=d.photos.find(x=>x.view===view),url=p?urlFor(p.id):null;
   const kg=weights.filter(x=>x.date===d.date&&has(x.kg)).at(-1)?.kg;
   return `<figure class="cmp-frame">${url?`<img src="${esc(url)}" alt="${esc(view)} progress photo, ${esc(longDate(d.date))}"/>`:`<div class="cmp-missing">${p?'Loading photo…':'No '+esc(view.toLowerCase())+' photo this day'}</div>`}<figcaption><b>${esc(shortDate(d.date))}</b>${kg?`<span>${fmt(Number(kg))} kg</span>`:''}${p?`<button type="button" class="cmp-delete" data-action="delete-photo" data-id="${esc(p.id)}" aria-label="Delete this ${esc(view.toLowerCase())} photo from ${esc(longDate(d.date))}"><svg class="tiny-icon" aria-hidden="true"><use href="#ico-trash"></use></svg></button>`:''}</figcaption></figure>`;};
  const measured=rows.some(r=>r.label!=='Weight');
  return `<section class="pc-view" aria-labelledby="cmp-title">
  <button type="button" class="btn history-back" data-action="photo-compare-close"><svg class="tiny-icon" aria-hidden="true" style="transform:rotate(90deg)"><use href="#ico-chevron"></use></svg> All photos</button>
  <h2 id="cmp-title" class="section-title">${esc(shortDate(sel[0].date))} vs ${esc(shortDate(sel[1].date))}</h2>
  <div class="cmp-angles" role="tablist" aria-label="Photo angle">${PHOTO_ANGLES.map(v=>`<button type="button" role="tab" aria-selected="${v===view}" class="${v===view?'on':''}" data-action="photo-angle" data-angle="${esc(v)}" ${angles.includes(v)?'':'disabled'}>${esc(v.replace(' side',''))}</button>`).join('')}</div>
  <div class="cmp-pair">${frame(sel[0])}${frame(sel[1])}</div>
  ${measured?`<button type="button" class="btn block cmp-measure-toggle" data-action="photo-measures" aria-expanded="${showMeasures}">${showMeasures?'Hide measurements':'Compare measurements'}</button>`:`<p class="hint cmp-none">${rows.length?'Only weight was logged on both days.':'No measurements on one of these days, so there’s nothing to compare yet.'}</p>`}
  ${(showMeasures||!measured)&&rows.length?`<div class="cmp-table" role="table" aria-label="Measurements on both days"><div class="cmp-row head" role="row"><span role="columnheader">Part</span><span role="columnheader">${esc(shortDate(sel[0].date))}</span><span role="columnheader">${esc(shortDate(sel[1].date))}</span><span role="columnheader">Change</span></div>${rows.map(r=>`<div class="cmp-row" role="row"><span role="cell">${esc(r.label)}</span><span role="cell">${fmt(r.a)}</span><span role="cell"><b>${fmt(r.b)}</b></span><span role="cell" class="cmp-change">${esc(r.change)}</span></div>`).join('')}</div>`:''}
  </section>`;
 }
 const thumbs=d=>PHOTO_ANGLES.map(v=>{const p=d.photos.find(x=>x.view===v),url=p?urlFor(p.id):null;return `<span class="pd-thumb${p?'':' none'}">${url?`<img src="${esc(url)}" alt="" loading="lazy"/>`:''}</span>`;}).join('');
 return `<section class="photo-days" aria-label="Photo dates">
 <div class="pd-toolbar"><p class="hint">${days.length>1?'Pick two dates to compare them side by side.':'Take photos every couple of weeks to compare them here.'}</p><button type="button" class="btn" data-action="open-photo-guide"><svg class="tiny-icon" aria-hidden="true"><use href="#ico-camera"></use></svg> Guided camera</button></div>
 ${days.length?days.map(d=>{const idx=sel.findIndex(x=>x.date===d.date),on=idx!==-1,kg=weights.filter(x=>x.date===d.date&&has(x.kg)).at(-1)?.kg,measured=Boolean(measurementOn(d.date,measurements));
  return `<div class="pd-row${on?' on':''}"><button type="button" class="pd-pick" data-action="photo-pick" data-date="${esc(d.date)}" aria-pressed="${on}"><span class="pd-thumbs">${thumbs(d)}</span><span class="pd-copy"><b>${esc(longDate(d.date))}</b><small>${d.photos.length} photo${d.photos.length===1?'':'s'}${kg?` · ${fmt(Number(kg))} kg`:''}${measured?' · measured':''}</small></span><span class="pd-check" aria-hidden="true">${on?(sel[0]?.date===d.date?'1':'2'):''}</span></button></div>`;}).join(''):
 '<div class="photo-empty-state"><strong>The first frame is yours.</strong><p class="muted small">Start with front, side and back. Come back in two weeks for a fair comparison.</p><button type="button" class="btn primary" data-action="add-photo">Add a progress photo</button></div>'}
 <p class="hint">Photos stay on your phone unless you turn on your private cloud backup.</p>
 </section>
 ${sel.length===2?`<div class="pd-compare-bar"><button type="button" class="btn" data-action="photo-clear">Clear</button><button type="button" class="btn primary" data-dyn="photo-compare" data-action="photo-compare">Compare ${esc(shortDate(sel[0].date))} and ${esc(shortDate(sel[1].date))}</button></div>`:''}`;
}
