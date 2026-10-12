const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
const trim = value => value.replace(/^[\s\-–—:|()[\]]+|[\s\-–—:|()[\]]+$/g, '').trim()
const positive = value => Number.isInteger(Number(value)) && Number(value) > 0 ? Number(value) : null

// A catalogue episode number is not, by itself, evidence that unrelated stories
// belong together. Group only an explicit title marker or named collection.
export function episodeDetails(episode) {
  const title = String(episode.title || 'Sans titre')
  const season = /\bS(\d{1,3})\s*E(\d{1,4})\b/i.exec(title)
  const marker = /(?<![\p{L}\p{N}])(?:[ée]pisode|ep\.?|chapitre|partie)\s*(?:n[°o]\s*)?(\d{1,4})(?:\s*\/\s*(\d{1,4}))?/iu.exec(title)
  const fraction = !marker && /\((\d{1,3})\s*\/\s*(\d{1,3})\)/.exec(title)
  const match = season || marker || fraction
  let storyTitle = title, episodeTitle = title, namedCollection = false
  if (match) {
    const body = trim(title.slice(0, match.index) + ' ' + title.slice(match.index + match[0].length))
    const parts = body.split(/\s+[-–—|]\s+/).map(trim).filter(Boolean)
    if (season && parts.length > 1) {storyTitle = parts[parts.length - 1]; episodeTitle = parts.slice(0, -1).join(' — ')}
    else if (parts.length > 1) {storyTitle = parts[0]; episodeTitle = parts.slice(1).join(' — ')}
    else {storyTitle = body || title; episodeTitle = body || title}
  } else {
    const parts = title.split(/\s*:\s+/)
    if (parts.length === 2 && parts[0].trim().split(/\s+/).length >= 3) {
      storyTitle = parts[0].trim(); episodeTitle = parts[1].trim(); namedCollection = true
    }
  }
  const episodeNumber = season ? positive(season[2]) : match ? positive(match[1]) : positive(episode.episodeNumber)
  const seasonNumber = season ? positive(season[1]) : positive(episode.seasonNumber)
  const totalEpisodes = marker ? positive(marker[2]) : fraction ? positive(fraction[2]) : null
  const numbered = !!match
  return {storyTitle, episodeTitle, episodeNumber, seasonNumber, totalEpisodes, numbered, namedCollection,
    groupKey: (numbered || namedCollection) ? normalize(storyTitle) : 'single-' + episode.id}
}

export function episodeOrder(a, b) {
  const x = episodeDetails(a), y = episodeDetails(b)
  return (x.seasonNumber || 0) - (y.seasonNumber || 0) ||
    (x.episodeNumber || Infinity) - (y.episodeNumber || Infinity) ||
    (Date.parse(a.date) || 0) - (Date.parse(b.date) || 0) || a.title.localeCompare(b.title, 'fr', {numeric:true})
}

export function storyFolders(episodes) {
  const folders = new Map()
  for (const episode of episodes) {
    const info = episodeDetails(episode), key = String(episode.sourceId) + ':' + info.groupKey
    if (!folders.has(key)) folders.set(key, {id:key,title:info.storyTitle,sourceId:episode.sourceId,source:episode.source,
      cover:episode.cover,episodes:[],numbered:info.numbered,collection:info.namedCollection,totalEpisodes:info.totalEpisodes})
    const folder = folders.get(key)
    folder.episodes.push(episode); folder.totalEpisodes = Math.max(folder.totalEpisodes || 0, info.totalEpisodes || 0) || null
  }
  return [...folders.values()].map(folder => {
    folder.episodes.sort(episodeOrder)
    folder.duration = folder.episodes.reduce((n, e) => n + (e.duration || 0), 0)
    folder.categories = [...new Set(folder.episodes.flatMap(e => e.categories || []))]
    folder.ages = [...new Set(folder.episodes.map(e=>e.age).filter(Boolean))].sort((a,b)=>a-b)
    folder.kind = folder.episodes.some(e=>episodeDetails(e).seasonNumber) ? 'Feuilleton' :
      folder.numbered ? 'Histoire en plusieurs parties' : folder.collection && folder.episodes.length > 1 ? 'Collection de récits' : folder.episodes[0].kind
    return folder
  }).sort((a,b)=>a.title.localeCompare(b.title,'fr',{numeric:true}))
}

export function episodeLabel(episode, index) {
  const info = episodeDetails(episode)
  if (info.episodeNumber) return (info.seasonNumber ? 'Saison ' + info.seasonNumber + ' · ' : '') + 'Épisode ' + info.episodeNumber
  return 'Récit ' + (index + 1) + ' · sans numéro éditeur'
}

export function toggleFolderSelection(selected, episodes, maximum = 100) {
  const ids = episodes.filter(e=>e.available).map(e=>e.id), current = new Set(selected)
  if (ids.every(id=>current.has(id))) ids.forEach(id=>current.delete(id))
  else {
    const next = new Set([...selected, ...ids])
    if (next.size > maximum) throw new Error('Maximum ' + maximum + ' épisodes par import. Choisissez moins de dossiers.')
    return [...next]
  }
  return [...current]
}
