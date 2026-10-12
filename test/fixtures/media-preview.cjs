(()=>{
 const listeners=new Map(),jobs=[];
 const cover='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300"><rect width="300" height="300" fill="#694085"/><circle cx="150" cy="110" r="65" fill="#ffa900"/><text x="150" y="230" text-anchor="middle" font-family="sans-serif" font-size="26" fill="white">TELMI • Démo</text></svg>');
 const tracks=Array.from({length:30},(_,i)=>({id:'track'+i,url:'https://youtu.be/'+String(i).padStart(11,'0'),title:'Titre de démonstration '+(i+1),artist:'Artiste '+(i+1),album:'Album de démonstration',track:i+1,allowed:true}));
 const episodes=[];for(const [title,count]of [['Nour, Marin et les perles de magie',6],['Le Dragon',12],['Le voyage dans le temps',10]])for(let n=count;n>0;n--)episodes.push({id:title+n,title:'Épisode '+n+'/'+count+' - '+title+' - Le chapitre '+n,sourceId:'test',source:'Récits de démonstration',cover,duration:600,age:6,available:true,description:'Une aventure avec des dragons, des pirates et de belles découvertes. Épisode '+n,categories:['Aventures'],kind:'Histoire en plusieurs parties'});
 episodes.push({id:'alone',title:'Le chaton courageux',sourceId:'other',source:'Contes de démonstration',cover,duration:300,age:4,available:true,description:'Une histoire indépendante pour les plus petits.',kind:'Histoire indépendante',categories:['Animaux']});
 const catalog={sources:[{id:'test',title:'Récits de démonstration',valid:true,count:28,audioCount:28},{id:'other',title:'Contes de démonstration',valid:true,count:1,audioCount:1}],episodes,favorites:[],imported:[]};
 const emit=(name,...args)=>{for(const f of listeners.get(name)||[])f({},...args)};
 const music=()=>jobs.map((j,i)=>({id:j.id,title:j.title,artist:j.artist,album:j.album,track:i+1,image:cover}));
 const ipc={on:(n,f)=>{if(!listeners.has(n))listeners.set(n,new Set());listeners.get(n).add(f)},off:(n,f)=>listeners.get(n)?.delete(f),removeListener:(n,f)=>listeners.get(n)?.delete(f),send:(n,...args)=>setTimeout(()=>{if(n==='tablestate-get')emit('tablestate-data',args[0],null);if(n==='ffmpeg-download')emit('ffmpeg-download-task','success');if(n==='telmi-sync-params-get')emit('telmi-sync-params',{});if(n==='local-musics-get')emit('local-musics-data',music());if(n==='local-stories-get')emit('local-stories-data',[])},20),invoke:async(n,...args)=>{
 if(n==='media-audio-jobs')return{ok:true,data:jobs};if(n==='media-audio-analyze')return{ok:true,data:tracks};if(n==='media-catalog')return{ok:true,data:catalog};if(n==='media-music-cover')return{ok:true,data:'C:/cover.jpg'};
 if(n==='media-music-search')return{ok:true,data:[{title:'Titre de démonstration',artist:'Artiste',album:'Un bel album',date:'2026'}]};
 if(n==='media-audio-import'){jobs.push(...args[0].map(t=>({...t,status:'ready',progress:1})));emit('media-audio-jobs',jobs);emit('local-musics-data',music());return{ok:true,data:jobs}}
 if(n==='media-story-import'){catalog.imported.push(...args[0]);return{ok:true,data:args[0].map(id=>({id,ok:true}))}}
 return{ok:true,data:[]}}};
 window.require=name=>name==='electron'?{ipcRenderer:ipc,webUtils:{getPathForFile:f=>f.name}}:{pathToFileURL:()=>({href:cover})};
 window.__TELMI_PREVIEW_FIXTURES__=true;
})();
