import fs from 'node:fs/promises'
import path from 'node:path'
import assert from 'node:assert/strict'
import {run} from '../public/MainEvents/Videos/process.js'

const root = path.resolve('electron/dist')
const installer = path.join(root, 'TELMI-Sync-Plus-Windows-x64.exe')
const buffer = await fs.readFile(installer)
assert.equal(buffer.toString('ascii', 0, 2), 'MZ')
assert.ok(buffer.length > 50 * 1024 * 1024)
const exe = await fs.readFile(path.join(root, 'win-unpacked/TELMI Sync Plus.exe'))
const pe = exe.readUInt32LE(0x3c)
assert.equal(exe.toString('ascii', pe, pe + 4), 'PE\0\0')
assert.equal(exe.readUInt16LE(pe + 4), 0x8664, 'Executable must be x64')
const resources = path.join(root, 'win-unpacked/resources/extraResources/video-tools')
for (const binary of ['ffmpeg', 'ffprobe', 'yt-dlp']) {
  await run(path.join(resources, binary + '.exe'), [binary === 'yt-dlp' ? '--version' : '-version'], {timeout: 30000})
}
for (const name of ['FFmpeg-LICENSE.txt', 'FFmpeg-BUILD.txt', 'yt-dlp-LICENSE.txt', 'yt-dlp-THIRD-PARTY.txt']) assert.ok((await fs.stat(path.join(resources, name))).size > 0)
console.log('Windows x64 installer and bundled tools verified:', installer)
