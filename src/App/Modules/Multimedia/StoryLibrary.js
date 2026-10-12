import {useEffect,useMemo,useRef,useState} from 'react'
import {media,ipcRenderer} from './api.js'
import {searchStories} from './storySearch.js'
import {storyFolders,episodeDetails,episodeLabel,toggleFolderSelection} from './storyFolders.js'
import {useRouter} from '../../Router/RouterHooks.js'
import styles from './Multimedia.module.scss'
const kinds=['Histoire indépendante','Histoire en plusieurs parties','Feuilleton','Conte traditionnel','Collection de récits']
const categories=['Contes','Aventures','Animaux','Fantastique','Humour','Mythologie','Histoires du soir','Découvertes','Histoires classiques']
function FolderCheck({episodes,selected,onChange,label}) {
  const ref=useRef(null),available=episodes.filter(e=>e.available),count=available.filter(e=>selected.includes(e.id)).length
  useEffect(()=>{if(ref.current)ref.current.indeterminate=count>0&&count<available.length},[count,available.length])
  return <label className={styles.check}><input ref={ref} type="checkbox" disabled={!available.length} checked={!!available.length&&count===available.length} onChange={onChange}/>{label}</label>
}
const minutes=value=>value?Math.round(value/60)+' min':'Durée non renseignée'
export default function StoryLibrary(){
  const [catalog,setCatalog]=useState({sources:[],episodes:[],favorites:[],imported:[]}),[query,setQuery]=useState(''),[age,setAge]=useState(''),
    [duration,setDuration]=useState(''),[kind,setKind]=useState(''),[category,setCategory]=useState(''),[source,setSource]=useState(''),
    [favorites,setFavorites]=useState(false),[selected,setSelected]=useState([]),[rights,setRights]=useState(false),[busy,setBusy]=useState(false),
    [message,setMessage]=useState(''),[error,setError]=useState(''),[rss,setRss]=useState(''),[limit,setLimit]=useState(48),[progress,setProgress]=useState(null),
    [opened,setOpened]=useState(null),setRoute=useRouter()
  const act=async fn=>{setBusy(true);setError('');try{await fn()}catch(e){setError(e.message)}finally{setBusy(false)}}
  useEffect(()=>{media('catalog').then(setCatalog).catch(e=>setError(e.message));const changed=(_,v)=>setProgress(v);ipcRenderer.on('media-story-progress',changed);return()=>ipcRenderer.removeListener('media-story-progress',changed)},[])
  const folders=useMemo(()=>storyFolders(catalog.episodes),[catalog.episodes])
  const visible=useMemo(()=>{
    const enriched=folders.flatMap(f=>f.episodes.map(e=>({...e,kind:f.kind})))
    const matches=new Set(searchStories({...catalog,episodes:enriched},{query,source,kind,category,favorites,age,duration}).map(e=>e.id))
    return folders.filter(f=>f.episodes.some(e=>matches.has(e.id)))
  },[folders,catalog,query,source,kind,category,favorites,age,duration])
  const folder=folders.find(f=>f.id===opened),groups=useMemo(()=>{
    if(!folder)return []
    const seasons=new Map()
    folder.episodes.forEach(e=>{const season=episodeDetails(e).seasonNumber||0;if(!seasons.has(season))seasons.set(season,[]);seasons.get(season).push(e)})
    return [...seasons]
  },[folder])
  const toggle=episodes=>{try{setSelected(toggleFolderSelection(selected,episodes));setError('')}catch(e){setError(e.message)}}
  const clearFilters=()=>{setQuery('');setAge('');setKind('');setCategory('');setDuration('');setSource('');setFavorites(false);setOpened(null)}
  const goSource=id=>{setSource(id);setOpened(null);setLimit(48)}
  const importSelected=()=>act(async()=>{
    setProgress({current:0,total:selected.length})
    const result=await media('story-import',selected,rights,'by-story'),ok=result.filter(r=>r.ok).length,fail=result.filter(r=>r.error)
    setMessage(ok+' épisode(s) importé(s), rangés par histoire dans Synchroniser → Histoires.')
    if(fail.length)setError(fail.map(r=>r.error).join(' · '))
    setSelected(old=>old.filter(id=>!result.some(r=>r.id===id&&r.ok)));setCatalog(await media('catalog'));setProgress(null)
  })
  return <div className={styles.page}>
    <header className={styles.heading}><div><h1>Livres audio & histoires</h1><p className={styles.muted}>Un dossier par histoire. Ouvrez-le pour retrouver ses épisodes dans l’ordre, ou sélectionnez le dossier entier.</p></div>
      <button onClick={()=>setRoute({module:'Synchronize',params:{tab:'stories'}})}>Ouvrir Synchroniser histoires</button></header>
    <section className={styles.panel}><div className={styles.filterBar}>
      <label>Rechercher<input aria-label="Rechercher une histoire" placeholder="Titre, dragon, pirate, dinosaure…" value={query} onChange={e=>{setQuery(e.target.value);setOpened(null);setLimit(48)}}/></label>
      <label>Âge indiqué<select aria-label="Âge" value={age} onChange={e=>{setAge(e.target.value);setOpened(null)}}><option value="">Tous âges</option>{['3-5','6-7','8-10','11-18'].map(a=><option key={a} value={a}>{a} ans</option>)}</select></label>
      <label>Type d’histoire<select aria-label="Type" value={kind} onChange={e=>{setKind(e.target.value);setOpened(null)}}><option value="">Tous types</option>{kinds.map(k=><option key={k}>{k}</option>)}</select></label>
      <label>Durée d’un épisode<select aria-label="Durée" value={duration} onChange={e=>{setDuration(e.target.value);setOpened(null)}}><option value="">Toutes durées</option><option value="0-300">Moins de 5 min</option><option value="300-600">5–10 min</option><option value="600-1200">10–20 min</option><option value="1200-999999">Plus de 20 min</option></select></label>
    </div><div className={styles.toolbar} style={{marginTop:12}}>
      <label>Thème<select aria-label="Catégorie" value={category} onChange={e=>{setCategory(e.target.value);setOpened(null)}}><option value="">Tous thèmes</option>{categories.map(k=><option key={k}>{k}</option>)}</select></label>
      <label className={styles.check}><input type="checkbox" checked={favorites} onChange={e=>{setFavorites(e.target.checked);setOpened(null)}}/>Favoris</label>
      <button onClick={clearFilters}>Effacer les filtres</button><button disabled={busy} onClick={()=>act(async()=>setCatalog(await media('catalog',true)))}>Actualiser les catalogues</button>
    </div><small>Âges issus des résumés ; types et thèmes déduits des informations de l’éditeur. Ils restent indicatifs.</small></section>
    {error&&<p className={styles.error} role="alert">{error}</p>}{message&&<p className={styles.notice} role="status">{message}</p>}
    <div className={styles.libraryLayout}>
      <aside className={styles.panel+' '+styles.sidebar}><h2>Collections RSS</h2>
        <button className={styles.folderNav+(!source?' '+styles.selected:'')} onClick={()=>goSource('')}>Toutes les histoires <small>{folders.length}</small></button>
        {catalog.sources.map(s=><button key={s.id} className={styles.folderNav+(source===s.id?' '+styles.selected:'')} onClick={()=>goSource(s.id)}>{s.title}<small>{folders.filter(f=>f.sourceId===s.id).length}</small></button>)}
        <h3>Parcourir par type</h3>{kinds.map(k=><button key={k} className={styles.folderNav+(kind===k?' '+styles.selected:'')} onClick={()=>{setKind(kind===k?'':k);setOpened(null)}}>{k}</button>)}
      </aside>
      <section>
        <div className={styles.breadcrumb}><button onClick={()=>setOpened(null)}>Bibliothèque</button><span>› {catalog.sources.find(s=>s.id===source)?.title||'Toutes les collections'}</span>{folder&&<strong>› {folder.title}</strong>}</div>
        {folder?<div className={styles.panel}><div className={styles.folderTop}>{folder.cover&&<img className={styles.folderImage} src={folder.cover} alt="" loading="lazy"/>}<div><h2>{folder.title}</h2><p>{folder.source} · {folder.episodes.length} épisode(s) · {minutes(folder.duration)}</p>
          <div className={styles.badges}><span className={styles.badge}>{folder.kind}</span>{folder.totalEpisodes&&<span className={styles.badge}>{folder.episodes.length} / {folder.totalEpisodes} annoncés par l’éditeur</span>}</div></div></div>
          <FolderCheck episodes={folder.episodes} selected={selected} onChange={()=>toggle(folder.episodes)} label="Sélectionner toute cette histoire"/>
          <small>Les filtres trouvent une histoire ; son dossier affiche ensuite tous ses épisodes disponibles dans le catalogue.</small>
          {groups.map(([season,episodes])=><div key={season}>
            {groups.length>1||season>0?<div className={styles.season}><strong>{season?'Saison '+season:'Épisodes sans saison'}</strong><FolderCheck episodes={episodes} selected={selected} onChange={()=>toggle(episodes)} label="Sélectionner cette saison"/></div>:null}
            {episodes.map(e=><article key={e.id} className={styles.episodeRow}>
              <input type="checkbox" aria-label={'Sélectionner '+e.title} disabled={!e.available} checked={selected.includes(e.id)} onChange={()=>toggle([e])}/>
              <div><div className={styles.badges}><span className={styles.badge}>{episodeLabel(e,folder.episodes.indexOf(e))}</span><span className={styles.badge}>{minutes(e.duration)}</span>
                <span className={styles.badge}>{e.age?e.age+' ans et +':'Âge non renseigné'}</span>{catalog.imported.includes(e.id)&&<span className={styles.badge}>Déjà importé</span>}</div>
                <h3>{episodeDetails(e).episodeTitle}</h3><p>{e.description||'L’éditeur n’a pas fourni de résumé.'}</p>
                {!e.available&&<small>Consultation officielle uniquement ; cet épisode ne peut pas être importé.</small>}</div>
              <div className={styles.toolbar}><button aria-label={'Favori '+e.title} onClick={()=>act(async()=>setCatalog(await media('catalog-favorite',e.id)))}>{catalog.favorites.includes(e.id)?'★':'☆'}</button>
                <button disabled={busy} onClick={()=>act(()=>media('catalog-open',e.id))}>Chez l’éditeur</button></div></article>)}
          </div>)}
        </div>:<><div className={styles.heading} style={{marginBottom:14}}><h2>{visible.length} dossier(s) d’histoires</h2><small>{selected.length} épisode(s) sélectionné(s)</small></div>
          {!visible.length&&<div className={styles.empty}>Aucune histoire ne correspond à ces filtres. Effacez-les ou actualisez les catalogues.</div>}
          <div className={styles.folderGrid}>{visible.slice(0,limit).map(f=><article key={f.id} className={styles.folderCard}>
            <div className={styles.folderTop}>{f.cover?<img className={styles.folderImage} src={f.cover} alt="" loading="lazy"/>:<span className={styles.folderImage+' '+styles.coverPlaceholder}>▤</span>}<div><h3>{f.title}</h3><small>{f.source}</small></div></div>
            <div className={styles.badges}><span className={styles.badge}>{f.kind||'Histoire'}</span><span className={styles.badge}>{f.episodes.length} épisode(s)</span><span className={styles.badge}>{minutes(f.duration)}</span>
              <span className={styles.badge}>{f.ages.length?f.ages.join(' / ')+' ans et +':'Âge non renseigné'}</span></div>
            <p className={styles.description}>{(f.episodes[0].description||'Résumé non fourni.').slice(0,180)}</p>
            <FolderCheck episodes={f.episodes} selected={selected} onChange={()=>toggle(f.episodes)} label="Sélectionner le dossier"/>
            <button onClick={()=>setOpened(f.id)}>Ouvrir · Voir les épisodes</button></article>)}</div>
          {visible.length>limit&&<button style={{marginTop:16}} onClick={()=>setLimit(limit+48)}>Afficher 48 autres histoires</button>}
        </>}
      </section>
    </div>
    <details className={styles.panel}><summary>Gérer les sources RSS et leur disponibilité</summary><div className={styles.sources}>
      {catalog.sources.map(s=><div key={s.id} className={styles.toolbar}><p>{s.title} · {s.valid?s.count+' épisodes, '+s.audioCount+' liens audio':s.error||'Non vérifié'}</p>
        <button disabled={busy} onClick={()=>act(async()=>{setCatalog(await media('catalog-remove',s.id));if(source===s.id)goSource('')})}>Retirer du catalogue</button></div>)}
      <label>Ajouter un flux RSS<input aria-label="Flux RSS personnalisé" value={rss} onChange={e=>setRss(e.target.value)} placeholder="https://…"/></label>
      <button disabled={busy||!rss.trim()} onClick={()=>act(async()=>{setCatalog(await media('catalog-add',rss.trim()));setRss('')})}>Tester et ajouter la source</button></div></details>
    <footer className={styles.actionBar}><label className={styles.check}><input type="checkbox" checked={rights} onChange={e=>setRights(e.target.checked)}/>J’ai les droits d’import et de transfert de ces histoires.</label>
      <button className={styles.primary} disabled={busy||!rights||!selected.length} onClick={importSelected}>Importer par histoire · {selected.length} épisode(s)</button>
      <button disabled={!selected.length||busy} onClick={()=>setSelected([])}>Désélectionner</button><button disabled={!busy} onClick={()=>media('story-cancel').catch(e=>setError(e.message))}>Annuler l’import</button>
      {progress&&<progress max={progress.total||1} value={progress.current}/>}<small>Un album d’histoire par dossier sélectionné, avec ses épisodes ordonnés. Maximum 100 épisodes par import.</small>
    </footer>
  </div>
}
