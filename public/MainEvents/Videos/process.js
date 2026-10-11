import {spawn} from 'node:child_process'
import fs from 'node:fs/promises'
import {createReadStream} from 'node:fs'
import {createHash} from 'node:crypto'
import {encodeArgs, FAT32_MAX, profile} from './contract.js'

export function run(binary, args, {signal, onLine = () => {}, timeout = 0, maxOutput = 8 * 1024 * 1024, env, capture = true} = {}) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new Error('Opération annulée.'))
    const child = spawn(binary, args, {windowsHide: true, shell: false, detached: process.platform !== 'win32', env: env || process.env, stdio: ['ignore', 'pipe', 'pipe']})
    let stdout = '', stderr = '', line = '', timedOut = false, overflow = false
    const stop = () => {
      if (!child.pid) return
      if (process.platform === 'win32') {
        // Also stop yt-dlp's muxer and JS runtime, never leave child processes.
        const killer = spawn('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], {windowsHide: true, shell: false, stdio: 'ignore'})
        killer.once('error', () => child.kill('SIGKILL'))
      } else {try {process.kill(-child.pid, 'SIGKILL')} catch {child.kill('SIGKILL')}}
    }
    signal?.addEventListener('abort', stop, {once: true})
    const timer = timeout ? setTimeout(() => {timedOut = true; stop()}, timeout) : null
    child.stdout.on('data', chunk => {
      if (capture) stdout += chunk.toString()
      line += chunk.toString()
      const lines = line.split(/\r?\n/); line = lines.pop(); lines.forEach(onLine)
      if (Buffer.byteLength(stdout) > maxOutput) {overflow = true; stop()}
    })
    child.stderr.on('data', chunk => {stderr = (stderr + chunk.toString()).slice(-16000)})
    const clean = () => {clearTimeout(timer); signal?.removeEventListener('abort', stop)}
    child.once('error', error => {clean(); reject(new Error(`Outil indisponible (${binary}): ${error.message}`))})
    child.once('close', code => {
      clean()
      if (signal?.aborted) reject(new Error('Opération annulée.'))
      else if (timedOut) reject(new Error('Délai de traitement dépassé.'))
      else if (overflow) reject(new Error('Réponse trop volumineuse.'))
      else if (code !== 0) reject(new Error(`Traitement échoué (${code}): ${stderr.slice(-2500)}`))
      else resolve(stdout)
    })
  })
}
export async function probe(ffprobe, source, options = {}) {
  const stat = await fs.stat(source)
  if (!stat.isFile()) throw new Error('Sélectionnez un fichier vidéo local.')
  const data = JSON.parse(await run(ffprobe, ['-v', 'error', '-protocol_whitelist', 'file,pipe', '-show_format', '-show_streams', '-of', 'json', source], {...options, timeout: 60000}))
  const video = data.streams?.find(s => s.codec_type === 'video' && !s.disposition?.attached_pic)
  const audio = data.streams?.find(s => s.codec_type === 'audio')
  const duration = Number(data.format?.duration || video?.duration)
  const [n, d] = String(video?.avg_frame_rate || '0/1').split('/').map(Number)
  if (!video || !video.width || !video.height || !Number.isFinite(duration) || duration <= 0 || duration > 604800) throw new Error('Vidéo invalide, corrompue ou durée non prise en charge (maximum 7 jours).')
  return {durationSeconds: duration, width: video.width, height: video.height, fps: d ? n / d : 0, originalBytes: stat.size, video, audio}
}
export async function hash(file, signal) {
  const digest = createHash('sha256')
  for await (const chunk of createReadStream(file)) {
    if (signal?.aborted) throw new Error('Opération annulée.')
    digest.update(chunk)
  }
  return digest.digest('hex')
}
export async function convert(tools, source, output, name, info, options = {}) {
  if (options.signal?.aborted) throw new Error('Opération annulée.')
  await run(tools.ffmpeg, encodeArgs(source, output, name, info), {...options, capture: false, onLine: line => {
    const match = /^out_time_us=(\d+)/.exec(line)
    if (match) options.onProgress?.(Math.min(0.99, Number(match[1]) / 1e6 / info.durationSeconds))
  }})
  const produced = await probe(tools.ffprobe, output, options)
  const p = profile(name)
  if (produced.originalBytes > FAT32_MAX) throw new Error('Résultat supérieur à la limite FAT32 de 4 Gio. Choisissez Compact ou un extrait plus court.')
  if (produced.video.codec_name !== 'h264' || !/baseline/i.test(produced.video.profile) || produced.video.pix_fmt !== 'yuv420p' || produced.width > p.width || produced.height > p.height || produced.fps > p.fps + 0.1 || Math.abs(produced.durationSeconds - info.durationSeconds) > 2) throw new Error('La vidéo produite ne respecte pas le profil Miyoo.')
  if (info.audio && (!produced.audio || produced.audio.codec_name !== 'aac' || produced.audio.profile !== 'LC' || Number(produced.audio.sample_rate) !== 44100 || produced.audio.channels !== 2)) throw new Error('La piste sonore produite est invalide.')
  // FFprobe validates the container; decode every stream to catch truncated/corrupt packets.
  await run(tools.ffmpeg, ['-v', 'error', '-xerror', '-nostdin', '-i', output, '-map', '0:v:0', '-map', '0:a:0?', '-f', 'null', '-'], options)
  return {...produced, sha256: await hash(output, options.signal)}
}
export async function image(tools, source, output, width, height, {video = false, duration = 0, ...options} = {}) {
  await run(tools.ffmpeg, ['-hide_banner', '-nostdin', '-y', '-protocol_whitelist', 'file,pipe', ...(video ? ['-ss', String(Math.min(30, duration / 3))] : []), '-i', source,
    '-frames:v', '1', '-vf', `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2,setsar=1`, '-update', '1', output], {...options, timeout: 60000})
  if ((await fs.stat(output)).size > 2 * 1024 * 1024) throw new Error('Pochette trop volumineuse.')
}
