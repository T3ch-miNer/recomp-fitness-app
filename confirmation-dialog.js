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
