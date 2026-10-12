export function applyMusicChanges(tracks, selected, changes) {
  const allowed = new Set(['artist','album','date','genre','cover','release'])
  const values = Object.fromEntries(Object.entries(changes).filter(([k])=>allowed.has(k)))
  return tracks.map(t=>selected.includes(t.id)?{...t,...values}:t)
}
export function coverPreview(track) {
  if(track?.cover) return window.require('node:url').pathToFileURL(track.cover).href
  return /^[a-f0-9-]{36}$/i.test(track?.release||'')?'https://coverartarchive.org/release/'+track.release+'/front-250':''
}
export function jobStatus(job) {
  return job.status==='running'?'Conversion · '+Math.round((job.progress||0)*100)+' %':
    ({queued:'En attente',ready:'MP3 prêt',error:'Erreur',interrupted:'Interrompu'}[job.status]||job.status)
}
