import {app, dialog, ipcMain, safeStorage} from 'electron'
import fs from 'node:fs/promises'
import {existsSync} from 'node:fs'
import path from 'node:path'
import {VideoLibrary} from './Videos/library.js'
import {OnlineVideo, MovieInformation} from './Videos/network.js'
import {cardDirectory, listCard, recoverCard, transfer, deleteCard} from './Videos/card.js'
import {parseTelmiOSAutorun} from './Helpers/InfFiles.js'
import {getBinPath} from './Helpers/AppPaths.js'
import {list as listDrives} from './Helpers/DriveList.js'

export default function mainEventVideos(window) {
  const resources = app.isPackaged ? path.join(process.resourcesPath, 'extraResources') : path.join(app.getAppPath(), 'extraResources')
  const binary = name => {
    const filename = name + (process.platform === 'win32' ? '.exe' : '')
    const bundled = path.join(resources, 'video-tools', filename)
    return existsSync(bundled) ? bundled : getBinPath(filename)
  }
  const tools = {ffmpeg: binary('ffmpeg'), ffprobe: binary('ffprobe'), ytdlp: binary('yt-dlp'), node: process.execPath}
  const root = path.join(app.getPath('userData'), 'videos')
  const library = new VideoLibrary(root, tools, films => {if (!window.isDestroyed()) window.webContents.send('videos-library', films)})
  const online = new OnlineVideo(tools)
  const tmdb = new MovieInformation()
  const tokenFile = path.join(app.getPath('userData'), 'tmdb-token.enc')
  let operation = null
  const tokenReady = fs.readFile(tokenFile).then(buffer => {
    if (safeStorage.isEncryptionAvailable()) tmdb.token = safeStorage.decryptString(buffer)
  }).catch(() => {})
  const progress = (kind, value) => {if (!window.isDestroyed()) window.webContents.send('videos-progress', {kind, value})}
  const recognize = async drive => parseTelmiOSAutorun(drive)?.isPlus === true
  const directory = async drive => {
    const drives = await listDrives()
    if (!drives.some(d => d.mountpoints.some(m => path.resolve(m.path).toLowerCase() === path.resolve(drive).toLowerCase()))) throw new Error('Carte déconnectée ou lecteur inconnu.')
    const dir = await cardDirectory(drive, recognize)
    await recoverCard(dir); return dir
  }
  const handler = (name, callback) => ipcMain.handle('videos-' + name, async (event, ...args) => {
    if (event.sender !== window.webContents || event.senderFrame !== window.webContents.mainFrame) return {ok: false, error: 'Requête non autorisée.'}
    try {await library.ready; return {ok: true, data: await callback(...args)}} catch (error) {return {ok: false, error: error.message}}
  })
  const exclusive = async (kind, callback) => {
    if (operation) throw new Error('Une opération est déjà en cours. Attendez ou annulez-la.')
    const controller = new AbortController(); operation = {kind, controller}
    try {return await callback(controller.signal)} finally {operation = null; progress('', 0)}
  }
  handler('list', () => library.list())
  handler('choose', async name => {
    const chosen = await dialog.showOpenDialog(window, {title: 'Ajouter des vidéos', properties: ['openFile', 'multiSelections'], filters: [{name: 'Vidéos', extensions: ['mp4', 'mkv', 'avi', 'mov', 'webm', 'm4v', 'mpg', 'mpeg', 'ts', 'm2ts', 'wmv', 'flv']}, {name: 'Tous les fichiers', extensions: ['*']}]})
    const results = []
    for (const file of chosen.filePaths) {try {results.push({file, id: (await library.add(file, name)).id})} catch (error) {results.push({file, error: error.message})}}
    return results
  })
  handler('add', async (files, name) => {
    if (!Array.isArray(files) || files.length > 256) throw new Error('Sélectionnez au maximum 256 fichiers.')
    const results = []
    for (const file of files) {try {results.push({file, id: (await library.add(file, name)).id})} catch (error) {results.push({file, error: error.message})}}
    return results
  })
  handler('prepare', async (ids, name) => {for (const uuid of ids) await library.enqueue(uuid, name)})
  handler('cancel', async ids => {operation?.controller.abort(); await library.cancel(ids || library.entries.map(e => e.id))})
  handler('remove', ids => library.remove(ids))
  handler('update', (uuid, changes) => library.update(uuid, changes))
  handler('cover', async uuid => {
    const selected = await dialog.showOpenDialog(window, {title: 'Choisir une pochette', properties: ['openFile'], filters: [{name: 'Pochette', extensions: ['jpg', 'jpeg', 'png']}]})
    if (selected.filePaths[0]) await library.cover(uuid, selected.filePaths[0])
  })
  handler('cards', async () => {
    const result = []
    for (const d of await listDrives()) for (const m of d.mountpoints) if (await recognize(m.path)) result.push({drive: m.path, label: d.description})
    return result
  })
  handler('card', async drive => listCard(await directory(drive)))
  handler('transfer', (drive, ids) => exclusive('transfer', async signal => {
    const dir = await directory(drive), results = []
    for (let i = 0; i < ids.length; i++) {
      if (signal.aborted) throw new Error('Transfert annulé.')
      results.push(await transfer(library, dir, ids[i], {signal, onProgress: value => progress('transfer', (i + value) / ids.length)}))
    }
    return results
  }))
  handler('delete-card', (drive, ids) => exclusive('delete', async () => {
    const dir = await directory(drive), results = []
    for (const uuid of ids) results.push(await deleteCard(dir, uuid))
    return results
  }))
  handler('youtube-analyze', url => exclusive('analyze', signal => online.analyze(url, {signal})))
  handler('youtube-import', (info, authorized, name) => exclusive('download', async signal => {
    const downloads = path.join(app.getPath('userData'), 'video-downloads')
    const canonical = (await online.analyze(info.url, {signal})).url
    const videoId = new URL(canonical).searchParams.get('v')
    const work = path.join(downloads, videoId)
    // Stable download directory permits yt-dlp --continue on retry; successfully
    // imported sources are retained for reconversion, never mixed with originals.
    const result = await online.download({url: canonical}, work, authorized, {signal, onProgress: value => progress('download', value)})
    const entry = await library.add(result.file, name, {title: result.info.title, synopsis: result.info.description, sourceUrl: canonical})
    return entry.id
  }))
  handler('tmdb-status', async () => {await tokenReady; return !!tmdb.token})
  handler('tmdb-token', async token => {
    if (!safeStorage.isEncryptionAvailable()) throw new Error('Le stockage chiffré du système est indisponible.')
    if (typeof token !== 'string' || token.length > 4096) throw new Error('Jeton invalide.')
    tmdb.token = token.trim()
    if (tmdb.token) await fs.writeFile(tokenFile, safeStorage.encryptString(tmdb.token))
    else await fs.rm(tokenFile, {force: true})
    return !!tmdb.token
  })
  handler('tmdb-search', async title => {await tokenReady; return tmdb.search(title)})
  handler('tmdb-apply', async (uuid, movieId) => {
    await tokenReady
    const data = await tmdb.details(movieId)
    await library.update(uuid, data)
    const target = path.join(library.directory(uuid), 'tmdb.jpg')
    try {if (await tmdb.poster(data.posterPath, target)) await library.cover(uuid, target)} finally {await fs.rm(target, {force: true})}
    return library.find(uuid)
  })
  let closing = false
  app.on('before-quit', event => {
    if (closing) return
    event.preventDefault(); closing = true
    operation?.controller.abort()
    library.cancel(library.entries.map(e => e.id)).then(() => library.idle()).finally(() => app.quit())
  })
}
