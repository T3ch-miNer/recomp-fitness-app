// Browser-history routing for Recomp's main pages. No fitness data in history.
// The Android system Back event is handled by WebView history before exiting.
export const RECOMP_PAGES=Object.freeze(['home','workouts','nutrition','body','you','settings']);
const KEY='recompPage';
export function createPageHistory({history,subscribe,initialPage='home',onNavigate}){
 if(typeof onNavigate!=='function')throw Error('Page navigation callback is required.');
 const clean=page=>RECOMP_PAGES.includes(page)?page:'home';
 let current=clean(initialPage),enabled=true;
 try{
  // Supply a home root even when Settings was restored after reopening the app.
  history.replaceState({...history.state,[KEY]:'home'},'');
  if(current!=='home')history.pushState({...history.state,[KEY]:current},'');
 }catch(e){enabled=false;console.warn('In-app history unavailable:',e?.message);}
 const back=event=>{
  const desired=clean(event?.state?.[KEY]);
  if(desired===current)return; // A workout overlay history guard owns this Back event.
  // Settings behaves as a subpage: Android Back returns to Home.
  const page=current==='settings'?'home':desired;
  current=page;
  // When returning from Settings to a previously visited non-home page, keep
  // the active history entry in sync with what Recomp actually displays.
  if(page!==desired && enabled)try{
   history.replaceState({...history.state,[KEY]:page},'');
  }catch{}
  onNavigate(page);
 };
 subscribe('popstate',back);
 return {
  visit(page){
   const next=clean(page);
   if(next===current)return false;
   current=next;
   if(enabled)try{history.pushState({...history.state,[KEY]:next},'');}catch(e){
    enabled=false;console.warn('Could not store Recomp navigation:',e?.message);
   }
   return true;
  },
  getCurrent:()=>current
 };
}
