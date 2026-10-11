import {test, before, after} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import {randomUUID} from 'node:crypto'
import {run, probe, convert, image, hash} from '../public/MainEvents/Videos/process.js'
import {PROFILES, metadata, filename, estimate, FAT32_MAX, utf8} from '../public/MainEvents/Videos/contract.js'
import {VideoLibrary, atomicJson} from '../public/MainEvents/Videos/library.js'
import {cardDirectory, listCard, transfer, deleteCard, recoverCard} from '../public/MainEvents/Videos/card.js'
import {youtubeUrl, allowedYoutube, MovieInformation} from '../public/MainEvents/Videos/network.js'

const bin = name => process.env[name.toUpperCase() + '_PATH'] || path.resolve('extraResources/video-tools', name + (process.platform === 'win32' ? '.exe' : ''))
const tools = {ffmpeg: bin('ffmpeg'), ffprobe: bin('ffprobe')}
const root = path.resolve('test-output', randomUUID())
let source, info, library, film, card, sd
before(async () => {
  await fs.mkdir(root, {recursive: true})
  source = path.join(root, 'Film de test 16x9.mp4')
  await run(tools.ffmpeg, ['-v', 'error', '-y', '-f', 'lavfi', '-i', 'testsrc2=size=960x540:rate=30', '-f', 'lavfi', '-i', 'sine=frequency=1000:sample_rate=48000', '-t', '2', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', source])
  info = await probe(tools.ffprobe, source)
  library = new VideoLibrary(path.join(root, 'library'), tools)
  await library.ready
})
after(async () => {await library?.idle(); await fs.rm(root, {recursive: true, force: true})})

test('FFprobe extracts duration, size, resolution, fps and audio', () => {
  assert.equal(info.width, 960); assert.equal(info.height, 540); assert.equal(info.fps, 30)
  assert.ok(info.durationSeconds >= 1.9 && info.durationSeconds <= 2.2); assert.ok(info.originalBytes > 0); assert.equal(info.audio.codec_name, 'aac')
})
test('automatic local import preserves the source and creates a verified film', async () => {
  const original = await hash(source)
  film = await library.add(source)
  await library.idle()
  assert.equal(film.status, 'ready'); assert.equal(film.progress, 1)
  assert.equal(await hash(source), original); assert.ok(film.compressedBytes > 0)
  assert.equal((await library.add(source)).id, film.id)
})
test('all three profiles encode baseline yuv420p with preserved 16:9 ratio and AAC sound', async () => {
  for (const [name, p] of Object.entries(PROFILES)) {
    const output = path.join(root, name + '.mp4')
    const result = await convert(tools, source, output, name, info)
    assert.equal(result.video.codec_name, 'h264'); assert.match(result.video.profile, /baseline/i)
    assert.equal(result.video.pix_fmt, 'yuv420p'); assert.equal(result.video.sample_aspect_ratio, '1:1')
    assert.ok(result.width <= p.width && result.height <= p.height); assert.ok(result.fps <= p.fps + 0.01)
    assert.ok(Math.abs(result.width / result.height - 16 / 9) < 0.01)
    assert.equal(result.audio.codec_name, 'aac'); assert.equal(result.audio.channels, 2); assert.equal(result.audio.sample_rate, '44100')
    const audio = await run(tools.ffmpeg, ['-v', 'info', '-i', output, '-af', 'volumedetect', '-vn', '-f', 'null', '-'])
    assert.equal(typeof audio, 'string')
    // Decode audio to PCM and verify nonzero samples, not merely existence of a stream.
    const pcm = path.join(root, name + '.pcm')
    await run(tools.ffmpeg, ['-v', 'error', '-y', '-i', output, '-vn', '-f', 's16le', pcm])
    const samples = await fs.readFile(pcm)
    assert.ok(samples.length > 10000); assert.ok(samples.some(byte => byte !== 0))
  }
})
test('4:3, portrait, rotated and anamorphic inputs remain undistorted', async () => {
  for (const [label, dimensions, sar, expected] of [['4x3', '640x480', '1', 4/3], ['portrait', '240x480', '1', 1/2], ['anamorphic', '720x576', '64/45', 16/9]]) {
    const input = path.join(root, label + '.mp4'), output = path.join(root, label + '-converted.mp4')
    await run(tools.ffmpeg, ['-v', 'error', '-y', '-f', 'lavfi', '-i', `testsrc2=size=${dimensions}:rate=12`, '-t', '0.5', '-vf', `setsar=${sar}`, '-c:v', 'libx264', input])
    const result = await convert(tools, input, output, 'balanced', await probe(tools.ffprobe, input))
    assert.ok(Math.abs(result.width / result.height - expected) < 0.02)
  }
  const rotated = path.join(root, 'rotated.mp4'), output = path.join(root, 'rotated-converted.mp4')
  await run(tools.ffmpeg, ['-v', 'error', '-y', '-display_rotation:v:0', '90', '-i', source, '-c', 'copy', rotated])
  const rotatedInfo = await probe(tools.ffprobe, rotated)
  assert.ok(rotatedInfo.video.side_data_list?.some(s => Math.abs(s.rotation) === 90), 'Fixture must contain a real display matrix')
  const result = await convert(tools, rotated, output, 'balanced', await probe(tools.ffprobe, rotated))
  assert.ok(Math.abs(result.width / result.height - 9/16) < 0.02)
})
test('metadata follows the TELMI+ sidecar and UTF-8 limits, synopsis optional', async () => {
  await library.update(film.id, {title: 'Été 🎬'.repeat(80), synopsis: 'é'.repeat(3000), year: '2026'})
  const name = filename(film.title, film.id), data = metadata(film, name)
  assert.equal(data.schemaVersion, 1); assert.equal(data.id, film.id); assert.equal(data.videoFile, name)
  assert.ok(Buffer.byteLength(data.title) <= 191); assert.ok(Buffer.byteLength(data.synopsis) <= 4095)
  assert.ok(!data.title.includes('\ufffd')); assert.equal(data.year, 2026)
  assert.equal(metadata({...film, synopsis: undefined}, name).synopsis, '')
  assert.match(data.poster, /\.poster\.png$/); assert.ok(Buffer.byteLength(JSON.stringify(data)) < 65536)
})
test('automatic thumbnail and backdrop have exact console dimensions', async () => {
  for (const [name, w, h] of [['poster.png', 300, 450], ['backdrop.png', 640, 360]]) {
    const data = JSON.parse(await run(tools.ffprobe, ['-v', 'error', '-show_streams', '-of', 'json', path.join(library.directory(film.id), name)]))
    assert.equal(data.streams[0].width, w); assert.equal(data.streams[0].height, h)
  }
})
test('manual JPG and PNG covers are normalized without altering the input', async () => {
  for (const ext of ['jpg', 'png']) {
    const cover = path.join(root, 'manual.' + ext)
    await run(tools.ffmpeg, ['-v', 'error', '-y', '-f', 'lavfi', '-i', 'color=c=blue:size=800x600', '-frames:v', '1', cover])
    const digest = await hash(cover)
    await library.cover(film.id, cover)
    assert.equal(await hash(cover), digest); assert.equal(film.manualCover, true)
    const buffer = await fs.readFile(path.join(library.directory(film.id), 'poster.png'))
    assert.equal(buffer.readUInt32BE(16), 300); assert.equal(buffer.readUInt32BE(20), 450)
  }
})
test('a simulated TELMI+ SD is recognized and only Media/Videos is touched', async () => {
  sd = path.join(root, 'SD'); await fs.mkdir(sd)
  await fs.writeFile(path.join(sd, 'autorun.inf'), '[autorun]\nlabel=TelmiOS-v1.0.0\n')
  for (const dir of ['TELMI_PLUS', 'Stories', 'Music', 'Roms', 'Saves', '.tmp_update']) {
    await fs.mkdir(path.join(sd, dir)); await fs.writeFile(path.join(sd, dir, 'keep.txt'), 'protected-' + dir)
  }
  const recognize = async drive => (await fs.readFile(path.join(drive, 'autorun.inf'), 'utf8')).includes('TelmiOS') && (await fs.stat(path.join(drive, 'TELMI_PLUS'))).isDirectory()
  card = await cardDirectory(sd, recognize)
  const copied = await transfer(library, card, film.id)
  const listed = await listCard(card)
  assert.equal(listed.films.length, 1); assert.equal(listed.films[0].managed, true)
  assert.equal(await hash(path.join(card, copied.videoFile)), film.sha256)
  assert.ok(listed.availableBytes > 0); assert.ok(listed.occupiedBytes > film.compressedBytes)
  for (const dir of ['Stories', 'Music', 'Roms', 'Saves', '.tmp_update']) assert.equal(await fs.readFile(path.join(sd, dir, 'keep.txt'), 'utf8'), 'protected-' + dir)
})
test('duplicate transfer updates metadata without replacing video or resume identity', async () => {
  const first = (await listCard(card)).films[0], file = path.join(card, first.videoFile), stat = await fs.stat(file)
  await library.update(film.id, {title: 'Nouveau titre', synopsis: 'Synopsis hors ligne'})
  const result = await transfer(library, card, film.id)
  assert.equal(result.updated, true); assert.equal((await listCard(card)).films.length, 1)
  assert.equal((await fs.stat(file)).mtimeMs, stat.mtimeMs)
  assert.equal(JSON.parse(await fs.readFile(file + '.movie.json', 'utf8')).synopsis, 'Synopsis hors ligne')
})
test('cancelled transfer publishes nothing and cleans temporary files', async () => {
  const target = path.join(root, 'empty-card'); await fs.mkdir(target)
  const controller = new AbortController()
  await assert.rejects(transfer(library, target, film.id, {signal: controller.signal, onProgress: () => controller.abort()}))
  assert.deepEqual(await fs.readdir(target), [])
})
test('interrupted commit is rolled back on reconnect', async () => {
  const target = path.join(root, 'recovery'); await fs.mkdir(target)
  const name = 'incomplete.mp4', stage = path.join(target, '.syncplus-' + randomUUID())
  await fs.mkdir(stage); await fs.writeFile(path.join(target, name), 'partial')
  await atomicJson(path.join(stage, 'transaction.json'), {schemaVersion: 1, committed: false, files: [{name, sha256: await hash(path.join(target, name)), existed: false}]})
  await recoverCard(target); assert.deepEqual(await fs.readdir(target), [])
})
test('foreign SD videos and corrupt metadata remain readable and protected', async () => {
  await fs.copyFile(source, path.join(card, 'legacy.mp4'))
  await fs.writeFile(path.join(card, 'legacy.mp4.movie.json'), '{broken')
  const foreign = (await listCard(card)).films.find(f => f.videoFile === 'legacy.mp4')
  assert.equal(foreign.managed, false); assert.equal(foreign.title, 'legacy')
  await assert.rejects(deleteCard(card, foreign.id))
  assert.ok(await fs.stat(path.join(card, 'legacy.mp4')))
})
test('selected SD deletion is recoverable and leaves all other folders intact', async () => {
  const trash = await deleteCard(card, film.id)
  assert.equal((await listCard(card)).films.length, 1)
  assert.equal((await fs.readdir(trash)).length, 4)
  for (const dir of ['Stories', 'Music', 'Roms', 'Saves', '.tmp_update']) assert.equal(await fs.readFile(path.join(sd, dir, 'keep.txt'), 'utf8'), 'protected-' + dir)
})
test('FFprobe rejects a corrupt input and original is retained', async () => {
  const corrupt = path.join(root, 'corrupt.mp4'); await fs.writeFile(corrupt, 'not a video')
  await assert.rejects(probe(tools.ffprobe, corrupt))
  await assert.rejects(library.add(corrupt)); assert.equal(await fs.readFile(corrupt, 'utf8'), 'not a video')
})
test('altered prepared video cannot be transferred', async () => {
  const prepared = path.join(library.directory(film.id), 'video.mp4'), buffer = await fs.readFile(prepared)
  await fs.writeFile(prepared, buffer.subarray(0, 100))
  await assert.rejects(transfer(library, card, film.id), /endommagée/)
  await fs.writeFile(prepared, buffer)
})
test('process cancellation kills the child and rejects cleanly', async () => {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 200)
  try {await assert.rejects(run(tools.ffmpeg, ['-v', 'error', '-re', '-f', 'lavfi', '-i', 'testsrc2=size=640x480:rate=24', '-t', '30', '-f', 'null', '-'], {signal: controller.signal}), /annulée/)} finally {clearTimeout(timer)}
})
test('conversion cancellation and restart remove abandoned temporary files', async () => {
  const input = path.join(root, 'cancel.mp4'); await fs.copyFile(source, input)
  const second = new VideoLibrary(path.join(root, 'second-library'), tools)
  const entry = await second.add(input, 'compact', {}, false)
  second.changed = films => {if (films.some(f => f.status === 'converting')) second.cancel([entry.id])}
  await second.enqueue(entry.id); await second.idle()
  assert.equal(entry.status, 'cancelled'); await assert.rejects(fs.access(path.join(second.directory(entry.id), 'work')))
  entry.status = 'converting'; await second.save(entry)
  await fs.mkdir(path.join(second.directory(entry.id), 'work')); await fs.writeFile(path.join(second.directory(entry.id), 'work', 'video.mp4'), 'partial')
  const restarted = new VideoLibrary(second.root, tools); await restarted.ready
  assert.equal(restarted.find(entry.id).status, 'interrupted'); await assert.rejects(fs.access(path.join(second.directory(entry.id), 'work')))
})
test('FAT32 names, path traversal, estimates and UTF-8 are guarded', () => {
  const name = filename('CON<>:"/\\?* film 🎬', film.id)
  assert.ok(!/[<>:"/\\?*]/.test(name)); assert.ok(name.length < 160)
  assert.throws(() => library.directory('../Music'))
  assert.ok(estimate(20 * 3600, 'quality') > FAT32_MAX)
  assert.throws(() => estimate(10, '__proto__'))
  assert.equal(utf8('éé', 3), 'é')
})
test('YouTube validates URLs and blocks restricted/DRM/live content', () => {
  assert.equal(youtubeUrl('https://youtu.be/abcdefghijk?t=2'), 'https://www.youtube.com/watch?v=abcdefghijk')
  for (const url of ['http://youtube.com/watch?v=abcdefghijk', 'https://youtube.com.evil.test/watch?v=abcdefghijk', 'file:///C:/secret', 'https://youtube.com/playlist?list=xyz', 'https://evil.test/']) assert.throws(() => youtubeUrl(url))
  const publicVideo = {duration: 60, availability: 'public', formats: [{vcodec: 'avc1', has_drm: false}]}
  assert.equal(allowedYoutube(publicVideo), true)
  for (const changes of [{has_drm: true}, {availability: 'private'}, {is_live: true}, {formats: [{vcodec: 'avc1', has_drm: true}]}]) assert.equal(allowedYoutube({...publicVideo, ...changes}), false)
})
test('TMDb requires configured credentials; manual workflows never require them', async () => {
  const tmdb = new MovieInformation()
  await assert.rejects(tmdb.search('Test'), /jeton/)
  assert.equal(await tmdb.poster('/../../secret', path.join(root, 'forbidden.jpg')), false)
})
test('PC deletion removes prepared copies only', async () => {
  const digest = await hash(source)
  await library.remove([film.id])
  assert.equal(await hash(source), digest); assert.equal(library.entries.length, 0)
})
