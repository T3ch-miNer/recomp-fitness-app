import {getGiantGroups,isRoundDone,pickGiantCursor,ungroupedExerciseIndices,availableItemsForStage} from './giant-sets.js';
const safe=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function renderGiantSetView(session){
 const groups=getGiantGroups(session);
 if(!groups.length)return '';
 const cursor=pickGiantCursor(session,groups);
 const selected=groups.find(g=>g.id===cursor.group)||groups[0];
 const round=Math.min(Math.max(0,cursor.round),selected.rounds-1);
 const available=availableItemsForStage(selected,round);
 const roundDone=available.filter(({exercise})=>Boolean(exercise.sets[round]?.done)).length;
 const phase=selected.kind==='single'?'Set':['sequence','mixed'].includes(selected.kind)?'Stage':'Round';
 const type=selected.kind==='single'?'Individual exercise':selected.kind==='mixed'?'Mixed sets and alternatives':selected.kind==='sequence'?'Rep sequence':selected.custom?'Your giant set':selected.rounds===1?'Single-round finisher':'Giant set';
 const completeRounds=Array.from({length:selected.rounds},(_,r)=>isRoundDone(selected,r)).filter(Boolean).length;
 const other=ungroupedExerciseIndices(session,groups);
 const steps=available.map(({exercise:e,index:i},ordinal)=>{
  const set=e.sets[round],done=Boolean(set?.done),active=i===cursor.index;
  const target=safe(e.targetLabel||((round+1)+' of '+e.sets.length+' sets'));
  const ref=safe(e.ref||selected.id+(ordinal+1));
  const value=safe(set?.kg),reps=safe(set?.reps);
  const unit=e.unit==='seconds'?'sec':e.unit==='minutes'?'min':'reps';
  return `<article class="giant-exercise ${active?'is-active':''} ${done?'is-done':''}">
   <button type="button" class="giant-exercise-top" data-action="giant-exercise" data-ex="${i}" aria-current="${active?'step':'false'}">
    <span class="giant-exercise-number">${done?'✓':ordinal+1}</span>
    <span class="giant-exercise-info"><b>${ref} · ${safe(e.name)}</b><small>${done?'Completed · ':active?'Current · ':'Up next · '}${target}</small></span>
    <span class="giant-exercise-status">${done?'Done':active?'Now':'View'}</span>
   </button>
   ${active?`<div class="giant-active-fields">
    <div class="giant-input-pair">
     <label><span>Weight (kg)</span><input class="input set-input" data-setfield="kg" data-ex="${i}" data-set="${round}" aria-label="Weight for ${safe(e.name)} round ${round+1}" type="number" inputmode="decimal" min="0" step="0.5" value="${Number(set.kg)>0?value:''}" placeholder="—"/></label>
     <label><span>${unit==='sec'?'Seconds':unit==='min'?'Minutes':'Reps'}</span><input class="input set-input" data-setfield="reps" data-ex="${i}" data-set="${round}" aria-label="${unit} for ${safe(e.name)} round ${round+1}" type="number" inputmode="numeric" min="0" step="1" value="${reps}"/></label>
    </div>
    <button type="button" class="btn ${done?'giant-undo':'primary'} block giant-complete" data-action="tick-set" data-ex="${i}" data-set="${round}">${done?'Undo completed set':'✓ Complete & next exercise'}</button>
    <div class="giant-quick-actions">
     <button class="btn ghost" data-action="exercise-video" data-index="${i}">Demonstration</button>
     <button class="btn ghost" data-action="exercise-notes" data-index="${i}">Notes</button>
    </div>
    ${e.notes?`<p class="hint giant-coach-cue">${safe(e.notes)}</p>`:''}
   </div>`:''}
  </article>`;
 }).join('');
 return `<section class="giant-tracker" aria-label="Exercise group tracker">
  <div class="giant-tracker-top">
   <div><span class="eyebrow">ROUND-BASED TRACKER</span><h2>Group ${safe(selected.id)} <span class="giant-muted">· ${type}</span></h2><p>${selected.items.length} exercise${selected.items.length!==1?'s':''} · ${selected.rounds} ${phase.toLowerCase()}${selected.rounds!==1?'s':''} · ${completeRounds} complete</p></div>
   <div class="giant-round-count"><b>${round+1}/${selected.rounds}</b><small>Current ${phase.toLowerCase()}</small></div>
  </div>
  <div class="giant-group-tabs" role="group" aria-label="Choose exercise group">${groups.map(g=>`<button type="button" data-action="giant-group" data-group="${safe(g.id)}" aria-pressed="${g.id===selected.id}" class="${g.id===selected.id?'selected':''}">Group ${safe(g.id)}${Array.from({length:g.rounds},(_,r)=>isRoundDone(g,r)).every(Boolean)?' ✓':''}</button>`).join('')}</div>
  <div class="giant-round-tabs" role="group" aria-label="Choose ${phase.toLowerCase()}">${Array.from({length:selected.rounds},(_,r)=>`<button type="button" data-action="giant-round" data-round="${r}" aria-pressed="${r===round}" class="${r===round?'selected':''} ${isRoundDone(selected,r)?'done':''}">${phase} ${r+1}${isRoundDone(selected,r)?' ✓':''}</button>`).join('')}</div>
  <div class="giant-round-progress" role="status">${phase} ${round+1}: ${roundDone} of ${available.length} exercise${available.length!==1?'s':''} completed</div>
  <div class="giant-exercises">${steps}</div>
  <div class="giant-round-foot"><span>${roundDone===available.length?phase+' completed. Rest as needed before continuing.':selected.kind==='single'?'Complete the set, then continue to the next one.':'Complete the exercises shown in order.'}</span></div>
  ${selected.kind==='mixed'?'<p class="giant-other-note">Different numbers of sets are recorded. Later stages show only exercises with a corresponding set. Some movements may be alternatives, so check your coach notes.</p>':''}
  ${selected.kind==='sequence'?'<p class="giant-other-note">Each stage follows the original rep sequence. These are not extra rounds.</p>':''}
  ${selected.notes?`<p class="giant-other-note">${safe(selected.notes)}</p>`:''}
  ${other.length?`<p class="giant-other-note">${other.length} additional exercise${other.length===1?'':'s'} (including any special set sequences) can be edited in Detailed View.</p>`:''}
 </section>`;
}
