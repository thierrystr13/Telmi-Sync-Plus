import fs from 'node:fs'
import fsp from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import {randomUUID} from 'node:crypto'
export const STORAGE_KEYS=['downloads','videos','music','stories','artwork','work']
export function storageFile(home=os.homedir()){return path.join(home,'.telmi','parameters','storage.json')}
export function storagePaths(home=os.homedir(),userData=path.join(process.env.APPDATA||path.join(home,'.config'),'telmi-sync-plus')){
 const base=path.join(home,'.telmi'), paths={downloads:path.join(base,'tmp','downloads'),videos:path.join(userData,'videos'),music:path.join(base,'music'),stories:path.join(base,'stories'),artwork:path.join(base,'artwork'),work:path.join(base,'tmp','conversion')}
 try{const value=JSON.parse(fs.readFileSync(storageFile(home),'utf8'));for(const k of STORAGE_KEYS)if(typeof value[k]==='string'&&path.isAbsolute(value[k]))paths[k]=value[k]}catch{}
 return paths
}
export async function checkStorage(folder,timeout=8000){
 let timer
 try{return await Promise.race([checkFolder(folder),new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('Dossier indisponible : délai réseau dépassé.')),timeout)})])}finally{clearTimeout(timer)}
}
async function checkFolder(folder){
 if(typeof folder!=='string'||!path.isAbsolute(folder)||/[\x00-\x1f]/.test(folder))throw new Error('Choisissez un chemin absolu local, réseau ou UNC.')
 let temp
 try{await fsp.mkdir(folder,{recursive:true});await fsp.readdir(folder);temp=path.join(folder,'.telmi-write-test-'+randomUUID());await fsp.writeFile(temp,'TELMI storage test',{flag:'wx'});const s=await fsp.statfs(folder);return {folder,available:s.bsize*s.bavail,readable:true,writable:true}}
 catch{throw new Error('Dossier inaccessible ou non inscriptible. Vérifiez le NAS et les droits Windows.')}
 finally{if(temp)await fsp.rm(temp,{force:true}).catch(()=>{})}
}
export async function saveStorage(values,home=os.homedir()){
 const paths=storagePaths(home)
 for(const k of STORAGE_KEYS){if(typeof values[k]!=='string')throw new Error('Emplacement manquant : '+k);await checkStorage(values[k]);paths[k]=values[k]}
 const file=storageFile(home);await fsp.mkdir(path.dirname(file),{recursive:true});const tmp=file+'.'+randomUUID()+'.tmp';await fsp.writeFile(tmp,JSON.stringify(paths,null,2));await fsp.rename(tmp,file);return paths
}
