// Copy the static Recomp PWA into Capacitor's webDir without bundling private
// worker code, archived source or secrets. Run from repository root.
import {mkdir,readdir,copyFile,rm,stat} from 'node:fs/promises';
import {join,extname} from 'node:path';
const root=process.cwd(),output=join(root,'www');
await rm(output,{recursive:true,force:true});
await mkdir(output,{recursive:true});
const allowed=new Set(['.html','.js','.css','.webmanifest','.svg','.png','.jpg','.jpeg','.webp','.ico']);
let files=0;
for(const file of await readdir(root)){
 if(!allowed.has(extname(file).toLowerCase()))continue;
 if(!(await stat(join(root,file))).isFile())continue;
 await copyFile(join(root,file),join(output,file));
 files++;
}
if(files<25)throw Error('The Android asset bundle is unexpectedly small: '+files+' files');
console.log('Prepared '+files+' Recomp web assets for offline Android app.');
