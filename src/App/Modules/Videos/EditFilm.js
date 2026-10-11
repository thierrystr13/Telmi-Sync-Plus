import {useState} from 'react'
import ModalLayoutPadded from '../../Components/Modal/ModalLayoutPadded.js'
import ModalTitle from '../../Components/Modal/ModalTitle.js'
import {call, bytes, duration} from './api.js'
import styles from './Videos.module.scss'

export default function EditFilm({film, onClose}) {
  const [data, setData] = useState(film), [query, setQuery] = useState(film.title), [results, setResults] = useState([]),
    [error, setError] = useState(''), [busy, setBusy] = useState(false), [token, setToken] = useState(''), [imageVersion, setImageVersion] = useState(0)
  const act = async action => {
    setError(''); setBusy(true)
    try {await action()} catch (e) {setError(e.message)} finally {setBusy(false)}
  }
  const field = (key, label, type = 'text') => <label>{label}<input type={type} value={data[key] || ''} onChange={e => setData({...data, [key]: e.target.value})}/></label>
  return <ModalLayoutPadded isClosable onClose={onClose} className={styles.editor}>
    <ModalTitle>Informations du film</ModalTitle>
    <div className={styles.editorBody}>
      <div className={styles.poster}>
        <img src={film.image + '&edit=' + imageVersion} alt="Pochette du film" onError={e => {e.currentTarget.style.visibility = 'hidden'}}/>
        <button disabled={busy} onClick={() => act(async () => {await call('cover', film.id); setImageVersion(imageVersion + 1)})}>Choisir une pochette JPG / PNG</button>
        <p>{duration(film.durationSeconds)} · {film.width} × {film.height}</p>
        <p>Original : {bytes(film.originalBytes)}<br/>Préparé : {bytes(film.compressedBytes)}</p>
      </div>
      <div className={styles.fields}>
        {field('title', 'Titre')}{field('originalTitle', 'Titre original (facultatif)')}
        {field('year', 'Année', 'number')}{field('genre', 'Genre (facultatif)')}{field('rating', 'Classification (facultatif)')}
        <label>Synopsis<textarea rows="5" value={data.synopsis || ''} onChange={e => setData({...data, synopsis: e.target.value})}/></label>
        <button disabled={busy} onClick={() => act(async () => {await call('update', film.id, data); onClose()})}>Enregistrer</button>
      </div>
    </div>
    <details className={styles.tmdb}>
      <summary>Rechercher les informations avec TMDb</summary>
      <p>La recherche nécessite un jeton de lecture TMDb. Il est conservé chiffré sur cet ordinateur. La saisie manuelle fonctionne sans compte.</p>
      <label>Jeton de lecture API TMDb<input type="password" autoComplete="off" value={token} onChange={e => setToken(e.target.value)}/></label>
      <button disabled={busy || !token} onClick={() => act(async () => {await call('tmdb-token', token); setToken('')})}>Enregistrer le jeton</button>
      <label>Titre à rechercher<input value={query} onChange={e => setQuery(e.target.value)}/></label>
      <button disabled={busy || !query} onClick={() => act(async () => setResults(await call('tmdb-search', query)))}>Rechercher les informations</button>
      <ul>{results.map(m => <li key={m.id} className={styles.result}>
        {m.image && <img src={m.image} alt="Affiche"/>}<span>{m.title} ({m.year})<br/>{m.synopsis?.slice(0, 150)}</span>
        <button disabled={busy} onClick={() => act(async () => {const updated = await call('tmdb-apply', film.id, m.id); setData(updated); setImageVersion(imageVersion + 1)})}>Choisir ce film</button>
      </li>)}</ul>
      <p>This product uses the TMDB API but is not endorsed or certified by TMDB. Informations et affiches : TMDb.</p>
    </details>
    {error && <p role="alert" className={styles.error}>{error}</p>}
  </ModalLayoutPadded>
}
