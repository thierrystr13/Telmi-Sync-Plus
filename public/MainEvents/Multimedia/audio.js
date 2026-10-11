import fs from 'node:fs/promises'
import path from 'node:path'
import {randomUUID} from 'node:crypto'
import {run,image,hash} from '../Videos/process.js'
import {OnlineVideo,youtubeUrl} from '../Videos/network.js'
import {atomicJson} from '../Videos/library.js'
const clean=v=>String(v||'Inconnu').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[\\/:*?"<>|_\x00-\x1f]/g,' ').trim().slice(0,70)
export function musicFilename(data){return [clean(data.artist),clean(data.album||'Singles'),String(data.track||0).padStart(2,'0'),clean(data.title)].join('_')+'.mp3'}
export function youtubeCollection(value){const u=new URL(value);if(u.protocol!=='https:'||u.username||u.password||u.port||!['youtube.com','www.youtube.com','m.youtube.com','youtu.be'].includes(u.hostname))throw new Error('URL YouTube invalide.');const list=u.searchParams.get('list');if(list&&/^[A-Za-z0-9_-]{2,100}$/.test(list))return {playlist:true,url:'https://www.youtube.com/playlist?list='+list};return {playlist:false,url:youtubeUrl(value)}}
export async function audioProbe(tools,file,options={}){const data=JSON.parse(await run(tools.ffprobe,['-v','error','-show_format','-show_streams','-of','json',file],options));const audio=data.streams?.find(s=>s.codec_type==='audio'),duration=Number(data.format?.duration);if(!audio||!Number.isFinite(duration)||duration<=0)throw new Error('Audio invalide.');return {audio,duration,tags:data.format.tags||{}}}
export async function convertMp3(tools,source,target,kbps=192,options={}){if(![128,192,256].includes(Number(kbps)))throw new Error('Débit MP3 invalide.');const input=await audioProbe(tools,source,options);const copy=input.audio.codec_name==='mp3'&&Number(input.audio.channels)<=2&&Number(input.audio.sample_rate)<=48000;const rate=Math.min(Number(kbps),Math.max(64,Math.round(Number(input.audio.bit_rate||kbps*1000)/1000)));await run(tools.ffmpeg,['-v','error','-nostdin','-y','-i',source,'-map','0:a:0','-vn',...(copy?['-c:a','copy']:['-c:a','libmp3lame','-b:a',rate+'k','-ar','44100','-ac','2']),target],options);const output=await audioProbe(tools,target,options);if(output.audio.codec_name!=='mp3'||Math.abs(output.duration-input.duration)>2)throw new Error('MP3 produit invalide.');await run(tools.ffmpeg,['-v','error','-xerror','-i',target,'-f','null','-'],options);return output}
export async function taggedMusic(tools,source,cover,target,data,options={}){await run(tools.ffmpeg,['-v','error','-nostdin','-y','-i',source,'-i',cover,'-map','0:a:0','-map','1:v:0','-c:a','copy','-c:v','png','-disposition:v','attached_pic','-id3v2_version','3',...['title','artist','album','track','date','genre'].flatMap(k=>['-metadata',k+'='+String(data[k]||'')]),target],options);await audioProbe(tools,target,options)}
export async function musicCover(tools,job,target,paths,options={}) {
 if(job.cover){if(!path.isAbsolute(job.cover)||! /\.(jpg|jpeg|png)$/i.test(job.cover))throw new Error('Pochette locale JPG/PNG requise.');await image(tools,job.cover,target,256,256,options);return}
 if(/^[a-f0-9-]{36}$/i.test(job.release||'')) {
  const {publicFetch}=await import('./feeds.js')
  const raw=path.join(path.dirname(target),'archive-cover.image')
  try{await fs.writeFile(raw,await publicFetch('https://coverartarchive.org/release/'+job.release+'/front-250',{signal:options.signal,maxBytes:8*1024*1024}));await image(tools,raw,target,256,256,options);await fs.mkdir(paths.artwork,{recursive:true});await fs.copyFile(target,path.join(paths.artwork,job.release+'.png'));return}catch(error){if(options.signal?.aborted)throw error;job.coverNotice='Pochette distante indisponible : illustration par défaut.'}
 }
 await run(tools.ffmpeg,['-v','error','-y','-f','lavfi','-i','color=c=0x341448:s=256x256','-frames:v','1',target],options)
}
export class AudioImports{
 constructor(tools,state,paths,changed=()=>{},adapter={}){this.tools=tools;this.state=state;this.paths=paths;this.changed=changed;this.adapter=adapter;this.jobs=[];this.running=false;this.controller=null;this.ready=this.init()}
 async init(){try{this.jobs=JSON.parse(await fs.readFile(this.state,'utf8'));for(const j of this.jobs)if(['queued','running'].includes(j.status))j.status='interrupted'}catch{}}
 async save(){await fs.mkdir(path.dirname(this.state),{recursive:true});await atomicJson(this.state,this.jobs);this.changed(this.jobs)}
 async analyze(value){const c=youtubeCollection(value),online=new OnlineVideo(this.tools);if(!c.playlist){const info=await online.analyze(c.url);return [{...info,id:new URL(info.url).searchParams.get('v'),artist:'',album:'Singles',track:1}]}
 const data=JSON.parse(await run(this.tools.ytdlp,[...online.common().filter((v,i,a)=>v!=='--no-playlist'),'--flat-playlist','--skip-download','--playlist-end','500','--dump-single-json','--',c.url],{env:{...process.env,ELECTRON_RUN_AS_NODE:'1'},timeout:120000}));return (data.entries||[]).filter(e=>/^[A-Za-z0-9_-]{11}$/.test(e.id||'')).map((e,i)=>({id:e.id,url:'https://www.youtube.com/watch?v='+e.id,title:e.title||e.id,artist:e.artist||'',album:e.album||'Singles',track:i+1,durationSeconds:e.duration,allowed:true,availability:'À vérifier lors de l’import'}))}
 async enqueue(entries,kbps,authorized){
  await this.ready
  if(authorized!==true)throw new Error('Confirmez les droits de téléchargement des pistes sélectionnées.')
  if(!Array.isArray(entries)||entries.length>500||![128,192,256].includes(Number(kbps)))throw new Error('Sélection ou débit invalide.')
  for(const e of entries){
   const url=youtubeUrl(e.url),existing=this.jobs.find(j=>j.url===url)
   if(existing&&['ready','running','queued'].includes(existing.status))continue
   const values={url,...Object.fromEntries(['title','artist','album','track','date','genre','cover','release'].map(k=>[k,String(e[k]||'').slice(0,4096)])),kbps:Number(kbps),status:'queued',progress:0,error:''}
   if(existing)Object.assign(existing,values);else this.jobs.push({id:randomUUID(),...values})
  }
  await this.save();this.drain()
 }
 async download(job,work,options){
  if(this.adapter.download)return this.adapter.download(job,work,options)
  const online=new OnlineVideo(this.tools),info=await online.analyze(job.url,options)
  if(!info.allowed)throw new Error(info.reason)
  await run(this.tools.ytdlp,[...online.common(),'-f','ba[has_drm!=true]/b[has_drm!=true]','--continue','--newline','--progress','--progress-template','download:SYNCPLUS:%(progress._percent_str)s','-o',path.join(work,'source.%(ext)s'),'--',job.url],{...options,capture:false,onLine:line=>{const m=/SYNCPLUS:\s*([\d.]+)%/.exec(line);if(m){job.progress=Number(m[1])/100;this.changed(this.jobs)}}})
 }
 async drain(){
  if(this.running)return
  this.running=true
  try{while(this.jobs.some(j=>j.status==='queued')){
   const job=this.jobs.find(j=>j.status==='queued'),controller=new AbortController();this.controller=controller
   const options={signal:controller.signal,env:{...process.env,ELECTRON_RUN_AS_NODE:'1'}},paths=this.paths(),work=path.join(paths.downloads,'audio-'+job.id),stage=path.join(paths.music,'.telmi-audio-'+job.id+'.tmp')
   let published=null,coverPublished=null
   try{
    await fs.mkdir(work,{recursive:true});job.status='running';await this.save();await this.download(job,work,options)
    const names=(await fs.readdir(work)).filter(n=>/^source\./.test(n)&&! /\.(part|ytdl)$/.test(n))
    if(names.length!==1)throw new Error('Audio incomplet.')
    await convertMp3(this.tools,path.join(work,names[0]),path.join(work,'audio.mp3'),job.kbps,options)
    const cover=path.join(work,'cover.png');await musicCover(this.tools,job,cover,paths,options)
    await fs.mkdir(paths.music,{recursive:true})
    const destination=path.join(paths.music,musicFilename(job)),coverDestination=destination.replace(/\.mp3$/,'.png')
    if(await fs.access(destination).then(()=>true,()=>false))throw new Error('Un morceau de même nom existe : corrigez les métadonnées.')
    await taggedMusic(this.tools,path.join(work,'audio.mp3'),cover,path.join(work,'final.mp3'),job,options)
    await fs.copyFile(path.join(work,'final.mp3'),stage)
    if(await hash(stage,controller.signal)!==await hash(path.join(work,'final.mp3'),controller.signal))throw new Error('Copie bibliothèque non conforme.')
    await fs.copyFile(cover,coverDestination,fs.constants.COPYFILE_EXCL);coverPublished=coverDestination
    await fs.copyFile(stage,destination,fs.constants.COPYFILE_EXCL);published=destination
    if(await hash(destination,controller.signal)!==await hash(stage,controller.signal))throw new Error('Copie bibliothèque non conforme.')
    job.status='ready';job.file=destination;job.progress=1;await this.save()
    await fs.rm(work,{recursive:true,force:true})
   }catch(e){
    if(job.status!=='ready'){if(published)await fs.rm(published,{force:true});if(coverPublished)await fs.rm(coverPublished,{force:true});job.status=controller.signal.aborted?'interrupted':'error';job.error=e.message}
    else job.cleanupNotice='Import validé ; nettoyage temporaire à reprendre : '+e.message
   }finally{await fs.rm(stage,{force:true}).catch(()=>{});await this.save();this.controller=null}
  }}finally{this.running=false}
 }
 async idle(){while(this.running)await new Promise(resolve=>setTimeout(resolve,30))}
 async retry(ids){for(const j of this.jobs)if(ids.includes(j.id)&&['error','interrupted'].includes(j.status)){j.status='queued';j.error=''}await this.save();this.drain()}
 cancel(){this.controller?.abort();for(const j of this.jobs)if(j.status==='queued')j.status='interrupted';return this.save()}
}
