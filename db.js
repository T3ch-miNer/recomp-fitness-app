// Recomp v2.5.1 SAFE PREVIEW ONLY.
// Deliberately uses volatile in-memory stores. There is no IndexedDB, no disk
// persistence and no access to fitness records saved on the live Recomp origin.
// Do not merge this preview-only replacement into the production pull request.
const records=new Map();
const photos=new Map();
const clone=value=>{
 if(value==null)return value;
 if(typeof structuredClone==='function')return structuredClone(value);
 return JSON.parse(JSON.stringify(value));
};
export async function openDb(){return {preview:true,persistent:false};}
export const get=async key=>clone(records.get(key));
export const put=async (key,value)=>{records.set(key,clone(value));return key;};
export const getPhoto=async key=>photos.get(key);
export const putPhoto=async (key,value)=>{photos.set(key,value);return key;};
export const deletePhoto=async key=>{photos.delete(key);};
export const getAllPhotos=async()=>[...photos.keys()];
