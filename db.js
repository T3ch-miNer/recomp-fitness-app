// IndexedDB keeps all normal logs off localStorage and available offline.
const NAME = 'recomp-fitness-v1';
const STORES = ['records','photos'];
let connection;
export function openDb() {
  if (connection) return connection;
  connection = new Promise((resolve, reject) => {
    const req = indexedDB.open(NAME, 1);
    req.onupgradeneeded = () => { for (const s of STORES) if (!req.result.objectStoreNames.contains(s)) req.result.createObjectStore(s); };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return connection;
}
async function request(store, mode, action) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, mode);
    const req = action(tx.objectStore(store));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    tx.onerror = () => reject(tx.error);
  });
}
export const get = (key) => request('records','readonly',s=>s.get(key));
export const put = (key,value) => request('records','readwrite',s=>s.put(value,key));
export const getPhoto = (key) => request('photos','readonly',s=>s.get(key));
export const putPhoto = (key,value) => request('photos','readwrite',s=>s.put(value,key));
export const deletePhoto = key => request('photos','readwrite',s=>s.delete(key));
export const getAllPhotos = () => request('photos','readonly',s=>s.getAllKeys());

// Clear Recomp's local records and progress-photo blobs together.
// Wait for the transaction's completion, not merely the individual requests.
export async function clearAllLocalRecords(){
 const db=await openDb();
 return new Promise((resolve,reject)=>{
  const tx=db.transaction(STORES,'readwrite');
  tx.oncomplete=()=>resolve();
  tx.onerror=()=>reject(tx.error||new Error('Could not clear Recomp local data'));
  tx.onabort=()=>reject(tx.error||new Error('Local reset was aborted'));
  for(const store of STORES)tx.objectStore(store).clear();
 });
}
