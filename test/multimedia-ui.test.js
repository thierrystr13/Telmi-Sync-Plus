import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import {createRequire} from 'node:module'
const require=createRequire(import.meta.url),React=require('react'),{JSDOM}=require('jsdom'),{transformSync}=require('@babel/core')
// Load actual renderer components, replacing only asset handling as the bundler
// does. Keep React hooks, DOM events, IPC signatures and navigation intact.
function rendererLoader(){
 const cache=new Map()
 function load(file){
  if(file.endsWith('.scss'))return new Proxy({},{get:(_,key)=>key==='__esModule'?false:String(key)})
  if(cache.has(file))return cache.get(file).exports
  const module={exports:{}};cache.set(file,module)
  const {code}=transformSync(fs.readFileSync(file,'utf8'),{filename:file,babelrc:false,configFile:false,presets:[[require.resolve('@babel/preset-react'),{runtime:'automatic'}]],plugins:[require.resolve('@babel/plugin-transform-modules-commonjs')]})
  vm.runInThisContext('(function(require,module,exports){'+code+'\n})',{filename:file})(specifier=>specifier.startsWith('.')?load(path.resolve(path.dirname(file),specifier)):require(specifier),module,module.exports)
  return module.exports
 }
 return load
}
test('music workbench analyzes, edits cover inline, visibly converts and routes directly to music synchronization',async()=>{
 const dom=new JSDOM('<html><head></head><body><div id="app"></div></body></html>',{url:'http://localhost/'});globalThis.window=dom.window;globalThis.document=dom.window.document;globalThis.IS_REACT_ACT_ENVIRONMENT=true
 const invocations=[],routes=[],listeners=new Map()
 const tracks=[{id:'one',title:'First',artist:'Alice',album:'Original',track:1,allowed:true},{id:'two',title:'Second',artist:'Bob',album:'Original',track:2,allowed:true}]
 const ipc={on:(n,f)=>listeners.set(n,f),removeListener:n=>listeners.delete(n),send:()=>{},invoke:async(n,...args)=>{
  invocations.push([n,...args]);return {ok:true,data:n==='media-audio-analyze'?tracks:n==='media-music-cover'?'C:/personal/cover.png':n==='media-audio-jobs'?[]:[]}
 }}
 window.require=n=>n==='electron'?{ipcRenderer:ipc}:require(n)
 const load=rendererLoader(),Music=load(path.resolve('src/App/Modules/Multimedia/MusicImport.js')).default,Context=load(path.resolve('src/App/Router/RouterContext.js')).default
 const {createRoot}=require('react-dom/client'),{act}=require('react-dom/test-utils'),root=createRoot(document.getElementById('app'))
 const click=async el=>{assert.ok(el);await act(async()=>el.click())},button=text=>[...document.querySelectorAll('button')].find(b=>b.textContent.includes(text))
 const fill=async(el,value)=>{await act(async()=>{Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set.call(el,value);el.dispatchEvent(new window.Event('input',{bubbles:true}))})}
 try{
  await act(async()=>root.render(React.createElement(Context.Provider,{value:{setRoute:r=>routes.push(r)}},React.createElement(Music))))
  assert.ok(button('Convertir en MP3'));assert.equal(button('Convertir en MP3').disabled,true);assert.equal(document.querySelector('details > summary')?.textContent,undefined)
  await fill(document.querySelector('[aria-label="URL musicale YouTube"]'),'https://youtu.be/abcdefghijk');await click(button('Analyser'))
  assert.equal(document.querySelectorAll('.track').length,2);assert.equal(document.querySelectorAll('[role="dialog"]').length,0)
  await fill(document.querySelector('[aria-label="Album de la piste"]'),'Shared album');await click(button('Choisir une pochette'))
  await click(button('Appliquer l’album'));assert.equal(document.querySelectorAll('img[src="file:///C:/personal/cover.png"]').length,3)
  await click(document.querySelector('footer input[type=checkbox]'));assert.equal(button('Convertir en MP3').disabled,false);await click(button('Convertir en MP3'))
  const conversion=invocations.find(v=>v[0]==='media-audio-import');assert.ok(conversion);assert.equal(conversion[2],192);assert.equal(conversion[3],true)
  assert.deepEqual(conversion[1].map(t=>[t.title,t.artist,t.album,t.track]),[['First','Alice','Shared album',1],['Second','Bob','Shared album',2]])
  await click(button('Ouvrir Synchroniser musique'));assert.deepEqual(routes.at(-1),{module:'Synchronize',params:{tab:'music'}})
  const sass=require('sass'),css=sass.compile('src/App/Modules/Multimedia/Multimedia.module.scss',{loadPaths:['.']}).css
  const style=document.createElement('style');style.textContent=css;document.head.appendChild(style);const input=document.querySelector('[aria-label="URL musicale YouTube"]'),computed=window.getComputedStyle(input)
  assert.equal(computed.color,'rgb(255, 255, 255)');assert.equal(computed.backgroundColor,'rgb(36, 17, 51)')
 }finally{await act(async()=>root.unmount());dom.window.close();delete globalThis.window;delete globalThis.document}
})
test('requested music synchronization tab is mounted and regular tab switching still works',async()=>{
 const dom=new JSDOM('<html><body><div id="app"></div></body></html>');globalThis.window=dom.window;globalThis.document=dom.window.document;globalThis.IS_REACT_ACT_ENVIRONMENT=true
 const load=rendererLoader(),Tabs=load(path.resolve('src/App/Components/Tabs/Tabs.js')).default,{createRoot}=require('react-dom/client'),{act}=require('react-dom/test-utils'),root=createRoot(document.getElementById('app'))
 const tabs=['Histoires','Musique'].map(name=>({tab:props=>React.createElement('button',props,name),content:()=>React.createElement('p',null,'Contenu '+name)}))
 try{await act(async()=>root.render(React.createElement(Tabs,{tabs,initialTab:1})));assert.match(document.body.textContent,/Contenu Musique/);assert.doesNotMatch(document.body.textContent,/Contenu Histoires/)
  await act(async()=>document.querySelector('button').click());assert.match(document.body.textContent,/Contenu Histoires/)
 }finally{await act(async()=>root.unmount());dom.window.close();delete globalThis.window;delete globalThis.document}
})
