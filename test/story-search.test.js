import {test} from 'node:test'
import assert from 'node:assert/strict'
import {searchStories} from '../src/App/Modules/Multimedia/storySearch.js'
test('global story search handles accents, summary keywords, filters and independent story priority', () => {
  const episodes = [
    {id:'series',title:'Épisode de dragon',description:'Pirates dans l’espace',sourceId:'a',kind:'Feuilleton',age:7,duration:600,categories:['Aventures']},
    {id:'one',title:'Le dragon',description:'Un pirate rêvait',sourceId:'b',kind:'Histoire indépendante',age:5,duration:299,themes:['espace'],categories:['Fantastique']},
    {id:'unknown',title:'Dragon',sourceId:'b',kind:'Histoire indépendante',duration:300},
  ]
  const catalog={sources:[{id:'a',priority:1},{id:'b',priority:3}],episodes,favorites:['one']}
  const ids=filters=>searchStories(catalog,filters).map(e=>e.id)
  assert.deepEqual(ids({query:'DRAGON espace'}),['one','series'])
  assert.deepEqual(ids({query:'revait'}),['one'])
  assert.deepEqual(ids({age:'3-5'}),['one'])
  assert.deepEqual(ids({age:'6-7',duration:'600-1200'}),['series'])
  assert.deepEqual(ids({duration:'300-600'}),['unknown'])
  assert.deepEqual(ids({category:'Fantastique',favorites:true}),['one'])
  assert.deepEqual(ids({source:'a',kind:'Feuilleton'}),['series'])
  assert.deepEqual(ids({query:'dragon',age:'8-10'}),[])
  assert.equal(episodes[0].id,'series','Search must not mutate the cached catalog')
})
