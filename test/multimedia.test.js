import {test,before,after} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import {randomUUID} from 'node:crypto'
import {storagePaths,saveStorage,checkStorage,STORAGE_KEYS} from '../public/MainEvents/Helpers/Storage.js'
import {run,probe,convert,hash} from '../public/MainEvents/Videos/process.js'
import {conversionPlan} from '../public/MainEvents/Videos/contract.js'
import {audioProbe,convertMp3,taggedMusic,musicFilename,youtubeCollection,AudioImports} from '../public/MainEvents/Multimedia/audio.js'
import {parseFeed,durationValue,StoryCatalog,exportStory,exportCollection,publicFetch} from '../public/MainEvents/Multimedia/feeds.js'
import {readStories} from '../public/MainEvents/Helpers/Stories.js'

const root=path.resolve('test-output',randomUUID()),bin=n=>process.env[n.toUpperCase()+'_PATH']||path.resolve('extraResources/video-tools',n+(process.platform==='win32'?'.exe':''))
const tools={ffmpeg:bin('ffmpeg'),ffprobe:bin('ffprobe'),ytdlp:bin('yt-dlp'),node:process.execPath}
let audio,cover,paths
before(async()=>{
 await fs.mkdir(root,{recursive:true});audio=path.join(root,'personal.wav');cover=path.join(root,'personal.png')
 paths=Object.fromEntries(STORAGE_KEYS.map(k=>[k,path.join(root,k)]))
 await run(tools.ffmpeg,['-v','error','-y','-f','lavfi','-i','sine=frequency=440:sample_rate=44100','-t','1',audio])
 await run(tools.ffmpeg,['-v','error','-y','-f','lavfi','-i','color=c=blue:s=200x300','-frames:v','1',cover])
})
after(()=>fs.rm(root,{recursive:true,force:true}))
test('storage validates write access and free space; paths persist without moving originals',async()=>{
 const personal=path.join(root,'personal-library');await fs.mkdir(personal);await fs.writeFile(path.join(personal,'keep.txt'),'keep')
 const s=await checkStorage(personal);assert.ok(s.available>0);assert.equal(s.writable,true)
 await saveStorage(paths,root);assert.deepEqual(storagePaths(root),paths);assert.equal(await fs.readFile(path.join(personal,'keep.txt'),'utf8'),'keep')
 await assert.rejects(checkStorage('relative/path'));await assert.rejects(checkStorage(audio));await assert.rejects(saveStorage({...paths,music:audio},root));assert.deepEqual(storagePaths(root),paths)
})
test('UNC paths accepted on Windows; inaccessible server errors do not overwrite settings',async()=>{
 if(process.platform!=='win32')return
 const unc='\\\\127.0.0.1\\TELMI-nonexistent-'+randomUUID()
 assert.ok(path.isAbsolute(unc));await assert.rejects(checkStorage(unc,1500));assert.deepEqual(storagePaths(root),paths)
})
test('already compatible low-bitrate baseline MP4 is remuxed with identical decoded video',async()=>{
 const input=path.join(root,'small.mp4'),output=path.join(root,'remux.mp4')
 await run(tools.ffmpeg,['-v','error','-y','-f','lavfi','-i','testsrc2=s=320x240:r=12','-i',audio,'-t','1','-c:v','libx264','-profile:v','baseline','-level:v','3.0','-b:v','150k','-pix_fmt','yuv420p','-c:a','aac','-b:a','64k',input])
 const info=await probe(tools.ffprobe,input);assert.equal(conversionPlan(info).mode,'remux')
 const result=await convert(tools,input,output,'balanced',info);assert.equal(result.conversionMode,'remux');assert.ok(Number.isFinite(result.sizeChangePercent))
 const frames=async file=>await run(tools.ffmpeg,['-v','error','-i',file,'-map','0:v:0','-f','framemd5','-'])
 assert.equal(await frames(input),await frames(output));assert.equal(result.audio.sample_rate,'44100')
})
test('incompatible low-rate source does not receive the full profile bitrate',()=>{
 const plan=conversionPlan({video:{codec_name:'vp9',bit_rate:'200000'},audio:{bit_rate:'64000'},originalBytes:35000,durationSeconds:1,width:320,height:240,fps:12},'balanced')
 assert.equal(plan.mode,'encode');assert.equal(plan.videoKbps,180);assert.equal(plan.audioKbps,64)
})
test('128, 192 and 256 kb/s MP3 outputs decode with duration and audible samples preserved',async()=>{
 const digest=await hash(audio)
 for(const rate of [128,192,256]){const dst=path.join(root,rate+'.mp3');const out=await convertMp3(tools,audio,dst,rate);assert.ok(Math.abs(out.duration-1)<0.15);assert.equal(out.audio.codec_name,'mp3');const pcm=path.join(root,rate+'.pcm');await run(tools.ffmpeg,['-v','error','-y','-i',dst,'-f','s16le',pcm]);assert.ok((await fs.readFile(pcm)).some(x=>x!==0))}
 assert.equal(await hash(audio),digest)
})
test('compatible MP3 is copied rather than raised to 256 kb/s',async()=>{
 const out=path.join(root,'copy.mp3');await convertMp3(tools,path.join(root,'128.mp3'),out,256)
 assert.equal((await audioProbe(tools,out)).audio.bit_rate,'128000')
 const packets=async f=>run(tools.ffmpeg,['-v','error','-i',f,'-map','0:a:0','-c','copy','-f','hash','-hash','sha256','-'])
 assert.equal(await packets(out),await packets(path.join(root,'128.mp3')))
})
test('ID3 text and attached PNG cover are written without changing personal cover',async()=>{
 const original=await hash(cover),out=path.join(root,'tagged.mp3');await taggedMusic(tools,path.join(root,'128.mp3'),cover,out,{title:'Titre é',artist:'Artiste',album:'Album',track:3,date:'2026',genre:'Test'})
 const data=JSON.parse(await run(tools.ffprobe,['-v','error','-show_format','-show_streams','-of','json',out]));assert.equal(data.format.tags.title,'Titre é');assert.equal(data.format.tags.album,'Album');assert.equal(data.streams[1].disposition.attached_pic,1);assert.equal(await hash(cover),original)
})
test('playlist detection is canonical, filenames compatible and hostile URLs rejected',()=>{
 assert.equal(youtubeCollection('https://www.youtube.com/watch?v=abcdefghijk&list=PLtest').playlist,true)
 assert.equal(youtubeCollection('https://youtu.be/abcdefghijk').playlist,false)
 for(const u of ['file:///secret','https://youtube.com.evil/playlist?list=PL123','https://user:pass@youtube.com/playlist?list=PLtest'])assert.throws(()=>youtubeCollection(u))
 assert.equal(musicFilename({artist:'A_B',album:'Singles',title:'C/D',track:1}),'A B_Singles_01_C D.mp3')
})
test('audio batch queue, duplicate prevention, tags, cover, persistence and successful cleanup',async()=>{
 const state=path.join(root,'audio-state.json'),local={...paths,music:path.join(root,'batch')}
 const queue=new AudioImports(tools,state,()=>local,()=>{},{download:async(job,work)=>fs.copyFile(audio,path.join(work,'source.wav'))})
 const entries=['abcdefghijk','bcdefghijkl'].map((id,i)=>({url:'https://youtu.be/'+id,title:'Track '+i,artist:'Artist '+i,album:'Album '+i,track:i+1,cover}))
 await assert.rejects(queue.enqueue(entries,192,false));await queue.enqueue(entries,192,true);await queue.enqueue(entries,192,true);await queue.idle();assert.equal(queue.jobs.length,2)
 for(const j of queue.jobs){assert.equal(j.status,'ready');assert.equal((await audioProbe(tools,j.file)).tags.artist,j.artist);await assert.rejects(fs.access(path.join(local.downloads,'audio-'+j.id)))}
 const restored=new AudioImports(tools,state,()=>local);await restored.ready;assert.equal(restored.jobs.filter(j=>j.status==='ready').length,2)
})
test('failed/cancelled audio conversion can retry without duplicate job or deleting source',async()=>{
 let fail=true
 const queue=new AudioImports(tools,path.join(root,'retry.json'),()=>({...paths,music:path.join(root,'retry')}),()=>{},{download:async(job,work)=>{if(fail)throw new Error('synthetic interruption');await fs.copyFile(audio,path.join(work,'source.wav'))}})
 const entry={url:'https://youtu.be/cdefghijklm',title:'Retry'};await queue.enqueue([entry],192,true);await queue.idle();assert.equal(queue.jobs[0].status,'error');fail=false;await queue.enqueue([entry],192,true);await queue.idle();assert.equal(queue.jobs.length,1);assert.equal(queue.jobs[0].status,'ready');assert.ok(await fs.stat(audio))
})
test('30-track playlist batch imports every selected track without assuming a shared album',async()=>{
 const queue=new AudioImports(tools,path.join(root,'playlist-30.json'),()=>({...paths,music:path.join(root,'playlist-30')}),()=>{},{download:async(job,work)=>fs.copyFile(path.join(root,'128.mp3'),path.join(work,'source.mp3'))})
 const entries=Array.from({length:30},(_,n)=>({url:'https://youtu.be/'+String(n).padStart(11,'0'),title:'Piste '+n,artist:'Artiste '+n,album:'Album '+n,track:1}))
 await queue.enqueue(entries,192,true);await queue.idle();assert.equal(queue.jobs.length,30);assert.equal(queue.jobs.filter(j=>j.status==='ready').length,30);assert.equal(new Set(queue.jobs.map(j=>j.album)).size,30)
})
test('active audio cancellation stops the queue, records interruption and permits retry',async()=>{
 let block=true
 const queue=new AudioImports(tools,path.join(root,'cancel-audio.json'),()=>({...paths,music:path.join(root,'cancel-audio')}),()=>{},{download:async(job,work,{signal})=>{if(block){await new Promise((resolve,reject)=>{if(signal.aborted)return reject(new Error('cancelled'));signal.addEventListener('abort',()=>reject(new Error('cancelled')),{once:true})})}else await fs.copyFile(audio,path.join(work,'source.wav'))}})
 await queue.enqueue([{url:'https://youtu.be/defghijklmn',title:'Annulable'}],192,true)
 while(!queue.controller)await new Promise(resolve=>setTimeout(resolve,10))
 await queue.cancel();await queue.idle();assert.equal(queue.jobs[0].status,'interrupted');block=false;await queue.retry([queue.jobs[0].id]);await queue.idle();assert.equal(queue.jobs[0].status,'ready')
})
const rss=`<rss><channel><title>Test jeunesse</title><item><guid>one</guid><title>Dragon - Partie 2</title><description>Dès 5 ans, un dragon pirate</description><itunes:duration xmlns:itunes="http://www.itunes.com">01:02</itunes:duration><enclosure url="https://example.org/one.mp3" /></item><item><guid>two</guid><title>Premium</title><description>Réservé aux abonnés</description><enclosure url="https://example.org/two.mp3" /></item></channel></rss>`
test('RSS extracts summaries, estimated age/themes, duration and detects subscriber-only entries',async()=>{
 const {episodes}=await parseFeed(rss,{id:'source',title:'Test',url:'https://example.org/rss'})
 assert.equal(episodes.length,2);assert.equal(episodes[0].duration,62);assert.equal(episodes[0].age,5);assert.ok(episodes[0].themes.includes('dragon'));assert.equal(episodes[0].classificationEstimated,true);assert.equal(episodes[1].available,false);assert.equal(episodes[1].premium,true);assert.equal(durationValue('1:02:03'),3723)
 await assert.rejects(parseFeed('<!DOCTYPE xml>'+rss,{url:'https://example.org'}));await assert.rejects(parseFeed(rss,{id:'kidstory',url:'https://example.org'}));await assert.rejects(parseFeed(rss.replace('Test jeunesse','France Inter'),{url:'https://example.org'}))
})
test('Atom enclosures supported and malformed XML rejected',async()=>{
 const data=await parseFeed('<feed><title>Atom</title><entry><id>x</id><title>Conte</title><summary>Résumé</summary><link rel="enclosure" href="https://example.org/x.mp3" /></entry></feed>',{id:'atom',url:'https://example.org'})
 assert.equal(data.episodes[0].available,true);assert.equal(data.episodes[0].description,'Résumé');await assert.rejects(parseFeed('<invalid',{}))
})
test('private network URLs are refused before RSS/audio fetch',async()=>{
 for(const url of ['file:///secret','http://127.0.0.1/rss','http://192.168.1.2/rss','http://172.16.1.1/rss'])await assert.rejects(publicFetch(url))
})
test('catalog favorites and 24-hour metadata cache persist; removing source keeps personal files',async()=>{
 const catalog=new StoryCatalog(path.join(root,'catalog'),[{id:'test',url:'https://example.org/rss'}]);await catalog.ready;catalog.state.episodes=(await parseFeed(rss,catalog.state.sources[0])).episodes;catalog.state.checkedAt=Date.now();await catalog.favorite(catalog.state.episodes[0].id)
 const restored=new StoryCatalog(catalog.root,[]);await restored.ready;assert.equal((await restored.refresh()).episodes.length,2);assert.equal(restored.state.favorites.length,1);await restored.remove('test');assert.equal(restored.state.episodes.length,0);assert.ok(await fs.stat(audio))
})
test('authorized synthetic story export is legacy-reader compatible, deduplicated and cleans work',async()=>{
 const episode={id:'a'.repeat(64),title:'Conte de test',description:'Synopsis hors ligne',source:'Synthetic',url:'https://example.org/audio',available:true,duration:1}
 const options={authorized:true,fetcher:async()=>fs.readFile(audio)}
 await assert.rejects(exportStory(tools,episode,paths,{authorized:false}))
 const pack=await exportStory(tools,episode,paths,options);assert.equal(await exportStory(tools,episode,paths,options),pack)
 const library=readStories(paths.stories);assert.equal(library.error.length,0);assert.equal(library.stories[0].description,episode.description);assert.equal(library.stories[0].title,episode.title);assert.deepEqual(await fs.readdir(paths.work),[])
 const nodes=JSON.parse(await fs.readFile(path.join(pack,'nodes.json'),'utf8'));assert.equal(nodes.stages.story.audio,'story.mp3')
})
test('collection is chronological, navigable through existing story nodes and deduplicated',async()=>{
 const episodes=[2,1].map(n=>({id:String(n).repeat(64),title:'Episode - Partie '+n,source:'Test',description:'Partie '+n,available:true,url:'https://example.org/'+n,duration:1}))
 const options={authorized:true,fetcher:async()=>fs.readFile(audio)},pack=await exportCollection(tools,episodes,paths,options)
 const notes=JSON.parse(await fs.readFile(path.join(pack,'notes.json'),'utf8'));assert.equal(notes.m0.title,'Episode - Partie 1')
 const nodes=JSON.parse(await fs.readFile(path.join(pack,'nodes.json'),'utf8'));assert.equal(nodes.actions.menu.length,2);assert.equal(nodes.stages.s0.home.index,0)
 assert.equal(await exportCollection(tools,episodes,paths,options),pack);assert.equal(readStories(paths.stories).error.length,0)
})
test('corrupt or cancelled RSS audio never publishes partial story and leaves source intact',async()=>{
 const episode={id:'b'.repeat(64),title:'Broken',available:true,url:'https://example.org/broken'}
 await assert.rejects(exportStory(tools,episode,paths,{authorized:true,fetcher:async()=>Buffer.from('corrupt')}));assert.ok(!(await fs.readdir(paths.stories)).some(n=>n.startsWith('.telmi-')))
 const controller=new AbortController();controller.abort();await assert.rejects(exportStory(tools,episode,paths,{authorized:true,signal:controller.signal,fetcher:async()=>fs.readFile(audio)}));assert.deepEqual(await fs.readdir(paths.work),[]);assert.ok(await fs.stat(audio))
})
test('reading a damaged personal story folder never deletes it',async()=>{
 const dir=path.join(paths.stories,'personal-incomplete');await fs.mkdir(dir);await fs.writeFile(path.join(dir,'keep.txt'),'personal')
 assert.ok(readStories(paths.stories).error.includes('personal-incomplete'));assert.equal(await fs.readFile(path.join(dir,'keep.txt'),'utf8'),'personal')
})
