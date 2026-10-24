// User-created giant sets. Pure data transforms: never alter sessions or workout history.
// Template item indices: [0] ID, [2] sets, [7] last starting values,
// [11] display reference, [12] group letter.
const LETTERS='ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const hasOwn=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
const validLetter=id=>typeof id==='string'&&/^[A-Z]$/.test(id);
const safeSettings=template=>template?.groupSettings&&typeof template.groupSettings==='object'&&!Array.isArray(template.groupSettings)
 ? template.groupSettings:{};

export function nextAvailableGroup(template){
 const used=new Set((template?.items||[]).map(e=>e?.[12]).filter(validLetter));
 for(const key of Object.keys(safeSettings(template)))if(validLetter(key))used.add(key);
 return [...LETTERS].find(letter=>!used.has(letter))||null;
}

export function listCustomGiantSets(template){
 const config=safeSettings(template);
 return Object.keys(config).filter(id=>validLetter(id)&&config[id]?.kind==='giant'&&
  (template?.items||[]).some(item=>item?.[12]===id)).sort().map(id=>({
   id, ...config[id],items:(template.items||[]).filter(item=>item?.[12]===id)
 }));
}

export function saveCustomGiantSet(template,{groupId=null,indices,rounds,restSeconds=60,notes=''}={}){
 if(!template||!Array.isArray(template.items))throw new Error('Workout plan is unavailable');
 const settings=safeSettings(template);
 const editing=groupId!=null;
 if(editing&&(!validLetter(groupId)||settings[groupId]?.kind!=='giant'))
  throw new Error('This giant set is not editable');
 const selected=Array.isArray(indices)?indices.map(Number):[];
 if(selected.length<2||selected.length>12||new Set(selected).size!==selected.length||
   selected.some(i=>!Number.isInteger(i)||i<0||i>=template.items.length))
  throw new Error('Choose between 2 and 12 different exercises');
 if(!Number.isInteger(rounds)||rounds<1||rounds>12)
  throw new Error('Choose between 1 and 12 rounds');
 if(!Number.isInteger(restSeconds)||restSeconds<0||restSeconds>900)
  throw new Error('Rest between rounds must be 0 to 900 seconds');
 if(typeof notes!=='string'||notes.length>350)throw new Error('Keep notes under 350 characters');

 const id=editing?groupId:nextAvailableGroup(template);
 if(!id)throw new Error('All 26 group letters are already in use');
 for(const index of selected){
  const assigned=template.items[index]?.[12];
  if(assigned&&assigned!==id)throw new Error('Choose ungrouped exercises or ones already in this giant set');
 }
 const included=new Set(selected);
 // The checked exercises are run in the order they appear in the plan.
 let position=0;
 const items=template.items.map((item,i)=>{
  if(included.has(i)){
   const updated=item.slice();
   updated[2]=rounds;
   updated[11]=id+(++position);
   updated[12]=id;
   // Preserve the original [7] saved starting set values and all coach notes.
   return updated;
  }
  if(editing&&item?.[12]===id){
   const updated=item.slice();
   updated[11]='';updated[12]='';
   return updated;
  }
  return item;
 });
 const groupSettings={
  ...settings,[id]:{kind:'giant',restSeconds,notes:notes.trim()}
 };
 return {...template,items,groupSettings};
}

export function removeCustomGiantSet(template,id){
 if(!template||!Array.isArray(template.items))throw new Error('Workout plan is unavailable');
 const settings=safeSettings(template);
 if(!validLetter(id)||settings[id]?.kind!=='giant')
  throw new Error('This giant set is not editable');
 const items=template.items.map(item=>{
  if(item?.[12]!==id)return item;
  const updated=item.slice();updated[11]='';updated[12]='';
  return updated; // Retain each exercise and its sets, weights, reps and notes.
 });
 const groupSettings={...settings};
 delete groupSettings[id];
 return {...template,items,groupSettings};
}
