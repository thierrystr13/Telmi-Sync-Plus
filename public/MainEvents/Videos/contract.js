import path from 'node:path'
import {randomUUID} from 'node:crypto'

export const FAT32_MAX = 2 ** 32 - 1
export const VIDEO_DIRECTORY = 'Media/Videos'
export const PROFILES = Object.freeze({
  compact: {label: 'Compact', width: 480, height: 360, fps: 20, videoKbps: 450, audioKbps: 80},
  balanced: {label: 'Équilibré', width: 640, height: 480, fps: 24, videoKbps: 800, audioKbps: 112},
  quality: {label: 'Qualité', width: 640, height: 480, fps: 25, videoKbps: 1200, audioKbps: 128}
})
export function profile(name = 'balanced') {
  if (!Object.hasOwn(PROFILES, name)) throw new Error('Profil de conversion inconnu.')
  return PROFILES[name]
}
export function utf8(value, bytes) {
  let result = ''
  for (const char of String(value ?? '').replace(/[\u0000-\u001f]/g, ' ')) {
    if (Buffer.byteLength(result + char, 'utf8') > bytes) break
    result += char
  }
  return result
}
export function id(value = randomUUID()) {
  if (!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(value)) throw new Error('Identifiant vidéo invalide.')
  return value
}
export function filename(title, uuid) {
  const slug = String(title).normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9 -]/g, '').trim().replace(/\s+/g, '-').slice(0, 60) || 'Film'
  return `${slug}-${id(uuid)}.mp4`
}
export function metadata(entry, videoName) {
  const stem = path.basename(videoName, '.mp4')
  return {
    schemaVersion: 1, syncPlus: true, id: id(entry.id), videoFile: videoName,
    title: utf8(entry.title, 191), originalTitle: utf8(entry.originalTitle, 191),
    year: Number.isInteger(Number(entry.year)) && Number(entry.year) >= 1888 && Number(entry.year) <= 9999 ? Number(entry.year) : undefined,
    synopsis: utf8(entry.synopsis, 4095), genre: utf8(entry.genre, 95), rating: utf8(entry.rating, 31),
    durationSeconds: entry.durationSeconds, poster: `${stem}.poster.png`, backdrop: `${stem}.backdrop.png`,
    sha256: entry.sha256, source: entry.sourceUrl || undefined,
    tmdbId: entry.tmdbId || undefined, attribution: entry.tmdbId ? 'This product uses the TMDB API but is not endorsed or certified by TMDB.' : undefined
  }
}
export function estimate(duration, name) {
  const p = profile(name)
  return Math.ceil(duration * (p.videoKbps + p.audioKbps) * 1000 / 8 * 1.04)
}
export function encodeArgs(source, target, name, info) {
  const p = profile(name)
  const fps = Math.min(p.fps, info.fps > 0 ? info.fps : p.fps)
  // Normalize non-square pixels before fitting. Pad without stretching, never upscale.
  const filter = `scale=trunc(iw*sar/2)*2:ih,setsar=1,scale=w='min(iw,${p.width})':h='min(ih,${p.height})':force_original_aspect_ratio=decrease:force_divisible_by=2,pad=ceil(iw/2)*2:ceil(ih/2)*2,setsar=1,fps=${fps}`
  return ['-hide_banner', '-nostdin', '-y', '-protocol_whitelist', 'file,pipe', '-i', source,
    '-map', '0:v:0', '-map', '0:a:0?', '-map_metadata', '-1', '-map_chapters', '-1', '-sn', '-dn',
    '-vf', filter, '-c:v', 'libx264', '-preset', 'fast', '-profile:v', 'baseline', '-level:v', '3.0',
    '-pix_fmt', 'yuv420p', '-b:v', `${p.videoKbps}k`, '-maxrate', `${p.videoKbps}k`, '-bufsize', `${p.videoKbps * 2}k`,
    '-bf', '0', '-refs', '1', '-threads', '2', '-c:a', 'aac', '-profile:a', 'aac_low', '-ar', '44100', '-ac', '2', '-b:a', `${p.audioKbps}k`,
    '-movflags', '+faststart', '-progress', 'pipe:1', '-f', 'mp4', target]
}
