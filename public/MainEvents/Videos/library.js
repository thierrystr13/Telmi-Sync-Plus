import fs from 'node:fs/promises'
import path from 'node:path'
import {pathToFileURL} from 'node:url'
import {randomUUID} from 'node:crypto'
import {id, estimate, metadata, filename, FAT32_MAX} from './contract.js'
import {probe, convert, image, hash} from './process.js'

export async function atomicJson(file, value) {
  const temporary = file + '.' + randomUUID() + '.tmp'
  const handle = await fs.open(temporary, 'w')
  try {await handle.writeFile(JSON.stringify(value, null, 2), 'utf8'); await handle.sync()} finally {await handle.close()}
  await fs.rename(temporary, file)
}
export class VideoLibrary {
  constructor(root, tools, changed = () => {}) {
    this.root = root; this.tools = tools; this.changed = changed; this.entries = []; this.pending = []; this.active = null
    this.ready = this.init()
  }
  directory(uuid) {return path.join(this.root, id(uuid))}
  async init() {
    await fs.mkdir(this.root, {recursive: true})
    // Only application-owned UUID directories are scanned; corrupt entries cannot hide others.
    for (const name of await fs.readdir(this.root)) {
      try {
        id(name)
        const dir = this.directory(name)
        await fs.rm(path.join(dir, 'work'), {recursive: true, force: true})
        const entry = JSON.parse(await fs.readFile(path.join(dir, 'entry.json'), 'utf8'))
        if (entry.id !== name) continue
        if (['queued', 'converting', 'downloading'].includes(entry.status)) {entry.status = 'interrupted'; entry.error = 'Traitement interrompu. Vous pouvez relancer la préparation.'}
        if (entry.status === 'ready') {
          try {await fs.access(path.join(dir, 'video.mp4'))} catch {entry.status = 'error'; entry.error = 'Vidéo préparée manquante.'}
        }
        this.entries.push(entry)
      } catch { /* damaged unrelated entry: skip */ }
    }
  }
  find(uuid) {
    const entry = this.entries.find(e => e.id === id(uuid))
    if (!entry) throw new Error('Film introuvable.')
    return entry
  }
  list() {
    return this.entries.map(e => ({...e, image: pathToFileURL(path.join(this.directory(e.id), 'poster.png')).href + `?v=${e.updated || 0}`}))
  }
  async save(entry) {
    entry.updated = Date.now()
    await atomicJson(path.join(this.directory(entry.id), 'entry.json'), entry)
    this.changed(this.list())
  }
  async add(source, name = 'balanced', extra = {}, queue = true) {
    await this.ready
    source = path.resolve(source)
    const info = await probe(this.tools.ffprobe, source)
    const fingerprint = await hash(source)
    const existing = this.entries.find(e => e.sourceSha256 === fingerprint)
    if (existing) return existing
    const entry = {id: id(), title: path.basename(source, path.extname(source)), synopsis: '', genre: '', originalTitle: '', year: '', source,
      ...extra, ...info, sourceWidth: info.width, sourceHeight: info.height, sourceSha256: fingerprint, profile: name, estimatedBytes: estimate(info.durationSeconds, name), status: 'imported', progress: 0}
    if (entry.estimatedBytes > FAT32_MAX) entry.warning = 'Estimation supérieure à 4 Gio : le résultat devra rester sous la limite FAT32.'
    await fs.mkdir(this.directory(entry.id), {recursive: true})
    this.entries.push(entry); await this.save(entry)
    if (queue) await this.enqueue(entry.id, name)
    return entry
  }
  async update(uuid, changes) {
    await this.ready
    const entry = this.find(uuid)
    if (['converting', 'queued', 'downloading'].includes(entry.status)) throw new Error('Attendez la fin de la préparation pour modifier ce film.')
    const values = metadata({...entry, ...Object.fromEntries(['title', 'originalTitle', 'synopsis', 'genre', 'rating', 'year', 'tmdbId'].filter(k => Object.hasOwn(changes, k)).map(k => [k, changes[k]]))}, filename(entry.title, entry.id))
    for (const key of ['title', 'originalTitle', 'synopsis', 'genre', 'rating', 'year', 'tmdbId']) entry[key] = values[key]
    await this.save(entry); return entry
  }
  async cover(uuid, source) {
    const entry = this.find(uuid)
    if (['converting', 'queued'].includes(entry.status)) throw new Error('Attendez la fin de la préparation pour choisir la pochette.')
    if (!/\.(jpe?g|png)$/i.test(source)) throw new Error('Choisissez une pochette JPG ou PNG.')
    const dir = this.directory(uuid), temporary = path.join(dir, 'poster.tmp.png')
    try {
      await image(this.tools, path.resolve(source), temporary, 300, 450)
      await fs.rename(temporary, path.join(dir, 'poster.png')); entry.manualCover = true; await this.save(entry)
    } finally {await fs.rm(temporary, {force: true})}
  }
  async enqueue(uuid, name = 'balanced') {
    await this.ready
    const entry = this.find(uuid)
    if (entry.status === 'ready') return
    if (this.pending.includes(uuid) || this.active?.id === uuid) return
    entry.profile = name; entry.estimatedBytes = estimate(entry.durationSeconds, name); entry.status = 'queued'; entry.error = ''; entry.progress = 0
    this.pending.push(uuid); await this.save(entry); this.drain()
  }
  async drain() {
    if (this.active || !this.pending.length) return
    const uuid = this.pending.shift(), entry = this.find(uuid), controller = new AbortController()
    this.active = {id: uuid, controller}
    const dir = this.directory(uuid), work = path.join(dir, 'work')
    try {
      await fs.mkdir(work, {recursive: true})
      entry.status = 'converting'; await this.save(entry)
      let last = 0
      const result = await convert(this.tools, entry.source, path.join(work, 'video.mp4'), entry.profile, entry, {
        signal: controller.signal, onProgress: value => {
          entry.progress = value
          if (Date.now() - last > 400) {last = Date.now(); this.changed(this.list())}
        }
      })
      if (!entry.manualCover) await image(this.tools, path.join(work, 'video.mp4'), path.join(work, 'poster.png'), 300, 450, {video: true, duration: entry.durationSeconds, signal: controller.signal})
      await image(this.tools, path.join(work, 'video.mp4'), path.join(work, 'backdrop.png'), 640, 360, {video: true, duration: entry.durationSeconds, signal: controller.signal})
      if (controller.signal.aborted) throw new Error('Opération annulée.')
      for (const file of ['video.mp4', 'poster.png', 'backdrop.png']) {
        if (file === 'poster.png' && entry.manualCover) continue
        await fs.rename(path.join(work, file), path.join(dir, file))
      }
      Object.assign(entry, {status: 'ready', progress: 1, compressedBytes: result.originalBytes, width: result.width, height: result.height, sha256: result.sha256, durationSeconds: result.durationSeconds})
    } catch (error) {
      entry.status = controller.signal.aborted ? 'cancelled' : 'error'; entry.error = error.message; entry.progress = 0
    } finally {
      try {
        await fs.rm(work, {recursive: true, force: true})
        await this.save(entry)
      } catch (error) {
        entry.status = 'error'; entry.error = 'Erreur de stockage bibliothèque : ' + error.message
        this.changed(this.list())
      } finally {this.active = null; this.drain()}
    }
  }
  async cancel(uuids) {
    for (const uuid of uuids) {
      const entry = this.find(uuid)
      if (this.active?.id === uuid) this.active.controller.abort()
      else if (this.pending.includes(uuid)) {this.pending = this.pending.filter(v => v !== uuid); entry.status = 'cancelled'; await this.save(entry)}
    }
  }
  async remove(uuids) {
    for (const uuid of uuids) {
      const entry = this.find(uuid)
      if (this.active?.id === uuid || this.pending.includes(uuid)) throw new Error('Annulez puis attendez la fin du traitement avant de supprimer ce film.')
      const dir = this.directory(uuid)
      const resolved = await fs.realpath(dir)
      if (path.dirname(resolved).toLowerCase() !== (await fs.realpath(this.root)).toLowerCase()) throw new Error('Chemin bibliothèque invalide.')
      await fs.rm(dir, {recursive: true, force: true})
      this.entries = this.entries.filter(e => e.id !== uuid); this.changed(this.list())
      // The original source is never removed.
    }
  }
  async idle() {
    while (this.active || this.pending.length) await new Promise(resolve => setTimeout(resolve, 30))
  }
}
