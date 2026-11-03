// Android Back button rules for the APK, in priority order. Pure logic, so the
// order can be tested without a phone. app.js carries out the chosen step.
//
// 1. Close whatever is on top: a confirmation, a dialog, the rest timer sheet,
//    the food menu, or the muscle focus page.
// 2. A full-screen workout minimises. It is never discarded by Back.
// 3. History and Settings pages close back to the list they came from.
// 4. Otherwise go to the previous page the person visited, then Home.
// 5. On Home with nowhere left to go, ask before leaving the app.
export const BACK_STEPS=Object.freeze([
 'close-confirmation','close-modal','close-rest','close-food-menu','close-muscle-page',
 'minimise-workout','close-history','close-settings-page','previous-page','home','ask-exit'
]);

export function nextBackStep({
 confirmation=false,modal=false,restSheet=false,foodMenuOpen=false,musclePage=false,
 workoutFocused=false,historyPanel=null,settingsPage=null,previousPage=null,tab='home'
}={}){
 if(confirmation)return 'close-confirmation';
 if(modal)return 'close-modal';
 if(restSheet)return 'close-rest';
 if(foodMenuOpen)return 'close-food-menu';
 if(musclePage&&workoutFocused)return 'close-muscle-page';
 if(workoutFocused)return 'minimise-workout';
 if(historyPanel)return 'close-history';
 if(settingsPage&&tab==='settings')return 'close-settings-page';
 if(previousPage&&previousPage!==tab)return 'previous-page';
 if(tab!=='home')return 'home';
 return 'ask-exit';
}

// Pages the person moved through, newest last. Going back pops it; a normal
// tab change pushes the page being left. Repeats and long trails are trimmed.
export function createPageTrail(limit=20){
 const trail=[];
 return {
  leave(page){
   if(!page||trail.at(-1)===page)return;
   trail.push(page);
   if(trail.length>limit)trail.shift();
  },
  previous:()=>trail.at(-1)||null,
  pop:()=>trail.pop()||null,
  clear(){trail.length=0;},
  get size(){return trail.length;}
 };
}
