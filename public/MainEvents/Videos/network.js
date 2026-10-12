import fs from 'node:fs/promises'
import path from 'node:path'
import {run} from './process.js'

export function youtubeUrl(value) {
  let url
  try {url = new URL(String(value))} catch {throw new Error('Lien YouTube invalide.')}
  if (url.protocol !== 'https:' || url.username || url.password || url.port) throw new Error('Utilisez une URL YouTube HTTPS publique.')
  let videoId
  if (['youtube.com', 'www.youtube.com', 'm.youtube.com'].includes(url.hostname)) {
    if (url.pathname === '/watch') videoId = url.searchParams.get('v')
    else videoId = /^\/(?:shorts|embed|live)\/([A-Za-z0-9_-]{11})\/?$/.exec(url.pathname)?.[1]
  } else if (url.hostname === 'youtu.be') videoId = /^\/([A-Za-z0-9_-]{11})\/?$/.exec(url.pathname)?.[1]
  if (!/^[A-Za-z0-9_-]{11}$/.test(videoId || '')) throw new Error('Choisissez une vidéo YouTube, sans playlist ni lien externe.')
  return `https://www.youtube.com/watch?v=${videoId}`
}
export function allowedYoutube(info) {
  if (info.has_drm || info.is_live || info.live_status === 'is_upcoming' || !info.duration || info.duration > 604800) return false
  return ['public', 'unlisted'].includes(info.availability) && (info.formats || []).some(f => !f.has_drm && f.vcodec !== 'none')
}
export class OnlineVideo {
  constructor(tools) {this.tools = tools}
  common() {
    return ['--ignore-config', '--no-playlist', '--no-warnings', '--no-cookies', '--no-cache-dir',
      '--js-runtimes', `node:${this.tools.node}`, '--ffmpeg-location', path.dirname(this.tools.ffmpeg)]
  }
  async analyze(value, options = {}) {
    const url = youtubeUrl(value)
    const info = JSON.parse(await run(this.tools.ytdlp, [...this.common(), '--skip-download', '--dump-single-json', '--', url], {...options, env: {...process.env, ELECTRON_RUN_AS_NODE: '1'}, timeout: 120000}))
    const permitted = allowedYoutube(info)
    const thumbnail = /^https:\/\/(?:[A-Za-z0-9-]+\.)?(?:ytimg\.com|googleusercontent\.com)\//.test(info.thumbnail || '') ? info.thumbnail : undefined
    return {url, title: String(info.title || '').slice(0, 300), thumbnail, durationSeconds: info.duration,
      description: String(info.description || '').slice(0, 10000), allowed: permitted,
      reason: permitted ? '' : 'Vidéo privée, protégée, en direct ou non disponible. Importez un fichier local obtenu légalement.'}
  }
  async download(info, directory, authorized, options = {}) {
    if (authorized !== true) throw new Error('Confirmez que vous possédez le contenu ou avez l’autorisation de le télécharger.')
    // Reanalyze at download time so UI metadata cannot authorize a restricted URL.
    const checked = await this.analyze(info.url, options)
    if (!checked.allowed) throw new Error(checked.reason)
    await fs.mkdir(directory, {recursive: true})
    await run(this.tools.ytdlp, [...this.common(), '--continue', '--newline', '--progress', '--progress-template', 'download:SYNCPLUS:%(progress._percent_str)s',
      '--format', 'bv*[height<=720][has_drm!=true]+ba[has_drm!=true]/b[height<=720][has_drm!=true]', '--merge-output-format', 'mkv',
      '--max-filesize', '4G', '--output', path.join(directory, 'download.%(ext)s'), '--', checked.url], {...options, env: {...process.env, ELECTRON_RUN_AS_NODE: '1'}, capture: false,
      onLine: line => {const match = /^SYNCPLUS:\s*([\d.]+)%/.exec(line); if (match) options.onProgress?.(Number(match[1]) / 100)}})
    const files = (await fs.readdir(directory)).filter(name => /^download\.(mp4|mkv|webm|mov)$/.test(name))
    if (files.length !== 1) throw new Error('Téléchargement incomplet. Importez un fichier local obtenu légalement.')
    return {file: path.join(directory, files[0]), info: checked}
  }
}
async function jsonFetch(url, headers) {
  const response = await fetch(url, {headers, redirect: 'error', signal: AbortSignal.timeout(20000)})
  if (!response.ok) throw new Error('Service TMDb indisponible ou clé invalide.')
  return response.json()
}
export class MovieInformation {
  constructor(token = '') {this.token = token}
  async request(endpoint, params = {}) {
    if (!this.token) throw new Error('Configurez un jeton de lecture TMDb pour la recherche. La saisie et les pochettes manuelles restent disponibles.')
    const url = new URL('https://api.themoviedb.org/3/' + endpoint)
    Object.entries({...params, language: 'fr-FR'}).forEach(([key, value]) => url.searchParams.set(key, value))
    return jsonFetch(url, {Authorization: 'Bearer ' + this.token})
  }
  async search(title) {
    const data = await this.request('search/movie', {query: String(title).slice(0, 200), include_adult: 'false'})
    return (data.results || []).slice(0, 15).map(m => ({id: m.id, title: m.title, year: m.release_date?.slice(0, 4), synopsis: m.overview,
      image: m.poster_path ? 'https://image.tmdb.org/t/p/w185' + m.poster_path : undefined}))
  }
  async details(movieId) {
    if (!Number.isSafeInteger(movieId) || movieId < 1) throw new Error('Identifiant TMDb invalide.')
    const m = await this.request('movie/' + movieId)
    return {tmdbId: m.id, title: m.title, originalTitle: m.original_title, year: m.release_date?.slice(0, 4), synopsis: m.overview || '', genre: (m.genres || []).map(g => g.name).join(', '), posterPath: m.poster_path}
  }
  async poster(posterPath, target) {
    if (!/^\/[A-Za-z0-9_-]+\.jpg$/.test(posterPath || '')) return false
    const response = await fetch('https://image.tmdb.org/t/p/w500' + posterPath, {redirect: 'error', signal: AbortSignal.timeout(30000)})
    if (!response.ok) throw new Error('Affiche TMDb indisponible.')
    const chunks = []; let size = 0
    for await (const chunk of response.body) {size += chunk.length; if (size > 8 * 1024 * 1024) throw new Error('Affiche trop volumineuse.'); chunks.push(chunk)}
    await fs.writeFile(target, Buffer.concat(chunks)); return true
  }
}
