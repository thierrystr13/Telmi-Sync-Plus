import {useCallback, useEffect, useMemo, useState} from 'react'
import TopBar from '../../Layout/TopBar/TopBar.js'
import AppContainer from '../../Layout/Container/AppContainer.js'
import DropFiles from '../../Components/DropFiles/DropFiles.js'
import Table from '../../Components/Table/Table.js'
import {useModal} from '../../Components/Modal/ModalHooks.js'
import ModalDialogConfirm from '../../Components/Modal/Templates/ModalDialogs/ModalDialogConfirm.js'
import EditFilm from './EditFilm.js'
import {call, ipcRenderer, bytes, duration} from './api.js'
import styles from './Videos.module.scss'

const statuses = {imported: 'À préparer', queued: 'En attente', converting: 'Compression', ready: 'Prêt', error: 'Erreur', cancelled: 'Annulé', interrupted: 'Interrompu'}
function tableData(films) {
  return films.map(f => ({...f, cellId: f.id, cellTitle: f.title,
    cellSubtitle: `${duration(f.durationSeconds)} · ${f.width || '—'} × ${f.height || '—'} · ${bytes(f.originalBytes)} → ${bytes(f.compressedBytes)} · ${statuses[f.status] || 'Sur la carte'}${f.status === 'converting' ? ' ' + Math.round(f.progress * 100) + '%' : ''}`,
    cellLabelIcon: f.status === 'converting' ? `${Math.round(f.progress * 100)}%` : '', cellLabelIconText: f.error || ''}))
}
function toggle(set, value) {
  set(old => Array.isArray(value) ? [...old.filter(v => !value.some(x => x.cellId === v.cellId)), ...value] : old.some(v => v.cellId === value.cellId) ? old.filter(v => v.cellId !== value.cellId) : [...old, value])
}
export default function VideosHome() {
  const [films, setFilms] = useState([]), [selected, setSelected] = useState([]), [cardSelected, setCardSelected] = useState([]),
    [profile, setProfile] = useState('balanced'), [cards, setCards] = useState([]), [drive, setDrive] = useState(''),
    [card, setCard] = useState({films: []}), [notice, setNotice] = useState(''), [error, setError] = useState(''), [cardError, setCardError] = useState(''),
    [busy, setBusy] = useState(false), [progress, setProgress] = useState(null), [url, setUrl] = useState(''),
    [youtube, setYoutube] = useState(null), [authorized, setAuthorized] = useState(false), {addModal, rmModal} = useModal()
  const act = useCallback(async action => {
    setBusy(true); setError(''); setNotice('')
    try {return await action()} catch (e) {setError(e.message)} finally {setBusy(false)}
  }, [])
  const refresh = useCallback(async () => {
    const detected = await call('cards'); setCards(detected)
    const active = detected.some(c => c.drive === drive) ? drive : (detected[0]?.drive || '')
    setDrive(active)
    setCard(active ? await call('card', active) : {films: []}); setCardSelected([])
    setCardError('')
  }, [drive])
  useEffect(() => {
    call('list').then(setFilms).catch(e => setError(e.message))
    const changed = (event, values) => setFilms(values), processing = (event, value) => setProgress(value.kind ? value : null)
    ipcRenderer.on('videos-library', changed); ipcRenderer.on('videos-progress', processing)
    return () => {ipcRenderer.removeListener('videos-library', changed); ipcRenderer.removeListener('videos-progress', processing)}
  }, [])
  useEffect(() => {
    refresh().catch(e => setCardError(e.message))
    const timer = setInterval(() => call('cards').then(detected => {
      setCards(detected)
      setCardError('')
      if (drive && !detected.some(c => c.drive === drive)) {setDrive(''); setCard({films: []}); setCardSelected([])}
    }).catch(e => setCardError(e.message)), 8000)
    return () => clearInterval(timer)
  }, [drive, refresh])
  const imported = values => {
    const errors = values.filter(v => v.error)
    setNotice(`${values.length - errors.length} vidéo(s) ajoutée(s). Préparation automatique en cours.`)
    if (errors.length) setError(errors.map(v => `${v.file}: ${v.error}`).join('\n'))
  }
  const dropped = useCallback(files => {act(async () => imported(await call('add', files, profile)))}, [act, profile])
  const edit = film => addModal(key => {
    const modal = <EditFilm key={key} film={film} onClose={() => rmModal(modal)}/>
    return modal
  })
  const confirm = (cardSide, values) => addModal(key => {
    const modal = <ModalDialogConfirm key={key} title="Supprimer les films sélectionnés ?"
      message={cardSide ? 'Les films Sync+ seront placés dans la corbeille du dossier vidéo de la carte. Les autres fichiers et les sauvegardes sont conservés.' : 'Les copies préparées seront supprimées de la bibliothèque PC. Les vidéos originales sont conservées.'}
      onConfirm={() => act(async () => {
        if (cardSide) {await call('delete-card', drive, values.map(v => v.id)); await refresh(); setNotice('Films déplacés dans la corbeille de la carte (ils occupent encore de la place).')}
        else {await call('remove', values.map(v => v.id)); setSelected([]); setNotice('Copies préparées supprimées. Originaux conservés.')}
      })} onClose={() => rmModal(modal)}/>
    return modal
  })
  const localRows = useMemo(() => tableData(films), [films]), cardRows = useMemo(() => tableData(card.films), [card.films])
  const selection = localRows.filter(f => selected.some(s => s.id === f.id)), cardSelection = cardRows.filter(f => cardSelected.some(s => s.id === f.id))
  return <DropFiles onFilesDropped={dropped}>
    <TopBar currentModule="Videos"/>
    <AppContainer>
      <div className={styles.container}>
        <div className={styles.toolbar}>
          <h1>Films &amp; Vidéos</h1>
          <label>Compression<select value={profile} onChange={e => setProfile(e.target.value)}><option value="compact">Compact — stockage et lecture légère</option><option value="balanced">Équilibré — recommandé</option><option value="quality">Qualité — taille supérieure</option></select></label>
          <button disabled={busy} onClick={() => act(async () => imported(await call('choose', profile)))}>Ajouter des vidéos</button>
          <button disabled={!selection.length || busy} onClick={() => act(() => call('prepare', selection.map(v => v.id), profile))}>Compresser la sélection</button>
          <button onClick={() => act(() => call('cancel'))}>Annuler les traitements</button>
        </div>
        <p>Glissez vos films ici : la préparation démarre automatiquement. Originaux conservés. Les tailles estimées ne sont pas garanties.</p>
        {notice && <p role="status" className={styles.notice}>{notice}</p>}
        {error && <p role="alert" className={styles.error}>{error}</p>}
        {cardError && <p role="alert" className={styles.error}>Carte SD : {cardError}</p>}
        {progress && <label>{progress.kind === 'transfer' ? 'Transfert sur la carte' : progress.kind === 'analyze' ? 'Analyse YouTube' : 'Téléchargement'}<progress max="1" value={progress.value}/></label>}
        <div className={styles.panels}>
          <section className={styles.panel}>
            <Table id="syncplus-pc-videos" titleLeft="Bibliothèque PC" data={localRows} selectedData={selection}
              onSelect={v => toggle(setSelected, v)} onSelectAll={v => setSelected(selection.length === v.length ? [] : v)}
              onEdit={edit} onDelete={v => confirm(false, [v])} onDeleteSelected={() => confirm(false, selection)}/>
            <div className={styles.queue}>{films.filter(f => f.status !== 'ready').map(f => <div key={f.id}>
              <strong>{f.title}</strong> · {statuses[f.status]} · estimation {bytes(f.estimatedBytes)}
              {f.status === 'converting' && <progress max="1" value={f.progress}/>}
              {(f.error || f.warning) && <p className={styles.error}>{f.error || f.warning}</p>}
            </div>)}</div>
          </section>
          <section className={styles.panel}>
            <div className={styles.cardToolbar}>
              <label>Carte TELMI+<select value={drive} onChange={e => setDrive(e.target.value)}><option value="">Aucune carte</option>{cards.map(c => <option key={c.drive} value={c.drive}>{c.drive} — {c.label}</option>)}</select></label>
              <button disabled={busy} onClick={() => act(refresh)}>Actualiser</button>
              <button disabled={!drive || !selection.length || busy || selection.some(f => f.status !== 'ready')} onClick={() => act(async () => {await call('transfer', drive, selection.map(v => v.id)); await refresh(); setNotice('Transfert vérifié. Films et métadonnées disponibles hors ligne.')})}>Envoyer sur TELMI+</button>
              <button disabled={!drive || !cardSelection.length || busy || cardSelection.some(f => !f.managed)} onClick={() => confirm(true, cardSelection)}>Supprimer la sélection</button>
            </div>
            <p>Films : {bytes(card.occupiedBytes)} · Disponible : {bytes(card.availableBytes)} · {cardSelection.length} sélectionné(s)</p>
            {!drive && <p>Insérez une carte TELMI+ reconnue (TelmiOS et dossier TELMI_PLUS). Aucun formatage nécessaire.</p>}
            <Table id="syncplus-card-videos" titleLeft="Carte TELMI+" data={cardRows} selectedData={cardSelection}
              onSelect={v => toggle(setCardSelected, v)} onSelectAll={v => setCardSelected(cardSelection.length === v.length ? [] : v)}/>
          </section>
        </div>
        <details className={styles.youtube}>
          <summary>Importer depuis YouTube</summary>
          <div className={styles.toolbar}><label>URL YouTube<input type="url" value={url} onChange={e => {setUrl(e.target.value); setYoutube(null); setAuthorized(false)}} placeholder="https://www.youtube.com/watch?v=…"/></label>
            <button disabled={busy || !url} onClick={() => act(async () => {setYoutube(await call('youtube-analyze', url)); setAuthorized(false)})}>Analyser</button></div>
          {youtube && <div className={styles.youtubeDetails}>
            {youtube.thumbnail && <img src={youtube.thumbnail} alt="Miniature YouTube"/>}
            <div><h2>{youtube.title}</h2><p>{duration(youtube.durationSeconds)}</p><p className={styles.description}>{youtube.description}</p>
              {youtube.allowed ? <><label><input type="checkbox" checked={authorized} onChange={e => setAuthorized(e.target.checked)}/>Je possède ce contenu ou suis autorisé à le télécharger, conformément aux conditions applicables.</label>
              <button disabled={busy || !authorized} onClick={() => act(async () => {await call('youtube-import', youtube, authorized, profile); setNotice('Vidéo téléchargée. Compression automatique en cours.'); setYoutube(null)})}>Importer et compresser</button></> : <p>{youtube.reason}</p>}
            </div>
          </div>}
          <p>Aucun contournement de DRM, connexion, cookies ou restriction d’accès. Si le téléchargement échoue, ajoutez un fichier local obtenu légalement.</p>
        </details>
      </div>
    </AppContainer>
  </DropFiles>
}
