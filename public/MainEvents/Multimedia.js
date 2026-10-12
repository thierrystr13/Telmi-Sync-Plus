import {app,ipcMain,dialog,shell} from 'electron'
import fs from 'node:fs/promises'
import {existsSync} from 'node:fs'
import path from 'node:path'
import {storagePaths,saveStorage,checkStorage} from './Helpers/Storage.js'
import {AudioImports} from './Multimedia/audio.js'
import {StoryCatalog,exportStory,exportCollection,exportByStory} from './Multimedia/feeds.js'
import {getBinPath,getMusicPath,getStoriesPath} from './Helpers/AppPaths.js'
import {readMusic} from './Helpers/MusicFiles.js'
import {readStories} from './Helpers/Stories.js'

export default function mainEventMultimedia(window){
 const resources=app.isPackaged?path.join(process.resourcesPath,'extraResources'):path.join(app.getAppPath(),'extraResources')
 const binary=name=>{const f=name+(process.platform==='win32'?'.exe':'');const full=path.join(resources,'video-tools',f);return existsSync(full)?full:getBinPath(f)}
 const tools={ffmpeg:binary('ffmpeg'),ffprobe:binary('ffprobe'),ytdlp:binary('yt-dlp'),node:process.execPath,font:path.join(resources,'fonts','exo2.ttf')}
 const send=(name,value)=>{if(!window.isDestroyed())window.webContents.send(name,value)}
 let readyCount=0
 const audio=new AudioImports(tools,path.join(app.getPath('userData'),'audio-imports.json'),()=>storagePaths(undefined,app.getPath('userData')),jobs=>{send('media-audio-jobs',jobs);const count=jobs.filter(j=>j.status==='ready').length;if(count!==readyCount){readyCount=count;try{send('local-musics-data',readMusic(getMusicPath()))}catch(error){send('error-warning',{title:'Stockage musical',message:error.message})}}})
 const sourcesFile=path.join(app.getAppPath(),'public/MainEvents/Multimedia/sources.json')
 let catalog;const catalogReady=fs.readFile(sourcesFile,'utf8').then(raw=>{catalog=new StoryCatalog(path.join(app.getPath('userData'),'story-catalog'),JSON.parse(raw));return catalog.ready})
 let importing=null
 window.syncPlusMediaIdle=async()=>{await audio.cancel();importing?.abort();await audio.idle();while(importing)await new Promise(resolve=>setTimeout(resolve,30))}
 const handle=(name,callback)=>ipcMain.handle('media-'+name,async(event,...args)=>{if(event.sender!==window.webContents||event.senderFrame!==window.webContents.mainFrame)return {ok:false,error:'Requête non autorisée.'};try{return {ok:true,data:await callback(...args)}}catch(e){return {ok:false,error:e.message}}})
 handle('storage',()=>storagePaths(undefined,app.getPath('userData')))
 handle('storage-check',folder=>checkStorage(folder))
 handle('storage-choose',async()=>{const chosen=await dialog.showOpenDialog(window,{properties:['openDirectory','createDirectory']});return chosen.filePaths[0]||null})
 handle('storage-save',async paths=>{if(audio.running||importing||window.syncPlusVideoLibrary?.active||window.syncPlusVideoLibrary?.pending.length)throw new Error('Attendez la fin des imports avant de changer le stockage.');return saveStorage(paths)})
 handle('music-cover',async()=>{const result=await dialog.showOpenDialog(window,{properties:['openFile'],filters:[{name:'Pochette',extensions:['jpg','jpeg','png']}]});return result.filePaths[0]||null})
 handle('audio-analyze',url=>audio.analyze(url))
 handle('audio-jobs',async()=>{await audio.ready;return audio.jobs})
 handle('audio-import',(entries,kbps,authorized)=>audio.enqueue(entries,kbps,authorized))
 handle('audio-retry',ids=>audio.retry(ids))
 handle('audio-cancel',()=>audio.cancel())
 handle('music-search',async query=>{if(typeof query!=='string'||query.length>200)throw new Error('Recherche invalide.');const url=new URL('https://musicbrainz.org/ws/2/recording/');url.searchParams.set('query',query);url.searchParams.set('fmt','json');url.searchParams.set('limit','8');const r=await fetch(url,{headers:{'User-Agent':'TELMI-Sync-Plus/0.20 (https://github.com/thierrystr13/Telmi-Sync-Plus)'},signal:AbortSignal.timeout(20000)});if(!r.ok)throw new Error('MusicBrainz indisponible.');const data=await r.json();return (data.recordings||[]).map(x=>({title:x.title,artist:(x['artist-credit']||[]).map(a=>a.name||a.artist?.name||'').join(', '),album:x.releases?.[0]?.title||'Singles',date:x.releases?.[0]?.date||'',release:x.releases?.[0]?.id}))})
 handle('catalog',async(force=false)=>{await catalogReady;return catalog.refresh(force)})
 handle('catalog-add',async url=>{await catalogReady;return catalog.add(url)})
 handle('catalog-remove',async id=>{await catalogReady;return catalog.remove(id)})
 handle('catalog-favorite',async id=>{await catalogReady;return catalog.favorite(id)})
 handle('catalog-open',async id=>{await catalogReady;const e=catalog.state.episodes.find(x=>x.id===id);if(!e)throw new Error('Histoire introuvable.');const source=catalog.state.sources.find(s=>s.id===e.sourceId);const url=new URL(source.publisher||source.url);if(url.protocol!=='https:')throw new Error('Lien officiel HTTPS requis.');await shell.openExternal(url.href)})
 handle('story-cancel',()=>importing?.abort())
 handle('story-import',async(ids,authorized,group=false)=>{await catalogReady;if(importing)throw new Error('Un import est déjà en cours.');if(!Array.isArray(ids)||ids.length>100)throw new Error('Choisissez au maximum 100 histoires.');const controller=new AbortController();importing=controller;const results=[];try{if(group==='by-story'){const episodes=ids.map(id=>catalog.state.episodes.find(e=>e.id===id));if(episodes.some(e=>!e))throw new Error('Un épisode a disparu du catalogue ; actualisez la sélection.');const result=await exportByStory(tools,episodes,storagePaths(undefined,app.getPath('userData')),{authorized,signal:controller.signal,onProgress:p=>send('media-story-progress',p)});catalog.state.imported=[...new Set([...catalog.state.imported,...result.filter(r=>r.ok).map(r=>r.id)])];await catalog.save();send('local-stories-data',readStories(getStoriesPath()).stories);return result}if(group===true){const episodes=ids.map(id=>catalog.state.episodes.find(e=>e.id===id)).filter(Boolean);await exportCollection(tools,episodes,storagePaths(undefined,app.getPath('userData')),{authorized,signal:controller.signal});catalog.state.imported=[...new Set([...catalog.state.imported,...ids])];await catalog.save();send('local-stories-data',readStories(getStoriesPath()).stories);return ids.map(id=>({id,ok:true}))}for(let i=0;i<ids.length;i++){if(controller.signal.aborted)break;const episode=catalog.state.episodes.find(e=>e.id===ids[i]);if(!episode)continue;try{await exportStory(tools,episode,storagePaths(undefined,app.getPath('userData')),{authorized,signal:controller.signal});catalog.state.imported=[...new Set([...catalog.state.imported,episode.id])];results.push({id:episode.id,ok:true})}catch(e){results.push({id:episode.id,error:e.message})}send('media-story-progress',{current:i+1,total:ids.length});await catalog.save()}send('local-stories-data',readStories(getStoriesPath()).stories);return results}finally{importing=null}})
 app.on('before-quit',()=>{audio.cancel();importing?.abort()})
}
