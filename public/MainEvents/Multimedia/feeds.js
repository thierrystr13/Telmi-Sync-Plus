import fs from 'node:fs/promises'
import path from 'node:path'
import {createHash,randomUUID} from 'node:crypto'
import {parseStringPromise} from 'xml2js'
import {atomicJson} from '../Videos/library.js'
import {run,image,hash} from '../Videos/process.js'
import {audioProbe,convertMp3} from './audio.js'
import {generateDirNameStory} from '../Helpers/Stories.js'
const text=v=>typeof v==='string'?v:v?._||''
const plain=v=>String(v||'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim()
export const digest=v=>createHash('sha256').update(v).digest('hex')
export function durationValue(value){const s=String(value||'');if(/^\d+$/.test(s))return Number(s);if(/^\d+(?::\d+){1,2}$/.test(s))return s.split(':').reduce((n,x)=>n*60+Number(x),0);return 0}
export async function parseFeed(xml,source){
 if(Buffer.byteLength(xml)>20*1024*1024||/<!DOCTYPE|<!ENTITY/i.test(xml))throw new Error('Flux XML trop volumineux ou non sûr.')
 const doc=await parseStringPromise(xml,{explicitArray:true}),channel=doc.rss?.channel?.[0]||doc.feed
 if(!channel)throw new Error('Ce document ne contient pas de RSS/Atom.')
 const title=text(channel.title?.[0]);if(/france inter/i.test(title+' '+source.url))throw new Error('France Inter est déjà présent ; source non ajoutée.')
 if(source.id==='kidstory'&&!/kidstory/i.test(title))throw new Error('Le flux candidat ne correspond pas à KIDSTORY.')
 const picture=channel['itunes:image']?.[0]?.$?.href||channel.image?.[0]?.url?.[0]||''
 const episodes=(channel.item||channel.entry||[]).slice(0,10000).map(item=>{
   const link=item.enclosure?.[0]?.$ || item.link?.find(x=>x.$?.rel==='enclosure')?.$ || {}, url=link.url||link.href||''
   const description=plain(text(item['content:encoded']?.[0]||item.description?.[0]||item.summary?.[0])),title=plain(text(item.title?.[0]))
   const tags=(item.category||[]).map(text), ageMatch=(title+' '+description).match(/(?:dès|à partir de|a partir de)\s*(\d{1,2})\s*ans/i)
   const lower=(title+' '+description+' '+tags.join(' ')).toLowerCase(), themes=['dragon','pirate','dinosaure','animal','princesse','chevalier','sorcière','espace','dormir','humour','mythologie','conte'].filter(t=>lower.includes(t))
   const kind=/saison|feuilleton/i.test(lower)?'Feuilleton':/partie\s*\d|épisode\s*\d|chapitre\s*\d/i.test(lower)?'Histoire en plusieurs parties':/conte traditionnel|grimm|perrault|andersen/i.test(lower)?'Conte traditionnel':'Histoire indépendante'
   const premium=/réservé.{0,20}abonn|subscriber.only|premium.only|subscribe.to.listen/i.test(lower)
   const categories=Object.entries({'Contes':/conte/,'Aventures':/aventure|pirate|chevalier/,'Animaux':/animal|animaux|chat|chien/,'Fantastique':/dragon|sorci|fantastique/,'Humour':/humour|drôle|drôle/,'Mythologie':/mytholog/,'Histoires du soir':/dormir|sommeil|soir/,'Découvertes':/découvr|decouvr|science|espace/,'Histoires classiques':/grimm|perrault|andersen|classique/}).filter(([,pattern])=>pattern.test(lower)).map(([label])=>label)
   return {id:digest(text(item.guid?.[0]||item.id?.[0])||url||title),title,sourceId:source.id,source:source.title||source.id,description,url,link:text(item.link?.find(x=>typeof x==='string')||item.link?.[0])||source.publisher,cover:item['itunes:image']?.[0]?.$?.href||picture,duration:durationValue(text(item['itunes:duration']?.[0])),age:ageMatch?Number(ageMatch[1]):null,classificationEstimated:true,themes,categories,kind,author:text(item['itunes:author']?.[0]||item.author?.[0]),date:text(item.pubDate?.[0]||item.published?.[0]),available:/^https?:\/\//.test(url)&&!premium,premium}
 })
 return {title,cover:picture,episodes}
}
export async function publicFetch(url,{signal,maxBytes=20*1024*1024,redirects=5}={}){
 const u=new URL(url);if(!['https:','http:'].includes(u.protocol)||u.username||u.password||u.port||/^(localhost|127\.|10\.|192\.168\.|169\.254\.|\[|0\.)/i.test(u.hostname)||/^172\.(1[6-9]|2\d|3[01])\./.test(u.hostname))throw new Error('Adresse publique HTTP(S) requise.')
 const response=await fetch(url,{signal:signal||AbortSignal.timeout(30000),headers:{'User-Agent':'TELMI-Sync-Plus/0.20 RSS personal library'},redirect:'manual'})
 if(response.status>=300&&response.status<400){if(!redirects||!response.headers.get('location'))throw new Error('Redirection excessive.');return publicFetch(new URL(response.headers.get('location'),url).href,{signal,maxBytes,redirects:redirects-1})}
 if(!response.ok)throw new Error('Source indisponible (HTTP '+response.status+').')
 const chunks=[];let size=0;for await(const chunk of response.body){size+=chunk.length;if(size>maxBytes)throw new Error('Fichier trop volumineux.');chunks.push(chunk)}return Buffer.concat(chunks)
}
export class StoryCatalog{
 constructor(root,sources){this.root=root;this.sources=sources;this.ready=this.init();this.refreshing=null}
 async init(){await fs.mkdir(this.root,{recursive:true});try{this.state=JSON.parse(await fs.readFile(path.join(this.root,'catalog.json'),'utf8'))}catch{this.state={sources:this.sources,episodes:[],favorites:[],imported:[],checkedAt:0}}}
 async save(){await atomicJson(path.join(this.root,'catalog.json'),this.state)}
 async refresh(force=false){await this.ready;if(this.refreshing)return this.refreshing;if(!force&&Date.now()-this.state.checkedAt<24*3600000)return this.state;this.refreshing=this.update().finally(()=>{this.refreshing=null});return this.refreshing}
 async update(){for(const source of this.state.sources){try{const data=await parseFeed((await publicFetch(source.url)).toString('utf8'),source);source.valid=true;source.feedTitle=data.title;source.count=data.episodes.length;source.audioCount=data.episodes.filter(e=>e.available).length;source.error='';this.state.episodes=this.state.episodes.filter(e=>e.sourceId!==source.id).concat(data.episodes)}catch(e){source.valid=false;source.error=e.message}}this.state.episodes=[...new Map(this.state.episodes.map(e=>[e.url||e.id,e])).values()];this.state.checkedAt=Date.now();await this.save();return this.state}
 async add(url){await this.ready;const source={id:digest(url).slice(0,16),url,title:'Source personnelle',publisher:url,priority:3};const data=await parseFeed((await publicFetch(url)).toString('utf8'),source);if(this.state.sources.some(s=>s.url===url))return this.state;source.title=data.title;source.valid=true;source.count=data.episodes.length;source.audioCount=data.episodes.filter(e=>e.available).length;this.state.sources.push(source);this.state.episodes.push(...data.episodes);await this.save();return this.state}
 async remove(id){this.state.sources=this.state.sources.filter(s=>s.id!==id);this.state.episodes=this.state.episodes.filter(e=>e.sourceId!==id);await this.save();return this.state}
 async favorite(id){const s=new Set(this.state.favorites);s.has(id)?s.delete(id):s.add(id);this.state.favorites=[...s];await this.save();return this.state}
}
export async function exportStory(tools,episode,paths,{authorized=false,signal,fetcher=publicFetch}={}){
 if(!authorized||!episode.available||episode.premium)throw new Error('Import réservé aux épisodes accessibles dont vous avez les droits. Sinon utilisez le lecteur officiel.')
 const dirName=generateDirNameStory(episode.title,episode.id.slice(0,36),episode.age||undefined,'Littérature audio'),target=path.join(paths.stories,dirName)
 if(await fs.access(path.join(target,'metadata.json')).then(()=>true,()=>false))return target
 const uuid=randomUUID(),work=path.join(paths.work,'story-'+uuid),staging=path.join(paths.stories,'.telmi-story-'+uuid);await fs.mkdir(work,{recursive:true})
 try{
  await fs.writeFile(path.join(work,'source.audio'),await fetcher(episode.url,{signal,maxBytes:512*1024*1024}));await convertMp3(tools,path.join(work,'source.audio'),path.join(work,'story.mp3'),128,{signal})
  const duration=(await audioProbe(tools,path.join(work,'story.mp3'))).duration
  if(episode.duration&&Math.abs(duration-episode.duration)>Math.max(5,episode.duration*0.02))throw new Error('Durée audio différente du catalogue.')
  const pack=path.join(work,'pack');await fs.mkdir(path.join(pack,'audios'),{recursive:true});await fs.mkdir(path.join(pack,'images'),{recursive:true})
  await fs.copyFile(path.join(work,'story.mp3'),path.join(pack,'audios','story.mp3'))
  const cover=path.join(work,'cover.image')
  try{if(!episode.cover)throw new Error('Missing cover');await fs.writeFile(cover,await fetcher(episode.cover,{signal,maxBytes:8*1024*1024}));await image(tools,cover,path.join(pack,'title.png'),512,512,{signal})}catch{await run(tools.ffmpeg,['-v','error','-y','-f','lavfi','-i','color=c=0x341448:s=512x512','-frames:v','1',path.join(pack,'title.png')],{signal})}
  await fs.copyFile(path.join(pack,'title.png'),path.join(pack,'cover.png'));await image(tools,path.join(pack,'title.png'),path.join(work,'screen.png'),640,480,{signal})
  const caption=path.join(work,'caption.txt'),font=tools.font||path.resolve('extraResources/fonts/exo2.ttf')
  await fs.writeFile(caption,(episode.title.match(/.{1,36}(?:\s|$)|.{1,36}/g)||[episode.title]).slice(0,3).join('\n'),'utf8')
  const escaped=f=>f.replace(/\\/g,'\\\\').replace(/:/g,'\\:').replace(/'/g,"\\'")
  await run(tools.ffmpeg,['-v','error','-y','-i',path.join(work,'screen.png'),'-vf',"drawtext=fontfile='"+escaped(font)+"':textfile='"+escaped(caption)+"':expansion=none:fontcolor=white:fontsize=28:box=1:boxcolor=0x241035@0.85:boxborderw=12:x=(w-text_w)/2:y=h-text_h-22",'-frames:v','1',path.join(pack,'images','cover.png')],{signal})
  await run(tools.ffmpeg,['-v','error','-y','-f','lavfi','-i','anullsrc=r=44100:cl=mono','-t','0.2','-c:a','libmp3lame',path.join(pack,'title.mp3')],{signal})
  await atomicJson(path.join(pack,'metadata.json'),{title:episode.title,uuid:episode.id.slice(0,36),version:1,image:'cover.png',category:'Littérature audio',description:episode.description,...(episode.age?{age:episode.age}:{})})
  await atomicJson(path.join(pack,'nodes.json'),{startAction:{action:'play',index:0},stages:{story:{image:'cover.png',audio:'story.mp3',ok:{action:'play',index:0},home:null,control:{ok:false,home:true,autoplay:true}}},actions:{play:[{stage:'story'}]}})
  await atomicJson(path.join(pack,'notes.json'),{story:{title:episode.title,notes:episode.description}})
  await fs.mkdir(paths.stories,{recursive:true});await fs.cp(pack,staging,{recursive:true,errorOnExist:true,force:false})
  for(const file of ['metadata.json','nodes.json','notes.json','title.mp3','title.png','cover.png','audios/story.mp3','images/cover.png'])if(await hash(path.join(pack,file),signal)!==await hash(path.join(staging,file),signal))throw new Error('Copie histoire non conforme.')
  if(signal?.aborted)throw new Error('Import annulé.')
  await fs.rename(staging,target);return target
 }finally{await fs.rm(work,{recursive:true,force:true});await fs.rm(staging,{recursive:true,force:true})}
}
export async function exportCollection(tools,episodes,paths,options={}) {
 if(!episodes.length||episodes.length>100)throw new Error('Collection vide ou trop grande.')
 const ordered=[...episodes].sort((a,b)=>{
  const number=e=>Number(/(?:épisode|chapitre|partie)\s*(\d+)/i.exec(e.title)?.[1])
  const x=number(a),y=number(b)
  return x&&y?x-y:Date.parse(a.date)-Date.parse(b.date)||a.title.localeCompare(b.title,'fr',{numeric:true})
 })
 const uuid=digest(ordered.map(e=>e.id).join('|')).slice(0,36),title=ordered[0].source+' — Collection'
 const target=path.join(paths.stories,generateDirNameStory(title,uuid,undefined,'Littérature audio'))
 if(await fs.access(path.join(target,'metadata.json')).then(()=>true,()=>false))return target
 const work=path.join(paths.work,'collection-'+randomUUID()),staging=path.join(paths.stories,'.telmi-collection-'+randomUUID())
 try{
  await fs.mkdir(path.join(work,'stories'),{recursive:true});await fs.mkdir(path.join(staging,'audios'),{recursive:true});await fs.mkdir(path.join(staging,'images'),{recursive:true})
  const stages={},actions={menu:[]},notes={}
  for(let i=0;i<ordered.length;i++){
   const episode=ordered[i],pack=await exportStory(tools,episode,{...paths,stories:path.join(work,'stories')},options)
   for(const [src,dst] of [['audios/story.mp3','audios/s'+i+'.mp3'],['title.mp3','audios/m'+i+'.mp3'],['images/cover.png','images/m'+i+'.png']]){
    await fs.copyFile(path.join(pack,src),path.join(staging,dst));if(await hash(path.join(pack,src),options.signal)!==await hash(path.join(staging,dst),options.signal))throw new Error('Copie collection non conforme.')
   }
   if(i===0)for(const f of ['title.png','title.mp3','cover.png'])await fs.copyFile(path.join(pack,f),path.join(staging,f))
   stages['m'+i]={image:'m'+i+'.png',audio:'m'+i+'.mp3',ok:{action:'s'+i,index:0},home:null,control:{ok:true,home:true,autoplay:false}}
   stages['s'+i]={image:null,audio:'s'+i+'.mp3',ok:{action:'menu',index:(i+1)%ordered.length},home:{action:'menu',index:i},control:{ok:false,home:true,autoplay:true}}
   actions.menu.push({stage:'m'+i});actions['s'+i]=[{stage:'s'+i}];notes['m'+i]={title:episode.title,notes:episode.description};notes['s'+i]=notes['m'+i]
  }
  await atomicJson(path.join(staging,'nodes.json'),{startAction:{action:'menu',index:0},stages,actions})
  await atomicJson(path.join(staging,'notes.json'),notes)
  await atomicJson(path.join(staging,'metadata.json'),{title,uuid,version:1,image:'cover.png',category:'Littérature audio',description:ordered.map(e=>e.title).join('\n')})
  if(options.signal?.aborted)throw new Error('Import annulé.')
  await fs.rename(staging,target);return target
 }finally{await fs.rm(work,{recursive:true,force:true});await fs.rm(staging,{recursive:true,force:true})}
}
