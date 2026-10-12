import {useEffect,useState} from 'react'
import {media,ipcRenderer} from './api.js'
import {useRouter} from '../../Router/RouterHooks.js'
import {applyMusicChanges,coverPreview,jobStatus} from './musicWorkbench.js'
import styles from './Multimedia.module.scss'

let draft={url:'',tracks:[],selected:[],rate:192,rights:false,bulk:{artist:'',album:'',date:'',genre:''}}
const fields={title:'Titre',artist:'Artiste',album:'Album',track:'N° de piste',date:'Année',genre:'Genre'}
function Cover({track,large=false}) {
  const src=coverPreview(track), className=large?styles.coverLarge:styles.coverSmall
  const [failed,setFailed]=useState(false)
  useEffect(()=>setFailed(false),[src])
  return src&&!failed?<img className={className} src={src} alt="Pochette de l’album" onError={()=>setFailed(true)}/>:
    <span className={className+' '+styles.coverPlaceholder} aria-label="Aucune pochette">♫</span>
}
export default function MusicImport(){
  const [url,setUrl]=useState(draft.url),[tracks,setTracks]=useState(draft.tracks),[selected,setSelected]=useState(draft.selected),
    [jobs,setJobs]=useState([]),[rate,setRate]=useState(draft.rate),[rights,setRights]=useState(draft.rights),
    [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState(''),[matches,setMatches]=useState([]),
    [editing,setEditing]=useState(draft.tracks[0]?.id),[bulk,setBulk]=useState(draft.bulk),[search,setSearch]=useState(''),
    setRoute=useRouter()
  useEffect(()=>{media('audio-jobs').then(setJobs).catch(e=>setError(e.message));const update=(_,j)=>setJobs(j);ipcRenderer.on('media-audio-jobs',update);return()=>ipcRenderer.removeListener('media-audio-jobs',update)},[])
  useEffect(()=>{draft={url,tracks,selected,rate,rights,bulk}},[url,tracks,selected,rate,rights,bulk])
  const act=async fn=>{setBusy(true);setError('');try{await fn()}catch(e){setError(e.message)}finally{setBusy(false)}}
  const edit=(id,changes)=>setTracks(old=>old.map(t=>t.id===id?{...t,...changes}:t))
  const analyze=()=>act(async()=>{
    const list=await media('audio-analyze',url.trim());setTracks(list);setSelected(list.filter(t=>t.allowed!==false).map(t=>t.id))
    setEditing(list[0]?.id);setRights(false);setMatches([]);setMessage(list.length+' piste(s) analysée(s). Complétez l’album et la pochette, puis convertissez en MP3.')
  })
  const openMusic=()=>{ipcRenderer.send('local-musics-get');setRoute({module:'Synchronize',params:{tab:'music'}})}
  const current=tracks.find(t=>t.id===editing)||tracks[0], ready=jobs.filter(j=>j.status==='ready').length,
    running=jobs.some(j=>['queued','running'].includes(j.status)), retry=jobs.filter(j=>['error','interrupted'].includes(j.status))
  return <div className={styles.page}>
    <header className={styles.heading}><div><h1>YouTube Music</h1><p className={styles.muted}>Préparez vos MP3, leurs albums et leurs pochettes, puis envoyez-les sur votre carte.</p></div>
      <button onClick={openMusic}>Ouvrir Synchroniser musique</button></header>
    <div className={styles.steps}><span><strong>1</strong>Coller et analyser</span><span><strong>2</strong>Album et pochette</span><span><strong>3</strong>Convertir en MP3</span><span><strong>4</strong>Synchroniser musique</span></div>
    <section className={styles.panel}><div className={styles.toolbar}>
      <label className={styles.url}>Lien YouTube — vidéo ou playlist<input aria-label="URL musicale YouTube" value={url} onChange={e=>setUrl(e.target.value)}
        onKeyDown={e=>{if(e.key==='Enter'&&!busy&&url.trim())analyze()}} placeholder="https://www.youtube.com/watch?v=…"/></label>
      <button className={styles.primary} disabled={busy||!url.trim()} onClick={analyze}>{busy?'Traitement…':'Analyser'}</button>
      <label>Qualité MP3<select aria-label="Débit MP3" value={rate} onChange={e=>setRate(Number(e.target.value))}>
        <option value={128}>Compact · 128 kb/s</option><option value={192}>Recommandé · 192 kb/s</option><option value={256}>Qualité · 256 kb/s</option></select></label>
    </div><p className={styles.muted}>Les titres détectés peuvent être corrigés. Les MP3 terminés apparaissent automatiquement dans Synchroniser → Musique.</p></section>
    {error&&<p className={styles.error} role="alert">{error}</p>}{message&&<p className={styles.notice} role="status">{message}</p>}
    {tracks.length>0?<div className={styles.musicLayout}>
      <section className={styles.panel}><div className={styles.heading}><h2>Pistes à préparer · {tracks.length}</h2>
        <button onClick={()=>setSelected(selected.length?[]:tracks.filter(t=>t.allowed!==false).map(t=>t.id))}>{selected.length?'Désélectionner':'Tout sélectionner'}</button></div>
        <div className={styles.trackList}>{tracks.map((t,i)=><div key={t.id} className={styles.track+(current?.id===t.id?' '+styles.active:'')}>
          <input type="checkbox" aria-label={'Sélectionner '+t.title} disabled={t.allowed===false} checked={selected.includes(t.id)}
            onChange={()=>setSelected(old=>old.includes(t.id)?old.filter(id=>id!==t.id):[...old,t.id])}/>
          <span className={styles.trackNumber}>{t.track||i+1}</span><Cover track={t}/>
          <button className={styles.trackOpen} onClick={()=>{setEditing(t.id);setMatches([]);setSearch('')}}><span>{t.title}</span>
            <small>{t.artist||'Artiste à renseigner'} · {t.album||'Album à renseigner'}</small></button>
          {t.allowed===false&&<small>{t.reason||'Téléchargement indisponible'}</small>}</div>)}</div>
        <details style={{marginTop:18}}><summary>Modifier plusieurs pistes</summary><p>Seuls les champs remplis sont appliqués aux pistes sélectionnées.</p>
          <div className={styles.fields}>{Object.keys(bulk).map(k=><label key={k}>{fields[k]}<input value={bulk[k]} aria-label={'Modification groupée '+fields[k]} onChange={e=>setBulk({...bulk,[k]:e.target.value})}/></label>)}</div>
          <button disabled={!selected.length} onClick={()=>setTracks(old=>applyMusicChanges(old,selected,Object.fromEntries(Object.entries(bulk).filter(([,v])=>v.trim()))))}>Appliquer aux pistes sélectionnées</button></details>
      </section>
      {current&&<aside className={styles.panel+' '+styles.editor}><h2>Album et pochette</h2><small>Modification de la piste sélectionnée, sans quitter la liste.</small><Cover track={current} large/>
        <button disabled={busy} onClick={()=>act(async()=>{const cover=await media('music-cover');if(cover){edit(current.id,{cover,release:''});setMessage('Pochette choisie. Vous pouvez l’appliquer à toutes les pistes de l’album.')}})}>Choisir une pochette JPG / PNG</button>
        <div className={styles.fields}>{Object.entries(fields).map(([k,label])=><label key={k} className={k==='title'?styles.full:''}>{label}
          <input aria-label={label+' de la piste'} type={k==='track'?'number':'text'} min={k==='track'?1:undefined} value={current[k]||''} onChange={e=>edit(current.id,{[k]:e.target.value})}/></label>)}</div>
        <button disabled={!selected.length} onClick={()=>{setTracks(old=>applyMusicChanges(old,selected,{album:current.album,date:current.date,genre:current.genre,cover:current.cover||'',release:current.release||''}));setMessage('Album et pochette appliqués aux pistes sélectionnées. Titres et artistes conservés.')}}>Appliquer l’album et la pochette à la sélection</button>
        <details><summary>Rechercher les informations et une pochette</summary><label>Recherche MusicBrainz<input aria-label="Recherche MusicBrainz" value={search} onChange={e=>setSearch(e.target.value)} placeholder={current.title+' '+(current.artist||'')}/></label>
          <button disabled={busy} onClick={()=>act(async()=>{const found=await media('music-search',search.trim()||current.title+' '+(current.artist||''));setMatches(found);if(!found.length)setMessage('Aucun résultat. Vous pouvez remplir les champs et choisir une image locale.')} )}>Rechercher</button>
          <div className={styles.matches}>{matches.map((m,i)=><button key={i} onClick={()=>{edit(current.id,{...m,cover:''});setMatches([]);setMessage('Informations choisies. La pochette sera téléchargée si elle est disponible dans Cover Art Archive.')}}><span>{m.title}</span><small>{m.artist} · {m.album} · {m.date}</small></button>)}</div></details>
      </aside>}
    </div>:<div className={styles.empty}>Collez un lien, puis cliquez sur Analyser. Vos pistes et leur fiche d’album apparaîtront ici.</div>}
    {jobs.length>0&&<section className={styles.panel}><div className={styles.heading}><h2>Conversions MP3 · {ready} prête(s)</h2><div className={styles.toolbar}>
      <button disabled={busy||!running} onClick={()=>act(()=>media('audio-cancel'))}>Annuler les conversions</button>
      <button disabled={busy||!retry.length} onClick={()=>act(()=>media('audio-retry',retry.map(j=>j.id)))}>Reprendre les erreurs / interruptions</button>
      {ready>0&&<button className={styles.primary} onClick={openMusic}>Voir mes albums dans Synchroniser musique</button>}</div></div>
      <div className={styles.queue}>{jobs.slice(-100).map(j=><div key={j.id} className={styles.queueItem}><div><strong>{j.title}</strong><small> · {j.artist} · {j.album}</small></div><span className={styles.badge}>{jobStatus(j)}</span>
        {j.status==='running'&&<progress aria-label={'Conversion '+j.title} max={1} value={j.progress||0}/>}
        {j.error&&<p className={styles.error}>{j.error}</p>}</div>)}</div></section>}
    <footer className={styles.actionBar}><label className={styles.check}><input type="checkbox" checked={rights} onChange={e=>setRights(e.target.checked)}/>
      Je possède ces contenus ou suis autorisé à les télécharger.</label>
      <button className={styles.primary} disabled={busy||!rights||!selected.length} onClick={()=>act(async()=>{await media('audio-import',tracks.filter(t=>selected.includes(t.id)),rate,rights);setMessage('Conversion MP3 en cours. Les albums terminés apparaîtront automatiquement dans Synchroniser musique.');setSelected([])})}>Convertir en MP3 · {selected.length} piste(s)</button>
      <small>{!selected.length?'Analysez et sélectionnez des pistes.':!rights?'Cochez l’autorisation pour lancer la conversion.':'Album et pochette seront enregistrés dans les MP3.'}</small></footer>
  </div>
}
