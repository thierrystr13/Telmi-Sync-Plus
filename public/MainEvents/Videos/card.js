import fs from 'node:fs/promises'
import {createReadStream, createWriteStream} from 'node:fs'
import {pipeline} from 'node:stream/promises'
import {Transform} from 'node:stream'
import path from 'node:path'
import {pathToFileURL} from 'node:url'
import {randomUUID} from 'node:crypto'
import {VIDEO_DIRECTORY, FAT32_MAX, metadata, filename, id} from './contract.js'
import {atomicJson} from './library.js'
import {hash, probe} from './process.js'

const extensions = /\.(mp4|m4v|mov|mkv|avi|mpg|mpeg|ts|m2ts)$/i
function safeName(name) {
  if (typeof name !== 'string' || !name || name.startsWith('.') || /[\\/:]/.test(name) || path.basename(name) !== name) throw new Error('Nom de fichier carte invalide.')
  return name
}
async function exists(file) {try {await fs.access(file); return true} catch {return false}}
export async function cardDirectory(drive, recognize) {
  drive = await fs.realpath(drive)
  if (!await recognize(drive)) throw new Error('Carte TELMI+ non reconnue. Aucun fichier modifié.')
  // Refuse symlinks/junctions at every component so writes cannot escape the SD.
  let directory = drive
  for (const component of VIDEO_DIRECTORY.split('/')) {
    directory = path.join(directory, component)
    try {
      const st = await fs.lstat(directory)
      if (st.isSymbolicLink() || !st.isDirectory()) throw new Error('Dossier vidéo non sécurisé.')
    } catch (error) {if (error.code !== 'ENOENT') throw error; await fs.mkdir(directory)}
  }
  return directory
}
async function regular(file) {
  const st = await fs.lstat(file)
  if (!st.isFile() || st.isSymbolicLink()) throw new Error('Fichier vidéo non sécurisé.')
  return st
}
export async function listCard(directory) {
  const films = []
  for (const name of await fs.readdir(directory)) {
    if (!extensions.test(name) || name.startsWith('.')) continue
    try {
      const size = (await regular(path.join(directory, name))).size
      let data = {}
      try {
        const sidecar = path.join(directory, name + '.movie.json')
        if ((await regular(sidecar)).size <= 65536) {
          const parsed = JSON.parse(await fs.readFile(sidecar, 'utf8'))
          if (parsed.schemaVersion === 1) data = parsed
        }
      } catch { /* sidecars optional */ }
      let managed = false
      try {managed = data.syncPlus === true && id(data.id) && data.videoFile === name && /^[a-f0-9]{64}$/.test(data.sha256)} catch {}
      const stem = name.replace(/\.[^.]+$/, '')
      const poster = typeof data.poster === 'string' && /^[^.][^\\/:]*\.png$/i.test(data.poster) ? data.poster : stem + '.poster.png'
      let occupiedBytes = size
      for (const side of [name + '.movie.json', poster, stem + '.backdrop.png']) {
        try {occupiedBytes += (await regular(path.join(directory, safeName(side)))).size} catch {}
      }
      films.push({...data, id: managed ? data.id : name, managed: !!managed, title: data.title || stem, videoFile: name, compressedBytes: size, occupiedBytes,
        image: pathToFileURL(path.join(directory, poster)).href})
    } catch { /* tolerate missing and invalid files */ }
  }
  const stat = await fs.statfs(directory)
  return {films, occupiedBytes: films.reduce((n, f) => n + f.occupiedBytes, 0), availableBytes: stat.bavail * stat.bsize, totalBytes: stat.blocks * stat.bsize}
}
async function syncFile(file) {
  const handle = await fs.open(file, 'r+')
  try {await handle.sync()} finally {await handle.close()}
}
async function rollback(directory, stage, plan) {
  for (const item of [...plan.files].reverse()) {
    const target = path.join(directory, safeName(item.name)), backup = path.join(stage, 'old-' + item.name), staged = path.join(stage, item.name)
    if (await exists(backup)) {
      if (await exists(target)) {await regular(target); await fs.unlink(target)}
      await fs.rename(backup, target)
    } else if (!item.existed && !await exists(staged) && await exists(target)) {
      await regular(target)
      if (await hash(target) === item.sha256) await fs.unlink(target)
    }
  }
}
export async function recoverCard(directory) {
  for (const name of await fs.readdir(directory)) {
    if (!/^\.syncplus-[a-f0-9-]{36}$/.test(name)) continue
    const stage = path.join(directory, name)
    if ((await fs.lstat(stage)).isSymbolicLink()) throw new Error('Transaction carte non sécurisée.')
    try {
      const plan = JSON.parse(await fs.readFile(path.join(stage, 'transaction.json'), 'utf8'))
      if (plan.schemaVersion !== 1 || !Array.isArray(plan.files) || plan.files.length > 4) throw new Error('Transaction invalide.')
      if (!plan.committed) await rollback(directory, stage, plan)
      await fs.rm(stage, {recursive: true, force: true})
    } catch (error) {
      // A directory without journal never reached commit: leave it hidden for inspection.
      if (error.code !== 'ENOENT') throw new Error('Transaction interrompue à vérifier : ' + name)
    }
  }
}
export async function transfer(library, directory, uuid, {signal, onProgress = () => {}} = {}) {
  const entry = library.find(uuid)
  if (entry.status !== 'ready') throw new Error('Préparez ce film avant de le transférer.')
  const current = (await listCard(directory)).films.find(f => f.managed && f.id === uuid)
  const name = current?.videoFile || filename(entry.title, uuid)
  const source = path.join(library.directory(uuid), 'video.mp4')
  const size = (await regular(source)).size
  if (size > FAT32_MAX) throw new Error('Vidéo supérieure à la limite FAT32 de 4 Gio.')
  if (await hash(source, signal) !== entry.sha256) throw new Error('Vidéo préparée modifiée ou endommagée. Réimportez le fichier original.')
  if (current && await hash(path.join(directory, name), signal) !== entry.sha256) throw new Error('Une vidéo différente utilise cet identifiant sur la carte. Supprimez explicitement cette entrée avant transfert.')
  const meta = metadata(entry, name), stem = name.replace(/\.mp4$/i, '')
  const files = [
    {name: meta.poster, source: path.join(library.directory(uuid), 'poster.png')},
    {name: meta.backdrop, source: path.join(library.directory(uuid), 'backdrop.png')},
    {name: name + '.movie.json', json: meta},
    ...(!current ? [{name, source}] : [])
  ]
  let required = 65536
  for (const file of files) if (file.source) required += (await regular(file.source)).size
  const stat = await fs.statfs(directory)
  if (required + 16 * 1024 * 1024 > stat.bavail * stat.bsize) throw new Error('Place insuffisante sur la carte (16 Mio de réserve).')
  if (!current && (await listCard(directory)).films.length >= 256) throw new Error('La bibliothèque TELMI+ est limitée à 256 films.')
  // Refuse collisions rather than overwrite files not owned by this entry.
  for (const file of files) {
    const target = path.join(directory, safeName(file.name))
    if (await exists(target)) {
      await regular(target)
      if (!current) throw new Error('Un fichier du même nom existe déjà sur la carte.')
    }
  }
  const stage = path.join(directory, '.syncplus-' + randomUUID())
  await fs.mkdir(stage)
  const plan = {schemaVersion: 1, committed: false, files: []}
  let copied = 0
  try {
    for (const file of files) {
      const staged = path.join(stage, file.name)
      if (file.source) {
        const counter = new Transform({transform(chunk, encoding, callback) {copied += chunk.length; onProgress(Math.min(0.95, copied / required)); callback(null, chunk)}})
        await pipeline(createReadStream(file.source), counter, createWriteStream(staged, {flags: 'wx'}), {signal})
      } else await fs.writeFile(staged, JSON.stringify(file.json, null, 2), {flag: 'wx'})
      await syncFile(staged)
      const digest = await hash(staged, signal)
      if (file.source && digest !== await hash(file.source, signal)) throw new Error('Erreur de vérification après copie.')
      plan.files.push({name: file.name, sha256: digest, existed: await exists(path.join(directory, file.name))})
    }
    if (!current) await probe(library.tools.ffprobe, path.join(stage, name), {signal})
    if (signal?.aborted) throw new Error('Transfert annulé.')
    await atomicJson(path.join(stage, 'transaction.json'), plan)
    // Once publication starts, finish it or roll it back; video is published last.
    for (const file of plan.files) {
      const target = path.join(directory, file.name)
      if (file.existed) await fs.rename(target, path.join(stage, 'old-' + file.name))
      await fs.rename(path.join(stage, file.name), target)
    }
    plan.committed = true; await atomicJson(path.join(stage, 'transaction.json'), plan)
    onProgress(1)
  } catch (error) {await rollback(directory, stage, plan); throw error}
  finally {await fs.rm(stage, {recursive: true, force: true})}
  return {videoFile: name, updated: !!current, stem}
}
export async function deleteCard(directory, uuid) {
  id(uuid)
  const film = (await listCard(directory)).films.find(f => f.managed && f.id === uuid)
  if (!film) throw new Error('Seuls les films créés par Sync+ peuvent être supprimés ici. Les fichiers existants sont protégés.')
  const stem = film.videoFile.replace(/\.mp4$/i, '')
  // Recoverable trash hides the video from the flat scanner; no saves/cache touched.
  const trash = path.join(directory, '.syncplus-trash-' + randomUUID())
  await fs.mkdir(trash)
  for (const name of [film.videoFile, film.videoFile + '.movie.json', stem + '.poster.png', stem + '.backdrop.png']) {
    const file = path.join(directory, safeName(name))
    if (await exists(file)) {await regular(file); await fs.rename(file, path.join(trash, name))}
  }
  // Return path for the UI: deletion is recoverable until user chooses to empty trash.
  return trash
}
