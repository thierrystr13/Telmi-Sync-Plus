import {test} from 'node:test'
import assert from 'node:assert/strict'
import {storyFolders,episodeDetails,episodeLabel,toggleFolderSelection} from '../src/App/Modules/Multimedia/storyFolders.js'
import {applyMusicChanges} from '../src/App/Modules/Multimedia/musicWorkbench.js'
const e=(title,n,extra={})=>({id:String(n),title,sourceId:'one',source:'Collection',available:true,...extra})
test('publisher story folders recognize fractions, EP and suffixes and sort numerically',()=>{
 const stories=[e('Episode 6/6 - Nour, Marin et les perles - La dernière perle',6),e('Épisode 1/6 - Nour, Marin, et les perles - Le début',1),
 e('Floutch -Episode 10-',10),e('Floutch -Episode 2-',2),e('EP11 Le voyage dans le temps',11),e('EP9 Le voyage dans le temps',9)]
 const folders=storyFolders(stories)
 assert.equal(folders.length,3)
 assert.deepEqual(folders.find(f=>f.title==='Floutch').episodes.map(e=>e.id),['2','10'])
 assert.deepEqual(folders.find(f=>f.title==='Le voyage dans le temps').episodes.map(e=>e.id),['9','11'])
 const nour=folders.find(f=>f.title.startsWith('Nour'));assert.deepEqual(nour.episodes.map(e=>e.id),['1','6']);assert.equal(nour.totalEpisodes,6)
 assert.equal(episodeDetails(stories[1]).episodeTitle,'Le début')
 assert.equal(stories[0].id,'6','catalog remains unchanged')
 assert.equal(episodeDetails(e('Le Dragon - Partie 2 - La grotte',99)).storyTitle,'Le Dragon')
})
test('season folders preserve title, season order and episode subtitles',()=>{
 const list=[e('La fin - Un été incroyable - S07E09',9),e('Le début - Un été incroyable - S06E12',12),e('La suite - Un été incroyable - S07E02',2)]
 const [f]=storyFolders(list);assert.equal(f.title,'Un été incroyable');assert.equal(f.kind,'Feuilleton')
 assert.deepEqual(f.episodes.map(e=>e.id),['12','2','9']);assert.equal(episodeLabel(list[0],0),'Saison 7 · Épisode 9')
})
test('unrelated publisher episode numbers and sources never merge independent stories',()=>{
 const list=[e('Le chaton',1,{episodeNumber:451}),e('Le dragon',2,{episodeNumber:452}),e('Floutch -Episode 1-',3),e('Floutch -Episode 2-',4,{sourceId:'other'})]
 assert.equal(storyFolders(list).length,4)
 assert.equal(episodeDetails(list[0]).storyTitle,'Le chaton')
 assert.match(episodeLabel(e('Sans numéro',5),0),/sans numéro éditeur/)
})
test('named collections and whole-folder selection preserve unrelated selections and exclude inaccessible episodes',()=>{
 const list=[e('Les Contes du Renard Blanc : La pêche',1),e('Les Contes du Renard Blanc : Le renard',2),e('Les Contes du Renard Blanc : Premium',3,{available:false})]
 const [f]=storyFolders(list);assert.equal(f.kind,'Collection de récits')
 assert.deepEqual(toggleFolderSelection(['personal'],list),['personal','1','2'])
 assert.deepEqual(toggleFolderSelection(['personal','1','2'],list),['personal'])
 assert.throws(()=>toggleFolderSelection(['personal'],list,2),/Maximum/)
})
test('apply album and cover across selection preserves track titles, artists and numbers',()=>{
 const tracks=[{id:'a',title:'First',artist:'Alice',track:1},{id:'b',title:'Second',artist:'Bob',track:2},{id:'c',album:'Keep'}]
 const changed=applyMusicChanges(tracks,['a','b'],{album:'Shared',cover:'C:/cover.png',date:'2026',title:'wrong',track:99})
 assert.equal(changed[0].title,'First');assert.equal(changed[1].artist,'Bob');assert.equal(changed[1].track,2);assert.equal(changed[0].cover,'C:/cover.png')
 assert.equal(changed[2],tracks[2]);assert.equal(tracks[0].album,undefined)
})
