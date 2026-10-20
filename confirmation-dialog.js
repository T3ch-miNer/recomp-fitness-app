// Native browser confirm() blocks the PWA and exposes the github.io hostname.
// Use an accessible, themed confirmation with explicit Cancel and action buttons.
export function confirmationHtml({title='Confirm action',message='',approveLabel='Confirm',danger=false}={}){
 const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 return `<div class="recomp-confirm-shade" role="presentation">
  <section class="recomp-confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="recomp-confirm-title" aria-describedby="recomp-confirm-message">
   <span class="eyebrow">RECOMP</span>
   <h2 id="recomp-confirm-title">${escape(title)}</h2>
   <p id="recomp-confirm-message">${escape(message)}</p>
   <div class="recomp-confirm-actions">
    <button type="button" class="btn" data-action="confirm-cancel">Cancel</button>
    <button type="button" class="btn ${danger?'danger':'primary'}" data-action="confirm-accept">${escape(approveLabel)}</button>
   </div>
  </section>
 </div>`;
}

/* Used by the standalone recipe planner, which has its own overlay and
   doesn't share app.js's render cycle. No native browser dialogs. */
export function confirmStandalone(message,options={}){
 return new Promise(resolve=>{
  const container=document.createElement('div');
  container.innerHTML=confirmationHtml({...options,message});
  const shade=container.firstElementChild;
  document.body.appendChild(shade);
  const cancel=shade.querySelector('[data-action="confirm-cancel"]');
  const accept=shade.querySelector('[data-action="confirm-accept"]');
  function finish(approved){
   document.removeEventListener('keydown',onKey);
   shade.remove();resolve(approved);
  }
  function onKey(event){if(event.key==='Escape'){event.preventDefault();event.stopPropagation();finish(false);}}
  cancel.addEventListener('click',event=>{event.stopPropagation();finish(false);});
  accept.addEventListener('click',event=>{event.stopPropagation();finish(true);});
  document.addEventListener('keydown',onKey);
  cancel.focus();
 });
}

// Only used when browser clipboard access is unavailable. Copy is manual and
// stays inside the app rather than opening an unstyled native prompt().
export function showCopyPanel(value,title='Copy your grocery list'){
 const shade=document.createElement('div');shade.className='recomp-confirm-shade';
 shade.innerHTML='<section class="recomp-confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="recomp-copy-title"><span class="eyebrow">RECOMP</span><h2 id="recomp-copy-title"></h2><p>Automatic copy is unavailable. Select and copy the text below.</p><textarea class="input recomp-copy-text" rows="8" readonly aria-label="Text to copy"></textarea><div class="recomp-confirm-actions"><button class="btn primary block" type="button" data-copy-done>Done</button></div></section>';
 shade.querySelector('#recomp-copy-title').textContent=title;
 const area=shade.querySelector('textarea');
 area.value=String(value||'');
 document.body.appendChild(shade);
 function close(){document.removeEventListener('keydown',onKey);shade.remove();}
 function onKey(event){if(event.key==='Escape'){event.preventDefault();event.stopPropagation();close();}}
 shade.querySelector('[data-copy-done]').addEventListener('click',event=>{event.stopPropagation();close();});
 document.addEventListener('keydown',onKey);
 area.focus();area.select();
}
